"use client";

import type { EChartsOption } from "echarts";
import { Beat, Para, BeatHead } from "@/components/story/Beat";
import { BigStat, SourceTag } from "@/components/story/BigStat";
import { AnnotatedChart } from "@/components/story/AnnotatedChart";
import { PullQuote } from "@/components/story/PullQuote";
import { RebudgetCalculator } from "@/components/story/RebudgetCalculator";
import { useQuery } from "@/lib/useQuery";
import { loadStory, categoryTotal, type FromData } from "@/lib/story";
import { gbp, gbpCompact, councilLabel } from "@/lib/format";
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

          {/* 4 — Refocus */}
          <Beat>
            <BeatHead kicker="Refocus">Spend on what matters</BeatHead>
            <Para>
              The first move is defensive: stop the leak. Reducing reliance on agency staff
              and consultants, scrutinising long contracts, and commissioning care for
              stability rather than the lowest unit price all redirect money toward the
              statutory demand that is driving the crisis — without a penny from Westminster.
            </Para>
          </Beat>

          {/* 5 — Dig out */}
          <Beat>
            <BeatHead kicker="Dig out">Real ways to raise revenue</BeatHead>
            <Para>
              Cutting waste isn&apos;t enough on its own. The harder, more durable move is to
              build assets and income the council actually owns. The biggest prize sits in
              plain sight: homelessness.
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
              But the vehicle matters. Exeter already learned this the hard way: its for-sale
              development company was wound up after heavy losses and a handful of homes. The
              lesson isn&apos;t &quot;don&apos;t build&quot; — it&apos;s build council homes to
              <em> rent</em> (a yielding asset), not to <em>sell</em> (a market gamble).
            </Para>
          </Beat>
          <BigStat value={c.exeter_city_living.value} label={c.exeter_city_living.label} kind="verified" source={c.exeter_city_living.source} />
          <Beat>
            <Para>
              Beyond housing, councils elsewhere are building income they own — but the line
              between productive assets and speculation is unforgiving.
            </Para>
          </Beat>
          <AnnotatedChart
            title="Owning generation can pay; reselling energy did not (£m)"
            option={energyOption(c.energy_compare.items)}
            caption="Council-owned solar generation returned a dividend; council retail energy ventures collapsed."
            kind="verified"
            source={c.energy_compare.source}
            height={300}
          />
          <BigStat value={c.preston.amount} label={c.preston.label} kind="verified" source={c.preston.source} />
          <Beat>
            <Para>
              Other levers are real but modest, and honesty matters: local climate bonds have
              raised {c.cmi.value} nationally; roughly {c.land_value.value} of development
              land-value uplift goes uncaptured. None replaces core funding — together they
              diversify income and keep wealth local.
            </Para>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MiniStat value={c.cmi.value} label={c.cmi.label} source={c.cmi.source} />
              <MiniStat value={c.land_value.value} label={c.land_value.label} source={c.land_value.source} />
            </div>
          </Beat>
          <BigStat value={c.cautionary.value} label={c.cautionary.label} kind="verified" source={c.cautionary.source} />

          {/* 5b — The specifics: named candidates + calculator */}
          <Beat>
            <BeatHead kicker="The specifics">Where to cut, by name</BeatHead>
            <Para>
              Generalities are easy to wave away, so here are the actual line items. These are
              the largest <em>discretionary</em> payments in the councils&apos; own data —
              after stripping out capital-project engineering, statutory care, audit and
              inter-authority transfers, which aren&apos;t waste. What remains — agency
              staffing, management consultancy and software contracts — is where money could be
              recovered.
            </Para>
            <NamedCandidates d={d} />
          </Beat>
          <Beat className="max-w-3xl">
            <Para>
              So what does that buy? Trim these lines and the savings have somewhere to go —
              but <em>where</em> depends on which council. Exeter (the district) can put it into
              council housing; Devon (the county) into insourcing the care and SEND staff it
              currently rents at a premium.
            </Para>
          </Beat>
          {c.redirect_assumptions && (
            <RebudgetCalculator data={d} a={{ ...c.redirect_assumptions, run_rate_year: d.run_rate_year }} />
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
          ? { silent: true, symbol: "none", lineStyle: { type: "dashed" }, label: { position: "insideStartTop", formatter: "half of all spend" }, data: [{ yAxis: 50 }] }
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
        label: { show: true, position: "right", formatter: (p: any) => `${p.value > 0 ? "+" : ""}${p.value}%` },
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
        label: { show: true, position: "right", formatter: (p: any) => `£${p.value}m` },
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
