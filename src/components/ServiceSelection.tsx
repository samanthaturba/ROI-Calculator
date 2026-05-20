"use client";

import { useState, useMemo } from "react";
import type { ServiceSelection as ServiceSelectionType, ExtractedService, CplChoice, AdPlatform } from "../lib/types";
import { getAllIndustries, getServicesForIndustry, getBenchmarkForService } from "../lib/benchmarks";
import { formatCurrency } from "../lib/calculations";

interface Props {
  services: ServiceSelectionType[];
  onChange: (services: ServiceSelectionType[]) => void;
  extractedServices: ExtractedService[];
  industryId: string;
  primaryPlatform: AdPlatform;
  /** All active platforms — used to show per-platform service mapping */
  selectedPlatforms?: AdPlatform[];
  /** Close rate % (0-100) — used for Max ROI projections */
  closeRate?: number;
  /** Total monthly ad spend — used for context in strict mode */
  monthlyAdSpend?: number;
  /** Blended market CPL multiplier */
  blendedMultiplier?: number;
  /** Lifted budget-mode state — controls Fixed vs Max ROI view */
  budgetMode: BudgetMode;
  onBudgetModeChange: (mode: BudgetMode) => void;
  /** Called when the user edits the inline monthly budget input */
  onMonthlyAdSpendChange?: (value: number) => void;
}

type BudgetMode = "strict" | "maxroi";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the effective CPL for a service based on its cplChoice, adjusted for market. */
function getEffectiveCpl(
  service: ServiceSelectionType,
  multiplier = 1
): number | null {
  let base: number | null = null;
  if (service.cplChoice === "custom") {
    base = service.customCpl;
  } else if (service.benchmark) {
    if (service.cplChoice === "low") base = service.benchmark.cplLow;
    else if (service.cplChoice === "mid") base = service.benchmark.cplMid;
    else if (service.cplChoice === "high") base = service.benchmark.cplHigh;
  }
  if (base === null || base <= 0) return null;
  return Math.round(base * multiplier);
}

/** Recommended min and target monthly spend to generate meaningful leads for one service.
 *  Formula: min = enough for 3 jobs/mo, target = enough for 6 jobs/mo.
 *  Rounded to nearest $50 / $100. */
function getRecommendedServiceSpend(
  service: ServiceSelectionType,
  closeRate: number,
  multiplier = 1
): { min: number | null; target: number | null } {
  const cpl = getEffectiveCpl(service, multiplier);
  if (!cpl || closeRate <= 0) return { min: null, target: null };

  const closeRateFrac = closeRate / 100;
  const minLeads = Math.ceil(3 / closeRateFrac);   // 3 jobs
  const targetLeads = Math.ceil(6 / closeRateFrac); // 6 jobs

  const rawMin = Math.round((cpl * minLeads) / 50) * 50;
  const rawTarget = Math.round((cpl * targetLeads) / 100) * 100;
  return {
    min: Math.max(rawMin, 300),
    target: Math.max(rawTarget, 500),
  };
}

/** Project the revenue a service could generate if given a specific budget. */
function projectServiceRevenue(
  service: ServiceSelectionType,
  budget: number,
  closeRate: number,
  multiplier = 1
): { leads: number; jobs: number; revenue: number } | null {
  const cpl = getEffectiveCpl(service, multiplier);
  const jobValue = service.customJobValue ?? service.benchmark?.avgJobValue ?? null;
  if (!cpl || !jobValue || closeRate <= 0) return null;
  const leads = budget / cpl;
  const jobs = leads * (closeRate / 100);
  const revenue = jobs * jobValue;
  return { leads, jobs, revenue };
}

/** Job-value tier label + color for a service. */
function jobValueTier(
  val: number | null | undefined
): { label: string; color: string } | null {
  if (!val) return null;
  if (val >= 5000) return { label: `$${(val / 1000).toFixed(0)}K avg job`, color: "bg-purple-100 text-purple-700" };
  if (val >= 2000) return { label: `$${(val / 1000).toFixed(1)}K avg job`, color: "bg-blue-100 text-blue-700" };
  if (val >= 800)  return { label: `$${(val / 1000).toFixed(1)}K avg job`, color: "bg-green-100 text-green-700" };
  if (val >= 300)  return { label: `$${val} avg job`, color: "bg-yellow-100 text-yellow-700" };
  return              { label: `$${val} avg job`, color: "bg-gray-100 text-gray-500" };
}

/** Revenue earned per $1 of ad spend — higher = more efficient service.
 *  Formula: (avgJobValue × closeRate%) / CPL */
function getServiceEfficiency(
  service: ServiceSelectionType,
  closeRate: number,
  multiplier = 1
): number | null {
  const cpl = getEffectiveCpl(service, multiplier);
  const jobValue = service.customJobValue ?? service.benchmark?.avgJobValue ?? null;
  if (!cpl || !jobValue || closeRate <= 0) return null;
  return (jobValue * (closeRate / 100)) / cpl;
}

/**
 * Smart budget allocation: weight by revenue efficiency with a 10 % floor per
 * service so no service is starved. Falls back to even split when no
 * efficiency data is available.
 * Returns an allocation-% array parallel to `services` (0 for unselected).
 */
function getSmartAllocation(
  services: ServiceSelectionType[],
  closeRate: number,
  multiplier: number
): number[] {
  const sel = services.filter((s) => s.selected);
  if (sel.length === 0) return services.map(() => 0);
  if (sel.length === 1) return services.map((s) => (s.selected ? 100 : 0));

  const efficiencies = sel.map((s) => getServiceEfficiency(s, closeRate, multiplier) ?? 0);
  const totalEff = efficiencies.reduce((a, b) => a + b, 0);

  const FLOOR_PCT = 10; // every service gets at least 10 %
  const remainder = 100 - sel.length * FLOOR_PCT;

  const raw = efficiencies.map(
    (e) => FLOOR_PCT + (totalEff > 0 ? (e / totalEff) * remainder : remainder / sel.length)
  );

  // Round to 1 decimal; absorb rounding drift onto the first selected service
  const rounded = raw.map((a) => Math.round(a * 10) / 10);
  const drift = 100 - rounded.reduce((a, b) => a + b, 0);
  if (Math.abs(drift) > 0.001) rounded[0] = Math.round((rounded[0] + drift) * 10) / 10;

  // Spread back to full array (unselected = 0)
  let si = 0;
  return services.map((s) => (s.selected ? rounded[si++] : 0));
}

// ── Component ─────────────────────────────────────────────────────────────────

const PLATFORM_META: Record<AdPlatform, { icon: string; label: string; shortLabel: string }> = {
  google:   { icon: "🔍", label: "Google Ads",    shortLabel: "Google Ads" },
  meta:     { icon: "📱", label: "Meta Ads",       shortLabel: "Meta" },
  linkedin: { icon: "💼", label: "LinkedIn Ads",   shortLabel: "LinkedIn" },
  lsa:      { icon: "📍", label: "Google LSA",     shortLabel: "Google LSA" },
};

export default function ServiceSelection({
  services,
  onChange,
  extractedServices,
  industryId,
  primaryPlatform,
  selectedPlatforms = [],
  closeRate = 20,
  monthlyAdSpend = 0,
  blendedMultiplier = 1,
  budgetMode,
  onBudgetModeChange,
  onMonthlyAdSpendChange,
}: Props) {
  const [newServiceName, setNewServiceName] = useState("");
  const [showCrossIndustry, setShowCrossIndustry] = useState(false);
  const [crossIndustryId, setCrossIndustryId] = useState("");
  const [crossServiceName, setCrossServiceName] = useState("");
  const [allocationMode, setAllocationMode] = useState<"smart" | "even" | "custom">("smart");

  // All industries except the current one
  const otherIndustries = useMemo(
    () => getAllIndustries(primaryPlatform).filter((i) => i.id !== industryId),
    [industryId, primaryPlatform]
  );

  // Services available under the currently-picked "other" industry
  const availableCrossServices = useMemo(() => {
    if (!crossIndustryId) return [];
    return getServicesForIndustry(crossIndustryId, primaryPlatform);
  }, [crossIndustryId, primaryPlatform]);

  // Sort services by avg job value descending (display order only — state order unchanged)
  const sortedWithIdx = useMemo(() => {
    return services
      .map((s, i) => ({ s, i }))
      .sort((a, b) => {
        const av = a.s.customJobValue ?? a.s.benchmark?.avgJobValue ?? 0;
        const bv = b.s.customJobValue ?? b.s.benchmark?.avgJobValue ?? 0;
        return bv - av;
      });
  }, [services]);

  // ── These must live before any early return to satisfy Rules of Hooks ─────────
  const selectedServices = services.filter((s) => s.selected);

  const maxRoiRows = useMemo(() => {
    return selectedServices
      .map((s) => {
        const rec = getRecommendedServiceSpend(s, closeRate, blendedMultiplier);
        const choice = s.maxRoiBudgetChoice ?? "target";
        const budget =
          choice === "min"    ? (rec.min    ?? rec.target ?? 0) :
          choice === "custom" ? (s.customMaxRoiBudget ?? rec.target ?? 0) :
                                (rec.target ?? 0);
        const proj = budget > 0
          ? projectServiceRevenue(s, budget, closeRate, blendedMultiplier)
          : null;
        const jobValue = s.customJobValue ?? s.benchmark?.avgJobValue ?? null;
        return { service: s, rec, budget, choice, proj, jobValue };
      })
      .sort((a, b) => (b.jobValue ?? 0) - (a.jobValue ?? 0));
  }, [selectedServices, closeRate, blendedMultiplier]);

  const maxRoiTotalBudget = maxRoiRows.reduce((s, r) => s + r.budget, 0);
  const maxRoiTotalRevenue = maxRoiRows.reduce((s, r) => s + (r.proj?.revenue ?? 0), 0);
  const maxRoiTotalJobs = maxRoiRows.reduce((s, r) => s + (r.proj?.jobs ?? 0), 0);

  const budgetCoverage =
    maxRoiTotalBudget > 0 && monthlyAdSpend > 0
      ? Math.min((monthlyAdSpend / maxRoiTotalBudget) * 100, 100)
      : null;

  if (!industryId) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-cogent-navy mb-2">Service Selection</h2>
        <p className="text-sm text-gray-500">Select an industry above to see available services.</p>
      </section>
    );
  }

  const selectedCount = selectedServices.length;

  function toggleService(index: number) {
    const updated = services.map((s, i) =>
      i === index ? { ...s, selected: !s.selected } : { ...s }
    );
    const allocs = getSmartAllocation(updated, closeRate, blendedMultiplier);
    for (let i = 0; i < updated.length; i++) updated[i].allocationPercent = allocs[i];
    setAllocationMode("smart");
    onChange(updated);
  }

  function updateAllocation(index: number, value: number) {
    const updated = [...services];
    updated[index] = { ...updated[index], allocationPercent: value };
    setAllocationMode("custom");
    onChange(updated);
  }

  function updateCplChoice(index: number, choice: CplChoice) {
    const updated = [...services];
    updated[index] = { ...updated[index], cplChoice: choice };
    onChange(updated);
  }

  function updateCustomCpl(index: number, value: number | null) {
    const updated = [...services];
    updated[index] = { ...updated[index], customCpl: value };
    onChange(updated);
  }

  function updateCustomJobValue(index: number, value: number | null) {
    const updated = [...services];
    updated[index] = { ...updated[index], customJobValue: value };
    onChange(updated);
  }

  function updateMaxRoiBudgetChoice(index: number, choice: "min" | "target" | "custom") {
    const updated = [...services];
    updated[index] = { ...updated[index], maxRoiBudgetChoice: choice };
    onChange(updated);
  }

  function updateCustomMaxRoiBudget(index: number, value: number | null) {
    const updated = [...services];
    updated[index] = { ...updated[index], customMaxRoiBudget: value };
    onChange(updated);
  }

  function applySmartSplit() {
    const updated = services.map((s) => ({ ...s }));
    const allocs = getSmartAllocation(updated, closeRate, blendedMultiplier);
    for (let i = 0; i < updated.length; i++) updated[i].allocationPercent = allocs[i];
    setAllocationMode("smart");
    onChange(updated);
  }

  function applyEvenSplitAction() {
    const updated = services.map((s) => ({ ...s }));
    const sel = updated.filter((s) => s.selected);
    if (sel.length === 0) return;
    const even = Math.round((100 / sel.length) * 10) / 10;
    for (const s of updated) s.allocationPercent = s.selected ? even : 0;
    const total = sel.length * even;
    if (Math.abs(total - 100) > 0.01) {
      const first = updated.find((s) => s.selected);
      if (first) first.allocationPercent = Math.round((first.allocationPercent + (100 - total)) * 10) / 10;
    }
    setAllocationMode("even");
    onChange(updated);
  }

  function addManualService() {
    const name = newServiceName.trim();
    if (!name) return;
    if (services.some((s) => s.serviceName.toLowerCase() === name.toLowerCase())) return;
    const updated: ServiceSelectionType[] = [
      ...services,
      { serviceName: name, selected: true, allocationPercent: 0, cplChoice: "high", customCpl: null, customJobValue: null, benchmark: null, isManual: true },
    ];
    const allocs = getSmartAllocation(updated, closeRate, blendedMultiplier);
    for (let i = 0; i < updated.length; i++) updated[i].allocationPercent = allocs[i];
    setAllocationMode("smart");
    onChange(updated);
    setNewServiceName("");
  }

  function removeManualService(index: number) {
    const updated = services.filter((_, i) => i !== index);
    const allocs = getSmartAllocation(updated, closeRate, blendedMultiplier);
    for (let i = 0; i < updated.length; i++) updated[i].allocationPercent = allocs[i];
    setAllocationMode("smart");
    onChange(updated);
  }

  function addCrossIndustryService() {
    if (!crossIndustryId || !crossServiceName) return;
    const sourceServices = getServicesForIndustry(crossIndustryId, primaryPlatform);
    const benchmark = sourceServices.find((s) => s.serviceName === crossServiceName);
    if (!benchmark) return;
    const displayName = `${benchmark.serviceName} (${benchmark.industryName})`;
    if (services.some((s) => s.serviceName === displayName)) return;
    const updated: ServiceSelectionType[] = [
      ...services,
      { serviceName: displayName, selected: true, allocationPercent: 0, cplChoice: "high", customCpl: null, customJobValue: null, benchmark, isManual: true },
    ];
    const allocs = getSmartAllocation(updated, closeRate, blendedMultiplier);
    for (let i = 0; i < updated.length; i++) updated[i].allocationPercent = allocs[i];
    setAllocationMode("smart");
    onChange(updated);
    setCrossServiceName("");
  }

  const totalAllocation = selectedServices.reduce((sum, s) => sum + s.allocationPercent, 0);

  const confidenceLabel: Record<string, string> = {
    high: "High confidence",
    medium: "Medium confidence",
    low: "Suggested (low confidence)",
  };

  // Smart allocation explanation for the banner
  const smartAllocationDesc = (() => {
    if (selectedCount < 2) return "";
    const effRows = selectedServices
      .map((s) => ({
        name: s.serviceName.split(" (")[0], // strip "(Industry Name)" suffix
        eff: getServiceEfficiency(s, closeRate, blendedMultiplier),
      }))
      .filter((r): r is { name: string; eff: number } => r.eff !== null)
      .sort((a, b) => b.eff - a.eff);
    if (effRows.length >= 2) {
      const best = effRows[0];
      const worst = effRows[effRows.length - 1];
      const fmtEff = (n: number) => n >= 10 ? `$${n.toFixed(0)}` : `$${n.toFixed(1)}`;
      return `${best.name} earns ~${fmtEff(best.eff)} per $1 spent vs ${worst.name} at ~${fmtEff(worst.eff)} — allocating more budget to the higher-value service.`;
    }
    if (effRows.length === 1) return `Budget weighted toward ${effRows[0].name}, which has the best revenue-per-dollar data.`;
    return "Budget split evenly (no benchmark data to weight by).";
  })();

  const hasEfficiencyData = selectedServices.some(
    (s) => getServiceEfficiency(s, closeRate, blendedMultiplier) !== null
  );

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg font-semibold text-cogent-navy">Service Selection</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Services are ordered by highest average job value — prioritize the top services for best ROI.
          </p>
        </div>

        {/* Budget mode toggle */}
        <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden shrink-0">
          <button
            onClick={() => onBudgetModeChange("strict")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              budgetMode === "strict"
                ? "bg-cogent-navy text-white"
                : "bg-white text-cogent-neutral hover:bg-gray-50"
            }`}
          >
            Fixed Budget
          </button>
          <button
            onClick={() => onBudgetModeChange("maxroi")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              budgetMode === "maxroi"
                ? "bg-cogent-sage text-cogent-navy-dark"
                : "bg-white text-cogent-neutral hover:bg-gray-50"
            }`}
          >
            Max ROI View
          </button>
        </div>
      </div>

      {/* ── Inline budget bar ─────────────────────────────────────────────────── */}
      {budgetMode === "strict" && (
        <div className="flex flex-wrap items-center gap-3 mb-4 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
          {/* Budget input */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs font-medium text-gray-600">Monthly Budget</label>
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
              <span className="px-2 py-1.5 text-sm text-gray-500 bg-gray-100 border-r border-gray-300 select-none">$</span>
              <input
                type="number"
                min={0}
                step={100}
                value={monthlyAdSpend || ""}
                onChange={(e) => onMonthlyAdSpendChange?.(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="px-2 py-1.5 text-sm w-28 bg-white focus:outline-none focus:ring-1 focus:ring-cogent-navy"
              />
              <span className="px-2 py-1.5 text-xs text-gray-400 bg-gray-50 border-l border-gray-300 select-none">/mo</span>
            </div>
          </div>

          {/* Live per-service split preview */}
          {monthlyAdSpend > 0 && selectedCount > 0 ? (
            <div className="flex flex-wrap gap-1.5 items-center min-w-0">
              <span className="text-[11px] text-gray-400 shrink-0">splits to →</span>
              {selectedServices.map((s) => (
                <span
                  key={s.serviceName}
                  className="text-[11px] bg-white border border-gray-200 rounded-full px-2 py-0.5 text-cogent-navy font-medium whitespace-nowrap"
                >
                  {s.serviceName.split(" ").slice(0, 2).join(" ")}:{" "}
                  {formatCurrency(Math.round(monthlyAdSpend * s.allocationPercent / 100))}
                </span>
              ))}
            </div>
          ) : monthlyAdSpend === 0 ? (
            <span className="text-xs text-gray-400">Enter a budget to see how it splits across selected services</span>
          ) : (
            <span className="text-xs text-gray-400">Select services to see budget splits</span>
          )}
        </div>
      )}

      {budgetMode === "maxroi" && (
        <div className="flex items-center justify-between gap-3 mb-4 px-3 py-2.5 bg-cogent-sage/10 rounded-lg border border-cogent-sage/30">
          <div>
            <span className="text-xs font-semibold text-cogent-navy">Max ROI View — Total Recommended Budget: </span>
            <span className="text-sm font-bold text-cogent-navy">
              {maxRoiTotalBudget > 0 ? `${formatCurrency(maxRoiTotalBudget)}/mo` : "—"}
            </span>
            {selectedCount > 0 && (
              <span className="text-xs text-cogent-neutral ml-2">across {selectedCount} service{selectedCount !== 1 ? "s" : ""}</span>
            )}
          </div>
          {selectedCount === 0 && (
            <span className="text-xs text-cogent-neutral">Select services below to see recommended budgets</span>
          )}
        </div>
      )}

      {/* Mode explanation banner */}
      {budgetMode === "strict" && selectedCount > 1 && monthlyAdSpend > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
          <strong>Fixed Budget Mode:</strong> Your {formatCurrency(monthlyAdSpend)}/mo budget is distributed across{" "}
          {selectedCount} services. The more services you run, the less each receives — consider focusing on
          your highest-value services for the strongest return.{" "}
          <button className="underline font-medium" onClick={() => onBudgetModeChange("maxroi")}>
            Switch to Max ROI View
          </button>{" "}
          to see what each service could generate with its own optimal budget.
        </div>
      )}
      {budgetMode === "maxroi" && selectedCount > 0 && (
        <div className="mb-4 p-3 bg-cogent-sage/10 border border-cogent-sage/30 rounded-md text-xs text-cogent-navy">
          <strong>Max ROI View:</strong> Shows the recommended monthly spend for each service to generate
          meaningful leads independently — not constrained by your current budget. Use this to show a client
          the full opportunity and what it would take to fully fund each service.
        </div>
      )}

      {/* Smart allocation recommendation banner — Fixed Budget only, 2+ services */}
      {budgetMode === "strict" && selectedCount >= 2 && (
        <div className="mb-4 p-3 bg-sky-50 border border-sky-200 rounded-lg">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sky-800 mb-0.5">
                {allocationMode === "smart" && "✦ Smart Split — weighted by revenue efficiency"}
                {allocationMode === "even"  && "⟺ Even Split — equal share per service"}
                {allocationMode === "custom" && "✎ Custom Allocation"}
              </p>
              <p className="text-xs text-sky-700">
                {allocationMode === "smart" && (hasEfficiencyData ? smartAllocationDesc : `Budget split evenly across ${selectedCount} services (add job values / CPL to enable smart weighting).`)}
                {allocationMode === "even"  && `Each of the ${selectedCount} services receives an equal ${(100 / selectedCount).toFixed(1)}% of your budget.`}
                {allocationMode === "custom" && "Allocations are set manually. Use a button below to reset."}
              </p>
            </div>
            <div className="flex gap-2 shrink-0 mt-0.5">
              {allocationMode !== "smart" && (
                <button
                  onClick={applySmartSplit}
                  className="text-xs px-2.5 py-1 bg-sky-600 text-white rounded-md hover:bg-sky-700 font-medium transition-colors"
                >
                  Apply Smart Split
                </button>
              )}
              {allocationMode !== "even" && (
                <button
                  onClick={applyEvenSplitAction}
                  className="text-xs px-2.5 py-1 border border-sky-300 text-sky-700 rounded-md hover:bg-sky-100 font-medium transition-colors"
                >
                  Use Even Split
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Multi-platform banner ─────────────────────────────────────────── */}
      {selectedPlatforms.length > 1 && industryId && (
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
          <p className="text-xs font-semibold text-indigo-800 mb-1.5">
            📊 Multi-Platform Campaign — Services run across {selectedPlatforms.length} platforms
          </p>
          <p className="text-[11px] text-indigo-700 mb-2">
            Each service below will be advertised on all your selected platforms. Look for the platform
            badges on each service to see per-platform CPL differences.
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedPlatforms.map((plat) => {
              const meta = PLATFORM_META[plat];
              const platServices = getServicesForIndustry(industryId, plat);
              const hasBenchmarks = platServices.length > 0;
              return (
                <div key={plat} className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border font-medium ${
                  plat === primaryPlatform
                    ? "bg-cogent-navy text-white border-cogent-navy"
                    : hasBenchmarks
                    ? "bg-white text-gray-700 border-gray-300"
                    : "bg-gray-100 text-gray-500 border-gray-200"
                }`}>
                  <span>{meta.icon}</span>
                  <span>{meta.shortLabel}</span>
                  {plat === primaryPlatform && <span className="text-[9px] opacity-80">primary</span>}
                  {plat === "meta" && <span className="text-[9px] opacity-70">· audience</span>}
                  {plat === "lsa" && <span className="text-[9px] opacity-70">· pay-per-lead</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected count + allocation */}
      <p className="text-sm text-gray-500 mb-4">
        {selectedCount} service{selectedCount !== 1 ? "s" : ""} selected
        {selectedCount > 0 && budgetMode === "strict" && (
          <span className={Math.abs(totalAllocation - 100) > 0.5 ? "text-red-600 ml-2 font-medium" : "text-gray-400 ml-2"}>
            (allocation: {totalAllocation.toFixed(1)}%)
          </span>
        )}
      </p>

      {/* Extracted services notice */}
      {extractedServices.length > 0 && (
        <div className="mb-4 p-3 bg-cogent-ivory border border-cogent-sage rounded-md">
          <p className="text-sm font-medium text-cogent-navy mb-1">
            Suggested services found from website text:
          </p>
          <ul className="text-sm text-cogent-navy">
            {extractedServices.map((es) => (
              <li key={es.name}>
                {es.name} — <span className="text-cogent-neutral">{confidenceLabel[es.confidence] ?? es.confidence}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-cogent-navy mt-1">
            Review and confirm the selections below. These are suggestions, not certainties.
          </p>
        </div>
      )}

      {/* Service list — sorted by job value */}
      <div className="space-y-3">
        {sortedWithIdx.map(({ s: service, i: index }) => {
          const jobVal = service.customJobValue ?? service.benchmark?.avgJobValue ?? null;
          const tier = jobValueTier(jobVal);
          const recSpend = service.selected
            ? getRecommendedServiceSpend(service, closeRate, blendedMultiplier)
            : null;
          const effectiveCpl = getEffectiveCpl(service, blendedMultiplier);
          const efficiencyScore = service.selected
            ? getServiceEfficiency(service, closeRate, blendedMultiplier)
            : null;

          return (
            <div
              key={service.serviceName}
              className={`border rounded-md p-3 transition-colors ${
                service.selected ? "border-cogent-sage bg-cogent-ivory/30" : "border-gray-200"
              }`}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="checkbox"
                  checked={service.selected}
                  onChange={() => toggleService(index)}
                  className="h-4 w-4 text-cogent-navy rounded shrink-0"
                />
                <span className="text-sm font-medium text-gray-900 flex-1 min-w-0">
                  {service.serviceName}
                  {service.isManual && (
                    <span className="ml-2 text-xs text-amber-600 font-normal">(manually added)</span>
                  )}
                </span>

                {/* Job value badge — key sorting signal */}
                {tier && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${tier.color}`}>
                    {tier.label}
                  </span>
                )}

                {service.benchmark?.confidence && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    service.benchmark.confidence === "high"
                      ? "bg-green-100 text-green-700"
                      : service.benchmark.confidence === "medium"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-orange-100 text-orange-700"
                  }`}>
                    {service.benchmark.confidence} confidence
                  </span>
                )}

                {/* Platform CPL badges — show when multiple platforms selected */}
                {selectedPlatforms.length > 1 && service.benchmark && (
                  <div className="flex flex-wrap gap-1">
                    {selectedPlatforms.map((plat) => {
                      const meta = PLATFORM_META[plat];
                      const sourceIndustry = service.benchmark?.industryId ?? industryId;
                      const lookupName = service.benchmark?.serviceName ?? service.serviceName;
                      const platBenchmark = plat === primaryPlatform
                        ? service.benchmark
                        : getBenchmarkForService(sourceIndustry, lookupName, plat);
                      const hasPlatData = !!platBenchmark;
                      return (
                        <span
                          key={plat}
                          className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border ${
                            hasPlatData
                              ? plat === "google" ? "bg-blue-50 text-blue-700 border-blue-200"
                              : plat === "lsa" ? "bg-green-50 text-green-700 border-green-200"
                              : plat === "meta" ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-gray-50 text-gray-400 border-gray-200"
                          }`}
                          title={hasPlatData
                            ? `${meta.label}: $${platBenchmark!.cplLow}–$${platBenchmark!.cplHigh} CPL`
                            : `${meta.label}: using ${PLATFORM_META[primaryPlatform].shortLabel} as proxy`
                          }
                        >
                          <span>{meta.icon}</span>
                          {hasPlatData
                            ? <span className="font-medium">${platBenchmark!.cplMid}</span>
                            : <span className="italic">proxy</span>
                          }
                        </span>
                      );
                    })}
                  </div>
                )}

                {service.isManual && (
                  <button
                    onClick={() => removeManualService(index)}
                    className="text-xs text-red-500 hover:text-red-700 shrink-0"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Per-platform CPL comparison — shown when selected + multi-platform */}
              {service.selected && selectedPlatforms.length > 1 && service.benchmark && (
                <div className="mt-2 ml-7 flex flex-wrap gap-2">
                  {selectedPlatforms.map((plat) => {
                    const meta = PLATFORM_META[plat];
                    const sourceIndustry = service.benchmark?.industryId ?? industryId;
                    const lookupName = service.benchmark?.serviceName ?? service.serviceName;
                    const platBenchmark = plat === primaryPlatform
                      ? service.benchmark
                      : getBenchmarkForService(sourceIndustry, lookupName, plat);
                    return (
                      <div
                        key={plat}
                        className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border ${
                          platBenchmark
                            ? "bg-white border-gray-200"
                            : "bg-gray-50 border-gray-150"
                        }`}
                      >
                        <span className="shrink-0">{meta.icon}</span>
                        <span className="font-medium text-gray-700">{meta.shortLabel}</span>
                        {platBenchmark ? (
                          <span className="text-gray-500">
                            ${platBenchmark.cplLow}–${platBenchmark.cplHigh} CPL
                            {plat === "meta" && (
                              <span className="text-purple-500 ml-1">(audience)</span>
                            )}
                            {plat === "lsa" && (
                              <span className="text-green-600 ml-1">(verified lead)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">
                            uses {PLATFORM_META[primaryPlatform].shortLabel} CPL
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Recommended spend hint — shown when selected */}
              {service.selected && recSpend?.target && (
                <div className="mt-1.5 ml-7 text-[11px] text-cogent-neutral flex flex-wrap gap-3">
                  <span>
                    Recommended to run effectively:{" "}
                    <span className="font-medium text-cogent-navy">
                      {recSpend.min ? `${formatCurrency(recSpend.min)}–` : ""}
                      {formatCurrency(recSpend.target)}/mo
                    </span>
                  </span>
                  {effectiveCpl && (
                    <span className="text-gray-400">CPL used: {formatCurrency(effectiveCpl)}</span>
                  )}
                </div>
              )}

              {service.selected && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 pl-7">
                  {/* Allocation — only shown in strict mode */}
                  {budgetMode === "strict" ? (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Budget %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={service.allocationPercent}
                        onChange={(e) => updateAllocation(index, parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                      {monthlyAdSpend > 0 && (
                        <p className="text-[11px] text-cogent-neutral mt-0.5">
                          = {formatCurrency(monthlyAdSpend * service.allocationPercent / 100)}/mo
                        </p>
                      )}
                      {efficiencyScore !== null && (
                        <p className="text-[11px] text-sky-600 mt-0.5 font-medium">
                          ~{efficiencyScore >= 10
                            ? `$${efficiencyScore.toFixed(0)}`
                            : `$${efficiencyScore.toFixed(1)}`} rev per $1
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Rec. Budget</label>
                      {/* Min / Target / Custom tier selector */}
                      <div className="flex gap-1 mb-1.5">
                        {(["target", "min", "custom"] as const).map((c) => (
                          <button
                            key={c}
                            onClick={() => updateMaxRoiBudgetChoice(index, c)}
                            className={`text-[10px] px-1.5 py-0.5 rounded border font-medium capitalize transition-colors ${
                              (service.maxRoiBudgetChoice ?? "target") === c
                                ? "bg-cogent-navy text-white border-cogent-navy"
                                : "text-gray-500 border-gray-300 hover:border-gray-400 bg-white"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                      {(service.maxRoiBudgetChoice ?? "target") === "custom" ? (
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={service.customMaxRoiBudget ?? ""}
                          onChange={(e) => updateCustomMaxRoiBudget(index, e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="Enter $/mo"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-cogent-navy">
                          {(service.maxRoiBudgetChoice ?? "target") === "min"
                            ? (recSpend?.min ? formatCurrency(recSpend.min) : "—")
                            : (recSpend?.target ? formatCurrency(recSpend.target) : "—")
                          }/mo
                        </p>
                      )}
                      {(service.maxRoiBudgetChoice ?? "target") !== "custom" && recSpend?.min && recSpend?.target && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          range: {formatCurrency(recSpend.min)}–{formatCurrency(recSpend.target)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* CPL Choice */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">CPL</label>
                    {service.benchmark ? (
                      <select
                        value={service.cplChoice}
                        onChange={(e) => updateCplChoice(index, e.target.value as CplChoice)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        {service.benchmark.cplLow !== null && (
                          <option value="low">Low (${service.benchmark.cplLow})</option>
                        )}
                        {service.benchmark.cplMid !== null && (
                          <option value="mid">Mid (${service.benchmark.cplMid})</option>
                        )}
                        {service.benchmark.cplHigh !== null && (
                          <option value="high">High (${service.benchmark.cplHigh})</option>
                        )}
                        <option value="custom">Custom</option>
                      </select>
                    ) : (
                      <span className="text-xs text-gray-400 block mt-1">No benchmark</span>
                    )}
                    {(service.cplChoice === "custom" || !service.benchmark) && (
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={service.customCpl ?? ""}
                        onChange={(e) => updateCustomCpl(index, e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="$ CPL"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1"
                      />
                    )}
                  </div>

                  {/* Job Value */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Avg Job Value</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={service.customJobValue ?? service.benchmark?.avgJobValue ?? ""}
                        onChange={(e) =>
                          updateCustomJobValue(index, e.target.value ? parseFloat(e.target.value) : null)
                        }
                        placeholder={service.benchmark?.avgJobValue ? `${service.benchmark.avgJobValue}` : "Enter value"}
                        className="w-full border border-gray-300 rounded pl-5 pr-2 py-1 text-sm"
                      />
                    </div>
                    {/* Always show industry avg as reference */}
                    {service.benchmark?.avgJobValue && (
                      <p className="text-[11px] mt-0.5">
                        {service.customJobValue !== null && service.customJobValue !== service.benchmark.avgJobValue ? (
                          <span className="text-amber-600">
                            Industry avg: ${service.benchmark.avgJobValue.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">
                            Industry avg: ${service.benchmark.avgJobValue.toLocaleString()}
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Benchmark info */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">CPL Range</label>
                    {service.benchmark ? (
                      <div className="text-xs text-gray-500">
                        <div>${service.benchmark.cplLow}–${service.benchmark.cplHigh}</div>
                        {service.benchmark.notes && (
                          <div className="text-amber-600 mt-0.5">{service.benchmark.notes}</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-amber-600">No benchmark. Using custom values.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Max ROI Summary Panel ───────────────────────────────────────────── */}
      {budgetMode === "maxroi" && selectedCount > 0 && (
        <div className="mt-6 border border-cogent-sage/40 rounded-lg overflow-hidden">
          <div className="bg-cogent-sage/10 px-4 py-3 border-b border-cogent-sage/30">
            <h3 className="text-sm font-semibold text-cogent-navy">
              Max Potential ROI — What Each Service Could Generate
            </h3>
            <p className="text-xs text-cogent-neutral mt-0.5">
              Each service funded with its own recommended monthly budget, at {closeRate}% close rate.
              Sorted by highest revenue potential.
            </p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
                  <th className="text-left px-4 py-2 font-medium">Service</th>
                  <th className="text-right px-4 py-2 font-medium">Avg Job $</th>
                  <th className="text-right px-4 py-2 font-medium">Rec. Budget/mo</th>
                  <th className="text-right px-4 py-2 font-medium">Est. Leads/mo</th>
                  <th className="text-right px-4 py-2 font-medium">Est. Jobs/mo</th>
                  <th className="text-right px-4 py-2 font-medium">Est. Revenue/mo</th>
                  <th className="text-right px-4 py-2 font-medium">
                    <span className="group relative inline-flex items-center gap-1 cursor-default">
                      ROAS
                      <span className="text-gray-400 hover:text-gray-600">ⓘ</span>
                      {/* Tooltip */}
                      <span className="pointer-events-none absolute right-0 top-6 z-10 w-64 rounded-lg bg-cogent-navy text-white text-[11px] leading-relaxed p-3 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                        <strong>Return on Ad Spend (ROAS)</strong> — estimated revenue for every $1 spent on ads.
                        <br /><br />
                        A ROAS of 5x means $5 in revenue per $1 in ad spend. Higher is better.
                        <br /><br />
                        <span className="text-cogent-sage font-medium">💡 If budget is limited, focus on the services with the highest ROAS first</span> — they return the most revenue per dollar.
                      </span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {maxRoiRows.map(({ service, rec, budget, choice, proj, jobValue }) => {
                  const roas = proj && budget > 0 ? proj.revenue / budget : null;
                  return (
                    <tr key={service.serviceName} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800 text-xs max-w-[160px]">
                        {service.serviceName}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-600">
                        {jobValue ? formatCurrency(jobValue) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold text-cogent-navy">
                        {budget > 0 ? formatCurrency(budget) : "—"}
                        <span className="text-[10px] text-gray-400 block font-normal capitalize">{choice}</span>
                        {choice === "target" && rec.min && (
                          <span className="text-[10px] text-gray-300 block font-normal">
                            min {formatCurrency(rec.min)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-600">
                        {proj ? proj.leads.toFixed(1) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-600">
                        {proj ? proj.jobs.toFixed(1) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold text-green-700">
                        {proj ? formatCurrency(proj.revenue) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs">
                        {roas !== null ? (
                          <span className={`font-semibold ${roas >= 5 ? "text-green-700" : roas >= 3 ? "text-yellow-600" : "text-gray-500"}`}>
                            {roas.toFixed(1)}x
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="bg-cogent-navy text-white font-semibold">
                  <td className="px-4 py-3 text-xs">
                    Total ({selectedCount} service{selectedCount !== 1 ? "s" : ""})
                  </td>
                  <td className="px-4 py-3 text-right text-xs">—</td>
                  <td className="px-4 py-3 text-right text-xs">{formatCurrency(maxRoiTotalBudget)}/mo</td>
                  <td className="px-4 py-3 text-right text-xs">—</td>
                  <td className="px-4 py-3 text-right text-xs">{maxRoiTotalJobs.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-xs">{formatCurrency(maxRoiTotalRevenue)}/mo</td>
                  <td className="px-4 py-3 text-right text-xs">
                    {maxRoiTotalBudget > 0 ? (
                      <span>{(maxRoiTotalRevenue / maxRoiTotalBudget).toFixed(1)}x</span>
                    ) : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Budget gap callout */}
          {monthlyAdSpend > 0 && maxRoiTotalBudget > 0 && (
            <div className={`px-4 py-3 text-sm border-t ${
              monthlyAdSpend >= maxRoiTotalBudget
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}>
              {monthlyAdSpend >= maxRoiTotalBudget ? (
                <>
                  <span className="font-semibold">✅ Current budget covers all services.</span>{" "}
                  {formatCurrency(monthlyAdSpend)}/mo exceeds the {formatCurrency(maxRoiTotalBudget)}/mo
                  needed to optimally fund all {selectedCount} services.
                </>
              ) : (
                <>
                  <span className="font-semibold">
                    Current budget ({formatCurrency(monthlyAdSpend)}/mo) covers {budgetCoverage?.toFixed(0)}% of
                    the recommended {formatCurrency(maxRoiTotalBudget)}/mo
                  </span>{" "}
                  to fully fund all {selectedCount} services.{" "}
                  <span className="font-medium">
                    Gap: {formatCurrency(maxRoiTotalBudget - monthlyAdSpend)}/mo.
                  </span>{" "}
                  Consider either increasing the budget or focusing on the top {
                    Math.min(
                      Math.max(1, Math.floor(monthlyAdSpend / (maxRoiTotalBudget / selectedCount))),
                      selectedCount - 1
                    )
                  } highest-value services.
                </>
              )}
            </div>
          )}

          {monthlyAdSpend === 0 && (
            <div className="px-4 py-3 text-xs text-cogent-neutral bg-gray-50 border-t">
              Enter a monthly ad spend above to see how your budget compares to the recommended total.
            </div>
          )}
        </div>
      )}

      {/* ── Add manual service ─────────────────────────────────────────────── */}
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={newServiceName}
          onChange={(e) => setNewServiceName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addManualService()}
          placeholder="Add custom service..."
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <button
          onClick={addManualService}
          disabled={!newServiceName.trim()}
          className="px-4 py-2 bg-cogent-navy text-white text-sm rounded-md hover:bg-cogent-navy-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </div>

      {/* ── Cross-industry services ─────────────────────────────────────────── */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowCrossIndustry((s) => !s)}
          className="text-xs text-cogent-navy hover:underline font-medium"
        >
          {showCrossIndustry ? "− Hide" : "+ Add service from another industry"}
        </button>
        {showCrossIndustry && (
          <div className="mt-2 p-3 border border-gray-200 rounded-md bg-gray-50">
            <p className="text-xs text-cogent-neutral mb-2">
              For businesses that span multiple industries. The service brings its original
              benchmark data so projections stay accurate.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={crossIndustryId}
                onChange={(e) => { setCrossIndustryId(e.target.value); setCrossServiceName(""); }}
                className="flex-1 border border-gray-300 rounded-md px-2 py-2 text-sm bg-white"
              >
                <option value="">Pick an industry…</option>
                {otherIndustries.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
              <select
                value={crossServiceName}
                onChange={(e) => setCrossServiceName(e.target.value)}
                disabled={!crossIndustryId}
                className="flex-1 border border-gray-300 rounded-md px-2 py-2 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">{crossIndustryId ? "Pick a service…" : "(select an industry first)"}</option>
                {availableCrossServices.map((s) => (
                  <option key={s.serviceName} value={s.serviceName}>
                    {s.serviceName}
                    {s.cplMid !== null ? ` — $${s.cplMid} CPL` : ""}
                    {s.avgJobValue !== null ? ` / $${s.avgJobValue.toLocaleString()} job` : ""}
                  </option>
                ))}
              </select>
              <button
                onClick={addCrossIndustryService}
                disabled={!crossIndustryId || !crossServiceName}
                className="px-4 py-2 bg-cogent-navy text-white text-sm rounded-md hover:bg-cogent-navy-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
