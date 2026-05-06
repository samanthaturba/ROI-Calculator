"use client";

import { useState, useEffect, useRef } from "react";
import type { ClientInputs as ClientInputsType } from "../lib/types";
import { searchIndustries, getAllIndustries } from "../lib/benchmarks";
import { detectIndustries } from "../lib/industry-detection";
import type { IndustryMatch } from "../lib/industry-detection";

interface ScanResult {
  topMatches: IndustryMatch[];
  text: string;
  title: string;
}

interface Props {
  value: ClientInputsType;
  onChange: (value: ClientInputsType) => void;
  onTextExtract: (text: string) => void;
  /** Called when the user applies a website scan result — lets page.tsx handle
   *  industry + service loading atomically (avoids async state race). */
  onWebsiteScan?: (result: { industryId: string; text: string }) => void;
}

export default function ClientInputs({ value, onChange, onTextExtract, onWebsiteScan }: Props) {
  const [industrySearch, setIndustrySearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [showSecondaryPicker, setShowSecondaryPicker] = useState(false);
  const [secSearch, setSecSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const secondaryDropdownRef = useRef<HTMLDivElement>(null);

  // Scan state
  const [scanUrl, setScanUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showScanInput, setShowScanInput] = useState(false);

  const industries = industrySearch
    ? searchIndustries(industrySearch)
    : getAllIndustries();

  const selectedIndustryName =
    getAllIndustries().find((i) => i.id === value.industryId)?.name ?? "";

  const secondaryIndustries = (value.secondaryIndustryIds ?? [])
    .map((id) => getAllIndustries().find((i) => i.id === id))
    .filter(Boolean) as { id: string; name: string }[];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (secondaryDropdownRef.current && !secondaryDropdownRef.current.contains(e.target as Node)) {
        setShowSecondaryPicker(false);
        setSecSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addSecondaryIndustry(id: string) {
    if (!id || id === value.industryId) return;
    if ((value.secondaryIndustryIds ?? []).includes(id)) return;
    onChange({ ...value, secondaryIndustryIds: [...(value.secondaryIndustryIds ?? []), id] });
    setSecSearch("");
    setShowSecondaryPicker(false);
  }

  function removeSecondaryIndustry(id: string) {
    onChange({ ...value, secondaryIndustryIds: (value.secondaryIndustryIds ?? []).filter((s) => s !== id) });
  }

  function handleExtract() {
    const combined = [pastedText, value.gbpDescription].filter(Boolean).join("\n");
    if (combined.trim()) {
      onTextExtract(combined);
    }
  }

  async function handleScan() {
    const url = (scanUrl || value.websiteUrl || "").trim();
    if (!url) return;

    setScanning(true);
    setScanError("");
    setScanResult(null);

    try {
      const res = await fetch("/api/scan-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setScanError(data.error ?? "Failed to scan the website.");
        setScanning(false);
        return;
      }

      const { text, title } = data as { text: string; title: string; metaDescription: string };

      // Detect industries from the page text
      const topMatches = detectIndustries(text, 3);

      if (topMatches.length === 0) {
        setScanError(
          "Could not detect a clear industry from this site. " +
          "Try pasting the page text below, or select an industry manually."
        );
        setScanning(false);
        return;
      }

      setScanResult({ topMatches, text, title });
    } catch {
      setScanError("Network error. Check your connection and try again.");
    } finally {
      setScanning(false);
    }
  }

  function applyScanResult(industryId: string) {
    if (!scanResult) return;

    const combined = [scanResult.text, value.gbpDescription].filter(Boolean).join("\n");

    if (onWebsiteScan) {
      // Let page.tsx handle the atomic industry + services load
      onWebsiteScan({ industryId, text: combined });
      // Also update websiteUrl if the user typed in the scan input
      if (scanUrl && !value.websiteUrl) {
        onChange({ ...value, industryId });
      }
    } else {
      // Fallback: update industry via normal onChange
      onChange({ ...value, industryId });
      if (combined.trim()) onTextExtract(combined);
    }

    setScanResult(null);
    setShowScanInput(false);
    setScanUrl("");
  }

  function confidenceBadge(c: "high" | "medium" | "low") {
    if (c === "high") return "bg-green-100 text-green-700";
    if (c === "medium") return "bg-yellow-100 text-yellow-700";
    return "bg-orange-100 text-orange-700";
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-cogent-navy mb-4">Client Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Name
          </label>
          <input
            type="text"
            value={value.clientName}
            onChange={(e) => onChange({ ...value, clientName: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cogent-navy focus:border-cogent-navy"
            placeholder="e.g. Smith Plumbing LLC"
          />
        </div>

        {/* Industry Search + Select */}
        <div ref={dropdownRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Industry <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={showDropdown ? industrySearch : selectedIndustryName || industrySearch}
            onChange={(e) => {
              setIndustrySearch(e.target.value);
              setShowDropdown(true);
              if (value.industryId) {
                onChange({ ...value, industryId: "" });
              }
            }}
            onFocus={() => setShowDropdown(true)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cogent-navy focus:border-cogent-navy"
            placeholder="Search industry..."
          />
          {showDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {industries.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No matching industries found.{" "}
                  <button
                    className="text-cogent-navy underline"
                    onClick={() => {
                      onChange({ ...value, industryId: "other" });
                      setIndustrySearch("");
                      setShowDropdown(false);
                    }}
                  >
                    Select &quot;Other - Manual Input&quot;
                  </button>
                </div>
              ) : (
                industries.map((ind) => (
                  <button
                    key={ind.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-cogent-ivory focus:bg-cogent-ivory"
                    onClick={() => {
                      onChange({ ...value, industryId: ind.id });
                      setIndustrySearch("");
                      setShowDropdown(false);
                    }}
                  >
                    {ind.name}
                  </button>
                ))
              )}
            </div>
          )}
          {!value.industryId && !showDropdown && (
            <p className="mt-1 text-xs text-cogent-neutral">
              Don&apos;t see your industry? Select &quot;Other - Manual Input&quot; to enter your own CPL and job values.
            </p>
          )}
        </div>

        {/* Website URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Website URL <span className="text-gray-400">(optional)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={value.websiteUrl}
              onChange={(e) => onChange({ ...value, websiteUrl: e.target.value })}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cogent-navy focus:border-cogent-navy"
              placeholder="https://example.com"
            />
            {/* Scan button — shows when URL is present */}
            {value.websiteUrl && (
              <button
                type="button"
                onClick={() => {
                  setScanUrl(value.websiteUrl);
                  setShowScanInput(false);
                  handleScan();
                }}
                disabled={scanning}
                className="px-3 py-2 bg-cogent-navy text-white text-xs font-medium rounded-md hover:bg-cogent-navy-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                title="Scan this website to auto-detect industry and services"
              >
                {scanning ? "Scanning…" : "🔍 Scan Site"}
              </button>
            )}
          </div>
        </div>

        {/* GBP Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GBP Categories / Description <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={value.gbpDescription}
            onChange={(e) => onChange({ ...value, gbpDescription: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cogent-navy focus:border-cogent-navy"
            placeholder="e.g. Plumber, Water Heater Installation"
          />
        </div>
      </div>

      {/* ── Scan-from-URL panel (no URL yet) ─────────────────────────────────── */}
      {!value.websiteUrl && (
        <div className="mt-3">
          {!showScanInput ? (
            <button
              type="button"
              onClick={() => setShowScanInput(true)}
              className="text-xs text-cogent-navy hover:underline font-medium"
            >
              🔍 Don&apos;t know the industry? Scan from website URL
            </button>
          ) : (
            <div className="flex gap-2 items-center mt-1">
              <input
                type="url"
                value={scanUrl}
                onChange={(e) => setScanUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                placeholder="https://clientwebsite.com"
                autoFocus
                className="flex-1 border border-cogent-navy/40 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cogent-navy focus:border-cogent-navy"
              />
              <button
                type="button"
                onClick={handleScan}
                disabled={!scanUrl.trim() || scanning}
                className="px-4 py-2 bg-cogent-navy text-white text-sm font-medium rounded-md hover:bg-cogent-navy-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {scanning ? "Scanning…" : "Scan"}
              </button>
              <button
                type="button"
                onClick={() => { setShowScanInput(false); setScanUrl(""); setScanError(""); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Scan error ────────────────────────────────────────────────────────── */}
      {scanError && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <span className="text-red-500 text-sm mt-0.5">⚠</span>
          <p className="text-sm text-red-700">{scanError}</p>
          <button
            type="button"
            onClick={() => setScanError("")}
            className="ml-auto text-red-400 hover:text-red-600 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Scan result confirmation banner ──────────────────────────────────── */}
      {scanResult && (
        <div className="mt-4 p-4 bg-cogent-sage/10 border border-cogent-sage/40 rounded-lg">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <p className="text-sm font-semibold text-cogent-navy">
                🎯 Industry detected from{" "}
                <span className="font-normal italic">{scanResult.title || "website"}</span>
              </p>
              <p className="text-xs text-cogent-neutral mt-0.5">
                Select an industry to apply — services will be auto-matched from the page text.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setScanResult(null)}
              className="text-gray-400 hover:text-gray-600 text-xs shrink-0"
            >
              ✕ Dismiss
            </button>
          </div>

          <div className="space-y-2">
            {scanResult.topMatches.map((match, idx) => {
              const industryName = getAllIndustries().find((i) => i.id === match.industryId)?.name ?? match.industryId;
              return (
                <div
                  key={match.industryId}
                  className="flex items-center justify-between gap-3 p-2.5 bg-white rounded-md border border-gray-200"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {idx === 0 && (
                      <span className="text-[10px] font-bold text-cogent-navy bg-cogent-sage/30 px-1.5 py-0.5 rounded shrink-0">
                        BEST MATCH
                      </span>
                    )}
                    <span className="text-sm font-medium text-gray-900 truncate">{industryName}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${confidenceBadge(match.confidence)}`}>
                      {match.confidence} confidence
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-gray-400 hidden sm:block">
                      {match.matchedKeywords.slice(0, 3).join(", ")}
                      {match.matchedKeywords.length > 3 ? ` +${match.matchedKeywords.length - 3}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => applyScanResult(match.industryId)}
                      className="px-3 py-1 bg-cogent-navy text-white text-xs font-medium rounded hover:bg-cogent-navy-dark transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Secondary Industries — shown once a primary industry is selected */}
      {value.industryId && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-600">Industries:</span>

          {/* Primary industry chip (non-removable) */}
          <span className="text-xs bg-cogent-navy text-white px-2.5 py-1 rounded-full font-medium">
            {selectedIndustryName}
          </span>

          {/* Secondary industry chips */}
          {secondaryIndustries.map((ind) => (
            <span
              key={ind.id}
              className="flex items-center gap-1 text-xs bg-cogent-sage/20 text-cogent-navy border border-cogent-sage/40 px-2.5 py-1 rounded-full font-medium"
            >
              {ind.name}
              <button
                type="button"
                onClick={() => removeSecondaryIndustry(ind.id)}
                className="text-cogent-neutral hover:text-red-500 leading-none ml-0.5"
                title="Remove industry"
              >
                ×
              </button>
            </span>
          ))}

          {/* Add secondary industry picker */}
          {!showSecondaryPicker ? (
            <button
              type="button"
              onClick={() => setShowSecondaryPicker(true)}
              className="text-xs text-cogent-navy hover:underline font-medium border border-dashed border-cogent-navy/40 px-2.5 py-1 rounded-full"
            >
              + Add industry
            </button>
          ) : (
            <div ref={secondaryDropdownRef} className="relative inline-block">
              <input
                type="text"
                value={secSearch}
                onChange={(e) => setSecSearch(e.target.value)}
                placeholder="Search industry..."
                autoFocus
                className="border border-cogent-navy/50 rounded-full px-3 py-1 text-xs w-48 focus:ring-1 focus:ring-cogent-navy focus:outline-none"
              />
              <div className="absolute z-30 left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {(secSearch ? searchIndustries(secSearch) : getAllIndustries())
                  .filter(
                    (i) =>
                      i.id !== value.industryId &&
                      !(value.secondaryIndustryIds ?? []).includes(i.id)
                  )
                  .map((ind) => (
                    <button
                      key={ind.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-cogent-ivory focus:bg-cogent-ivory"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addSecondaryIndustry(ind.id);
                      }}
                    >
                      {ind.name}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {secondaryIndustries.length > 0 && (
            <span className="text-xs text-cogent-neutral">
              — services from all industries merged into service list
            </span>
          )}
        </div>
      )}

      {/* Ecommerce Toggle */}
      <div className="mt-4 flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
        <div className="flex items-center h-5 mt-0.5">
          <input
            type="checkbox"
            id="isEcommerce"
            checked={value.isEcommerce ?? false}
            onChange={(e) => onChange({ ...value, isEcommerce: e.target.checked })}
            className="h-4 w-4 text-cogent-navy rounded border-gray-300 focus:ring-cogent-navy"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="isEcommerce" className="text-sm font-medium text-gray-700 cursor-pointer">
            Does this client sell products online (ecommerce)?
          </label>
          <p className="text-xs text-gray-500 mt-0.5">
            Required for Google Shopping / Google Merchant Center campaigns. Ecommerce ad management involves significantly more setup, feed management, and ongoing optimization than standard lead-gen.
          </p>
          {value.isEcommerce && (
            <div className="mt-2 flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
              <span className="text-amber-600 text-sm mt-0.5">⚠️</span>
              <p className="text-xs text-amber-800 font-medium">
                Ecommerce campaigns require Google Merchant Center setup and management. This is considerably more labor-intensive than standard PPC — factor this into your management fee and client expectations.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Paste Website / Service Text */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Paste website text or service descriptions{" "}
          <span className="text-gray-400">(optional — helps detect services)</span>
        </label>
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cogent-navy focus:border-cogent-navy"
          placeholder="Paste homepage text, service page content, or business description here..."
        />
        <button
          onClick={handleExtract}
          disabled={!pastedText.trim() && !value.gbpDescription.trim()}
          className="mt-2 px-4 py-2 bg-cogent-navy text-white text-sm font-medium rounded-md hover:bg-cogent-navy-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Detect Services from Text
        </button>
        {!value.industryId && (pastedText.trim() || value.gbpDescription.trim()) && (
          <p className="mt-1 text-xs text-amber-600">
            Select an industry first to match services against benchmarks.
          </p>
        )}
      </div>
    </section>
  );
}
