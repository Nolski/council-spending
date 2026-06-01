"""Shared HTTP client with retry/backoff and conditional-GET support."""

from __future__ import annotations

import httpx

USER_AGENT = "council-pipeline/0.1 (+civic research; contact via repo)"

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_TRANSPORT = httpx.HTTPTransport(retries=3)


def make_client() -> httpx.Client:
    return httpx.Client(
        headers={"User-Agent": USER_AGENT},
        timeout=_TIMEOUT,
        transport=_TRANSPORT,
        follow_redirects=True,
    )
