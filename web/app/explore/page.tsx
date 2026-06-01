"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { query, parquet } from "@/lib/duckdb";

const EXAMPLE = `-- Read-only SQL over the published data (DuckDB-WASM, in your browser).
-- Available: summary tables + spending partitions. Example:
SELECT council, year_month, total
FROM ${parquet("summary/spend_by_month.parquet")}
ORDER BY total DESC
LIMIT 20;`;

export default function ExplorePage() {
  const [sql, setSql] = useState(EXAMPLE);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      setRows(await query(sql));
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
      setRows([]);
    } finally {
      setRunning(false);
    }
  }

  function exportCsv() {
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    const csv = [
      cols.join(","),
      ...rows.map((r) =>
        cols
          .map((c) => {
            const v = r[c] ?? "";
            const s = String(v);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "query-result.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const cols = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">SQL console</h1>
        <p className="text-sm text-neutral-500">
          Power-user access. Use{" "}
          <code className="rounded bg-neutral-200 px-1 dark:bg-neutral-800">
            read_parquet(&apos;/data/…&apos;)
          </code>{" "}
          to read files. The helper above builds the URLs for you.
        </p>
      </header>

      <Card>
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          spellCheck={false}
          className="input font-mono"
          style={{ minHeight: 180 }}
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={run}
            disabled={running}
            className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {running ? "Running…" : "Run"}
          </button>
          <button
            onClick={exportCsv}
            disabled={!rows.length}
            className="rounded-md border border-neutral-300 px-4 py-1.5 text-sm disabled:opacity-50 dark:border-neutral-700"
          >
            Export CSV
          </button>
          <span className="self-center text-sm text-neutral-400">
            {rows.length ? `${rows.length} row(s)` : ""}
          </span>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {rows.length > 0 && (
        <Card>
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-white dark:bg-neutral-900">
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                  {cols.map((c) => (
                    <th key={c} className="px-3 py-2 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 500).map((r, i) => (
                  <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800/60">
                    {cols.map((c) => (
                      <td key={c} className="px-3 py-2 tabular-nums">
                        {String(r[c] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
