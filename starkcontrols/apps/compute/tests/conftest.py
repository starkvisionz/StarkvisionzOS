"""Shared test fixtures.

The environment is pinned here so no test can accidentally reach a real R2
bucket or a real database through ambient credentials.
"""

from __future__ import annotations

import json

import pytest

TEST_API_KEY = "test-compute-key-do-not-use-in-production"  # noqa: S105 — test fixture


@pytest.fixture(autouse=True)
def _isolated_env(monkeypatch):
    """Give every test a known COMPUTE_API_KEY and no ambient R2 credentials."""
    monkeypatch.setenv("COMPUTE_API_KEY", TEST_API_KEY)
    for var in ("R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"):
        monkeypatch.delenv(var, raising=False)

    from app import r2

    r2.reset_client()
    yield
    r2.reset_client()


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def signed_post(client):
    """POST JSON with a valid ``X-SVH-Signature`` over the exact bytes sent."""
    from app.auth import SIGNATURE_HEADER, sign_body

    def _post(path: str, payload: dict, key: str = TEST_API_KEY):
        body = json.dumps(payload).encode("utf-8")
        return client.post(
            path,
            content=body,
            headers={
                "Content-Type": "application/json",
                SIGNATURE_HEADER: sign_body(body, key),
            },
        )

    return _post
