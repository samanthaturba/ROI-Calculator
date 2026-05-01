"use client";

import { useState, useMemo } from "react";
import type { ServiceSelection as ServiceSelectionType, ExtractedService, CplChoice, AdPlatform } from "../lib/types";
import { getAllIndustries, getServicesForIndustry } from "../lib/benchmarks";
import { formatCurrency } from "../lib/calculations";

interface Props {
  services: ServiceSelectionType[];
  onChange: (services: ServiceSelectionType[]) => void;
  extractedServices: ExtractedService[];
  industryId: string;
  primaryPlatform: AdPlatform;
  /** Close rate % (0-100) — used for Max ROI projections */
  closeRate?: number;
  /** Total monthly ad spend — used for context in strict mode */
  monthlyAdSpend?: number;
  /** Blended market CPL multiplier */
  blendedMultiplier?: number;
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function ServiceSelection({
  services,
  onChange,
  extractedServices,
  industryId,
  primaryPlatform,
  closeRate = 20,
  monthlyAdSpend = 0,
  blendedMultiplier = 1,
}: Props) {
  const [newServiceName, setNewServiceName] = useState("");
  const [showCrossIndustry, setShowCrossIndustry] = useState(false);
  const [crossIndustryId, setCrossIndustryId] = useState("");
  const [crossServiceName, setCrossServiceName] = useState("");
  const [budgetMode, setBudgetMode] = useState<BudgetMode>("strict");

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

  if (!industryId) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-cogent-navy mb-2">Service Selection</h2>
        <p className="text-sm text-gray-500">Select an industry above to see available services.</p>
      </section>
    );
  }

  const selectedCount = services.filter((s) => s.selected).length;
  const selectedServices = services.filter((s) => s.selected);

  function toggleService(index: number) {
    const updated = [...services];
    updated[index] = { ...updated[index], selected: !updated[index].selected };
    const sel = updated.filter((s) => s.selected);
    if (sel.length > 0) {
      const even = Math.round((100 / sel.length) * 10) / 10;
      for (const s of updated) s.allocationPercent = s.selected ? even : 0;
      const total = sel.length * even;
      if (Math.abs(total - 100) > 0.01) {
        const first = updated.find((s) => s.selected);
        if (first) {
          first.allocationPercent += 100 - total;
          first.allocationPercent = Math.round(first.allocationPercent * 10) / 10;
        }
      }
    }
    onChange(updated);
  }

  function updateAllocation(index: number, value: number) {
    const updated = [...services];
    updated[index] = { ...updated[index], allocationPercent: value };
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

  function addManualService() {
    const name = newServiceName.trim();
    if (!name) return;
    if (services.some((s) => s.serviceName.toLowerCase() === name.toLowerCase())) return;
    const updated: ServiceSelectionType[] = [
      ...services,
      { serviceName: name, selected: true, allocationPercent: 0, cplChoice: "high", customCpl: null, customJobValue: null, benchmark: null, isManual: true },
    ];
    const sel = updated.filter((s) => s.selected);
    const even = Math.round((100 / sel.length) * 10) / 10;
    for (const s of updated) s.allocationPercent = s.selected ? even : 0;
    onChange(updated);
    setNewServiceName("");
  }

  function removeManualService(index: number) {
    const updated = services.filter((_, i) => i !== index);
    const sel = updated.filter((s) => s.selected);
    if (sel.length > 0) {
      const even = Math.round((100 / sel.length) * 10) / 10;
      for (const s of updated) s.allocationPercent = s.selected ? even : 0;
    }
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
    const sel = updated.filter((s) => s.selected);
    const even = Math.round((100 / sel.length) * 10) / 10;
    for (const s of updated) s.allocationPercent = s.selected ? even : 0;
    onChange(updated);
    setCrossServiceName("");
  }

  const totalAllocation = selectedServices.reduce((sum, s) => sum + s.allocationPercent, 0);

  const confidenceLabel: Record<string, string> = {
    high: "High confidence",
    medium: "Medium confidence",
    low: "Suggested (low confidence)",
  };

  // ── Max ROI calculations ────────────────────────────────────────────────────
  const maxRoiRows = useMemo(() => {
    return selectedServices.map((s) => {
      const rec = getRecommendedServiceSpend(s, closeRate, blendedMultiplier);
      const budget = rec.target ?? 0;
      const proj = budget > 0 ? projectServiceRevenue(s, budget, closeRate, blendedMultiplier) : null;
      const jobValue = s.customJobValue ?? s.benchmark?.avgJobValue ?? null;
      return { service: s, rec, proj, jobValue };
    }).sort((a, b) => (b.jobValue ?? 0) - (a.jobValue ?? 0));
  }, [selectedServices, closeRate, blendedMultiplier]);

  const maxRoiTotalBudget = maxRoiRows.reduce((s, r) => s + (r.rec.target ?? 0), 0);
  const maxRoiTotalRevenue = maxRoiRows.reduce((s, r) => s + (r.proj?.revenue ?? 0), 0);
  const maxRoiTotalJobs = maxRoiRows.reduce((s, r) => s + (r.proj?.jobs ?? 0), 0);

  const budgetCoverage =
    maxRoiTotalBudget > 0 && monthlyAdSpend > 0
      ? Math.min((monthlyAdSpend / maxRoiTotalBudget) * 100, 100)
      : null;

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
            onClick={() => setBudgetMode("strict")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              budgetMode === "strict"
                ? "bg-cogent-navy text-white"
                : "bg-white text-cogent-neutral hover:bg-gray-50"
            }`}
          >
            Fixed Budget
          </button>
          <button
            onClick={() => setBudgetMode("maxroi")}
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

      {/* Mode explanation banner */}
      {budgetMode === "strict" && selectedCount > 1 && monthlyAdSpend > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
          <strong>Fixed Budget Mode:</strong> Your {formatCurrency(monthlyAdSpend)}/mo budget is split across{" "}
          {selectedCount} services. Each service gets {formatCurrency(monthlyAdSpend / selectedCount)} on average —
          the more services selected, the less each gets, which lowers per-service lead volume.{" "}
          <button className="underline font-medium" onClick={() => setBudgetMode("maxroi")}>
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

                {service.isManual && (
                  <button
                    onClick={() => removeManualService(index)}
                    className="text-xs text-red-500 hover:text-red-700 shrink-0"
                  >
                    Remove
                  </button>
                )}
              </div>

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
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Rec. Budget</label>
                      <p className="text-sm font-semibold text-cogent-navy mt-1">
                        {recSpend?.target ? formatCurrency(recSpend.target) : "—"}/mo
                      </p>
                      {recSpend?.min && (
                        <p className="text-[11px] text-gray-400">min {formatCurrency(recSpend.min)}/mo</p>
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
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={service.customJobValue ?? service.benchmark?.avgJobValue ?? ""}
                      onChange={(e) =>
                        updateCustomJobValue(index, e.target.value ? parseFloat(e.target.value) : null)
                      }
                      placeholder={service.benchmark?.avgJobValue ? `$${service.benchmark.avgJobValue}` : "Enter value"}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    {service.benchmark?.avgJobValue && service.customJobValue === null && (
                      <span className="text-xs text-gray-400">Benchmark: ${service.benchmark.avgJobValue}</span>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {maxRoiRows.map(({ service, rec, proj, jobValue }) => (
                  <tr key={service.serviceName} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800 text-xs max-w-[160px]">
                      {service.serviceName}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-600">
                      {jobValue ? formatCurrency(jobValue) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-cogent-navy">
                      {rec.target ? formatCurrency(rec.target) : "—"}
                      {rec.min && rec.target && (
                        <span className="text-[10px] text-gray-400 block font-normal">
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
                  </tr>
                ))}
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
