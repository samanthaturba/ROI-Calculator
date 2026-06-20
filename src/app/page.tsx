"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import type {
  ClientInputs as ClientInputsType,
  BudgetInputs,
  ServiceSelection as ServiceSelectionType,
  ExtractedService,
  AdPlatform,
  CalculationResult,
} from "../lib/types";
import {
  getAllIndustries,
  getServicesForIndustry,
  getRecommendedSpend,
  getPlatformRecommendations,
  hasBenchmarksForPlatform,
  getBenchmarkForService,
  getIndustryCloseRate,
  getAllGoogleBenchmarks,
  registerAiIndustry,
  getServicesForIndustryWithAi,
  getAudienceInsights,
  type AiGeneratedIndustry,
} from "../lib/benchmarks";
import { calculate, checkSpendWarning, formatCurrency } from "../lib/calculations";
import { extractServicesFromText } from "../lib/service-extraction";

import ClientInputsComponent from "../components/ClientInputs";
import ServiceSelection from "../components/ServiceSelection";
import BudgetSalesInputs from "../components/BudgetSalesInputs";
import Results from "../components/Results";
import KeywordSuggestions from "../components/KeywordSuggestions";
import ExportSummary from "../components/ExportSummary";
import SaveLoad from "../components/SaveLoad";

import PowerPointExport from "../components/PowerPointExport";
import LinkedInStrategy from "../components/LinkedInStrategy";
import CitySearch from "../components/CitySearch";
import type { CitySearchResult } from "../components/CitySearch";

const DEFAULT_CLOSE_RATE = 20; // Fallback before industry is selected; actual default comes from industry data

/** Pure helper — mirrors getEffectiveCpl in ServiceSelection.tsx without needing the import. */
function getEffectiveCplForService(s: ServiceSelectionType, multiplier: number): number | null {
  let base: number | null = null;
  if (s.cplChoice === "custom") base = s.customCpl;
  else if (s.benchmark) {
    if (s.cplChoice === "low")  base = s.benchmark.cplLow;
    else if (s.cplChoice === "mid")  base = s.benchmark.cplMid;
    else if (s.cplChoice === "high") base = s.benchmark.cplHigh;
  }
  if (base === null || base <= 0) return null;
  return Math.round(base * multiplier);
}

const PLATFORM_INFO: Record<AdPlatform, { label: string; icon: string; description: string }> = {
  google: {
    label: "Google Ads",
    icon: "🔍",
    description: "Search-based ads targeting high-intent users actively looking for services",
  },
  meta: {
    label: "Meta Ads",
    icon: "📱",
    description: "Facebook & Instagram ads for awareness, retargeting, and lead generation",
  },
  linkedin: {
    label: "LinkedIn Ads",
    icon: "💼",
    description: "Professional targeting for B2B services, C-suite decision makers",
  },
  lsa: {
    label: "Google LSA",
    icon: "📍",
    description: "Pay-per-lead local ads with Google Verified badge for service businesses",
  },
};

export const MARKET_TIERS: Record<string, { label: string; multiplier: number; description: string }> = {
  "": { label: "Select market size...", multiplier: 1.0, description: "" },
  "national": { label: "USA National Campaign", multiplier: 1.20, description: "National campaigns compete across all markets. CPL typically 15-25% above mid-size city baseline due to broad geographic competition." },
  "tier1": { label: "Major Metro (1M+ pop) — NYC, LA, Chicago, Houston, etc.", multiplier: 1.35, description: "Highest competition. CPL typically 25-45% above national average." },
  "tier2": { label: "Large City (500K–1M) — Austin, Nashville, Charlotte, etc.", multiplier: 1.15, description: "Above-average competition. CPL typically 10-20% above national average." },
  "tier3": { label: "Mid-Size City (150K–500K) — Boise, Knoxville, Reno, etc.", multiplier: 1.0, description: "Moderate competition. CPL near national average benchmarks." },
  "tier4": { label: "Small City (50K–150K) — Asheville, Bend, Duluth, etc.", multiplier: 0.85, description: "Below-average competition. CPL typically 10-20% below national average." },
  "tier5": { label: "Small Town / Rural (<50K)", multiplier: 0.70, description: "Low competition. CPL typically 25-35% below national average." },
};

export interface TargetAreaEntry {
  id: string;
  name: string;
  tier: string;
  budgetPercent: number;
  radiusMiles?: number;
}

let areaIdCounter = 1;

export default function Home() {
  const [clientInputs, setClientInputs] = useState<ClientInputsType>({
    clientName: "",
    websiteUrl: "",
    gbpDescription: "",
    industryId: "",
  });

  const [budgetInputs, setBudgetInputs] = useState<BudgetInputs>({
    monthlyAdSpend: 0,
    closeRate: DEFAULT_CLOSE_RATE,
    roundingMode: "exact",
    grossMarginPercent: null,
  });

  const [services, setServices] = useState<ServiceSelectionType[]>([]);
  const [extractedServices, setExtractedServices] = useState<ExtractedService[]>([]);
  // Tracks the previous secondaryIndustryIds so we can diff add/remove incrementally
  const prevSecondaryIdsRef = useRef<string[]>([]);
  const [targetAreas, setTargetAreas] = useState<TargetAreaEntry[]>([
    { id: `area-${areaIdCounter++}`, name: "", tier: "", budgetPercent: 100 },
  ]);
  const [closeRateManuallySet, setCloseRateManuallySet] = useState(false);
  const [budgetMode, setBudgetMode] = useState<"strict" | "maxroi">("strict");

  const [selectedPlatforms, setSelectedPlatforms] = useState<AdPlatform[]>(["google"]);
  const [platformAllocations, setPlatformAllocations] = useState<Record<AdPlatform, number>>({
    google: 100, meta: 0, linkedin: 0, lsa: 0,
  });
  // Tracks whether the user has manually typed a custom split in the number inputs. When
  // true, we don't auto-refresh allocations from the recommended split — the user's edits win.
  const [platformAllocationsManuallyEdited, setPlatformAllocationsManuallyEdited] =
    useState<boolean>(false);

  // Primary platform = first selected, used for loading services and single-platform contexts
  const primaryPlatform = selectedPlatforms[0];
  // Backward compat alias
  const platform = primaryPlatform;

  // Compute blended market multiplier from all areas
  const blendedMultiplier = useMemo(() => {
    const areasWithTier = targetAreas.filter((a) => a.tier);
    if (areasWithTier.length === 0) return 1.0;
    const totalPercent = areasWithTier.reduce((sum, a) => sum + a.budgetPercent, 0);
    if (totalPercent === 0) return 1.0;
    const weighted = areasWithTier.reduce((sum, a) => {
      const mult = MARKET_TIERS[a.tier]?.multiplier ?? 1.0;
      return sum + mult * a.budgetPercent;
    }, 0);
    return weighted / totalPercent;
  }, [targetAreas]);

  // Total budget when in Max ROI mode: sum of each selected service's chosen budget tier
  const maxRoiAdSpend = useMemo(() => {
    const sel = services.filter((s) => s.selected);
    if (sel.length === 0 || budgetInputs.closeRate <= 0) return 0;
    const cr = budgetInputs.closeRate / 100;
    return sel.reduce((sum, s) => {
      const cpl = getEffectiveCplForService(s, blendedMultiplier);
      if (!cpl) return sum;
      const minLeads    = Math.ceil(3 / cr);
      const targetLeads = Math.ceil(6 / cr);
      const rawMin    = Math.max(Math.round((cpl * minLeads)    / 50)  * 50,  300);
      const rawTarget = Math.max(Math.round((cpl * targetLeads) / 100) * 100, 500);
      const choice = s.maxRoiBudgetChoice ?? "target";
      if (choice === "min")    return sum + rawMin;
      if (choice === "custom") return sum + (s.customMaxRoiBudget ?? rawTarget);
      return sum + rawTarget;
    }, 0);
  }, [services, budgetInputs.closeRate, blendedMultiplier]);

  function addArea() {
    setTargetAreas((prev) => {
      const newAreas = [...prev, { id: `area-${areaIdCounter++}`, name: "", tier: "", budgetPercent: 0 }];
      return rebalanceAreas(newAreas);
    });
  }

  function removeArea(id: string) {
    setTargetAreas((prev) => {
      const filtered = prev.filter((a) => a.id !== id);
      if (filtered.length === 0) {
        return [{ id: `area-${areaIdCounter++}`, name: "", tier: "", budgetPercent: 100 }];
      }
      return rebalanceAreas(filtered);
    });
  }

  function updateArea(id: string, field: keyof TargetAreaEntry, value: string | number) {
    setTargetAreas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  }

  function updateAreaRadius(id: string, value: number | undefined) {
    setTargetAreas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, radiusMiles: value } : a))
    );
  }

  function rebalanceAreas(areas: TargetAreaEntry[]): TargetAreaEntry[] {
    const even = Math.round((100 / areas.length) * 10) / 10;
    const rebalanced = areas.map((a) => ({ ...a, budgetPercent: even }));
    const total = rebalanced.reduce((s, a) => s + a.budgetPercent, 0);
    if (Math.abs(total - 100) > 0.01 && rebalanced.length > 0) {
      rebalanced[0].budgetPercent += Math.round((100 - total) * 10) / 10;
    }
    return rebalanced;
  }

  function evenSplitAreas() {
    setTargetAreas((prev) => rebalanceAreas(prev));
  }

  const totalAreaPercent = targetAreas.reduce((s, a) => s + a.budgetPercent, 0);

  // Rebalance platform allocations evenly across selected platforms
  function rebalancePlatformAllocations(platforms: AdPlatform[]): Record<AdPlatform, number> {
    const alloc: Record<AdPlatform, number> = { google: 0, meta: 0, linkedin: 0, lsa: 0 };
    if (platforms.length === 0) return alloc;
    const even = Math.round((100 / platforms.length) * 10) / 10;
    for (const p of platforms) {
      alloc[p] = even;
    }
    // Fix rounding so it sums to 100
    const total = platforms.reduce((s, p) => s + alloc[p], 0);
    if (Math.abs(total - 100) > 0.01 && platforms.length > 0) {
      alloc[platforms[0]] += Math.round((100 - total) * 10) / 10;
    }
    return alloc;
  }

  function evenSplitPlatforms() {
    setPlatformAllocations(rebalancePlatformAllocations(selectedPlatforms));
  }

  const totalPlatformPercent = selectedPlatforms.reduce((s, p) => s + platformAllocations[p], 0);

  // Project a platform's standalone revenue if it received the entire budget.
  // Used by the recommended-split function to compare platforms on projected economics.
  function projectPlatformRevenueStandalone(plat: AdPlatform, budget: number): number {
    const selectedServices = services.filter((s) => s.selected);
    if (
      selectedServices.length === 0 ||
      budget <= 0 ||
      budgetInputs.closeRate <= 0 ||
      !clientInputs.industryId
    ) {
      return 0;
    }

    const platServices = services.map((s) => {
      if (!s.selected) return s;
      let benchmark = s.benchmark;
      if (plat !== primaryPlatform) {
        // Use the benchmark's own source industry so cross-industry services look up
        // their platform-specific CPL in the correct industry, not the current one.
        const sourceIndustry = s.benchmark?.industryId ?? clientInputs.industryId!;
        const lookupName = s.benchmark?.serviceName ?? s.serviceName;
        const platBenchmark = getBenchmarkForService(sourceIndustry, lookupName, plat);
        if (platBenchmark) benchmark = platBenchmark;
      }
      const adjusted = { ...s, benchmark: benchmark ? { ...benchmark } : null };
      if (blendedMultiplier !== 1.0 && adjusted.benchmark && s.cplChoice !== "custom") {
        if (adjusted.benchmark.cplLow !== null) adjusted.benchmark.cplLow = Math.round(adjusted.benchmark.cplLow * blendedMultiplier);
        if (adjusted.benchmark.cplMid !== null) adjusted.benchmark.cplMid = Math.round(adjusted.benchmark.cplMid * blendedMultiplier);
        if (adjusted.benchmark.cplHigh !== null) adjusted.benchmark.cplHigh = Math.round(adjusted.benchmark.cplHigh * blendedMultiplier);
      }
      return adjusted;
    });

    const result = calculate(platServices, { ...budgetInputs, monthlyAdSpend: budget });
    return budgetInputs.roundingMode === "conservative" ? result.totalRevenueRounded : result.totalRevenue;
  }

  // Compute recommended budget split. Uses projected revenue per platform when services
  // + budget + close rate are filled in (so ties on star rating still produce a real
  // recommendation), with a diversification floor so no platform gets over-concentrated.
  // Falls back to star-rating weighting when the calculator can't project yet.
  function getRecommendedPlatformSplit(platforms: AdPlatform[]): Record<AdPlatform, number> {
    const alloc: Record<AdPlatform, number> = { google: 0, meta: 0, linkedin: 0, lsa: 0 };
    if (platforms.length === 0) return alloc;
    if (platforms.length === 1) {
      alloc[platforms[0]] = 100;
      return alloc;
    }

    const recs = clientInputs.industryId ? getPlatformRecommendations(clientInputs.industryId) : null;
    if (!recs) {
      return rebalancePlatformAllocations(platforms);
    }

    // Recommended spend amounts per platform — the most direct signal for "how much
    // each platform needs to be effective" for this industry.  Used as a correction
    // when revenue projection gives ties (e.g. Google Ads + Google LSA both 5★ for HVAC
    // but rec'd $6K vs $3K — star-rating fallback would give 50/50, rec-spend gives 67/33).
    const recSpendWeights: Record<AdPlatform, number> = { google: 0, meta: 0, linkedin: 0, lsa: 0 };
    let totalRecSpend = 0;
    if (clientInputs.industryId) {
      for (const p of platforms) {
        const rec = getRecommendedSpend(clientInputs.industryId, p);
        recSpendWeights[p] = rec.target ?? rec.min ?? 0;
        totalRecSpend += recSpendWeights[p];
      }
    }

    // Primary weighting: projected revenue if each platform got the full budget.
    // This captures real economics (CPL, job value, conversion) the rating alone misses.
    const weights: Record<AdPlatform, number> = { google: 0, meta: 0, linkedin: 0, lsa: 0 };
    let totalRevenueWeight = 0;
    const budget = budgetInputs.monthlyAdSpend;
    const canProject = budget > 0 && services.some((s) => s.selected) && budgetInputs.closeRate > 0;

    if (canProject) {
      for (const p of platforms) {
        const revenue = projectPlatformRevenueStandalone(p, budget);
        weights[p] = revenue;
        totalRevenueWeight += revenue;
      }
    }

    if (totalRevenueWeight > 0 && totalRecSpend > 0) {
      // Blend: 70 % revenue projection + 30 % recommended spend ratio.
      // The rec-spend component corrects for platforms that share CPL benchmarks
      // (so revenue projection ties) but have genuinely different budget requirements.
      for (const p of platforms) {
        const revShare = weights[p] / totalRevenueWeight;
        const recShare = recSpendWeights[p] / totalRecSpend;
        weights[p] = revShare * 0.7 + recShare * 0.3;
      }
    } else if (totalRevenueWeight <= 0) {
      // No revenue projection — use rec-spend amounts if available, else star ratings
      if (totalRecSpend > 0) {
        for (const p of platforms) {
          weights[p] = recSpendWeights[p] > 0 ? recSpendWeights[p] : Math.max(recs[p]?.rating ?? 1, 1);
        }
      } else {
        for (const p of platforms) {
          weights[p] = Math.max(recs[p]?.rating ?? 1, 1);
        }
      }
    }

    const totalWeight = platforms.reduce((s, p) => s + weights[p], 0);
    if (totalWeight <= 0) return rebalancePlatformAllocations(platforms);

    // Raw percentages (unrounded) based on weights
    const raw: Record<AdPlatform, number> = { google: 0, meta: 0, linkedin: 0, lsa: 0 };
    for (const p of platforms) {
      raw[p] = (weights[p] / totalWeight) * 100;
    }

    // Enforce a diversification floor so the recommendation doesn't concentrate 100% on
    // the "best" platform. Multi-platform exists to spread risk — a 95/5 split is not a
    // useful recommendation even if the math says so.
    const minFloor = platforms.length === 2 ? 25 : platforms.length === 3 ? 15 : 10;
    let deficit = 0;
    const aboveFloor: AdPlatform[] = [];
    for (const p of platforms) {
      if (raw[p] < minFloor) {
        deficit += minFloor - raw[p];
        raw[p] = minFloor;
      } else {
        aboveFloor.push(p);
      }
    }
    // Redistribute the deficit proportionally among platforms that are above the floor
    if (deficit > 0 && aboveFloor.length > 0) {
      const totalAbove = aboveFloor.reduce((s, p) => s + raw[p], 0);
      for (const p of aboveFloor) {
        raw[p] = Math.max(minFloor, raw[p] - deficit * (raw[p] / totalAbove));
      }
    }

    // Round each to nearest 5%, assign remainder to the largest platform
    const sorted = [...platforms].sort((a, b) => raw[b] - raw[a]);
    let remaining = 100;
    for (let i = 0; i < sorted.length - 1; i++) {
      const pct = Math.round(raw[sorted[i]] / 5) * 5;
      alloc[sorted[i]] = pct;
      remaining -= pct;
    }
    alloc[sorted[sorted.length - 1]] = Math.max(0, remaining);

    return alloc;
  }

  // Auto-refresh the recommended split when the data needed to compute it changes.
  // This means if the user toggled platforms early (before picking services), the
  // initial star-rating-based fallback will get replaced by the revenue-weighted
  // recommendation as soon as services + budget + close rate are filled in.
  // Respects manual edits: if the user typed a custom split, we don't overwrite it.
  useEffect(() => {
    if (platformAllocationsManuallyEdited) return;
    if (selectedPlatforms.length < 2) return;
    if (!clientInputs.industryId) return;
    if (budgetInputs.monthlyAdSpend <= 0) return;
    if (budgetInputs.closeRate <= 0) return;
    if (!services.some((s) => s.selected)) return;

    const recommended = getRecommendedPlatformSplit(selectedPlatforms);
    // Only update if the recommendation actually differs from current allocations
    // (avoids infinite render loops)
    const changed = selectedPlatforms.some(
      (p) => Math.abs((platformAllocations[p] ?? 0) - (recommended[p] ?? 0)) > 0.5
    );
    if (changed) {
      setPlatformAllocations(recommended);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    services,
    budgetInputs.monthlyAdSpend,
    budgetInputs.closeRate,
    selectedPlatforms,
    blendedMultiplier,
    clientInputs.industryId,
    platformAllocationsManuallyEdited,
  ]);

  // Toggle a platform on or off
  function handlePlatformToggle(toggledPlatform: AdPlatform) {
    setSelectedPlatforms((prev) => {
      const isSelected = prev.includes(toggledPlatform);

      if (isSelected) {
        // Don't allow deselecting the last platform
        if (prev.length <= 1) return prev;
        const next = prev.filter((p) => p !== toggledPlatform);
        setPlatformAllocations(getRecommendedPlatformSplit(next));
        // If we removed the primary platform, reload services for new primary
        if (prev[0] === toggledPlatform && clientInputs.industryId) {
          const newPrimary = next[0];
          const benchmarks = getServicesForIndustry(clientInputs.industryId, newPrimary);
          const newServices: ServiceSelectionType[] = benchmarks.map((b) => ({
            serviceName: b.serviceName,
            selected: false,
            allocationPercent: 0,
            cplChoice: "high" as const,
            customCpl: null,
            customJobValue: null,
            benchmark: b,
            isManual: false,
          }));
          setServices(newServices);
          setExtractedServices([]);
        }
        return next;
      } else {
        // Toggle ON
        const next = [...prev, toggledPlatform];
        setPlatformAllocations(getRecommendedPlatformSplit(next));
        return next;
      }
    });
  }

  // Legacy: when only one platform is selected and user clicks a different one, switch to it
  // This preserves the old single-select UX for quick switching
  function handlePlatformSwitch(newPlatform: AdPlatform) {
    setSelectedPlatforms([newPlatform]);
    setPlatformAllocations({ google: 0, meta: 0, linkedin: 0, lsa: 0, [newPlatform]: 100 } as Record<AdPlatform, number>);
    if (clientInputs.industryId) {
      const benchmarks = getServicesForIndustry(clientInputs.industryId, newPlatform);
      const newServices: ServiceSelectionType[] = benchmarks.map((b) => ({
        serviceName: b.serviceName,
        selected: false,
        allocationPercent: 0,
        cplChoice: "high" as const,
        customCpl: null,
        customJobValue: null,
        benchmark: b,
        isManual: false,
      }));
      setServices(newServices);
      setExtractedServices([]);

      // Update recommended spend for this platform
      const spend = getRecommendedSpend(clientInputs.industryId, newPlatform);
      if (spend.target) {
        setBudgetInputs((prev) => ({
          ...prev,
          monthlyAdSpend: spend.target!,
        }));
      }
    }
  }

  // When industry changes, reset services
  const handleClientInputsChange = useCallback(
    (newInputs: ClientInputsType) => {
      if (newInputs.industryId !== clientInputs.industryId && newInputs.industryId) {
        // Load primary industry services
        const benchmarks = getServicesForIndustry(newInputs.industryId, platform);
        const newServices: ServiceSelectionType[] = benchmarks.map((b) => ({
          serviceName: b.serviceName,
          selected: false,
          allocationPercent: 0,
          cplChoice: "high" as const,
          customCpl: null,
          customJobValue: null,
          benchmark: b,
          isManual: false,
        }));

        // Also load secondary industry services right away (so the full list is present)
        const addedNames = new Set(newServices.map((s) => s.serviceName.toLowerCase()));
        for (const secId of (newInputs.secondaryIndustryIds ?? [])) {
          const secIndustry = getAllIndustries(platform).find((i) => i.id === secId);
          if (!secIndustry) continue;
          const secBenchmarks = getServicesForIndustry(secId, platform);
          for (const b of secBenchmarks) {
            if (!addedNames.has(b.serviceName.toLowerCase())) {
              newServices.push({
                serviceName: `${b.serviceName} (${secIndustry.name})`,
                selected: false,
                allocationPercent: 0,
                cplChoice: "high" as const,
                customCpl: null,
                customJobValue: null,
                benchmark: b,
                isManual: false,
              });
              addedNames.add(b.serviceName.toLowerCase());
            }
          }
        }

        // Sync ref so the secondary useEffect doesn't double-fire
        prevSecondaryIdsRef.current = newInputs.secondaryIndustryIds ?? [];

        setServices(newServices);
        setExtractedServices([]);

        // Set recommended spend as default
        const spend = getRecommendedSpend(newInputs.industryId, platform);
        if (spend.target && budgetInputs.monthlyAdSpend === 0) {
          setBudgetInputs((prev) => ({
            ...prev,
            monthlyAdSpend: spend.target!,
          }));
        }

        // Set industry-specific close rate (unless user has manually set one)
        if (!closeRateManuallySet) {
          const industryCloseRate = getIndustryCloseRate(newInputs.industryId);
          setBudgetInputs((prev) => ({
            ...prev,
            closeRate: industryCloseRate.closeRate,
          }));
        }
      } else if (!newInputs.industryId) {
        setServices([]);
        setExtractedServices([]);
      }
      setClientInputs(newInputs);
    },
    [clientInputs.industryId, budgetInputs.monthlyAdSpend, platform, closeRateManuallySet]
  );

  // Handle website scan result — atomically sets industry + auto-selects services
  // from the scanned page text without the async state-race of two separate calls.
  const handleWebsiteScan = useCallback(
    ({ industryId, text }: { industryId: string; text: string }) => {
      // Load services for the detected industry
      const benchmarks = getServicesForIndustry(industryId, platform);
      const newServices: ServiceSelectionType[] = benchmarks.map((b) => ({
        serviceName: b.serviceName,
        selected: false,
        allocationPercent: 0,
        cplChoice: "high" as const,
        customCpl: null,
        customJobValue: null,
        benchmark: b,
        isManual: false,
      }));

      // Run service extraction — Phase 1 against current industry, Phase 2 cross-industry
      const allBenchmarks = getAllGoogleBenchmarks();
      const extracted = extractServicesFromText(text, benchmarks, allBenchmarks);

      // Auto-select matched services and calculate even splits
      const updatedServices = newServices.map((s) => {
        const match = extracted.find((e) => e.matchedBenchmark === s.serviceName);
        return match ? { ...s, selected: true } : s;
      });

      // Auto-add cross-industry matches as manually-added services with proxy benchmark data
      const crossMatches = extracted.filter((e) => e.crossIndustryBenchmark);
      for (const cm of crossMatches) {
        const alreadyExists = updatedServices.some(
          (s) => s.serviceName.toLowerCase() === cm.name.toLowerCase()
        );
        if (!alreadyExists) {
          updatedServices.push({
            serviceName: cm.crossIndustryBenchmark!.serviceName,
            selected: true,
            allocationPercent: 0,
            cplChoice: "high" as const,
            customCpl: null,
            customJobValue: null,
            benchmark: cm.crossIndustryBenchmark!,
            isManual: true,
          });
        }
      }

      const selCount = updatedServices.filter((s) => s.selected).length;
      if (selCount > 0) {
        const even = Math.round((100 / selCount) * 10) / 10;
        for (const s of updatedServices) s.allocationPercent = s.selected ? even : 0;
      }

      setServices(updatedServices);
      setExtractedServices(extracted);
      setClientInputs((prev) => ({ ...prev, industryId }));

      // Set recommended spend
      const spend = getRecommendedSpend(industryId, platform);
      if (spend.target && budgetInputs.monthlyAdSpend === 0) {
        setBudgetInputs((prev) => ({ ...prev, monthlyAdSpend: spend.target! }));
      }
      // Set industry close rate
      if (!closeRateManuallySet) {
        const icr = getIndustryCloseRate(industryId);
        setBudgetInputs((prev) => ({ ...prev, closeRate: icr.closeRate }));
      }
    },
    [platform, budgetInputs.monthlyAdSpend, closeRateManuallySet]
  );

  // Handle AI-generated industry from website scan
  const handleAiGeneratedIndustry = useCallback(
    (aiIndustry: AiGeneratedIndustry, text: string) => {
      // Register in the in-memory benchmark registry so all lookups work
      registerAiIndustry(aiIndustry);

      // Build services from the AI-generated benchmarks (all pre-selected)
      const newServices: ServiceSelectionType[] = aiIndustry.services.map((b) => ({
        serviceName: b.serviceName,
        selected: true,
        allocationPercent: 0,
        cplChoice: "high" as const,
        customCpl: null,
        customJobValue: null,
        benchmark: b,
        isManual: false,
      }));

      // Even split across all selected services
      const count = newServices.filter((s) => s.selected).length;
      if (count > 0) {
        const even = Math.round((100 / count) * 10) / 10;
        for (const s of newServices) s.allocationPercent = s.selected ? even : 0;
      }

      setServices(newServices);
      setExtractedServices([]);
      setClientInputs((prev) => ({ ...prev, industryId: aiIndustry.industryId }));

      // Set close rate from AI data
      if (!closeRateManuallySet) {
        setBudgetInputs((prev) => ({ ...prev, closeRate: aiIndustry.closeRate }));
      }

      // Set recommended spend from the AI services' target spend
      const aiTargetSpend = Math.max(
        ...aiIndustry.services.map((s) => s.recommendedTargetAdSpend ?? 0)
      );
      if (aiTargetSpend > 0 && budgetInputs.monthlyAdSpend === 0) {
        setBudgetInputs((prev) => ({ ...prev, monthlyAdSpend: aiTargetSpend }));
      }

      // Also run service extraction on the text to detect keyword matches
      if (text) {
        const benchmarks = getServicesForIndustryWithAi(aiIndustry.industryId, platform);
        const allBenchmarks = getAllGoogleBenchmarks();
        const extracted = extractServicesFromText(text, benchmarks, allBenchmarks);
        setExtractedServices(extracted);
      }
    },
    [platform, budgetInputs.monthlyAdSpend, closeRateManuallySet]
  );

  // Handle text extraction for service detection
  const handleTextExtract = useCallback(
    (text: string) => {
      if (!clientInputs.industryId) return;
      const benchmarks = getServicesForIndustry(clientInputs.industryId, platform);
      const allBenchmarks = getAllGoogleBenchmarks();
      const extracted = extractServicesFromText(text, benchmarks, allBenchmarks);
      setExtractedServices(extracted);

      if (extracted.length > 0) {
        setServices((prev) => {
          const updated = prev.map((s) => {
            const match = extracted.find(
              (e) => e.matchedBenchmark === s.serviceName
            );
            if (match) return { ...s, selected: true };
            return s;
          });

          // Auto-add cross-industry matches not already in the list
          const crossMatches = extracted.filter((e) => e.crossIndustryBenchmark);
          for (const cm of crossMatches) {
            const alreadyExists = updated.some(
              (s) => s.serviceName.toLowerCase() === cm.name.toLowerCase()
            );
            if (!alreadyExists) {
              updated.push({
                serviceName: cm.crossIndustryBenchmark!.serviceName,
                selected: true,
                allocationPercent: 0,
                cplChoice: "high" as const,
                customCpl: null,
                customJobValue: null,
                benchmark: cm.crossIndustryBenchmark!,
                isManual: true,
              });
            }
          }

          const selectedCount = updated.filter((s) => s.selected).length;
          if (selectedCount > 0) {
            const evenSplit = Math.round((100 / selectedCount) * 10) / 10;
            for (const s of updated) {
              s.allocationPercent = s.selected ? evenSplit : 0;
            }
          }

          return updated;
        });
      }
    },
    [clientInputs.industryId, platform]
  );

  // Industry info
  const selectedIndustry = getAllIndustries(platform).find(
    (i) => i.id === clientInputs.industryId
  );
  const currentIndustryCloseRate = clientInputs.industryId
    ? getIndustryCloseRate(clientInputs.industryId)
    : null;
  // Per-platform recommended spend (industry-based). When multiple platforms are
  // selected, the combined recommendation is the SUM across platforms — each platform
  // needs its own minimum to be effective, so running two platforms roughly doubles
  // the recommended budget.
  const perPlatformRecommendedSpend: Partial<Record<AdPlatform, { min: number | null; target: number | null }>> =
    clientInputs.industryId
      ? Object.fromEntries(
          selectedPlatforms.map((p) => [p, getRecommendedSpend(clientInputs.industryId!, p)])
        )
      : {};

  const recommendedSpend = clientInputs.industryId
    ? (() => {
        let minSum = 0;
        let targetSum = 0;
        let hasMin = false;
        let hasTarget = false;
        for (const p of selectedPlatforms) {
          const r = perPlatformRecommendedSpend[p];
          if (!r) continue;
          if (r.min !== null) { minSum += r.min; hasMin = true; }
          if (r.target !== null) { targetSum += r.target; hasTarget = true; }
        }
        return {
          min: hasMin ? minSum : null,
          target: hasTarget ? targetSum : null,
        };
      })()
    : { min: null, target: null };

  const spendWarning = checkSpendWarning(
    budgetInputs.monthlyAdSpend,
    recommendedSpend.min
  );

  // Platform recommendations for the selected industry
  const platformRecs = clientInputs.industryId
    ? getPlatformRecommendations(clientInputs.industryId)
    : null;

  // Check if current platform has benchmarks for selected industry
  const platformHasBenchmarks = clientInputs.industryId
    ? hasBenchmarksForPlatform(clientInputs.industryId, platform)
    : true;

  // Calculate results per platform with blended market multiplier
  const platformResults = useMemo(() => {
    const results: Record<AdPlatform, CalculationResult | null> = {
      google: null, meta: null, linkedin: null, lsa: null,
    };

    const selectedServices = services.filter((s) => s.selected);
    // In Max ROI mode use the sum of per-service recommended budgets; otherwise fixed budget
    const effectiveTotalBudget = budgetMode === "maxroi" ? maxRoiAdSpend : budgetInputs.monthlyAdSpend;

    if (
      selectedServices.length === 0 ||
      effectiveTotalBudget <= 0 ||
      budgetInputs.closeRate <= 0
    ) {
      return results;
    }

    // In Max ROI mode recompute per-service allocation %s so each service receives
    // its chosen budget tier (min / target / custom) proportionally.
    const servicesWithAlloc = budgetMode === "maxroi" && maxRoiAdSpend > 0
      ? services.map((s) => {
          if (!s.selected) return s;
          const cpl = getEffectiveCplForService(s, blendedMultiplier);
          if (!cpl) return { ...s, allocationPercent: 100 / selectedServices.length };
          const cr = budgetInputs.closeRate / 100;
          const minLeads    = Math.ceil(3 / cr);
          const targetLeads = Math.ceil(6 / cr);
          const rawMin    = Math.max(Math.round((cpl * minLeads)    / 50)  * 50,  300);
          const rawTarget = Math.max(Math.round((cpl * targetLeads) / 100) * 100, 500);
          const choice = s.maxRoiBudgetChoice ?? "target";
          const svcBudget =
            choice === "min"    ? rawMin :
            choice === "custom" ? (s.customMaxRoiBudget ?? rawTarget) :
            rawTarget;
          return { ...s, allocationPercent: (svcBudget / maxRoiAdSpend) * 100 };
        })
      : services;

    for (const plat of selectedPlatforms) {
      const platBudget = effectiveTotalBudget * (platformAllocations[plat] / 100);
      if (platBudget <= 0) continue;

      // Build services with platform-specific benchmarks
      const platServices = servicesWithAlloc.map((s) => {
        if (!s.selected) return s;

        // For the primary platform, use the service as-is
        // For secondary platforms, look up that platform's benchmark in the service's
        // ORIGINAL source industry (so cross-industry services keep their correct data
        // rather than getting rewritten with the current industry's CPL).
        let benchmark = s.benchmark;
        if (plat !== primaryPlatform && clientInputs.industryId) {
          const sourceIndustry = s.benchmark?.industryId ?? clientInputs.industryId;
          const lookupName = s.benchmark?.serviceName ?? s.serviceName;
          const platBenchmark = getBenchmarkForService(sourceIndustry, lookupName, plat);
          if (platBenchmark) {
            benchmark = platBenchmark;
          }
          // If no benchmark on this platform, fall back to the primary platform benchmark
        }

        const adjusted = { ...s, benchmark: benchmark ? { ...benchmark } : null };

        // Apply market multiplier
        if (blendedMultiplier !== 1.0 && adjusted.benchmark && s.cplChoice !== "custom") {
          if (adjusted.benchmark.cplLow !== null) adjusted.benchmark.cplLow = Math.round(adjusted.benchmark.cplLow * blendedMultiplier);
          if (adjusted.benchmark.cplMid !== null) adjusted.benchmark.cplMid = Math.round(adjusted.benchmark.cplMid * blendedMultiplier);
          if (adjusted.benchmark.cplHigh !== null) adjusted.benchmark.cplHigh = Math.round(adjusted.benchmark.cplHigh * blendedMultiplier);
        }

        return adjusted;
      });

      const platBudgetInputs = { ...budgetInputs, monthlyAdSpend: platBudget };
      results[plat] = calculate(platServices, platBudgetInputs);
    }

    return results;
  }, [services, budgetInputs, blendedMultiplier, selectedPlatforms, platformAllocations, primaryPlatform, clientInputs.industryId, budgetMode, maxRoiAdSpend]);

  // Combined result across all platforms (for single-platform backward compat, this equals the single result)
  const combinedResult = useMemo(() => {
    const activeResults = selectedPlatforms
      .map((p) => platformResults[p])
      .filter((r): r is CalculationResult => r !== null);

    if (activeResults.length === 0) return null;
    if (activeResults.length === 1) return activeResults[0];

    // Sum across platforms
    const allServiceResults = activeResults.flatMap((r) => r.serviceResults);
    const totalSpend = activeResults.reduce((s, r) => s + r.totalSpend, 0);
    const totalLeads = activeResults.reduce((s, r) => s + r.totalLeads, 0);
    const totalJobs = activeResults.reduce((s, r) => s + r.totalJobs, 0);
    const totalJobsRounded = activeResults.reduce((s, r) => s + r.totalJobsRounded, 0);
    const totalRevenue = activeResults.reduce((s, r) => s + r.totalRevenue, 0);
    const totalRevenueRounded = activeResults.reduce((s, r) => s + r.totalRevenueRounded, 0);
    const grossProfit = activeResults.every((r) => r.grossProfit !== null)
      ? activeResults.reduce((s, r) => s + r.grossProfit!, 0) : null;
    const grossProfitRounded = activeResults.every((r) => r.grossProfitRounded !== null)
      ? activeResults.reduce((s, r) => s + r.grossProfitRounded!, 0) : null;
    const weightedAvgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const warnings = activeResults.flatMap((r) => r.warnings);

    return {
      totalSpend,
      weightedAvgCpl,
      totalLeads,
      totalJobs,
      totalJobsRounded,
      totalRevenue,
      totalRevenueRounded,
      grossProfit,
      grossProfitRounded,
      closeRate: budgetInputs.closeRate,
      serviceResults: allServiceResults,
      hasCustomEstimates: activeResults.some((r) => r.hasCustomEstimates),
      hasLowConfidence: activeResults.some((r) => r.hasLowConfidence),
      warnings,
    } as CalculationResult;
  }, [platformResults, selectedPlatforms, budgetInputs.closeRate]);

  // Backward compat: single result for components that still expect it
  const result = combinedResult;

  // Save/Load state management
  const getCurrentState = useCallback(() => {
    return {
      version: 3,
      selectedPlatforms,
      platformAllocations,
      clientInputs,
      budgetInputs,
      targetAreas,
      services: services.map((s) => ({
        serviceName: s.serviceName,
        selected: s.selected,
        allocationPercent: s.allocationPercent,
        cplChoice: s.cplChoice,
        customCpl: s.customCpl,
        customJobValue: s.customJobValue,
        isManual: s.isManual,
      })),
    };
  }, [clientInputs, budgetInputs, targetAreas, services, selectedPlatforms, platformAllocations]);

  const loadSavedState = useCallback((data: Record<string, unknown>) => {
    try {
      const d = data as {
        version?: number;
        platform?: AdPlatform;
        selectedPlatforms?: AdPlatform[];
        platformAllocations?: Record<AdPlatform, number>;
        clientInputs?: ClientInputsType;
        budgetInputs?: BudgetInputs;
        targetAreas?: TargetAreaEntry[];
        services?: Array<{
          serviceName: string;
          selected: boolean;
          allocationPercent: number;
          cplChoice: "low" | "mid" | "high" | "custom";
          customCpl: number | null;
          customJobValue: number | null;
          isManual: boolean;
        }>;
      };

      // Handle version 2 backward compat: single platform -> multi-platform
      let loadPlatforms: AdPlatform[];
      let loadAllocations: Record<AdPlatform, number>;
      if (d.selectedPlatforms && d.platformAllocations) {
        loadPlatforms = d.selectedPlatforms;
        loadAllocations = d.platformAllocations;
      } else {
        const singlePlatform = d.platform ?? "google";
        loadPlatforms = [singlePlatform];
        loadAllocations = { google: 0, meta: 0, linkedin: 0, lsa: 0, [singlePlatform]: 100 } as Record<AdPlatform, number>;
      }
      setSelectedPlatforms(loadPlatforms);
      setPlatformAllocations(loadAllocations);
      const loadPlatform = loadPlatforms[0];

      if (d.clientInputs) {
        setClientInputs(d.clientInputs);
        // Load services for this industry
        if (d.clientInputs.industryId) {
          const benchmarks = getServicesForIndustry(d.clientInputs.industryId, loadPlatform);
          const loadedServices: ServiceSelectionType[] = benchmarks.map((b) => {
            const saved = d.services?.find((s) => s.serviceName === b.serviceName);
            return {
              serviceName: b.serviceName,
              selected: saved?.selected ?? false,
              allocationPercent: saved?.allocationPercent ?? 0,
              cplChoice: saved?.cplChoice ?? ("high" as const),
              customCpl: saved?.customCpl ?? null,
              customJobValue: saved?.customJobValue ?? null,
              benchmark: b,
              isManual: false,
            };
          });
          // Add any manually added services
          const manualServices = d.services?.filter((s) => s.isManual) ?? [];
          for (const ms of manualServices) {
            loadedServices.push({
              serviceName: ms.serviceName,
              selected: ms.selected,
              allocationPercent: ms.allocationPercent,
              cplChoice: ms.cplChoice,
              customCpl: ms.customCpl,
              customJobValue: ms.customJobValue,
              benchmark: null,
              isManual: true,
            });
          }
          setServices(loadedServices);
        }
      }
      if (d.budgetInputs) setBudgetInputs(d.budgetInputs);
      if (d.targetAreas) setTargetAreas(d.targetAreas);
    } catch {
      alert("Could not load saved data. The file may be from an incompatible version.");
    }
  }, []);

  // Build area summary string for results
  const areasSummary = targetAreas
    .filter((a) => a.tier)
    .map((a) => {
      const base = `${a.name || MARKET_TIERS[a.tier]?.label || "Unknown"} (${a.budgetPercent}%)`;
      return a.radiusMiles ? `${base} — ${a.radiusMiles}mi radius` : base;
    })
    .join(", ");

  // Generate Word-compatible HTML for the "Export as Word Doc" download
  function getWordDocHtml(): string {
    const selectedServices = services.filter((s) => s.selected);
    const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const PLAT_LABELS: Record<AdPlatform, string> = {
      google: "Google Ads", meta: "Meta Ads", linkedin: "LinkedIn Ads", lsa: "Google LSA",
    };

    const platformRows = selectedPlatforms.map((p) => {
      const pct = platformAllocations[p];
      const amount = budgetInputs.monthlyAdSpend > 0
        ? `${formatCurrency(budgetInputs.monthlyAdSpend * pct / 100)}/mo` : "—";
      return `<tr><td>${PLAT_LABELS[p]}</td><td>${pct}%</td><td>${amount}</td></tr>`;
    }).join("");

    const areaRowsHtml = targetAreas.filter((a) => a.tier).map((a) => {
      const tierLabel = MARKET_TIERS[a.tier]?.label ?? a.tier;
      const radius = a.radiusMiles ? `${a.radiusMiles} mi` : "—";
      return `<tr><td>${a.name || "(unnamed)"}</td><td>${tierLabel}</td><td>${radius}</td><td>${a.budgetPercent}%</td></tr>`;
    }).join("");

    const serviceRows = selectedServices.map((s) => {
      let cpl = "—";
      if (s.cplChoice === "custom" && s.customCpl !== null) {
        cpl = formatCurrency(s.customCpl);
      } else if (s.benchmark) {
        if (s.cplChoice === "low" && s.benchmark.cplLow !== null) cpl = formatCurrency(s.benchmark.cplLow);
        else if (s.cplChoice === "mid" && s.benchmark.cplMid !== null) cpl = formatCurrency(s.benchmark.cplMid);
        else if (s.cplChoice === "high" && s.benchmark.cplHigh !== null) cpl = formatCurrency(s.benchmark.cplHigh);
      }
      const jobVal = s.customJobValue !== null
        ? formatCurrency(s.customJobValue)
        : s.benchmark?.avgJobValue ? formatCurrency(s.benchmark.avgJobValue) : "—";
      return `<tr><td>${s.serviceName}</td><td>${s.allocationPercent}%</td><td>${cpl}</td><td>${jobVal}</td></tr>`;
    }).join("");

    let resultsHtml = "";
    if (result && result.totalLeads > 0) {
      if (selectedPlatforms.length === 1) {
        resultsHtml = `
          <table class="rt">
            <thead><tr><th>Metric</th><th>Monthly Projection</th></tr></thead>
            <tbody>
              <tr><td>Total Leads</td><td>${result.totalLeads.toFixed(1)}</td></tr>
              <tr><td>Expected Jobs</td><td>${result.totalJobs.toFixed(1)}</td></tr>
              <tr><td>Projected Revenue</td><td>${formatCurrency(result.totalRevenue)}/mo</td></tr>
              ${result.grossProfit !== null ? `<tr><td>Gross Profit</td><td>${formatCurrency(result.grossProfit)}/mo</td></tr>` : ""}
              <tr><td>Blended CPL</td><td>${formatCurrency(result.weightedAvgCpl)}</td></tr>
            </tbody>
          </table>`;
      } else {
        const platResultRows = selectedPlatforms.map((p) => {
          const r = platformResults[p];
          if (!r) return "";
          return `<tr><td>${PLAT_LABELS[p]}</td><td>${formatCurrency(r.totalSpend)}/mo</td><td>${r.totalLeads.toFixed(1)}</td><td>${r.totalJobs.toFixed(1)}</td><td>${formatCurrency(r.totalRevenue)}/mo</td></tr>`;
        }).join("");
        resultsHtml = `
          <table class="rt">
            <thead><tr><th>Platform</th><th>Budget</th><th>Leads</th><th>Jobs</th><th>Revenue</th></tr></thead>
            <tbody>
              ${platResultRows}
              <tr style="font-weight:bold;background:#edf2f8"><td>Combined Total</td><td>${formatCurrency(result.totalSpend)}/mo</td><td>${result.totalLeads.toFixed(1)}</td><td>${result.totalJobs.toFixed(1)}</td><td>${formatCurrency(result.totalRevenue)}/mo</td></tr>
            </tbody>
          </table>`;
      }
    } else {
      resultsHtml = `<p><em>No projections available — complete all required fields in the calculator to see projections.</em></p>`;
    }

    return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><title>ROI Calculator — ${clientInputs.clientName || "Unnamed Client"}</title>
<style>
body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#222;margin:40pt}
h1{font-size:18pt;color:#1B3C5E;border-bottom:2pt solid #1B3C5E;padding-bottom:6pt;margin-bottom:4pt}
h2{font-size:13pt;color:#1B3C5E;margin-top:18pt;border-bottom:1pt solid #ccc;padding-bottom:2pt}
p.meta{color:#777;font-size:9.5pt;margin-top:2pt}
table{border-collapse:collapse;width:100%;margin:8pt 0 14pt 0}
th{background:#1B3C5E;color:#fff;padding:5pt 9pt;text-align:left;font-size:10pt}
td{padding:5pt 9pt;border-bottom:1pt solid #eee;font-size:10pt}
tr:nth-child(even) td{background:#f6f8fb}
table.rt th,table.rt td{font-size:10.5pt}
</style></head>
<body>
<h1>Ad ROI Calculator — ${clientInputs.clientName || "Unnamed Client"}</h1>
<p class="meta">Generated: ${date}&nbsp;&nbsp;|&nbsp;&nbsp;Powered by Cogent Analytics${clientInputs.websiteUrl ? `&nbsp;&nbsp;|&nbsp;&nbsp;${clientInputs.websiteUrl}` : ""}</p>

<h2>Client Overview</h2>
<table><tbody>
  <tr><td style="width:35%;font-weight:bold">Client Name</td><td>${clientInputs.clientName || "—"}</td></tr>
  <tr><td style="font-weight:bold">Industry</td><td>${selectedIndustry?.name ?? "—"}</td></tr>
  ${clientInputs.websiteUrl ? `<tr><td style="font-weight:bold">Website</td><td>${clientInputs.websiteUrl}</td></tr>` : ""}
</tbody></table>

<h2>Ad Platforms &amp; Budget Allocation</h2>
<table>
  <thead><tr><th>Platform</th><th>Allocation %</th><th>Monthly Budget</th></tr></thead>
  <tbody>${platformRows}</tbody>
</table>
<p class="meta">Total Monthly Ad Spend: <strong>${formatCurrency(budgetInputs.monthlyAdSpend)}/mo</strong></p>

${targetAreas.some((a) => a.tier) ? `
<h2>Target Areas</h2>
<table>
  <thead><tr><th>Location</th><th>Market Tier</th><th>Target Radius</th><th>Budget Split</th></tr></thead>
  <tbody>${areaRowsHtml}</tbody>
</table>` : ""}

${selectedServices.length > 0 ? `
<h2>Services &amp; Budget Allocation</h2>
<table>
  <thead><tr><th>Service</th><th>Budget %</th><th>CPL Used</th><th>Avg Job Value</th></tr></thead>
  <tbody>${serviceRows}</tbody>
</table>` : ""}

<h2>Campaign Parameters</h2>
<table><tbody>
  <tr><td style="width:35%;font-weight:bold">Monthly Ad Spend</td><td>${formatCurrency(budgetInputs.monthlyAdSpend)}/mo</td></tr>
  <tr><td style="font-weight:bold">Close Rate</td><td>${budgetInputs.closeRate}%</td></tr>
  ${budgetInputs.grossMarginPercent !== null ? `<tr><td style="font-weight:bold">Gross Margin</td><td>${budgetInputs.grossMarginPercent}%</td></tr>` : ""}
</tbody></table>

<h2>Projected Monthly Results</h2>
${resultsHtml}

<p class="meta">* Projections are estimates based on industry CPL benchmarks and do not guarantee results. Actual performance varies based on campaign quality, market conditions, seasonality, and other factors.</p>
</body></html>`;
  }

  return (
    <div className="min-h-screen bg-cogent-ivory">
      {/* Header */}
      <header className="bg-cogent-navy px-6 py-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Image
            src="/cogent-logo.png"
            alt="Cogent Analytics"
            width={44}
            height={44}
            className="rounded"
          />
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              Ad ROI Calculator
            </h1>
            <p className="text-sm text-cogent-sage-light">
              Powered by Cogent Analytics
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Section A: Client Inputs (first — so industry drives platform recommendations) */}
        <ClientInputsComponent
          value={clientInputs}
          onChange={handleClientInputsChange}
          onTextExtract={handleTextExtract}
          onWebsiteScan={handleWebsiteScan}
          onAiIndustryGenerated={handleAiGeneratedIndustry}
        />

        {/* Ecommerce management notice — shown prominently when enabled */}
        {clientInputs.isEcommerce && (
          <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🛒</span>
              <div>
                <p className="text-sm font-semibold text-amber-900">Ecommerce Client — Additional Labor Required</p>
                <p className="text-sm text-amber-800 mt-1">
                  This client requires <strong>Google Merchant Center</strong> setup and ongoing feed management.
                  Ecommerce ad management (Google Shopping, Performance Max) is significantly more complex than standard
                  lead-gen campaigns — involving product feed optimization, dynamic remarketing, inventory syncing, and
                  conversion tracking. <strong>Management fees should reflect this additional labor.</strong>
                </p>
                <ul className="mt-2 text-xs text-amber-700 space-y-0.5 list-disc list-inside">
                  <li>Google Merchant Center account creation &amp; verification</li>
                  <li>Product feed setup and ongoing feed health management</li>
                  <li>Shopping campaign structure (Standard Shopping + Performance Max)</li>
                  <li>Dynamic remarketing audiences and creatives</li>
                  <li>Enhanced conversions &amp; purchase value tracking</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Unified Platform Selection & Fit */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-cogent-navy mb-1">
            {clientInputs.industryId
              ? `Ad Platforms — ${selectedIndustry?.name ?? "Industry"} Fit`
              : "Ad Platforms"}
          </h2>
          <p className="text-sm text-cogent-neutral mb-4">
            These are the channels we run ads on. Google Ads and LSA are our core platforms — they capture people actively searching for your services.
          </p>

          {/* ── Core Platforms: Google Ads + LSA ──────────────────────────────── */}
          <div className="mb-1">
            <p className="text-xs font-semibold text-cogent-navy uppercase tracking-wide mb-2">Core Platforms — Search Intent (Bottom of Funnel)</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            {(["google", "lsa"] as AdPlatform[]).map((key) => {
              const info = PLATFORM_INFO[key];
              const isActive = selectedPlatforms.includes(key);
              const rec = platformRecs?.[key];
              const stars = rec?.rating ?? 0;
              const ratingLabel = stars >= 5 ? { text: "Excellent", color: "text-green-700 bg-green-50 border-green-200" }
                : stars >= 4 ? { text: "Strong", color: "text-blue-700 bg-blue-50 border-blue-200" }
                : stars >= 3 ? { text: "Moderate", color: "text-yellow-700 bg-yellow-50 border-yellow-200" }
                : stars >= 2 ? { text: "Limited", color: "text-orange-700 bg-orange-50 border-orange-200" }
                : stars >= 1 ? { text: "Not Rec.", color: "text-red-700 bg-red-50 border-red-200" }
                : null;

              return (
                <button
                  key={key}
                  onClick={(e) => {
                    if (e.shiftKey || selectedPlatforms.length > 1) {
                      handlePlatformToggle(key);
                    } else {
                      handlePlatformSwitch(key);
                    }
                  }}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    isActive
                      ? "border-cogent-navy bg-cogent-navy/5 ring-1 ring-cogent-navy/20"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{info.icon}</span>
                    <span className={`font-semibold ${isActive ? "text-cogent-navy" : "text-gray-700"}`}>
                      {info.label}
                    </span>
                    {isActive && (
                      <span className="ml-auto text-[10px] font-medium text-white bg-cogent-navy px-2 py-0.5 rounded-full">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  {clientInputs.industryId && rec && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="inline-flex gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <span key={i} className={`text-sm ${i < stars ? "text-yellow-400" : "text-gray-300"}`}>★</span>
                        ))}
                      </span>
                      {ratingLabel && stars > 0 && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${ratingLabel.color}`}>
                          {ratingLabel.text}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-cogent-neutral leading-relaxed">
                    {clientInputs.industryId && rec ? rec.note : info.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* ── Funnel Visual (collapsible) ────────────────────────────────── */}
          <details className="mb-5 bg-gray-50 rounded-lg border border-gray-200 group">
            <summary className="cursor-pointer list-none px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-cogent-neutral hover:text-cogent-navy transition-colors">
                <span className="text-xs group-open:rotate-90 transition-transform">▶</span>
                <span>Where each platform sits in the buyer&apos;s journey</span>
              </div>
            </summary>
            <div className="px-4 pb-4">
              <div className="flex flex-col items-center gap-0">
                {/* Top of funnel */}
                <div className="w-full max-w-md">
                  <div className="bg-blue-50 border border-blue-200 rounded-t-lg px-4 py-2.5 text-center">
                    <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">Awareness</p>
                    <p className="text-[11px] text-blue-600 mt-0.5">People don&apos;t know they need you yet</p>
                    <p className="text-xs font-medium text-blue-700 mt-1">💼 LinkedIn · 📱 Meta (Display)</p>
                  </div>
                </div>
                {/* Mid funnel */}
                <div className="w-[85%] max-w-[26rem]">
                  <div className="bg-amber-50 border-x border-amber-200 px-4 py-2.5 text-center">
                    <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">Consideration</p>
                    <p className="text-[11px] text-amber-600 mt-0.5">They&apos;re thinking about it but not searching yet</p>
                    <p className="text-xs font-medium text-amber-700 mt-1">📱 Meta (Retargeting)</p>
                  </div>
                </div>
                {/* Bottom of funnel */}
                <div className="w-[70%] max-w-[22rem]">
                  <div className="bg-green-50 border border-green-300 rounded-b-lg px-4 py-2.5 text-center">
                    <p className="text-[11px] font-bold text-green-700 uppercase tracking-wide">Intent / Decision</p>
                    <p className="text-[11px] text-green-600 mt-0.5">Actively searching for your services right now</p>
                    <p className="text-xs font-medium text-green-700 mt-1">🔍 Google Ads · 📍 LSA</p>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-3 text-center">
                Google Ads &amp; LSA capture buyers at the bottom of the funnel — highest intent, fastest close. Meta and LinkedIn work higher in the funnel for awareness and retargeting.
              </p>
            </div>
          </details>

          {/* ── Audience Intelligence Panel ────────────────────────────────── */}
          {clientInputs.industryId && (() => {
            const insights = getAudienceInsights(clientInputs.industryId);
            if (!insights) return null;

            const STRATEGY_ICONS: Record<string, string> = {
              event: "🎪",
              prospecting: "🎯",
              bizdev: "🤝",
              content: "📝",
            };

            return (
              <details className={`mb-5 rounded-lg border-2 overflow-hidden group ${
                insights.searchBehavior === "low"
                  ? "border-amber-300 bg-amber-50/50"
                  : "border-blue-200 bg-blue-50/30"
              }`}>
                {/* Collapsible header */}
                <summary className={`cursor-pointer list-none px-4 py-3 ${
                  insights.searchBehavior === "low" ? "bg-amber-100/60" : "bg-blue-100/40"
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs group-open:rotate-90 transition-transform">▶</span>
                    <span className="text-sm">
                      {insights.searchBehavior === "low" ? "⚠️" : "💡"}
                    </span>
                    <span className="text-sm font-bold text-gray-800">
                      Audience Intelligence — {insights.industry}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 ml-7">
                    <span className="font-semibold">Primary buyer:</span> {insights.primaryBuyer}
                  </p>
                </summary>

                {/* Search behavior warning */}
                <div className="px-4 py-3 border-b border-gray-200/60">
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {insights.searchBehaviorNote}
                  </p>
                </div>

                {/* Strategies */}
                <div className="px-4 py-3">
                  <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Complementary Strategies to Pair with Ads:
                  </p>
                  <div className="space-y-3">
                    {insights.strategies.map((strat, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-sm shrink-0 mt-0.5">
                          {STRATEGY_ICONS[strat.type] ?? "💡"}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{strat.title}</p>
                          <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{strat.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer note */}
                <div className="px-4 py-2 bg-gray-100/50 border-t border-gray-200/60">
                  <p className="text-[11px] text-gray-500">
                    {insights.searchBehavior === "low"
                      ? "⚡ For this audience, digital ads work best as PART of a broader strategy — not as the only strategy. Use the ROI projection above to show what ads alone can deliver, then present these complementary strategies to build a full marketing plan."
                      : "💡 Google Ads will capture active searchers, but pairing with these strategies will strengthen pipeline quality and shorten the sales cycle."}
                  </p>
                </div>
              </details>
            );
          })()}

          {/* ── Additional Platforms: Meta + LinkedIn ─────────────────────────── */}
          <details className="group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center gap-2 text-sm font-semibold text-cogent-neutral hover:text-cogent-navy transition-colors">
                <span className="text-xs group-open:rotate-90 transition-transform">▶</span>
                <span>Additional Platforms — Awareness &amp; Retargeting (Optional)</span>
              </div>
              <p className="text-xs text-gray-400 mt-1 ml-5">
                Meta and LinkedIn target people who aren&apos;t actively searching — useful for brand awareness, retargeting website visitors, and B2B outreach. These are display/social ads, not search ads.
              </p>
            </summary>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {(["meta", "linkedin"] as AdPlatform[]).map((key) => {
                const info = PLATFORM_INFO[key];
                const isActive = selectedPlatforms.includes(key);
                const rec = platformRecs?.[key];
                const stars = rec?.rating ?? 0;
                const ratingLabel = stars >= 5 ? { text: "Excellent", color: "text-green-700 bg-green-50 border-green-200" }
                  : stars >= 4 ? { text: "Strong", color: "text-blue-700 bg-blue-50 border-blue-200" }
                  : stars >= 3 ? { text: "Moderate", color: "text-yellow-700 bg-yellow-50 border-yellow-200" }
                  : stars >= 2 ? { text: "Limited", color: "text-orange-700 bg-orange-50 border-orange-200" }
                  : stars >= 1 ? { text: "Not Rec.", color: "text-red-700 bg-red-50 border-red-200" }
                  : null;

                return (
                  <button
                    key={key}
                    onClick={(e) => {
                      if (e.shiftKey || selectedPlatforms.length > 1) {
                        handlePlatformToggle(key);
                      } else {
                        handlePlatformSwitch(key);
                      }
                    }}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      isActive
                        ? "border-cogent-navy bg-cogent-navy/5 ring-1 ring-cogent-navy/20"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{info.icon}</span>
                      <span className={`font-semibold ${isActive ? "text-cogent-navy" : "text-gray-700"}`}>
                        {info.label}
                      </span>
                      {isActive && (
                        <span className="ml-auto text-[10px] font-medium text-white bg-cogent-navy px-2 py-0.5 rounded-full">
                          ACTIVE
                        </span>
                      )}
                    </div>

                    {clientInputs.industryId && rec && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="inline-flex gap-0.5">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i} className={`text-sm ${i < stars ? "text-yellow-400" : "text-gray-300"}`}>★</span>
                          ))}
                        </span>
                        {ratingLabel && stars > 0 && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${ratingLabel.color}`}>
                            {ratingLabel.text}
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-cogent-neutral leading-relaxed">
                      {clientInputs.industryId && rec ? rec.note : info.description}
                    </p>

                    {/* Funnel context note */}
                    <p className="text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-100">
                      {key === "meta"
                        ? "📊 Display & social ads — targets interests and behaviors, not search queries. Best for retargeting people who already visited the website."
                        : "📊 Professional B2B targeting — reaches decision-makers by job title and company. High CPL, best for high-value contracts."}
                    </p>
                  </button>
                );
              })}
            </div>
          </details>

          {/* Multi-select hint */}
          {selectedPlatforms.length === 1 && (
            <p className="mt-3 text-xs text-cogent-neutral">
              💡 <strong>Tip:</strong> Click additional platforms to build a multi-platform strategy
              {clientInputs.industryId ? " with a recommended budget split." : "."}
            </p>
          )}

          {/* Platform Budget Split — shown when 2+ platforms selected AND industry is chosen */}
          {selectedPlatforms.length > 1 && clientInputs.industryId && (
            <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-cogent-ivory/30">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-cogent-navy">Platform Budget Split</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setPlatformAllocations(getRecommendedPlatformSplit(selectedPlatforms));
                      setPlatformAllocationsManuallyEdited(false);
                    }}
                    className="text-xs text-cogent-navy hover:underline font-medium"
                  >
                    Recommended Split
                  </button>
                  <button
                    onClick={() => {
                      evenSplitPlatforms();
                      setPlatformAllocationsManuallyEdited(true);
                    }}
                    className="text-xs text-cogent-neutral hover:underline"
                  >
                    Even Split
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-cogent-neutral mb-3">
                {platformAllocationsManuallyEdited
                  ? "Custom split active. Click \"Recommended Split\" to restore the data-driven allocation."
                  : budgetInputs.monthlyAdSpend > 0 && services.some((s) => s.selected) && budgetInputs.closeRate > 0
                    ? "Split is weighted by projected revenue and benchmark spend targets for each platform."
                    : "Split is based on platform fit ratings and will refine once services, budget, and close rate are set."}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {selectedPlatforms.map((plat) => {
                  const recSpend = perPlatformRecommendedSpend[plat];
                  const currentAmount = budgetInputs.monthlyAdSpend * platformAllocations[plat] / 100;
                  return (
                    <div key={plat} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{PLATFORM_INFO[plat].icon}</span>
                        <span className="text-sm font-medium text-gray-700 min-w-0 truncate">{PLATFORM_INFO[plat].label}</span>
                        <div className="relative ml-auto w-20 shrink-0">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={5}
                            value={platformAllocations[plat]}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setPlatformAllocations((prev) => ({ ...prev, [plat]: val }));
                              setPlatformAllocationsManuallyEdited(true);
                            }}
                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 pr-6 text-sm focus:ring-2 focus:ring-cogent-navy focus:border-cogent-navy"
                          />
                          <span className="absolute right-2 top-1.5 text-gray-500 text-sm">%</span>
                        </div>
                      </div>
                      {budgetInputs.monthlyAdSpend > 0 && (
                        <div className="ml-6 text-[11px] text-cogent-neutral">
                          <span className="font-medium text-gray-700">{formatCurrency(currentAmount)}/mo</span>
                          {recSpend?.target && (
                            <span className="ml-2 text-gray-400">
                              · rec&apos;d {formatCurrency(recSpend.target)}/mo
                            </span>
                          )}
                        </div>
                      )}
                      {!budgetInputs.monthlyAdSpend && recSpend?.target && (
                        <p className="ml-6 text-[11px] text-gray-400">
                          Rec&apos;d: {formatCurrency(recSpend.target)}/mo
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className={`mt-3 text-sm ${Math.abs(totalPlatformPercent - 100) > 0.5 ? "text-red-600 font-medium" : "text-cogent-neutral"}`}>
                Total: {totalPlatformPercent.toFixed(1)}%
                {Math.abs(totalPlatformPercent - 100) > 0.5 && " — should equal 100%"}
                {budgetInputs.monthlyAdSpend > 0 && Math.abs(totalPlatformPercent - 100) <= 0.5 && (
                  <span className="ml-2 text-gray-400">= {formatCurrency(budgetInputs.monthlyAdSpend)}/mo total</span>
                )}
              </div>

              {/* Max recommended budget callout — shows sum of per-platform target recommendations */}
              {(() => {
                const totalRecBudget = selectedPlatforms.reduce(
                  (s, p) => s + (perPlatformRecommendedSpend[p]?.target ?? 0), 0
                );
                if (totalRecBudget <= 0) return null;
                const breakdown = selectedPlatforms
                  .filter((p) => (perPlatformRecommendedSpend[p]?.target ?? 0) > 0)
                  .map((p) => `${PLATFORM_INFO[p].label}: ${formatCurrency(perPlatformRecommendedSpend[p]!.target!)}`)
                  .join(" + ");
                const alreadyAtRec = Math.abs(budgetInputs.monthlyAdSpend - totalRecBudget) < 50;
                return (
                  <div className="mt-3 p-3 bg-cogent-sage/10 border border-cogent-sage/30 rounded-lg flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-cogent-navy">
                        Max recommended total: {formatCurrency(totalRecBudget)}/mo
                      </p>
                      {breakdown && (
                        <p className="text-[11px] text-cogent-neutral mt-0.5">{breakdown}</p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-1">
                        Fully funding both platforms at their recommended levels unlocks each one&apos;s full potential.
                      </p>
                    </div>
                    {alreadyAtRec ? (
                      <span className="text-xs text-cogent-sage-dark font-medium shrink-0 mt-0.5">✓ At rec&apos;d total</span>
                    ) : (
                      <button
                        onClick={() => {
                          setBudgetInputs((prev) => ({ ...prev, monthlyAdSpend: totalRecBudget }));
                          const sorted = [...selectedPlatforms].sort(
                            (a, b) => (perPlatformRecommendedSpend[b]?.target ?? 0) - (perPlatformRecommendedSpend[a]?.target ?? 0)
                          );
                          const newAlloc: Record<AdPlatform, number> = { google: 0, meta: 0, linkedin: 0, lsa: 0 };
                          let remaining = 100;
                          for (let i = 0; i < sorted.length - 1; i++) {
                            const pct = Math.round(((perPlatformRecommendedSpend[sorted[i]]?.target ?? 0) / totalRecBudget) * 100 / 5) * 5;
                            newAlloc[sorted[i]] = Math.max(5, pct);
                            remaining -= newAlloc[sorted[i]];
                          }
                          newAlloc[sorted[sorted.length - 1]] = Math.max(5, remaining);
                          setPlatformAllocations(newAlloc);
                          setPlatformAllocationsManuallyEdited(true);
                        }}
                        className="text-xs px-3 py-1.5 bg-cogent-sage text-cogent-navy-dark rounded-md hover:bg-cogent-sage/80 font-semibold shrink-0 transition-colors whitespace-nowrap"
                      >
                        Use {formatCurrency(totalRecBudget)}/mo →
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Budget split placeholder when no industry yet */}
          {selectedPlatforms.length > 1 && !clientInputs.industryId && (
            <div className="mt-4 p-4 border border-amber-200 rounded-lg bg-amber-50">
              <p className="text-sm text-amber-800">
                Select an industry above to see recommended budget splits across your selected platforms.
              </p>
            </div>
          )}
        </section>

        {/* LinkedIn Ads Strategy panel — only when LinkedIn is in the selected platforms.
            Hidden by default; expands to show industry-specific targeting, formats, copy
            frameworks, KPI benchmarks, and the full Cogent SOP guidance. */}
        {selectedPlatforms.includes("linkedin") && (
          <LinkedInStrategy
            industryId={clientInputs.industryId || null}
            industryName={selectedIndustry?.name ?? null}
            monthlyAdSpend={budgetInputs.monthlyAdSpend}
            linkedInSpend={
              selectedPlatforms.length > 1
                ? budgetInputs.monthlyAdSpend * (platformAllocations.linkedin / 100)
                : undefined
            }
          />
        )}

        {/* No benchmarks warning */}
        {clientInputs.industryId && !platformHasBenchmarks && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>No benchmark data available</strong> for {selectedIndustry?.name ?? "this industry"} on {PLATFORM_INFO[platform].label}.
              {platformRecs && platformRecs[platform].rating <= 2 && (
                <> This platform is <strong>not recommended</strong> for this industry. Consider switching to a higher-rated platform above.</>
              )}
              {" "}You can still add custom services and enter your own CPL/job values manually.
            </p>
          </div>
        )}

        {/* Section: Target Areas */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-cogent-navy">Target Areas</h2>
            <button
              onClick={addArea}
              className="px-3 py-1.5 text-xs font-medium bg-cogent-navy text-white rounded-md hover:bg-cogent-navy-dark transition-colors"
            >
              + Add Area
            </button>
          </div>
          <p className="text-sm text-cogent-neutral mb-4">
            Search for a US city to automatically set the market tier and CPL multiplier. Add a target radius to document your geo-targeting precision. For multi-region clients, split the budget across areas.
          </p>

          <div className="space-y-3">
            {targetAreas.map((area, idx) => (
              <div key={area.id} className="border border-gray-200 rounded-md p-4 bg-cogent-ivory/30">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-cogent-navy bg-cogent-ivory px-2 py-0.5 rounded">
                    Area {idx + 1}
                  </span>
                  {/* Targeting summary badge */}
                  {area.name && area.tier && (
                    <span className="text-xs text-cogent-neutral bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                      📍 {area.radiusMiles
                        ? `${area.radiusMiles}mi radius around ${area.name}`
                        : area.name}
                    </span>
                  )}
                  {targetAreas.length > 1 && (
                    <button
                      onClick={() => removeArea(area.id)}
                      className="ml-auto text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* City Search */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      City / Location
                    </label>
                    <CitySearch
                      value={area.name}
                      onChange={(val) => updateArea(area.id, "name", val)}
                      onSelect={(result: CitySearchResult) => {
                        setTargetAreas((prev) =>
                          prev.map((a) =>
                            a.id === area.id
                              ? { ...a, name: result.displayName, tier: result.tier }
                              : a
                          )
                        );
                      }}
                      placeholder="Search city, e.g. Charlotte, NC"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Type a US city to auto-fill market tier
                    </p>
                  </div>

                  {/* Market Size (auto-filled or manual) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Market Size
                      {area.tier && (
                        <span className="ml-1 text-[10px] text-cogent-sage-dark font-normal">
                          (auto-detected)
                        </span>
                      )}
                    </label>
                    <select
                      value={area.tier}
                      onChange={(e) => updateArea(area.id, "tier", e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cogent-navy focus:border-cogent-navy"
                    >
                      {Object.entries(MARKET_TIERS).map(([key, tier]) => (
                        <option key={key} value={key}>{tier.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Target Radius */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Target Radius <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={500}
                        step={5}
                        value={area.radiusMiles ?? ""}
                        onChange={(e) => updateAreaRadius(area.id, e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 pr-9 text-sm focus:ring-2 focus:ring-cogent-navy focus:border-cogent-navy"
                        placeholder="e.g. 25"
                      />
                      <span className="absolute right-3 top-2 text-gray-500 text-sm">mi</span>
                    </div>
                    {area.radiusMiles && area.name && (
                      <p className="text-[11px] text-cogent-sage-dark mt-1 font-medium">
                        Within {area.radiusMiles} miles of {area.name}
                      </p>
                    )}
                  </div>

                  {/* Budget Split */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Budget Split
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={area.budgetPercent}
                        onChange={(e) => updateArea(area.id, "budgetPercent", parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 pr-7 text-sm focus:ring-2 focus:ring-cogent-navy focus:border-cogent-navy"
                      />
                      <span className="absolute right-3 top-2 text-gray-500 text-sm">%</span>
                    </div>
                    {budgetInputs.monthlyAdSpend > 0 && (
                      <p className="text-[11px] text-cogent-neutral mt-1">
                        {formatCurrency(budgetInputs.monthlyAdSpend * area.budgetPercent / 100)}/mo
                      </p>
                    )}
                  </div>
                </div>

                {/* Market tier description + CPL impact */}
                {area.tier && MARKET_TIERS[area.tier]?.description && (
                  <p className="mt-2 text-xs text-cogent-neutral opacity-80">
                    {MARKET_TIERS[area.tier].description}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Budget split summary */}
          {targetAreas.length > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <div className={`text-sm ${Math.abs(totalAreaPercent - 100) > 0.5 ? "text-red-600 font-medium" : "text-cogent-neutral"}`}>
                Budget allocation: {totalAreaPercent.toFixed(1)}%
                {Math.abs(totalAreaPercent - 100) > 0.5 && " — should equal 100%"}
              </div>
              <button
                onClick={evenSplitAreas}
                className="text-xs text-cogent-navy hover:underline"
              >
                Split evenly
              </button>
            </div>
          )}

          {/* Blended multiplier summary */}
          {targetAreas.some((a) => a.tier) && (
            <div className={`mt-3 p-3 rounded-md text-sm ${
              blendedMultiplier > 1 ? "bg-amber-50 border border-amber-200 text-amber-800" :
              blendedMultiplier < 1 ? "bg-green-50 border border-green-200 text-green-800" :
              "bg-gray-50 border border-gray-200 text-gray-700"
            }`}>
              <p className="font-medium">
                {targetAreas.filter((a) => a.tier).length > 1
                  ? `Blended CPL Adjustment: ${blendedMultiplier > 1 ? "+" : ""}${Math.round((blendedMultiplier - 1) * 100)}% (weighted across ${targetAreas.filter((a) => a.tier).length} areas)`
                  : `CPL Adjustment: ${blendedMultiplier > 1 ? "+" : ""}${Math.round((blendedMultiplier - 1) * 100)}%${targetAreas[0]?.name ? ` for ${targetAreas[0].name}` : ""}`
                }
              </p>
            </div>
          )}
        </section>

        {/* Section B: Service Selection */}
        <ServiceSelection
          services={services}
          onChange={setServices}
          extractedServices={extractedServices}
          industryId={clientInputs.industryId}
          primaryPlatform={primaryPlatform}
          selectedPlatforms={selectedPlatforms}
          closeRate={budgetInputs.closeRate}
          monthlyAdSpend={budgetInputs.monthlyAdSpend}
          blendedMultiplier={blendedMultiplier}
          budgetMode={budgetMode}
          onBudgetModeChange={setBudgetMode}
          onMonthlyAdSpendChange={(val) =>
            setBudgetInputs((prev) => ({ ...prev, monthlyAdSpend: val }))
          }
        />

        {/* Section C: Budget + Sales Inputs */}
        <BudgetSalesInputs
          value={budgetInputs}
          onChange={setBudgetInputs}
          recommendedMin={recommendedSpend.min}
          recommendedTarget={recommendedSpend.target}
          spendWarning={spendWarning}
          industryCloseRate={currentIndustryCloseRate}
          closeRateManuallySet={closeRateManuallySet}
          onCloseRateManualChange={() => setCloseRateManuallySet(true)}
          onResetCloseRate={() => {
            if (currentIndustryCloseRate) {
              setBudgetInputs((prev) => ({ ...prev, closeRate: currentIndustryCloseRate.closeRate }));
              setCloseRateManuallySet(false);
            }
          }}
          selectedPlatforms={selectedPlatforms}
          platformAllocations={platformAllocations}
          perPlatformRecommendedSpend={perPlatformRecommendedSpend}
          budgetMode={budgetMode}
          maxRoiAdSpend={maxRoiAdSpend}
          selectedServices={services.filter((s) => s.selected)}
        />

        {/* Section D: Results */}
        <Results
          results={platformResults}
          selectedPlatforms={selectedPlatforms}
          platformAllocations={platformAllocations}
          roundingMode={budgetInputs.roundingMode}
          targetArea={areasSummary}
          marketTier={targetAreas.length === 1 ? targetAreas[0]?.tier : "blended"}
          marketMultiplier={blendedMultiplier}
          monthlyAdSpend={budgetMode === "maxroi" ? maxRoiAdSpend : budgetInputs.monthlyAdSpend}
          audienceSearchBehavior={clientInputs.industryId ? getAudienceInsights(clientInputs.industryId)?.searchBehavior ?? null : null}
        />

        {/* Section E: Keyword Suggestions (Google only) */}
        {selectedPlatforms.includes("google") && (
          <KeywordSuggestions
            services={services}
            industryId={clientInputs.industryId}
          />
        )}

        {/* Section F: Export */}
        <ExportSummary
          clientName={clientInputs.clientName}
          industryName={selectedIndustry?.name ?? "—"}
          services={services}
          result={result}
          roundingMode={budgetInputs.roundingMode}
        />

        {/* Section G: PowerPoint Export */}
        <PowerPointExport
          clientName={clientInputs.clientName}
          industryName={selectedIndustry?.name ?? "—"}
          platform={primaryPlatform}
          result={result}
          services={services}
          roundingMode={budgetInputs.roundingMode}
          targetAreas={targetAreas}
          monthlyAdSpend={budgetInputs.monthlyAdSpend}
          closeRate={budgetInputs.closeRate}
          closeRateIsDefault={!closeRateManuallySet}
          grossMarginPercent={budgetInputs.grossMarginPercent}
          blendedMultiplier={blendedMultiplier}
          websiteUrl={clientInputs.websiteUrl}
          selectedPlatforms={selectedPlatforms}
          platformAllocations={platformAllocations}
          platformResults={platformResults}
          industryCloseRate={currentIndustryCloseRate}
          isEcommerce={clientInputs.isEcommerce ?? false}
        />

        {/* Section H: Save & Load */}
        <SaveLoad
          getCurrentState={getCurrentState}
          loadState={loadSavedState}
          clientName={clientInputs.clientName}
          industryName={selectedIndustry?.name ?? "—"}
          getWordDocHtml={getWordDocHtml}
        />
      </main>

      {/* Footer */}
      <footer className="bg-cogent-navy px-6 py-4 mt-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/cogent-logo.png"
              alt="Cogent Analytics"
              width={28}
              height={28}
              className="rounded opacity-80"
            />
            <span className="text-xs text-gray-400">
              Cogent Analytics — Estimates are projections only and do not guarantee results.
            </span>
          </div>
          <div className="text-xs text-gray-500 text-right max-w-md">
            <p>Google Ads data: <a href="https://www.localiq.com/blog/search-advertising-benchmarks/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-300">LocaliQ 2025 Search Ad Benchmarks</a> · <a href="https://www.wordstream.com/blog/ws/2016/02/29/google-adwords-industry-benchmarks" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-300">WordStream Industry Benchmarks</a> · <a href="https://searchlightdigital.io/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-300">SearchLight Digital 2026 ($14.9M spend)</a> · <a href="https://business.google.com/us/google-ads/campaign-budget/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-300">Google Ads Budget Simulator</a></p>
            <p className="mt-0.5">Meta Ads data: <a href="https://www.wordstream.com/blog/ws/2016/02/29/google-adwords-industry-benchmarks" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-300">WordStream 2025</a> · <a href="https://focusdigital.co.uk/blog/facebook-ad-benchmarks/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-300">Focus Digital 2025</a> · <a href="https://adamigo.io/blog/facebook-ads-industry-benchmarks/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-300">AdAmigo 2026</a></p>
            <p className="mt-0.5">LinkedIn Ads data: <a href="https://b2bhouse.com/linkedin-ads-benchmarks/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-300">B2B House 2026</a> · <a href="https://adbacklog.com/linkedin-ads-benchmarks/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-300">AdBacklog 2025</a> · LinkedIn internal published data</p>
            <p className="mt-0.5">Google LSA data: Estimated from <a href="https://homeservicedirect.net/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-300">HomeServiceDirect.net 2026</a> and industry reports.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
