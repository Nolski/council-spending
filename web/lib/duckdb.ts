"use client";

// The single data-access seam. Every view queries through `query()`. To move to
// a server backend later (FastAPI/Neon), only this file changes — no view edits.
//
// DuckDB-WASM runs entirely in the browser and reads the published Parquet over
// HTTP range requests, so there is no backend or database server. The WASM +
// worker bundles are loaded from the jsDelivr CDN (the documented single-thread
// build, which avoids cross-origin-isolation/COEP header requirements).

import * as duckdb from "@duckdb/duckdb-wasm";
import type { AsyncDuckDB, AsyncDuckDBConnection } from "@duckdb/duckdb-wasm";
import { BASE_PATH } from "./basepath";

let dbPromise: Promise<AsyncDuckDB> | null = null;
let conn: AsyncDuckDBConnection | null = null;

async function initDb(): Promise<AsyncDuckDB> {
  const bundles = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(bundles);

  // Load the cross-origin worker via a same-origin Blob (the documented trick).
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], {
      type: "text/javascript",
    }),
  );
  const worker = new Worker(workerUrl);
  const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);
  return db;
}

async function getConn(): Promise<AsyncDuckDBConnection> {
  if (!dbPromise) dbPromise = initDb();
  const db = await dbPromise;
  if (!conn) conn = await db.connect();
  return conn;
}

/** Absolute URL to a published data file (Parquet lives under /data). */
export function dataUrl(relPath: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}${BASE_PATH}/data/${relPath}`;
}

/** `read_parquet('<url>')` helper for use inside SQL. */
export function parquet(relPath: string): string {
  return `read_parquet('${dataUrl(relPath)}')`;
}

/** Read multiple Parquet files as one relation (e.g. selected partitions). */
export function parquetUnion(relPaths: string[]): string {
  const urls = relPaths.map((p) => `'${dataUrl(p)}'`).join(", ");
  return `read_parquet([${urls}])`;
}

/** Run a SQL query and return plain JS objects (BigInt counts coerced to Number). */
export async function query<T = Record<string, unknown>>(
  sql: string,
): Promise<T[]> {
  const c = await getConn();
  const table = await c.query(sql);
  const cols = table.schema.fields.map((f) => f.name);
  const rows: T[] = [];
  for (const row of table) {
    const o: Record<string, unknown> = {};
    for (const name of cols) {
      let v = (row as Record<string, unknown>)[name];
      if (typeof v === "bigint") v = Number(v);
      o[name] = v;
    }
    rows.push(o as T);
  }
  return rows;
}

/** Escape a string literal for inline SQL. */
export function sqlLit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}
