"""HMAC authentication tests — accepts a valid signature, rejects everything else."""

from __future__ import annotations

import json

import pytest

from app.auth import SIGNATURE_HEADER, sign_body, verify_signature
from tests.conftest import TEST_API_KEY
from tests.fixtures.make_xer import make_xer

PARSE_PATH = "/xer/parse"
PAYLOAD = {"r2_key": "orgs/o/projects/p/xer/abc.xer"}


@pytest.fixture
def stub_r2(monkeypatch):
    """Serve a 5-task XER for any key so auth is the only thing under test."""
    from app import r2

    monkeypatch.setattr(r2, "get_object", lambda key, bucket=None: make_xer(5).encode())
    return r2


# --------------------------------------------------------------------------- #
# Rejection
# --------------------------------------------------------------------------- #


def test_unsigned_request_is_rejected(client):
    response = client.post(PARSE_PATH, json=PAYLOAD)
    assert response.status_code == 401


def test_empty_signature_header_is_rejected(client):
    response = client.post(PARSE_PATH, json=PAYLOAD, headers={SIGNATURE_HEADER: ""})
    assert response.status_code == 401


def test_garbage_signature_is_rejected(client):
    response = client.post(
        PARSE_PATH, json=PAYLOAD, headers={SIGNATURE_HEADER: "deadbeef"}
    )
    assert response.status_code == 401


def test_signature_from_the_wrong_key_is_rejected(client):
    body = json.dumps(PAYLOAD).encode()
    response = client.post(
        PARSE_PATH,
        content=body,
        headers={
            "Content-Type": "application/json",
            SIGNATURE_HEADER: sign_body(body, "an-attackers-key"),
        },
    )
    assert response.status_code == 401


def test_signature_lifted_onto_a_different_body_is_rejected(client):
    """A captured signature must not authorise a swapped payload."""
    captured = sign_body(json.dumps(PAYLOAD).encode(), TEST_API_KEY)
    tampered = json.dumps({"r2_key": "orgs/other/secret.xer"}).encode()

    response = client.post(
        PARSE_PATH,
        content=tampered,
        headers={"Content-Type": "application/json", SIGNATURE_HEADER: captured},
    )
    assert response.status_code == 401


def test_service_without_a_key_refuses_traffic(client, monkeypatch):
    monkeypatch.delenv("COMPUTE_API_KEY", raising=False)
    response = client.post(PARSE_PATH, json=PAYLOAD)
    assert response.status_code == 503


# --------------------------------------------------------------------------- #
# Acceptance
# --------------------------------------------------------------------------- #


def test_valid_signature_is_accepted(signed_post, stub_r2):
    response = signed_post(PARSE_PATH, PAYLOAD)
    assert response.status_code == 200

    body = response.json()
    assert len(body["activities"]) == 5
    assert body["data_date"] == "2026-02-01"


def test_uppercase_hex_signature_is_accepted(client, stub_r2):
    body = json.dumps(PAYLOAD).encode()
    response = client.post(
        PARSE_PATH,
        content=body,
        headers={
            "Content-Type": "application/json",
            SIGNATURE_HEADER: sign_body(body).upper(),
        },
    )
    assert response.status_code == 200


def test_import_route_is_also_signature_protected(client):
    response = client.post(
        "/xer/import",
        json={"r2_key": "k", "project_id": "00000000-0000-0000-0000-000000000001"},
    )
    assert response.status_code == 401


def test_health_endpoints_stay_open(client):
    assert client.get("/healthz").status_code == 200


# --------------------------------------------------------------------------- #
# Signing helper
# --------------------------------------------------------------------------- #


def test_sign_body_matches_a_known_vector():
    """Pinned so the Worker's WebCrypto implementation can be checked against it."""
    assert sign_body(b"hello world", "secret") == (
        "734cc62f32841568f45715aeb9f4d7891324e6d948e4c6c60c0621cdac48623a"
    )


def test_verify_signature_round_trip():
    assert verify_signature(b"payload", sign_body(b"payload", "k"), "k")
    assert not verify_signature(b"payload", sign_body(b"payload", "k"), "other")
    assert not verify_signature(b"payload", None, "k")
    assert not verify_signature(b"payload", "", "k")


def test_signature_is_whitespace_tolerant():
    signature = f"  {sign_body(b'x', 'k')}  "
    assert verify_signature(b"x", signature, "k")
