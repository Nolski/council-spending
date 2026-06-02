"use client";

import { BASE_PATH } from "./basepath";

// Loaders + types for the pre-baked scrollytelling data (web/public/story/).

export interface FromData {
  meta: { note: string; classified_pct: number };
  totals: Record<
    string,
    { rows: number; total_spend: number; date_min: string; date_max: string }
  >;
  category_totals: { council: string; spend_category: string; total: number; txn_count: number }[];
  category_annual: { council: string; spend_category: string; year: string; total: number }[];
  concentration: { council: string; year: number; top10_pct: number; n_suppliers: number; total: number }[];
  top_suppliers: { council: string; supplier_name_norm: string; total: number }[];
  run_rate_year: number;
  savings_runrate: { council: string; spend_category: string; annual: number }[];
  candidate_suppliers: {
    council: string;
    spend_category: string;
    supplier: string;
    total: number;
    annual: number;
    txns: number;
  }[];
}

// Curated entries are intentionally loosely typed (mixed shapes); access by key.
export type Curated = Record<string, any>;

function base(): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${BASE_PATH}/story`;
}

let cache: Promise<{ data: FromData; curated: Curated }> | null = null;

export function loadStory(): Promise<{ data: FromData; curated: Curated }> {
  if (!cache) {
    cache = Promise.all([
      fetch(`${base()}/from_data.json`).then((r) => r.json()),
      fetch(`${base()}/curated.json`).then((r) => r.json()),
    ]).then(([data, curated]) => ({ data, curated }));
  }
  return cache;
}

/** Sum a category's total across councils (or one council). */
export function categoryTotal(d: FromData, category: string, council?: string): number {
  return d.category_totals
    .filter((r) => r.spend_category === category && (!council || r.council === council))
    .reduce((a, r) => a + r.total, 0);
}
