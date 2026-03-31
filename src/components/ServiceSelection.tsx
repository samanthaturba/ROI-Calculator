"use client";

import { useState } from "react";
import type { ServiceSelection as ServiceSelectionType, ExtractedService, CplChoice } from "../lib/types";

interface Props {
  services: ServiceSelectionType[];
  onChange: (services: ServiceSelectionType[]) => void;
  extractedServices: ExtractedService[];
  industryId: string;
}

export default function ServiceSelection({
  services,
  onChange,
  extractedServices,
  industryId,
}: Props) {
  const [newServiceName, setNewServiceName] = useState("");

  if (!industryId) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Service Selection</h2>
        <p className="text-sm text-gray-500">Select an industry above to see available services.</p>
      </section>
    );
  }

  const selectedCount = services.filter((s) => s.selected).length;

  function toggleService(index: number) {
    const updated = [...services];
    updated[index] = { ...updated[index], selected: !updated[index].selected };
    // Auto-rebalance allocation
    const selectedServices = updated.filter((s) => s.selected);
    if (selectedServices.length > 0) {
      const evenSplit = Math.round((100 / selectedServices.length) * 10) / 10;
      for (const s of updated) {
        s.allocationPercent = s.selected ? evenSplit : 0;
      }
      // Fix rounding to sum to 100
      const total = selectedServices.length * evenSplit;
      if (Math.abs(total - 100) > 0.01 && selectedServices.length > 0) {
        const firstSelected = updated.find((s) => s.selected);
        if (firstSelected) {
          firstSelected.allocationPercent += 100 - total;
          firstSelected.allocationPercent = Math.round(firstSelected.allocationPercent * 10) / 10;
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
      {
        serviceName: name,
        selected: true,
        allocationPercent: 0,
        cplChoice: "custom",
        customCpl: null,
        customJobValue: null,
        benchmark: null,
        isManual: true,
      },
    ];

    // Rebalance
    const selectedServices = updated.filter((s) => s.selected);
    const evenSplit = Math.round((100 / selectedServices.length) * 10) / 10;
    for (const s of updated) {
      s.allocationPercent = s.selected ? evenSplit : 0;
    }

    onChange(updated);
    setNewServiceName("");
  }

  function removeManualService(index: number) {
    const updated = services.filter((_, i) => i !== index);
    const selectedServices = updated.filter((s) => s.selected);
    if (selectedServices.length > 0) {
      const evenSplit = Math.round((100 / selectedServices.length) * 10) / 10;
      for (const s of updated) {
        s.allocationPercent = s.selected ? evenSplit : 0;
      }
    }
    onChange(updated);
  }

  const totalAllocation = services
    .filter((s) => s.selected)
    .reduce((sum, s) => sum + s.allocationPercent, 0);

  const confidenceLabel: Record<string, string> = {
    high: "High confidence",
    medium: "Medium confidence",
    low: "Suggested (low confidence)",
  };

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Service Selection</h2>
      <p className="text-sm text-gray-500 mb-4">
        {selectedCount} service{selectedCount !== 1 ? "s" : ""} selected
        {selectedCount > 0 && (
          <span className={Math.abs(totalAllocation - 100) > 0.5 ? "text-red-600 ml-2 font-medium" : "text-gray-400 ml-2"}>
            (allocation: {totalAllocation.toFixed(1)}%)
          </span>
        )}
      </p>

      {/* Extracted services notice */}
      {extractedServices.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm font-medium text-blue-800 mb-1">
            Suggested services found from website text:
          </p>
          <ul className="text-sm text-blue-700">
            {extractedServices.map((es) => (
              <li key={es.name}>
                {es.name} — <span className="text-blue-500">{confidenceLabel[es.confidence] ?? es.confidence}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-blue-600 mt-1">
            Review and confirm the selections below. These are suggestions, not certainties.
          </p>
        </div>
      )}

      {/* Service list */}
      <div className="space-y-3">
        {services.map((service, index) => (
          <div
            key={service.serviceName}
            className={`border rounded-md p-3 transition-colors ${
              service.selected ? "border-blue-300 bg-blue-50/30" : "border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={service.selected}
                onChange={() => toggleService(index)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-900 flex-1">
                {service.serviceName}
                {service.isManual && (
                  <span className="ml-2 text-xs text-amber-600 font-normal">(manually added)</span>
                )}
              </span>
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
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>

            {service.selected && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 pl-7">
                {/* Allocation */}
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
                </div>

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
                    placeholder={service.benchmark?.avgJobValue ? `$${service.benchmark.avgJobValue} (benchmark)` : "Enter value"}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  {service.benchmark?.avgJobValue && service.customJobValue === null && (
                    <span className="text-xs text-gray-400">Benchmark: ${service.benchmark.avgJobValue}</span>
                  )}
                </div>

                {/* Benchmark info */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Info</label>
                  {service.benchmark ? (
                    <div className="text-xs text-gray-500">
                      <div>CPL range: ${service.benchmark.cplLow}–${service.benchmark.cplHigh}</div>
                      {service.benchmark.notes && (
                        <div className="text-amber-600 mt-0.5">{service.benchmark.notes}</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-amber-600">
                      No benchmark available. Using custom values.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add manual service */}
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
          className="px-4 py-2 bg-gray-700 text-white text-sm rounded-md hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
    </section>
  );
}
