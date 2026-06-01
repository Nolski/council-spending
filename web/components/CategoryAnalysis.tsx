"use client";

import type { ReactNode } from "react";
import Chart from "@/components/Chart";
import { Card, Stat, Callout, QueryState } from "@/components/ui";
import { useQuery } from "@/lib/useQuery";
import { query } from "@/lib/duckdb";
import {
  categoryTrendSql,
  categoryTotalsSql,
  type CategoryMonthRow,
  type CategoryTotalRow,
} from "@/lib/queries";
import { trendOption, categoryLabel } from "@/lib/charts";
import { gbpCompact, councilLabel } from "@/lib/format";

/**
 * Reusable themed analysis view: stat cards + a category spend time-series for one
 * council, framed by a narrative + re-budgeting question.
 */
export default function CategoryAnalysis({
  title,
  subtitle,
  council,
  categories,
  narrative,
  question,
  chartType = "line",
}: {
  title: string;
  subtitle: string;
  council: string;
  categories: string[];
  narrative: ReactNode;
  question: string;
  chartType?: "line" | "bar";
}) {
  const totals = useQuery(() => query<CategoryTotalRow>(categoryTotalsSql(council)), [council]);
  const trend = useQuery(
    () => query<CategoryMonthRow>(categoryTrendSql(categories, council)),
    [council, categories.join(",")],
  );

  const sum = (cat: string) =>
    (totals.data ?? []).filter((r) => r.spend_category === cat).reduce((a, r) => a + r.total, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-neutral-500">
          {subtitle} · {councilLabel(council)} data.
        </p>
      </header>

      <Callout question={question}>{narrative}</Callout>

      <QueryState loading={totals.loading} error={totals.error}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {categories.map((c) => (
            <Stat key={c} label={categoryLabel(c)} value={gbpCompact(sum(c))} />
          ))}
        </div>
      </QueryState>

      <Card title="Spend over time">
        <QueryState loading={trend.loading} error={trend.error} empty={!trend.data?.length}>
          {trend.data && (
            <Chart
              option={trendOption(trend.data, {
                seriesField: "spend_category",
                labelFn: categoryLabel,
                type: chartType,
              })}
            />
          )}
        </QueryState>
      </Card>
    </div>
  );
}
