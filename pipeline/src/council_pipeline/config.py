"""Load and validate the source registry and per-source column maps."""

from __future__ import annotations

from functools import lru_cache

import yaml
from pydantic import BaseModel, ConfigDict

from . import paths


class SourceConfig(BaseModel):
    """One configured dataset from ``sources.yaml``.

    Extra keys are allowed so fetcher-specific options (repo, page_url, ...) ride
    along without needing a field here for every fetcher.
    """

    model_config = ConfigDict(extra="allow")

    id: str
    council: str
    dataset: str
    fetcher: str
    parser: str
    column_map: str
    threshold_floor: int | None = None
    licence: str | None = None


class ColumnMap(BaseModel):
    """Maps many possible source header strings to one canonical field.

    ``fields`` is ``{canonical_field: [possible header variants]}``. Header
    resolution tries exact, then normalized, then fuzzy matching against these.
    """

    name: str
    fields: dict[str, list[str]]
    ignore: list[str] = []

    def all_variants(self) -> dict[str, str]:
        """Flatten to ``{normalized_variant: canonical_field}``."""
        from .parsers.header_map import normalize_header

        out: dict[str, str] = {}
        for canonical, variants in self.fields.items():
            for v in variants:
                out[normalize_header(v)] = canonical
        return out

    def ignore_set(self) -> set[str]:
        """Normalized header names to drop intentionally."""
        from .parsers.header_map import normalize_header

        return {normalize_header(h) for h in self.ignore}


@lru_cache(maxsize=1)
def load_sources() -> dict[str, SourceConfig]:
    raw = yaml.safe_load(paths.SOURCES_FILE.read_text())
    sources = {}
    for sid, body in raw["sources"].items():
        sources[sid] = SourceConfig(id=sid, **body)
    return sources


def get_source(source_id: str) -> SourceConfig:
    sources = load_sources()
    if source_id not in sources:
        raise KeyError(f"Unknown source '{source_id}'. Known: {sorted(sources)}")
    return sources[source_id]


@lru_cache(maxsize=None)
def load_column_map(name: str) -> ColumnMap:
    path = paths.COLUMN_MAPS_DIR / f"{name}.yaml"
    if not path.exists():
        raise FileNotFoundError(f"Column map '{name}' not found at {path}")
    body = yaml.safe_load(path.read_text())
    return ColumnMap(name=name, fields=body["fields"], ignore=body.get("ignore", []))
