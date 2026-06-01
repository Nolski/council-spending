import type { EChartsOption } from "echarts";
import { gbpCompact } from "./format";

type TrendRow = { year_month: string; total: number };

/** Multi-series monthly time-series: one line per distinct value of `seriesField`. */
export function trendOption<T extends TrendRow>(
  rows: T[],
  opts: {
    seriesField: keyof T & string;
    labelFn?: (key: string) => string;
    type?: "line" | "bar";
    stack?: boolean;
  },
): EChartsOption {
  const { seriesField, labelFn = (k) => k, type = "line", stack } = opts;
  const key = (r: T) => String(r[seriesField]);
  const months = [...new Set(rows.map((r) => r.year_month))].sort();
  const keys = [...new Set(rows.map(key))].sort();
  const byKey = new Map(rows.map((r) => [`${key(r)}|${r.year_month}`, r.total]));
  return {
    tooltip: { trigger: "axis" },
    legend: { data: keys.map(labelFn), top: 0, type: "scroll" },
    grid: { left: 60, right: 20, top: 40, bottom: 60 },
    xAxis: { type: "category", data: months },
    yAxis: { type: "value", axisLabel: { formatter: (v: number) => gbpCompact(v) } },
    dataZoom: [
      { type: "inside", start: 0, end: 100 },
      { type: "slider", start: 0, end: 100 },
    ],
    series: keys.map((k) => ({
      name: labelFn(k),
      type,
      ...(stack ? { stack: "total" } : {}),
      showSymbol: false,
      data: months.map((m) => byKey.get(`${k}|${m}`) ?? 0),
    })),
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  agency_staff: "Agency staff",
  consultants: "Consultants",
  care_provider: "Care providers",
  special_school_placement: "Private special schools",
  send_transport: "SEND transport",
  temporary_accommodation: "Temporary accommodation",
  highways_construction: "Highways / construction",
  waste: "Waste",
  it_systems: "IT systems",
  unclassified: "Unclassified / other",
};

export function categoryLabel(c: string): string {
  return CATEGORY_LABELS[c] ?? c;
}
