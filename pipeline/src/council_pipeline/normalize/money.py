"""Money parsing.

Handles ``£``, thousands separators, and the two common negative conventions
(leading ``-`` and accounting brackets ``(123.45)``). Returns ``None`` when the
value is blank/unparseable so the caller can keep the row and flag it.

We never convert between net and gross here — the ``amount_basis`` label is set
from the source config so totals stay honest.
"""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation

_STRIP = re.compile(r"[£$,\s]")


def parse_amount(value: object) -> Decimal | None:
    if value is None:
        return None
    if isinstance(value, (int, float, Decimal)):
        try:
            return Decimal(str(value))
        except InvalidOperation:
            return None

    s = str(value).strip()
    if not s:
        return None

    negative = False
    if s.startswith("(") and s.endswith(")"):
        negative = True
        s = s[1:-1]

    s = _STRIP.sub("", s)
    if s.endswith("-"):  # trailing-minus convention
        negative = True
        s = s[:-1]
    if not s or s in {"-", "."}:
        return None

    try:
        amount = Decimal(s)
    except InvalidOperation:
        return None
    return -amount if negative else amount
