"""Read raw CSV/XLSX into an all-string Polars DataFrame.

Everything is read as text so no source value is coerced or lost before the
canonical build step. CSV uses lossy UTF-8 decoding to survive the mixed
encodings common in council exports.
"""

from __future__ import annotations

import re
from pathlib import Path

import polars as pl

from .header_map import normalize_header

# Polars renames blank/duplicate CSV headers to `_duplicated_N`.
_DUPLICATED = re.compile(r"_duplicated_\d+$")


def _detect_header_row(path: Path, hints: set[str], scan: int = 25) -> int:
    """Find the header row by scoring early rows against known column variants.

    Some exports (e.g. Exeter grants) prepend title/blank preamble rows before
    the real header. We pick the row with the most cells matching the column
    map; ties/zero-match fall back to row 0.
    """
    preview = pl.read_csv(
        path, has_header=False, infer_schema_length=0, encoding="utf8-lossy",
        truncate_ragged_lines=True, n_rows=scan,
    )
    best_idx, best_score = 0, 0
    for idx, row in enumerate(preview.iter_rows()):
        score = sum(1 for c in row if c and normalize_header(str(c)) in hints)
        if score > best_score:
            best_idx, best_score = idx, score
    return best_idx


def read_tabular(path: Path, header_hints: set[str] | None = None) -> pl.DataFrame:
    """Read a CSV or XLSX file with every column typed as ``Utf8``.

    If ``header_hints`` (normalized known header variants) is given, detect and
    skip any preamble before the real header row.
    """
    suffix = path.suffix.lower()
    if suffix == ".csv":
        skip = _detect_header_row(path, header_hints) if header_hints else 0
        df = pl.read_csv(
            path,
            skip_rows=skip,
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

    # Drop junk columns some exports add: blank/auto-named headers from trailing
    # commas, and any column that is entirely empty/null. (Polars renames blank
    # duplicate headers to `_duplicated_N`.) This keeps staging faithful to the
    # real data without leaking spreadsheet padding into header resolution.
    keep = []
    for c in df.columns:
        name = c.strip()
        if name == "" or _DUPLICATED.search(name):
            continue
        col = df[c]
        non_empty = col.cast(pl.Utf8, strict=False).str.strip_chars().fill_null("")
        if (non_empty != "").any():
            keep.append(c)
    return df.select(keep)
