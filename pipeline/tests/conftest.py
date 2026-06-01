"""Redirect all data-lake paths to a temp dir so tests never touch real data."""

from __future__ import annotations

import pytest

from council_pipeline import paths


@pytest.fixture
def sandbox(tmp_path, monkeypatch):
    raw = tmp_path / "raw"
    staging = tmp_path / "staging"
    published = tmp_path / "published"
    monkeypatch.setattr(paths, "RAW_DIR", raw)
    monkeypatch.setattr(paths, "STAGING_DIR", staging)
    monkeypatch.setattr(paths, "FETCH_LEDGER", raw / "_ledger.json")
    monkeypatch.setattr(paths, "PUBLISHED_DIR", published)
    monkeypatch.setattr(paths, "MANIFEST_FILE", published / "manifest.json")
    monkeypatch.setattr(paths, "CANONICAL_DB", published / "council.duckdb")
    raw.mkdir(parents=True)
    staging.mkdir(parents=True)
    published.mkdir(parents=True)
    return tmp_path
