"""Supplier name normalization and stable canonical-id assignment.

There is no official cross-council supplier identifier, so matching is heuristic:
normalize the name (case, punctuation, common company suffixes), then cluster
near-duplicates with fuzzy matching. The canonical id is a stable hash of the
cluster's representative name so ids do not change across re-runs (given the same
inputs). Raw name variants are retained as aliases for manual audit.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field

from rapidfuzz import fuzz

# Company-form suffixes collapsed so "Acme Ltd" and "Acme Limited" match.
_SUFFIXES = {
    "ltd", "limited", "plc", "llp", "llc", "inc", "co", "company",
    "cic", "cio", "uk", "the",
}
_NON_ALNUM = re.compile(r"[^a-z0-9\s]+")
_WS = re.compile(r"\s+")

CLUSTER_THRESHOLD = 92  # token_sort_ratio above which two names are the same supplier


def normalize_name(name: str | None) -> str:
    """Return an aggressive match key (lowercased, de-suffixed, single-spaced)."""
    if not name:
        return ""
    s = _NON_ALNUM.sub(" ", name.lower())
    tokens = [t for t in _WS.sub(" ", s).strip().split(" ") if t and t not in _SUFFIXES]
    return " ".join(tokens)


def _hash_id(canonical: str) -> str:
    return "sup_" + hashlib.sha1(canonical.encode()).hexdigest()[:12]


@dataclass
class _Cluster:
    key: str                       # normalized representative name
    canonical_name: str            # most common raw display name
    aliases: set[str] = field(default_factory=set)
    _name_counts: dict[str, int] = field(default_factory=dict)

    def add(self, raw_name: str) -> None:
        self.aliases.add(raw_name)
        self._name_counts[raw_name] = self._name_counts.get(raw_name, 0) + 1
        # Representative display name = most frequently seen raw spelling.
        self.canonical_name = max(self._name_counts, key=self._name_counts.get)


class SupplierResolver:
    """Assigns stable canonical ids to supplier names within a run.

    Exact normalized-key matches are O(1). Genuinely new keys pay a *blocked*
    fuzzy comparison: candidates are limited to clusters sharing a block key
    (the first normalized token), so cost stays near-linear instead of O(n²)
    over the full corpus.
    """

    def __init__(self) -> None:
        self._by_key: dict[str, _Cluster] = {}
        self._blocks: dict[str, list[_Cluster]] = {}

    @staticmethod
    def _block_key(norm: str) -> str:
        return norm.split(" ", 1)[0][:6]

    def resolve(self, raw_name: str | None) -> tuple[str, str]:
        """Return ``(supplier_id_canonical, normalized_key)`` for a raw name."""
        norm = normalize_name(raw_name)
        if not norm:
            return "", ""

        cluster = self._by_key.get(norm)
        if cluster is None:
            cluster = self._fuzzy_lookup(norm)
        if cluster is None:
            cluster = _Cluster(key=norm, canonical_name=raw_name or norm)
            self._blocks.setdefault(self._block_key(norm), []).append(cluster)
        # Alias this normalized key onto the (new or matched) cluster.
        self._by_key[norm] = cluster

        cluster.add(raw_name or norm)
        return _hash_id(cluster.key), norm

    def _fuzzy_lookup(self, norm: str) -> _Cluster | None:
        best: _Cluster | None = None
        best_score = CLUSTER_THRESHOLD
        for cluster in self._blocks.get(self._block_key(norm), ()):
            score = fuzz.token_sort_ratio(norm, cluster.key)
            if score >= best_score:
                best, best_score = cluster, score
        return best

    def dimension_rows(self) -> list[dict]:
        """Rows for the ``suppliers`` dimension table (distinct clusters)."""
        seen: dict[int, _Cluster] = {id(c): c for c in self._by_key.values()}
        rows = []
        for cluster in seen.values():
            rows.append(
                {
                    "supplier_id_canonical": _hash_id(cluster.key),
                    "canonical_name": cluster.canonical_name,
                    "name_normalized": cluster.key,
                    "aliases": sorted(cluster.aliases),
                    "n_aliases": len(cluster.aliases),
                }
            )
        return rows
