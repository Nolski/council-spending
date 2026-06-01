"use client";

import { useMemo, useState } from "react";
import { Card, QueryState, DataTable } from "@/components/ui";
import { useQuery } from "@/lib/useQuery";
import { query } from "@/lib/duckdb";
import { loadManifest, selectPartitions } from "@/lib/manifest";
import { transactionsSql, type TxnRow } from "@/lib/queries";
import { gbp, num, councilLabel } from "@/lib/format";

export default function SpendingPage() {
  const manifest = useQuery(() => loadManifest(), []);
  const [supplier, setSupplier] = useState("");
  const [minAmount, setMinAmount] = useState(0);
  const [council, setCouncil] = useState<string>("");
  const [fromYear, setFromYear] = useState(2011);
  const [toYear, setToYear] = useState(2026);

  const partitions = useMemo(() => {
    if (!manifest.data) return [];
    return selectPartitions(
      manifest.data,
      council ? [council] : null,
      [fromYear, toYear],
    );
  }, [manifest.data, council, fromYear, toYear]);

  const txns = useQuery(
    () =>
      partitions.length
        ? query<TxnRow>(
            transactionsSql(partitions, {
              supplier: supplier || undefined,
              minAmount,
              limit: 200,
            }),
          )
        : Promise.resolve<TxnRow[]>([]),
    [partitions, supplier, minAmount],
  );

  const councils = manifest.data?.datasets.spending.by_council.map((c) => c.council) ?? [];
  const total = (txns.data ?? []).reduce((a, r) => a + r.amount, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Spending explorer</h1>
        <p className="text-sm text-neutral-500">
          Top 200 transactions matching your filters. Querying {partitions.length}{" "}
          partition file(s) in-browser.
        </p>
      </header>

      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Council">
            <select
              value={council}
              onChange={(e) => setCouncil(e.target.value)}
              className="input"
            >
              <option value="">All councils</option>
              {councils.map((c) => (
                <option key={c} value={c}>
                  {councilLabel(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Supplier contains">
            <input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="e.g. highways"
              className="input"
            />
          </Field>
          <Field label={`Min amount: ${gbp(minAmount)}`}>
            <input
              type="range"
              min={0}
              max={500000}
              step={1000}
              value={minAmount}
              onChange={(e) => setMinAmount(Number(e.target.value))}
              className="w-full"
            />
          </Field>
          <Field label="Years">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={fromYear}
                min={2011}
                max={2026}
                onChange={(e) => setFromYear(Number(e.target.value))}
                className="input w-20"
              />
              <span className="text-neutral-400">–</span>
              <input
                type="number"
                value={toYear}
                min={2011}
                max={2026}
                onChange={(e) => setToYear(Number(e.target.value))}
                className="input w-20"
              />
            </div>
          </Field>
        </div>
      </Card>

      <Card
        title={`Results — ${num((txns.data ?? []).length)} shown, ${gbp(total)} total`}
      >
        <QueryState
          loading={manifest.loading || txns.loading}
          error={manifest.error || txns.error}
          empty={!txns.data?.length}
        >
          <DataTable<TxnRow>
            columns={[
              { key: "payment_date", label: "Date" },
              { key: "council", label: "Council" },
              { key: "supplier_name_raw", label: "Supplier" },
              { key: "expense_area", label: "Area" },
              { key: "amount", label: "Amount", align: "right" },
            ]}
            rows={txns.data ?? []}
            render={{
              council: (r) => councilLabel(r.council),
              amount: (r) => gbp(r.amount, true),
              supplier_name_raw: (r) =>
                r.is_redacted ? (
                  <span className="italic text-neutral-400">{r.supplier_name_raw}</span>
                ) : (
                  r.supplier_name_raw
                ),
            }}
          />
        </QueryState>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-500">{label}</span>
      {children}
    </label>
  );
}
