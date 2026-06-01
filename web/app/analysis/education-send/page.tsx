"use client";

import CategoryAnalysis from "@/components/CategoryAnalysis";

export default function EducationSendAnalysisPage() {
  return (
    <CategoryAnalysis
      title="Education & SEND"
      subtitle="Private special-school placements and home-to-school transport"
      council="devon"
      categories={["special_school_placement", "send_transport"]}
      question="Would investing in inclusive state special-needs provision reduce the long-run cost of private placements and transport that currently drive the high-needs deficit?"
      narrative={
        <>
          Academisation removed schools from council control while councils kept SEND
          duties, and an underfunded high-needs block created a structural deficit — Devon
          entered a DfE &quot;Safety Valve&quot; deal requiring deep cuts. Public money flows
          to private special-school operators and transport contractors because inclusive
          state provision was hollowed out. (Home-to-school transport is under-captured by
          our current classifier — see the methodology note; figures are directional.)
        </>
      }
    />
  );
}
