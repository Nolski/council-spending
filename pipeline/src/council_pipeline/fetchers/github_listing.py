"""Devon County Council spending: monthly CSVs in a GitHub repo.

Lists the repo's files via the GitHub contents API, filters by the configured
glob, and downloads from the stable ``raw.githubusercontent.com`` URLs. Because
those URLs are stable, the base conditional-GET loop re-downloads only the latest
month and any back-corrected files.
"""

from __future__ import annotations

import fnmatch

import httpx

from .base import Fetcher, RemoteFile

_RAW = "https://raw.githubusercontent.com/{repo}/{branch}/{path}"


class GithubListingFetcher(Fetcher):
    def discover(self, client: httpx.Client) -> list[RemoteFile]:
        repo = self.source.repo
        branch = getattr(self.source, "branch", "master")
        glob = getattr(self.source, "file_glob", "*")

        # The git trees API returns the whole file list in one call.
        api = f"https://api.github.com/repos/{repo}/git/trees/{branch}?recursive=1"
        resp = client.get(api, headers={"Accept": "application/vnd.github+json"})
        resp.raise_for_status()
        tree = resp.json().get("tree", [])

        files = []
        for node in tree:
            if node.get("type") != "blob":
                continue
            path = node["path"]
            name = path.rsplit("/", 1)[-1]
            if fnmatch.fnmatch(name, glob):
                files.append(
                    RemoteFile(
                        url=_RAW.format(repo=repo, branch=branch, path=path),
                        filename=name,
                    )
                )
        return sorted(files, key=lambda f: f.filename)
