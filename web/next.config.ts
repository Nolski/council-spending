import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: the dashboard is fully client-side (DuckDB-WASM queries
  // Parquet in the browser), so it can be hosted on any static host for free.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
