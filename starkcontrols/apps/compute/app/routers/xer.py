"""XER ingestion endpoints.

``POST /xer/parse``   fetch an XER from R2 and return the parsed schedule.
``POST /xer/import``  the same, then persist it as a schedule snapshot.

The import is a single transaction: WBS upsert, snapshot insert and both bulk
loads either all land or none do, so a failed import never leaves a half-built
snapshot behind.  Activities and relationships go in through ``COPY``, which is
what keeps a 50K-activity schedule inside the 60 s budget.
"""

from __future__ import annotations

import logging
from datetime import date
from uuid import UUID

import psycopg
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app import r2
from app.auth import require_hmac
from app.db import transaction
from core.xer_parse import ParsedSchedule, XerParseError, parse_xer

log = logging.getLogger(__name__)

router = APIRouter(prefix="/xer", tags=["xer"], dependencies=[Depends(require_hmac)])

# Column order shared by the COPY statements and the row builders below.
_ACTIVITY_COLUMNS = (
    "snapshot_id",
    "wbs_id",
    "activity_id",
    "name",
    "orig_dur_days",
    "rem_dur_days",
    "early_start",
    "early_finish",
    "late_start",
    "late_finish",
    "actual_start",
    "actual_finish",
    "total_float_days",
    "pct_complete",
    "calendar_id",
)

_RELATIONSHIP_COLUMNS = (
    "snapshot_id",
    "pred_activity_id",
    "succ_activity_id",
    "link_type",
    "lag_days",
)


# --------------------------------------------------------------------------- #
# Request / response models
# --------------------------------------------------------------------------- #


class ParseRequest(BaseModel):
    r2_key: str = Field(min_length=1)


class ImportRequest(BaseModel):
    r2_key: str = Field(min_length=1)
    project_id: UUID
    is_baseline: bool = False


class ImportCounts(BaseModel):
    wbs: int
    activities: int
    relationships: int


class ImportResult(BaseModel):
    snapshot_id: UUID
    counts: ImportCounts
    data_date: date


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #


def _load_and_parse(r2_key: str) -> ParsedSchedule:
    try:
        payload = r2.get_object(r2_key)
    except r2.R2ObjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"no object at r2 key {r2_key}",
        ) from exc
    except r2.R2ConfigError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="object storage is not configured",
        ) from exc

    try:
        return parse_xer(payload)
    except XerParseError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"unreadable XER: {exc}",
        ) from exc


def _assert_project_exists(conn: psycopg.Connection, project_id: UUID) -> None:
    row = conn.execute(
        "select 1 from projects where id = %s", (str(project_id),)
    ).fetchone()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="project not found",
        )


def _upsert_wbs(
    conn: psycopg.Connection, project_id: UUID, schedule: ParsedSchedule
) -> dict[str, str]:
    """Upsert the WBS for a project and return ``{code: wbs_id}``.

    Two passes: rows first (so every parent exists), then the parent links.
    """
    pid = str(project_id)
    if schedule.wbs:
        codes = [node.code for node in schedule.wbs]
        names = [node.name for node in schedule.wbs]
        conn.execute(
            """
            insert into wbs_nodes (project_id, code, name)
            select %s, u.code, u.name
            from unnest(%s::text[], %s::text[]) as u(code, name)
            on conflict (project_id, code) do update set name = excluded.name
            """,
            (pid, codes, names),
        )

        linked = [(n.code, n.parent_code) for n in schedule.wbs if n.parent_code]
        if linked:
            conn.execute(
                """
                update wbs_nodes as child
                   set parent_id = parent.id
                  from unnest(%s::text[], %s::text[]) as u(code, parent_code)
                  join wbs_nodes as parent
                    on parent.project_id = %s and parent.code = u.parent_code
                 where child.project_id = %s and child.code = u.code
                """,
                ([c for c, _ in linked], [p for _, p in linked], pid, pid),
            )

    rows = conn.execute(
        "select code, id from wbs_nodes where project_id = %s", (pid,)
    ).fetchall()
    return {code: str(wbs_id) for code, wbs_id in rows}


def _insert_snapshot(
    conn: psycopg.Connection,
    project_id: UUID,
    schedule: ParsedSchedule,
    r2_key: str,
    is_baseline: bool,
) -> str:
    row = conn.execute(
        """
        insert into schedule_snapshots (project_id, data_date, source_file_r2_key, is_baseline)
        values (%s, %s, %s, %s)
        returning id
        """,
        (str(project_id), schedule.data_date, r2_key, is_baseline),
    ).fetchone()
    assert row is not None  # noqa: S101 — INSERT ... RETURNING always yields a row
    return str(row[0])


def _copy_activities(
    conn: psycopg.Connection,
    snapshot_id: str,
    schedule: ParsedSchedule,
    wbs_ids: dict[str, str],
) -> int:
    columns = ", ".join(_ACTIVITY_COLUMNS)
    with conn.cursor().copy(f"copy activities ({columns}) from stdin") as copy:
        for activity in schedule.activities:
            copy.write_row(
                (
                    snapshot_id,
                    wbs_ids.get(activity.wbs_code) if activity.wbs_code else None,
                    activity.activity_id,
                    activity.name,
                    activity.orig_dur_days,
                    activity.rem_dur_days,
                    activity.early_start,
                    activity.early_finish,
                    activity.late_start,
                    activity.late_finish,
                    activity.actual_start,
                    activity.actual_finish,
                    activity.total_float_days,
                    activity.pct_complete,
                    activity.calendar_id,
                )
            )
    return len(schedule.activities)


def _copy_relationships(
    conn: psycopg.Connection, snapshot_id: str, schedule: ParsedSchedule
) -> int:
    columns = ", ".join(_RELATIONSHIP_COLUMNS)
    with conn.cursor().copy(f"copy relationships ({columns}) from stdin") as copy:
        for link in schedule.relationships:
            copy.write_row(
                (
                    snapshot_id,
                    link.pred_activity_id,
                    link.succ_activity_id,
                    link.link_type,
                    link.lag_days,
                )
            )
    return len(schedule.relationships)


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #


@router.post("/parse", response_model=ParsedSchedule)
def parse(payload: ParseRequest) -> ParsedSchedule:
    """Parse an XER held in R2 without writing anything to the database."""
    return _load_and_parse(payload.r2_key)


@router.post("/import", response_model=ImportResult)
def import_schedule(payload: ImportRequest) -> ImportResult:
    """Parse an XER from R2 and persist it as a new schedule snapshot."""
    schedule = _load_and_parse(payload.r2_key)

    try:
        with transaction() as conn:
            _assert_project_exists(conn, payload.project_id)
            wbs_ids = _upsert_wbs(conn, payload.project_id, schedule)
            snapshot_id = _insert_snapshot(
                conn, payload.project_id, schedule, payload.r2_key, payload.is_baseline
            )
            activity_count = _copy_activities(conn, snapshot_id, schedule, wbs_ids)
            relationship_count = _copy_relationships(conn, snapshot_id, schedule)
    except psycopg.errors.UniqueViolation as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="schedule contains duplicate activity ids",
        ) from exc

    log.info(
        "imported snapshot %s for project %s: %d activities, %d relationships",
        snapshot_id,
        payload.project_id,
        activity_count,
        relationship_count,
    )

    return ImportResult(
        snapshot_id=UUID(snapshot_id),
        counts=ImportCounts(
            wbs=len(schedule.wbs),
            activities=activity_count,
            relationships=relationship_count,
        ),
        data_date=schedule.data_date,
    )
