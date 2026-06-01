# Indicators: from critique to computable metrics

Maps each analytical claim to a metric, the council whose data holds it, and its status
in this project. "Built" = computed in the pipeline and shown in the dashboard;
"Refine" = computed but the classifier rule needs work; "Phase 4" = needs supplementary
curated data (Statements of Accounts / gov.uk stats), not in the transaction feed.

| # | Indicator | Council | Source category | Status |
|---|-----------|---------|-----------------|--------|
| 1 | Outsourced-spend by category over time (agency, consultants, IT, highways) | Both | `spend_by_category` | **Built** |
| 2 | Supplier concentration — top-10 share of annual spend | Both | `contractor_concentration` | **Built** |
| 3 | Top private recipients | Both | `spend_by_supplier` | **Built** |
| 4 | Temporary-accommodation spend trend | Exeter | `spend_by_category` (temporary_accommodation) | **Built** (undercounted by redaction) |
| 5 | Care-provider spend trend | Devon | `spend_by_category` (care_provider) | **Built** (may over-capture) |
| 6 | Private special-school placement spend | Devon | `spend_by_category` (special_school_placement) | **Built** |
| 7 | SEND home-to-school transport spend / cost-per-pupil | Devon | `spend_by_category` (send_transport) | **Refine** (rule under-captures) |
| 8 | Agency-vs-permanent staff ratio | Both | agency spend ÷ payroll | **Refine** (need payroll baseline) |
| 9 | Management-consultant spend trend | Both | `spend_by_category` (consultants) | **Built** |
| 10 | Rent-vs-build ratio (TA revenue spend ÷ housing capital) | Exeter | spend + capital programme | **Phase 4** |
| 11 | Council-housing stock + HRA rent revenue + RTB sales | Exeter | HRA accounts + gov.uk stats | **Phase 4** |
| 12 | PFI unitary charge as % of budget | Devon | Statement of Accounts Note 35 | **Phase 4** (Devon: Exeter Schools + EfW PFI confirmed) |
| 13 | SEND/DSG high-needs deficit + Safety Valve trajectory | Devon | Statement of Accounts / DfE | **Phase 4** |
| 14 | Reserves trajectory | Both | Statement of Accounts | **Phase 4** |
| 15 | Care-operator beneficial ownership (PE/offshore) | Devon | Companies House join | **Stretch** |
| 16 | Grants to community/voluntary sector | Both | grants dataset | **Built** (Grants page) |

## Classifier coverage & honesty notes
- Classification covers **~59% of spend by value**; the remainder is `unclassified`
  (genuine miscellaneous spend). The dashboard reports this so categories can't be
  silently overstated.
- Redaction of sole-trader payees understates small-landlord (TA) and small-provider
  (care) categories.
- `care_provider` uses a broad `\bcare\b` match and may over-capture; `send_transport`
  under-captures. Both are flagged in the report and in the dashboard narrative.

## Refinement backlog (classifier)
- Rebuild `send_transport` against Devon's actual expense descriptions (home-to-school /
  passenger transport / SEN taxi contracts).
- Tighten `care_provider` to reduce false positives (e.g. exclude "childcare",
  "healthcare" where not adult social care).
- Add `pfi` category to flag the recurring SPV unitary-charge payments in Devon's data.
