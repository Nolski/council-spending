"use client";

import { useState } from "react";
import { Card, Stat, QueryState, DataTable } from "@/components/ui";
import { useQuery } from "@/lib/useQuery";
import { query } from "@/lib/duckdb";
import { loadManifest } from "@/lib/manifest";
import { contractsSql, type ContractRow } from "@/lib/queries";
import { gbp, gbpCompact, num, councilLabel } from "@/lib/format";

export default function ContractsPage() {
  const manifest = useQuery(() => loadManifest(), []);
  const [supplier, setSupplier] = useState("");
  const contracts = useQuery(
    () => query<ContractRow>(contractsSql({ supplier: supplier || undefined, limit: 300 })),
    [supplier],
  );

  const c = manifest.data?.datasets.contracts;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Contracts &amp; tenders</h1>
        <p className="text-sm text-neutral-500">
          Exeter contracts register. (Devon publishes via Contracts Finder only —
          not yet ingested.)
        </p>
      </header>

      <QueryState loading={manifest.loading} error={manifest.error}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Contracts" value={num(c?.total_rows ?? 0)} />
          <Stat label="Total value" value={gbpCompact(c?.total_value ?? 0)} />
          <Stat label="Councils" value={c?.by_council.length ?? 0} />
        </div>
      </QueryState>

      <Card title="Contracts by value">
        <input
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          placeholder="Filter by contractor…"
          className="input mb-3"
        />
        <QueryState
          loading={contracts.loading}
          error={contracts.error}
          empty={!contracts.data?.length}
        >
          <DataTable<ContractRow>
            columns={[
              { key: "title", label: "Contract" },
              { key: "supplier_name_raw", label: "Contractor" },
              { key: "category", label: "Service" },
              { key: "start_date", label: "Start" },
              { key: "end_date", label: "End" },
              { key: "value", label: "Value", align: "right" },
            ]}
            rows={contracts.data ?? []}
            render={{
              value: (r) => (r.value != null ? gbp(r.value) : "—"),
            }}
          />
        </QueryState>
      </Card>
    </div>
  );
}
