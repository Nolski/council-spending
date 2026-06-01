# web — Council Spending dashboard

Next.js (App Router) static-export dashboard. Queries the published Parquet
**in the browser via DuckDB-WASM** — no backend, no database server.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # static export to ./out
```

The dashboard reads data from `public/data` (a symlink to the repo-root `data/`
produced by the pipeline). Run the pipeline first so that data exists.

## Architecture

- `lib/duckdb.ts` — **the single data-access seam**. Every view queries through
  `query(sql)`. To move to a server backend later (FastAPI/Neon), only this file
  changes; no view edits.
- `lib/manifest.ts` — loads `data/manifest.json` (the pipeline↔web contract),
  including the list of Parquet partition files (browsers can't glob remote dirs).
- `lib/queries.ts` — named SQL builders per view.
- `app/` — Overview, Spending explorer, Suppliers (+ drill-down), SQL console.

## Notes

- DuckDB-WASM and its worker load from the jsDelivr CDN (single-thread build, so
  no COOP/COEP headers are needed) — internet is required at runtime for v1.
- Deploy target: any static host (GitHub Pages / Cloudflare Pages / Vercel free).
