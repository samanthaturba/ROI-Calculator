"use client";

import { useState } from "react";
import type { CalculationResult, RoundingMode, AdPlatform } from "../lib/types";
import { formatCurrency, formatNumber } from "../lib/calculations";

interface Props {
  results: Record<AdPlatform, CalculationResult | null>;
  selectedPlatforms: AdPlatform[];
  platformAllocations: Record<AdPlatform, number>;
  roundingMode: RoundingMode;
  targetArea?: string;
  marketTier?: string;
  marketMultiplier?: number;
  monthlyAdSpend?: number;
}

const PLATFORM_NAMES: Record<AdPlatform, string> = {
  google: "Google Ads",
  meta: "Meta Ads",
  linkedin: "LinkedIn Ads",
  lsa: "Google Local Services Ads",
};

const PLATFORM_ICONS: Record<AdPlatform, string> = {
  google: "\uD83D\uDD0D",
  meta: "\uD83D\uDCF1",
  linkedin: "\uD83D\uDCBC",
  lsa: "\uD83D\uDCCD",
};

function MetricTooltip({ label, explanation }: { label: string; explanation: string }) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="cursor-help border-b border-dotted border-gray-400">{label}</span>
      <span className="ml-1 text-gray-400 cursor-help text-[10px]">{"\u24D8"}</span>
      {show && (
        <span className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-cogent-navy text-white text-xs rounded-md shadow-lg">
          {explanation}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-cogent-navy" />
        </span>
      )}
    </span>
  );
}

// Single-platform result view (unchanged from original)
function SinglePlatformResults({
  result,
  roundingMode,
  targetArea,
  marketMultiplier,
  platform,
}: {
  result: CalculationResult;
  roundingMode: RoundingMode;
  targetArea?: string;
  marketTier?: string;
  marketMultiplier?: number;
  platform: AdPlatform;
}) {
  const platformName = PLATFORM_NAMES[platform];
  const isConservative = roundingMode === "conservative";
  const jobs = isConservative ? result.totalJobsRounded : result.totalJobs;
  const revenue = isConservative ? result.totalRevenueRounded : result.totalRevenue;
  const gp = isConservative ? result.grossProfitRounded : result.grossProfit;

  const conservativeRevenue = result.totalRevenueRounded;
  const optimisticRevenue = result.totalRevenue;
  const showRange = Math.abs(conservativeRevenue - optimisticRevenue) > 100;

  const avgCpc = result.weightedAvgCpl * 0.15;
  const cpcMultiplier = platform === "google" ? 1.0 : platform === "meta" ? 0.6 : platform === "linkedin" ? 2.5 : 0;
  const estimatedCpc = platform === "lsa" ? 0 : avgCpc * cpcMultiplier;

  const roas = result.totalSpend > 0 ? revenue / result.totalSpend : 0;

  return (
    <>
      <h2 className="text-lg font-semibold text-cogent-navy mb-1">
        Estimated Revenue Potential — {platformName}
      </h2>
      <p className="text-xs text-cogent-neutral mb-4">
        Based on {platformName} industry benchmarks and the inputs provided. Actual results will vary based on campaign optimization, lead quality, and close rate.
      </p>

      {/* Market adjustment note */}
      {marketMultiplier && marketMultiplier !== 1.0 && (
        <div className="mb-4 p-3 bg-cogent-ivory border border-gray-200 rounded-md text-sm text-cogent-neutral">
          CPL adjusted {marketMultiplier > 1 ? "+" : ""}{Math.round((marketMultiplier - 1) * 100)}% for {targetArea || "selected market size"}
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm font-medium text-amber-800 mb-1">Warnings:</p>
          <ul className="text-sm text-amber-700 list-disc list-inside">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-cogent-ivory rounded-lg p-4 border border-gray-100">
          <div className="text-xs text-cogent-neutral uppercase tracking-wide">Ad Spend</div>
          <div className="text-xl font-bold text-cogent-navy-dark mt-1">
            {formatCurrency(result.totalSpend)}
          </div>
          <div className="text-xs text-gray-400">/month</div>
        </div>
        <div className="bg-cogent-ivory rounded-lg p-4 border border-gray-100">
          <div className="text-xs text-cogent-neutral uppercase tracking-wide">Est. Avg CPL</div>
          <div className="text-xl font-bold text-cogent-navy-dark mt-1">
            {formatCurrency(Math.round(result.weightedAvgCpl))}
          </div>
          <div className="text-xs text-gray-400">weighted avg</div>
        </div>
        <div className="rounded-lg p-4 border border-cogent-sage/30" style={{ background: "rgba(188, 194, 106, 0.1)" }}>
          <div className="text-xs text-cogent-navy uppercase tracking-wide">Est. Leads/Mo</div>
          <div className="text-xl font-bold text-cogent-navy mt-1">
            ~{formatNumber(result.totalLeads)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">form fills &amp; calls</div>
        </div>
        <div className="rounded-lg p-4 border border-cogent-sage/30" style={{ background: "rgba(188, 194, 106, 0.15)" }}>
          <div className="text-xs text-cogent-navy uppercase tracking-wide">Est. Jobs/Mo</div>
          <div className="text-xl font-bold text-cogent-navy mt-1">
            ~{isConservative ? jobs : formatNumber(jobs)}
          </div>
          <div className="text-xs text-gray-400">
            at {result.closeRate}% close rate
          </div>
        </div>
        <div className="rounded-lg p-4 border border-cogent-sage/50" style={{ background: "rgba(188, 194, 106, 0.22)" }}>
          <div className="text-xs font-medium text-cogent-navy uppercase tracking-wide">Est. Revenue/Mo</div>
          <div className="text-xl font-bold text-cogent-navy-dark mt-1">
            ~{formatCurrency(revenue)}
          </div>
          {gp !== null && (
            <div className="text-xs text-cogent-neutral mt-0.5">
              Est. GP: ~{formatCurrency(gp)}
            </div>
          )}
        </div>
      </div>

      {/* What these numbers mean */}
      <div className="mb-6 p-4 bg-cogent-ivory/60 border border-gray-200 rounded-lg">
        <h3 className="text-sm font-semibold text-cogent-navy mb-2">What These Numbers Mean</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-cogent-neutral">
          <div>
            <p className="font-semibold text-cogent-navy-dark mb-0.5">Est. Leads/Mo (~{formatNumber(result.totalLeads)})</p>
            <p>This is the estimated number of <strong>form submissions, phone calls, and direct inquiries</strong> your ads are projected to generate each month. These are people actively reaching out to your business after seeing your ad.</p>
          </div>
          <div>
            <p className="font-semibold text-cogent-navy-dark mb-0.5">Est. Jobs/Mo (~{isConservative ? jobs : formatNumber(jobs)})</p>
            <p>Based on your <strong>{result.closeRate}% close rate</strong>, this is how many of those leads are expected to convert into paying jobs. This depends on how quickly you respond, your sales process, and how effectively leads are followed up on.</p>
          </div>
          <div>
            <p className="font-semibold text-cogent-navy-dark mb-0.5">Est. Revenue/Mo (~{formatCurrency(revenue)})</p>
            <p>Estimated monthly revenue based on your average job value multiplied by estimated jobs. Actual revenue varies with job mix, upsells, and seasonal factors.</p>
          </div>
        </div>
      </div>

      {/* Advanced Metrics Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          {platform === "lsa" ? (
            <>
              <div className="text-xs text-cogent-neutral uppercase tracking-wide mb-1">
                <MetricTooltip
                  label="CPC"
                  explanation="Local Services Ads charge per lead, not per click. There is no CPC — Google charges a flat fee for each verified lead."
                />
              </div>
              <div className="text-lg font-bold text-cogent-navy-dark">
                N/A
              </div>
              <div className="text-xs text-gray-400">
                LSA charges per lead, not per click
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-cogent-neutral uppercase tracking-wide mb-1">
                <MetricTooltip
                  label="Est. CPC"
                  explanation="Cost Per Click — the estimated average cost each time someone clicks your ad. Varies by keyword competition, ad quality, and platform."
                />
              </div>
              <div className="text-lg font-bold text-cogent-navy-dark">
                ${estimatedCpc.toFixed(2)}
              </div>
              <div className="text-xs text-gray-400">
                {platform === "google" ? "search click avg" : platform === "meta" ? "social click avg" : "professional click avg"}
              </div>
            </>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-xs text-cogent-neutral uppercase tracking-wide mb-1">
            <MetricTooltip
              label="Est. ROAS"
              explanation="Return on Ad Spend — for every $1 spent on ads, how many dollars of revenue are estimated. A ROAS of 5x means $5 revenue per $1 ad spend. Higher is better."
            />
          </div>
          <div className="text-lg font-bold text-cogent-navy-dark">
            {roas > 0 ? `${roas.toFixed(1)}x` : "\u2014"}
          </div>
          <div className="text-xs text-gray-400">revenue per $1 ad spend</div>
        </div>
      </div>

      {/* Revenue range */}
      {showRange && (
        <div className="mb-4 p-3 bg-cogent-ivory border border-gray-200 rounded-md text-sm">
          <p className="font-medium text-cogent-navy mb-1">Estimated Revenue Range:</p>
          <div className="flex gap-6 text-cogent-neutral">
            <span>Conservative: <span className="font-semibold">{formatCurrency(conservativeRevenue)}</span>/mo</span>
            <span>Projected: <span className="font-semibold">{formatCurrency(optimisticRevenue)}</span>/mo</span>
          </div>
          <p className="text-xs text-cogent-neutral mt-1 opacity-75">
            Conservative rounds down to whole jobs only. Projected uses exact math. Actual results will fall within or near this range as campaigns mature.
          </p>
        </div>
      )}

      {/* Per-service breakdown */}
      {result.serviceResults.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-cogent-navy mb-2">Per-Service Breakdown (Estimated)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-cogent-navy/10">
                  <th className="text-left py-2 px-2 text-cogent-navy font-medium">Service</th>
                  <th className="text-right py-2 px-2 text-cogent-navy font-medium">Spend</th>
                  <th className="text-right py-2 px-2 text-cogent-navy font-medium">Est. CPL</th>
                  <th className="text-right py-2 px-2 text-cogent-navy font-medium">Est. Leads</th>
                  <th className="text-right py-2 px-2 text-cogent-navy font-medium">Est. Jobs</th>
                  <th className="text-right py-2 px-2 text-cogent-navy font-medium">Job Value</th>
                  <th className="text-right py-2 px-2 text-cogent-navy font-medium">Est. Revenue</th>
                  <th className="text-center py-2 px-2 text-cogent-navy font-medium">Conf.</th>
                </tr>
              </thead>
              <tbody>
                {result.serviceResults.map((sr) => (
                  <tr key={sr.serviceName} className="border-b border-gray-100 hover:bg-cogent-ivory/50">
                    <td className="py-2 px-2 text-gray-900">{sr.serviceName}</td>
                    <td className="text-right py-2 px-2">{formatCurrency(sr.allocatedSpend)}</td>
                    <td className="text-right py-2 px-2">{formatCurrency(sr.cplUsed)}</td>
                    <td className="text-right py-2 px-2">~{formatNumber(sr.leads)}</td>
                    <td className="text-right py-2 px-2">
                      ~{isConservative ? sr.jobsRounded : formatNumber(sr.jobs)}
                    </td>
                    <td className="text-right py-2 px-2">{formatCurrency(sr.jobValue)}</td>
                    <td className="text-right py-2 px-2 font-medium">
                      ~{formatCurrency(isConservative ? sr.revenueRounded : sr.revenue)}
                    </td>
                    <td className="text-center py-2 px-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        sr.confidence === "high"
                          ? "bg-green-100 text-green-700"
                          : sr.confidence === "medium"
                          ? "bg-yellow-100 text-yellow-700"
                          : sr.confidence === "custom"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-orange-100 text-orange-700"
                      }`}>
                        {sr.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Learning & Ramp-Up Period */}
      <div className="mt-6 p-4 bg-cogent-navy/5 border border-cogent-navy/10 rounded-lg">
        <h3 className="text-sm font-semibold text-cogent-navy mb-2">
          {platformName} Learning &amp; Ramp-Up Period
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-cogent-neutral">
          <div className="p-3 bg-white rounded-md border border-gray-100">
            <p className="font-semibold text-cogent-navy mb-1">Weeks 1-2: Learning Phase</p>
            <p>
              {platform === "google"
                ? "Google's algorithm is gathering data. Expect higher CPL and fewer conversions. Do not make major changes during this period."
                : platform === "meta"
                ? "Meta's algorithm is learning your audience. Ad delivery will fluctuate. Avoid editing ads or audiences during this phase."
                : platform === "lsa"
                ? "Your LSA profile is building visibility. Lead volume starts low as Google verifies your business and profile completeness."
                : "LinkedIn's audience targeting is calibrating. Expect higher CPL initially as the algorithm identifies your ideal prospects."}
            </p>
          </div>
          <div className="p-3 bg-white rounded-md border border-gray-100">
            <p className="font-semibold text-cogent-navy mb-1">Weeks 3-6: Optimization</p>
            <p>
              {platform === "google"
                ? "Data builds, CPL stabilizes. Campaign adjustments begin. Results start trending toward benchmarks shown above."
                : platform === "meta"
                ? "Audience data matures. Retargeting audiences build. CPL begins to stabilize as winning ad creatives emerge."
                : platform === "lsa"
                ? "Lead volume increases as reviews accumulate and your profile ranks higher. Respond quickly to leads to maintain your ranking."
                : "Sponsored Content and InMail performance stabilizes. A/B test messaging and audience segments for better CPL."}
            </p>
          </div>
          <div className="p-3 bg-white rounded-md border border-gray-100">
            <p className="font-semibold text-cogent-navy mb-1">Months 2-3+: Mature Performance</p>
            <p>
              {platform === "google"
                ? "Campaigns are optimized and performing at or near projected benchmarks. Continuous optimization drives improvement."
                : platform === "meta"
                ? "Lookalike audiences and retargeting are fully built. Campaigns running at steady-state performance with consistent lead flow."
                : platform === "lsa"
                ? "Established profile with consistent lead flow. Maintain high review ratings and fast response times to keep top placement."
                : "Pipeline of B2B leads is established. Account-based targeting refined. Ongoing optimization for lower CPL and higher-quality leads."}
            </p>
          </div>
        </div>
        <p className="text-xs text-cogent-neutral mt-3 opacity-80">
          Most {platformName} campaigns require 60-90 days to reach full optimization. The estimates above represent mature campaign performance, not Day 1 results.
        </p>
      </div>

      {/* Results Depend On */}
      <div className="mt-4 p-4 bg-amber-50/50 border border-amber-200/50 rounded-lg">
        <h3 className="text-sm font-semibold text-amber-900 mb-2">Important: Results Depend On Multiple Factors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-amber-800">
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Lead follow-up speed</strong> — responding within 5 minutes vs. 24 hours dramatically impacts close rate</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Phone answer rate</strong> — missed calls = missed revenue. Every unanswered call is a lost lead</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Landing page quality</strong> — conversion rate depends on clear CTAs, trust signals, and mobile experience</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Sales process</strong> — how quickly and effectively leads are quoted and followed up on</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Seasonal demand</strong> — some industries see 2-3x swings between peak and off-season</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Local competition</strong> — more competitors bidding = higher CPL in your area</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Review reputation</strong> — businesses with strong {platform === "google" || platform === "lsa" ? "Google" : "online"} reviews see higher click and conversion rates{platform === "lsa" ? ". Reviews directly impact LSA ranking" : ""}</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Budget consistency</strong> — pausing and restarting campaigns resets the learning period</span>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 p-4 border-2 border-cogent-navy/20 rounded-lg bg-white">
        <h3 className="text-sm font-semibold text-cogent-navy mb-2">Disclaimer</h3>
        <p className="text-xs text-cogent-neutral leading-relaxed">
          The projections shown above are <strong>estimates based on published industry benchmarks</strong> and the inputs provided.
          They represent the <strong>potential opportunity</strong>, not a guarantee of results. Actual lead volume, cost per lead,
          close rate, and revenue will vary based on campaign setup, market conditions, competition, seasonality, and the
          client&apos;s ability to effectively respond to and close leads. Cogent Analytics does not guarantee any specific number
          of leads, jobs, or revenue. These figures are intended to illustrate the potential return on investment from {platformName}
          {" "}and to help set realistic expectations for campaign performance once fully optimized (typically 60-90 days).
        </p>
      </div>

      {/* Data quality notes */}
      {(result.hasCustomEstimates || result.hasLowConfidence) && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm">
          {result.hasCustomEstimates && (
            <p className="text-amber-700">
              Some values are custom estimates based on user-entered values.
            </p>
          )}
          {result.hasLowConfidence && (
            <p className="text-amber-700">
              Some benchmarks are low-confidence seed data — replace with researched benchmarks before client use.
            </p>
          )}
        </div>
      )}

      {/* Formula transparency */}
      <div className="mt-4 p-3 bg-cogent-ivory border border-gray-200 rounded-md">
        <p className="text-xs font-medium text-cogent-navy mb-1">How this was calculated:</p>
        <div className="text-xs text-cogent-neutral font-mono space-y-0.5">
          <p>est. leads = ad_spend / CPL = {formatCurrency(result.totalSpend)} / {formatCurrency(Math.round(result.weightedAvgCpl))} = ~{formatNumber(result.totalLeads)}</p>
          <p>est. jobs = leads &times; close_rate = ~{formatNumber(result.totalLeads)} &times; {result.closeRate}% = ~{formatNumber(result.totalJobs)}</p>
          <p>est. revenue = jobs &times; avg_job_value = ~{formatCurrency(revenue)}</p>
          {roas > 0 && <p>est. ROAS = revenue / ad_spend = ~{formatCurrency(revenue)} / {formatCurrency(result.totalSpend)} = ~{roas.toFixed(1)}x</p>}
        </div>
      </div>
    </>
  );
}

export default function Results({
  results,
  selectedPlatforms,
  platformAllocations,
  roundingMode,
  targetArea,
  marketTier,
  marketMultiplier,
  monthlyAdSpend,
}: Props) {
  // Check if any platform has results
  const hasAnyResults = selectedPlatforms.some((p) => results[p] !== null);

  if (!hasAnyResults) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-cogent-navy mb-2">Estimated Revenue Potential</h2>
        <p className="text-sm text-gray-500">
          Fill in the inputs above to see projected revenue potential.
        </p>
      </section>
    );
  }

  // Single platform selected — show exactly as before
  if (selectedPlatforms.length === 1) {
    const platform = selectedPlatforms[0];
    const result = results[platform];
    if (!result) return null;

    return (
      <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <SinglePlatformResults
          result={result}
          roundingMode={roundingMode}
          targetArea={targetArea}
          marketTier={marketTier}
          marketMultiplier={marketMultiplier}
          platform={platform}
        />
      </section>
    );
  }

  // Multi-platform view
  const activeResults = selectedPlatforms
    .map((p) => ({ platform: p, result: results[p] }))
    .filter((r): r is { platform: AdPlatform; result: CalculationResult } => r.result !== null);

  if (activeResults.length === 0) return null;

  // Calculate combined totals
  const isConservative = roundingMode === "conservative";
  const combinedSpend = activeResults.reduce((s, r) => s + r.result.totalSpend, 0);
  const combinedLeads = activeResults.reduce((s, r) => s + r.result.totalLeads, 0);
  const combinedJobs = isConservative
    ? activeResults.reduce((s, r) => s + r.result.totalJobsRounded, 0)
    : activeResults.reduce((s, r) => s + r.result.totalJobs, 0);
  const combinedRevenue = isConservative
    ? activeResults.reduce((s, r) => s + r.result.totalRevenueRounded, 0)
    : activeResults.reduce((s, r) => s + r.result.totalRevenue, 0);
  const combinedGP = activeResults.every((r) => (isConservative ? r.result.grossProfitRounded : r.result.grossProfit) !== null)
    ? activeResults.reduce((s, r) => s + (isConservative ? r.result.grossProfitRounded! : r.result.grossProfit!), 0)
    : null;
  const combinedRoas = combinedSpend > 0 ? combinedRevenue / combinedSpend : 0;
  const combinedCloseRate = activeResults[0].result.closeRate;

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-cogent-navy mb-1">
        Estimated Revenue Potential — Combined ({selectedPlatforms.length} Platforms)
      </h2>
      <p className="text-xs text-cogent-neutral mb-4">
        Combined projections across {activeResults.map((r) => PLATFORM_NAMES[r.platform]).join(", ")}. Actual results will vary by platform.
      </p>

      {/* Market adjustment note */}
      {marketMultiplier && marketMultiplier !== 1.0 && (
        <div className="mb-4 p-3 bg-cogent-ivory border border-gray-200 rounded-md text-sm text-cogent-neutral">
          CPL adjusted {marketMultiplier > 1 ? "+" : ""}{Math.round((marketMultiplier - 1) * 100)}% for {targetArea || "selected market size"}
        </div>
      )}

      {/* Combined Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-cogent-ivory rounded-lg p-4 border border-gray-100">
          <div className="text-xs text-cogent-neutral uppercase tracking-wide">Total Ad Spend</div>
          <div className="text-xl font-bold text-cogent-navy-dark mt-1">
            {formatCurrency(combinedSpend)}
          </div>
          <div className="text-xs text-gray-400">/month combined</div>
        </div>
        <div className="bg-cogent-ivory rounded-lg p-4 border border-gray-100">
          <div className="text-xs text-cogent-neutral uppercase tracking-wide">Avg CPL</div>
          <div className="text-xl font-bold text-cogent-navy-dark mt-1">
            {formatCurrency(Math.round(combinedLeads > 0 ? combinedSpend / combinedLeads : 0))}
          </div>
          <div className="text-xs text-gray-400">blended avg</div>
        </div>
        <div className="rounded-lg p-4 border border-cogent-sage/30" style={{ background: "rgba(188, 194, 106, 0.1)" }}>
          <div className="text-xs text-cogent-navy uppercase tracking-wide">Est. Leads/Mo</div>
          <div className="text-xl font-bold text-cogent-navy mt-1">
            ~{formatNumber(combinedLeads)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">all platforms</div>
        </div>
        <div className="rounded-lg p-4 border border-cogent-sage/30" style={{ background: "rgba(188, 194, 106, 0.15)" }}>
          <div className="text-xs text-cogent-navy uppercase tracking-wide">Est. Jobs/Mo</div>
          <div className="text-xl font-bold text-cogent-navy mt-1">
            ~{isConservative ? combinedJobs : formatNumber(combinedJobs)}
          </div>
          <div className="text-xs text-gray-400">
            at {combinedCloseRate}% close rate
          </div>
        </div>
        <div className="rounded-lg p-4 border border-cogent-sage/50" style={{ background: "rgba(188, 194, 106, 0.22)" }}>
          <div className="text-xs font-medium text-cogent-navy uppercase tracking-wide">Est. Revenue/Mo</div>
          <div className="text-xl font-bold text-cogent-navy-dark mt-1">
            ~{formatCurrency(combinedRevenue)}
          </div>
          {combinedGP !== null && (
            <div className="text-xs text-cogent-neutral mt-0.5">
              Est. GP: ~{formatCurrency(combinedGP)}
            </div>
          )}
        </div>
      </div>

      {/* Combined ROAS */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-xs text-cogent-neutral uppercase tracking-wide mb-1">
            <MetricTooltip
              label="Combined ROAS"
              explanation="Return on Ad Spend across all selected platforms combined."
            />
          </div>
          <div className="text-lg font-bold text-cogent-navy-dark">
            {combinedRoas > 0 ? `${combinedRoas.toFixed(1)}x` : "\u2014"}
          </div>
          <div className="text-xs text-gray-400">revenue per $1 ad spend</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-xs text-cogent-neutral uppercase tracking-wide mb-1">Platforms</div>
          <div className="text-sm font-medium text-cogent-navy-dark mt-1">
            {activeResults.map((r) => (
              <span key={r.platform} className="inline-flex items-center gap-1 mr-3">
                {PLATFORM_ICONS[r.platform]} {PLATFORM_NAMES[r.platform]} ({platformAllocations[r.platform]}%)
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Per-platform breakdown sections */}
      <div className="space-y-6 mt-6">
        {activeResults.map(({ platform, result: platResult }) => {
          const platRevenue = isConservative ? platResult.totalRevenueRounded : platResult.totalRevenue;
          const platJobs = isConservative ? platResult.totalJobsRounded : platResult.totalJobs;
          const platRoas = platResult.totalSpend > 0 ? platRevenue / platResult.totalSpend : 0;

          return (
            <div key={platform} className="border border-gray-200 rounded-lg p-4 bg-cogent-ivory/20">
              <h3 className="text-sm font-semibold text-cogent-navy mb-3 flex items-center gap-2">
                <span className="text-lg">{PLATFORM_ICONS[platform]}</span>
                {PLATFORM_NAMES[platform]} — {formatCurrency(platResult.totalSpend)}/month ({platformAllocations[platform]}%)
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                <div className="text-center p-2 bg-white rounded border border-gray-100">
                  <div className="text-[10px] text-cogent-neutral uppercase">Spend</div>
                  <div className="text-sm font-bold text-cogent-navy-dark">{formatCurrency(platResult.totalSpend)}</div>
                </div>
                <div className="text-center p-2 bg-white rounded border border-gray-100">
                  <div className="text-[10px] text-cogent-neutral uppercase">Avg CPL</div>
                  <div className="text-sm font-bold text-cogent-navy-dark">{formatCurrency(Math.round(platResult.weightedAvgCpl))}</div>
                </div>
                <div className="text-center p-2 bg-white rounded border border-gray-100">
                  <div className="text-[10px] text-cogent-neutral uppercase">Leads/Mo</div>
                  <div className="text-sm font-bold text-cogent-navy">~{formatNumber(platResult.totalLeads)}</div>
                </div>
                <div className="text-center p-2 bg-white rounded border border-gray-100">
                  <div className="text-[10px] text-cogent-neutral uppercase">Jobs/Mo</div>
                  <div className="text-sm font-bold text-cogent-navy">~{isConservative ? platJobs : formatNumber(platJobs)}</div>
                </div>
                <div className="text-center p-2 bg-white rounded border border-cogent-sage/30" style={{ background: "rgba(188, 194, 106, 0.12)" }}>
                  <div className="text-[10px] text-cogent-navy uppercase">Revenue/Mo</div>
                  <div className="text-sm font-bold text-cogent-navy-dark">~{formatCurrency(platRevenue)}</div>
                  {platRoas > 0 && <div className="text-[10px] text-gray-400">{platRoas.toFixed(1)}x ROAS</div>}
                </div>
              </div>

              {/* Per-service table for this platform */}
              {platResult.serviceResults.length > 1 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-1.5 px-2 text-cogent-navy font-medium">Service</th>
                        <th className="text-right py-1.5 px-2 text-cogent-navy font-medium">Spend</th>
                        <th className="text-right py-1.5 px-2 text-cogent-navy font-medium">CPL</th>
                        <th className="text-right py-1.5 px-2 text-cogent-navy font-medium">Leads</th>
                        <th className="text-right py-1.5 px-2 text-cogent-navy font-medium">Jobs</th>
                        <th className="text-right py-1.5 px-2 text-cogent-navy font-medium">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {platResult.serviceResults.map((sr) => (
                        <tr key={sr.serviceName} className="border-b border-gray-50">
                          <td className="py-1.5 px-2 text-gray-900">{sr.serviceName}</td>
                          <td className="text-right py-1.5 px-2">{formatCurrency(sr.allocatedSpend)}</td>
                          <td className="text-right py-1.5 px-2">{formatCurrency(sr.cplUsed)}</td>
                          <td className="text-right py-1.5 px-2">~{formatNumber(sr.leads)}</td>
                          <td className="text-right py-1.5 px-2">~{isConservative ? sr.jobsRounded : formatNumber(sr.jobs)}</td>
                          <td className="text-right py-1.5 px-2 font-medium">~{formatCurrency(isConservative ? sr.revenueRounded : sr.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Learning period — show for primary platform only */}
      <div className="mt-6 p-4 bg-cogent-navy/5 border border-cogent-navy/10 rounded-lg">
        <h3 className="text-sm font-semibold text-cogent-navy mb-2">
          Learning &amp; Ramp-Up Period
        </h3>
        <p className="text-xs text-cogent-neutral mb-3">
          Most ad platform campaigns require 60-90 days to reach full optimization. The estimates above represent mature campaign performance, not Day 1 results.
        </p>
        <div className="text-xs text-cogent-neutral space-y-1">
          {activeResults.map(({ platform: plat }) => (
            <p key={plat}>
              <span className="font-medium">{PLATFORM_ICONS[plat]} {PLATFORM_NAMES[plat]}:</span>{" "}
              {plat === "google" ? "Weeks 1-2 learning, weeks 3-6 optimization, months 2-3+ mature performance."
                : plat === "meta" ? "Weeks 1-2 audience learning, weeks 3-6 retargeting builds, months 2-3+ steady-state."
                : plat === "lsa" ? "Weeks 1-2 building visibility, weeks 3-6 review accumulation, months 2-3+ established."
                : "Weeks 1-2 audience calibration, weeks 3-6 A/B testing, months 2-3+ pipeline established."}
            </p>
          ))}
        </div>
      </div>

      {/* Results Depend On */}
      <div className="mt-4 p-4 bg-amber-50/50 border border-amber-200/50 rounded-lg">
        <h3 className="text-sm font-semibold text-amber-900 mb-2">Important: Results Depend On Multiple Factors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-amber-800">
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Lead follow-up speed</strong> — responding within 5 minutes vs. 24 hours dramatically impacts close rate</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Phone answer rate</strong> — missed calls = missed revenue. Every unanswered call is a lost lead</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Landing page quality</strong> — conversion rate depends on clear CTAs, trust signals, and mobile experience</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Sales process</strong> — how quickly and effectively leads are quoted and followed up on</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Seasonal demand</strong> — some industries see 2-3x swings between peak and off-season</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Local competition</strong> — more competitors bidding = higher CPL in your area</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Review reputation</strong> — businesses with strong reviews see higher click and conversion rates</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Budget consistency</strong> — pausing and restarting campaigns resets the learning period</span>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 p-4 border-2 border-cogent-navy/20 rounded-lg bg-white">
        <h3 className="text-sm font-semibold text-cogent-navy mb-2">Disclaimer</h3>
        <p className="text-xs text-cogent-neutral leading-relaxed">
          The projections shown above are <strong>estimates based on published industry benchmarks</strong> and the inputs provided.
          They represent the <strong>potential opportunity</strong>, not a guarantee of results. Actual lead volume, cost per lead,
          close rate, and revenue will vary based on campaign setup, market conditions, competition, seasonality, and the
          client&apos;s ability to effectively respond to and close leads. Cogent Analytics does not guarantee any specific number
          of leads, jobs, or revenue. These figures are intended to illustrate the potential return on investment from advertising
          and to help set realistic expectations for campaign performance once fully optimized (typically 60-90 days).
        </p>
      </div>
    </section>
  );
}
