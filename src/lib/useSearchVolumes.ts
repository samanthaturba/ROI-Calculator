"use client";

import { useState, useEffect } from "react";

export interface VolumeData {
  volume: number;
  keywords: string;
}

const volumeCache = new Map<string, Record<string, VolumeData>>();

export function useSearchVolumes(industryName?: string, serviceNames?: string[]) {
  const [volumes, setVolumes] = useState<Record<string, VolumeData>>({});
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState("");

  const cacheKey = industryName && serviceNames?.length
    ? `${industryName}:${[...serviceNames].sort().join(",")}`
    : "";

  useEffect(() => {
    if (!cacheKey || cacheKey === fetched) return;
    if (volumeCache.has(cacheKey)) {
      setVolumes(volumeCache.get(cacheKey)!);
      setFetched(cacheKey);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/api/search-volume", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ industryName, serviceNames }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const results = data.results ?? {};
        volumeCache.set(cacheKey, results);
        setVolumes(results);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) { setLoading(false); setFetched(cacheKey); } });
    return () => { cancelled = true; };
  }, [cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { volumes, loading };
}

export function formatVolume(v: number): string {
  if (v >= 100000) return `${Math.round(v / 1000)}K`;
  if (v >= 10000) return `${(v / 1000).toFixed(1)}K`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
}
