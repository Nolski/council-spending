import type { NextConfig } from "next";

// On GitHub Pages (project site) we build with GITHUB_PAGES=true → served under
// /council-spending. Locally (and on root hosts) basePath is empty.
const repo = "council-spending";
const onPages = process.env.GITHUB_PAGES === "true";
const basePath = onPages ? `/${repo}` : "";

const nextConfig: NextConfig = {
  // Static export: the dashboard is fully client-side (DuckDB-WASM queries
  // Parquet in the browser), so it can be hosted on any static host for free.
  output: "export",
  images: { unoptimized: true },
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  trailingSlash: true,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
