"""``council`` CLI — fetch, stage, build, or run the whole pipeline.

Examples:
    council list
    council fetch --source devon_spending
    council stage
    council build
    council run-all --source devon_spending
"""

from __future__ import annotations

import structlog
import typer
from rich.console import Console
from rich.table import Table

from . import paths
from .build import build_spending
from .config import load_sources
from .http import make_client
from .provenance import Ledger
from .registry import make_fetcher
from .stage import stage_source

structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.dev.ConsoleRenderer(),
    ]
)

app = typer.Typer(add_completion=False, help="ETL for UK council spending data.")
console = Console()


def _selected_sources(source: str | None):
    sources = load_sources()
    if source:
        if source not in sources:
            raise typer.BadParameter(f"Unknown source '{source}'. Known: {sorted(sources)}")
        return [sources[source]]
    return list(sources.values())


@app.command("list")
def list_sources() -> None:
    """List configured sources."""
    table = Table("id", "council", "dataset", "fetcher", "threshold")
    for s in load_sources().values():
        table.add_row(s.id, s.council, s.dataset, s.fetcher, str(s.threshold_floor or "-"))
    console.print(table)


@app.command()
def fetch(
    source: str = typer.Option(None, help="Source id; default = all."),
    force: bool = typer.Option(False, help="Re-download ignoring the ledger."),
) -> None:
    """Download raw files (incremental by default)."""
    paths.ensure_dirs()
    ledger = Ledger()
    with make_client() as client:
        for src in _selected_sources(source):
            fetcher = make_fetcher(src)
            result = fetcher.fetch_all(client, ledger, force=force)
            console.print(
                f"[bold]{src.id}[/]: fetched {result.fetched}, skipped {result.skipped}"
            )


@app.command()
def stage(
    source: str = typer.Option(None, help="Source id; default = all."),
    force: bool = typer.Option(False, help="Re-parse all raw files."),
) -> None:
    """Parse raw files into staging Parquet."""
    ledger = Ledger()
    for src in _selected_sources(source):
        n = stage_source(src, ledger, force=force)
        console.print(f"[bold]{src.id}[/]: staged {n} file(s)")


@app.command()
def build(
    source: str = typer.Option(None, help="Limit spending build to this source id."),
) -> None:
    """Build canonical Parquet + summaries + manifest from staging data."""
    ids = [source] if source else None
    manifest = build_spending(ids)
    total = manifest["datasets"]["spending"]["total_rows"]
    console.print(f"[green]Built spending[/]: {total} rows → {paths.PUBLISHED_DIR}")


@app.command("run-all")
def run_all(
    source: str = typer.Option(None, help="Source id; default = all."),
    force: bool = typer.Option(False, help="Force re-download and re-parse."),
) -> None:
    """fetch → stage → build in one go."""
    fetch(source=source, force=force)
    stage(source=source, force=force)
    build(source=source)


if __name__ == "__main__":
    app()
