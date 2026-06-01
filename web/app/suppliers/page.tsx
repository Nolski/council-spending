"use client";

import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import Chart from "@/components/Chart";
import { Card, QueryState, DataTable } from "@/components/ui";
import { useQuery } from "@/lib/useQuery";
import { query } from "@/lib/duckdb";
import { loadManifest, selectPartitions } from "@/lib/manifest";
import {
  searchSuppliersSql,
  topSuppliersSql,
  supplierDetailSql,
  type SupplierRow,
} from "@/lib/queries";
import { gbp, num, councilLabel } from "@/lib/format";

interface DetailRow {
  payment_date: string;
  council: string;
  supplier_name_raw: string;
  expense_area: string;
  expense_type: string;
  amount: number;
}

export default function SuppliersPage() {
  const manifest = useQuery(() => loadManifest(), []);
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  // Initialise selection from ?id= on first mount (links from the overview).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) setSelected(id);
  }, []);

  const list = useQuery(
    () =>
      query<SupplierRow>(term.trim() ? searchSuppliersSql(term.trim()) : topSuppliersSql(50)),
    [term],
  );

  const allPartitions = useMemo(
    () => (manifest.data ? selectPartitions(manifest.data, null, null) : []),
    [manifest.data],
  );

  const detail = useQuery(
    () =>
      selected && allPartitions.length
        ? query<DetailRow>(supplierDetailSql(allPartitions, selected))
        : Promise.resolve<DetailRow[]>([]),
    [selected, allPartitions],
  );

  const detailName = detail.data?.[0]?.supplier_name_raw;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Suppliers</h1>
        <p className="text-sm text-neutral-500">
          Search canonicalized suppliers and follow the money. Names are
          heuristically deduplicated across councils.
        </p>
      </header>

      <Card>
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search suppliers (blank = top 50 by spend)…"
          className="input"
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Suppliers">
          <QueryState
            loading={list.loading}
            error={list.error}
            empty={!list.data?.length}
          >
            <DataTable<SupplierRow>
              columns={[
                { key: "supplier_name_norm", label: "Supplier" },
                { key: "total", label: "Total", align: "right" },
                { key: "txn_count", label: "Txns", align: "right" },
              ]}
              rows={list.data ?? []}
              render={{
                supplier_name_norm: (r) => (
                  <button
                    onClick={() => setSelected(r.supplier_id_canonical)}
                    className="capitalize text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {r.supplier_name_norm}
                  </button>
                ),
                total: (r) => gbp(r.total),
                txn_count: (r) => num(r.txn_count),
              }}
            />
          </QueryState>
        </Card>

        <Card title={selected ? `Detail: ${detailName ?? "…"}` : "Select a supplier"}>
          {!selected ? (
            <p className="p-4 text-sm text-neutral-400">
              Choose a supplier to see its spend over time and recent transactions.
            </p>
          ) : (
            <QueryState
              loading={detail.loading}
              error={detail.error}
              empty={!detail.data?.length}
            >
              {detail.data && (
                <div className="space-y-4">
                  <Chart option={detailOption(detail.data)} height={240} />
                  <DataTable<DetailRow>
                    columns={[
                      { key: "payment_date", label: "Date" },
                      { key: "council", label: "Council" },
                      { key: "expense_area", label: "Area" },
                      { key: "amount", label: "Amount", align: "right" },
                    ]}
                    rows={(detail.data ?? []).slice(0, 25)}
                    render={{
                      council: (r) => councilLabel(r.council),
                      amount: (r) => gbp(r.amount, true),
                    }}
                  />
                </div>
              )}
            </QueryState>
          )}
        </Card>
      </div>
    </div>
  );
}

function detailOption(rows: DetailRow[]): EChartsOption {
  // Aggregate the supplier's transactions to monthly totals.
  const byMonth = new Map<string, number>();
  for (const r of rows) {
    const m = r.payment_date?.slice(0, 7);
    if (m) byMonth.set(m, (byMonth.get(m) ?? 0) + r.amount);
  }
  const months = [...byMonth.keys()].sort();
  return {
    tooltip: { trigger: "axis" },
    grid: { left: 60, right: 16, top: 20, bottom: 40 },
    xAxis: { type: "category", data: months },
    yAxis: { type: "value" },
    series: [{ type: "bar", data: months.map((m) => byMonth.get(m) ?? 0) }],
  };
}
