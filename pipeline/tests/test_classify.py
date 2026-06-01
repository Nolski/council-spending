"""Classifier rule hits + that categories partition spend without double-counting."""

from __future__ import annotations

import polars as pl

from council_pipeline.normalize.classify import UNCLASSIFIED, classify, coverage


def _df(rows):
    base = {
        "council": [], "supplier_name_norm": [], "expense_type": [],
        "expense_area": [], "creditor_type": [], "amount": [],
    }
    for r in rows:
        for k in base:
            base[k].append(r.get(k))
    return pl.DataFrame(base)


def test_rules_match_expected_categories():
    df = _df([
        {"council": "exeter", "supplier_name_norm": "premier inn", "amount": 1200.0},
        {"council": "devon", "supplier_name_norm": "hays specialist recruitment", "amount": 800.0},
        {"council": "devon", "supplier_name_norm": "deloitte", "expense_type": "consultancy", "amount": 5000.0},
        {"council": "devon", "supplier_name_norm": "sunrise care home ltd", "expense_area": "adult care", "amount": 3000.0},
        {"council": "devon", "supplier_name_norm": "abc taxis", "expense_type": "home to school transport", "amount": 400.0},
        {"council": "devon", "supplier_name_norm": "acme widgets", "expense_type": "stationery", "amount": 50.0},
    ])
    out = classify(df)
    cats = out["spend_category"].to_list()
    assert cats[0] == "temporary_accommodation"
    assert cats[1] == "agency_staff"
    assert cats[2] == "consultants"
    assert cats[3] == "care_provider"
    assert cats[4] == "send_transport"
    assert cats[5] == UNCLASSIFIED


def test_council_scope_respected():
    # temporary_accommodation is Exeter-scoped: a Devon hotel payment must NOT match it.
    df = _df([{"council": "devon", "supplier_name_norm": "premier inn", "amount": 100.0}])
    out = classify(df)
    assert out["spend_category"][0] != "temporary_accommodation"


def test_categories_do_not_double_count():
    # Every row gets exactly one category; classified + unclassified == total.
    df = _df([
        {"council": "exeter", "supplier_name_norm": "premier inn", "amount": 1200.0},
        {"council": "devon", "supplier_name_norm": "deloitte", "amount": 5000.0},
        {"council": "devon", "supplier_name_norm": "acme widgets", "amount": 50.0},
    ])
    out = classify(df)
    assert out.height == df.height
    cov = coverage(out)
    assert cov["rows_total"] == 3
    assert cov["rows_classified"] == 2
