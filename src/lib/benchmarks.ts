import type { IndustryBenchmark, AdPlatform, PlatformRecommendation } from "./types";
import googleBenchmarkData from "../data/benchmarks.json";
import metaBenchmarkData from "../data/meta-benchmarks.json";
import linkedinBenchmarkData from "../data/linkedin-benchmarks.json";
import lsaBenchmarkData from "../data/lsa-benchmarks.json";
import platformRecommendationData from "../data/platform-recommendations.json";
import industryCloseRates from "../data/industry-close-rates.json";
import audienceInsightsData from "../data/audience-insights.json";

export interface AudienceStrategy {
  type: "event" | "prospecting" | "bizdev" | "content";
  title: string;
  detail: string;
}

export interface AudienceInsight {
  primaryBuyer: string;
  industry: string;
  searchBehavior: "high" | "medium" | "low";
  searchBehaviorNote: string;
  strategies: AudienceStrategy[];
}

const audienceInsights = audienceInsightsData as Record<string, AudienceInsight>;

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

/** All Google benchmarks across every industry — used for cross-industry service matching. */
export function getAllGoogleBenchmarks(): IndustryBenchmark[] {
  return googleBenchmarks;
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
  // Check AI registry first, then fall back to static data
  return aiPlatformRecs.get(industryId) ?? platformRecommendations[industryId] ?? null;
}

export function hasBenchmarksForPlatform(industryId: string, platform: AdPlatform): boolean {
  return getServicesForIndustry(industryId, platform).length > 0;
}

export function getIndustryCloseRate(industryId: string): { closeRate: number; source: string } {
  // Check AI registry first
  const aiRate = aiCloseRates.get(industryId);
  if (aiRate) return aiRate;
  const data = industryCloseRates as Record<string, { closeRate: number; source: string }>;
  return data[industryId] ?? { closeRate: 20, source: "General industry average" };
}

export { googleBenchmarks as benchmarks };

export function getAudienceInsights(industryId: string): AudienceInsight | null {
  return audienceInsights[industryId] ?? null;
}

// ── In-memory AI-generated industry registry ─────────────────────────────────
// Lets AI-generated industries (from website scan) flow through all existing
// benchmark lookup functions without writing to disk. Persists for the browser
// session — lost on page refresh, regenerated on next scan.

const aiIndustryStore: Map<string, { name: string; benchmarks: Record<AdPlatform, IndustryBenchmark[]> }> = new Map();
const aiPlatformRecs: Map<string, Record<AdPlatform, PlatformRecommendation>> = new Map();
const aiCloseRates: Map<string, { closeRate: number; source: string }> = new Map();

export interface AiGeneratedIndustry {
  industryId: string;
  industryName: string;
  services: IndustryBenchmark[];
  closeRate: number;
  closeRateSource: string;
  platformRecommendations: Record<AdPlatform, PlatformRecommendation>;
}

/** Register an AI-generated industry so all existing lookup functions work with it. */
export function registerAiIndustry(data: AiGeneratedIndustry): void {
  // Ensure all services have the correct industryId/Name set
  const services: IndustryBenchmark[] = data.services.map((s) => ({
    ...s,
    industryId: data.industryId,
    industryName: data.industryName,
  }));

  aiIndustryStore.set(data.industryId, {
    name: data.industryName,
    // All AI-generated services go under Google for now; the UI falls back
    // to Google benchmarks for platforms that don't have their own data
    benchmarks: {
      google: services,
      meta: [],
      linkedin: [],
      lsa: [],
    },
  });
  aiPlatformRecs.set(data.industryId, data.platformRecommendations);
  aiCloseRates.set(data.industryId, {
    closeRate: data.closeRate,
    source: data.closeRateSource,
  });
}

/** Remove a previously registered AI industry. */
export function unregisterAiIndustry(industryId: string): void {
  aiIndustryStore.delete(industryId);
  aiPlatformRecs.delete(industryId);
  aiCloseRates.delete(industryId);
}

// Patch existing functions to also check the AI registry.
// These patches shadow the originals above — order of declaration matters.
const _origGetAllIndustries = getAllIndustries;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _patchedGetAllIndustries = (platform: AdPlatform = "google") => {
  const staticList = _origGetAllIndustries(platform);
  const aiList = Array.from(aiIndustryStore.entries()).map(([id, v]) => ({ id, name: v.name }));
  // Merge: AI industries appear first (most recently generated), then static
  const staticIds = new Set(staticList.map((i) => i.id));
  const newAi = aiList.filter((i) => !staticIds.has(i.id));
  return [...newAi, ...staticList];
};

// Override module-level functions that need AI awareness
// We do this by re-exporting augmented versions.
export function getAllIndustriesWithAi(platform: AdPlatform = "google"): { id: string; name: string }[] {
  const staticList = getAllIndustries(platform);
  const aiList = Array.from(aiIndustryStore.entries()).map(([id, v]) => ({ id, name: v.name }));
  const staticIds = new Set(staticList.map((i) => i.id));
  const newAi = aiList.filter((i) => !staticIds.has(i.id));
  return [...newAi, ...staticList].sort((a, b) => {
    // AI industries sort to top
    const aIsAi = aiIndustryStore.has(a.id);
    const bIsAi = aiIndustryStore.has(b.id);
    if (aIsAi && !bIsAi) return -1;
    if (!aIsAi && bIsAi) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function getServicesForIndustryWithAi(industryId: string, platform: AdPlatform = "google"): IndustryBenchmark[] {
  const aiEntry = aiIndustryStore.get(industryId);
  if (aiEntry) {
    // For AI industries, always return Google benchmarks (used as fallback for all platforms)
    return aiEntry.benchmarks[platform].length > 0
      ? aiEntry.benchmarks[platform]
      : aiEntry.benchmarks.google;
  }
  return getServicesForIndustry(industryId, platform);
}
