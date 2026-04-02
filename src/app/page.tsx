"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import type {
  ClientInputs as ClientInputsType,
  BudgetInputs,
  ServiceSelection as ServiceSelectionType,
  ExtractedService,
  AdPlatform,
} from "../lib/types";
import {
  getAllIndustries,
  getServicesForIndustry,
  getRecommendedSpend,
  getPlatformRecommendations,
  hasBenchmarksForPlatform,
} from "../lib/benchmarks";
import { calculate, checkSpendWarning } from "../lib/calculations";
import { extractServicesFromText } from "../lib/service-extraction";

import ClientInputsComponent from "../components/ClientInputs";
import ServiceSelection from "../components/ServiceSelection";
import BudgetSalesInputs from "../components/BudgetSalesInputs";
import Results from "../components/Results";
import KeywordSuggestions from "../components/KeywordSuggestions";
import ExportSummary from "../components/ExportSummary";
import SaveLoad from "../components/SaveLoad";
import PlatformRecommendations from "../components/PlatformRecommendations";

const DEFAULT_CLOSE_RATE = 40;

const PLATFORM_INFO: Record<AdPlatform, { label: string; icon: string; description: string }> = {
  google: {
    label: "Google Ads",
    icon: "🔍",
    description: "Search-based ads targeting high-intent users actively looking for services",
  },
  meta: {
    label: "Meta Ads",
    icon: "📱",
    description: "Facebook & Instagram ads for awareness, retargeting, and lead generation",
  },
  linkedin: {
    label: "LinkedIn Ads",
    icon: "💼",
    description: "Professional targeting for B2B services, C-suite decision makers",
  },
};

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
  const [platform, setPlatform] = useState<AdPlatform>("google");

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

  // When platform changes, reload services for the current industry
  function handlePlatformChange(newPlatform: AdPlatform) {
    setPlatform(newPlatform);
    if (clientInputs.industryId) {
      const benchmarks = getServicesForIndustry(clientInputs.industryId, newPlatform);
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

      // Update recommended spend for this platform
      const spend = getRecommendedSpend(clientInputs.industryId, newPlatform);
      if (spend.target) {
        setBudgetInputs((prev) => ({
          ...prev,
          monthlyAdSpend: spend.target!,
        }));
      }
    }
  }

  // When industry changes, reset services
  const handleClientInputsChange = useCallback(
    (newInputs: ClientInputsType) => {
      if (newInputs.industryId !== clientInputs.industryId && newInputs.industryId) {
        const benchmarks = getServicesForIndustry(newInputs.industryId, platform);
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
        const spend = getRecommendedSpend(newInputs.industryId, platform);
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
    [clientInputs.industryId, budgetInputs.monthlyAdSpend, platform]
  );

  // Handle text extraction for service detection
  const handleTextExtract = useCallback(
    (text: string) => {
      if (!clientInputs.industryId) return;
      const benchmarks = getServicesForIndustry(clientInputs.industryId, platform);
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
    [clientInputs.industryId, platform]
  );

  // Industry info
  const selectedIndustry = getAllIndustries(platform).find(
    (i) => i.id === clientInputs.industryId
  );
  const recommendedSpend = clientInputs.industryId
    ? getRecommendedSpend(clientInputs.industryId, platform)
    : { min: null, target: null };

  const spendWarning = checkSpendWarning(
    budgetInputs.monthlyAdSpend,
    recommendedSpend.min
  );

  // Platform recommendations for the selected industry
  const platformRecs = clientInputs.industryId
    ? getPlatformRecommendations(clientInputs.industryId)
    : null;

  // Check if current platform has benchmarks for selected industry
  const platformHasBenchmarks = clientInputs.industryId
    ? hasBenchmarksForPlatform(clientInputs.industryId, platform)
    : true;

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

  // Save/Load state management
  const getCurrentState = useCallback(() => {
    return {
      version: 2,
      platform,
      clientInputs,
      budgetInputs,
      targetAreas,
      services: services.map((s) => ({
        serviceName: s.serviceName,
        selected: s.selected,
        allocationPercent: s.allocationPercent,
        cplChoice: s.cplChoice,
        customCpl: s.customCpl,
        customJobValue: s.customJobValue,
        isManual: s.isManual,
      })),
    };
  }, [clientInputs, budgetInputs, targetAreas, services, platform]);

  const loadSavedState = useCallback((data: Record<string, unknown>) => {
    try {
      const d = data as {
        platform?: AdPlatform;
        clientInputs?: ClientInputsType;
        budgetInputs?: BudgetInputs;
        targetAreas?: TargetAreaEntry[];
        services?: Array<{
          serviceName: string;
          selected: boolean;
          allocationPercent: number;
          cplChoice: "low" | "mid" | "high" | "custom";
          customCpl: number | null;
          customJobValue: number | null;
          isManual: boolean;
        }>;
      };

      const loadPlatform = d.platform ?? "google";
      setPlatform(loadPlatform);

      if (d.clientInputs) {
        setClientInputs(d.clientInputs);
        // Load services for this industry
        if (d.clientInputs.industryId) {
          const benchmarks = getServicesForIndustry(d.clientInputs.industryId, loadPlatform);
          const loadedServices: ServiceSelectionType[] = benchmarks.map((b) => {
            const saved = d.services?.find((s) => s.serviceName === b.serviceName);
            return {
              serviceName: b.serviceName,
              selected: saved?.selected ?? false,
              allocationPercent: saved?.allocationPercent ?? 0,
              cplChoice: saved?.cplChoice ?? ("mid" as const),
              customCpl: saved?.customCpl ?? null,
              customJobValue: saved?.customJobValue ?? null,
              benchmark: b,
              isManual: false,
            };
          });
          // Add any manually added services
          const manualServices = d.services?.filter((s) => s.isManual) ?? [];
          for (const ms of manualServices) {
            loadedServices.push({
              serviceName: ms.serviceName,
              selected: ms.selected,
              allocationPercent: ms.allocationPercent,
              cplChoice: ms.cplChoice,
              customCpl: ms.customCpl,
              customJobValue: ms.customJobValue,
              benchmark: null,
              isManual: true,
            });
          }
          setServices(loadedServices);
        }
      }
      if (d.budgetInputs) setBudgetInputs(d.budgetInputs);
      if (d.targetAreas) setTargetAreas(d.targetAreas);
    } catch {
      alert("Could not load saved data. The file may be from an incompatible version.");
    }
  }, []);

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
              Ad ROI Calculator
            </h1>
            <p className="text-sm text-cogent-sage-light">
              Powered by Cogent Analytics
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Platform Selector */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-cogent-navy mb-1">Ad Platform</h2>
          <p className="text-sm text-cogent-neutral mb-4">
            Select which advertising platform to calculate ROI for. Each platform has different benchmarks, cost structures, and strengths.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(Object.entries(PLATFORM_INFO) as [AdPlatform, typeof PLATFORM_INFO[AdPlatform]][]).map(
              ([key, info]) => (
                <button
                  key={key}
                  onClick={() => handlePlatformChange(key)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    platform === key
                      ? "border-cogent-navy bg-cogent-navy/5 ring-1 ring-cogent-navy/20"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{info.icon}</span>
                    <span className={`font-semibold ${platform === key ? "text-cogent-navy" : "text-gray-700"}`}>
                      {info.label}
                    </span>
                    {platform === key && (
                      <span className="ml-auto text-[10px] font-medium text-white bg-cogent-navy px-2 py-0.5 rounded-full">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-cogent-neutral">{info.description}</p>
                </button>
              )
            )}
          </div>
        </section>

        {/* Section A: Client Inputs */}
        <ClientInputsComponent
          value={clientInputs}
          onChange={handleClientInputsChange}
          onTextExtract={handleTextExtract}
        />

        {/* Platform Recommendations (shown when industry is selected) */}
        {clientInputs.industryId && platformRecs && (
          <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-cogent-navy mb-1">
              Platform Fit — {selectedIndustry?.name ?? "Industry"}
            </h2>
            <p className="text-sm text-cogent-neutral mb-4">
              How well each advertising platform performs for this industry based on audience behavior, lead quality, and historical data.
            </p>
            <PlatformRecommendations
              recommendations={platformRecs}
              currentPlatform={platform}
              industryName={selectedIndustry?.name ?? "this industry"}
            />
          </section>
        )}

        {/* No benchmarks warning */}
        {clientInputs.industryId && !platformHasBenchmarks && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>No benchmark data available</strong> for {selectedIndustry?.name ?? "this industry"} on {PLATFORM_INFO[platform].label}.
              {platformRecs && platformRecs[platform].rating <= 2 && (
                <> This platform is <strong>not recommended</strong> for this industry. Consider switching to a higher-rated platform above.</>
              )}
              {" "}You can still add custom services and enter your own CPL/job values manually.
            </p>
          </div>
        )}

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
          platform={platform}
        />

        {/* Section E: Keyword Suggestions (Google only) */}
        {platform === "google" && (
          <KeywordSuggestions
            services={services}
            industryId={clientInputs.industryId}
          />
        )}

        {/* Section F: Export */}
        <ExportSummary
          clientName={clientInputs.clientName}
          industryName={selectedIndustry?.name ?? "—"}
          services={services}
          result={result}
          roundingMode={budgetInputs.roundingMode}
        />

        {/* Section G: Save & Load */}
        <SaveLoad
          getCurrentState={getCurrentState}
          loadState={loadSavedState}
          clientName={clientInputs.clientName}
          industryName={selectedIndustry?.name ?? "—"}
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
