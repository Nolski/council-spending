from datetime import date
from decimal import Decimal

from council_pipeline.normalize import dates, money, redaction
from council_pipeline.normalize.suppliers import SupplierResolver, normalize_name


def test_parse_uk_and_iso_dates():
    assert dates.parse_date("31/03/2024") == date(2024, 3, 31)
    assert dates.parse_date("2024-03-31") == date(2024, 3, 31)
    assert dates.parse_date("2017-04-03 00:00:00") == date(2017, 4, 3)  # ISO datetime
    assert dates.parse_date("44197") == date(2021, 1, 1)  # Excel serial (1900 system)
    assert dates.parse_date("not a date") is None
    assert dates.parse_date("") is None


def test_parse_amounts():
    assert money.parse_amount("£1,234.56") == Decimal("1234.56")
    assert money.parse_amount("(500.00)") == Decimal("-500.00")
    assert money.parse_amount("250-") == Decimal("-250")
    assert money.parse_amount("") is None
    assert money.parse_amount("n/a") is None


def test_redaction_detection():
    assert redaction.is_redacted("Redacted - Personal Data")
    assert redaction.is_redacted("Information withheld")
    assert not redaction.is_redacted("Acme Ltd")


def test_supplier_normalization_collapses_suffixes():
    assert normalize_name("Acme Ltd") == normalize_name("ACME Limited")
    assert normalize_name("The Widget Co.") == "widget"


def test_supplier_ids_are_stable_and_clustered():
    r1 = SupplierResolver()
    a1, _ = r1.resolve("Acme Ltd")
    b1, _ = r1.resolve("ACME LIMITED")
    assert a1 == b1  # suffix + case variants cluster together
    assert a1.startswith("sup_")

    # Same inputs in a fresh resolver give the same id (stable hashing).
    r2 = SupplierResolver()
    a2, _ = r2.resolve("Acme Ltd")
    assert a1 == a2
