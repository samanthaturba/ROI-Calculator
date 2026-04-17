"use client";

import { useState } from "react";
import type { CalculationResult, ServiceSelection, RoundingMode, AdPlatform } from "../lib/types";
import type { TargetAreaEntry } from "../app/page";

interface Props {
  clientName: string;
  industryName: string;
  platform: AdPlatform;
  result: CalculationResult | null;
  services: ServiceSelection[];
  roundingMode: RoundingMode;
  targetAreas: TargetAreaEntry[];
  monthlyAdSpend: number;
  closeRate: number;
  closeRateIsDefault: boolean;
  grossMarginPercent: number | null;
  blendedMultiplier: number;
  websiteUrl: string;
  selectedPlatforms: AdPlatform[];
  platformAllocations: Record<AdPlatform, number>;
  platformResults: Record<AdPlatform, CalculationResult | null>;
}

async function fetchLogoAsBase64(url: string): Promise<string | undefined> {
  try {
    // Extract domain from URL
    let domain = url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!domain) return undefined;

    // Try Clearbit Logo API (high quality)
    const logoUrl = `https://logo.clearbit.com/${domain}`;
    const response = await fetch(logoUrl);
    if (!response.ok) return undefined;

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

async function getCogentLogoBase64(): Promise<string> {
  try {
    const response = await fetch("/cogent-logo.png");
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

export default function PowerPointExport({
  clientName,
  industryName,
  platform,
  result,
  services,
  roundingMode,
  targetAreas,
  monthlyAdSpend,
  closeRate,
  closeRateIsDefault,
  grossMarginPercent,
  blendedMultiplier,
  websiteUrl,
  selectedPlatforms,
  platformAllocations,
  platformResults,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");

  if (!result || result.serviceResults.length === 0) {
    return null;
  }

  async function handleGenerate() {
    setGenerating(true);
    setStatus("Preparing data...");

    try {
      // Dynamically import to keep bundle small
      const { generatePowerPoint } = await import("../lib/powerpoint");

      setStatus("Loading Cogent logo...");
      const cogentLogoBase64 = await getCogentLogoBase64();

      let clientLogoBase64: string | undefined;
      if (websiteUrl) {
        setStatus("Fetching client logo...");
        clientLogoBase64 = await fetchLogoAsBase64(websiteUrl);
      }

      setStatus("Generating PowerPoint...");
      await generatePowerPoint({
        clientName,
        industryName,
        platform,
        result: result!,
        services,
        roundingMode,
        targetAreas,
        monthlyAdSpend,
        closeRate,
        closeRateIsDefault,
        grossMarginPercent,
        blendedMultiplier,
        cogentLogoBase64,
        clientLogoBase64,
        clientWebsiteUrl: websiteUrl,
        selectedPlatforms,
        platformAllocations,
        platformResults,
      });

      setStatus("Done!");
      setTimeout(() => setStatus(""), 2000);
    } catch (err) {
      console.error("PowerPoint generation failed:", err);
      setStatus("Error generating PowerPoint. Please try again.");
      setTimeout(() => setStatus(""), 3000);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-cogent-navy mb-1">Export to PowerPoint</h2>
      <p className="text-sm text-cogent-neutral mb-4">
        Generate an editable PowerPoint presentation matching the ROAS Addendum format.
        {websiteUrl
          ? " The client logo will be pulled from their website automatically."
          : " Add the client website URL above to auto-import their logo."}
      </p>

      <div className="flex items-center gap-4">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-5 py-2.5 bg-cogent-navy text-white text-sm font-semibold rounded-md hover:bg-cogent-navy-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {generating ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Save to PowerPoint Template
            </>
          )}
        </button>

        {status && (
          <span className={`text-sm ${status.includes("Error") ? "text-red-600" : status === "Done!" ? "text-green-600 font-medium" : "text-cogent-neutral"}`}>
            {status}
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-cogent-neutral">
        Downloads an editable .pptx file you can open in PowerPoint or Google Slides to customize, add logos, and adjust formatting.
      </p>
    </section>
  );
}
