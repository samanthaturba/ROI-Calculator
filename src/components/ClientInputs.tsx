"use client";

import { useState, useEffect, useRef } from "react";
import type { ClientInputs as ClientInputsType } from "../lib/types";
import { searchIndustries, getAllIndustries } from "../lib/benchmarks";

interface Props {
  value: ClientInputsType;
  onChange: (value: ClientInputsType) => void;
  onTextExtract: (text: string) => void;
}

export default function ClientInputs({ value, onChange, onTextExtract }: Props) {
  const [industrySearch, setIndustrySearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [showSecondaryPicker, setShowSecondaryPicker] = useState(false);
  const [secSearch, setSecSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const secondaryDropdownRef = useRef<HTMLDivElement>(null);

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
          <input
            type="url"
            value={value.websiteUrl}
            onChange={(e) => onChange({ ...value, websiteUrl: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cogent-navy focus:border-cogent-navy"
            placeholder="https://example.com"
          />
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
