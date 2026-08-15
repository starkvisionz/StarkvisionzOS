"""Cloudflare R2 access via the S3-compatible API.

R2 speaks S3, so boto3 works unchanged once the endpoint and the ``auto`` region
are set.  Credentials come from the environment: ``R2_ENDPOINT``,
``R2_ACCESS_KEY_ID`` and ``R2_SECRET_ACCESS_KEY``.
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

#: The Worker writes uploads to this bucket; the binding name in wrangler.toml is
#: STARKCONTROLS_FILES and it points at a bucket of the same name.
DEFAULT_BUCKET = "starkcontrols-files"

#: R2 ignores the region but the SDK insists on one.
R2_REGION = "auto"


class R2ObjectNotFoundError(KeyError):
    """Raised when a requested object key does not exist in the bucket."""


class R2ConfigError(RuntimeError):
    """Raised when the R2 environment variables are incomplete."""


def bucket_name() -> str:
    return os.environ.get("R2_BUCKET", DEFAULT_BUCKET)


@lru_cache(maxsize=1)
def _client() -> Any:
    endpoint = os.environ.get("R2_ENDPOINT", "")
    access_key = os.environ.get("R2_ACCESS_KEY_ID", "")
    secret_key = os.environ.get("R2_SECRET_ACCESS_KEY", "")
    if not (endpoint and access_key and secret_key):
        raise R2ConfigError(
            "R2_ENDPOINT, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must all be set"
        )

    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=R2_REGION,
        config=Config(
            signature_version="s3v4",
            retries={"max_attempts": 3, "mode": "standard"},
        ),
    )


def reset_client() -> None:
    """Drop the memoised client — used by tests after changing the environment."""
    _client.cache_clear()


def get_object(key: str, bucket: str | None = None) -> bytes:
    """Download an object and return its bytes.

    Raises:
        R2ObjectNotFoundError: the key does not exist.
        R2ConfigError: the R2 environment variables are incomplete.
    """
    target = bucket or bucket_name()
    try:
        response = _client().get_object(Bucket=target, Key=key)
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code in {"NoSuchKey", "404", "NotFound"}:
            raise R2ObjectNotFoundError(key) from exc
        raise
    return response["Body"].read()


def put_object(key: str, data: bytes, bucket: str | None = None) -> None:
    """Upload ``data`` to ``key``.  Used by fixtures and reprocessing jobs."""
    _client().put_object(Bucket=bucket or bucket_name(), Key=key, Body=data)
