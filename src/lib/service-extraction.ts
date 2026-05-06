import type { ExtractedService, IndustryBenchmark } from "./types";

/**
 * Extract potential services from pasted text (website content, GBP description, etc.)
 * Phase 1 — matches against the selected industry's benchmark data (exact/keyword).
 * Phase 2 — for unmatched terms, searches all benchmarks for the closest proxy service
 *            from any industry and suggests it as a cross-industry match.
 */
export function extractServicesFromText(
  text: string,
  industryBenchmarks: IndustryBenchmark[],
  allBenchmarks: IndustryBenchmark[] = []
): ExtractedService[] {
  if (!text.trim()) return [];

  const normalizedText = text.toLowerCase();
  const results: ExtractedService[] = [];
  const matchedServiceNames = new Set<string>();

  // ── Phase 1: match against current industry benchmarks ───────────────────
  for (const benchmark of industryBenchmarks) {
    const serviceName = benchmark.serviceName.toLowerCase();
    const serviceWords = serviceName.split(/\s+/);

    // Exact match
    if (normalizedText.includes(serviceName)) {
      results.push({
        name: benchmark.serviceName,
        confidence: "high",
        matchedBenchmark: benchmark.serviceName,
      });
      matchedServiceNames.add(serviceName);
      continue;
    }

    // All significant words present (multi-word service names)
    if (serviceWords.length > 1) {
      const significantWords = serviceWords.filter(
        (w) => w.length > 2 && !["and", "the", "for", "of", "&"].includes(w)
      );
      const allFound = significantWords.every((word) =>
        normalizedText.includes(word)
      );
      if (allFound && significantWords.length >= 2) {
        results.push({
          name: benchmark.serviceName,
          confidence: "medium",
          matchedBenchmark: benchmark.serviceName,
        });
        matchedServiceNames.add(serviceName);
        continue;
      }
    }

    // Primary keyword match (single strong word)
    const primaryWord = serviceWords.find(
      (w) =>
        w.length > 3 &&
        !["repair", "installation", "service", "cleaning", "maintenance", "replacement"].includes(w)
    );
    if (primaryWord && normalizedText.includes(primaryWord)) {
      results.push({
        name: benchmark.serviceName,
        confidence: "low",
        matchedBenchmark: benchmark.serviceName,
      });
      matchedServiceNames.add(serviceName);
    }
  }

  // ── Phase 2: cross-industry matching for terms not found in current industry ─
  // Only run when caller provides the full benchmark set.
  if (allBenchmarks.length > 0) {
    const currentIndustryIds = new Set(industryBenchmarks.map((b) => b.industryId));
    const crossBenchmarks = allBenchmarks.filter(
      (b) => !currentIndustryIds.has(b.industryId)
    );

    for (const benchmark of crossBenchmarks) {
      const serviceName = benchmark.serviceName.toLowerCase();
      // Skip if already captured by Phase 1
      if (matchedServiceNames.has(serviceName)) continue;
      // Skip very generic terms
      if (["other", "general"].some((g) => serviceName === g)) continue;

      const serviceWords = serviceName
        .split(/\s+/)
        .filter((w) => w.length > 3 && !["and", "the", "for", "of", "&", "service", "services"].includes(w));

      // Need at least 2 significant words to match to reduce false positives
      if (serviceWords.length < 1) continue;

      const matched = serviceWords.filter((word) => normalizedText.includes(word));
      const matchRatio = matched.length / serviceWords.length;

      if (matchRatio >= 0.75 && matched.length >= 2) {
        // High cross-industry match — suggest as proxy
        const alreadySuggested = results.some(
          (r) => r.crossIndustryBenchmark?.serviceName === benchmark.serviceName
        );
        if (!alreadySuggested) {
          results.push({
            name: benchmark.serviceName,
            confidence: "low",
            matchedBenchmark: null,
            crossIndustryBenchmark: benchmark,
          });
          matchedServiceNames.add(serviceName);
        }
      }
    }
  }

  // Deduplicate by name
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = r.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
