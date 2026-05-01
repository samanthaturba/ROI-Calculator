"use client";

import { useState } from "react";
import strategyData from "../data/linkedin-strategy.json";

// Strategy data shape (intentionally permissive — content is editorial, not validated)
interface IndustryStrategy {
  viability: string;
  viabilityNote: string;
  targetPersonas: Array<{
    role: string;
    titles?: string[];
    seniority?: string[];
    industries?: string[];
    companySize?: string[];
    skills?: string[];
    watchOut?: string;
    guidance?: string;
  }>;
  recommendedFormats: string[];
  funnelStrategy: string;
  copyAngle: string;
  abmOpportunity: string;
  audienceSizeNote: string;
  watchOuts: string;
}

interface UniversalGuidance {
  whenToUse: string[];
  whenNotToUse: string[];
  ruleOfThumb: string;
  minimumBudgets: Record<string, { daily: number; monthly: number; why: string }>;
  audienceSizeRules: Record<string, string>;
  kpiBenchmarks2026: Record<string, { belowAvg: string; average: string; strong: string; bestInClass: string }>;
  copyFrameworks: Array<{ name: string; bestFor: string }>;
  creativeRules: string[];
  preLaunchChecklist: string[];
  commonPitfalls: Array<{ pitfall: string; fix: string }>;
  disclaimer: string;
}

interface Props {
  industryId: string | null;
  industryName: string | null;
  monthlyAdSpend: number;
  /** Spend allocated specifically to LinkedIn (when in multi-platform mode). If unknown, pass undefined. */
  linkedInSpend?: number;
}

const universal = (strategyData as Record<string, unknown>)._universal as UniversalGuidance;
const generic = (strategyData as Record<string, unknown>)._generic as IndustryStrategy;

const VIABILITY_BADGE: Record<string, { label: string; classes: string }> = {
  excellent: { label: "Excellent fit", classes: "bg-green-100 text-green-800 border-green-300" },
  strong: { label: "Strong fit", classes: "bg-blue-100 text-blue-800 border-blue-300" },
  "moderate-to-strong": { label: "Moderate-to-strong fit", classes: "bg-cyan-100 text-cyan-800 border-cyan-300" },
  moderate: { label: "Moderate fit", classes: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  varies: { label: "Fit varies — verify ICP", classes: "bg-gray-100 text-gray-700 border-gray-300" },
};

export default function LinkedInStrategy({ industryId, industryName, monthlyAdSpend, linkedInSpend }: Props) {
  const [expanded, setExpanded] = useState(false);

  const strategy: IndustryStrategy =
    (industryId && (strategyData as Record<string, unknown>)[industryId] as IndustryStrategy) || generic;

  const viability = VIABILITY_BADGE[strategy.viability] ?? VIABILITY_BADGE.varies;

  // Spend warning — use LinkedIn-allocated spend if provided, otherwise total monthly
  const linkedInBudget = linkedInSpend !== undefined ? linkedInSpend : monthlyAdSpend;
  const isUnderfunded = linkedInBudget > 0 && linkedInBudget < 5000;

  return (
    <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header — always visible, click to expand */}
      <button
        onClick={() => setExpanded((s) => !s)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-2xl">💼</span>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-cogent-navy">
              LinkedIn Ads Strategy {industryName && <span className="font-normal text-cogent-neutral">— {industryName}</span>}
            </h2>
            <p className="text-xs text-cogent-neutral mt-0.5">
              How to set up, target, and run LinkedIn for this industry. Based on the Cogent Analytics LinkedIn Ads SOP v1.0.
            </p>
          </div>
          <span className={`hidden sm:inline-flex text-xs font-medium px-2.5 py-1 rounded border ${viability.classes}`}>
            {viability.label}
          </span>
        </div>
        <span className="ml-3 text-cogent-navy text-sm font-medium flex-shrink-0">
          {expanded ? "▼ Hide" : "▶ Show"}
        </span>
      </button>

      {expanded && (
        <div className="px-4 sm:px-5 pb-5 border-t border-gray-200 pt-4 space-y-5">
          {/* Top disclaimer banner */}
          <div className="p-3 bg-cogent-ivory border-l-4 border-cogent-sage rounded">
            <p className="text-xs text-cogent-navy">
              <strong>⚠ Disclaimer:</strong> {universal.disclaimer}
            </p>
          </div>

          {/* Industry viability summary */}
          <div>
            <h3 className="text-sm font-semibold text-cogent-navy mb-1">Industry Fit</h3>
            <div className="flex items-start gap-2 mb-2 sm:hidden">
              <span className={`text-xs font-medium px-2.5 py-1 rounded border ${viability.classes}`}>
                {viability.label}
              </span>
            </div>
            <p className="text-sm text-gray-700">{strategy.viabilityNote}</p>
          </div>

          {/* Budget warning */}
          {isUnderfunded && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-800">
                <strong>⚠ Budget warning:</strong> {linkedInSpend !== undefined ? "LinkedIn allocation" : "Monthly ad spend"} of {" "}
                <strong>${linkedInBudget.toLocaleString()}</strong> is below LinkedIn&apos;s recommended <strong>$5,000/mo minimum</strong>.
                LinkedIn&apos;s auction punishes underfunded accounts — expect inflated CPMs, frequency-cap issues, and slow learning.
                Consider raising LinkedIn allocation or using budget on Google/Meta first.
              </p>
            </div>
          )}

          {/* Target audience / personas */}
          <div>
            <h3 className="text-sm font-semibold text-cogent-navy mb-2">Who These Ads Target</h3>
            <p className="text-xs text-cogent-neutral mb-3">
              LinkedIn precision-targets professional identity. Build 3-5 audience segments per funnel stage. Disable Audience Expansion. Aim for 50K-300K members per segment.
            </p>
            <div className="space-y-2">
              {strategy.targetPersonas.map((persona, idx) => (
                <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <p className="text-sm font-semibold text-gray-800 mb-1">{persona.role}</p>
                  {persona.titles && persona.titles.length > 0 && (
                    <p className="text-xs text-gray-700">
                      <span className="font-medium">Job titles:</span> {persona.titles.join(", ")}
                    </p>
                  )}
                  {persona.seniority && (
                    <p className="text-xs text-gray-700">
                      <span className="font-medium">Seniority:</span> {persona.seniority.join(", ")}
                    </p>
                  )}
                  {persona.industries && (
                    <p className="text-xs text-gray-700">
                      <span className="font-medium">Industries:</span> {persona.industries.join(", ")}
                    </p>
                  )}
                  {persona.companySize && (
                    <p className="text-xs text-gray-700">
                      <span className="font-medium">Company size:</span> {persona.companySize.join(", ")} employees
                    </p>
                  )}
                  {persona.skills && (
                    <p className="text-xs text-gray-700">
                      <span className="font-medium">Skills:</span> {persona.skills.join(", ")}
                    </p>
                  )}
                  {persona.guidance && (
                    <p className="text-xs text-gray-700 mt-1 italic">{persona.guidance}</p>
                  )}
                  {persona.watchOut && (
                    <p className="text-xs text-amber-700 mt-1">⚠ {persona.watchOut}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Funnel strategy + copy angle + ABM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded">
              <h4 className="text-sm font-semibold text-cogent-navy mb-1">Funnel Strategy (TOFU → MOFU → BOFU)</h4>
              <p className="text-xs text-gray-700">{strategy.funnelStrategy}</p>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded">
              <h4 className="text-sm font-semibold text-cogent-navy mb-1">Copy Angle</h4>
              <p className="text-xs text-gray-700">{strategy.copyAngle}</p>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded">
              <h4 className="text-sm font-semibold text-cogent-navy mb-1">ABM Opportunity</h4>
              <p className="text-xs text-gray-700">{strategy.abmOpportunity}</p>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded">
              <h4 className="text-sm font-semibold text-cogent-navy mb-1">Audience Sizing Note</h4>
              <p className="text-xs text-gray-700">{strategy.audienceSizeNote}</p>
            </div>
          </div>

          {/* Recommended ad formats */}
          <div>
            <h3 className="text-sm font-semibold text-cogent-navy mb-2">Recommended Ad Formats</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {strategy.recommendedFormats.map((f, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-cogent-sage">•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-cogent-neutral mt-2 italic">
              💡 Document Ads are LinkedIn&apos;s most underused format — engagement runs 2-3x higher than Single Image. Default to Document Ads for thought-leadership campaigns.
            </p>
          </div>

          {/* Watch-outs */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded">
            <h4 className="text-sm font-semibold text-amber-900 mb-1">⚠ Watch-Outs for This Industry</h4>
            <p className="text-xs text-amber-800">{strategy.watchOuts}</p>
          </div>

          {/* Copy frameworks reference */}
          <div>
            <h3 className="text-sm font-semibold text-cogent-navy mb-2">Copy Frameworks (Rotate All Three)</h3>
            <div className="space-y-1.5">
              {universal.copyFrameworks.map((fw, idx) => (
                <div key={idx} className="text-sm">
                  <span className="font-semibold text-gray-800">{fw.name}:</span>{" "}
                  <span className="text-gray-700">{fw.bestFor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Creative rules */}
          <div>
            <h3 className="text-sm font-semibold text-cogent-navy mb-2">Creative Rules That Move Performance</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {universal.creativeRules.map((rule, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-cogent-sage">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* KPI benchmarks table */}
          <div>
            <h3 className="text-sm font-semibold text-cogent-navy mb-2">KPI Benchmarks (B2B, US/Canada, 2026)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-200">
                <thead>
                  <tr className="bg-cogent-navy text-white">
                    <th className="text-left p-2">Metric</th>
                    <th className="text-left p-2">Below Avg</th>
                    <th className="text-left p-2">Average</th>
                    <th className="text-left p-2">Strong</th>
                    <th className="text-left p-2">Best in Class</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(universal.kpiBenchmarks2026).map(([metric, vals]) => {
                    const labels: Record<string, string> = {
                      ctr: "CTR (Sponsored Content)",
                      cpc: "CPC",
                      cpm: "CPM",
                      leadGenFormCvr: "Lead Gen Form CVR",
                      cpl: "Cost per Lead",
                    };
                    return (
                      <tr key={metric} className="border-t border-gray-200">
                        <td className="p-2 font-medium text-gray-800">{labels[metric] ?? metric}</td>
                        <td className="p-2 text-red-700">{vals.belowAvg}</td>
                        <td className="p-2 text-gray-700">{vals.average}</td>
                        <td className="p-2 text-blue-700">{vals.strong}</td>
                        <td className="p-2 text-green-700 font-medium">{vals.bestInClass}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-cogent-neutral mt-2 italic">
              Benchmarks vary by vertical. Healthcare, financial services, and legal run 30-60% higher CPLs than tech. Use as a sanity check, not a contract — your real benchmark is your own historical performance.
            </p>
          </div>

          {/* Pre-launch checklist */}
          <details className="border border-gray-200 rounded-md">
            <summary className="cursor-pointer p-3 text-sm font-semibold text-cogent-navy hover:bg-gray-50">
              Pre-Launch Checklist
            </summary>
            <ul className="px-4 pb-3 text-sm text-gray-700 space-y-1">
              {universal.preLaunchChecklist.map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-cogent-sage">☐</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </details>

          {/* Common pitfalls */}
          <details className="border border-gray-200 rounded-md">
            <summary className="cursor-pointer p-3 text-sm font-semibold text-cogent-navy hover:bg-gray-50">
              Common Pitfalls & Fixes
            </summary>
            <div className="px-4 pb-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-700">
                    <th className="py-1 pr-3">Pitfall</th>
                    <th className="py-1">Fix</th>
                  </tr>
                </thead>
                <tbody>
                  {universal.commonPitfalls.map((p, idx) => (
                    <tr key={idx} className="border-t border-gray-200">
                      <td className="py-1.5 pr-3 text-gray-800">{p.pitfall}</td>
                      <td className="py-1.5 text-gray-700">{p.fix}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          {/* When LinkedIn is / isn't right */}
          <details className="border border-gray-200 rounded-md">
            <summary className="cursor-pointer p-3 text-sm font-semibold text-cogent-navy hover:bg-gray-50">
              When LinkedIn Is the Right Channel (and When It Isn&apos;t)
            </summary>
            <div className="px-4 pb-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-semibold text-green-800 mb-1">✓ Right Channel When:</h5>
                <ul className="text-xs text-gray-700 space-y-1">
                  {universal.whenToUse.map((item, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-green-600">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="text-sm font-semibold text-red-800 mb-1">✗ Wrong Channel When:</h5>
                <ul className="text-xs text-gray-700 space-y-1">
                  {universal.whenNotToUse.map((item, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-red-600">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="md:col-span-2 p-2 bg-cogent-ivory border-l-4 border-cogent-sage rounded mt-2">
                <p className="text-xs text-cogent-navy italic">
                  <strong>Strategic rule of thumb:</strong> {universal.ruleOfThumb}
                </p>
              </div>
            </div>
          </details>

          <p className="text-xs text-cogent-neutral italic pt-2 border-t border-gray-200">
            Source: Cogent Analytics LinkedIn Ads SOP v1.0 (April 2026). For internal use; client-facing language can be adapted from these notes but the strategic guidance applies as written.
          </p>
        </div>
      )}
    </section>
  );
}
