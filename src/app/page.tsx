"use client";

import { useState, useMemo, useCallback } from "react";
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

  // Calculate results
  const result = useMemo(() => {
    const selectedServices = services.filter((s) => s.selected);
    if (
      selectedServices.length === 0 ||
      budgetInputs.monthlyAdSpend <= 0 ||
      budgetInputs.closeRate <= 0
    ) {
      return null;
    }
    return calculate(services, budgetInputs);
  }, [services, budgetInputs]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">
            Google Ads ROI Calculator
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Estimate revenue potential based on industry benchmarks, service mix, and close rate.
          </p>
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
        <Results result={result} roundingMode={budgetInputs.roundingMode} />

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
      <footer className="border-t border-gray-200 px-6 py-4 mt-8">
        <div className="max-w-5xl mx-auto text-xs text-gray-400">
          ROI Calculator — All benchmark data marked as seed data should be replaced with researched values before client use.
          Estimates are projections only and do not guarantee results.
        </div>
      </footer>
    </div>
  );
}
