"""End-to-end import tests against a real Postgres.

Marked ``integration`` and excluded from the default CI run.  The database comes
from, in order of preference:

1. ``DATABASE_URL`` — a reachable Postgres the test may create databases on;
2. a ``testcontainers`` Postgres, when a Docker daemon is available.

If neither is present the whole module skips.

Run with:
    DATABASE_URL=postgresql://... uv run pytest -m integration
"""

from __future__ import annotations

import json
import os
import time
import uuid
from decimal import Decimal
from pathlib import Path

import pytest

from app.auth import SIGNATURE_HEADER, sign_body
from tests.conftest import TEST_API_KEY
from tests.fixtures.make_xer import activity_id_for, make_xer

pytestmark = pytest.mark.integration

REPO_ROOT = Path(__file__).resolve().parents[3]
MIGRATION = REPO_ROOT / "db" / "migrations" / "0001_core.sql"
AUTH_SHIM = REPO_ROOT / "db" / "seed" / "local_auth_shim.sql"

ORG_ID = "11111111-1111-1111-1111-111111111111"
PROJECT_ID = "aaaaaaaa-1111-2222-3333-444444444444"
OTHER_PROJECT_ID = "bbbbbbbb-1111-2222-3333-444444444444"


# --------------------------------------------------------------------------- #
# Database provisioning
# --------------------------------------------------------------------------- #


def _admin_dsn() -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url

    try:
        from testcontainers.postgres import PostgresContainer
    except ImportError:  # pragma: no cover - dev extra not installed
        pytest.skip("neither DATABASE_URL nor testcontainers is available")

    try:
        container = PostgresContainer("postgres:16-alpine")
        container.start()
    except Exception as exc:  # pragma: no cover - no docker daemon
        pytest.skip(f"no DATABASE_URL and Docker is unavailable: {exc}")

    _admin_dsn.container = container  # type: ignore[attr-defined]
    return container.get_connection_url().replace("postgresql+psycopg2", "postgresql")


@pytest.fixture(scope="module")
def database_url() -> str:
    """A freshly migrated database, dropped when the module finishes."""
    import psycopg

    admin = _admin_dsn()
    name = f"starkcontrols_it_{uuid.uuid4().hex[:12]}"

    with psycopg.connect(admin, autocommit=True) as conn:
        conn.execute(f'create database "{name}"')

    target = _swap_database(admin, name)
    with psycopg.connect(target, autocommit=True) as conn:
        conn.execute(AUTH_SHIM.read_text())
        conn.execute(MIGRATION.read_text())
        conn.execute(
            "insert into orgs (id, name) values (%s, %s)", (ORG_ID, "Test Org")
        )
        conn.execute(
            """
            insert into projects (id, org_id, code, name, budget_at_completion)
            values (%s, %s, 'SVH-DEMO', 'Demo Project', 12500000.00),
                   (%s, %s, 'SVH-OTHER', 'Other Project', 0)
            """,
            (PROJECT_ID, ORG_ID, OTHER_PROJECT_ID, ORG_ID),
        )

    yield target

    with psycopg.connect(admin, autocommit=True) as conn:
        conn.execute(f'drop database if exists "{name}" with (force)')

    container = getattr(_admin_dsn, "container", None)
    if container is not None:  # pragma: no cover - docker path
        container.stop()


def _swap_database(dsn: str, name: str) -> str:
    """Return ``dsn`` pointed at database ``name``."""
    from urllib.parse import urlsplit, urlunsplit

    parts = urlsplit(dsn)
    return urlunsplit(parts._replace(path=f"/{name}"))


@pytest.fixture
def api(database_url, monkeypatch):
    """A TestClient wired to the migrated database, with R2 stubbed out."""
    from fastapi.testclient import TestClient

    from app import db, r2
    from app.main import app

    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("COMPUTE_API_KEY", TEST_API_KEY)
    db.close_pool()

    uploaded: dict[str, bytes] = {}
    monkeypatch.setattr(r2, "get_object", lambda key, bucket=None: uploaded[key])

    with TestClient(app) as client:

        def post(path: str, payload: dict):
            body = json.dumps(payload).encode()
            return client.post(
                path,
                content=body,
                headers={
                    "Content-Type": "application/json",
                    SIGNATURE_HEADER: sign_body(body, TEST_API_KEY),
                },
            )

        client.signed_post = post  # type: ignore[attr-defined]
        client.uploads = uploaded  # type: ignore[attr-defined]
        yield client

    db.close_pool()


def _rows(database_url: str, sql: str, params=()):
    import psycopg

    with psycopg.connect(database_url) as conn:
        return conn.execute(sql, params).fetchall()


# --------------------------------------------------------------------------- #
# Round trip
# --------------------------------------------------------------------------- #


def test_import_round_trip_persists_the_whole_schedule(api, database_url):
    key = "orgs/org/projects/proj/xer/roundtrip.xer"
    api.uploads[key] = make_xer(100).encode("cp1252")

    response = api.signed_post(
        "/xer/import",
        {"r2_key": key, "project_id": PROJECT_ID, "is_baseline": True},
    )
    assert response.status_code == 200, response.text

    body = response.json()
    assert body["counts"] == {"wbs": 6, "activities": 100, "relationships": 99}
    assert body["data_date"] == "2026-02-01"
    snapshot_id = body["snapshot_id"]

    # --- snapshot ---
    snapshot = _rows(
        database_url,
        """
        select project_id, data_date, source_file_r2_key, is_baseline
          from schedule_snapshots where id = %s
        """,
        (snapshot_id,),
    )[0]
    assert str(snapshot[0]) == PROJECT_ID
    assert snapshot[1].isoformat() == "2026-02-01"
    assert snapshot[2] == key
    assert snapshot[3] is True

    # --- activities ---
    counts = _rows(
        database_url,
        "select count(*) from activities where snapshot_id = %s",
        (snapshot_id,),
    )[0][0]
    assert counts == 100

    first = _rows(
        database_url,
        """
        select activity_id, name, orig_dur_days, rem_dur_days, total_float_days,
               pct_complete, is_critical, calendar_id, early_start
          from activities where snapshot_id = %s and activity_id = %s
        """,
        (snapshot_id, activity_id_for(0)),
    )[0]
    assert first[0] == "A1000"
    assert first[1] == "Activity 00000"
    assert first[2] == Decimal("1.00")  # 8 hr / 8 hr-per-day
    assert first[3] == Decimal("1.00")
    assert first[4] == Decimal("-1.00")
    assert first[5] == Decimal("0.00")
    assert first[6] is True  # generated column: total_float_days <= 0
    assert first[7] == "1"
    assert first[8].utcoffset().total_seconds() == 0  # stored tz-aware UTC

    # --- relationships ---
    link_types = _rows(
        database_url,
        """
        select link_type, count(*) from relationships
         where snapshot_id = %s group by 1 order by 1
        """,
        (snapshot_id,),
    )
    assert dict(link_types) == {"FF": 25, "FS": 25, "SF": 24, "SS": 25}

    lags = _rows(
        database_url,
        """
        select distinct lag_days from relationships
         where snapshot_id = %s order by 1
        """,
        (snapshot_id,),
    )
    assert [row[0] for row in lags] == [
        Decimal("-1.00"),
        Decimal("0.00"),
        Decimal("1.00"),
        Decimal("2.00"),
    ]

    # --- wbs ---
    wbs = _rows(
        database_url,
        """
        select code, name, parent_id is null
          from wbs_nodes where project_id = %s order by code
        """,
        (PROJECT_ID,),
    )
    assert [row[0] for row in wbs] == [
        "SVH-DEMO",
        "WBS.01",
        "WBS.02",
        "WBS.03",
        "WBS.04",
        "WBS.05",
    ]
    assert wbs[0][2] is True  # project root has no parent
    assert all(row[2] is False for row in wbs[1:])

    # every activity is attached to a WBS node of this project
    orphans = _rows(
        database_url,
        "select count(*) from activities where snapshot_id = %s and wbs_id is null",
        (snapshot_id,),
    )[0][0]
    assert orphans == 0


def test_second_import_creates_a_new_snapshot_and_reuses_wbs(api, database_url):
    key = "orgs/org/projects/proj/xer/second.xer"
    api.uploads[key] = make_xer(10).encode("cp1252")

    first = api.signed_post("/xer/import", {"r2_key": key, "project_id": PROJECT_ID})
    second = api.signed_post("/xer/import", {"r2_key": key, "project_id": PROJECT_ID})
    assert first.status_code == 200 and second.status_code == 200
    assert first.json()["snapshot_id"] != second.json()["snapshot_id"]

    # The WBS is upserted on (project_id, code), so re-importing must not duplicate it.
    wbs_count = _rows(
        database_url,
        "select count(*) from wbs_nodes where project_id = %s",
        (PROJECT_ID,),
    )[0][0]
    assert wbs_count == 6


def test_import_against_an_unknown_project_is_404(api):
    key = "orgs/org/projects/proj/xer/unknown.xer"
    api.uploads[key] = make_xer(3).encode("cp1252")

    response = api.signed_post(
        "/xer/import",
        {"r2_key": key, "project_id": "99999999-9999-9999-9999-999999999999"},
    )
    assert response.status_code == 404


def test_failed_import_leaves_no_partial_snapshot(api, database_url, monkeypatch):
    """The transaction is all-or-nothing: a mid-load failure rolls everything back."""
    from app.routers import xer as xer_router

    key = "orgs/org/projects/proj/xer/boom.xer"
    api.uploads[key] = make_xer(20).encode("cp1252")

    before = _rows(
        database_url,
        "select count(*) from schedule_snapshots where project_id = %s",
        (OTHER_PROJECT_ID,),
    )[0][0]

    def explode(*_args, **_kwargs):
        raise RuntimeError("bulk load failed")

    monkeypatch.setattr(xer_router, "_copy_relationships", explode)

    with pytest.raises(RuntimeError):
        api.signed_post(
            "/xer/import", {"r2_key": key, "project_id": OTHER_PROJECT_ID}
        )

    after = _rows(
        database_url,
        "select count(*) from schedule_snapshots where project_id = %s",
        (OTHER_PROJECT_ID,),
    )[0][0]
    assert after == before

    orphan_activities = _rows(
        database_url,
        """
        select count(*) from activities a
          join schedule_snapshots s on s.id = a.snapshot_id
         where s.project_id = %s
        """,
        (OTHER_PROJECT_ID,),
    )[0][0]
    assert orphan_activities == 0


@pytest.mark.slow
def test_fifty_thousand_activities_import_within_the_budget(api, database_url):
    """Performance target from the spec: 50K activities in under 60 s."""
    key = "orgs/org/projects/proj/xer/large.xer"
    api.uploads[key] = make_xer(50_000).encode("cp1252")

    started = time.monotonic()
    response = api.signed_post(
        "/xer/import", {"r2_key": key, "project_id": OTHER_PROJECT_ID}
    )
    elapsed = time.monotonic() - started

    assert response.status_code == 200, response.text
    assert response.json()["counts"]["activities"] == 50_000
    assert elapsed < 60, f"import took {elapsed:.1f}s, budget is 60s"
