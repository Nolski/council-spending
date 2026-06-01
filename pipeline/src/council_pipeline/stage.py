"""Raw → staging: parse each raw file to a source-faithful Parquet.

Staging keeps every original column verbatim and attaches provenance columns
(source file/url/fetch time and a 0-based row index). It is idempotent: a raw
file is only re-staged when it is newer than its staging Parquet (or ``force``).
The canonical build step reads from here.
"""

from __future__ import annotations

import json

import polars as pl
import structlog

from . import paths
from .config import SourceConfig, load_column_map
from .parsers.readers import read_tabular
from .provenance import Ledger

log = structlog.get_logger()

# Provenance columns prefixed with `_` so they never collide with source headers.
PROV_COLS = ["_source_file", "_source_url", "_fetched_at", "_source_row_index"]


def stage_source(source: SourceConfig, ledger: Ledger, *, force: bool = False) -> int:
    raw_d = paths.raw_dir(source.council, source.dataset)
    stage_d = paths.staging_dir(source.council, source.dataset)
    stage_d.mkdir(parents=True, exist_ok=True)

    if not raw_d.exists():
        log.warning("no raw dir; run fetch first", source=source.id)
        return 0

    by_filename = {e["filename"]: e for e in ledger.entries_for_source(source.id)}
    # Known header variants let the reader skip preamble rows before the header.
    header_hints = set(load_column_map(source.column_map).all_variants())
    staged = 0

    for raw_file in sorted(raw_d.iterdir()):
        if not raw_file.is_file():
            continue
        out = stage_d / f"{raw_file.stem}.parquet"
        if (
            not force
            and out.exists()
            and out.stat().st_mtime >= raw_file.stat().st_mtime
        ):
            continue

        df = read_tabular(raw_file, header_hints=header_hints)
        meta = by_filename.get(raw_file.name, {})
        df = df.with_columns(
            pl.lit(raw_file.name).alias("_source_file"),
            pl.lit(meta.get("url", "")).alias("_source_url"),
            pl.lit(meta.get("fetched_at", "")).alias("_fetched_at"),
            pl.arange(0, pl.len()).alias("_source_row_index"),
        )
        df.write_parquet(out)
        staged += 1
        log.info("staged", source=source.id, file=raw_file.name, rows=df.height)

    return staged


def staging_files(source: SourceConfig) -> list:
    """Paths of all staging Parquets for a source (one per raw file)."""
    stage_d = paths.staging_dir(source.council, source.dataset)
    return sorted(stage_d.glob("*.parquet")) if stage_d.exists() else []


def load_staging_frames(source: SourceConfig) -> list[pl.DataFrame]:
    """Load each staging Parquet separately.

    Files are kept separate (not concatenated) because headers drift between
    files/eras; mapping each file against the column map individually avoids two
    differently-named columns colliding onto the same canonical field.
    """
    return [pl.read_parquet(f) for f in staging_files(source)]
