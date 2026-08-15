"""HMAC request authentication for the compute service.

Every caller (in practice the Cloudflare Worker) signs the *raw* request body
with the shared secret ``COMPUTE_API_KEY`` and sends the hex digest in the
``X-SVH-Signature`` header:

    signature = hex(hmac_sha256(key=COMPUTE_API_KEY, msg=raw_body))

Signing the body rather than a token means a captured signature is useless
against a different payload.  Comparison is constant-time; a missing, malformed
or mismatched signature is a flat 401 with no detail about which it was.
"""

from __future__ import annotations

import hashlib
import hmac
import os

from fastapi import HTTPException, Request, status

SIGNATURE_HEADER = "X-SVH-Signature"

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="invalid or missing request signature",
)


class ComputeKeyMissingError(RuntimeError):
    """Raised when the service is started without ``COMPUTE_API_KEY``."""


def _compute_api_key() -> str:
    """Read the shared secret at call time so tests and Fly secrets both work."""
    key = os.environ.get("COMPUTE_API_KEY", "")
    if not key:
        raise ComputeKeyMissingError("COMPUTE_API_KEY is not set")
    return key


def sign_body(body: bytes, key: str | None = None) -> str:
    """Return the hex HMAC-SHA256 signature for ``body``.

    Exposed so tests — and any Python-side caller — sign exactly the way
    ``apps/edge/src/middleware/hmac.ts`` does.
    """
    secret = key if key is not None else _compute_api_key()
    return hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


def verify_signature(body: bytes, signature: str | None, key: str | None = None) -> bool:
    """Constant-time check of ``signature`` against ``body``."""
    if not signature:
        return False
    expected = sign_body(body, key)
    return hmac.compare_digest(expected, signature.strip().lower())


async def require_hmac(request: Request) -> None:
    """FastAPI dependency: reject any request that is not correctly signed.

    Reading the body here is safe — Starlette caches it, so the route handler
    still parses the same bytes.
    """
    try:
        secret = _compute_api_key()
    except ComputeKeyMissingError as exc:
        # Fail closed: an unconfigured service must not accept traffic.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="compute service is not configured",
        ) from exc

    body = await request.body()
    if not verify_signature(body, request.headers.get(SIGNATURE_HEADER), secret):
        raise _UNAUTHORIZED
