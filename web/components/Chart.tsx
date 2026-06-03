"use client";

import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { useEffect, useState } from "react";

// Thin ECharts wrapper. ECharts handles large time-series + zoom/brush well,
// which suits 15 years of monthly spend data.
//
// ECharts has no knowledge of our CSS (prefers-color-scheme) dark mode, so on a
// dark card it would keep light-mode defaults: dark axis/legend text and — worst —
// a white text-border ("stroke") around data labels that's invisible on white but
// an ugly halo on dark. We pass a minimal dark theme that fixes the text colours
// and zeroes the default label stroke.
const DARK_THEME = {
  textStyle: { color: "#a3a3a3", textBorderWidth: 0 },
  title: { textStyle: { color: "#e5e5e5" } },
  legend: { textStyle: { color: "#a3a3a3" } },
  categoryAxis: {
    axisLine: { lineStyle: { color: "#525252" } },
    axisTick: { lineStyle: { color: "#525252" } },
    axisLabel: { color: "#a3a3a3" },
    splitLine: { lineStyle: { color: "#262626" } },
  },
  valueAxis: {
    axisLine: { lineStyle: { color: "#525252" } },
    axisTick: { lineStyle: { color: "#525252" } },
    axisLabel: { color: "#a3a3a3" },
    splitLine: { lineStyle: { color: "#262626" } },
  },
};

function usePrefersDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return dark;
}

export default function Chart({
  option,
  height = 360,
}: {
  option: EChartsOption;
  height?: number;
}) {
  const dark = usePrefersDark();
  return (
    <ReactECharts
      // Re-init when the colour scheme flips so the theme applies.
      key={dark ? "dark" : "light"}
      theme={dark ? DARK_THEME : undefined}
      option={option}
      style={{ height, width: "100%" }}
      notMerge
      lazyUpdate
    />
  );
}
