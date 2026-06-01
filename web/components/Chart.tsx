"use client";

import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";

// Thin ECharts wrapper. ECharts handles large time-series + zoom/brush well,
// which suits 15 years of monthly spend data.
export default function Chart({
  option,
  height = 360,
}: {
  option: EChartsOption;
  height?: number;
}) {
  return (
    <ReactECharts
      option={option}
      style={{ height, width: "100%" }}
      notMerge
      lazyUpdate
    />
  );
}
