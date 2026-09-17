import { NextRequest, NextResponse } from "next/server";
import { GoogleAdsApi, enums } from "google-ads-api";

export const maxDuration = 25;

const GOOGLE_ADS_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const GOOGLE_ADS_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const GOOGLE_ADS_DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
const GOOGLE_ADS_REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN;
const GOOGLE_ADS_CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID;
const GOOGLE_ADS_MCC_ID = process.env.GOOGLE_ADS_MCC_ID;

function getMissingEnvVars(): string[] {
  const required: Record<string, string | undefined> = {
    GOOGLE_ADS_CLIENT_ID,
    GOOGLE_ADS_CLIENT_SECRET,
    GOOGLE_ADS_REFRESH_TOKEN,
    GOOGLE_ADS_CUSTOMER_ID,
  };
  return Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);
}

let clientSingleton: GoogleAdsApi | null = null;

function getClient(): GoogleAdsApi {
  if (!clientSingleton) {
    clientSingleton = new GoogleAdsApi({
      client_id: GOOGLE_ADS_CLIENT_ID!,
      client_secret: GOOGLE_ADS_CLIENT_SECRET!,
      developer_token: GOOGLE_ADS_DEVELOPER_TOKEN || "NOT_REQUIRED",
    });
  }
  return clientSingleton;
}

export interface KeywordCpcResult {
  keyword: string;
  avgMonthlSearches: number | null;
  competitionLevel: string | null;
  lowTopOfPageBidMicros: number | null;
  highTopOfPageBidMicros: number | null;
  cpcLow: number | null;
  cpcHigh: number | null;
  cpcMid: number | null;
}

export async function POST(req: NextRequest) {
  const missing = getMissingEnvVars();
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Google Ads API not configured. Missing: ${missing.join(", ")}`,
        configured: false,
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { keywords, geoTargetId } = body as {
      keywords?: string[];
      geoTargetId?: string;
    };

    if (!keywords || keywords.length === 0) {
      return NextResponse.json(
        { error: "At least one keyword is required." },
        { status: 400 }
      );
    }

    if (keywords.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 keywords per request." },
        { status: 400 }
      );
    }

    const client = getClient();
    const customer = client.Customer({
      customer_id: GOOGLE_ADS_CUSTOMER_ID!,
      refresh_token: GOOGLE_ADS_REFRESH_TOKEN!,
      login_customer_id: GOOGLE_ADS_MCC_ID,
    });

    const geoTarget = geoTargetId || "2840";
    const geoTargetConstant = `geoTargetConstants/${geoTarget}`;
    const languageConstant = "languageConstants/1000";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await customer.keywordPlanIdeas.generateKeywordIdeas({
      customer_id: GOOGLE_ADS_CUSTOMER_ID!,
      keyword_seed: { keywords },
      geo_target_constants: [geoTargetConstant],
      language: languageConstant,
      keyword_plan_network: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
      include_adult_keywords: false,
    } as Parameters<typeof customer.keywordPlanIdeas.generateKeywordIdeas>[0]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ideas: any[] = Array.isArray(response)
      ? response
      : (response.results ?? []);
    const results: KeywordCpcResult[] = [];

    for (const idea of ideas) {
      const metrics = idea.keyword_idea_metrics;
      const lowBid = metrics?.low_top_of_page_bid_micros
        ? Number(metrics.low_top_of_page_bid_micros)
        : null;
      const highBid = metrics?.high_top_of_page_bid_micros
        ? Number(metrics.high_top_of_page_bid_micros)
        : null;

      const cpcLow = lowBid !== null ? lowBid / 1_000_000 : null;
      const cpcHigh = highBid !== null ? highBid / 1_000_000 : null;
      const cpcMid =
        cpcLow !== null && cpcHigh !== null
          ? (cpcLow + cpcHigh) / 2
          : cpcLow ?? cpcHigh;

      let competitionLevel: string | null = null;
      if (metrics?.competition !== undefined && metrics.competition !== null) {
        const compEnum = metrics.competition as number;
        switch (compEnum) {
          case enums.KeywordPlanCompetitionLevel.LOW:
            competitionLevel = "LOW";
            break;
          case enums.KeywordPlanCompetitionLevel.MEDIUM:
            competitionLevel = "MEDIUM";
            break;
          case enums.KeywordPlanCompetitionLevel.HIGH:
            competitionLevel = "HIGH";
            break;
          default:
            competitionLevel = "UNSPECIFIED";
        }
      }

      results.push({
        keyword: idea.text ?? "",
        avgMonthlSearches: metrics?.avg_monthly_searches
          ? Number(metrics.avg_monthly_searches)
          : null,
        competitionLevel,
        lowTopOfPageBidMicros: lowBid,
        highTopOfPageBidMicros: highBid,
        cpcLow,
        cpcHigh,
        cpcMid,
      });
    }

    const keywordSet = new Set(keywords.map((k) => k.toLowerCase()));
    results.sort((a, b) => {
      const aExact = keywordSet.has(a.keyword.toLowerCase()) ? 0 : 1;
      const bExact = keywordSet.has(b.keyword.toLowerCase()) ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return (b.avgMonthlSearches ?? 0) - (a.avgMonthlSearches ?? 0);
    });

    return NextResponse.json({
      results,
      geoTarget,
      keywordsRequested: keywords,
      configured: true,
    });
  } catch (err: unknown) {
    // Extract detailed error info from gRPC errors
    let msg: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errObj = err as any;

    if (errObj?.errors && Array.isArray(errObj.errors)) {
      msg = errObj.errors
        .map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (e: any) =>
            e.error_code
              ? `${JSON.stringify(e.error_code)}: ${e.message}`
              : e.message ?? JSON.stringify(e)
        )
        .join("; ");
    } else if (errObj?.message) {
      msg = errObj.message;
    } else if (typeof err === "object" && err !== null) {
      msg = JSON.stringify(err, Object.getOwnPropertyNames(err), 2);
    } else {
      msg = String(err);
    }

    console.error("Google Ads API error:", msg);

    return NextResponse.json(
      { error: `Google Ads API error: ${msg}`, configured: true },
      { status: 500 }
    );
  }
}
