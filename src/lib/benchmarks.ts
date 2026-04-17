import type { IndustryBenchmark, AdPlatform, PlatformRecommendation } from "./types";
import googleBenchmarkData from "../data/benchmarks.json";
import metaBenchmarkData from "../data/meta-benchmarks.json";
import linkedinBenchmarkData from "../data/linkedin-benchmarks.json";
import lsaBenchmarkData from "../data/lsa-benchmarks.json";
import platformRecommendationData from "../data/platform-recommendations.json";
import industryCloseRates from "../data/industry-close-rates.json";

const googleBenchmarks: IndustryBenchmark[] = googleBenchmarkData as IndustryBenchmark[];
const metaBenchmarks: IndustryBenchmark[] = metaBenchmarkData as IndustryBenchmark[];
const linkedinBenchmarks: IndustryBenchmark[] = linkedinBenchmarkData as IndustryBenchmark[];
const lsaBenchmarks: IndustryBenchmark[] = lsaBenchmarkData as IndustryBenchmark[];

const platformBenchmarks: Record<AdPlatform, IndustryBenchmark[]> = {
  google: googleBenchmarks,
  meta: metaBenchmarks,
  linkedin: linkedinBenchmarks,
  lsa: lsaBenchmarks,
};

const platformRecommendations = platformRecommendationData as Record<
  string,
  Record<AdPlatform, PlatformRecommendation>
>;

function getBenchmarksForPlatform(platform: AdPlatform): IndustryBenchmark[] {
  return platformBenchmarks[platform] ?? [];
}

export function getAllIndustries(platform: AdPlatform = "google"): { id: string; name: string }[] {
  // Always use Google as the canonical industry list
  const seen = new Map<string, string>();
  for (const b of googleBenchmarks) {
    if (!seen.has(b.industryId)) {
      seen.set(b.industryId, b.industryName);
    }
  }
  // Also add any industries that only exist in the selected platform
  const benchmarks = getBenchmarksForPlatform(platform);
  for (const b of benchmarks) {
    if (!seen.has(b.industryId)) {
      seen.set(b.industryId, b.industryName);
    }
  }
  return Array.from(seen.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function searchIndustries(query: string, platform: AdPlatform = "google"): { id: string; name: string }[] {
  const q = query.toLowerCase().trim();
  if (!q) return getAllIndustries(platform);
  return getAllIndustries(platform).filter(
    (i) =>
      i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)
  );
}

export function getServicesForIndustry(industryId: string, platform: AdPlatform = "google"): IndustryBenchmark[] {
  const benchmarks = getBenchmarksForPlatform(platform);
  return benchmarks.filter((b) => b.industryId === industryId);
}

export function getRecommendedSpend(industryId: string, platform: AdPlatform = "google"): {
  min: number | null;
  target: number | null;
} {
  const services = getServicesForIndustry(industryId, platform);
  if (services.length === 0) return { min: null, target: null };

  const mins = services
    .map((s) => s.recommendedMinAdSpend)
    .filter((v): v is number => v !== null);
  const targets = services
    .map((s) => s.recommendedTargetAdSpend)
    .filter((v): v is number => v !== null);

  return {
    min: mins.length > 0 ? Math.max(...mins) : null,
    target: targets.length > 0 ? Math.max(...targets) : null,
  };
}

export function getBenchmarkForService(
  industryId: string,
  serviceName: string,
  platform: AdPlatform = "google"
): IndustryBenchmark | null {
  const benchmarks = getBenchmarksForPlatform(platform);
  return (
    benchmarks.find(
      (b) => b.industryId === industryId && b.serviceName === serviceName
    ) ?? null
  );
}

export function getPlatformRecommendations(
  industryId: string
): Record<AdPlatform, PlatformRecommendation> | null {
  return platformRecommendations[industryId] ?? null;
}

export function hasBenchmarksForPlatform(industryId: string, platform: AdPlatform): boolean {
  return getServicesForIndustry(industryId, platform).length > 0;
}

export function getIndustryCloseRate(industryId: string): { closeRate: number; source: string } {
  const data = industryCloseRates as Record<string, { closeRate: number; source: string }>;
  return data[industryId] ?? { closeRate: 20, source: "General industry average" };
}

export { googleBenchmarks as benchmarks };
