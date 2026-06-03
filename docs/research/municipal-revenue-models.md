# Municipal revenue models: the insourcing → reinvestment flywheel (cited)

Companion to `revenue-levers.md`, `redirect-scenarios.md` and `progressive-cuts.md`. Documents the
model behind the "Insource & reinvest" calculator on the `/story` page: (1) how insourcing produces an
honest recurring saving, (2) the proven revenue-generating assets a council can reinvest in, and (3) the
compounding "flywheel". **The calculator output is an illustrative scenario, not a forecast.** Confidence:
**[Verified]** primary/official source; **[Reported]** credible secondary.

## 1. The honest saving — recovered margin, not gross spend
Cutting a contractor doesn't free the whole payment: that money buys real staff hours and software.
Insourcing frees only the **margin/premium** the council stops paying a third party.

- **[Verified] Agency-to-permanent premium ≈ +53%** (children's & family social workers; 20–60%
  sensitivity). So the recoverable fraction of gross agency spend is `premium/(1+premium)` = **0.53/1.53 ≈
  34.6%** — the service continues, delivered by permanent staff, and the *premium* is the saving.
  [DfE 2020, via Community Care](https://www.communitycare.co.uk/2023/10/27/dfe-ditches-plan-to-cap-agency-social-worker-pay-to-equivalent-for-permanent-staff/).
- **[Verified] Consultants / outsourced services — contractor margin recaptured ≈ 12–30%.** APSE finds
  outsourced contracts carry management fees of **~12–19%** (Liverpool streetscene), with up to ~30% saved
  in a leisure case; the majority of surveyed councils said insourcing would *not* increase costs. Modelled
  as a flat, explicitly **[Illustrative]** ~15% margin recovered (no single authoritative figure).
  [APSE — insourcing update](https://www.apse.org.uk/apse/index.cfm/research/current-research-programme/insourcing-update-the-value-of-returning-local-authority-services-in-house-in-an-era-of-budget-constraints/).
- **IT/software excluded** — licences and SaaS have no in-house labour margin to recover; insourcing a
  licence is meaningless. Renegotiation, not insourcing, is the lever there.

Recurring saving `R = insourcing margin + progressive revenue levers` (the levers from
`progressive-cuts.md`). Example: Devon agency fully insourced ≈ £10.53m × 0.346 ≈ **£3.65m/yr** (vs the old
model's misleading £10.53m "cut").

## 2. The reinvestment menu — productive assets that pay (with returns)
The decisive line (`revenue-levers.md`): **productive, service-linked, income-generating assets work;
leveraged borrowing to buy assets "primarily for yield" failed** (Woking ~£1.2bn, Thurrock ~£500m) and was
barred by the PWLB in Nov 2020.

| Asset | Typical return / yield | Works / risky | Evidence |
|---|---|---|---|
| Council homes for rent | rent (~2%) + homelessness cost avoided (~8.7%) | Works (district) | RSH LARP 2024; Shelter/MHCLG — **[Verified]** |
| Municipal solar **generation** | ~4% cash dividend / ~8% gross op-surplus on capex | Works | Warrington BC: £2.4m dividend, ~£150m/30yr on £62.3m capex — **[Verified]** |
| In-area commercial property for rent | ~5–10% net yield | Works (low-leverage) | Industry norms; NOT borrow-to-buy-for-yield (PWLB ban) — **[Verified]** |
| Council-owned bus company | ~5–8% operating margin; modest, lumpy dividends | Works (service value) | Lothian Buses £3.2m div (2024); Nottingham City Transport; Bus Services Act 2025 lifts the ban — **[Verified]** |
| Bereavement services (crematoria) | reliable net surplus (£0.5m+/site/yr) | Works (capacity-bound) | NAFD/LGA — ~£95–100m sector surplus — **[Reported]** |
| Insourcing (recapture margin) | ~12–30% of contract value | Works | APSE — **[Verified]** |

Avoid / fails: council **retail energy supply** (Robin Hood Energy −£38m, Bristol Energy up to −£43.8m) —
distinct from owning generation; **borrow-to-buy-for-yield** property portfolios (Woking, Thurrock).
The endgame model is Germany's **Stadtwerke**: profitable municipal energy generation explicitly
cross-subsidises loss-making local transport.
[Stadtwerke](https://www.cleanenergywire.org/factsheets/small-powerful-germanys-municipal-utilities),
[Chattanooga EPB municipal broadband](https://epb.com/newsroom/epb-news/epbs-fiber-optic-network-generated-269-billion-economic-benefits-past-decade-study-shows/)
(~8–9% on capital, but only because it already owned the electric utility's poles + customers — a
precondition warning).

## 3. The flywheel — compounding the recurring saving
Reinvest the recurring saving `R` **plus** the income it earns, each year, at yield `y`, over horizon `N`:
```
I_0 = 0
A_t = I_{t-1} × y          # income on capital invested so far
I_t = I_{t-1} + R + A_t    # reinvest the saving AND the returns  ⇒  I_t = (1+y)·I_{t-1} + R
```
Contrast with spending the saving on consumption each year (`R × t`, linear, leaves no asset). The gap —
the owned asset stock and its growing income — is the argument. Horizon N = 15 years (matches the
rent-vs-build chart). Exeter's yield blends rent + TA-avoided (~10.7%); Devon's solar/property are lower
(~4–6%) because the county lacks the homelessness cost-avoidance lever.

## Honesty / caveats
- **Illustrative, not a forecast** — shows structural scale and logic, not a cashflow projection.
- **HRA ring-fence** — General-Fund savings can't be transferred into housing; they fund homes
  *indirectly* by freeing capacity to borrow/grant against rents (`redirect-scenarios.md`).
- **Margin, not gross** — the saving is recovered contractor premium/margin; the calculator shows both.
- **Premium sensitivity** (20–60%) and **consultant margin** (illustrative ~15%) are uncertain bands.
- **rent + TA-avoided** blends cash revenue with avoided cost, and TA-avoidance only accrues while that
  demand exists. Default-on per the essay's editorial choice, but labelled.
- **R is bounded** by total insourceable spend; compounding comes from reinvested yield, not ever-growing
  cuts. Homes/assets are lumpy and lagged — the curve shows scale, not timing.
- Bus companies and bereavement are real but **capacity-bounded** (not infinitely scalable), so they sit in
  the narrative menu rather than the compounding slider; standalone municipal **broadband** and **district
  heating** only pay with the right preconditions (incumbent utility; waste-heat source).
