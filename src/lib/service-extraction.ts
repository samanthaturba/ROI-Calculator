import type { ExtractedService, IndustryBenchmark } from "./types";

/**
 * Extract potential services from pasted text (website content, GBP description, etc.)
 * Maps extracted phrases to known services in the selected industry's benchmark data.
 */
export function extractServicesFromText(
  text: string,
  industryBenchmarks: IndustryBenchmark[]
): ExtractedService[] {
  if (!text.trim()) return [];

  const normalizedText = text.toLowerCase();
  const results: ExtractedService[] = [];

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
      continue;
    }

    // Check if all significant words appear (for multi-word service names)
    if (serviceWords.length > 1) {
      const significantWords = serviceWords.filter(
        (w) => w.length > 2 && !["and", "the", "for", "of"].includes(w)
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
        continue;
      }
    }

    // Partial keyword match
    const primaryWord = serviceWords.find(
      (w) =>
        w.length > 3 &&
        !["repair", "installation", "service", "cleaning", "maintenance"].includes(w)
    );
    if (primaryWord && normalizedText.includes(primaryWord)) {
      results.push({
        name: benchmark.serviceName,
        confidence: "low",
        matchedBenchmark: benchmark.serviceName,
      });
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.name)) return false;
    seen.add(r.name);
    return true;
  });
}
