"use client";

import type { ReactNode } from "react";
import { useInView } from "@/lib/useInView";

/** Full-bleed number beat — the editorial "gut punch" between sections. */
export function BigStat({
  value,
  label,
  source,
  kind = "data",
}: {
  value: string;
  label: ReactNode;
  source?: string;
  kind?: "verified" | "data" | "illustrative";
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`mx-auto max-w-3xl px-5 py-16 text-center transition-all duration-700 ${
        inView ? "scale-100 opacity-100" : "scale-95 opacity-0"
      }`}
    >
      <div className="story-display text-6xl font-extrabold tracking-tight text-blue-600 sm:text-7xl dark:text-blue-400">
        {value}
      </div>
      <div className="mx-auto mt-4 max-w-xl text-lg text-neutral-700 dark:text-neutral-300">
        {label}
      </div>
      {source && <SourceTag kind={kind}>{source}</SourceTag>}
    </div>
  );
}

const KIND_LABEL: Record<string, string> = {
  verified: "Verified",
  data: "Our analysis",
  illustrative: "Illustrative scenario",
};

const KIND_STYLE: Record<string, string> = {
  verified: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  data: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  illustrative: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

/** Provenance chip — keeps every figure honest about its status. */
export function SourceTag({
  kind = "data",
  children,
}: {
  kind?: "verified" | "data" | "illustrative";
  children: ReactNode;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-500">
      <span className={`rounded px-1.5 py-0.5 font-medium ${KIND_STYLE[kind]}`}>
        {KIND_LABEL[kind]}
      </span>
      <span>{children}</span>
    </div>
  );
}
