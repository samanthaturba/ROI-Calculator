"use client";

import type { AdPlatform, PlatformRecommendation } from "../lib/types";

interface Props {
  recommendations: Record<AdPlatform, PlatformRecommendation> | null;
  currentPlatform: AdPlatform;
  industryName: string;
}

const platformLabels: Record<AdPlatform, string> = {
  google: "Google Ads",
  meta: "Meta Ads",
  linkedin: "LinkedIn Ads",
  lsa: "Google LSA",
};

const platformIcons: Record<AdPlatform, string> = {
  google: "🔍",
  meta: "📱",
  linkedin: "💼",
  lsa: "📍",
};

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`text-sm ${i < rating ? "text-yellow-400" : "text-gray-300"}`}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function getRatingLabel(rating: number): { text: string; color: string } {
  if (rating >= 5) return { text: "Excellent", color: "text-green-700 bg-green-50 border-green-200" };
  if (rating >= 4) return { text: "Strong", color: "text-blue-700 bg-blue-50 border-blue-200" };
  if (rating >= 3) return { text: "Moderate", color: "text-yellow-700 bg-yellow-50 border-yellow-200" };
  if (rating >= 2) return { text: "Limited", color: "text-orange-700 bg-orange-50 border-orange-200" };
  if (rating >= 1) return { text: "Not Recommended", color: "text-red-700 bg-red-50 border-red-200" };
  return { text: "Not Available", color: "text-gray-500 bg-gray-50 border-gray-200" };
}

export default function PlatformRecommendations({
  recommendations,
  currentPlatform,
  industryName,
}: Props) {
  if (!recommendations) return null;

  const platforms: AdPlatform[] = ["google", "meta", "linkedin", "lsa"];

  // Find platforms rated 4+ that aren't the current one (for recommendation callout)
  const goodAlternatives = platforms.filter(
    (p) => p !== currentPlatform && recommendations[p].rating >= 4
  );

  return (
    <div className="space-y-3">
      {/* Star rating cards for all platforms */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {platforms.map((platform) => {
          const rec = recommendations[platform] ?? { rating: 0, note: "No data available for this platform." };
          const label = getRatingLabel(rec.rating);
          const isCurrent = platform === currentPlatform;

          return (
            <div
              key={platform}
              className={`p-3 rounded-lg border ${
                isCurrent
                  ? "border-cogent-navy/30 bg-cogent-navy/5 ring-1 ring-cogent-navy/20"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{platformIcons[platform]}</span>
                  <span className="text-sm font-semibold text-cogent-navy">
                    {platformLabels[platform]}
                  </span>
                </div>
                {isCurrent && (
                  <span className="text-[10px] font-medium text-cogent-navy bg-cogent-sage/30 px-1.5 py-0.5 rounded">
                    SELECTED
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <StarRating rating={rec.rating} />
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${label.color}`}>
                  {label.text}
                </span>
              </div>
              <p className="text-xs text-cogent-neutral leading-relaxed">{rec.note}</p>
            </div>
          );
        })}
      </div>

      {/* Recommendation callout for other strong platforms */}
      {goodAlternatives.length > 0 && (
        <div className="p-3 bg-cogent-sage/10 border border-cogent-sage/30 rounded-md">
          <p className="text-sm text-cogent-navy">
            <span className="font-semibold">💡 Recommendation:</span>{" "}
            {industryName} also performs well on{" "}
            {goodAlternatives.map((p, i) => (
              <span key={p}>
                {i > 0 && (i === goodAlternatives.length - 1 ? " and " : ", ")}
                <strong>{platformLabels[p]}</strong>
                {" "}({recommendations[p].rating}★)
              </span>
            ))}
            . Consider a multi-platform strategy for maximum reach.
          </p>
        </div>
      )}
    </div>
  );
}
