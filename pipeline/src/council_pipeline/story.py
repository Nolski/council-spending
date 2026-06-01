"""Bake the small JSON series the scrollytelling essay needs.

Reads the published summary Parquets + manifest and writes compact JSON to
``web/public/story/from_data.json`` so the essay loads instantly without a
per-page DuckDB-WASM init. Everything here is "our data" (directional, ~59%
classification coverage, redaction caveats). Verified/illustrative external
series live in a separate hand-authored ``curated.json``.
"""

from __future__ import annotations

import json

import polars as pl
import structlog

from . import paths

log = structlog.get_logger()

# Categories featured in the essay (others collapse into the totals only).
FEATURED = [
    "care_provider",
    "agency_staff",
    "consultants",
    "highways_construction",
    "special_school_placement",
    "temporary_accommodation",
    "it_systems",
]


def _summary(name: str) -> pl.DataFrame:
    return pl.read_parquet(paths.PUBLISHED_DIR / "summary" / f"{name}.parquet")


def build_story_data() -> dict:
    manifest = json.loads(paths.MANIFEST_FILE.read_text())
    spend = manifest["datasets"]["spending"]

    # Headline totals per council (from the manifest coverage block).
    totals = {
        c["council"]: {
            "rows": c["rows"],
            "total_spend": c["total_spend"],
            "date_min": c["date_min"],
            "date_max": c["date_max"],
        }
        for c in spend["by_council"]
    }

    cat = _summary("spend_by_category")
    # Cumulative category totals per council.
    cat_totals = (
        cat.group_by(["council", "spend_category"])
        .agg(pl.col("total").sum().alias("total"), pl.col("txn_count").sum().alias("txn_count"))
        .sort("total", descending=True)
        .to_dicts()
    )
    # Annual trend (compact) for featured categories.
    cat_annual = (
        cat.filter(pl.col("spend_category").is_in(FEATURED))
        .with_columns(pl.col("year_month").str.slice(0, 4).alias("year"))
        .group_by(["council", "spend_category", "year"])
        .agg(pl.col("total").sum().alias("total"))
        .sort(["council", "spend_category", "year"])
        .to_dicts()
    )

    conc = _summary("contractor_concentration").filter(pl.col("year") > 0)
    concentration = conc.select(
        ["council", "year", "top10_pct", "n_suppliers", "total"]
    ).sort(["council", "year"]).to_dicts()

    top_suppliers = (
        _summary("spend_by_supplier")
        .group_by(["council", "supplier_id_canonical", "supplier_name_norm"])
        .agg(pl.col("total").sum().alias("total"))
        .sort("total", descending=True)
        .head(15)
        .to_dicts()
    )

    # Share of classified spend that is "unclassified" (honesty figure).
    cat_share = (
        cat.group_by("spend_category").agg(pl.col("total").sum().alias("total"))
    )
    grand = float(cat_share["total"].sum())
    unclassified = float(
        cat_share.filter(pl.col("spend_category") == "unclassified")["total"].sum() or 0
    )
    classified_pct = round(100 * (grand - unclassified) / grand, 1) if grand else 0

    return {
        "meta": {
            "note": "our analysis of published spend-over-£500 (Devon) / £250 (Exeter) "
            "transparency data; ~%.0f%% of spend value is classified; sole-trader "
            "payee names are redacted; figures are directional." % classified_pct,
            "classified_pct": classified_pct,
        },
        "totals": totals,
        "category_totals": cat_totals,
        "category_annual": cat_annual,
        "concentration": concentration,
        "top_suppliers": top_suppliers,
    }


def write_story_data() -> dict:
    data = build_story_data()
    paths.WEB_STORY_DIR.mkdir(parents=True, exist_ok=True)
    out = paths.WEB_STORY_DIR / "from_data.json"
    out.write_text(json.dumps(data, indent=2))
    log.info("wrote story data", path=str(out), categories=len(data["category_totals"]))
    return data
