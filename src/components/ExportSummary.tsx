"use client";

import { useState } from "react";
import type { CalculationResult, ServiceSelection as ServiceSelectionType, RoundingMode } from "../lib/types";
import { generateClientSummary, generateInternalSummary } from "../lib/calculations";

interface Props {
  clientName: string;
  industryName: string;
  services: ServiceSelectionType[];
  result: CalculationResult | null;
  roundingMode: RoundingMode;
}

export default function ExportSummary({
  clientName,
  industryName,
  services,
  result,
  roundingMode,
}: Props) {
  const [copied, setCopied] = useState<"client" | "internal" | null>(null);

  if (!result || result.serviceResults.length === 0) {
    return null;
  }

  const clientSummary = generateClientSummary(clientName, result, roundingMode);
  const internalSummary = generateInternalSummary(
    clientName,
    industryName,
    services,
    result,
    roundingMode
  );

  async function copyToClipboard(text: string, type: "client" | "internal") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-cogent-navy mb-4">Export Summary</h2>

      {/* Client-facing summary */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Client-Facing Summary</h3>
          <button
            onClick={() => copyToClipboard(clientSummary, "client")}
            className="px-3 py-1 text-xs bg-cogent-navy text-white rounded hover:bg-cogent-navy-dark transition-colors"
          >
            {copied === "client" ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 whitespace-pre-wrap">
          {clientSummary}
        </div>
      </div>

      {/* Internal summary */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Internal Notes</h3>
          <button
            onClick={() => copyToClipboard(internalSummary, "internal")}
            className="px-3 py-1 text-xs bg-cogent-neutral-dark text-white rounded hover:bg-cogent-navy transition-colors"
          >
            {copied === "internal" ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 whitespace-pre-wrap font-mono text-xs">
          {internalSummary}
        </pre>
      </div>
    </section>
  );
}
