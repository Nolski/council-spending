"""Grants & contracts builds, plus the real-world parsing quirks they exercise:
preamble rows before the header, duplicated columns, and mojibake in amounts.
"""

from __future__ import annotations

from decimal import Decimal

import polars as pl

from council_pipeline import paths
from council_pipeline.build import build_contracts, build_grants
from council_pipeline.config import get_source
from council_pipeline.normalize import money
from council_pipeline.provenance import Ledger
from council_pipeline.stage import stage_source

# Exeter grants: title + blank preamble, then header, plus a duplicated block.
EXETER_GRANTS = (
    "47001,GRANTS ISSUED,,,\n"
    ",,,,\n"
    "Cost centre description,Amount,Date,Description,Customer/Supplier Name\n"
    "ARTS & EVENTS,45600.00,21/05/2025,80% GRANT,The Exeter Northcott Theatre\n"
    "ARTS & EVENTS,8000.00,21/05/2025,80% GRANT,Libraries Unlimited South West\n"
)

# Exeter contracts: mojibake £ in the value header and values; newlines in headers.
EXETER_CONTRACTS = (
    "Directorate/Service Responsible,Contract Title,Description,Contract Ref:,"
    "Contractor/Provider,Original Start/Commencement Date,Current end date,"
    "Est Total Awarded Contract value �'s (exc VAT) including allowed extensions and inflation\n"
    'Facilities,Cleaning,Communal cleaning,0021,Cobwebs Ltd,15/06/2021,31/05/2027," �880,000.00 "\n'
)


def _write(source_id: str, name: str, content: str) -> None:
    src = get_source(source_id)
    d = paths.raw_dir(src.council, src.dataset)
    d.mkdir(parents=True, exist_ok=True)
    (d / name).write_text(content)


def test_money_handles_mojibake_and_spaces():
    assert money.parse_amount(" �880,000.00 ") == Decimal("880000.00")
    assert money.parse_amount("�1,234") == Decimal("1234")


def test_grants_build_skips_preamble(sandbox):
    _write("exeter_grants", "grants-2025-26.csv", EXETER_GRANTS)
    stage_source(get_source("exeter_grants"), Ledger())
    frag = build_grants()

    assert frag["total_rows"] == 2  # preamble + blank row excluded
    df = pl.read_parquet(paths.PUBLISHED_DIR / "grants" / "grants.parquet")
    assert set(df["recipient_name_raw"]) == {
        "The Exeter Northcott Theatre",
        "Libraries Unlimited South West",
    }
    assert df["amount"].sum() == 53600.0
    assert df["financial_year"].max() == 2025


def test_contracts_build_parses_mojibake_value(sandbox):
    _write("exeter_contracts", "contracts.csv", EXETER_CONTRACTS)
    stage_source(get_source("exeter_contracts"), Ledger())
    frag = build_contracts()

    assert frag["total_rows"] == 1
    df = pl.read_parquet(paths.PUBLISHED_DIR / "contracts" / "contracts.parquet")
    row = df.to_dicts()[0]
    assert row["value"] == 880000.0
    assert row["supplier_name_raw"] == "Cobwebs Ltd"
    assert row["title"] == "Cleaning"
    assert str(row["start_date"]) == "2021-06-15"
