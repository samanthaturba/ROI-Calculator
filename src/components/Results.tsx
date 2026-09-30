"use client";

import { useState } from "react";
import type { CalculationResult, RoundingMode, AdPlatform, ServiceSelection as ServiceSelectionType } from "../lib/types";
import { formatCurrency, formatNumber } from "../lib/calculations";
import type { AudienceInsight, IndustryAlternativeMarketing } from "../lib/benchmarks";
import { getAlternativeMarketing } from "../lib/benchmarks";

interface Props {
  results: Record<AdPlatform, CalculationResult | null>;
  selectedPlatforms: AdPlatform[];
  platformAllocations: Record<AdPlatform, number>;
  roundingMode: RoundingMode;
  targetArea?: string;
  marketTier?: string;
  marketMultiplier?: number;
  monthlyAdSpend?: number;
  /** When "low", shows a caveat on the projection that this audience has limited search behavior */
  audienceSearchBehavior?: "high" | "medium" | "low" | null;
  /** Demand assessment verdict from AI classification — overrides audienceSearchBehavior when present */
  demandVerdict?: "FIT" | "LIMITED_FIT" | "NOT_A_FIT" | null;
  /** Gross margin percentage entered by user — null means not entered */
  grossMarginPercent?: number | null;
  /** Industry ID for alternative marketing suggestions */
  industryId?: string;
  /** Industry display name */
  industryName?: string;
  /** Pre-fetched audience insights for this industry */
  audienceInsights?: AudienceInsight | null;
  /** All available services for the industry (selected and unselected) */
  availableServices?: ServiceSelectionType[];
}

const PLATFORM_NAMES: Record<AdPlatform, string> = {
  google: "Google Ads",
  meta: "Meta Ads",
  linkedin: "LinkedIn Ads",
  lsa: "Google Local Services Ads",
};

const PLATFORM_ICONS: Record<AdPlatform, string> = {
  google: "\uD83D\uDD0D",
  meta: "\uD83D\uDCF1",
  linkedin: "\uD83D\uDCBC",
  lsa: "\uD83D\uDCCD",
};

function MetricTooltip({ label, explanation }: { label: string; explanation: string }) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="cursor-help border-b border-dotted border-gray-400">{label}</span>
      <span className="ml-1 text-gray-400 cursor-help text-[10px]">{"\u24D8"}</span>
      {show && (
        <span className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-cogent-navy text-white text-xs rounded-md shadow-lg">
          {explanation}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-cogent-navy" />
        </span>
      )}
    </span>
  );
}

const LOW_ROAS_THRESHOLD = 3;

function LowRoasWarning({ roas, gpRoas, grossMarginPercent, industryId, industryName, audienceInsights, availableServices }: { roas: number; gpRoas: number | null; grossMarginPercent?: number | null; industryId?: string; industryName?: string; audienceInsights?: AudienceInsight | null; availableServices?: ServiceSelectionType[] }) {
  const effectiveRoas = gpRoas !== null ? gpRoas : roas;
  if (effectiveRoas <= 0 || effectiveRoas >= LOW_ROAS_THRESHOLD) return null;

  const noMarginEntered = grossMarginPercent === null || grossMarginPercent === undefined;
  const usingRevenueRoas = gpRoas === null;

  return (
    <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
      <p className="text-sm font-bold text-red-800 mb-2">
        ⚠️ Low Return on Ad Spend — {effectiveRoas.toFixed(1)}x {usingRevenueRoas ? "ROAS" : "GP ROAS"}
      </p>
      <p className="text-sm text-red-700 mb-2">
        For every $1 spent on ads, only ${effectiveRoas.toFixed(2)} of {usingRevenueRoas ? "revenue" : "gross profit"} is projected. A healthy campaign typically returns 3x or more. Before presenting this to a client, consider:
      </p>
      <ul className="text-sm text-red-700 list-disc list-inside space-y-1 mb-2">
        <li><strong>Try a different campaign mix</strong> — adjust service selections or try different platforms</li>
        <li><strong>Look at lower-CPL locations</strong> — smaller or less competitive markets can lower the cost per lead</li>
        <li><strong>Double-check job value and close rate</strong> — are these realistic for this business? Higher average ticket or improved close rate directly improves ROAS</li>
      </ul>
      {noMarginEntered && (
        <p className="text-sm text-red-800 font-semibold mt-2 p-2 bg-red-100 rounded">
          ⚠️ No gross margin entered — the {effectiveRoas.toFixed(1)}x is based on top-line revenue only. After subtracting the cost of doing the jobs (labor, materials, overhead), the actual return will be even lower. Enter a gross margin % above for a more accurate picture.
        </p>
      )}
      <p className="text-xs text-red-600 mt-2">
        If the numbers are accurate and ROAS is still below 3x, this may not be a strong ad-spend opportunity for the client. The owner may need to work on close rate, job value, or pricing before ads make sense.
      </p>
      <AlternativeMarketingOptions industryId={industryId} industryName={industryName} audienceInsights={audienceInsights} availableServices={availableServices} context="low-roas" />
    </div>
  );
}

const STRATEGY_ICONS: Record<string, string> = {
  event: "🎪",
  prospecting: "🎯",
  bizdev: "🤝",
  content: "📝",
};

const GENERAL_ALTERNATIVES: { title: string; detail: string; roiNote: string }[] = [
  {
    title: "Direct Mail Campaigns",
    detail: "Targeted mailers to homeowners or businesses in the service area. Works especially well for home services, contractors, and local B2B. Every Door Direct Mail (EDDM) keeps postage low.",
    roiNote: "Typical response rate 1–5%. At $0.50–$1.50/piece, a $2,000 campaign reaching 2,000 homes can generate 20–100 inquiries. ROI depends heavily on job value — high-ticket services ($5K+) often see 5–10x return.",
  },
  {
    title: "SEO & Google Business Profile",
    detail: "Organic search visibility through a well-optimized website and active Google Business Profile with reviews. Takes 3–6 months to build but generates leads at near-zero marginal cost once established.",
    roiNote: "No direct ad spend — the investment is time and content. Businesses with 50+ Google reviews and strong local SEO often get 30–50% of their leads organically. Long-term ROI is typically the highest of any channel.",
  },
  {
    title: "Referral & Review Programs",
    detail: "Structured referral incentives for existing customers and systematic review collection. The highest-converting lead source for most service businesses — referred leads close at 2–3x the rate of cold leads.",
    roiNote: "A $50–$100 referral bonus on a $2,000+ job is effectively a 3–5% marketing cost — far cheaper than ads. Many businesses report 10–20x ROI on referral program spend.",
  },
  {
    title: "Social Media & Community Presence",
    detail: "Consistent posting on Facebook, Instagram, or LinkedIn (depending on audience) with before/after work, customer stories, and community involvement. Builds trust and keeps the business top-of-mind.",
    roiNote: "Hard to measure directly, but businesses active on social report 15–25% of leads mentioning they found them there. Works best paired with other channels as a trust-builder.",
  },
  {
    title: "Networking & Strategic Partnerships",
    detail: "Build relationships with complementary businesses that serve the same customer base. A plumber partners with realtors, an HVAC company partners with home inspectors, a commercial contractor partners with property managers.",
    roiNote: "Zero direct cost. One strong referral partner can send 3–5 qualified leads per month. These leads typically close at high rates because they come with a trusted recommendation.",
  },
];

const CHANNEL_RESOURCE_URLS: Record<string, { url: string; label: string }> = {
  "Direct Mail": { url: "https://www.addy.co", label: "Addy.co — Direct Mail Platform" },
  "EDDM": { url: "https://www.addy.co", label: "Addy.co — Direct Mail Platform" },
  "SEO": { url: "https://moz.com/learn/seo/local", label: "Moz — Local SEO Guide" },
  "Google Business Profile": { url: "https://business.google.com", label: "Google Business Profile" },
  "Review Generation": { url: "https://birdeye.com", label: "Birdeye — Review Management" },
  "Review + Reputation": { url: "https://birdeye.com", label: "Birdeye — Review Management" },
  "Reputation Management": { url: "https://birdeye.com", label: "Birdeye — Review Management" },
  "Email Marketing": { url: "https://mailchimp.com", label: "Mailchimp — Email Marketing" },
  "Email Drip": { url: "https://mailchimp.com", label: "Mailchimp — Email Marketing" },
  "Email Campaigns": { url: "https://mailchimp.com", label: "Mailchimp — Email Marketing" },
  "Meta": { url: "https://www.facebook.com/business/ads", label: "Meta Business — Ad Platform" },
  "Facebook Ads": { url: "https://www.facebook.com/business/ads", label: "Meta Business — Ad Platform" },
  "LinkedIn Ads": { url: "https://business.linkedin.com/marketing-solutions/ads", label: "LinkedIn — Ad Platform" },
  "LinkedIn": { url: "https://business.linkedin.com/marketing-solutions/ads", label: "LinkedIn — Ad Platform" },
  "ThomasNet": { url: "https://www.thomasnet.com", label: "ThomasNet — Industrial Directory" },
  "Content Marketing": { url: "https://ahrefs.com/blog", label: "Ahrefs — Content & SEO Research" },
  "Technical Content": { url: "https://ahrefs.com/blog", label: "Ahrefs — Content & SEO Research" },
  "Google Ads": { url: "https://ads.google.com", label: "Google Ads Platform" },
};

function getChannelResource(channelName: string): { url: string; label: string } | null {
  for (const [keyword, resource] of Object.entries(CHANNEL_RESOURCE_URLS)) {
    if (channelName.includes(keyword)) return resource;
  }
  return null;
}

function AlternativeMarketingOptions({ industryId, industryName, audienceInsights, availableServices, context = "standalone" }: { industryId?: string; industryName?: string; audienceInsights?: AudienceInsight | null; availableServices?: ServiceSelectionType[]; context?: "standalone" | "low-roas" }) {
  const [expanded, setExpanded] = useState(false);

  const hasIndustryInsights = audienceInsights && audienceInsights.strategies.length > 0;
  const altMarketing = industryId ? getAlternativeMarketing(industryId) : null;

  const selectedServices = availableServices?.filter((s) => s.selected) ?? [];
  const selectedJobValues = selectedServices.map((s) => s.customJobValue ?? s.benchmark?.avgJobValue ?? 0);
  const maxSelectedJobValue = Math.max(0, ...selectedJobValues);
  const higherValueServices = context === "low-roas" ? (availableServices ?? [])
    .filter((s) => !s.selected && !s.isManual && (s.benchmark?.avgJobValue ?? 0) > maxSelectedJobValue)
    .sort((a, b) => (b.benchmark?.avgJobValue ?? 0) - (a.benchmark?.avgJobValue ?? 0)) : [];

  const isStandalone = context === "standalone";
  const borderColor = isStandalone ? "border-cogent-navy/20" : "border-red-200";
  const headerColor = isStandalone ? "text-cogent-navy" : "text-red-800";
  const headerHover = isStandalone ? "hover:text-cogent-navy-dark" : "hover:text-red-900";
  const subtitleColor = isStandalone ? "text-cogent-neutral" : "text-red-600";
  const disclaimerColor = isStandalone ? "text-cogent-neutral" : "text-red-600";

  return (
    <div className={isStandalone ? "mt-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm" : "mt-3 border-t border-red-200 pt-3"}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 text-sm font-semibold ${headerColor} ${headerHover} transition-colors w-full text-left`}
      >
        <span className={`transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}>▶</span>
        <span>{isStandalone ? "💡 " : ""}Other Marketing Channels{industryName ? ` for ${industryName}` : ""}</span>
        <span className={`text-xs font-normal ${subtitleColor} ml-1`}>
          {altMarketing ? `${altMarketing.channels.length} industry-specific channels` : "Alternative marketing options"}
        </span>
      </button>
      {isStandalone && !expanded && (
        <p className="text-xs text-cogent-neutral mt-1 ml-5">
          Beyond paid ads — additional marketing channels Cogent can deliver for this industry
        </p>
      )}

      {expanded && (
        <div className="mt-3 space-y-4">
          {higherValueServices.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 mb-1">
                Higher-value campaigns available in {industryName || "this industry"}
              </p>
              <p className="text-xs text-blue-800 mb-2">
                The selected service{selectedServices.length > 1 ? "s have" : " has"} a lower average job value. These unselected campaigns have higher ticket sizes, which can dramatically improve ROAS with the same ad spend:
              </p>
              <div className="space-y-1.5">
                {higherValueServices.slice(0, 5).map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-blue-900">
                    <span className="font-semibold">{s.serviceName}</span>
                    <span className="px-1.5 py-0.5 bg-blue-100 rounded text-blue-700 font-medium">
                      {formatCurrency(s.benchmark?.avgJobValue ?? 0)} avg job
                    </span>
                    {s.benchmark?.cplMid && (
                      <span className="text-blue-600">
                        ~{formatCurrency(s.benchmark.cplMid)} CPL
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-700 mt-2 italic">
                Try selecting these services above — a {formatCurrency(higherValueServices[0]?.benchmark?.avgJobValue ?? 0)} job at the same close rate returns far more per lead than a {formatCurrency(maxSelectedJobValue)} job.
              </p>
            </div>
          )}

          {hasIndustryInsights && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-semibold text-amber-900 mb-1">
                Industry-Specific Insight — {audienceInsights!.industry}
              </p>
              <p className="text-xs text-amber-800 mb-3">
                Primary buyer: <strong>{audienceInsights!.primaryBuyer}</strong>
                {audienceInsights!.searchBehavior === "low" && (
                  <> — this audience has <strong>low search behavior</strong>, meaning Google Ads may not be the best channel regardless of budget.</>
                )}
                {audienceInsights!.searchBehavior === "medium" && (
                  <> — this audience has <strong>moderate search behavior</strong>. Ads can work for some services but not all.</>
                )}
              </p>
              <p className="text-xs font-semibold text-amber-800 mb-2">Recommended strategies for this industry:</p>
              <div className="space-y-2">
                {audienceInsights!.strategies.map((s, i) => (
                  <div key={i} className="text-xs text-amber-900">
                    <p className="font-semibold">{STRATEGY_ICONS[s.type] || "📌"} {s.title}</p>
                    <p className="text-amber-800 mt-0.5">{s.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {altMarketing ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm font-semibold text-emerald-900 mb-1">
                {isStandalone ? "Additional" : "Alternative"} Marketing Channels for {altMarketing.categoryLabel}
              </p>
              <p className="text-xs text-emerald-800 mb-3">
                These channels have proven track records in the <strong>{altMarketing.categoryLabel.toLowerCase()}</strong> vertical. Each includes realistic ROI expectations and timeline so the AM can set proper client expectations:
              </p>
              <div className="space-y-4">
                {altMarketing.channels.map((ch, i) => {
                  const resource = getChannelResource(ch.channel);
                  return (
                    <div key={i} className="text-xs border-b border-emerald-100 pb-3 last:border-b-0 last:pb-0">
                      <p className="font-semibold text-emerald-900 text-sm">{ch.icon} {ch.channel}</p>
                      <p className="text-emerald-800 mt-1">{ch.detail}</p>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        <div className="flex items-start gap-1.5">
                          <span className="font-semibold text-emerald-700 whitespace-nowrap">Expected ROI:</span>
                          <span className="text-emerald-800">{ch.roiRange}</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="font-semibold text-emerald-700 whitespace-nowrap">Timeline:</span>
                          <span className="text-emerald-800">{ch.timeline}</span>
                        </div>
                      </div>
                      <p className="text-emerald-700 mt-1.5 italic">Metrics: {ch.metrics}</p>
                      <p className="text-emerald-600 mt-1">Best for: {ch.bestFor}</p>
                      {resource && (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
                        >
                          🔗 {resource.label} ↗
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-600 mb-3">
                {isStandalone
                  ? "Additional marketing channels to discuss with the client. These won’t have the same precise projections as ad campaigns, but they’re proven paths for service businesses:"
                  : "If paid ads aren’t generating strong enough returns, here are other marketing channels to discuss with the client:"}
              </p>
              <div className="space-y-3">
                {GENERAL_ALTERNATIVES.map((alt, i) => (
                  <div key={i} className="text-xs">
                    <p className="font-semibold text-gray-800">{alt.title}</p>
                    <p className="text-gray-600 mt-0.5">{alt.detail}</p>
                    <p className="text-gray-500 mt-0.5 italic">General ROI: {alt.roiNote}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className={`text-xs ${disclaimerColor} italic`}>
            {altMarketing
              ? "These are industry-specific estimates based on typical performance in this vertical, not precise projections. Use them as talking points with the client — the right mix depends on their market, budget, and capacity."
              : "These estimates are general industry ranges, not precise projections like the ad calculator above. Use them as talking points to guide the conversation — the right mix depends on the client’s market, budget, and capacity."}
          </p>
        </div>
      )}
    </div>
  );
}

// Single-platform result view (unchanged from original)
function SinglePlatformResults({
  result,
  roundingMode,
  targetArea,
  marketMultiplier,
  platform,
  audienceSearchBehavior,
  grossMarginPercent,
  industryId,
  industryName,
  audienceInsights,
  availableServices,
}: {
  result: CalculationResult;
  roundingMode: RoundingMode;
  targetArea?: string;
  marketTier?: string;
  marketMultiplier?: number;
  platform: AdPlatform;
  audienceSearchBehavior?: "high" | "medium" | "low" | null;
  grossMarginPercent?: number | null;
  industryId?: string;
  industryName?: string;
  audienceInsights?: AudienceInsight | null;
  availableServices?: ServiceSelectionType[];
}) {
  const platformName = PLATFORM_NAMES[platform];
  const isConservative = roundingMode === "conservative";
  const jobs = isConservative ? result.totalJobsRounded : result.totalJobs;
  const revenue = isConservative ? result.totalRevenueRounded : result.totalRevenue;
  const gp = isConservative ? result.grossProfitRounded : result.grossProfit;

  const conservativeRevenue = result.totalRevenueRounded;
  const optimisticRevenue = result.totalRevenue;
  const showRange = Math.abs(conservativeRevenue - optimisticRevenue) > 100;

  const avgCpc = result.weightedAvgCpl * 0.15;
  const cpcMultiplier = platform === "google" ? 1.0 : platform === "meta" ? 0.6 : platform === "linkedin" ? 2.5 : 0;
  const estimatedCpc = platform === "lsa" ? 0 : avgCpc * cpcMultiplier;

  const roas = result.totalSpend > 0 ? revenue / result.totalSpend : 0;
  const gpRoas = gp !== null && result.totalSpend > 0 ? gp / result.totalSpend : null;

  return (
    <>
      <h2 className="text-lg font-semibold text-cogent-navy mb-1">
        Estimated Revenue Potential — {platformName}
      </h2>
      <p className="text-xs text-cogent-neutral mb-4">
        Based on {platformName} industry benchmarks and the inputs provided. Actual results will vary based on campaign optimization, lead quality, and close rate.
      </p>

      {/* Market adjustment note */}
      {marketMultiplier && marketMultiplier !== 1.0 && (
        <div className="mb-4 p-3 bg-cogent-ivory border border-gray-200 rounded-md text-sm text-cogent-neutral">
          CPL adjusted {marketMultiplier > 1 ? "+" : ""}{Math.round((marketMultiplier - 1) * 100)}% for {targetArea || "selected market size"}
        </div>
      )}

      {/* Low-search audience caveat */}
      {audienceSearchBehavior === "low" && (platform === "google" || platform === "lsa") && (
        <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-md">
          <p className="text-sm font-semibold text-amber-800 mb-1">
            ⚠️ Audience Note — Limited Search Behavior
          </p>
          <p className="text-xs text-amber-700 leading-relaxed">
            This industry&apos;s primary buyers (plant managers, procurement officers, etc.) don&apos;t typically use Google to find these services.
            These projections show what search ads <strong>can</strong> capture from active searchers, but actual lead volume may be lower than projected.
            For best results, pair ads with event marketing, direct outreach, and biz dev — see the Audience Intelligence section above.
          </p>
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm font-medium text-amber-800 mb-1">Warnings:</p>
          <ul className="text-sm text-amber-700 list-disc list-inside">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-cogent-ivory rounded-lg p-4 border border-gray-100">
          <div className="text-xs text-cogent-neutral uppercase tracking-wide">Ad Spend</div>
          <div className="text-xl font-bold text-cogent-navy-dark mt-1">
            {formatCurrency(result.totalSpend)}
          </div>
          <div className="text-xs text-gray-400">/month</div>
        </div>
        <div className="bg-cogent-ivory rounded-lg p-4 border border-gray-100">
          <div className="text-xs text-cogent-neutral uppercase tracking-wide">Est. Avg CPL</div>
          <div className="text-xl font-bold text-cogent-navy-dark mt-1">
            {formatCurrency(Math.round(result.weightedAvgCpl))}
          </div>
          <div className="text-xs text-gray-400">weighted avg</div>
        </div>
        <div className="rounded-lg p-4 border border-cogent-sage/30" style={{ background: "rgba(188, 194, 106, 0.1)" }}>
          <div className="text-xs text-cogent-navy uppercase tracking-wide">Est. Leads/Mo</div>
          <div className="text-xl font-bold text-cogent-navy mt-1">
            ~{formatNumber(result.totalLeads)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">form fills &amp; calls</div>
        </div>
        <div className="rounded-lg p-4 border border-cogent-sage/30" style={{ background: "rgba(188, 194, 106, 0.15)" }}>
          <div className="text-xs text-cogent-navy uppercase tracking-wide">Est. Jobs/Mo</div>
          <div className="text-xl font-bold text-cogent-navy mt-1">
            ~{isConservative ? jobs : formatNumber(jobs)}
          </div>
          <div className="text-xs text-gray-400">
            at {result.closeRate}% close rate
          </div>
        </div>
        <div className="rounded-lg p-4 border border-cogent-sage/50" style={{ background: "rgba(188, 194, 106, 0.22)" }}>
          <div className="text-xs font-medium text-cogent-navy uppercase tracking-wide">Est. Revenue/Mo</div>
          <div className="text-xl font-bold text-cogent-navy-dark mt-1">
            ~{formatCurrency(revenue)}
          </div>
        </div>
      </div>

      {/* Gross Profit — prominent standalone card, shown when margin is set */}
      {gp !== null && (
        <div className="mt-4 p-5 rounded-xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 to-emerald-50/40 flex items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-widest mb-0.5">
              💰 Est. Gross Profit / Month
            </div>
            <div className="text-xs text-gray-500 mt-1">
              After direct job costs — what stays in the business from these ads
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-extrabold text-emerald-700">
              ~{formatCurrency(gp)}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">per month</div>
          </div>
        </div>
      )}

      {/* What these numbers mean */}
      <div className="mb-6 p-4 bg-cogent-ivory/60 border border-gray-200 rounded-lg">
        <h3 className="text-sm font-semibold text-cogent-navy mb-2">What These Numbers Mean</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-cogent-neutral">
          <div>
            <p className="font-semibold text-cogent-navy-dark mb-0.5">Est. Leads/Mo (~{formatNumber(result.totalLeads)})</p>
            <p>This is the estimated number of <strong>form submissions, phone calls, and direct inquiries</strong> your ads are projected to generate each month. These are people actively reaching out to your business after seeing your ad.</p>
          </div>
          <div>
            <p className="font-semibold text-cogent-navy-dark mb-0.5">Est. Jobs/Mo (~{isConservative ? jobs : formatNumber(jobs)})</p>
            <p>Based on your <strong>{result.closeRate}% close rate</strong>, this is how many of those leads are expected to convert into paying jobs. This depends on how quickly you respond, your sales process, and how effectively leads are followed up on.</p>
          </div>
          <div>
            <p className="font-semibold text-cogent-navy-dark mb-0.5">Est. Revenue/Mo (~{formatCurrency(revenue)})</p>
            <p>Estimated monthly revenue based on your average job value multiplied by estimated jobs. Actual revenue varies with job mix, upsells, and seasonal factors.</p>
          </div>
        </div>
      </div>

      {/* Advanced Metrics Row */}
      <div className={`grid gap-4 mb-6 ${gpRoas !== null ? "grid-cols-3" : "grid-cols-2"}`}>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          {platform === "lsa" ? (
            <>
              <div className="text-xs text-cogent-neutral uppercase tracking-wide mb-1">
                <MetricTooltip
                  label="CPC"
                  explanation="Local Services Ads charge per lead, not per click. There is no CPC — Google charges a flat fee for each verified lead."
                />
              </div>
              <div className="text-lg font-bold text-cogent-navy-dark">
                N/A
              </div>
              <div className="text-xs text-gray-400">
                LSA charges per lead, not per click
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-cogent-neutral uppercase tracking-wide mb-1">
                <MetricTooltip
                  label="Est. CPC"
                  explanation="Cost Per Click — the estimated average cost each time someone clicks your ad. Varies by keyword competition, ad quality, and platform."
                />
              </div>
              <div className="text-lg font-bold text-cogent-navy-dark">
                ${estimatedCpc.toFixed(2)}
              </div>
              <div className="text-xs text-gray-400">
                {platform === "google" ? "search click avg" : platform === "meta" ? "social click avg" : "professional click avg"}
              </div>
            </>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-xs text-cogent-neutral uppercase tracking-wide mb-1">
            <MetricTooltip
              label="Est. ROAS"
              explanation="Return on Ad Spend — for every $1 spent on ads, how many dollars of revenue are estimated. A ROAS of 5x means $5 revenue per $1 ad spend. Higher is better."
            />
          </div>
          <div className="text-lg font-bold text-cogent-navy-dark">
            {roas > 0 ? `${roas.toFixed(1)}x` : "\u2014"}
          </div>
          <div className="text-xs text-gray-400">revenue per $1 ad spend</div>
        </div>
        {gpRoas !== null && (
          <div className="rounded-lg p-4 border-2 border-emerald-300 bg-emerald-50/50">
            <div className="text-xs text-emerald-800 uppercase tracking-wide mb-1">
              <MetricTooltip
                label="Est. GP ROAS"
                explanation="Gross Profit Return on Ad Spend — for every $1 spent on ads, how many dollars of gross profit are estimated after direct job costs. This is the true return the business keeps."
              />
            </div>
            <div className="text-lg font-bold text-emerald-700">
              {gpRoas > 0 ? `${gpRoas.toFixed(1)}x` : "—"}
            </div>
            <div className="text-xs text-emerald-600/70">gross profit per $1 ad spend</div>
          </div>
        )}
      </div>

      {/* Low ROAS warning */}
      <LowRoasWarning roas={roas} gpRoas={gpRoas} grossMarginPercent={grossMarginPercent} industryId={industryId} industryName={industryName} audienceInsights={audienceInsights} availableServices={availableServices} />

      {/* Revenue range */}
      {showRange && (
        <div className="mb-4 p-3 bg-cogent-ivory border border-gray-200 rounded-md text-sm">
          <p className="font-medium text-cogent-navy mb-1">Estimated Revenue Range:</p>
          <div className="flex gap-6 text-cogent-neutral">
            <span>Conservative: <span className="font-semibold">{formatCurrency(conservativeRevenue)}</span>/mo</span>
            <span>Projected: <span className="font-semibold">{formatCurrency(optimisticRevenue)}</span>/mo</span>
          </div>
          <p className="text-xs text-cogent-neutral mt-1 opacity-75">
            Conservative rounds down to whole jobs only. Projected uses exact math. Actual results will fall within or near this range as campaigns mature.
          </p>
        </div>
      )}

      {/* Per-service breakdown */}
      {result.serviceResults.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-cogent-navy mb-2">Per-Service Breakdown (Estimated)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-cogent-navy/10">
                  <th className="text-left py-2 px-2 text-cogent-navy font-medium">Service</th>
                  <th className="text-right py-2 px-2 text-cogent-navy font-medium">Spend</th>
                  <th className="text-right py-2 px-2 text-cogent-navy font-medium">Est. CPL</th>
                  <th className="text-right py-2 px-2 text-cogent-navy font-medium">Est. Leads</th>
                  <th className="text-right py-2 px-2 text-cogent-navy font-medium">Est. Jobs</th>
                  <th className="text-right py-2 px-2 text-cogent-navy font-medium">Job Value</th>
                  <th className="text-right py-2 px-2 text-cogent-navy font-medium">Est. Revenue</th>
                  <th className="text-center py-2 px-2 text-cogent-navy font-medium">Conf.</th>
                </tr>
              </thead>
              <tbody>
                {result.serviceResults.map((sr) => (
                  <tr key={sr.serviceName} className="border-b border-gray-100 hover:bg-cogent-ivory/50">
                    <td className="py-2 px-2 text-gray-900">{sr.serviceName}</td>
                    <td className="text-right py-2 px-2">{formatCurrency(sr.allocatedSpend)}</td>
                    <td className="text-right py-2 px-2">{formatCurrency(sr.cplUsed)}</td>
                    <td className="text-right py-2 px-2">~{formatNumber(sr.leads)}</td>
                    <td className="text-right py-2 px-2">
                      ~{isConservative ? sr.jobsRounded : formatNumber(sr.jobs)}
                    </td>
                    <td className="text-right py-2 px-2">{formatCurrency(sr.jobValue)}</td>
                    <td className="text-right py-2 px-2 font-medium">
                      ~{formatCurrency(isConservative ? sr.revenueRounded : sr.revenue)}
                    </td>
                    <td className="text-center py-2 px-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        sr.confidence === "high"
                          ? "bg-green-100 text-green-700"
                          : sr.confidence === "medium"
                          ? "bg-yellow-100 text-yellow-700"
                          : sr.confidence === "custom"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-orange-100 text-orange-700"
                      }`}>
                        {sr.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Learning & Ramp-Up Period */}
      <div className="mt-6 p-4 bg-cogent-navy/5 border border-cogent-navy/10 rounded-lg">
        <h3 className="text-sm font-semibold text-cogent-navy mb-2">
          {platformName} Learning &amp; Ramp-Up Period
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-cogent-neutral">
          <div className="p-3 bg-white rounded-md border border-gray-100">
            <p className="font-semibold text-cogent-navy mb-1">Weeks 1-2: Learning Phase</p>
            <p>
              {platform === "google"
                ? "Google's algorithm is gathering data. Expect higher CPL and fewer conversions. Do not make major changes during this period."
                : platform === "meta"
                ? "Meta's algorithm is learning your audience. Ad delivery will fluctuate. Avoid editing ads or audiences during this phase."
                : platform === "lsa"
                ? "Your LSA profile is building visibility. Lead volume starts low as Google verifies your business and profile completeness."
                : "LinkedIn's audience targeting is calibrating. Expect higher CPL initially as the algorithm identifies your ideal prospects."}
            </p>
          </div>
          <div className="p-3 bg-white rounded-md border border-gray-100">
            <p className="font-semibold text-cogent-navy mb-1">Weeks 3-6: Optimization</p>
            <p>
              {platform === "google"
                ? "Data builds, CPL stabilizes. Campaign adjustments begin. Results start trending toward benchmarks shown above."
                : platform === "meta"
                ? "Audience data matures. Retargeting audiences build. CPL begins to stabilize as winning ad creatives emerge."
                : platform === "lsa"
                ? "Lead volume increases as reviews accumulate and your profile ranks higher. Respond quickly to leads to maintain your ranking."
                : "Sponsored Content and InMail performance stabilizes. A/B test messaging and audience segments for better CPL."}
            </p>
          </div>
          <div className="p-3 bg-white rounded-md border border-gray-100">
            <p className="font-semibold text-cogent-navy mb-1">Months 2-3+: Mature Performance</p>
            <p>
              {platform === "google"
                ? "Campaigns are optimized and performing at or near projected benchmarks. Continuous optimization drives improvement."
                : platform === "meta"
                ? "Lookalike audiences and retargeting are fully built. Campaigns running at steady-state performance with consistent lead flow."
                : platform === "lsa"
                ? "Established profile with consistent lead flow. Maintain high review ratings and fast response times to keep top placement."
                : "Pipeline of B2B leads is established. Account-based targeting refined. Ongoing optimization for lower CPL and higher-quality leads."}
            </p>
          </div>
        </div>
        <p className="text-xs text-cogent-neutral mt-3 opacity-80">
          Most {platformName} campaigns require 60-90 days to reach full optimization. The estimates above represent mature campaign performance, not Day 1 results.
        </p>
      </div>

      {/* Results Depend On */}
      <div className="mt-4 p-4 bg-amber-50/50 border border-amber-200/50 rounded-lg">
        <h3 className="text-sm font-semibold text-amber-900 mb-2">Important: Results Depend On Multiple Factors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-amber-800">
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Lead follow-up speed</strong> — responding within 5 minutes vs. 24 hours dramatically impacts close rate</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Phone answer rate</strong> — missed calls = missed revenue. Every unanswered call is a lost lead</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Landing page quality</strong> — conversion rate depends on clear CTAs, trust signals, and mobile experience</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Sales process</strong> — how quickly and effectively leads are quoted and followed up on</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Seasonal demand</strong> — some industries see 2-3x swings between peak and off-season</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Local competition</strong> — more competitors bidding = higher CPL in your area</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Review reputation</strong> — businesses with strong {platform === "google" || platform === "lsa" ? "Google" : "online"} reviews see higher click and conversion rates{platform === "lsa" ? ". Reviews directly impact LSA ranking" : ""}</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Budget consistency</strong> — pausing and restarting campaigns resets the learning period</span>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 p-4 border-2 border-cogent-navy/20 rounded-lg bg-white">
        <h3 className="text-sm font-semibold text-cogent-navy mb-2">Disclaimer</h3>
        <p className="text-xs text-cogent-neutral leading-relaxed">
          The projections shown above are <strong>estimates based on published industry benchmarks</strong> and the inputs provided.
          They represent the <strong>potential opportunity</strong>, not a guarantee of results. Actual lead volume, cost per lead,
          close rate, and revenue will vary based on campaign setup, market conditions, competition, seasonality, and the
          client&apos;s ability to effectively respond to and close leads. Cogent Analytics does not guarantee any specific number
          of leads, jobs, or revenue. These figures are intended to illustrate the potential return on investment from {platformName}
          {" "}and to help set realistic expectations for campaign performance once fully optimized (typically 60-90 days).
        </p>
      </div>

      {/* Data quality notes */}
      {(result.hasCustomEstimates || result.hasLowConfidence) && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm">
          {result.hasCustomEstimates && (
            <p className="text-amber-700">
              Some values are custom estimates based on user-entered values.
            </p>
          )}
          {result.hasLowConfidence && (
            <p className="text-amber-700">
              Some benchmarks are low-confidence seed data — replace with researched benchmarks before client use.
            </p>
          )}
        </div>
      )}

      {/* Formula transparency */}
      <div className="mt-4 p-3 bg-cogent-ivory border border-gray-200 rounded-md">
        <p className="text-xs font-medium text-cogent-navy mb-1">How this was calculated:</p>
        <div className="text-xs text-cogent-neutral font-mono space-y-0.5">
          <p>est. leads = ad_spend / CPL = {formatCurrency(result.totalSpend)} / {formatCurrency(Math.round(result.weightedAvgCpl))} = ~{formatNumber(result.totalLeads)}</p>
          <p>est. jobs = leads &times; close_rate = ~{formatNumber(result.totalLeads)} &times; {result.closeRate}% = ~{formatNumber(result.totalJobs)}</p>
          <p>est. revenue = jobs &times; avg_job_value = ~{formatCurrency(revenue)}</p>
          {roas > 0 && <p>est. ROAS = revenue / ad_spend = ~{formatCurrency(revenue)} / {formatCurrency(result.totalSpend)} = ~{roas.toFixed(1)}x</p>}
          {gpRoas !== null && gpRoas > 0 && <p>est. GP ROAS = gross_profit / ad_spend = ~{formatCurrency(gp!)} / {formatCurrency(result.totalSpend)} = ~{gpRoas.toFixed(1)}x</p>}
        </div>
      </div>

      {/* Always-visible alternative marketing channels */}
      <AlternativeMarketingOptions industryId={industryId} industryName={industryName} audienceInsights={audienceInsights} availableServices={availableServices} context="standalone" />
    </>
  );
}

export default function Results({
  results,
  selectedPlatforms,
  platformAllocations,
  roundingMode,
  targetArea,
  marketTier,
  marketMultiplier,
  monthlyAdSpend,
  audienceSearchBehavior,
  demandVerdict,
  grossMarginPercent,
  industryId,
  industryName,
  audienceInsights,
  availableServices,
}: Props) {
  const effectiveLowSearch = demandVerdict === "NOT_A_FIT" || demandVerdict === "LIMITED_FIT" || audienceSearchBehavior === "low";
  // Check if any platform has results
  const hasAnyResults = selectedPlatforms.some((p) => results[p] !== null);

  if (!hasAnyResults) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-cogent-navy mb-2">Estimated Revenue Potential</h2>
        <p className="text-sm text-gray-500">
          Fill in the inputs above to see projected revenue potential.
        </p>
      </section>
    );
  }

  // Single platform selected — show exactly as before
  if (selectedPlatforms.length === 1) {
    const platform = selectedPlatforms[0];
    const result = results[platform];
    if (!result) return null;

    return (
      <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <SinglePlatformResults
          result={result}
          roundingMode={roundingMode}
          targetArea={targetArea}
          marketTier={marketTier}
          marketMultiplier={marketMultiplier}
          platform={platform}
          audienceSearchBehavior={effectiveLowSearch ? "low" : audienceSearchBehavior}
          grossMarginPercent={grossMarginPercent}
          industryId={industryId}
          industryName={industryName}
          audienceInsights={audienceInsights}
          availableServices={availableServices}
        />
      </section>
    );
  }

  // Multi-platform view
  const activeResults = selectedPlatforms
    .map((p) => ({ platform: p, result: results[p] }))
    .filter((r): r is { platform: AdPlatform; result: CalculationResult } => r.result !== null);

  if (activeResults.length === 0) return null;

  // Calculate combined totals
  const isConservative = roundingMode === "conservative";
  const combinedSpend = activeResults.reduce((s, r) => s + r.result.totalSpend, 0);
  const combinedLeads = activeResults.reduce((s, r) => s + r.result.totalLeads, 0);
  const combinedJobs = isConservative
    ? activeResults.reduce((s, r) => s + r.result.totalJobsRounded, 0)
    : activeResults.reduce((s, r) => s + r.result.totalJobs, 0);
  const combinedRevenue = isConservative
    ? activeResults.reduce((s, r) => s + r.result.totalRevenueRounded, 0)
    : activeResults.reduce((s, r) => s + r.result.totalRevenue, 0);
  const combinedGP = activeResults.every((r) => (isConservative ? r.result.grossProfitRounded : r.result.grossProfit) !== null)
    ? activeResults.reduce((s, r) => s + (isConservative ? r.result.grossProfitRounded! : r.result.grossProfit!), 0)
    : null;
  const combinedRoas = combinedSpend > 0 ? combinedRevenue / combinedSpend : 0;
  const combinedGpRoas = combinedGP !== null && combinedSpend > 0 ? combinedGP / combinedSpend : null;
  const combinedCloseRate = activeResults[0].result.closeRate;

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-cogent-navy mb-1">
        Estimated Revenue Potential — Combined ({selectedPlatforms.length} Platforms)
      </h2>
      <p className="text-xs text-cogent-neutral mb-4">
        Combined projections across {activeResults.map((r) => PLATFORM_NAMES[r.platform]).join(", ")}. Actual results will vary by platform.
      </p>

      {/* Market adjustment note */}
      {marketMultiplier && marketMultiplier !== 1.0 && (
        <div className="mb-4 p-3 bg-cogent-ivory border border-gray-200 rounded-md text-sm text-cogent-neutral">
          CPL adjusted {marketMultiplier > 1 ? "+" : ""}{Math.round((marketMultiplier - 1) * 100)}% for {targetArea || "selected market size"}
        </div>
      )}

      {/* Low-search audience caveat */}
      {effectiveLowSearch && selectedPlatforms.some((p) => p === "google" || p === "lsa") && (
        <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-md">
          <p className="text-sm font-semibold text-amber-800 mb-1">
            ⚠️ Audience Note — Limited Search Behavior
          </p>
          <p className="text-xs text-amber-700 leading-relaxed">
            This industry&apos;s primary buyers don&apos;t typically use Google to find these services.
            These projections show what search ads <strong>can</strong> capture, but actual lead volume may be lower.
            Pair ads with event marketing, direct outreach, and biz dev for maximum impact — see the Audience Intelligence section above.
          </p>
        </div>
      )}

      {/* Combined Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-cogent-ivory rounded-lg p-4 border border-gray-100">
          <div className="text-xs text-cogent-neutral uppercase tracking-wide">Total Ad Spend</div>
          <div className="text-xl font-bold text-cogent-navy-dark mt-1">
            {formatCurrency(combinedSpend)}
          </div>
          <div className="text-xs text-gray-400">/month combined</div>
        </div>
        <div className="bg-cogent-ivory rounded-lg p-4 border border-gray-100">
          <div className="text-xs text-cogent-neutral uppercase tracking-wide">Avg CPL</div>
          <div className="text-xl font-bold text-cogent-navy-dark mt-1">
            {formatCurrency(Math.round(combinedLeads > 0 ? combinedSpend / combinedLeads : 0))}
          </div>
          <div className="text-xs text-gray-400">blended avg</div>
        </div>
        <div className="rounded-lg p-4 border border-cogent-sage/30" style={{ background: "rgba(188, 194, 106, 0.1)" }}>
          <div className="text-xs text-cogent-navy uppercase tracking-wide">Est. Leads/Mo</div>
          <div className="text-xl font-bold text-cogent-navy mt-1">
            ~{formatNumber(combinedLeads)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">all platforms</div>
        </div>
        <div className="rounded-lg p-4 border border-cogent-sage/30" style={{ background: "rgba(188, 194, 106, 0.15)" }}>
          <div className="text-xs text-cogent-navy uppercase tracking-wide">Est. Jobs/Mo</div>
          <div className="text-xl font-bold text-cogent-navy mt-1">
            ~{isConservative ? combinedJobs : formatNumber(combinedJobs)}
          </div>
          <div className="text-xs text-gray-400">
            at {combinedCloseRate}% close rate
          </div>
        </div>
        <div className="rounded-lg p-4 border border-cogent-sage/50" style={{ background: "rgba(188, 194, 106, 0.22)" }}>
          <div className="text-xs font-medium text-cogent-navy uppercase tracking-wide">Est. Revenue/Mo</div>
          <div className="text-xl font-bold text-cogent-navy-dark mt-1">
            ~{formatCurrency(combinedRevenue)}
          </div>
        </div>
      </div>

      {/* Gross Profit — prominent standalone card, shown when margin is set */}
      {combinedGP !== null && (
        <div className="mt-4 p-5 rounded-xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 to-emerald-50/40 flex items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-widest mb-0.5">
              💰 Est. Gross Profit / Month
            </div>
            <div className="text-xs text-gray-500 mt-1">
              After direct job costs — what stays in the business from these ads
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-extrabold text-emerald-700">
              ~{formatCurrency(combinedGP)}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">per month combined</div>
          </div>
        </div>
      )}

      {/* Combined ROAS */}
      <div className={`grid gap-4 mb-6 ${combinedGpRoas !== null ? "grid-cols-3" : "grid-cols-2"}`}>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-xs text-cogent-neutral uppercase tracking-wide mb-1">
            <MetricTooltip
              label="Combined ROAS"
              explanation="Return on Ad Spend across all selected platforms combined."
            />
          </div>
          <div className="text-lg font-bold text-cogent-navy-dark">
            {combinedRoas > 0 ? `${combinedRoas.toFixed(1)}x` : "\u2014"}
          </div>
          <div className="text-xs text-gray-400">revenue per $1 ad spend</div>
        </div>
        {combinedGpRoas !== null && (
          <div className="rounded-lg p-4 border-2 border-emerald-300 bg-emerald-50/50">
            <div className="text-xs text-emerald-800 uppercase tracking-wide mb-1">
              <MetricTooltip
                label="Combined GP ROAS"
                explanation="Gross Profit Return on Ad Spend across all platforms \u2014 for every $1 spent on ads, how many dollars of gross profit are estimated after direct job costs."
              />
            </div>
            <div className="text-lg font-bold text-emerald-700">
              {combinedGpRoas > 0 ? `${combinedGpRoas.toFixed(1)}x` : "\u2014"}
            </div>
            <div className="text-xs text-emerald-600/70">gross profit per $1 ad spend</div>
          </div>
        )}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-xs text-cogent-neutral uppercase tracking-wide mb-1">Platforms</div>
          <div className="text-sm font-medium text-cogent-navy-dark mt-1">
            {activeResults.map((r) => (
              <span key={r.platform} className="inline-flex items-center gap-1 mr-3">
                {PLATFORM_ICONS[r.platform]} {PLATFORM_NAMES[r.platform]} ({platformAllocations[r.platform]}%)
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Low ROAS warning */}
      <LowRoasWarning roas={combinedRoas} gpRoas={combinedGpRoas} grossMarginPercent={grossMarginPercent} industryId={industryId} industryName={industryName} audienceInsights={audienceInsights} availableServices={availableServices} />

      {/* Per-platform breakdown sections */}
      <div className="space-y-6 mt-6">
        {activeResults.map(({ platform, result: platResult }) => {
          const platRevenue = isConservative ? platResult.totalRevenueRounded : platResult.totalRevenue;
          const platJobs = isConservative ? platResult.totalJobsRounded : platResult.totalJobs;
          const platRoas = platResult.totalSpend > 0 ? platRevenue / platResult.totalSpend : 0;

          return (
            <div key={platform} className="border border-gray-200 rounded-lg p-4 bg-cogent-ivory/20">
              <h3 className="text-sm font-semibold text-cogent-navy mb-3 flex items-center gap-2">
                <span className="text-lg">{PLATFORM_ICONS[platform]}</span>
                {PLATFORM_NAMES[platform]} — {formatCurrency(platResult.totalSpend)}/month ({platformAllocations[platform]}%)
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                <div className="text-center p-2 bg-white rounded border border-gray-100">
                  <div className="text-[10px] text-cogent-neutral uppercase">Spend</div>
                  <div className="text-sm font-bold text-cogent-navy-dark">{formatCurrency(platResult.totalSpend)}</div>
                </div>
                <div className="text-center p-2 bg-white rounded border border-gray-100">
                  <div className="text-[10px] text-cogent-neutral uppercase">Avg CPL</div>
                  <div className="text-sm font-bold text-cogent-navy-dark">{formatCurrency(Math.round(platResult.weightedAvgCpl))}</div>
                </div>
                <div className="text-center p-2 bg-white rounded border border-gray-100">
                  <div className="text-[10px] text-cogent-neutral uppercase">Leads/Mo</div>
                  <div className="text-sm font-bold text-cogent-navy">~{formatNumber(platResult.totalLeads)}</div>
                </div>
                <div className="text-center p-2 bg-white rounded border border-gray-100">
                  <div className="text-[10px] text-cogent-neutral uppercase">Jobs/Mo</div>
                  <div className="text-sm font-bold text-cogent-navy">~{isConservative ? platJobs : formatNumber(platJobs)}</div>
                </div>
                <div className="text-center p-2 bg-white rounded border border-cogent-sage/30" style={{ background: "rgba(188, 194, 106, 0.12)" }}>
                  <div className="text-[10px] text-cogent-navy uppercase">Revenue/Mo</div>
                  <div className="text-sm font-bold text-cogent-navy-dark">~{formatCurrency(platRevenue)}</div>
                  {platRoas > 0 && <div className="text-[10px] text-gray-400">{platRoas.toFixed(1)}x ROAS</div>}
                </div>
              </div>

              {/* Per-service table for this platform */}
              {platResult.serviceResults.length > 1 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-1.5 px-2 text-cogent-navy font-medium">Service</th>
                        <th className="text-right py-1.5 px-2 text-cogent-navy font-medium">Spend</th>
                        <th className="text-right py-1.5 px-2 text-cogent-navy font-medium">CPL</th>
                        <th className="text-right py-1.5 px-2 text-cogent-navy font-medium">Leads</th>
                        <th className="text-right py-1.5 px-2 text-cogent-navy font-medium">Jobs</th>
                        <th className="text-right py-1.5 px-2 text-cogent-navy font-medium">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {platResult.serviceResults.map((sr) => (
                        <tr key={sr.serviceName} className="border-b border-gray-50">
                          <td className="py-1.5 px-2 text-gray-900">{sr.serviceName}</td>
                          <td className="text-right py-1.5 px-2">{formatCurrency(sr.allocatedSpend)}</td>
                          <td className="text-right py-1.5 px-2">{formatCurrency(sr.cplUsed)}</td>
                          <td className="text-right py-1.5 px-2">~{formatNumber(sr.leads)}</td>
                          <td className="text-right py-1.5 px-2">~{isConservative ? sr.jobsRounded : formatNumber(sr.jobs)}</td>
                          <td className="text-right py-1.5 px-2 font-medium">~{formatCurrency(isConservative ? sr.revenueRounded : sr.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Learning period — show for primary platform only */}
      <div className="mt-6 p-4 bg-cogent-navy/5 border border-cogent-navy/10 rounded-lg">
        <h3 className="text-sm font-semibold text-cogent-navy mb-2">
          Learning &amp; Ramp-Up Period
        </h3>
        <p className="text-xs text-cogent-neutral mb-3">
          Most ad platform campaigns require 60-90 days to reach full optimization. The estimates above represent mature campaign performance, not Day 1 results.
        </p>
        <div className="text-xs text-cogent-neutral space-y-1">
          {activeResults.map(({ platform: plat }) => (
            <p key={plat}>
              <span className="font-medium">{PLATFORM_ICONS[plat]} {PLATFORM_NAMES[plat]}:</span>{" "}
              {plat === "google" ? "Weeks 1-2 learning, weeks 3-6 optimization, months 2-3+ mature performance."
                : plat === "meta" ? "Weeks 1-2 audience learning, weeks 3-6 retargeting builds, months 2-3+ steady-state."
                : plat === "lsa" ? "Weeks 1-2 building visibility, weeks 3-6 review accumulation, months 2-3+ established."
                : "Weeks 1-2 audience calibration, weeks 3-6 A/B testing, months 2-3+ pipeline established."}
            </p>
          ))}
        </div>
      </div>

      {/* Results Depend On */}
      <div className="mt-4 p-4 bg-amber-50/50 border border-amber-200/50 rounded-lg">
        <h3 className="text-sm font-semibold text-amber-900 mb-2">Important: Results Depend On Multiple Factors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-amber-800">
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Lead follow-up speed</strong> — responding within 5 minutes vs. 24 hours dramatically impacts close rate</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Phone answer rate</strong> — missed calls = missed revenue. Every unanswered call is a lost lead</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Landing page quality</strong> — conversion rate depends on clear CTAs, trust signals, and mobile experience</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Sales process</strong> — how quickly and effectively leads are quoted and followed up on</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Seasonal demand</strong> — some industries see 2-3x swings between peak and off-season</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Local competition</strong> — more competitors bidding = higher CPL in your area</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Review reputation</strong> — businesses with strong reviews see higher click and conversion rates</span>
          </div>
          <div className="flex items-start gap-2 py-1">
            <span className="text-amber-500 mt-0.5">&#9679;</span>
            <span><strong>Budget consistency</strong> — pausing and restarting campaigns resets the learning period</span>
          </div>
        </div>
      </div>

      {/* Always-visible alternative marketing channels */}
      <AlternativeMarketingOptions industryId={industryId} industryName={industryName} audienceInsights={audienceInsights} availableServices={availableServices} context="standalone" />

      {/* Disclaimer */}
      <div className="mt-4 p-4 border-2 border-cogent-navy/20 rounded-lg bg-white">
        <h3 className="text-sm font-semibold text-cogent-navy mb-2">Disclaimer</h3>
        <p className="text-xs text-cogent-neutral leading-relaxed">
          The projections shown above are <strong>estimates based on published industry benchmarks</strong> and the inputs provided.
          They represent the <strong>potential opportunity</strong>, not a guarantee of results. Actual lead volume, cost per lead,
          close rate, and revenue will vary based on campaign setup, market conditions, competition, seasonality, and the
          client&apos;s ability to effectively respond to and close leads. Cogent Analytics does not guarantee any specific number
          of leads, jobs, or revenue. These figures are intended to illustrate the potential return on investment from advertising
          and to help set realistic expectations for campaign performance once fully optimized (typically 60-90 days).
        </p>
      </div>
    </section>
  );
}
