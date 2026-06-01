"use client";

import { useState } from "react";
import type { EChartsOption } from "echarts";
import Chart from "@/components/Chart";
import { Card, Stat, QueryState, DataTable } from "@/components/ui";
import { useQuery } from "@/lib/useQuery";
import { query } from "@/lib/duckdb";
import { loadManifest } from "@/lib/manifest";
import {
  grantsByYearSql,
  grantsSql,
  type GrantYearRow,
  type GrantRow,
} from "@/lib/queries";
import { gbp, gbpCompact, num, councilLabel } from "@/lib/format";

export default function GrantsPage() {
  const manifest = useQuery(() => loadManifest(), []);
  const [recipient, setRecipient] = useState("");
  const byYear = useQuery(() => query<GrantYearRow>(grantsByYearSql()), []);
  const grants = useQuery(
    () => query<GrantRow>(grantsSql({ recipient: recipient || undefined, limit: 200 })),
    [recipient],
  );

  const g = manifest.data?.datasets.grants;
  const totalGrants = (g?.by_council ?? []).reduce((a, c) => a + c.total, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Grants</h1>
        <p className="text-sm text-neutral-500">
          Grants to the community &amp; voluntary sector (Devon 2006–2017, Exeter
          2014–2026).
        </p>
      </header>

      <QueryState loading={manifest.loading} error={manifest.error}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Grant payments" value={num(g?.total_rows ?? 0)} />
          <Stat label="Total awarded" value={gbpCompact(totalGrants)} />
          <Stat label="Councils" value={g?.by_council.length ?? 0} />
        </div>
      </QueryState>

      <Card title="Grants awarded per year">
        <QueryState loading={byYear.loading} error={byYear.error} empty={!byYear.data?.length}>
          {byYear.data && <Chart option={grantsYearOption(byYear.data)} height={300} />}
        </QueryState>
      </Card>

      <Card title="Grant payments">
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Filter by recipient…"
          className="input mb-3"
        />
        <QueryState loading={grants.loading} error={grants.error} empty={!grants.data?.length}>
          <DataTable<GrantRow>
            columns={[
              { key: "award_date", label: "Date" },
              { key: "council", label: "Council" },
              { key: "recipient_name_raw", label: "Recipient" },
              { key: "purpose", label: "Purpose" },
              { key: "amount", label: "Amount", align: "right" },
            ]}
            rows={grants.data ?? []}
            render={{
              council: (r) => councilLabel(r.council),
              amount: (r) => gbp(r.amount),
            }}
          />
        </QueryState>
      </Card>
    </div>
  );
}

function grantsYearOption(rows: GrantYearRow[]): EChartsOption {
  const years = [...new Set(rows.map((r) => r.financial_year))].sort();
  const councils = [...new Set(rows.map((r) => r.council))].sort();
  const byKey = new Map(rows.map((r) => [`${r.council}|${r.financial_year}`, r.total]));
  return {
    tooltip: { trigger: "axis" },
    legend: { data: councils.map(councilLabel), top: 0 },
    grid: { left: 60, right: 20, top: 40, bottom: 40 },
    xAxis: { type: "category", data: years.map(String) },
    yAxis: { type: "value", axisLabel: { formatter: (v: number) => gbpCompact(v) } },
    series: councils.map((c) => ({
      name: councilLabel(c),
      type: "bar",
      stack: "total",
      data: years.map((y) => byKey.get(`${c}|${y}`) ?? 0),
    })),
  };
}
