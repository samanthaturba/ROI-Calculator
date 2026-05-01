"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import citiesRaw from "../data/us-cities.json";

interface CityEntry {
  city: string;
  state: string;
  tier: string;
}

const CITIES: CityEntry[] = citiesRaw as CityEntry[];

// Tier labels for the auto-fill badge
const TIER_LABELS: Record<string, string> = {
  tier1: "Major Metro",
  tier2: "Large City",
  tier3: "Mid-Size City",
  tier4: "Small City",
  tier5: "Small Town / Rural",
};

export interface CitySearchResult {
  displayName: string; // "Charlotte, NC"
  city: string;
  state: string;
  tier: string;
}

interface Props {
  value: string;
  onSelect: (result: CitySearchResult) => void;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CitySearch({ value, onSelect, onChange, placeholder, className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIdx, setActiveIdx] = useState(-1);

  // Sync query with controlled value when value changes externally (e.g. load from save)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = useCallback((): CityEntry[] => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return CITIES.filter((c) => {
      const full = `${c.city}, ${c.state}`.toLowerCase();
      const cityOnly = c.city.toLowerCase();
      return full.startsWith(q) || cityOnly.startsWith(q);
    })
      .sort((a, b) => {
        // Prioritize exact city name matches, then alphabetical
        const aq = a.city.toLowerCase().startsWith(query.trim().toLowerCase()) ? 0 : 1;
        const bq = b.city.toLowerCase().startsWith(query.trim().toLowerCase()) ? 0 : 1;
        if (aq !== bq) return aq - bq;
        return a.city.localeCompare(b.city);
      })
      .slice(0, 10);
  }, [query]);

  const suggestions = filtered();

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setOpen(true);
    setActiveIdx(-1);
  }

  function selectCity(city: CityEntry) {
    const displayName = `${city.city}, ${city.state}`;
    setQuery(displayName);
    setOpen(false);
    setActiveIdx(-1);
    onSelect({ displayName, city: city.city, state: city.state, tier: city.tier });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      selectCity(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Close on click outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => query.length >= 2 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "e.g. Charlotte, NC"}
        className={
          className ??
          "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cogent-navy focus:border-cogent-navy"
        }
        autoComplete="off"
        spellCheck={false}
      />

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((city, i) => (
            <li
              key={`${city.city}-${city.state}`}
              onMouseDown={(e) => {
                e.preventDefault();
                selectCity(city);
              }}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer text-sm select-none ${
                i === activeIdx
                  ? "bg-cogent-navy text-white"
                  : "hover:bg-cogent-ivory text-gray-800"
              }`}
            >
              <span>
                <span className="font-medium">{city.city}</span>
                <span className={i === activeIdx ? "text-white/80" : "text-gray-500"}>
                  , {city.state}
                </span>
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ml-2 shrink-0 ${
                  i === activeIdx
                    ? "bg-white/20 text-white"
                    : "bg-cogent-sage/20 text-cogent-navy"
                }`}
              >
                {TIER_LABELS[city.tier] ?? city.tier}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
