"use client";

import CategoryAnalysis from "@/components/CategoryAnalysis";

export default function SocialCareAnalysisPage() {
  return (
    <CategoryAnalysis
      title="Adult social care"
      subtitle="Care-package spend to private providers — the council side of NHS discharge pressure"
      council="devon"
      categories={["care_provider"]}
      question="How much of Devon's care spend leaves the local economy as profit to private-equity / offshore-owned operators, and could in-house or not-for-profit provision retain more of it?"
      narrative={
        <>
          A decade of cuts left an adult-social-care funding gap; insufficient home and
          residential capacity drives delayed hospital discharges, so a social-care
          shortfall presents as an NHS A&amp;E problem. Care is Devon&apos;s largest budget
          line. Most UK care capacity is for-profit, and large operators use related-party
          debt and offshore structures to extract profit. (NHS budgets are not council
          spend, so they don&apos;t appear here; this is the council-funded care side.
          Our broad &quot;care&quot; classifier may over-capture — treat as directional.)
        </>
      }
    />
  );
}
