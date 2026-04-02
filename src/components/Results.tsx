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
        <h2 className="text-lg font-semibold text-cogent-navy mb-2">Results</h2>
        <p className="text-sm text-gray-500">
          Fill in the inputs above to see revenue estimates.
        </p>
      </section>
    );
  }

  const isConservative = roundingMode === "conservative";
  const jobs = isConservative ? result.totalJobsRounded : result.totalJobs;
  const revenue = isConservative ? result.totalRevenueRounded : result.totalRevenue;
  const gp = isConservative ? result.grossProfitRounded : result.grossProfit;

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-cogent-navy mb-4">Results</h2>

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
          <div className="text-xs text-cogent-neutral uppercase tracking-wide">Avg CPL</div>
          <div className="text-xl font-bold text-cogent-navy-dark mt-1">
            {formatCurrency(Math.round(result.weightedAvgCpl))}
          </div>
          <div className="text-xs text-gray-400">weighted</div>
        </div>
        <div className="rounded-lg p-4 border border-cogent-sage/30" style={{ background: "rgba(188, 194, 106, 0.1)" }}>
          <div className="text-xs text-cogent-navy uppercase tracking-wide">Leads/Mo</div>
          <div className="text-xl font-bold text-cogent-navy mt-1">
            {formatNumber(result.totalLeads)}
          </div>
        </div>
        <div className="rounded-lg p-4 border border-cogent-sage/30" style={{ background: "rgba(188, 194, 106, 0.15)" }}>
          <div className="text-xs text-cogent-navy uppercase tracking-wide">Jobs/Mo</div>
          <div className="text-xl font-bold text-cogent-navy mt-1">
            {isConservative ? jobs : formatNumber(jobs)}
          </div>
          <div className="text-xs text-gray-400">
            {result.closeRate}% close rate
          </div>
        </div>
        <div className="rounded-lg p-4 border border-cogent-sage/50" style={{ background: "rgba(188, 194, 106, 0.22)" }}>
          <div className="text-xs font-medium text-cogent-navy uppercase tracking-wide">Revenue/Mo</div>
          <div className="text-xl font-bold text-cogent-navy-dark mt-1">
            {formatCurrency(revenue)}
          </div>
          {gp !== null && (
            <div className="text-xs text-cogent-neutral mt-0.5">
              GP: {formatCurrency(gp)}
            </div>
          )}
        </div>
      </div>

      {/* Show both modes if exact */}
      {!isConservative && result.totalJobsRounded !== result.totalJobs && (
        <div className="mb-4 p-3 bg-cogent-ivory border border-gray-200 rounded-md text-sm text-cogent-neutral">
          Conservative estimate (whole jobs only): {result.totalJobsRounded} jobs, {formatCurrency(result.totalRevenueRounded)} revenue
        </div>
      )}
      {isConservative && (
        <div className="mb-4 p-3 bg-cogent-ivory border border-gray-200 rounded-md text-sm text-cogent-neutral">
          Exact estimate (fractional): {formatNumber(result.totalJobs)} jobs, {formatCurrency(result.totalRevenue)} revenue
        </div>
      )}

      {/* Per-service breakdown */}
      {result.serviceResults.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-cogent-navy mb-2">Per-Service Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-cogent-navy/10">
                  <th className="text-left py-2 px-2 text-cogent-navy font-medium">Service</th>
                  <th className="text-right py-2 px-2 text-cogent-navy font-medium">Spend</th>
                  <th className="text-right py-2 px-2 text-cogent-navy font-medium">CPL</th>
                  <th className="text-right py-2 px-2 text-cogent-navy font-medium">Leads</th>
                  <th className="text-right py-2 px-2 text-cogent-navy font-medium">Jobs</th>
                  <th className="text-right py-2 px-2 text-cogent-navy font-medium">Job Value</th>
                  <th className="text-right py-2 px-2 text-cogent-navy font-medium">Revenue</th>
                  <th className="text-center py-2 px-2 text-cogent-navy font-medium">Conf.</th>
                </tr>
              </thead>
              <tbody>
                {result.serviceResults.map((sr) => (
                  <tr key={sr.serviceName} className="border-b border-gray-100 hover:bg-cogent-ivory/50">
                    <td className="py-2 px-2 text-gray-900">{sr.serviceName}</td>
                    <td className="text-right py-2 px-2">{formatCurrency(sr.allocatedSpend)}</td>
                    <td className="text-right py-2 px-2">{formatCurrency(sr.cplUsed)}</td>
                    <td className="text-right py-2 px-2">{formatNumber(sr.leads)}</td>
                    <td className="text-right py-2 px-2">
                      {isConservative ? sr.jobsRounded : formatNumber(sr.jobs)}
                    </td>
                    <td className="text-right py-2 px-2">{formatCurrency(sr.jobValue)}</td>
                    <td className="text-right py-2 px-2 font-medium">
                      {formatCurrency(isConservative ? sr.revenueRounded : sr.revenue)}
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
          <p>leads = ad_spend / CPL = {formatCurrency(result.totalSpend)} / {formatCurrency(Math.round(result.weightedAvgCpl))} = {formatNumber(result.totalLeads)}</p>
          <p>jobs = leads &times; close_rate = {formatNumber(result.totalLeads)} &times; {result.closeRate}% = {formatNumber(result.totalJobs)}</p>
          <p>revenue = jobs &times; avg_job_value = {formatCurrency(revenue)}</p>
        </div>
      </div>
    </section>
  );
}
