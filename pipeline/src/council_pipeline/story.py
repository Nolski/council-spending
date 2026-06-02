"""Bake the small JSON series the scrollytelling essay needs.

Reads the published summary Parquets + manifest and writes compact JSON to
``web/public/story/from_data.json`` so the essay loads instantly without a
per-page DuckDB-WASM init. Everything here is "our data" (directional, ~59%
classification coverage, redaction caveats). Verified/illustrative external
series live in a separate hand-authored ``curated.json``.
"""

from __future__ import annotations

import json

import duckdb
import polars as pl
import structlog
import yaml

from . import paths

log = structlog.get_logger()

# Categories whose spend is a candidate for discretionary savings.
CUTTABLE = ["consultants", "agency_staff", "it_systems"]


def _load_vetting() -> tuple[list[str], list[str]]:
    body = yaml.safe_load((paths.CONFIG_DIR / "savings_vetting.yaml").read_text())
    return (
        [p.lower() for p in body.get("exclude", [])],
        [p.lower() for p in body.get("committed_contracts", [])],
    )


def _excluded(name: str, patterns: list[str]) -> bool:
    n = (name or "").lower()
    return any(p in n for p in patterns)

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
        **build_candidate_savings(),
    }


def build_candidate_savings() -> dict:
    """Vetted discretionary savings candidates + annual run-rate, from the DuckDB.

    Applies ``savings_vetting.yaml`` to strip capital-engineering, care, statutory and
    intra-group spend out of the cuttable categories, leaving genuinely discretionary
    spend. The run-rate uses the latest *full* calendar year, not cumulative totals.
    """
    exclude, committed = _load_vetting()
    cats = ", ".join(f"'{c}'" for c in CUTTABLE)
    con = duckdb.connect(str(paths.CANONICAL_DB), read_only=True)
    rows = con.execute(
        f"""SELECT council, spend_category, supplier_name_raw,
                   year(payment_date) AS yr, sum(amount) AS total, count(*) AS n
            FROM spend_transactions
            WHERE spend_category IN ({cats}) AND NOT is_redacted
              AND supplier_name_raw IS NOT NULL AND amount IS NOT NULL
              AND payment_date IS NOT NULL
            GROUP BY 1, 2, 3, 4"""
    ).fetchall()
    con.close()

    # Latest full year = drop the most recent year if it looks partial.
    year_tot: dict[int, float] = {}
    for _, _, _, yr, total, _ in rows:
        year_tot[yr] = year_tot.get(yr, 0) + total
    years = sorted(year_tot)
    full_year = years[-1]
    if len(years) >= 2 and year_tot[years[-1]] < 0.6 * year_tot[years[-2]]:
        full_year = years[-2]

    # Aggregate per supplier, splitting discretionary / committed / excluded.
    suppliers: dict[tuple, dict] = {}
    for council, cat, name, yr, total, n in rows:
        if _excluded(name, exclude):
            continue
        bucket = "committed" if _excluded(name, committed) else "discretionary"
        key = (council, cat, name)
        s = suppliers.setdefault(
            key, {"council": council, "spend_category": cat, "supplier": name,
                   "bucket": bucket, "total": 0.0, "annual": 0.0, "txns": 0}
        )
        s["total"] += total
        s["txns"] += n
        if yr == full_year:
            s["annual"] += total

    disc = [s for s in suppliers.values() if s["bucket"] == "discretionary"]

    # Top named candidates per council+category (discretionary only).
    candidate_suppliers = []
    for (council, cat) in {(s["council"], s["spend_category"]) for s in disc}:
        top = sorted(
            [s for s in disc if s["council"] == council and s["spend_category"] == cat],
            key=lambda s: s["total"], reverse=True,
        )[:8]
        candidate_suppliers.extend(
            {**{k: s[k] for k in ("council", "spend_category", "supplier", "total", "annual", "txns")}}
            for s in top
        )
    candidate_suppliers.sort(key=lambda s: s["total"], reverse=True)

    # Annual discretionary run-rate per council + category (the savings pot).
    runrate: dict[tuple, dict] = {}
    for s in disc:
        key = (s["council"], s["spend_category"])
        r = runrate.setdefault(key, {"council": s["council"], "spend_category": s["spend_category"], "annual": 0.0})
        r["annual"] += s["annual"]

    return {
        "run_rate_year": int(full_year),
        "savings_runrate": sorted(runrate.values(), key=lambda r: r["annual"], reverse=True),
        "candidate_suppliers": candidate_suppliers,
    }


def write_story_data() -> dict:
    data = build_story_data()
    paths.WEB_STORY_DIR.mkdir(parents=True, exist_ok=True)
    out = paths.WEB_STORY_DIR / "from_data.json"
    out.write_text(json.dumps(data, indent=2))
    log.info("wrote story data", path=str(out), categories=len(data["category_totals"]))
    return data
