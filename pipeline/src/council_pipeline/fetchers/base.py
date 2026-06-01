"""Fetcher contract + the shared incremental download loop.

Subclasses implement :meth:`discover` (list the currently-available remote files).
The base :meth:`fetch_all` handles conditional GET, content-hash de-duplication,
writing immutable raw files, and updating the ledger — so every fetcher is
idempotent and incremental for free.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone

import httpx
import structlog

from .. import paths
from ..config import SourceConfig
from ..provenance import Ledger, LedgerEntry, sha256_bytes

log = structlog.get_logger()


@dataclass
class RemoteFile:
    url: str
    filename: str


@dataclass
class FetchResult:
    fetched: int
    skipped: int
    files: list[str]


class Fetcher(ABC):
    def __init__(self, source: SourceConfig):
        self.source = source

    @abstractmethod
    def discover(self, client: httpx.Client) -> list[RemoteFile]:
        """Return the list of files currently published by this source."""

    def fetch_all(
        self, client: httpx.Client, ledger: Ledger, *, force: bool = False
    ) -> FetchResult:
        dest_dir = paths.raw_dir(self.source.council, self.source.dataset)
        dest_dir.mkdir(parents=True, exist_ok=True)

        remote = self.discover(client)
        log.info("discovered", source=self.source.id, count=len(remote))

        fetched, skipped, written = 0, 0, []
        for rf in remote:
            local = dest_dir / rf.filename
            prior = ledger.get(rf.url)

            headers = {}
            if not force and prior and local.exists():
                if prior.get("etag"):
                    headers["If-None-Match"] = prior["etag"]
                if prior.get("last_modified"):
                    headers["If-Modified-Since"] = prior["last_modified"]

            resp = client.get(rf.url, headers=headers)
            if resp.status_code == 304:
                skipped += 1
                continue
            resp.raise_for_status()

            digest = sha256_bytes(resp.content)
            if not force and ledger.is_unchanged(rf.url, digest) and local.exists():
                skipped += 1
                continue

            local.write_bytes(resp.content)
            ledger.record(
                LedgerEntry(
                    source_id=self.source.id,
                    url=rf.url,
                    filename=rf.filename,
                    content_sha256=digest,
                    bytes=len(resp.content),
                    fetched_at=datetime.now(timezone.utc).isoformat(),
                    etag=resp.headers.get("ETag"),
                    last_modified=resp.headers.get("Last-Modified"),
                )
            )
            fetched += 1
            written.append(rf.filename)

        ledger.save()
        log.info("fetch complete", source=self.source.id, fetched=fetched, skipped=skipped)
        return FetchResult(fetched=fetched, skipped=skipped, files=written)
