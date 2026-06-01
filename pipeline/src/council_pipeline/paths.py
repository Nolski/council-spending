"""Filesystem layout for the data lake and published outputs.

Three zones inside ``pipeline/data`` plus the published ``data/`` directory that
the dashboard reads:

    pipeline/data/raw/<council>/<dataset>/<file>   immutable downloads
    pipeline/data/staging/<council>/<dataset>/*    parsed, source-faithful parquet
    data/<entity>/...                              canonical, published parquet
"""

from __future__ import annotations

from pathlib import Path

# pipeline/src/council_pipeline/paths.py -> repo root is three parents up from src.
PIPELINE_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = PIPELINE_ROOT.parent

CONFIG_DIR = PIPELINE_ROOT / "config"
COLUMN_MAPS_DIR = CONFIG_DIR / "column_maps"
SOURCES_FILE = CONFIG_DIR / "sources.yaml"

DATA_LAKE = PIPELINE_ROOT / "data"
RAW_DIR = DATA_LAKE / "raw"
STAGING_DIR = DATA_LAKE / "staging"
FETCH_LEDGER = RAW_DIR / "_ledger.json"

# Published data contract consumed by the web dashboard.
PUBLISHED_DIR = REPO_ROOT / "data"
MANIFEST_FILE = PUBLISHED_DIR / "manifest.json"
CANONICAL_DB = PUBLISHED_DIR / "council.duckdb"


def raw_dir(council: str, dataset: str) -> Path:
    return RAW_DIR / council / dataset


def staging_dir(council: str, dataset: str) -> Path:
    return STAGING_DIR / council / dataset


def ensure_dirs() -> None:
    for d in (RAW_DIR, STAGING_DIR, PUBLISHED_DIR):
        d.mkdir(parents=True, exist_ok=True)
