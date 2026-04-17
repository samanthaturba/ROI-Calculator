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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const industries = industrySearch
    ? searchIndustries(industrySearch)
    : getAllIndustries();

  const selectedIndustryName =
    getAllIndustries().find((i) => i.id === value.industryId)?.name ?? "";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
