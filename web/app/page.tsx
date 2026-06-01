"use client";

import Link from "next/link";
import type { EChartsOption } from "echarts";
import Chart from "@/components/Chart";
import { Card, Stat, QueryState, DataTable } from "@/components/ui";
import { useQuery } from "@/lib/useQuery";
import { query } from "@/lib/duckdb";
import { loadManifest } from "@/lib/manifest";
import {
  monthlySpendSql,
  topSuppliersSql,
  topDepartmentsSql,
  type MonthRow,
  type SupplierRow,
  type DeptRow,
} from "@/lib/queries";
import { gbpCompact, num, gbp, councilLabel } from "@/lib/format";

export default function OverviewPage() {
  const manifest = useQuery(() => loadManifest(), []);
  const monthly = useQuery(() => query<MonthRow>(monthlySpendSql()), []);
  const suppliers = useQuery(() => query<SupplierRow>(topSuppliersSql(10)), []);
  const depts = useQuery(() => query<DeptRow>(topDepartmentsSql(10)), []);

  const cov = manifest.data?.datasets.spending;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Council Spending Overview</h1>
        <p className="text-sm text-neutral-500">
          Exeter &amp; Devon council transparency data, ingested and analyzed.
        </p>
      </header>

      {/* KPI cards from the manifest (instant — no Parquet scan needed). */}
      <QueryState loading={manifest.loading} error={manifest.error}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Transactions" value={num(cov?.total_rows ?? 0)} />
          <Stat
            label="Total spend"
            value={gbpCompact(
              (cov?.by_council ?? []).reduce((a, c) => a + c.total_spend, 0),
            )}
          />
          <Stat label="Councils" value={cov?.by_council.length ?? 0} />
          <Stat
            label="Coverage"
            value={
              cov?.by_council[0]
                ? `${cov.by_council[0].date_min?.slice(0, 4)}–${cov.by_council[0].date_max?.slice(0, 4)}`
                : "—"
            }
          />
        </div>
      </QueryState>

      <Card title="Monthly spend">
        <QueryState
          loading={monthly.loading}
          error={monthly.error}
          empty={!monthly.data?.length}
        >
          {monthly.data && <Chart option={monthlyOption(monthly.data)} />}
        </QueryState>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Top suppliers by spend">
          <QueryState
            loading={suppliers.loading}
            error={suppliers.error}
            empty={!suppliers.data?.length}
          >
            <DataTable<SupplierRow>
              columns={[
                { key: "supplier_name_norm", label: "Supplier" },
                { key: "total", label: "Total", align: "right" },
                { key: "txn_count", label: "Txns", align: "right" },
              ]}
              rows={suppliers.data ?? []}
              render={{
                supplier_name_norm: (r) => (
                  <Link
                    href={`/suppliers?id=${encodeURIComponent(r.supplier_id_canonical)}`}
                    className="capitalize text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {r.supplier_name_norm}
                  </Link>
                ),
                total: (r) => gbp(r.total),
                txn_count: (r) => num(r.txn_count),
              }}
            />
          </QueryState>
        </Card>

        <Card title="Top departments / expense areas">
          <QueryState
            loading={depts.loading}
            error={depts.error}
            empty={!depts.data?.length}
          >
            <DataTable<DeptRow>
              columns={[
                { key: "expense_area", label: "Expense area" },
                { key: "total", label: "Total", align: "right" },
                { key: "txn_count", label: "Txns", align: "right" },
              ]}
              rows={depts.data ?? []}
              render={{
                total: (r) => gbp(r.total),
                txn_count: (r) => num(r.txn_count),
              }}
            />
          </QueryState>
        </Card>
      </div>
    </div>
  );
}

function monthlyOption(rows: MonthRow[]): EChartsOption {
  const months = [...new Set(rows.map((r) => r.year_month))].sort();
  const councils = [...new Set(rows.map((r) => r.council))].sort();
  const byKey = new Map(rows.map((r) => [`${r.council}|${r.year_month}`, r.total]));
  return {
    tooltip: { trigger: "axis" },
    legend: { data: councils.map(councilLabel), top: 0 },
    grid: { left: 60, right: 20, top: 40, bottom: 60 },
    xAxis: { type: "category", data: months },
    yAxis: {
      type: "value",
      axisLabel: { formatter: (v: number) => gbpCompact(v) },
    },
    dataZoom: [
      { type: "inside", start: 0, end: 100 },
      { type: "slider", start: 0, end: 100 },
    ],
    series: councils.map((c) => ({
      name: councilLabel(c),
      type: "line",
      showSymbol: false,
      data: months.map((m) => byKey.get(`${c}|${m}`) ?? 0),
    })),
  };
}
