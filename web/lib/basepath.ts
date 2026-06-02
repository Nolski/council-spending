// On GitHub Pages this app is served from a sub-path (/council-spending), so every
// root-absolute URL we build by hand (Parquet/JSON fetches, links to /research docs)
// must be prefixed. Next.js basePath handles routing + next/link automatically, but
// NOT manual fetch()/<a href> — those use this. Empty in local dev.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix a root-absolute path (starting with "/") with the deployment base path. */
export function asset(path: string): string {
  return `${BASE_PATH}${path}`;
}
