"use client";

import CategoryAnalysis from "@/components/CategoryAnalysis";

export default function HousingAnalysisPage() {
  return (
    <CategoryAnalysis
      title="Housing & homelessness"
      subtitle="Temporary-accommodation spend to private providers"
      council="exeter"
      categories={["temporary_accommodation"]}
      question="Would acquiring or building council homes cost less over time than the perpetual revenue transfer to hotels, B&Bs and private landlords for temporary accommodation?"
      narrative={
        <>
          Right to Buy and a frozen Local Housing Allowance turned a one-off capital
          problem — building and keeping social homes — into a permanent revenue transfer
          to private landlords and B&amp;B operators. Exeter houses 600+ households in
          temporary accommodation, spot-purchasing hotels when its contracted and
          council-owned units are full. Note: payee redaction means small-landlord spend
          is understated here, and this captures only spend over £250.
        </>
      }
    />
  );
}
