"""Resolve a source file's actual header row to canonical field names.

Resolution order for each column:
    1. exact (normalized) match against a known variant
    2. fuzzy match (rapidfuzz token_sort_ratio) above a threshold
A column listed in the map's ``ignore`` list is dropped intentionally. Any other
unmapped column raises :class:`UnmappedHeaderError` so new header eras get added
to the column map explicitly rather than silently lost.
"""

from __future__ import annotations

import re

from rapidfuzz import fuzz, process

_NON_ALNUM = re.compile(r"[^a-z0-9]+")

FUZZY_THRESHOLD = 90  # conservative; below this we'd rather fail loudly


class UnmappedHeaderError(ValueError):
    def __init__(self, columns: list[str], source: str):
        self.columns = columns
        super().__init__(
            f"Unmapped header column(s) in {source}: {columns}. "
            f"Add them to the column map (or its `ignore` list)."
        )


def normalize_header(h: str) -> str:
    """Lowercase and strip all non-alphanumeric characters for robust matching."""
    return _NON_ALNUM.sub("", h.strip().lower())


def resolve_headers(
    headers: list[str],
    variants: dict[str, str],
    ignore: set[str],
    source: str,
) -> dict[str, str]:
    """Return ``{original_header: canonical_field}`` for mappable columns.

    ``variants`` is ``{normalized_variant: canonical_field}``;
    ``ignore`` is a set of normalized header names to drop.
    """
    mapping: dict[str, str] = {}
    unmapped: list[str] = []
    variant_keys = list(variants)

    for h in headers:
        norm = normalize_header(h)
        if not norm or norm in ignore:
            continue
        if norm in variants:
            mapping[h] = variants[norm]
            continue
        # Fuzzy fallback for minor punctuation/spelling drift.
        match = process.extractOne(
            norm, variant_keys, scorer=fuzz.token_sort_ratio, score_cutoff=FUZZY_THRESHOLD
        )
        if match:
            mapping[h] = variants[match[0]]
        else:
            unmapped.append(h)

    if unmapped:
        raise UnmappedHeaderError(unmapped, source)
    return mapping
