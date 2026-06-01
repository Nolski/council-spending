"use client";

import type { EChartsOption } from "echarts";
import type { ReactNode } from "react";
import Chart from "@/components/Chart";
import { useInView } from "@/lib/useInView";
import { SourceTag } from "./BigStat";

/**
 * Full-width editorial figure: a title, the chart (ECharts — annotations such as
 * markLine/markArea/graphic are baked into the passed `option`), a caption that
 * states the takeaway, and a provenance tag.
 */
export function AnnotatedChart({
  title,
  option,
  caption,
  source,
  kind = "data",
  height = 380,
}: {
  title: string;
  option: EChartsOption;
  caption?: ReactNode;
  source?: string;
  kind?: "verified" | "data" | "illustrative";
  height?: number;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <figure
      ref={ref}
      className={`mx-auto my-10 max-w-4xl px-5 transition-all duration-700 ${
        inView ? "opacity-100" : "opacity-0"
      }`}
    >
      <h3 className="story-display mb-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
        {title}
      </h3>
      <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
        {inView && <Chart option={option} height={height} />}
      </div>
      {caption && (
        <figcaption className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          {caption}
        </figcaption>
      )}
      {source && <SourceTag kind={kind}>{source}</SourceTag>}
    </figure>
  );
}
