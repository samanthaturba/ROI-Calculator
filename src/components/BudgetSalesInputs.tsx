"use client";

import type { BudgetInputs, RoundingMode } from "../lib/types";
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
}

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
}: Props) {
  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-cogent-navy mb-4">Budget & Sales Inputs</h2>

      {/* Recommended spend info */}
      {(recommendedMin || recommendedTarget) && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
          <p className="font-medium text-gray-700">Recommended Ad Spend (based on industry benchmarks):</p>
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
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Monthly Ad Spend */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monthly Ad Spend <span className="text-red-500">*</span>
          </label>
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
          {spendWarning && (
            <p className="mt-1 text-xs text-amber-600">{spendWarning}</p>
          )}
        </div>

        {/* Close Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Close Rate <span className="text-red-500">*</span>
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
          {value.closeRate > 100 && (
            <p className="mt-1 text-xs text-red-600">Close rate exceeds 100%</p>
          )}
          {industryCloseRate && !closeRateManuallySet && (
            <p className="mt-1 text-xs text-green-700">
              Using industry average close rate ({industryCloseRate.closeRate}%)
              <span className="block text-gray-500 mt-0.5">Source: {industryCloseRate.source}</span>
            </p>
          )}
          {industryCloseRate && closeRateManuallySet && (
            <p className="mt-1 text-xs text-blue-700">
              Industry average is {industryCloseRate.closeRate}% — you are using a custom rate
              {onResetCloseRate && (
                <button
                  type="button"
                  onClick={onResetCloseRate}
                  className="ml-2 text-cogent-navy underline hover:text-cogent-navy-dark"
                >
                  Reset to industry avg
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
        </div>
      </div>

      {/* Rounding Mode */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Rounding Mode</label>
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

      {/* Formula reference */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
        <p className="text-xs font-medium text-gray-600 mb-1">Calculation formula:</p>
        <p className="text-xs text-gray-500 font-mono">
          leads = ad spend / CPL &nbsp;|&nbsp; jobs = leads &times; close rate &nbsp;|&nbsp; revenue = jobs &times; avg job value
        </p>
      </div>
    </section>
  );
}
