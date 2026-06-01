"use client";

import type { ReactNode } from "react";

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
    >
      {title && (
        <h2 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card>
      <div className="text-sm text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}

/** Renders loading / error / empty states around query results. */
export function QueryState({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  children: ReactNode;
}) {
  if (error)
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        {error}
      </div>
    );
  if (loading)
    return (
      <div className="animate-pulse p-4 text-sm text-neutral-400">Loading…</div>
    );
  if (empty)
    return <div className="p-4 text-sm text-neutral-400">No data.</div>;
  return <>{children}</>;
}

export function DataTable<T>({
  columns,
  rows,
  render,
}: {
  columns: { key: keyof T & string; label: string; align?: "left" | "right" }[];
  rows: T[];
  render?: Partial<Record<keyof T & string, (row: T) => ReactNode>>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2 font-medium ${c.align === "right" ? "text-right" : ""}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-2 tabular-nums ${c.align === "right" ? "text-right" : ""}`}
                >
                  {render?.[c.key] ? render[c.key]!(row) : String(row[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
