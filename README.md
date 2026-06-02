# Council Spending Analysis

Data-ingestion pipelines and an interactive dashboard for analyzing **Exeter City
Council** and **Devon County Council** spending — built to support evidence-based
policy proposals.

**Live site:** https://nolski.github.io/council-spending/ — interactive dashboard + the "No one is coming" data essay.

## What this is

A monorepo with two decoupled halves joined by a **Parquet data contract**:

| Path        | What it does |
|-------------|--------------|
| `pipeline/` | Python ETL. Fetches published transparency files, lands them immutably, parses drifting headers into a canonical schema, normalizes suppliers/dates/amounts, and emits partitioned Parquet + a DuckDB database to `data/`. |
| `web/`      | Next.js dashboard that queries the Parquet **in the browser via DuckDB-WASM** — fully static, no backend, free to host. |
| `data/`     | Pipeline output: Hive-partitioned Parquet, pre-computed summary tables, and `manifest.json` (the contract the dashboard reads). |

## Data sources

| Council | Dataset | Source | Notes |
|---------|---------|--------|-------|
| Devon CC | Spending > £500 | [GitHub `Devon-County-Council/spending`](https://github.com/Devon-County-Council/spending) | Monthly CSV, 2011→present, stable URLs, OGL. |
| Exeter CC | Spending > £250 | [Council spending page](https://exeter.gov.uk/council-and-democracy/council-information/council-data/council-spending/) | Quarterly CSV behind hashed `/media/` links (scraped); pre-redacted. |
| Devon CC | Grants | [GitHub `Devon-County-Council/grants`](https://github.com/Devon-County-Council/grants) | Community/voluntary sector, 2014–2017. |
| Exeter CC | Grants | [Grants awarded page](https://exeter.gov.uk/council-and-democracy/council-information/council-data/grants-awarded/) | Annual CSV, 2014→present (preamble rows handled). |
| Exeter CC | Contracts & tenders | [Contracts page](https://exeter.gov.uk/council-and-democracy/council-information/council-data/contracts/) | Contracts register CSV. |
| Devon CC | Contracts | [Contracts Finder](https://www.contractsfinder.service.gov.uk) | **Not yet ingested** — published via the OCDS API only, no flat file. |
| Both | Senior salaries | Per [Local Government Transparency Code 2015](https://www.gov.uk/government/publications/local-government-transparency-code-2015/local-government-transparency-code-2015) | Not yet ingested. |

All data is published under the Open Government Licence.

## Quick start

```bash
# Pipeline
cd pipeline
uv sync
uv run council fetch --source devon_spending     # download raw files (incremental)
uv run council build                              # → ../data/*.parquet + manifest.json

# Dashboard
cd ../web
pnpm install
pnpm dev                                          # http://localhost:3000
```

## Design notes

- **Incremental & idempotent**: re-running the pipeline only re-downloads changed
  files (conditional GET + content hashes) and produces deterministic row IDs.
- **Provenance**: every canonical row carries its source file, URL, and fetch date,
  plus a `raw` struct of all original columns — nothing is discarded.
- **Supplier matching is heuristic** (no official cross-council ID exists); raw name
  variants are retained for audit.

See `/home/nolski/.claude/plans/okay-i-live-in-fuzzy-thacker.md` for the full plan.

## Data hosting

`data/` Parquet can grow large. Track it with [git-lfs](https://git-lfs.com/) or
publish it as a GitHub release artifact rather than committing raw Parquet. Only
`data/manifest.json` is committed by default (see `.gitignore`).
