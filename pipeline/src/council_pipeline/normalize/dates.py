"""Date parsing for UK council data.

Tries ISO, then UK ``DD/MM/YYYY`` forms, then Excel serial numbers (common in
XLSX exports). On failure the row is *kept* — we return ``None`` and the caller
sets a ``date_parse_failed`` flag rather than dropping data.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta

# Excel's day 0 is 1899-12-30 (accounting for the 1900 leap-year bug).
_EXCEL_EPOCH = date(1899, 12, 30)

_FORMATS = (
    "%Y-%m-%d",
    "%Y-%m-%d %H:%M:%S",
    "%d/%m/%Y",
    "%d/%m/%Y %H:%M:%S",
    "%d/%m/%y",
    "%d-%m-%Y",
    "%d.%m.%Y",
    "%d %b %Y",
    "%d %B %Y",
)


def parse_date(value: object) -> date | None:
    """Return an ISO ``date`` or ``None`` if the value cannot be parsed."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value

    s = str(value).strip()
    if not s:
        return None

    for fmt in _FORMATS:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue

    # Excel serial date (e.g. "45748"). Bounded to avoid matching stray integers.
    try:
        serial = float(s)
        if 1 <= serial <= 100_000:
            return _EXCEL_EPOCH + timedelta(days=int(serial))
    except ValueError:
        pass

    return None
