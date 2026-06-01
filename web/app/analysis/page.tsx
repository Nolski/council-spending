"use client";

import Link from "next/link";
import { Card, QueryState, DataTable } from "@/components/ui";
import { useQuery } from "@/lib/useQuery";
import { query } from "@/lib/duckdb";
import { categoryTotalsSql, type CategoryTotalRow } from "@/lib/queries";
import { categoryLabel } from "@/lib/charts";
import { gbp, num, councilLabel } from "@/lib/format";

const VIEWS = [
  {
    href: "/analysis/profit-extraction",
    title: "Profit extraction & outsourcing",
    blurb:
      "Where public money flows to private contractors, agencies, consultants and care operators — and how concentrated that spending is.",
  },
  {
    href: "/analysis/housing",
    title: "Housing & homelessness (Exeter)",
    blurb:
      "Temporary-accommodation spend to private providers vs. building and keeping council homes.",
  },
  {
    href: "/analysis/social-care",
    title: "Adult social care (Devon)",
    blurb:
      "Care-package spend to private providers — the council side of NHS discharge pressure.",
  },
  {
    href: "/analysis/education-send",
    title: "Education & SEND (Devon)",
    blurb:
      "Private special-school placements and home-to-school transport amid the high-needs deficit.",
  },
];

export default function AnalysisPage() {
  const totals = useQuery(() => query<CategoryTotalRow>(categoryTotalsSql()), []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Analysis: where the money goes</h1>
        <p className="max-w-3xl text-sm text-neutral-500">
          A critical read of Devon &amp; Exeter spending, classifying transactions into
          analytical categories to surface re-budgeting opportunities. Devon is the{" "}
          <strong>county</strong> (social care, SEND, highways); Exeter the{" "}
          <strong>district</strong> (housing, homelessness, leisure) — so each issue is
          evidenced from the right council&apos;s data. Figures cover ~59% of spend by
          value; the rest is uncategorised. Every number traces to a query over the
          published data.
        </p>
        <p className="mt-2 text-sm">
          <a
            href="/research/council-finance-critique.md"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            → Read the full research report
          </a>{" "}
          <span className="text-neutral-400">
            (critical analysis with citations &amp; re-budgeting options)
          </span>
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {VIEWS.map((v) => (
          <Link key={v.href} href={v.href}>
            <Card className="h-full transition-colors hover:border-blue-400">
              <h2 className="font-medium">{v.title}</h2>
              <p className="mt-1 text-sm text-neutral-500">{v.blurb}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card title="Classified spend by category (cumulative)">
        <QueryState loading={totals.loading} error={totals.error} empty={!totals.data?.length}>
          <DataTable<CategoryTotalRow>
            columns={[
              { key: "council", label: "Council" },
              { key: "spend_category", label: "Category" },
              { key: "total", label: "Total", align: "right" },
              { key: "txn_count", label: "Txns", align: "right" },
            ]}
            rows={(totals.data ?? []).filter((r) => r.spend_category !== "unclassified")}
            render={{
              council: (r) => councilLabel(r.council),
              spend_category: (r) => categoryLabel(r.spend_category),
              total: (r) => gbp(r.total),
              txn_count: (r) => num(r.txn_count),
            }}
          />
        </QueryState>
      </Card>
    </div>
  );
}
