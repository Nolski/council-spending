"use client";

import type { EChartsOption } from "echarts";
import Chart from "@/components/Chart";
import { Card, Stat, Callout, QueryState, DataTable } from "@/components/ui";
import { useQuery } from "@/lib/useQuery";
import { query } from "@/lib/duckdb";
import {
  categoryTrendSql,
  categoryTotalsSql,
  concentrationSql,
  topSuppliersSql,
  type CategoryMonthRow,
  type CategoryTotalRow,
  type ConcentrationRow,
  type SupplierRow,
} from "@/lib/queries";
import { trendOption, categoryLabel } from "@/lib/charts";
import { gbp, gbpCompact, num, councilLabel } from "@/lib/format";

const CATS = ["agency_staff", "consultants", "it_systems", "highways_construction"];

export default function ProfitExtractionPage() {
  const totals = useQuery(() => query<CategoryTotalRow>(categoryTotalsSql()), []);
  const trend = useQuery(() => query<CategoryMonthRow>(categoryTrendSql(CATS)), []);
  const conc = useQuery(() => query<ConcentrationRow>(concentrationSql()), []);
  const suppliers = useQuery(() => query<SupplierRow>(topSuppliersSql(15)), []);

  const sum = (cat: string) =>
    (totals.data ?? []).filter((r) => r.spend_category === cat).reduce((a, r) => a + r.total, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Profit extraction &amp; outsourcing</h1>
        <p className="text-sm text-neutral-500">
          Public money flowing to private contractors, agency staff, consultants and IT
          vendors — and how concentrated it is among a few suppliers.
        </p>
      </header>

      <Callout question="Which of these functions could be insourced or shifted to local/cooperative providers to keep money circulating in the local economy (the Community Wealth Building approach)?">
        Outsourcing, agency staffing and consultancy channel public money into private
        profit, often on worse terms than in-house provision. A handful of national
        contractors capture a large share of spend, while the workers delivering the
        services are frequently the lowest paid.
      </Callout>

      <QueryState loading={totals.loading} error={totals.error}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Agency staff" value={gbpCompact(sum("agency_staff"))} />
          <Stat label="Consultants" value={gbpCompact(sum("consultants"))} />
          <Stat label="IT systems" value={gbpCompact(sum("it_systems"))} />
          <Stat label="Highways / construction" value={gbpCompact(sum("highways_construction"))} />
        </div>
      </QueryState>

      <Card title="Outsourced-spend categories over time">
        <QueryState loading={trend.loading} error={trend.error} empty={!trend.data?.length}>
          {trend.data && (
            <Chart option={trendOption(trend.data, { seriesField: "spend_category", labelFn: categoryLabel })} />
          )}
        </QueryState>
      </Card>

      <Card title="Supplier concentration: top-10 suppliers' share of annual spend">
        <QueryState loading={conc.loading} error={conc.error} empty={!conc.data?.length}>
          {conc.data && <Chart option={concentrationOption(conc.data)} height={300} />}
        </QueryState>
      </Card>

      <Card title="Top suppliers by spend (all categories)">
        <QueryState loading={suppliers.loading} error={suppliers.error} empty={!suppliers.data?.length}>
          <DataTable<SupplierRow>
            columns={[
              { key: "supplier_name_norm", label: "Supplier" },
              { key: "total", label: "Total", align: "right" },
              { key: "txn_count", label: "Txns", align: "right" },
            ]}
            rows={suppliers.data ?? []}
            render={{
              supplier_name_norm: (r) => <span className="capitalize">{r.supplier_name_norm}</span>,
              total: (r) => gbp(r.total),
              txn_count: (r) => num(r.txn_count),
            }}
          />
        </QueryState>
      </Card>
    </div>
  );
}

function concentrationOption(rows: ConcentrationRow[]): EChartsOption {
  const years = [...new Set(rows.map((r) => r.year))].sort();
  const councils = [...new Set(rows.map((r) => r.council))].sort();
  const byKey = new Map(rows.map((r) => [`${r.council}|${r.year}`, r.top10_pct]));
  return {
    tooltip: { trigger: "axis", valueFormatter: (v) => `${Number(v).toFixed(1)}%` },
    legend: { data: councils.map(councilLabel), top: 0 },
    grid: { left: 50, right: 20, top: 40, bottom: 40 },
    xAxis: { type: "category", data: years.map(String) },
    yAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%" } },
    series: councils.map((c) => ({
      name: councilLabel(c),
      type: "line",
      data: years.map((y) => byKey.get(`${c}|${y}`) ?? null),
    })),
  };
}
