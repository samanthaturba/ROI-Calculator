import type { IndustryBenchmark } from "./types";
import benchmarkData from "../data/benchmarks.json";

const benchmarks: IndustryBenchmark[] = benchmarkData as IndustryBenchmark[];

export function getAllIndustries(): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const b of benchmarks) {
    if (!seen.has(b.industryId)) {
      seen.set(b.industryId, b.industryName);
    }
  }
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
}

export function searchIndustries(query: string): { id: string; name: string }[] {
  const q = query.toLowerCase().trim();
  if (!q) return getAllIndustries();
  return getAllIndustries().filter(
    (i) =>
      i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)
  );
}

export function getServicesForIndustry(industryId: string): IndustryBenchmark[] {
  return benchmarks.filter((b) => b.industryId === industryId);
}

export function getRecommendedSpend(industryId: string): {
  min: number | null;
  target: number | null;
} {
  const services = getServicesForIndustry(industryId);
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
  serviceName: string
): IndustryBenchmark | null {
  return (
    benchmarks.find(
      (b) => b.industryId === industryId && b.serviceName === serviceName
    ) ?? null
  );
}

export { benchmarks };
