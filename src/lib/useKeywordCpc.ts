"use client";

import { useState, useEffect, useRef } from "react";

export interface KeywordCpcData {
  keyword: string;
  cpcLow: number | null;
  cpcMid: number | null;
  cpcHigh: number | null;
  avgMonthlySearches: number | null;
  competitionLevel: string | null;
}

export interface KeywordCpcState {
  data: Map<string, KeywordCpcData>;
  loading: boolean;
  configured: boolean;
  error: string | null;
}

const DEFAULT_CONVERSION_RATE = 0.05;

export function cpcToCpl(cpc: number | null, conversionRate = DEFAULT_CONVERSION_RATE): number | null {
  if (cpc === null || cpc <= 0 || conversionRate <= 0) return null;
  return Math.round(cpc / conversionRate);
}

export function useKeywordCpc(keywords: string[]): KeywordCpcState {
  const [state, setState] = useState<KeywordCpcState>({
    data: new Map(),
    loading: false,
    configured: true,
    error: null,
  });

  const prevKeyRef = useRef<string>("");

  useEffect(() => {
    const sorted = [...keywords].sort();
    const key = sorted.join("|").toLowerCase();

    if (key === prevKeyRef.current || sorted.length === 0) return;
    prevKeyRef.current = key;

    const controller = new AbortController();

    async function fetchCpc() {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const res = await fetch("/api/keyword-cpc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: sorted.slice(0, 20) }),
          signal: controller.signal,
        });

        const json = await res.json();

        if (!res.ok) {
          setState((prev) => ({
            ...prev,
            loading: false,
            configured: json.configured ?? false,
            error: json.error ?? `HTTP ${res.status}`,
          }));
          return;
        }

        const map = new Map<string, KeywordCpcData>();
        for (const r of json.results ?? []) {
          map.set(r.keyword.toLowerCase(), {
            keyword: r.keyword,
            cpcLow: r.cpcLow,
            cpcMid: r.cpcMid,
            cpcHigh: r.cpcHigh,
            avgMonthlySearches: r.avgMonthlSearches ?? r.avgMonthlySearches ?? null,
            competitionLevel: r.competitionLevel,
          });
        }

        setState({
          data: map,
          loading: false,
          configured: true,
          error: null,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: (err as Error).message,
        }));
      }
    }

    fetchCpc();
    return () => controller.abort();
  }, [keywords]);

  return state;
}
