import pytest

from council_pipeline.config import load_column_map
from council_pipeline.parsers.header_map import (
    UnmappedHeaderError,
    normalize_header,
    resolve_headers,
)


def test_real_devon_header_resolves():
    cmap = load_column_map("devon_spending")
    # The verified live Devon header (March 2026 file).
    headers = [
        "Body", "Name of Body", "Date", "Transaction number", "Amount",
        "Supplier name", "Supplier ID", "VAT reg no", "Expense area",
        "Expense type", "Expense code", "Costcuk", "Creditor type",
    ]
    mapping = resolve_headers(
        headers, cmap.all_variants(), cmap.ignore_set(), "devon_spending"
    )
    assert mapping["Amount"] == "amount"
    assert mapping["Supplier name"] == "supplier_name_raw"
    assert mapping["Costcuk"] == "cost_centre"
    assert "Body" not in mapping  # ignored intentionally


def test_unmapped_header_fails_loudly():
    cmap = load_column_map("devon_spending")
    with pytest.raises(UnmappedHeaderError):
        resolve_headers(
            ["Amount", "Totally New Column"],
            cmap.all_variants(),
            cmap.ignore_set(),
            "devon_spending",
        )


def test_normalize_header_strips_punctuation_and_case():
    assert normalize_header("VAT reg no") == "vatregno"
    assert normalize_header("Supplier ID") == "supplierid"
