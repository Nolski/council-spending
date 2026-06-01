"""Wire source-config fetcher names to fetcher classes."""

from __future__ import annotations

from .config import SourceConfig
from .fetchers.base import Fetcher
from .fetchers.exeter_scrape import ExeterScrapeFetcher
from .fetchers.github_listing import GithubListingFetcher

_FETCHERS: dict[str, type[Fetcher]] = {
    "github_listing": GithubListingFetcher,
    "exeter_scrape": ExeterScrapeFetcher,
}


def make_fetcher(source: SourceConfig) -> Fetcher:
    try:
        cls = _FETCHERS[source.fetcher]
    except KeyError:
        raise KeyError(
            f"Unknown fetcher '{source.fetcher}' for source '{source.id}'. "
            f"Known: {sorted(_FETCHERS)}"
        )
    return cls(source)
