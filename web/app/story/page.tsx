"use client";

import type { EChartsOption } from "echarts";
import { Beat, Para, BeatHead } from "@/components/story/Beat";
import { BigStat, SourceTag } from "@/components/story/BigStat";
import { AnnotatedChart } from "@/components/story/AnnotatedChart";
import { PullQuote } from "@/components/story/PullQuote";
import { RebudgetCalculator } from "@/components/story/RebudgetCalculator";
import { useQuery } from "@/lib/useQuery";
import { loadStory, categoryTotal, type FromData } from "@/lib/story";
import { gbp, councilLabel } from "@/lib/format";
import { asset } from "@/lib/basepath";
import { categoryLabel } from "@/lib/charts";

export default function StoryPage() {
  const story = useQuery(() => loadStory(), []);
  const d = story.data?.data;
  const c = story.data?.curated;

  return (
    <article className="-mt-6">
      {/* Hero */}
      <header className="mx-auto max-w-3xl px-5 pb-6 pt-16 text-center">
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          Devon &amp; Exeter council finance
        </div>
        <h1 className="story-display text-4xl font-extrabold leading-tight text-neutral-900 sm:text-6xl dark:text-neutral-50">
          No one is coming
        </h1>
        <p className="story-prose mx-auto mt-5 max-w-2xl text-xl text-neutral-600 dark:text-neutral-300">
          Central government has cut local funding for over a decade and won&apos;t reverse
          course. So the real question isn&apos;t whether rescue arrives — it&apos;s how two
          councils dig themselves out. Here is where the money goes, where it leaks, and
          what could change.
        </p>
        <div className="mt-6 text-sm text-neutral-400">
          A data argument · built from the councils&apos; own published spending
        </div>
      </header>

      {!d || !c ? (
        <p className="py-20 text-center text-neutral-400">Loading the data…</p>
      ) : (
        <>
          {/* 1 — The hole */}
          <Beat>
            <BeatHead kicker="The hole">A slow, deliberate squeeze</BeatHead>
            <Para>
              The pressure on Devon and Exeter is not local mismanagement — it is a national
              choice. Across England, council core funding per resident is now nearly a fifth
              below 2010, and the cuts fell hardest on the places with the least.
            </Para>
          </Beat>
          <BigStat value={c.funding_cut_pct.value} label={c.funding_cut_pct.label} kind="verified" source={`${c.funding_cut_pct.source}`} />
          <BigStat value={c.efs.value} label={c.efs.label} kind="verified" source={c.efs.source} />
          <Beat>
            <Para>
              Emergency bailouts have ballooned twenty-fold, and three-quarters of councils
              now raid their reserves just to balance the books. This is a structural deficit,
              not a cash-flow blip — and the cavalry is not coming.
            </Para>
          </Beat>

          {/* 2 — The squeeze */}
          <Beat>
            <BeatHead kicker="Where it landed">Care eats everything else</BeatHead>
            <Para>
              As budgets shrank, legally-required social care crowded out almost everything
              discretionary. Youth services, planning, culture, transport and housing were
              hollowed out to keep statutory services alive.
            </Para>
          </Beat>
          <AnnotatedChart
            title="What grew, and what was cut (England, 2010–11 → 2023–24)"
            option={serviceShiftOption(c.service_shift.items)}
            caption="Social care rose to ~65% of non-education budgets; everything discretionary was squeezed."
            kind="verified"
            source={c.service_shift.source}
            height={320}
          />
          <BigStat value={c.regressive.value} label={c.regressive.label} kind="verified" source={c.regressive.source} />

          {/* 3 — The leak */}
          <Beat>
            <BeatHead kicker="The leak">Money flows out to profit</BeatHead>
            <Para>
              What money remains increasingly flows to private hands — and at the district
              level, to a remarkably small number of them. In Exeter, the ten largest
              suppliers capture more than half of all spending.
            </Para>
          </Beat>
          <AnnotatedChart
            title="Supplier concentration: top-10 suppliers' share of annual spend"
            option={concentrationOption(d)}
            caption="Exeter's spending is far more concentrated than Devon's larger, more dispersed supplier base."
            kind="data"
            source={d.meta.note}
            height={320}
          />
          <AnnotatedChart
            title="Outsourced spending we can identify (cumulative)"
            option={leakBarOption(d)}
            caption="Agency staff, consultants and IT contracts are recurring transfers to the private sector."
            kind="data"
            source="Our analysis — directional; ~59% of spend classified."
            height={300}
          />
          <BigStat value={c.care_leakage.value} label={c.care_leakage.label} kind="verified" source={c.care_leakage.source} />
          <PullQuote cite="The structural problem">
            Every pound leaking out as profit, agency premium or consultancy fee is a pound
            not spent on care, housing or children.
          </PullQuote>

          {/* ===== PART TWO: THE PROPOSAL ===== */}

          {/* 4 — What didn't work */}
          <Beat>
            <BeatHead kicker="What didn&rsquo;t work">The expensive lessons</BeatHead>
            <Para>
              Before prescribing anything, look at how other councils tried to dig out — and
              bankrupted themselves doing it. The failures share a shape: <em>borrowed money
              chasing a financial return</em>. When the bet went wrong, there was no asset left
              to show for it, only debt.
            </Para>
          </Beat>
          <BigStat value={c.cautionary.value} label={c.cautionary.label} kind="verified" source={c.cautionary.source} />
          <Beat>
            <Para>
              The second failure mode is closer to home. Building homes to <em>sell</em> puts
              the council on the wrong side of the property market: Exeter&apos;s own for-sale
              development company was wound up after heavy losses and a handful of completions.
            </Para>
          </Beat>
          <BigStat value={c.exeter_city_living.value} label={c.exeter_city_living.label} kind="verified" source={c.exeter_city_living.source} />
          <Beat>
            <Para>
              The third is the slow leak we already saw: outsourcing core services and buying
              into markets engineered to extract profit. Reselling energy was a clean disaster;
              the care market quietly bleeds roughly a tenth of its income to profit, rent and
              interest every year.
            </Para>
          </Beat>
          <AnnotatedChart
            title="Reselling energy lost millions; owning generation paid (£m)"
            option={energyOption(c.energy_compare.items)}
            caption="Council retail-energy ventures collapsed — the failures that frame what does work next."
            kind="verified"
            source={c.energy_compare.source}
            height={300}
          />
          <BigStat value={c.care_leakage.value} label={c.care_leakage.label} kind="verified" source={c.care_leakage.source} />
          <PullQuote cite="The pattern">
            Leveraged speculation, building to sell, and outsourcing to extractive markets all
            failed the same way: the council carried the risk and a private balance sheet kept
            the reward.
          </PullQuote>

          {/* 5 — What works */}
          <Beat>
            <BeatHead kicker="What works">Assets that pay, not bets that bankrupt</BeatHead>
            <Para>
              The durable move is the mirror image: build or keep assets the council{" "}
              <em>owns</em>, that throw off income or avoid a recurring cost. The biggest prize
              sits in plain sight — homelessness. Every household in nightly temporary
              accommodation is a permanent, unsubsidised drain; a council home for rent turns
              that liability into a yielding asset.
            </Para>
          </Beat>
          <BigStat value={c.temp_accommodation.value} label={c.temp_accommodation.label} kind="verified" source={c.temp_accommodation.source} />
          <AnnotatedChart
            title="Rent vs build: a liability that recurs vs. an asset that pays"
            option={rentVsBuildOption(c.rent_vs_build)}
            caption={c.rent_vs_build.note}
            kind="illustrative"
            source={c.rent_vs_build.source}
            height={320}
          />
          <Beat>
            <Para>
              The same logic runs through the rest. <strong>Owning</strong> solar generation
              paid Warrington a dividend even as reselling energy bankrupted others.{" "}
              <strong>Insourcing</strong> recaptures the contractor margin. And keeping money
              circulating locally — the Preston model — quietly redirected tens of millions
              into the local economy.
            </Para>
          </Beat>
          <BigStat value={c.preston.amount} label={c.preston.label} kind="verified" source={c.preston.source} />
          <Beat>
            <Para>
              Other levers are real but modest, and honesty matters: local climate bonds have
              raised {c.cmi.value} nationally; roughly {c.land_value.value} of development
              land-value uplift goes uncaptured. None replaces core funding — together they
              diversify income the council owns and keep wealth local.
            </Para>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MiniStat value={c.cmi.value} label={c.cmi.label} source={c.cmi.source} />
              <MiniStat value={c.land_value.value} label={c.land_value.label} source={c.land_value.source} />
            </div>
          </Beat>
          <Beat>
            <Para>
              These aren&apos;t wishful — councils elsewhere already run them at a profit. The
              menu of <em>productive</em> assets (income-generating, service-linked) is wider than
              housing, and Germany&apos;s municipal utilities show the endgame: profitable energy
              generation cross-subsidising the services that lose money. The line that matters is
              owning a productive asset, never borrowing to gamble on yield.
            </Para>
            <RevenueMenu rows={c.revenue_menu} />
          </Beat>

          {/* 6 — Where to cut (progressively) */}
          <Beat>
            <BeatHead kicker="Where to cut">Hard, honest — and fair</BeatHead>
            <Para>
              None of this is free. Owning assets takes up-front money, and the settlement
              from Westminster won&apos;t provide it — so the first round has to come from
              cuts. Cuts are painful, so the question is <em>who pays</em>. Council tax already
              falls hardest on those with the least, so the fairest place to start is the
              mirror image: charges and reliefs that fall on wealth and assets, not on need.
            </Para>
          </Beat>
          <BigStat value={c.council_tax_regressive.value} label={c.council_tax_regressive.label} kind="verified" source={c.council_tax_regressive.source} />
          <Beat>
            <Para>
              Here are specific, named levers Devon and Exeter already control — each one
              weighted toward those most able to pay. Several are real policies the councils
              have adopted or proposed; the point is to lean into them, not soften them.
            </Para>
            <ProgressiveCuts rows={c.progressive_cuts} />
          </Beat>
          <Beat>
            <Para>
              Being honest cuts both ways. The same budget lines also contain cuts that would
              fall hardest on those in need — and those are exactly the ones to protect. If
              money has to be found, it should come from the list above, not this one.
            </Para>
            <ProtectList rows={c.progressive_protect} />
          </Beat>

          {/* 6b — The specifics: discretionary line items + calculator */}
          <Beat>
            <BeatHead kicker="The specifics">And the waste, by name</BeatHead>
            <Para>
              Alongside the progressive levers, there&apos;s discretionary spending to trim.
              These are the largest such payments in the councils&apos; own data — after
              stripping out capital-project engineering, statutory care, audit and
              inter-authority transfers, which aren&apos;t waste. What remains — agency
              staffing and management consultancy — can be insourced to recover the
              contractor margin; software contracts are at least worth renegotiating.
            </Para>
            <NamedCandidates d={d} />
          </Beat>
          <Beat className="max-w-3xl">
            <Para>
              Now put the whole argument in your hands. Insourcing these lines doesn&apos;t delete
              the service — it stops paying a contractor&apos;s premium, and only that recovered
              margin is a real saving. Add the progressive revenue, reinvest it in an asset the
              council owns, and the returns compound year on year. Exeter builds homes; Devon owns
              income-generating assets. Set your own assumptions and watch the flywheel turn.
            </Para>
          </Beat>
          {c.redirect_assumptions && (
            <RebudgetCalculator
              data={d}
              a={{ ...c.redirect_assumptions, run_rate_year: d.run_rate_year }}
              levers={c.progressive_cuts}
              reinvestOptions={c.reinvest_options}
            />
          )}

          {/* 6 — What each council can do */}
          <Beat>
            <BeatHead kicker="The ask">What Devon and Exeter can actually do</BeatHead>
            <Para>
              <strong>Exeter (district)</strong> controls housing: build and acquire council
              homes for rent, cut the temporary-accommodation bill, and capture land value
              from development. <strong>Devon (county)</strong> controls the big-ticket
              services: commission care for stability and value, invest in inclusive SEND
              provision to cut costly private placements, and insource where margin leaks out.
            </Para>
            <Para>
              Both can build owned, income-generating assets — and both must avoid the
              borrowed-money speculation that bankrupted Woking and Thurrock. The settlement
              from Westminster may not change. What the money is spent on still can.
            </Para>
          </Beat>

          {/* Methodology */}
          <footer className="mx-auto max-w-2xl px-5 py-12 text-sm text-neutral-500">
            <h3 className="story-display mb-2 text-base font-semibold text-neutral-700 dark:text-neutral-300">
              How this was made
            </h3>
            <p className="mb-3">
              Figures tagged <em>Our analysis</em> come from the councils&apos; own published
              spending data: {d.meta.note} National figures tagged <em>Verified</em> are from
              the IFS, NAO, Institute for Government and others; scenarios tagged{" "}
              <em>Illustrative</em> show structural logic, not forecasts.
            </p>
            <p>
              Full sourcing:{" "}
              <a className="text-blue-600 hover:underline dark:text-blue-400" href={asset("/research/council-finance-critique.md")}>
                the research report
              </a>{" "}
              and{" "}
              <a className="text-blue-600 hover:underline dark:text-blue-400" href={asset("/research/revenue-levers.md")}>
                the revenue-levers dossier
              </a>{" "}
              and the{" "}
              <a className="text-blue-600 hover:underline dark:text-blue-400" href={asset("/research/redirect-scenarios.md")}>
                redirect-model benchmarks
              </a>{" "}
              and the{" "}
              <a className="text-blue-600 hover:underline dark:text-blue-400" href={asset("/research/progressive-cuts.md")}>
                progressive-cuts dossier
              </a>{" "}
              and the{" "}
              <a className="text-blue-600 hover:underline dark:text-blue-400" href={asset("/research/municipal-revenue-models.md")}>
                municipal-revenue-models dossier
              </a>
              . Explore the underlying numbers in the{" "}
              <a className="text-blue-600 hover:underline dark:text-blue-400" href={asset("/analysis")}>
                analysis dashboard
              </a>
              .
            </p>
          </footer>
        </>
      )}
    </article>
  );
}

function NamedCandidates({ d }: { d: FromData }) {
  // Show the discretionary suppliers with material spend in the latest full year,
  // sorted by that annual figure (i.e. what's actually cuttable now).
  const rows = [...d.candidate_suppliers]
    .filter((s) => s.annual > 100000)
    .sort((a, b) => b.annual - a.annual)
    .slice(0, 12);
  return (
    <div className="mt-5 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900">
          <tr>
            <th className="px-3 py-2 font-medium">Supplier</th>
            <th className="px-3 py-2 font-medium">Council</th>
            <th className="px-3 py-2 font-medium">Category</th>
            <th className="px-3 py-2 text-right font-medium">{d.run_rate_year} spend</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={i} className="border-t border-neutral-100 dark:border-neutral-800/60">
              <td className="px-3 py-2 capitalize">{s.supplier.toLowerCase()}</td>
              <td className="px-3 py-2">{councilLabel(s.council)}</td>
              <td className="px-3 py-2">{categoryLabel(s.spend_category)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{gbp(s.annual)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-xs text-neutral-400">
        Discretionary spend only (capital engineering, care, audit and inter-authority
        payments removed). Sole-trader payees are redacted at source. Our analysis of
        published transparency data — directional.
      </p>
    </div>
  );
}

interface CutRow {
  lever: string;
  council: string;
  who: string;
  value: string;
  status: string;
  source: string;
  url: string;
}

function ProgressiveCuts({ rows }: { rows: CutRow[] }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900">
          <tr>
            <th className="px-3 py-2 font-medium">Lever</th>
            <th className="px-3 py-2 font-medium">Who it falls on</th>
            <th className="px-3 py-2 text-right font-medium">Value</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-neutral-100 align-top dark:border-neutral-800/60">
              <td className="px-3 py-2">
                <a className="font-medium text-blue-600 hover:underline dark:text-blue-400" href={r.url} target="_blank" rel="noreferrer">
                  {r.lever}
                </a>
                <span className="ml-1.5 rounded bg-neutral-100 px-1 py-0.5 text-[10px] uppercase tracking-wide text-neutral-500 dark:bg-neutral-800">
                  {councilLabel(r.council)}
                </span>
              </td>
              <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{r.who}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.value}</td>
              <td className="px-3 py-2 text-neutral-500">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2">
        <SourceTag kind="verified">
          Councils&apos; own published policies and fees. Council-tax premiums are billed by
          the district but shared across precepting authorities — the headline figure is the
          total raised, not the council&apos;s retained share.
        </SourceTag>
      </div>
    </div>
  );
}

function ProtectList({ rows }: { rows: { item: string; why: string; source: string; url: string }[] }) {
  return (
    <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
      <div className="mb-3 text-sm font-semibold text-amber-800 dark:text-amber-300">
        Protect these — the regressive cuts to avoid
      </div>
      <ul className="space-y-3">
        {rows.map((r, i) => (
          <li key={i} className="text-sm">
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{r.item}</span>
            <span className="text-neutral-600 dark:text-neutral-400"> — {r.why} </span>
            <a className="text-blue-600 hover:underline dark:text-blue-400" href={r.url} target="_blank" rel="noreferrer">
              ({r.source})
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RevenueMenu({ rows }: { rows: { lever: string; applies: string; return: string; source: string; url: string }[] }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900">
          <tr>
            <th className="px-3 py-2 font-medium">Revenue lever</th>
            <th className="px-3 py-2 font-medium">Typical return</th>
            <th className="px-3 py-2 font-medium">Who can use it</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-neutral-100 align-top dark:border-neutral-800/60">
              <td className="px-3 py-2">
                <a className="font-medium text-blue-600 hover:underline dark:text-blue-400" href={r.url} target="_blank" rel="noreferrer">
                  {r.lever}
                </a>
              </td>
              <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">{r.return}</td>
              <td className="px-3 py-2 text-neutral-500">{r.applies}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2">
        <SourceTag kind="verified">
          Proven elsewhere — council accounts, APSE, Warrington BC, Lothian Buses and others.
          Productive, service-linked assets only; never borrowing to buy assets primarily for yield.
        </SourceTag>
      </div>
    </div>
  );
}

function MiniStat({ value, label, source }: { value: string; label: string; source: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="story-display text-2xl font-bold text-blue-600 dark:text-blue-400">{value}</div>
      <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{label}</div>
      <div className="mt-1 text-xs text-neutral-400">{source}</div>
    </div>
  );
}

// ---- chart options -------------------------------------------------------

function concentrationOption(d: FromData): EChartsOption {
  const years = [...new Set(d.concentration.map((r) => r.year))].sort();
  const councils = [...new Set(d.concentration.map((r) => r.council))].sort();
  const byKey = new Map(d.concentration.map((r) => [`${r.council}|${r.year}`, r.top10_pct]));
  return {
    tooltip: { trigger: "axis", valueFormatter: (v) => `${Number(v).toFixed(0)}%` },
    legend: { data: councils.map(councilLabel), top: 0 },
    grid: { left: 48, right: 20, top: 36, bottom: 36 },
    xAxis: { type: "category", data: years.map(String) },
    yAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%" } },
    series: councils.map((council) => ({
      name: councilLabel(council),
      type: "line",
      smooth: true,
      lineStyle: { width: 3 },
      data: years.map((y) => byKey.get(`${council}|${y}`) ?? null),
      markLine:
        council === "exeter"
          ? { silent: true, symbol: "none", lineStyle: { type: "dashed" }, label: { position: "insideStartTop", textBorderWidth: 0, formatter: "half of all spend" }, data: [{ yAxis: 50 }] }
          : undefined,
    })),
  };
}

function leakBarOption(d: FromData): EChartsOption {
  const cats = ["agency_staff", "consultants", "it_systems", "highways_construction"];
  const data = cats
    .map((cat) => ({ name: categoryLabel(cat), value: Math.round(categoryTotal(d, cat) / 1e6) }))
    .sort((a, b) => a.value - b.value);
  return {
    tooltip: { trigger: "axis", valueFormatter: (v) => `£${v}m` },
    grid: { left: 150, right: 30, top: 10, bottom: 30 },
    xAxis: { type: "value", axisLabel: { formatter: "£{value}m" } },
    yAxis: { type: "category", data: data.map((x) => x.name) },
    series: [{ type: "bar", data: data.map((x) => x.value), itemStyle: { color: "#2563eb" } }],
  };
}

function serviceShiftOption(items: { service: string; change: number }[]): EChartsOption {
  const sorted = [...items].sort((a, b) => a.change - b.change);
  return {
    tooltip: { trigger: "axis", valueFormatter: (v) => `${Number(v) > 0 ? "+" : ""}${v}%` },
    grid: { left: 190, right: 40, top: 10, bottom: 30 },
    xAxis: { type: "value", axisLabel: { formatter: "{value}%" } },
    yAxis: { type: "category", data: sorted.map((x) => x.service) },
    series: [
      {
        type: "bar",
        data: sorted.map((x) => ({
          value: x.change,
          itemStyle: { color: x.change >= 0 ? "#16a34a" : "#dc2626" },
        })),
        label: { show: true, position: "right", color: "inherit", textBorderWidth: 0, formatter: (p: any) => `${p.value > 0 ? "+" : ""}${p.value}%` },
      },
    ],
  };
}

function energyOption(items: { label: string; value: number; good: boolean }[]): EChartsOption {
  return {
    tooltip: { trigger: "axis", valueFormatter: (v) => `£${v}m` },
    grid: { left: 220, right: 40, top: 10, bottom: 30 },
    xAxis: { type: "value", axisLabel: { formatter: "£{value}m" } },
    yAxis: { type: "category", data: items.map((x) => x.label) },
    series: [
      {
        type: "bar",
        data: items.map((x) => ({ value: x.value, itemStyle: { color: x.good ? "#16a34a" : "#dc2626" } })),
        label: { show: true, position: "right", color: "inherit", textBorderWidth: 0, formatter: (p: any) => `£${p.value}m` },
      },
    ],
  };
}

function rentVsBuildOption(rb: any): EChartsOption {
  return {
    tooltip: { trigger: "axis" },
    legend: { data: ["Nightly temporary accommodation", "Council home (build to rent)"], top: 0 },
    grid: { left: 50, right: 20, top: 36, bottom: 40 },
    xAxis: { type: "category", data: rb.years.map((y: number) => `Year ${y}`) },
    yAxis: { type: "value", axisLabel: { formatter: "£{value}k" }, name: "cumulative £k" },
    series: [
      { name: "Nightly temporary accommodation", type: "line", smooth: true, data: rb.temp_accommodation, lineStyle: { color: "#dc2626", width: 3 }, itemStyle: { color: "#dc2626" } },
      { name: "Council home (build to rent)", type: "line", smooth: true, data: rb.council_home, lineStyle: { color: "#16a34a", width: 3 }, itemStyle: { color: "#16a34a" } },
    ],
  };
}
