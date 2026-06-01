"""Tag spending transactions with an analytical ``spend_category``.

Rules come from ``config/classifications.yaml`` (ordered, first match wins). This
is a *lens* over the data for the critical/re-budgeting analysis — not a claim of
completeness — so the share of spend left ``unclassified`` is reported by the
build and should be watched when refining rules.
"""

from __future__ import annotations

import yaml
from pydantic import BaseModel

import polars as pl

from .. import paths

UNCLASSIFIED = "unclassified"


class Rule(BaseModel):
    category: str
    fields: list[str]
    patterns: list[str]
    council: str = "both"


def load_rules() -> list[Rule]:
    body = yaml.safe_load((paths.CONFIG_DIR / "classifications.yaml").read_text())
    return [Rule(**r) for r in body["rules"]]


def _rule_mask(rule: Rule, available: set[str]) -> pl.Expr:
    """Boolean expression: any pattern matches any field (scoped by council)."""
    regex = "(?i)(" + "|".join(rule.patterns) + ")"
    field_match: pl.Expr | None = None
    for f in rule.fields:
        if f not in available:
            continue
        m = pl.col(f).cast(pl.Utf8).fill_null("").str.contains(regex)
        field_match = m if field_match is None else (field_match | m)
    if field_match is None:
        field_match = pl.lit(False)
    if rule.council and rule.council != "both":
        field_match = field_match & (pl.col("council") == rule.council)
    return field_match


def classify(df: pl.DataFrame, rules: list[Rule] | None = None) -> pl.DataFrame:
    """Return ``df`` with a ``spend_category`` column added."""
    rules = rules or load_rules()
    available = set(df.columns)

    # Fold rules in reverse so the FIRST rule ends up outermost = highest priority.
    expr: pl.Expr = pl.lit(UNCLASSIFIED)
    for rule in reversed(rules):
        expr = pl.when(_rule_mask(rule, available)).then(pl.lit(rule.category)).otherwise(expr)

    return df.with_columns(expr.alias("spend_category"))


def coverage(df: pl.DataFrame) -> dict:
    """Summarise classification coverage (for honest reporting/logging)."""
    total = df.height
    amount_total = float(df["amount"].fill_null(0).abs().sum())
    classified = df.filter(pl.col("spend_category") != UNCLASSIFIED)
    return {
        "rows_total": total,
        "rows_classified": classified.height,
        "rows_pct": round(100 * classified.height / total, 1) if total else 0,
        "amount_total": amount_total,
        "amount_classified": float(classified["amount"].fill_null(0).abs().sum()),
        "amount_pct": round(
            100 * float(classified["amount"].fill_null(0).abs().sum()) / amount_total, 1
        ) if amount_total else 0,
    }
