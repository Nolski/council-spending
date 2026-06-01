"""Exeter City Council spending: files behind hashed ``/media/<hash>/`` links.

Exeter doesn't expose predictable URLs, so we fetch the spending page and scrape
the anchor tags for download links matching the configured pattern/extensions.
The hashed filename is unstable, so we derive a stable local filename from the
link text where possible, falling back to the URL hash segment.
"""

from __future__ import annotations

import re
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from .base import Fetcher, RemoteFile

_SLUG = re.compile(r"[^a-z0-9]+")


def _slugify(text: str) -> str:
    return _SLUG.sub("-", text.strip().lower()).strip("-")


class ExeterScrapeFetcher(Fetcher):
    def discover(self, client: httpx.Client) -> list[RemoteFile]:
        page_url = self.source.page_url
        pattern = getattr(self.source, "link_pattern", "").lower()
        exts = tuple(getattr(self.source, "file_extensions", [".csv", ".xlsx"]))

        resp = client.get(page_url)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")

        seen: set[str] = set()
        files: list[RemoteFile] = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            url = urljoin(page_url, href)
            path = urlparse(url).path.lower()
            if not path.endswith(exts):
                continue
            link_text = a.get_text(" ", strip=True)
            haystack = f"{path} {link_text}".lower()
            if pattern and pattern not in haystack:
                continue
            if url in seen:
                continue
            seen.add(url)

            ext = next(e for e in exts if path.endswith(e))
            base = _slugify(link_text) or urlparse(url).path.strip("/").replace("/", "-")
            files.append(RemoteFile(url=url, filename=f"{base}{ext}"))
        return files
