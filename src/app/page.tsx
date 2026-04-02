"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import type {
  ClientInputs as ClientInputsType,
  BudgetInputs,
  ServiceSelection as ServiceSelectionType,
  ExtractedService,
} from "../lib/types";
import {
  getAllIndustries,
  getServicesForIndustry,
  getRecommendedSpend,
} from "../lib/benchmarks";
import { calculate, checkSpendWarning } from "../lib/calculations";
import { extractServicesFromText } from "../lib/service-extraction";

import ClientInputsComponent from "../components/ClientInputs";
import ServiceSelection from "../components/ServiceSelection";
import BudgetSalesInputs from "../components/BudgetSalesInputs";
import Results from "../components/Results";
import ExportSummary from "../components/ExportSummary";

const DEFAULT_CLOSE_RATE = 40;

export const MARKET_TIERS: Record<string, { label: string; multiplier: number; description: string }> = {
  "": { label: "Select market size...", multiplier: 1.0, description: "" },
  "national": { label: "USA National Campaign", multiplier: 1.20, description: "National campaigns compete across all markets. CPL typically 15-25% above mid-size city baseline due to broad geographic competition." },
  "tier1": { label: "Major Metro (1M+ pop) — NYC, LA, Chicago, Houston, etc.", multiplier: 1.35, description: "Highest competition. CPL typically 25-45% above national average." },
  "tier2": { label: "Large City (500K–1M) — Austin, Nashville, Charlotte, etc.", multiplier: 1.15, description: "Above-average competition. CPL typically 10-20% above national average." },
  "tier3": { label: "Mid-Size City (150K–500K) — Boise, Knoxville, Reno, etc.", multiplier: 1.0, description: "Moderate competition. CPL near national average benchmarks." },
  "tier4": { label: "Small City (50K–150K) — Asheville, Bend, Duluth, etc.", multiplier: 0.85, description: "Below-average competition. CPL typically 10-20% below national average." },
  "tier5": { label: "Small Town / Rural (<50K)", multiplier: 0.70, description: "Low competition. CPL typically 25-35% below national average." },
};

export interface TargetAreaEntry {
  id: string;
  name: string;
  tier: string;
  budgetPercent: number;
}

let areaIdCounter = 1;

export default function Home() {
  const [clientInputs, setClientInputs] = useState<ClientInputsType>({
    clientName: "",
    websiteUrl: "",
    gbpDescription: "",
    industryId: "",
  });

  const [budgetInputs, setBudgetInputs] = useState<BudgetInputs>({
    monthlyAdSpend: 0,
    closeRate: DEFAULT_CLOSE_RATE,
    roundingMode: "exact",
    grossMarginPercent: null,
  });

  const [services, setServices] = useState<ServiceSelectionType[]>([]);
  const [extractedServices, setExtractedServices] = useState<ExtractedService[]>([]);
  const [targetAreas, setTargetAreas] = useState<TargetAreaEntry[]>([
    { id: `area-${areaIdCounter++}`, name: "", tier: "", budgetPercent: 100 },
  ]);

  // Compute blended market multiplier from all areas
  const blendedMultiplier = useMemo(() => {
    const areasWithTier = targetAreas.filter((a) => a.tier);
    if (areasWithTier.length === 0) return 1.0;
    const totalPercent = areasWithTier.reduce((sum, a) => sum + a.budgetPercent, 0);
    if (totalPercent === 0) return 1.0;
    const weighted = areasWithTier.reduce((sum, a) => {
      const mult = MARKET_TIERS[a.tier]?.multiplier ?? 1.0;
      return sum + mult * a.budgetPercent;
    }, 0);
    return weighted / totalPercent;
  }, [targetAreas]);

  function addArea() {
    setTargetAreas((prev) => {
      const newAreas = [...prev, { id: `area-${areaIdCounter++}`, name: "", tier: "", budgetPercent: 0 }];
      return rebalanceAreas(newAreas);
    });
  }

  function removeArea(id: string) {
    setTargetAreas((prev) => {
      const filtered = prev.filter((a) => a.id !== id);
      if (filtered.length === 0) {
        return [{ id: `area-${areaIdCounter++}`, name: "", tier: "", budgetPercent: 100 }];
      }
      return rebalanceAreas(filtered);
    });
  }

  function updateArea(id: string, field: keyof TargetAreaEntry, value: string | number) {
    setTargetAreas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  }

  function rebalanceAreas(areas: TargetAreaEntry[]): TargetAreaEntry[] {
    const even = Math.round((100 / areas.length) * 10) / 10;
    const rebalanced = areas.map((a) => ({ ...a, budgetPercent: even }));
    // Fix rounding
    const total = rebalanced.reduce((s, a) => s + a.budgetPercent, 0);
    if (Math.abs(total - 100) > 0.01 && rebalanced.length > 0) {
      rebalanced[0].budgetPercent += Math.round((100 - total) * 10) / 10;
    }
    return rebalanced;
  }

  function evenSplitAreas() {
    setTargetAreas((prev) => rebalanceAreas(prev));
  }

  const totalAreaPercent = targetAreas.reduce((s, a) => s + a.budgetPercent, 0);

  // When industry changes, reset services
  const handleClientInputsChange = useCallback(
    (newInputs: ClientInputsType) => {
      if (newInputs.industryId !== clientInputs.industryId && newInputs.industryId) {
        const benchmarks = getServicesForIndustry(newInputs.industryId);
        const newServices: ServiceSelectionType[] = benchmarks.map((b) => ({
          serviceName: b.serviceName,
          selected: false,
          allocationPercent: 0,
          cplChoice: "mid" as const,
          customCpl: null,
          customJobValue: null,
          benchmark: b,
          isManual: false,
        }));
        setServices(newServices);
        setExtractedServices([]);

        // Set recommended spend as default
        const spend = getRecommendedSpend(newInputs.industryId);
        if (spend.target && budgetInputs.monthlyAdSpend === 0) {
          setBudgetInputs((prev) => ({
            ...prev,
            monthlyAdSpend: spend.target!,
          }));
        }
      } else if (!newInputs.industryId) {
        setServices([]);
        setExtractedServices([]);
      }
      setClientInputs(newInputs);
    },
    [clientInputs.industryId, budgetInputs.monthlyAdSpend]
  );

  // Handle text extraction for service detection
  const handleTextExtract = useCallback(
    (text: string) => {
      if (!clientInputs.industryId) return;
      const benchmarks = getServicesForIndustry(clientInputs.industryId);
      const extracted = extractServicesFromText(text, benchmarks);
      setExtractedServices(extracted);

      if (extracted.length > 0) {
        setServices((prev) => {
          const updated = prev.map((s) => {
            const match = extracted.find(
              (e) => e.matchedBenchmark === s.serviceName
            );
            if (match) {
              return { ...s, selected: true };
            }
            return s;
          });

          const selectedCount = updated.filter((s) => s.selected).length;
          if (selectedCount > 0) {
            const evenSplit = Math.round((100 / selectedCount) * 10) / 10;
            for (const s of updated) {
              s.allocationPercent = s.selected ? evenSplit : 0;
            }
          }

          return updated;
        });
      }
    },
    [clientInputs.industryId]
  );

  // Industry info
  const selectedIndustry = getAllIndustries().find(
    (i) => i.id === clientInputs.industryId
  );
  const recommendedSpend = clientInputs.industryId
    ? getRecommendedSpend(clientInputs.industryId)
    : { min: null, target: null };

  const spendWarning = checkSpendWarning(
    budgetInputs.monthlyAdSpend,
    recommendedSpend.min
  );

  // Calculate results with blended market multiplier
  const result = useMemo(() => {
    const selectedServices = services.filter((s) => s.selected);
    if (
      selectedServices.length === 0 ||
      budgetInputs.monthlyAdSpend <= 0 ||
      budgetInputs.closeRate <= 0
    ) {
      return null;
    }
    if (blendedMultiplier !== 1.0) {
      const adjustedServices = services.map((s) => {
        if (!s.selected || !s.benchmark) return s;
        const adjusted = { ...s, benchmark: { ...s.benchmark } };
        if (s.cplChoice !== "custom") {
          if (adjusted.benchmark!.cplLow !== null) adjusted.benchmark!.cplLow = Math.round(adjusted.benchmark!.cplLow! * blendedMultiplier);
          if (adjusted.benchmark!.cplMid !== null) adjusted.benchmark!.cplMid = Math.round(adjusted.benchmark!.cplMid! * blendedMultiplier);
          if (adjusted.benchmark!.cplHigh !== null) adjusted.benchmark!.cplHigh = Math.round(adjusted.benchmark!.cplHigh! * blendedMultiplier);
        }
        return adjusted;
      });
      return calculate(adjustedServices, budgetInputs);
    }
    return calculate(services, budgetInputs);
  }, [services, budgetInputs, blendedMultiplier]);

  // Build area summary string for results
  const areasSummary = targetAreas
    .filter((a) => a.tier)
    .map((a) => `${a.name || MARKET_TIERS[a.tier]?.label || "Unknown"} (${a.budgetPercent}%)`)
    .join(", ");

  return (
    <div className="min-h-screen bg-cogent-ivory">
      {/* Header */}
      <header className="bg-cogent-navy px-6 py-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Image
            src="/cogent-logo.png"
            alt="Cogent Analytics"
            width={44}
            height={44}
            className="rounded"
          />
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              Google Ads ROI Calculator
            </h1>
            <p className="text-sm text-cogent-sage-light">
              Powered by Cogent Analytics
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Section A: Client Inputs */}
        <ClientInputsComponent
          value={clientInputs}
          onChange={handleClientInputsChange}
          onTextExtract={handleTextExtract}
        />

        {/* Section: Target Areas */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-cogent-navy">Target Areas</h2>
            <button
              onClick={addArea}
              className="px-3 py-1.5 text-xs font-medium bg-cogent-navy text-white rounded-md hover:bg-cogent-navy-dark transition-colors"
            >
              + Add Area
            </button>
          </div>
          <p className="text-sm text-cogent-neutral mb-4">
            Add one or more target areas. For clients targeting multiple regions, split the budget across areas — CPL will be blended accordingly.
          </p>

          <div className="space-y-3">
            {targetAreas.map((area, idx) => (
              <div key={area.id} className="border border-gray-200 rounded-md p-4 bg-cogent-ivory/30">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-cogent-navy bg-cogent-ivory px-2 py-0.5 rounded">
                    Area {idx + 1}
                  </span>
                  {targetAreas.length > 1 && (
                    <button
                      onClick={() => removeArea(area.id)}
                      className="ml-auto text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Location Name</label>
                    <input
                      type="text"
                      value={area.name}
                      onChange={(e) => updateArea(area.id, "name", e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cogent-navy focus:border-cogent-navy"
                      placeholder="e.g. Nashville, TN"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Market Size</label>
                    <select
                      value={area.tier}
                      onChange={(e) => updateArea(area.id, "tier", e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cogent-navy focus:border-cogent-navy"
                    >
                      {Object.entries(MARKET_TIERS).map(([key, tier]) => (
                        <option key={key} value={key}>{tier.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Budget Split
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={area.budgetPercent}
                        onChange={(e) => updateArea(area.id, "budgetPercent", parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 pr-7 text-sm focus:ring-2 focus:ring-cogent-navy focus:border-cogent-navy"
                      />
                      <span className="absolute right-3 top-2 text-gray-500 text-sm">%</span>
                    </div>
                  </div>
                </div>
                {area.tier && MARKET_TIERS[area.tier]?.description && (
                  <p className="mt-2 text-xs text-cogent-neutral opacity-80">
                    {MARKET_TIERS[area.tier].description}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Budget split summary */}
          {targetAreas.length > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <div className={`text-sm ${Math.abs(totalAreaPercent - 100) > 0.5 ? "text-red-600 font-medium" : "text-cogent-neutral"}`}>
                Budget allocation: {totalAreaPercent.toFixed(1)}%
                {Math.abs(totalAreaPercent - 100) > 0.5 && " — should equal 100%"}
              </div>
              <button
                onClick={evenSplitAreas}
                className="text-xs text-cogent-navy hover:underline"
              >
                Split evenly
              </button>
            </div>
          )}

          {/* Blended multiplier summary */}
          {targetAreas.some((a) => a.tier) && (
            <div className={`mt-3 p-3 rounded-md text-sm ${
              blendedMultiplier > 1 ? "bg-amber-50 border border-amber-200 text-amber-800" :
              blendedMultiplier < 1 ? "bg-green-50 border border-green-200 text-green-800" :
              "bg-gray-50 border border-gray-200 text-gray-700"
            }`}>
              <p className="font-medium">
                {targetAreas.filter((a) => a.tier).length > 1
                  ? `Blended CPL Adjustment: ${blendedMultiplier > 1 ? "+" : ""}${Math.round((blendedMultiplier - 1) * 100)}% (weighted across ${targetAreas.filter((a) => a.tier).length} areas)`
                  : `CPL Adjustment: ${blendedMultiplier > 1 ? "+" : ""}${Math.round((blendedMultiplier - 1) * 100)}%${targetAreas[0]?.name ? ` for ${targetAreas[0].name}` : ""}`
                }
              </p>
            </div>
          )}
        </section>

        {/* Section B: Service Selection */}
        <ServiceSelection
          services={services}
          onChange={setServices}
          extractedServices={extractedServices}
          industryId={clientInputs.industryId}
        />

        {/* Section C: Budget + Sales Inputs */}
        <BudgetSalesInputs
          value={budgetInputs}
          onChange={setBudgetInputs}
          recommendedMin={recommendedSpend.min}
          recommendedTarget={recommendedSpend.target}
          spendWarning={spendWarning}
        />

        {/* Section D: Results */}
        <Results
          result={result}
          roundingMode={budgetInputs.roundingMode}
          targetArea={areasSummary}
          marketTier={targetAreas.length === 1 ? targetAreas[0]?.tier : "blended"}
          marketMultiplier={blendedMultiplier}
        />

        {/* Section E: Export */}
        <ExportSummary
          clientName={clientInputs.clientName}
          industryName={selectedIndustry?.name ?? "—"}
          services={services}
          result={result}
          roundingMode={budgetInputs.roundingMode}
        />
      </main>

      {/* Footer */}
      <footer className="bg-cogent-navy px-6 py-4 mt-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/cogent-logo.png"
              alt="Cogent Analytics"
              width={28}
              height={28}
              className="rounded opacity-80"
            />
            <span className="text-xs text-gray-400">
              Cogent Analytics — Estimates are projections only and do not guarantee results.
            </span>
          </div>
          <span className="text-xs text-gray-500">
            Benchmark data sourced from published industry reports.
          </span>
        </div>
      </footer>
    </div>
  );
}
