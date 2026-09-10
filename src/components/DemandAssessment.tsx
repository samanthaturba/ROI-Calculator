"use client";

import { useState } from "react";
import type { DemandAssessment as DemandAssessmentType, EvidenceTaggedClaim, EvidenceTier } from "../lib/types";

function TierBadge({ tier }: { tier: EvidenceTier }) {
  const styles: Record<EvidenceTier, string> = {
    VERIFIED: "bg-green-100 text-green-800 border-green-200",
    INFERRED: "bg-yellow-100 text-yellow-800 border-yellow-200",
    UNKNOWN: "bg-red-100 text-red-800 border-red-200",
  };
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${styles[tier]}`}>
      {tier}
    </span>
  );
}

function EvidenceLine({ label, claim }: { label: string; claim: EvidenceTaggedClaim }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
      <div className="shrink-0 w-[90px]">
        <TierBadge tier={claim.tier} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-cogent-navy">{label}</p>
        <p className="text-xs text-cogent-neutral mt-0.5">{claim.claim}</p>
        {claim.source && claim.tier === "VERIFIED" && (
          <p className="text-[10px] text-gray-400 mt-0.5">Source: {claim.source}</p>
        )}
      </div>
    </div>
  );
}

interface Props {
  assessment: DemandAssessmentType;
}

export default function DemandAssessment({ assessment }: Props) {
  const [expanded, setExpanded] = useState(false);

  const verdictStyles = {
    FIT: {
      border: "border-green-400",
      bg: "bg-green-50",
      text: "text-green-900",
      badge: "bg-green-600 text-white",
      icon: "✅",
    },
    LIMITED_FIT: {
      border: "border-amber-400",
      bg: "bg-amber-50",
      text: "text-amber-900",
      badge: "bg-amber-500 text-white",
      icon: "⚠️",
    },
    NOT_A_FIT: {
      border: "border-red-400",
      bg: "bg-red-50",
      text: "text-red-900",
      badge: "bg-red-600 text-white",
      icon: "❌",
    },
  };

  const style = verdictStyles[assessment.verdict];
  const verdictLabel = assessment.verdict.replace(/_/g, " ");

  return (
    <section className={`rounded-lg border-2 ${style.border} ${style.bg} p-5 shadow-sm`}>
      {/* Verdict banner */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{style.icon}</span>
            <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${style.badge}`}>
              Paid Search: {verdictLabel}
            </span>
          </div>
          <p className={`text-sm font-semibold ${style.text} mt-1`}>
            {assessment.verdictReason}
          </p>
        </div>
      </div>

      {/* Demand model classification */}
      <div className="mb-3 p-3 bg-white/60 rounded-md border border-gray-200">
        <p className="text-xs font-semibold text-cogent-navy mb-1">
          Demand Model: {assessment.demandModelLabel}
        </p>
        <p className="text-xs text-cogent-neutral leading-relaxed">
          {assessment.demandModelExplanation}
        </p>
      </div>

      {/* Spend ceiling (FIT/LIMITED_FIT) */}
      {assessment.spendCeiling && assessment.spendCeiling.amount && (
        <div className="mb-3 p-3 bg-white/60 rounded-md border border-gray-200">
          <p className="text-xs font-semibold text-cogent-navy">
            Recommended Spend Ceiling: ${assessment.spendCeiling.amount.toLocaleString()}/mo
          </p>
          <p className="text-xs text-cogent-neutral mt-0.5">
            {assessment.spendCeiling.reason}
          </p>
        </div>
      )}

      {/* Intake blockers */}
      {assessment.intakeBlockers && assessment.intakeBlockers.length > 0 && (
        <div className="mb-3 p-3 bg-red-50 rounded-md border border-red-200">
          <p className="text-xs font-semibold text-red-800 mb-1">
            Intake Blockers — Fix Before Running Ads
          </p>
          <ul className="text-xs text-red-700 list-disc list-inside space-y-0.5">
            {assessment.intakeBlockers.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Alternative channels (NOT_A_FIT / LIMITED_FIT) */}
      {assessment.alternativeChannels && assessment.alternativeChannels.length > 0 && (
        <div className="mb-3 p-3 bg-white/60 rounded-md border border-gray-200">
          <p className="text-xs font-semibold text-cogent-navy mb-1.5">
            {assessment.verdict === "NOT_A_FIT"
              ? "Where This Business Should Invest Instead"
              : "Complementary Channels"}
          </p>
          <div className="space-y-1.5">
            {assessment.alternativeChannels.map((alt, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-cogent-sage mt-0.5 shrink-0">&#9679;</span>
                <div>
                  <span className="text-xs font-medium text-cogent-navy">{alt.channel}</span>
                  <span className="text-xs text-cogent-neutral"> — {alt.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expandable evidence section */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs font-medium text-cogent-navy hover:underline flex items-center gap-1"
      >
        {expanded ? "▼" : "▶"} Evidence & Analysis ({
          [assessment.buyerInitiatesWithSearch, assessment.transactionDirect,
           assessment.searchTermBehavior, assessment.headTermOwnership,
           assessment.salesCycleLength, assessment.geoConstrained]
            .filter(c => c.tier === "UNKNOWN").length
        } unknown)
      </button>

      {expanded && (
        <div className="mt-2 bg-white/80 rounded-md border border-gray-200 p-3">
          <EvidenceLine label="Buyer initiates with search?" claim={assessment.buyerInitiatesWithSearch} />
          <EvidenceLine label="Transaction direct?" claim={assessment.transactionDirect} />
          <EvidenceLine label="Search term behavior" claim={assessment.searchTermBehavior} />
          <EvidenceLine label="Head term ownership" claim={assessment.headTermOwnership} />
          <EvidenceLine label="Sales cycle & reporting window" claim={assessment.salesCycleLength} />
          <EvidenceLine label="Geographic constraint" claim={assessment.geoConstrained} />
        </div>
      )}

      {/* NOT_A_FIT: strong disclaimer above projections */}
      {assessment.verdict === "NOT_A_FIT" && (
        <div className="mt-3 p-3 bg-red-100/80 rounded-md border border-red-300">
          <p className="text-xs font-semibold text-red-900">
            The projections below are theoretical only.
          </p>
          <p className="text-xs text-red-800 mt-0.5">
            This business&apos;s demand model does not support paid search as a primary lead channel.
            The numbers below show what the math would produce if search demand existed — they do not represent realistic lead volume.
            Do not present these numbers to a client as achievable results.
          </p>
        </div>
      )}

      {assessment.verdict === "LIMITED_FIT" && (
        <div className="mt-3 p-3 bg-amber-100/80 rounded-md border border-amber-300">
          <p className="text-xs font-semibold text-amber-900">
            Projections below apply only within the spend ceiling above.
          </p>
          <p className="text-xs text-amber-800 mt-0.5">
            Beyond that ceiling, additional budget produces diminishing returns — keyword volume is exhausted and you start buying irrelevant traffic.
            Present only the narrow use case to the client, not the full projection.
          </p>
        </div>
      )}
    </section>
  );
}
