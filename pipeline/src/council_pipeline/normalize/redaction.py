"""Detect rows whose payee has been redacted for personal-data reasons.

Redacted rows are kept (they still carry a real amount and date) but flagged, so
analysis can include or exclude them deliberately.
"""

from __future__ import annotations

import re

_REDACTED = re.compile(
    r"redact|personal\s*data|withheld|not\s*disclosed|individual|private",
    re.IGNORECASE,
)


def is_redacted(*values: object) -> bool:
    for v in values:
        if v is None:
            continue
        if _REDACTED.search(str(v)):
            return True
    return False
