"""End-to-end: raw fixtures → stage → build, exercising the data contract."""

from __future__ import annotations

import json

import polars as pl

from council_pipeline import paths
from council_pipeline.build import build_spending
from council_pipeline.config import get_source
from council_pipeline.provenance import Ledger
from council_pipeline.stage import stage_source

# Current Devon header era.
ERA_CURRENT = (
    "Body,Name of Body,Date,Transaction number,Amount,Supplier name,Supplier ID,"
    "VAT reg no,Expense area,Expense type,Expense code,Costcuk,Creditor type\n"
    "DCC,Devon County Council,31/03/2024,T1,1234.56,Acme Ltd,S1,GB123,Highways,Materials,4001,CC1,Trade\n"
    "DCC,Devon County Council,01/04/2024,T2,(500.00),ACME LIMITED,S1,GB123,Highways,Materials,4001,CC1,Trade\n"
    "DCC,Devon County Council,02/04/2024,T3,99.00,Redacted - Personal Data,,,Social Care,Payments,5002,CC2,Sundry\n"
)

# Older era with drifted headers + one unparseable date (row must be KEPT + flagged).
ERA_OLD = (
    "Body Name,Payment Date,Trans no,Net Amount,Supplier Name,Service Area\n"
    "Devon County Council,15/06/2019,X9,2000.00,Acme Ltd,Education\n"
    "Devon County Council,unknown,X10,750.00,Beta Services Plc,Education\n"
)


def _write_raw(name: str, content: str) -> None:
    d = paths.raw_dir("devon", "spending")
    d.mkdir(parents=True, exist_ok=True)
    (d / name).write_text(content)


def test_build_end_to_end(sandbox):
    _write_raw("DCCSpendingOver500_202403.csv", ERA_CURRENT)
    _write_raw("DCCSpendingOver500_201906.csv", ERA_OLD)

    ledger = Ledger()
    src = get_source("devon_spending")
    assert stage_source(src, ledger) == 2

    build_spending(["devon_spending"])

    db = paths.PUBLISHED_DIR / "council.duckdb"
    assert db.exists()

    # Read back the partitioned canonical parquet.
    df = pl.read_parquet(paths.PUBLISHED_DIR / "spending" / "**" / "*.parquet")
    assert df.height == 5  # no rows dropped

    # Redaction flagged, row kept.
    assert df.filter(pl.col("is_redacted"))["row_id"].len() == 1

    # Bad date kept but flagged; good dates parsed.
    assert df.filter(pl.col("date_parse_failed"))["row_id"].len() == 1
    assert df.filter(pl.col("payment_date").is_not_null()).height == 4

    # Accounting-bracket negative parsed.
    assert df["amount"].min() == -500.0

    # Supplier clustering across casing/suffix + across eras.
    acme = df.filter(pl.col("supplier_name_norm") == "acme")
    assert acme.height == 3
    assert acme["supplier_id_canonical"].n_unique() == 1

    # Threshold + council provenance present.
    assert set(df["threshold_floor"].unique()) == {500}
    assert set(df["council"].unique()) == {"devon"}

    # Manifest written with coverage.
    manifest = json.loads(paths.MANIFEST_FILE.read_text())
    assert manifest["datasets"]["spending"]["total_rows"] == 5


def test_rerun_is_idempotent(sandbox):
    _write_raw("DCCSpendingOver500_202403.csv", ERA_CURRENT)
    ledger = Ledger()
    src = get_source("devon_spending")

    assert stage_source(src, ledger) == 1
    # Second stage: nothing changed, so nothing re-staged.
    assert stage_source(src, ledger) == 0

    m1 = build_spending(["devon_spending"])
    m2 = build_spending(["devon_spending"])
    assert m1["datasets"]["spending"]["total_rows"] == m2["datasets"]["spending"]["total_rows"]
