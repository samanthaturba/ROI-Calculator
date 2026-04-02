"use client";

import type { CalculationResult, RoundingMode } from "../lib/types";
import { formatCurrency, formatNumber } from "../lib/calculations";

interface Props {
  result: CalculationResult | null;
  roundingMode: RoundingMode;
  targetArea?: string;
  marketTier?: string;
  marketMultiplier?: number;
}

export default function Results({ result, roundingMode, targetArea, marketTier, marketMultiplier }: Props) {
  if (!result) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-cogent-navy mb-2">Estimated Revenue Potential</h2>
        <p className="text-sm text-gray-500">
          Fill in the inputs above to see projected revenue potential.
        </p>
      </section>
    );
  }

  const isConservative = roundingMode === "conservative";
  const jobs = isConservative ? result.totalJobsRounded : result.totalJobs;
  const revenue = isConservative ? result.totalRevenueRounded : result.totalRevenue;
  const gp = isConservative ? result.grossProfitRounded : result.grossProfit;

  // Calculate ranges (conservative to optimistic)
  const conservativeRevenue = result.totalRevenueRounded;
  const optimisticRevenue = result.totalRevenue;
  const showRange = Math.abs(conservativeRevenue - optimisticRevenue) > 100;

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-cogent-navy mb-1">Estimated Revenue Potential</h2>
      <p className="text-xs text-cogent-neutral mb-4">
        Based on industry benchmarks and the inputs provided. Actual results will vary based on campaign optimization, lead quality, and close rate.
      </p>

      {/* Market adjustment note */}
      {marketMultiplier && marketMultiplier !== 1.0 && (
        <div className="mb-4 p-3 bg-cogent-ivory border border-gray-200 rounded-md text-sm text-cogent-neutral">
          CPL adjusted {marketMultiplier > 1 ? "+" : ""}{Math.round((marketMultiplier - 1) * 100)}% for {targetArea || (marketTier ? "selected market size" : "market")}
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

      {/* Summary cards - using "estimated" language throughout */}
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

      {/* Google Ads Learning Period */}
      <div className="mt-6 p-4 bg-cogent-navy/5 border border-cogent-navy/10 rounded-lg">
        <h3 className="text-sm font-semibold text-cogent-navy mb-2">Google Ads Learning &amp; Ramp-Up Period</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-cogent-neutral">
          <div className="p-3 bg-white rounded-md border border-gray-100">
            <p className="font-semibold text-cogent-navy mb-1">Weeks 1-2: Learning Phase</p>
            <p>Google&apos;s algorithm is gathering data. Expect higher CPL and fewer conversions. Do not make major changes during this period.</p>
          </div>
          <div className="p-3 bg-white rounded-md border border-gray-100">
            <p className="font-semibold text-cogent-navy mb-1">Weeks 3-6: Optimization</p>
            <p>Data builds, CPL stabilizes. Campaign adjustments begin. Results start trending toward benchmarks shown above.</p>
          </div>
          <div className="p-3 bg-white rounded-md border border-gray-100">
            <p className="font-semibold text-cogent-navy mb-1">Months 2-3+: Mature Performance</p>
            <p>Campaigns are optimized and performing at or near projected benchmarks. Continuous optimization drives improvement.</p>
          </div>
        </div>
        <p className="text-xs text-cogent-neutral mt-3 opacity-80">
          Most Google Ads campaigns require 60-90 days to reach full optimization. The estimates above represent mature campaign performance, not Day 1 results.
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
            <span><strong>Review reputation</strong> — businesses with strong Google reviews see higher click and conversion rates</span>
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
          of leads, jobs, or revenue. These figures are intended to illustrate the potential return on investment from Google Ads
          and to help set realistic expectations for campaign performance once fully optimized (typically 60-90 days).
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
        </div>
      </div>
    </section>
  );
}
