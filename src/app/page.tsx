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

const MARKET_TIERS: Record<string, { label: string; multiplier: number; description: string }> = {
  "": { label: "Select market size...", multiplier: 1.0, description: "" },
  "tier1": { label: "Major Metro (1M+ pop) — NYC, LA, Chicago, Houston, etc.", multiplier: 1.35, description: "Highest competition. CPL typically 25-45% above national average." },
  "tier2": { label: "Large City (500K–1M) — Austin, Nashville, Charlotte, etc.", multiplier: 1.15, description: "Above-average competition. CPL typically 10-20% above national average." },
  "tier3": { label: "Mid-Size City (150K–500K) — Boise, Knoxville, Reno, etc.", multiplier: 1.0, description: "Moderate competition. CPL near national average benchmarks." },
  "tier4": { label: "Small City (50K–150K) — Asheville, Bend, Duluth, etc.", multiplier: 0.85, description: "Below-average competition. CPL typically 10-20% below national average." },
  "tier5": { label: "Small Town / Rural (<50K)", multiplier: 0.70, description: "Low competition. CPL typically 25-35% below national average." },
};

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
  const [targetArea, setTargetArea] = useState("");
  const [marketTier, setMarketTier] = useState("");

  const marketMultiplier = MARKET_TIERS[marketTier]?.multiplier ?? 1.0;
  const marketInfo = MARKET_TIERS[marketTier];

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

      // Auto-select extracted services
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

          // Rebalance allocations
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

  // Calculate results with market tier adjustment
  const result = useMemo(() => {
    const selectedServices = services.filter((s) => s.selected);
    if (
      selectedServices.length === 0 ||
      budgetInputs.monthlyAdSpend <= 0 ||
      budgetInputs.closeRate <= 0
    ) {
      return null;
    }
    // Apply market multiplier to CPL by adjusting services temporarily
    if (marketMultiplier !== 1.0) {
      const adjustedServices = services.map((s) => {
        if (!s.selected || !s.benchmark) return s;
        const adjusted = { ...s, benchmark: { ...s.benchmark } };
        if (s.cplChoice !== "custom") {
          if (adjusted.benchmark!.cplLow !== null) adjusted.benchmark!.cplLow = Math.round(adjusted.benchmark!.cplLow! * marketMultiplier);
          if (adjusted.benchmark!.cplMid !== null) adjusted.benchmark!.cplMid = Math.round(adjusted.benchmark!.cplMid! * marketMultiplier);
          if (adjusted.benchmark!.cplHigh !== null) adjusted.benchmark!.cplHigh = Math.round(adjusted.benchmark!.cplHigh! * marketMultiplier);
        }
        return adjusted;
      });
      return calculate(adjustedServices, budgetInputs);
    }
    return calculate(services, budgetInputs);
  }, [services, budgetInputs, marketMultiplier]);

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

        {/* Section: Target Area */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-cogent-navy mb-1">Target Area</h2>
          <p className="text-sm text-cogent-neutral mb-4">
            Adjust CPL estimates based on your client&apos;s market size. Larger markets have more competition and higher costs per lead.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Location <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={targetArea}
                onChange={(e) => setTargetArea(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cogent-navy focus:border-cogent-navy"
                placeholder="e.g. Nashville, TN or Greater Phoenix Area"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Market Size <span className="text-red-500">*</span>
              </label>
              <select
                value={marketTier}
                onChange={(e) => setMarketTier(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cogent-navy focus:border-cogent-navy"
              >
                {Object.entries(MARKET_TIERS).map(([key, tier]) => (
                  <option key={key} value={key}>{tier.label}</option>
                ))}
              </select>
            </div>
          </div>
          {marketInfo && marketInfo.description && (
            <div className={`mt-3 p-3 rounded-md text-sm ${
              marketMultiplier > 1 ? "bg-amber-50 border border-amber-200 text-amber-800" :
              marketMultiplier < 1 ? "bg-green-50 border border-green-200 text-green-800" :
              "bg-gray-50 border border-gray-200 text-gray-700"
            }`}>
              <p className="font-medium">
                CPL Adjustment: {marketMultiplier > 1 ? "+" : ""}{Math.round((marketMultiplier - 1) * 100)}%
                {targetArea && <span className="font-normal"> for {targetArea}</span>}
              </p>
              <p className="text-xs mt-0.5 opacity-80">{marketInfo.description}</p>
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
          targetArea={targetArea}
          marketTier={marketTier}
          marketMultiplier={marketMultiplier}
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
