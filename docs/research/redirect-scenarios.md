# Redirect model: specific cuts → council housing (cited benchmarks)

Companion to `council-finance-critique.md` and `revenue-levers.md`. Documents the named
savings candidates and the benchmark parameters behind the re-budget calculator on the
`/story` page. **The calculator output is an illustrative scenario, not a budget line.**

## 1. Where the savings come from (our data, vetted)

From the councils' own transparency data, within the cuttable categories (consultants,
agency staff, IT/software), after **vetting out** capital-project engineering (WSP, Jacobs,
AECOM, Arup), statutory care/fostering (e.g. National Fostering Agency), external audit
(Grant Thornton) and inter-authority transfers — none of which are discretionary waste.
Vetting rules live in `pipeline/config/savings_vetting.yaml`; coverage caveats apply
(~59% classified; sole-trader payees redacted).

**Discretionary annual run-rate (2025, the latest full year):**

| Council | Agency staff | Consultants | IT/software | ~Total/yr |
|---|---|---|---|---|
| Devon (county) | £10.5m | £6.9m | £9.0m | **~£26m** |
| Exeter (district) | £3.1m | £1.8m | £0.5m | **~£5.4m** |

Named discretionary examples (latest-year spend): **Comensura** (managed agency-staffing
vendor) — Devon £4.3m, Exeter £2.5m; **SCC / Software Box / Software AG** (Devon IT);
**Capita Business Services**, **Prospero**, **Sanctuary Personnel** (Devon). These are real,
named, and recurring — the defensible "cuttable" set.

## 2. Benchmark parameters (verified)

- **[Verified] Capital cost per new council home ≈ £250,000** (central; range ~£200k–£420k,
  excluding land). A "straightforward" 3-bed is ~£202k all-in, ~£242k–£252k typical with
  Future Homes Standard. [Housing Forum, *The Cost of Building a House* (2024)](https://housingforum.org.uk/wp-content/uploads/2024/09/The-Cost-of-Building-a-House-Housing-Forum-Sept-2024.pdf).
  **Exeter's own programme is pricier** — certified Passivhaus homes at Vaughan Road run
  ~£393k each (£22m / 56 homes), so Exeter's realistic number sits at the lower end of the
  homes range. [Exeter committee decision](https://committees.exeter.gov.uk/ieDecisionDetails.aspx?Id=2379).
- **[Verified] Net social rent ≈ £5,000 per home / year** (LA general-needs social rent
  ~£99.75/week). [Regulator of Social Housing, LARP 2024](https://assets.publishing.service.gov.uk/media/671a237bb31c669e899c13ed/2024_LARP-briefing-note_FINAL_V1.0.pdf).
  Net of management/maintenance (~30–40% in HRA business plans) this is ~£3,000–£3,500.
- **[Verified, derived] Temporary accommodation ≈ £21,700 per household / year** (England
  blended average: £2.84bn ÷ 130,890 households 2024/25); nightly-paid/B&B is the expensive
  tail (~£25k–£40k). [Shelter/MHCLG](https://england.shelter.org.uk/media/press_release/bill_for_homeless_accommodation_soars_by_25_hitting_28_bn_),
  [MHCLG statutory homelessness 2024/25](https://www.gov.uk/government/statistics/statutory-homelessness-in-england-financial-year-2024-25/statutory-homelessness-in-england-financial-year-2024-25).
- **[Verified] Agency-to-permanent premium ≈ +53%** (children's & family social workers;
  20–60% range for sensitivity). [DfE 2020, via Community Care](https://www.communitycare.co.uk/2023/10/27/dfe-ditches-plan-to-cap-agency-social-worker-pay-to-equivalent-for-permanent-staff/).
  A loaded permanent post is modelled at ~£50,000.

## 3. The HRA ring-fence — the honest constraint

**[Verified]** The Housing Revenue Account is *"not a separate fund but a ring-fenced
account"*; the HRA and General Fund **cannot subsidise each other** in the normal course.
New council housebuilding sits in the HRA, financed by **prudential borrowing serviced by
rents, Right-to-Buy receipts and grant** (the borrowing cap was removed in 2018, so rental
income to service debt is the binding constraint).
[gov.uk — Housing Revenue Account guidance](https://www.gov.uk/guidance/housing-revenue-account).

**Implication the calculator respects:** General-Fund savings (cutting consultants/agency,
avoiding TA cost) **improve the General Fund, not the HRA**. They fund council homes only
*indirectly* — by freeing capacity to lend to or grant the HRA, capitalise, or support a
housing company (as Exeter does). The "homes per year" figure therefore shows the **scale of
what the money is worth**, not an accounting transfer. Exeter funds Vaughan Road via exactly
this mix (HRA receipts + Homes England grant + borrowing).

## 4. Per-council destinations (two-tier honesty)
- **Exeter (district)** holds housing: discretionary savings + TA avoided support its
  council-home programme (target 500 homes 2020–2030).
- **Devon (county)** holds care/SEND/highways, **not housing**: its larger discretionary pot
  realistically reinvests in **insourcing** — replacing agency staff (at ~+53% premium) with
  permanent posts and stabilising services. Devon's own assessment reports low in-house ASC
  agency use but higher reliance/cost in the independent care sector.
  [Devon ASC self-assessment 2025](https://www.devon.gov.uk/adult-social-care/devon-social-care/adult-social-care-assurance/our-self-assessment-of-adult-social-care-in-devon-2025/).

## Limitations
Run-rate is directional (classification ~59%, redaction). Cost-per-home, TA-per-household
and the management/maintenance rent deduction are central estimates / derived figures, not
single published values for these councils. The model is a scenario tool for scale, not a
forecast, and respects the HRA ring-fence as an indirect linkage.
