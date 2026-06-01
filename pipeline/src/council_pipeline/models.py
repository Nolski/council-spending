"""Canonical schema definitions.

These are the conformed entities the dashboard consumes. Every canonical row also
carries the provenance columns (see ``PROVENANCE_FIELDS``) so any value can be
traced back to the exact source file, URL and fetch date, and the original row is
preserved verbatim in the ``raw`` column.
"""

from __future__ import annotations

from enum import StrEnum


class Council(StrEnum):
    DEVON = "devon"
    EXETER = "exeter"


class Dataset(StrEnum):
    SPENDING = "spending"
    CONTRACTS = "contracts"
    GRANTS = "grants"
    SALARIES = "salaries"


class AmountBasis(StrEnum):
    """Whether a money amount includes VAT. We label, never silently convert."""

    NET = "net"
    GROSS = "gross"
    UNKNOWN = "unknown"


# Columns attached to every canonical row, in addition to the entity fields below.
PROVENANCE_FIELDS = [
    "row_id",            # deterministic hash(source_file + source_row_index)
    "council",
    "dataset",
    "source_file",       # raw filename
    "source_url",        # where it was downloaded from
    "fetched_at",        # ISO timestamp the file was fetched
    "source_row_index",  # 0-based row position within the source file
    "raw",               # JSON object of all original columns (nothing is dropped)
]

# Canonical field lists per entity (provenance fields are added on top).
SPEND_FIELDS = [
    "transaction_id",
    "invoice_number",
    "body_name",
    "payment_date",       # ISO date (nullable on parse failure)
    "date_parse_failed",  # bool flag — row is kept even when the date won't parse
    "amount",             # decimal
    "amount_basis",       # net | gross | unknown
    "supplier_name_raw",
    "supplier_name_norm",     # normalized match key
    "supplier_id_canonical",  # stable hash id assigned by the supplier dedup step
    "supplier_ref_source",    # the council's own supplier id, if published
    "expense_area",
    "expense_type",
    "expense_code",
    "cost_centre",
    "creditor_type",
    "vat_reg_no",
    "threshold_floor",    # 250 | 500 — publication threshold for this source
    "is_redacted",
]

CONTRACT_FIELDS = [
    "contract_id",
    "title",
    "description",
    "supplier_name_raw",
    "supplier_name_norm",
    "supplier_id_canonical",
    "value",
    "start_date",
    "end_date",
    "award_date",
    "procurement_ref",
    "category",
    "status",
]

GRANT_FIELDS = [
    "grant_id",
    "financial_year",
    "recipient_name_raw",
    "recipient_name_norm",
    "amount",
    "purpose",
    "grant_programme",
    "award_date",
]

SALARY_FIELDS = [
    "record_id",
    "financial_year",
    "post_title",
    "name",          # frequently redacted / null
    "is_redacted",
    "salary_band_min",
    "salary_band_max",
    "salary_point",
    "bonuses",
    "expenses_allowances",
    "fte",
]

ENTITY_FIELDS: dict[str, list[str]] = {
    Dataset.SPENDING: SPEND_FIELDS,
    Dataset.CONTRACTS: CONTRACT_FIELDS,
    Dataset.GRANTS: GRANT_FIELDS,
    Dataset.SALARIES: SALARY_FIELDS,
}
