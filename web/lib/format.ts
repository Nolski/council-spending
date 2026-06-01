// Shared display formatters (UK locale, GBP).

const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const GBP_PRECISE = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 2,
});

const NUM = new Intl.NumberFormat("en-GB");

export function gbp(n: number, precise = false): string {
  if (n == null || Number.isNaN(n)) return "—";
  return (precise ? GBP_PRECISE : GBP).format(n);
}

/** Compact money: £1.2bn / £3.4m / £56k. */
export function gbpCompact(n: number): string {
  if (n == null || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `£${(n / 1e9).toFixed(2)}bn`;
  if (abs >= 1e6) return `£${(n / 1e6).toFixed(1)}m`;
  if (abs >= 1e3) return `£${(n / 1e3).toFixed(0)}k`;
  return gbp(n);
}

export function num(n: number): string {
  if (n == null || Number.isNaN(n)) return "—";
  return NUM.format(n);
}

export const COUNCIL_LABELS: Record<string, string> = {
  devon: "Devon County Council",
  exeter: "Exeter City Council",
};

export function councilLabel(c: string): string {
  return COUNCIL_LABELS[c] ?? c;
}
