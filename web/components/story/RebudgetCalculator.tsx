"use client";

import { useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import Chart from "@/components/Chart";
import { SourceTag } from "./BigStat";
import { gbp, gbpCompact, num } from "@/lib/format";
import { categoryLabel } from "@/lib/charts";
import type { FromData } from "@/lib/story";

// Assumptions (with sources) come from curated.json -> redirect_assumptions.
interface Assumptions {
  run_rate_year: number;
  cost_per_home: { value: number; min: number; max: number; source: string };
  net_rent_per_home: { value: number; source: string };
  ta_avoided_per_home: { value: number; source: string };
  agency_premium_pct: { value: number; min: number; max: number; source: string };
  contractor_margin_pct: { value: number; min: number; max: number; source: string };
  horizon_years: { value: number; source: string };
  reinvest_yield: Record<string, { value: number; label: string; source: string }>;
  insource_categories: string[];
  default_insource_share: Record<string, number>;
  note: string;
}

// A progressive revenue lever (subset of curated.progressive_cuts that carries a
// quantified, council-retained annual figure we can add to the recurring saving).
interface Lever {
  lever: string;
  council: "exeter" | "devon";
  who: string;
  value: string;
  calc?: { annual: number };
}

// A revenue-generating reinvestment target for Devon (curated.reinvest_options).
interface ReinvestOption {
  key: string;
  council: "exeter" | "devon";
  label: string;
  yield: number;
  note: string;
  source: string;
  url: string;
}

/** The compounding "flywheel": reinvest the recurring saving R plus its returns each year. */
function buildFlywheelSeries(R: number, y: number, N: number) {
  const years: string[] = [];
  const invested: number[] = []; // I_t — owned asset stock
  const annualIncome: number[] = []; // A_t — income earned in year t
  const spendOnce: number[] = []; // R × t — consumed each year, nothing kept
  let I = 0;
  for (let t = 1; t <= N; t++) {
    const A = I * y; // income on capital invested so far
    I = I + R + A; // reinvest the saving AND the returns
    years.push(`Yr ${t}`);
    invested.push(Math.round(I));
    annualIncome.push(Math.round(A));
    spendOnce.push(Math.round(R * t));
  }
  return { years, invested, annualIncome, spendOnce };
}

export function RebudgetCalculator({
  data,
  a,
  levers = [],
  reinvestOptions = [],
}: {
  data: FromData;
  a: Assumptions;
  levers?: Lever[];
  reinvestOptions?: ReinvestOption[];
}) {
  const [council, setCouncil] = useState<"exeter" | "devon">("exeter");
  const [insourceShare, setInsourceShare] = useState<Record<string, number>>(a.default_insource_share);
  const [leverOff, setLeverOff] = useState<Record<string, boolean>>({});
  const [costPerHome, setCostPerHome] = useState(a.cost_per_home.value);
  const [yieldMode, setYieldMode] = useState<"rent_plus_ta" | "rent_only">("rent_plus_ta");
  const [premiumPct, setPremiumPct] = useState(a.agency_premium_pct.value);
  const devonOptions = reinvestOptions.filter((o) => o.council === "devon");
  const [devonTarget, setDevonTarget] = useState(devonOptions[0]?.key ?? "");

  // Annual gross discretionary run-rate for the selected council, per category.
  const runrate = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of data.savings_runrate) if (r.council === council) m[r.spend_category] = r.annual;
    return m;
  }, [data, council]);

  // The honest saving: the recovered contractor MARGIN, not the gross spend.
  // Agency: insourcing replaces agency cost with permanent, recovering premium/(1+premium).
  const recoverableAgencyFraction = premiumPct / (100 + premiumPct);
  const recoveredFor = (cat: string) => {
    const gross = (runrate[cat] ?? 0) * (insourceShare[cat] ?? 0);
    if (cat === "agency_staff") return gross * recoverableAgencyFraction;
    if (cat === "consultants") return gross * a.contractor_margin_pct.value;
    return 0;
  };
  const insourcingSaving = a.insource_categories.reduce((s, cat) => s + recoveredFor(cat), 0);

  // Progressive levers that apply to this council and carry a £ figure.
  const councilLevers = levers.filter((l) => l.calc && l.council === council);
  const leverPot = councilLevers.reduce((sum, l) => sum + (leverOff[l.lever] ? 0 : l.calc!.annual), 0);

  // R = the recurring annual saving (insourcing margin + progressive revenue).
  const R = insourcingSaving + leverPot;

  // Reinvestment yield: Exeter = housing (rent ± TA avoided, per £ home); Devon = chosen asset.
  const selectedOption = devonOptions.find((o) => o.key === devonTarget);
  const exeterYield =
    (a.net_rent_per_home.value + (yieldMode === "rent_plus_ta" ? a.ta_avoided_per_home.value : 0)) /
    costPerHome;
  const y = council === "exeter" ? exeterYield : selectedOption?.yield ?? 0;

  const N = a.horizon_years.value;
  const series = useMemo(() => buildFlywheelSeries(R, y, N), [R, y, N]);
  const endValue = series.invested[N - 1] ?? 0;
  const endIncome = series.annualIncome[N - 1] ?? 0;
  const endHomes = Math.floor(endValue / costPerHome);

  return (
    <div className="mx-auto my-10 max-w-3xl rounded-xl border border-neutral-200 bg-white px-5 py-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="story-display text-xl font-semibold">Insource &amp; reinvest calculator</h3>
        <div className="flex rounded-lg border border-neutral-300 text-sm dark:border-neutral-700">
          {(["exeter", "devon"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCouncil(c)}
              className={`px-3 py-1.5 ${
                council === c
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "text-neutral-600 dark:text-neutral-300"
              } ${c === "exeter" ? "rounded-l-md" : "rounded-r-md"}`}
            >
              {c === "exeter" ? "Exeter → homes" : "Devon → income assets"}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-4 text-sm text-neutral-500">
        Insourcing doesn&apos;t delete the service — it stops paying a contractor&apos;s premium.
        Only that recovered <em>margin</em> is a saving. Reinvest it in an income-generating asset
        and the returns compound. Figures use {a.run_rate_year} spend; drag to set your assumptions.
      </p>

      {/* Insource sliders — show gross and the smaller RECOVERED figure */}
      <div className="space-y-3">
        {a.insource_categories.map((cat) => {
          const gross = runrate[cat] ?? 0;
          const share = insourceShare[cat] ?? 0;
          const rateLabel =
            cat === "agency_staff"
              ? `recover ${Math.round(recoverableAgencyFraction * 100)}% premium`
              : `recover ${Math.round(a.contractor_margin_pct.value * 100)}% margin`;
          return (
            <div key={cat} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div>
                <div className="flex justify-between text-sm">
                  <span>
                    Insource {categoryLabel(cat).toLowerCase()} —{" "}
                    <span className="text-neutral-500">{gbpCompact(gross)}/yr gross</span>
                  </span>
                  <span className="tabular-nums font-medium">{Math.round(share * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(share * 100)}
                  onChange={(e) => setInsourceShare({ ...insourceShare, [cat]: Number(e.target.value) / 100 })}
                  className="w-full"
                />
                <div className="text-xs text-neutral-400">{rateLabel}</div>
              </div>
              <div className="w-28 text-right">
                <div className="text-sm tabular-nums font-medium text-green-700 dark:text-green-400">
                  {gbp(recoveredFor(cat))}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-neutral-400">recovered</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Agency premium sensitivity */}
      <div className="mt-4">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-600 dark:text-neutral-300">
            Agency premium (vs a permanent post)
          </span>
          <span className="tabular-nums font-medium">{premiumPct}%</span>
        </div>
        <input
          type="range"
          min={a.agency_premium_pct.min}
          max={a.agency_premium_pct.max}
          value={premiumPct}
          onChange={(e) => setPremiumPct(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Progressive revenue levers */}
      {councilLevers.length > 0 && (
        <div className="mt-5">
          <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Add progressive revenue (falls on those who can pay)
          </div>
          <div className="mt-2 space-y-2">
            {councilLevers.map((l) => (
              <label
                key={l.lever}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800"
              >
                <input
                  type="checkbox"
                  checked={!leverOff[l.lever]}
                  onChange={(e) => setLeverOff({ ...leverOff, [l.lever]: !e.target.checked })}
                  className="mt-1"
                />
                <span className="flex-1">
                  <span className="flex justify-between gap-3 text-sm">
                    <span>{l.lever}</span>
                    <span className="tabular-nums text-neutral-500">+{gbp(l.calc!.annual)}/yr</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-neutral-500">{l.who}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Recurring saving R */}
      <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-center dark:bg-blue-950/40">
        <span className="text-sm text-neutral-600 dark:text-neutral-300">Recurring saving each year</span>
        <div className="story-display text-3xl font-bold text-blue-600 dark:text-blue-400">{gbp(R)}</div>
        <div className="mt-0.5 text-xs text-neutral-500">
          {gbp(insourcingSaving)} recovered margin
          {leverPot > 0 ? <> + {gbp(leverPot)} progressive revenue</> : null}
        </div>
      </div>

      {/* Reinvestment controls */}
      {council === "exeter" ? (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-neutral-600 dark:text-neutral-300">Reinvest in council homes — yield basis</span>
            <div className="flex rounded-lg border border-neutral-300 text-xs dark:border-neutral-700">
              {(["rent_plus_ta", "rent_only"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setYieldMode(m)}
                  className={`px-2.5 py-1 ${
                    yieldMode === m
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "text-neutral-600 dark:text-neutral-300"
                  } ${m === "rent_plus_ta" ? "rounded-l-md" : "rounded-r-md"}`}
                >
                  {m === "rent_plus_ta" ? "rent + homelessness avoided" : "rent only"}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span>Cost per council home (build/acquire)</span>
            <span className="tabular-nums font-medium">{gbp(costPerHome)}</span>
          </div>
          <input
            type="range"
            min={a.cost_per_home.min}
            max={a.cost_per_home.max}
            step={5000}
            value={costPerHome}
            onChange={(e) => setCostPerHome(Number(e.target.value))}
            className="w-full"
          />
        </>
      ) : (
        <div className="mt-4">
          <div className="text-sm text-neutral-600 dark:text-neutral-300">
            Reinvest in a revenue-generating asset Devon can own
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {devonOptions.map((o) => (
              <button
                key={o.key}
                onClick={() => setDevonTarget(o.key)}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${
                  devonTarget === o.key
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                    : "border-neutral-200 dark:border-neutral-800"
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{o.label}</span>
                  <span className="tabular-nums text-neutral-500">~{Math.round(o.yield * 100)}%/yr</span>
                </div>
                <span className="mt-0.5 block text-xs text-neutral-500">{o.note}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* The flywheel chart */}
      <div className="mt-5">
        <div className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {a.horizon_years.value}-year flywheel — spend it once vs invest &amp; compound
        </div>
        <Chart option={flywheelOption(series, y)} height={260} />
      </div>

      {/* Stat row */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Out value={`${(y * 100).toFixed(1)}%`} label="annual reinvestment yield" />
        <Out value={gbpCompact(endIncome)} label={`annual income by year ${N}`} />
        {council === "exeter" ? (
          <Out value={num(endHomes)} label={`council homes owned by year ${N}`} />
        ) : (
          <Out value={gbpCompact(endValue)} label={`asset value owned by year ${N}`} />
        )}
      </div>

      <p className="mt-3 text-xs text-neutral-500">
        {council === "exeter" ? (
          <>
            The HRA is ring-fenced, so General-Fund savings can&apos;t be poured straight into
            housing — in practice they free capacity, and homes are financed by borrowing serviced
            by rents. The <em>rent + homelessness avoided</em> yield blends cash rent with avoided
            temporary-accommodation cost (real money, but only while that demand exists). Homes are
            lumpy and lagged; the curve shows scale, not a cashflow.
          </>
        ) : (
          <>
            Devon can&apos;t build council homes, but it can own income-generating assets. These are
            <em> productive</em>, service-linked holdings — <strong>not</strong> borrowing to buy
            assets primarily for yield, which bankrupted Woking and Thurrock and was barred by the
            PWLB in 2020. Yields are lower than housing because Devon lacks the homelessness
            cost-avoidance lever.
          </>
        )}
      </p>

      <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <SourceTag kind="illustrative">
          Illustrative scenario, not a forecast. The saving is recovered <em>margin</em>, not gross
          spend ({a.agency_premium_pct.source}; consultant margin {a.contractor_margin_pct.source}).
          Run-rate: our analysis of {a.run_rate_year} spend, vetted to exclude
          capital/care/statutory. Compounding comes from reinvested yield, not ever-growing cuts —
          the saving is bounded by total insourceable spend.
        </SourceTag>
      </div>
    </div>
  );
}

function Out({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 px-2 py-3 dark:border-neutral-800">
      <div className="story-display text-2xl font-bold text-neutral-900 dark:text-neutral-50">{value}</div>
      <div className="mt-1 text-xs text-neutral-500">{label}</div>
    </div>
  );
}

// Two-line comparison: money spent and gone (linear) vs invested and compounding (accelerating).
function flywheelOption(
  series: { years: string[]; invested: number[]; spendOnce: number[] },
  _y: number,
): EChartsOption {
  return {
    tooltip: { trigger: "axis", valueFormatter: (v) => gbpCompact(Number(v)) },
    legend: { data: ["Spend it once (gone)", "Invest & compound (assets owned)"], top: 0 },
    grid: { left: 56, right: 16, top: 36, bottom: 28 },
    xAxis: { type: "category", data: series.years },
    yAxis: { type: "value", axisLabel: { formatter: (v: number) => gbpCompact(v) } },
    series: [
      {
        name: "Spend it once (gone)",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: series.spendOnce,
        lineStyle: { color: "#737373", width: 2, type: "dashed" },
        itemStyle: { color: "#737373" },
      },
      {
        name: "Invest & compound (assets owned)",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: series.invested,
        lineStyle: { color: "#16a34a", width: 3 },
        itemStyle: { color: "#16a34a" },
        areaStyle: { color: "rgba(22,163,74,0.12)" },
      },
    ],
  };
}
