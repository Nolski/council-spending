"use client";

import { useMemo, useState } from "react";
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
  avg_permanent_post: { value: number; source: string };
  default_cuts: Record<string, number>;
  note: string;
}

const CUTTABLE = ["consultants", "agency_staff", "it_systems"];

export function RebudgetCalculator({ data, a }: { data: FromData; a: Assumptions }) {
  const [council, setCouncil] = useState<"exeter" | "devon">("exeter");
  const [cuts, setCuts] = useState<Record<string, number>>(a.default_cuts);
  const [costPerHome, setCostPerHome] = useState(a.cost_per_home.value);

  // Annual discretionary run-rate for the selected council, per category.
  const runrate = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of data.savings_runrate) if (r.council === council) m[r.spend_category] = r.annual;
    return m;
  }, [data, council]);

  const pot = CUTTABLE.reduce((sum, c) => sum + (runrate[c] ?? 0) * (cuts[c] ?? 0), 0);

  // Exeter: redirected as an annual capital contribution to council housing.
  const homes = Math.floor(pot / costPerHome);
  const rent = homes * a.net_rent_per_home.value;
  const taAvoided = homes * a.ta_avoided_per_home.value;
  // Devon: reinvested into permanent posts (cutting future agency premium).
  const posts = Math.floor(pot / a.avg_permanent_post.value);

  return (
    <div className="mx-auto my-10 max-w-3xl rounded-xl border border-neutral-200 bg-white px-5 py-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="story-display text-xl font-semibold">Re-budget calculator</h3>
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
              {c === "exeter" ? "Exeter → housing" : "Devon → insourcing"}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-4 text-sm text-neutral-500">
        Trim discretionary spend (latest full year, {a.run_rate_year}) and see where it could
        go. Drag the sliders to set your own assumptions.
      </p>

      {/* Cut sliders */}
      <div className="space-y-3">
        {CUTTABLE.map((cat) => (
          <div key={cat} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div>
              <div className="flex justify-between text-sm">
                <span>
                  Cut {categoryLabel(cat).toLowerCase()} —{" "}
                  <span className="text-neutral-500">{gbpCompact(runrate[cat] ?? 0)}/yr</span>
                </span>
                <span className="tabular-nums font-medium">{Math.round((cuts[cat] ?? 0) * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((cuts[cat] ?? 0) * 100)}
                onChange={(e) => setCuts({ ...cuts, [cat]: Number(e.target.value) / 100 })}
                className="w-full"
              />
            </div>
            <div className="w-24 text-right text-sm tabular-nums text-neutral-500">
              {gbp((runrate[cat] ?? 0) * (cuts[cat] ?? 0))}
            </div>
          </div>
        ))}
      </div>

      {/* Pot */}
      <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-center dark:bg-blue-950/40">
        <span className="text-sm text-neutral-600 dark:text-neutral-300">Redirectable each year</span>
        <div className="story-display text-3xl font-bold text-blue-600 dark:text-blue-400">{gbp(pot)}</div>
      </div>

      {/* Outputs */}
      {council === "exeter" ? (
        <>
          <div className="mt-4 flex items-center justify-between text-sm">
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
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Out value={num(homes)} label="council homes / year" />
            <Out value={gbpCompact(rent)} label="annual rent income" />
            <Out value={gbpCompact(taAvoided)} label="temp-accommodation avoided / yr" />
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            Illustrative. The Housing Revenue Account is ring-fenced, so General-Fund savings
            can&apos;t be poured straight into housing — in practice they free capacity and the
            homes are financed by borrowing serviced by rents. This shows the <em>scale</em> of
            what redirected money is worth, not a budget line.
          </p>
        </>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <Out value={num(posts)} label="permanent posts funded (cutting agency premium)" />
            <Out value={gbpCompact(pot)} label="reinvested in care / SEND each year" />
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            Devon is the county — it runs care and SEND, not housing. Replacing agency staff
            with permanent posts removes the agency premium and stabilises services; savings
            reinvest in Devon&apos;s own statutory pressures, not Exeter&apos;s homes.
          </p>
        </>
      )}

      <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <SourceTag kind="illustrative">
          Run-rate: our analysis of {a.run_rate_year} spend (vetted to exclude
          capital/care/statutory). Benchmarks: {a.cost_per_home.source}; rent{" "}
          {a.net_rent_per_home.source}; TA {a.ta_avoided_per_home.source}.
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
