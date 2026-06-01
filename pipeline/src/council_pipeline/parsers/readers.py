"""Read raw CSV/XLSX into an all-string Polars DataFrame.

Everything is read as text so no source value is coerced or lost before the
canonical build step. CSV uses lossy UTF-8 decoding to survive the mixed
encodings common in council exports.
"""

from __future__ import annotations

from pathlib import Path

import polars as pl


def read_tabular(path: Path) -> pl.DataFrame:
    """Read a CSV or XLSX file with every column typed as ``Utf8``."""
    suffix = path.suffix.lower()
    if suffix == ".csv":
        df = pl.read_csv(
            path,
            infer_schema_length=0,   # treat all columns as strings
            encoding="utf8-lossy",
            truncate_ragged_lines=True,
        )
    elif suffix in (".xlsx", ".xls"):
        # Read first sheet; cast everything to string for a faithful staging copy.
        df = pl.read_excel(path, infer_schema_length=0)
        df = df.with_columns(pl.all().cast(pl.Utf8, strict=False))
    else:
        raise ValueError(f"Unsupported file type for tabular read: {path.name}")

    # Drop fully-empty trailing columns that some exports add.
    df = df.select([c for c in df.columns if c.strip() != ""])
    return df
