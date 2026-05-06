"use client";

import type { BudgetInputs, RoundingMode, AdPlatform } from "../lib/types";
import { formatCurrency } from "../lib/calculations";

interface Props {
  value: BudgetInputs;
  onChange: (value: BudgetInputs) => void;
  recommendedMin: number | null;
  recommendedTarget: number | null;
  spendWarning: string | null;
  industryCloseRate?: { closeRate: number; source: string } | null;
  closeRateManuallySet?: boolean;
  onCloseRateManualChange?: () => void;
  onResetCloseRate?: () => void;
  selectedPlatforms?: AdPlatform[];
  platformAllocations?: Record<AdPlatform, number>;
  perPlatformRecommendedSpend?: Partial<Record<AdPlatform, { min: number | null; target: number | null }>>;
  /** When Max ROI mode is active in Service Selection, the budget is driven by service recs */
  budgetMode?: "strict" | "maxroi";
  maxRoiAdSpend?: number;
}

const PLATFORM_LABELS: Record<AdPlatform, string> = {
  google: "Google Ads",
  meta: "Meta Ads",
  linkedin: "LinkedIn Ads",
  lsa: "Google LSA",
};

const PLATFORM_ICONS: Record<AdPlatform, string> = {
  google: "🔍",
  meta: "📱",
  linkedin: "💼",
  lsa: "📍",
};

export default function BudgetSalesInputs({
  value,
  onChange,
  recommendedMin,
  recommendedTarget,
  spendWarning,
  industryCloseRate,
  closeRateManuallySet,
  onCloseRateManualChange,
  onResetCloseRate,
  selectedPlatforms,
  platformAllocations,
  perPlatformRecommendedSpend,
  budgetMode = "strict",
  maxRoiAdSpend = 0,
}: Props) {
  const isMultiPlatform = selectedPlatforms && selectedPlatforms.length > 1 && platformAllocations;
  const isMaxRoi = budgetMode === "maxroi";

  // The budget that will actually flow into calculations
  const effectiveBudget = isMaxRoi ? maxRoiAdSpend : value.monthlyAdSpend;

  // Simple example: "at this spend + close rate, here's what you'd expect"
  const avgCpl = recommendedTarget
    ? (recommendedTarget / Math.ceil(6 / Math.max(value.closeRate / 100, 0.01)))
    : null;
  const exampleLeads = effectiveBudget > 0 && avgCpl ? Math.round(effectiveBudget / avgCpl) : null;
  const exampleJobs = exampleLeads ? Math.round(exampleLeads * (value.closeRate / 100)) : null;

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-cogent-navy mb-1">Budget & Sales Inputs</h2>
      <p className="text-sm text-gray-500 mb-4">
        These numbers drive the ROI projection below. The more accurately you fill them in, the more accurate the output.
      </p>

      {/* ── Max ROI mode banner ─────────────────────────────────────────────── */}
      {isMaxRoi && (
        <div className="mb-5 p-4 bg-cogent-sage/10 border border-cogent-sage/40 rounded-lg">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-cogent-navy mb-0.5">
                Max ROI Mode — Budget is set by your service selections
              </p>
              <p className="text-xs text-cogent-neutral">
                Each service is funded with its own recommended monthly budget. Scroll up to Service Selection to adjust individual services.
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-cogent-neutral">Total recommended budget</p>
              <p className="text-2xl font-bold text-cogent-navy">
                {maxRoiAdSpend > 0 ? formatCurrency(maxRoiAdSpend) : "—"}<span className="text-sm font-normal text-cogent-neutral">/mo</span>
              </p>
            </div>
          </div>
          {/* Per-platform breakdown in Max ROI mode */}
          {isMultiPlatform && perPlatformRecommendedSpend && (
            <div className="mt-3 pt-3 border-t border-cogent-sage/30 flex flex-wrap gap-3">
              {selectedPlatforms!.map((plat) => {
                const rec = perPlatformRecommendedSpend[plat];
                if (!rec?.target) return null;
                return (
                  <div key={plat} className="flex items-center gap-1.5 text-xs text-cogent-neutral">
                    <span>{PLATFORM_ICONS[plat]}</span>
                    <span className="font-medium">{PLATFORM_LABELS[plat]}:</span>
                    <span className="text-cogent-navy font-semibold">{formatCurrency(rec.target)}/mo</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Recommended spend (strict mode only) ──────────────────────────── */}
      {!isMaxRoi && (recommendedMin || recommendedTarget) && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
          <p className="font-medium text-gray-700">
            Recommended Ad Spend {isMultiPlatform ? "— Combined across selected platforms" : ""}:
          </p>
          <div className="flex gap-6 mt-1">
            {recommendedMin && (
              <span className="text-gray-600">
                Minimum: <span className="font-medium">{formatCurrency(recommendedMin)}/mo</span>
              </span>
            )}
            {recommendedTarget && (
              <span className="text-gray-600">
                Target: <span className="font-semibold text-cogent-navy">{formatCurrency(recommendedTarget)}/mo</span>
              </span>
            )}
          </div>
          {isMultiPlatform && perPlatformRecommendedSpend && (
            <div className="mt-2 pt-2 border-t border-gray-200 space-y-0.5">
              {selectedPlatforms!.map((plat) => {
                const rec = perPlatformRecommendedSpend[plat];
                if (!rec || (rec.min === null && rec.target === null)) return null;
                return (
                  <div key={plat} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span>{PLATFORM_ICONS[plat]}</span>
                    <span className="font-medium">{PLATFORM_LABELS[plat]}:</span>
                    {rec.target !== null && (
                      <span>target <span className="font-medium text-cogent-navy">{formatCurrency(rec.target)}</span>/mo</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Monthly Ad Spend */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monthly Ad Spend <span className="text-red-500">*</span>
          </label>
          {isMaxRoi ? (
            /* Max ROI: read-only display */
            <div className="w-full border border-cogent-sage/40 bg-cogent-sage/5 rounded-md px-3 py-2 text-sm font-semibold text-cogent-navy">
              {maxRoiAdSpend > 0 ? formatCurrency(maxRoiAdSpend) : "—"}
              <span className="ml-1 text-xs font-normal text-cogent-neutral">/mo · set by services ↑</span>
            </div>
          ) : (
            /* Strict: editable */
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
              <input
                type="number"
                min={0}
                step={100}
                value={value.monthlyAdSpend || ""}
                onChange={(e) =>
                  onChange({ ...value, monthlyAdSpend: parseFloat(e.target.value) || 0 })
                }
                className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-cogent-navy focus:border-cogent-navy"
                placeholder="2000"
              />
            </div>
          )}
          {!isMaxRoi && spendWarning && (
            <p className="mt-1 text-xs text-amber-600">{spendWarning}</p>
          )}
          {/* Per-platform spend breakdown (strict mode) */}
          {!isMaxRoi && isMultiPlatform && value.monthlyAdSpend > 0 && (
            <div className="mt-2 space-y-1 pl-1">
              {selectedPlatforms!.map((plat) => {
                const pct = platformAllocations![plat] ?? 0;
                const amount = value.monthlyAdSpend * pct / 100;
                return (
                  <div key={plat} className="flex items-center gap-1.5 text-xs text-cogent-neutral">
                    <span>{PLATFORM_ICONS[plat]}</span>
                    <span>{PLATFORM_LABELS[plat]}:</span>
                    <span className="font-medium text-gray-700">{formatCurrency(amount)}/mo</span>
                    <span className="text-gray-400">({pct}%)</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Close Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lead-to-Job Close Rate <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={value.closeRate || ""}
              onChange={(e) => {
                onCloseRateManualChange?.();
                onChange({ ...value, closeRate: parseFloat(e.target.value) || 0 });
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 pr-7 text-sm focus:ring-2 focus:ring-cogent-navy focus:border-cogent-navy"
              placeholder="20"
            />
            <span className="absolute right-3 top-2 text-gray-500 text-sm">%</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">Of every 10 leads, how many become paying jobs?</p>
          {value.closeRate > 100 && (
            <p className="mt-1 text-xs text-red-600">Close rate exceeds 100%</p>
          )}
          {industryCloseRate && !closeRateManuallySet && (
            <p className="mt-1 text-xs text-green-700">
              Using industry average ({industryCloseRate.closeRate}%)
            </p>
          )}
          {industryCloseRate && closeRateManuallySet && (
            <p className="mt-1 text-xs text-blue-700">
              Industry avg is {industryCloseRate.closeRate}%
              {onResetCloseRate && (
                <button type="button" onClick={onResetCloseRate} className="ml-2 underline hover:text-cogent-navy">
                  Reset
                </button>
              )}
            </p>
          )}
        </div>

        {/* Gross Margin (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gross Margin % <span className="text-gray-400">(optional)</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={value.grossMarginPercent ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  grossMarginPercent: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 pr-7 text-sm focus:ring-2 focus:ring-cogent-navy focus:border-cogent-navy"
              placeholder="50"
            />
            <span className="absolute right-3 top-2 text-gray-500 text-sm">%</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">Revenue minus direct job costs. Used to calculate gross profit.</p>
        </div>
      </div>

      {/* ── "Why more spend = more results" visual ──────────────────────────── */}
      {effectiveBudget > 0 && value.closeRate > 0 && avgCpl && exampleLeads !== null && exampleJobs !== null && (
        <div className="mt-5 p-4 bg-cogent-navy/5 border border-cogent-navy/10 rounded-lg">
          <p className="text-xs font-semibold text-cogent-navy mb-3">
            How your budget turns into revenue — the math in plain English:
          </p>
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <div className="flex flex-col items-center bg-white rounded-lg border border-gray-200 px-4 py-2.5 min-w-[100px]">
              <span className="text-xs text-gray-500 mb-0.5">Ad Spend</span>
              <span className="font-bold text-cogent-navy">{formatCurrency(effectiveBudget)}<span className="font-normal text-xs">/mo</span></span>
            </div>
            <span className="text-gray-400 font-bold text-lg">÷</span>
            <div className="flex flex-col items-center bg-white rounded-lg border border-gray-200 px-4 py-2.5 min-w-[100px]">
              <span className="text-xs text-gray-500 mb-0.5">Avg Cost / Lead</span>
              <span className="font-bold text-cogent-navy">{formatCurrency(Math.round(avgCpl))}</span>
            </div>
            <span className="text-gray-400 font-bold text-lg">=</span>
            <div className="flex flex-col items-center bg-white rounded-lg border border-gray-200 px-4 py-2.5 min-w-[100px]">
              <span className="text-xs text-gray-500 mb-0.5">Est. Leads/mo</span>
              <span className="font-bold text-cogent-navy">{exampleLeads}</span>
            </div>
            <span className="text-gray-400 font-bold text-lg">×</span>
            <div className="flex flex-col items-center bg-white rounded-lg border border-gray-200 px-4 py-2.5 min-w-[100px]">
              <span className="text-xs text-gray-500 mb-0.5">Close Rate</span>
              <span className="font-bold text-cogent-navy">{value.closeRate}%</span>
            </div>
            <span className="text-gray-400 font-bold text-lg">=</span>
            <div className="flex flex-col items-center bg-cogent-sage/20 rounded-lg border border-cogent-sage px-4 py-2.5 min-w-[100px]">
              <span className="text-xs text-cogent-navy font-medium mb-0.5">Est. Jobs/mo</span>
              <span className="font-bold text-cogent-navy text-lg">{exampleJobs}</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-3">
            💡 More ad spend → more leads → more jobs. Improving your close rate also multiplies results without increasing budget.
          </p>
        </div>
      )}

      {/* Rounding Mode */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Output Rounding</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="roundingMode"
              value="exact"
              checked={value.roundingMode === "exact"}
              onChange={() => onChange({ ...value, roundingMode: "exact" as RoundingMode })}
              className="text-cogent-navy"
            />
            <span className="text-sm text-gray-700">Exact math</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="roundingMode"
              value="conservative"
              checked={value.roundingMode === "conservative"}
              onChange={() => onChange({ ...value, roundingMode: "conservative" as RoundingMode })}
              className="text-cogent-navy"
            />
            <span className="text-sm text-gray-700">Conservative (round down to whole jobs)</span>
          </label>
        </div>
      </div>
    </section>
  );
}
