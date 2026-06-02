"""Vetting logic for the candidate-savings layer.

Guards the credibility-critical rule: capital-engineering, care/fostering, statutory
inter-authority and intra-group payments must NOT be counted as discretionary
"cuttable" spend, while genuine temp-staffing / management consultancy must be.
"""

from __future__ import annotations

from council_pipeline.story import _excluded, _load_vetting


def test_vetting_excludes_false_positives():
    exclude, committed = _load_vetting()

    # Must be EXCLUDED (not genuine discretionary spend):
    for name in [
        "WSP UK LTD",                      # capital engineering
        "JACOBS UK LTD_(GLASGOW)",         # capital engineering
        "NATIONAL FOSTERING AGENCY",       # care placement, not temp staff
        "TRENOVISSICK DOM CARE AGENCY",    # domiciliary care
        "SOMERSET COUNTY COUN (TREAS)",    # inter-authority transfer (truncated name)
        "DEPARTMENT FOR EDUCATION",        # statutory body
        "GRANT THORNTON",                  # statutory external audit
        "STRATA SERVICE SOLUTIONS LTD",    # intra-group shared service
    ]:
        assert _excluded(name, exclude), f"{name!r} should be excluded"

    # Must be KEPT as discretionary:
    for name in ["COMENSURA LTD", "SANCTUARY PERSONNEL LTD", "PROSPERO RECRUITMENT LTD"]:
        assert not _excluded(name, exclude), f"{name!r} should count as discretionary"


def test_committed_contracts_flagged_separately():
    _, committed = _load_vetting()
    assert _excluded("Mears Ltd", committed)        # large outsourced service contract
    assert not _excluded("Comensura Ltd", committed)  # not a committed-contract entry
