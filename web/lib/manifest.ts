"use client";

import { dataUrl } from "./duckdb";

// Mirrors the pipeline-emitted data/manifest.json (the data contract).

export interface PartitionInfo {
  council: string;
  year: number;
  path: string;
  rows: number;
}

export interface CouncilCoverage {
  council: string;
  rows: number;
  total_spend: number;
  date_min: string | null;
  date_max: string | null;
}

export interface GrantsDataset {
  path: string;
  total_rows: number;
  by_council: { council: string; rows: number; total: number }[];
}

export interface ContractsDataset {
  path: string;
  total_rows: number;
  total_value: number;
  by_council: { council: string; rows: number }[];
}

export interface Manifest {
  generated_at: string;
  datasets: {
    spending: {
      total_rows: number;
      by_council: CouncilCoverage[];
      partitions: PartitionInfo[];
    };
    grants?: GrantsDataset;
    contracts?: ContractsDataset;
  };
  summaries: string[];
}

let cache: Promise<Manifest> | null = null;

export function loadManifest(): Promise<Manifest> {
  if (!cache) {
    cache = fetch(dataUrl("manifest.json")).then((r) => {
      if (!r.ok) throw new Error(`Failed to load manifest: ${r.status}`);
      return r.json();
    });
  }
  return cache;
}

/** Partition file paths matching the given council/year filter (all if null). */
export function selectPartitions(
  m: Manifest,
  councils: string[] | null,
  years: [number, number] | null,
): string[] {
  return m.datasets.spending.partitions
    .filter((p) => p.year > 0) // year=0 holds null-date rows; exclude from explorer
    .filter((p) => !councils || councils.includes(p.council))
    .filter((p) => !years || (p.year >= years[0] && p.year <= years[1]))
    .map((p) => p.path);
}
