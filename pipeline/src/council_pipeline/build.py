"""Staging → canonical: map headers, normalize, dedupe suppliers, publish.

Produces the data contract the dashboard reads, under the repo's ``data/``:

    data/spending/council=<c>/year=<y>/part.parquet   transactions
    data/summary/*.parquet                             pre-aggregated rollups
    data/manifest.json                                 coverage + row counts
    data/council.duckdb                                same tables, for SQL/CLI

Supplier de-duplication runs across *all* spending sources at once so the same
supplier is reconciled between councils, not just within one.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timezone
from decimal import Decimal

import duckdb
import polars as pl
import structlog

from . import paths
from .config import SourceConfig, get_source, load_column_map, load_sources
from .models import CONTRACT_FIELDS, GRANT_FIELDS, Council, Dataset
from .normalize import dates, money, redaction
from .normalize.classify import classify, coverage
from .normalize.suppliers import SupplierResolver, normalize_name
from .parsers.header_map import resolve_headers

log = structlog.get_logger()

_PROV_INPUT = {"_source_file", "_source_url", "_fetched_at", "_source_row_index"}


def _raw_json_struct(df: pl.DataFrame, source_cols: list[str]) -> pl.Series:
    """JSON string of all original columns per row (nothing discarded)."""
    records = df.select(source_cols).to_dicts()
    return pl.Series("raw", [json.dumps(r, ensure_ascii=False) for r in records])


def _map_spending(source: SourceConfig, df: pl.DataFrame) -> pl.DataFrame:
    """Map one source's staging frame to canonical spend columns (no supplier ids yet)."""
    cmap = load_column_map(source.column_map)
    source_cols = [c for c in df.columns if c not in _PROV_INPUT]
    mapping = resolve_headers(source_cols, cmap.all_variants(), cmap.ignore_set(), source.id)

    # Pull mapped canonical columns; missing canonical fields become nulls later.
    canonical: dict[str, pl.Series] = {}
    for orig, canon in mapping.items():
        canonical[canon] = df[orig].alias(canon)

    n = df.height
    get = lambda f: canonical.get(f, pl.Series(f, [None] * n, dtype=pl.Utf8))

    payment_date = [dates.parse_date(v) for v in get("payment_date")]
    amount = [money.parse_amount(v) for v in get("amount")]
    supplier_raw = [v for v in get("supplier_name_raw")]

    out = pl.DataFrame(
        {
            "row_id": (
                df["_source_file"].cast(pl.Utf8)
                + ":"
                + df["_source_row_index"].cast(pl.Utf8)
            ),
            "council": pl.Series([source.council] * n),
            "dataset": pl.Series([str(Dataset.SPENDING)] * n),
            "source_file": df["_source_file"],
            "source_url": df["_source_url"],
            "fetched_at": df["_fetched_at"],
            "source_row_index": df["_source_row_index"],
            "transaction_id": get("transaction_id"),
            "invoice_number": get("invoice_number"),
            "body_name": get("body_name"),
            "payment_date": pl.Series("payment_date", payment_date, dtype=pl.Date),
            "date_parse_failed": pl.Series(
                "date_parse_failed",
                [orig is not None and str(orig).strip() != "" and parsed is None
                 for orig, parsed in zip(get("payment_date"), payment_date)],
            ),
            "amount": pl.Series("amount", [float(a) if a is not None else None for a in amount]),
            "amount_basis": pl.Series(
                [getattr(source, "amount_basis", "unknown")] * n
            ),
            "supplier_name_raw": get("supplier_name_raw"),
            "supplier_ref_source": get("supplier_ref_source"),
            "expense_area": get("expense_area"),
            "expense_type": get("expense_type"),
            "expense_code": get("expense_code"),
            "cost_centre": get("cost_centre"),
            "creditor_type": get("creditor_type"),
            "vat_reg_no": get("vat_reg_no"),
            "threshold_floor": pl.Series([source.threshold_floor] * n, dtype=pl.Int32),
            "is_redacted": pl.Series([redaction.is_redacted(s) for s in supplier_raw]),
            "raw": _raw_json_struct(df, source_cols),
        }
    )
    return out


def _assign_suppliers(df: pl.DataFrame) -> tuple[pl.DataFrame, list[dict]]:
    resolver = SupplierResolver()
    ids, norms = [], []
    for name in df["supplier_name_raw"]:
        sid, norm = resolver.resolve(name)
        ids.append(sid or None)
        norms.append(norm or None)
    df = df.with_columns(
        pl.Series("supplier_id_canonical", ids),
        pl.Series("supplier_name_norm", norms),
    )
    return df, resolver.dimension_rows()


def _write_partitioned(df: pl.DataFrame) -> list[dict]:
    """Write spending Parquet Hive-partitioned by council and year.

    Returns one entry per partition file. Browsers can't glob remote
    directories over HTTP, so the manifest lists these paths explicitly for the
    dashboard to read (and prune by council/year filter).
    """
    out_root = paths.PUBLISHED_DIR / "spending"
    df = df.with_columns(
        pl.col("payment_date").dt.year().fill_null(0).alias("year")
    )
    partitions = []
    for (council, year), part in df.group_by(["council", "year"], maintain_order=True):
        rel = f"spending/council={council}/year={year}/part.parquet"
        d = paths.PUBLISHED_DIR / f"spending/council={council}" / f"year={year}"
        d.mkdir(parents=True, exist_ok=True)
        part.drop("year").write_parquet(paths.PUBLISHED_DIR / rel)
        partitions.append(
            {"council": council, "year": int(year), "path": rel, "rows": part.height}
        )
    return sorted(partitions, key=lambda p: (p["council"], p["year"]))


def _write_summaries(df: pl.DataFrame, suppliers: list[dict]) -> None:
    s = paths.PUBLISHED_DIR / "summary"
    s.mkdir(parents=True, exist_ok=True)

    spend = df.filter(pl.col("amount").is_not_null())
    month = (
        spend.with_columns(pl.col("payment_date").dt.strftime("%Y-%m").alias("year_month"))
        .group_by(["council", "year_month"])
        .agg(pl.col("amount").sum().alias("total"), pl.len().alias("txn_count"))
        .sort(["council", "year_month"])
    )
    month.write_parquet(s / "spend_by_month.parquet")

    by_supplier = (
        spend.group_by(["council", "supplier_id_canonical", "supplier_name_norm"])
        .agg(pl.col("amount").sum().alias("total"), pl.len().alias("txn_count"))
        .sort("total", descending=True)
    )
    by_supplier.write_parquet(s / "spend_by_supplier.parquet")

    by_dept = (
        spend.group_by(["council", "expense_area"])
        .agg(pl.col("amount").sum().alias("total"), pl.len().alias("txn_count"))
        .sort("total", descending=True)
    )
    by_dept.write_parquet(s / "spend_by_department.parquet")

    pl.DataFrame(suppliers).write_parquet(s / "dim_suppliers.parquet")

    # Analytical category spend over time (drives the Analysis dashboard views).
    by_category = (
        spend.with_columns(pl.col("payment_date").dt.strftime("%Y-%m").alias("year_month"))
        .group_by(["council", "spend_category", "year_month"])
        .agg(pl.col("amount").sum().alias("total"), pl.len().alias("txn_count"))
        .sort(["council", "spend_category", "year_month"])
    )
    by_category.write_parquet(s / "spend_by_category.parquet")

    # Contractor concentration per council-year: top-10 suppliers' share of spend
    # (a financialisation / market-concentration signal).
    sup_year = (
        spend.with_columns(pl.col("payment_date").dt.year().alias("year"))
        .filter(pl.col("year").is_not_null() & pl.col("supplier_id_canonical").is_not_null())
        .group_by(["council", "year", "supplier_id_canonical"])
        .agg(pl.col("amount").sum().alias("supplier_total"))
        .with_columns(
            pl.col("supplier_total")
            .rank("ordinal", descending=True)
            .over(["council", "year"])
            .alias("rank")
        )
    )
    concentration = (
        sup_year.group_by(["council", "year"])
        .agg(
            pl.col("supplier_total").sum().alias("total"),
            pl.col("supplier_total").filter(pl.col("rank") <= 10).sum().alias("top10"),
            pl.col("supplier_id_canonical").n_unique().alias("n_suppliers"),
        )
        .with_columns((pl.col("top10") / pl.col("total") * 100).alias("top10_pct"))
        .sort(["council", "year"])
    )
    concentration.write_parquet(s / "contractor_concentration.parquet")


def _write_duckdb(df: pl.DataFrame) -> None:
    if paths.CANONICAL_DB.exists():
        paths.CANONICAL_DB.unlink()
    con = duckdb.connect(str(paths.CANONICAL_DB))
    con.register("spend_df", df.drop("raw").to_arrow())
    con.execute("CREATE TABLE spend_transactions AS SELECT * FROM spend_df")
    con.close()


def _write_manifest(df: pl.DataFrame, partitions: list[dict]) -> dict:
    spend = df.filter(pl.col("amount").is_not_null())
    per_council = []
    for council in df["council"].unique().sort():
        c = df.filter(pl.col("council") == council)
        cs = spend.filter(pl.col("council") == council)
        dmin = c["payment_date"].min()
        dmax = c["payment_date"].max()
        per_council.append(
            {
                "council": council,
                "rows": c.height,
                "total_spend": float(cs["amount"].sum() or 0),
                "date_min": dmin.isoformat() if isinstance(dmin, date) else None,
                "date_max": dmax.isoformat() if isinstance(dmax, date) else None,
            }
        )

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "datasets": {
            "spending": {
                "partitioning": ["council", "year"],
                "path": "spending/council=<council>/year=<year>/part.parquet",
                "total_rows": df.height,
                "by_council": per_council,
                "partitions": partitions,
            }
        },
        "summaries": [
            "summary/spend_by_month.parquet",
            "summary/spend_by_supplier.parquet",
            "summary/spend_by_department.parquet",
            "summary/dim_suppliers.parquet",
            "summary/spend_by_category.parquet",
            "summary/contractor_concentration.parquet",
        ],
    }
    paths.MANIFEST_FILE.parent.mkdir(parents=True, exist_ok=True)
    paths.MANIFEST_FILE.write_text(json.dumps(manifest, indent=2))
    return manifest


def build_spending(source_ids: list[str] | None = None) -> dict:
    """Build the spending entity from all (or selected) spending sources."""
    from .stage import load_staging_frames

    sources = load_sources()
    spending_sources = [
        s for s in sources.values()
        if s.dataset == Dataset.SPENDING
        and (source_ids is None or s.id in source_ids)
    ]
    if not spending_sources:
        raise ValueError("No spending sources configured/selected.")

    frames = []
    for src in spending_sources:
        staged_frames = load_staging_frames(src)
        if not staged_frames:
            log.warning("no staging data; skipping", source=src.id)
            continue
        # Map each file separately so drifting headers don't collide.
        for staged in staged_frames:
            frames.append(_map_spending(src, staged))

    if not frames:
        raise ValueError("No staged spending data found. Run fetch + stage first.")

    df = pl.concat(frames, how="vertical")
    df, suppliers = _assign_suppliers(df)
    df = classify(df)
    cov = coverage(df)
    log.info("classification coverage", rows_pct=cov["rows_pct"], amount_pct=cov["amount_pct"])

    paths.ensure_dirs()
    partitions = _write_partitioned(df)
    _write_summaries(df, suppliers)
    _write_duckdb(df)
    manifest = _write_manifest(df, partitions)
    log.info("build complete", rows=df.height, suppliers=len(suppliers))
    return manifest


# --------------------------------------------------------------------------
# Generic canonical mapping (grants, contracts) — smaller entities written as a
# single Parquet each, with provenance and raw preserved like spending.
# --------------------------------------------------------------------------

def _map_canonical(source: SourceConfig, df: pl.DataFrame, fields: list[str]) -> pl.DataFrame:
    """Map a staging frame to canonical string columns + provenance.

    Typed coercion (dates, amounts, supplier ids) is left to the entity builder.
    """
    cmap = load_column_map(source.column_map)
    source_cols = [c for c in df.columns if c not in _PROV_INPUT]
    mapping = resolve_headers(source_cols, cmap.all_variants(), cmap.ignore_set(), source.id)
    n = df.height

    out = {
        "row_id": (
            df["_source_file"].cast(pl.Utf8) + ":" + df["_source_row_index"].cast(pl.Utf8)
        ),
        "council": pl.Series([source.council] * n),
        "dataset": pl.Series([str(source.dataset)] * n),
        "source_file": df["_source_file"],
        "source_url": df["_source_url"],
        "fetched_at": df["_fetched_at"],
        "source_row_index": df["_source_row_index"],
        "raw": _raw_json_struct(df, source_cols),
    }
    canon = {f: pl.Series(f, [None] * n, dtype=pl.Utf8) for f in fields}
    for orig, field in mapping.items():
        if field in canon:
            canon[field] = df[orig].cast(pl.Utf8).alias(field)
    return pl.DataFrame({**out, **canon})


def _coerce_dates(series: pl.Series) -> pl.Series:
    return pl.Series(series.name, [dates.parse_date(v) for v in series], dtype=pl.Date)


def _coerce_amounts(series: pl.Series, name: str) -> pl.Series:
    vals = [money.parse_amount(v) for v in series]
    return pl.Series(name, [float(a) if a is not None else None for a in vals])


def _gather_canonical(dataset: str, fields: list[str]) -> pl.DataFrame | None:
    """Map every staged file of every source for ``dataset`` to canonical rows."""
    from .stage import load_staging_frames

    sources = [s for s in load_sources().values() if s.dataset == dataset]
    frames = []
    for src in sources:
        for staged in load_staging_frames(src):
            frames.append(_map_canonical(src, staged, fields))
    if not frames:
        return None
    return pl.concat(frames, how="vertical")


def build_grants() -> dict | None:
    """Build the grants entity → data/grants/grants.parquet + summary + manifest."""
    df = _gather_canonical(Dataset.GRANTS, GRANT_FIELDS)
    if df is None:
        log.warning("no staged grants data; skipping")
        return None

    df = df.with_columns(
        _coerce_dates(df["award_date"]),
        _coerce_amounts(df["amount"], "amount"),
        pl.col("row_id").alias("grant_id"),
        pl.col("recipient_name_raw")
        .map_elements(normalize_name, return_dtype=pl.Utf8)
        .alias("recipient_name_norm"),
        pl.Series("is_redacted", [redaction.is_redacted(v) for v in df["recipient_name_raw"]]),
    ).with_columns(pl.col("award_date").dt.year().alias("financial_year"))

    # Drop structural subtotal/total rows: these carry an Amount but no recipient
    # (and usually no date), and would double-count the real grant payments.
    before = df.height
    df = df.filter(
        pl.col("recipient_name_raw").is_not_null()
        & (pl.col("recipient_name_raw").str.strip_chars() != "")
    )
    if before != df.height:
        log.info("dropped grants subtotal rows", dropped=before - df.height)

    paths.ensure_dirs()
    out_dir = paths.PUBLISHED_DIR / "grants"
    out_dir.mkdir(parents=True, exist_ok=True)
    df.write_parquet(out_dir / "grants.parquet")

    grants = df.filter(pl.col("amount").is_not_null())
    by_year = (
        grants.group_by(["council", "financial_year"])
        .agg(pl.col("amount").sum().alias("total"), pl.len().alias("grant_count"))
        .sort(["council", "financial_year"])
    )
    (paths.PUBLISHED_DIR / "summary").mkdir(parents=True, exist_ok=True)
    by_year.write_parquet(paths.PUBLISHED_DIR / "summary" / "grants_by_year.parquet")

    fragment = {
        "path": "grants/grants.parquet",
        "total_rows": df.height,
        "by_council": [
            {"council": c, "rows": int(df.filter(pl.col("council") == c).height),
             "total": float(grants.filter(pl.col("council") == c)["amount"].sum() or 0)}
            for c in df["council"].unique().sort()
        ],
    }
    _append_manifest("grants", fragment, ["summary/grants_by_year.parquet"])
    _append_table("grants", df)
    log.info("grants build complete", rows=df.height)
    return fragment


def build_contracts() -> dict | None:
    """Build the contracts entity → data/contracts/contracts.parquet + manifest."""
    df = _gather_canonical(Dataset.CONTRACTS, CONTRACT_FIELDS)
    if df is None:
        log.warning("no staged contracts data; skipping")
        return None

    df = df.with_columns(
        _coerce_dates(df["start_date"]),
        _coerce_dates(df["end_date"]),
        _coerce_dates(df["award_date"]),
        _coerce_amounts(df["value"], "value"),
        pl.col("contract_id").fill_null(pl.col("row_id")),
        pl.col("supplier_name_raw")
        .map_elements(normalize_name, return_dtype=pl.Utf8)
        .alias("supplier_name_norm"),
    )

    # Drop structural rows with neither a title nor a contractor (header/blank
    # padding rows that some registers include).
    df = df.filter(
        (pl.col("title").is_not_null() & (pl.col("title").str.strip_chars() != ""))
        | (pl.col("supplier_name_raw").is_not_null()
           & (pl.col("supplier_name_raw").str.strip_chars() != ""))
    )

    paths.ensure_dirs()
    out_dir = paths.PUBLISHED_DIR / "contracts"
    out_dir.mkdir(parents=True, exist_ok=True)
    df.write_parquet(out_dir / "contracts.parquet")

    valued = df.filter(pl.col("value").is_not_null())
    fragment = {
        "path": "contracts/contracts.parquet",
        "total_rows": df.height,
        "total_value": float(valued["value"].sum() or 0),
        "by_council": [
            {"council": c, "rows": int(df.filter(pl.col("council") == c).height)}
            for c in df["council"].unique().sort()
        ],
    }
    _append_manifest("contracts", fragment, [])
    _append_table("contracts", df)
    log.info("contracts build complete", rows=df.height)
    return fragment


def _append_manifest(dataset_key: str, fragment: dict, summaries: list[str]) -> None:
    """Merge a dataset fragment into the existing manifest (create if absent)."""
    if paths.MANIFEST_FILE.exists():
        manifest = json.loads(paths.MANIFEST_FILE.read_text())
    else:
        manifest = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "datasets": {},
            "summaries": [],
        }
    manifest.setdefault("datasets", {})[dataset_key] = fragment
    existing = set(manifest.get("summaries", []))
    manifest["summaries"] = sorted(existing.union(summaries))
    paths.MANIFEST_FILE.write_text(json.dumps(manifest, indent=2))


def _append_table(name: str, df: pl.DataFrame) -> None:
    """Add/replace a table in the canonical DuckDB without dropping others."""
    con = duckdb.connect(str(paths.CANONICAL_DB))
    con.register("incoming_df", df.drop("raw").to_arrow())
    con.execute(f"CREATE OR REPLACE TABLE {name} AS SELECT * FROM incoming_df")
    con.close()


def build_all(spending_source_ids: list[str] | None = None) -> dict:
    """Build every dataset that has staged data, into one manifest + DuckDB."""
    build_spending(spending_source_ids)  # resets manifest + duckdb (base dataset)
    build_grants()
    build_contracts()
    return json.loads(paths.MANIFEST_FILE.read_text())
