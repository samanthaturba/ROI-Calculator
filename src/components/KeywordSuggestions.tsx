"use client";

import { useState } from "react";
import type { ServiceSelection } from "../lib/types";
import keywordData from "../data/keywords.json";

const keywords = keywordData as Record<string, string[]>;

interface Props {
  services: ServiceSelection[];
  industryId: string;
}

export default function KeywordSuggestions({ services, industryId }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const selectedServices = services.filter((s) => s.selected);

  if (!industryId || selectedServices.length === 0) {
    return null;
  }

  const serviceKeywords = selectedServices
    .map((s) => {
      const key = `${industryId}|${s.serviceName}`;
      const kws = keywords[key] || [];
      return { serviceName: s.serviceName, keywords: kws };
    })
    .filter((sk) => sk.keywords.length > 0);

  if (serviceKeywords.length === 0) return null;

  const allKeywords = serviceKeywords.flatMap((sk) => sk.keywords);

  async function copyKeywords(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-cogent-navy">Suggested Keywords</h2>
        <button
          onClick={() => copyKeywords(allKeywords.join("\n"), "all")}
          className="px-3 py-1.5 text-xs font-medium bg-cogent-navy text-white rounded-md hover:bg-cogent-navy-dark transition-colors"
        >
          {copied === "all" ? "Copied!" : "Copy All Keywords"}
        </button>
      </div>
      <p className="text-sm text-cogent-neutral mb-4">
        High-intent keywords for Google Ads campaigns based on selected services. These are starting suggestions — refine based on actual search volume and competition in your target market.
      </p>

      <div className="space-y-4">
        {serviceKeywords.map((sk) => (
          <div key={sk.serviceName} className="border border-gray-100 rounded-md p-4 bg-cogent-ivory/30">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-cogent-navy">{sk.serviceName}</h3>
              <button
                onClick={() => copyKeywords(sk.keywords.join("\n"), sk.serviceName)}
                className="text-xs text-cogent-navy hover:underline"
              >
                {copied === sk.serviceName ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {sk.keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-block px-2.5 py-1 bg-white border border-gray-200 rounded-full text-xs text-cogent-neutral-dark"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-cogent-ivory border border-gray-200 rounded-md text-xs text-cogent-neutral">
        <p className="font-medium text-cogent-navy mb-1">Tips for Rick&apos;s campaigns:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Start with exact match and phrase match for tighter control</li>
          <li>Add &quot;near me&quot; and city-name variations for local targeting</li>
          <li>Use negative keywords to filter low-intent traffic (e.g., &quot;DIY&quot;, &quot;free&quot;, &quot;how to&quot;)</li>
          <li>Monitor search terms report weekly during the first month to refine</li>
        </ul>
      </div>
    </section>
  );
}
