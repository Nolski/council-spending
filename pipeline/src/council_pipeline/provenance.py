"""Fetch ledger: records every downloaded file so re-runs are incremental.

Stored as a human-readable JSON file keyed by source URL. Each entry holds the
local filename, content hash, HTTP validators (ETag / Last-Modified) and the
fetch timestamp. Raw files are immutable; a corrected upstream file produces a
new hash and a new ledger entry version.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass

from . import paths


@dataclass
class LedgerEntry:
    source_id: str
    url: str
    filename: str
    content_sha256: str
    bytes: int
    fetched_at: str            # ISO timestamp
    etag: str | None = None
    last_modified: str | None = None


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class Ledger:
    def __init__(self) -> None:
        self._entries: dict[str, dict] = {}
        if paths.FETCH_LEDGER.exists():
            self._entries = json.loads(paths.FETCH_LEDGER.read_text())

    def get(self, url: str) -> dict | None:
        return self._entries.get(url)

    def is_unchanged(self, url: str, content_sha256: str) -> bool:
        entry = self._entries.get(url)
        return entry is not None and entry.get("content_sha256") == content_sha256

    def record(self, entry: LedgerEntry) -> None:
        self._entries[entry.url] = asdict(entry)

    def save(self) -> None:
        paths.FETCH_LEDGER.parent.mkdir(parents=True, exist_ok=True)
        paths.FETCH_LEDGER.write_text(json.dumps(self._entries, indent=2, sort_keys=True))

    def entries_for_source(self, source_id: str) -> list[dict]:
        return [e for e in self._entries.values() if e.get("source_id") == source_id]
