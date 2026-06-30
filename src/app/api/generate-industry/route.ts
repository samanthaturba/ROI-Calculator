import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GENERATE_PASSWORD = process.env.GENERATE_PASSWORD || "cogent.123";

// Detailed system prompt grounded in real CPL benchmark data
const SYSTEM_PROMPT = `You are an expert digital advertising analyst with deep knowledge of Google Ads, Meta Ads, LinkedIn Ads, and Google Local Service Ads (LSA) benchmarks across all B2B and B2C industries.

You have internalized real CPL (cost per lead) data from:
- LocaliQ 2025 Search Advertising Benchmarks (cross-industry)
- WordStream 2025 Industry Benchmarks
- First Page Sage 2026 B2B Lead Generation Report
- Google Ads Budget Simulator industry data
- HomeServiceDirect.net 2026 LSA CPL data

Your task: Generate a COMPLETE and ACCURATE advertising industry profile for a business based on their website content. The data must reflect real advertising market costs — not inflated, not aspirational. Be conservative. Ground every number.

━━━ CPL CALIBRATION ANCHORS ━━━
Use these as grounding references. Actual CPL for a given business should land near these ranges:

Emergency home services (HVAC breakdown, plumbing emergency, locksmith): $35–80
General home services (cleaning, painting, pest control): $40–90
Specialty contractors (roofing, windows, siding, flooring): $55–150
Construction & site work (concrete, excavation, grading): $55–160
Landscaping & outdoor services: $30–90
Auto services (repair, glass, detailing): $20–70
Medical & healthcare: $100–350
Legal services: $150–600
B2B professional services (consulting, IT, accounting): $80–250
B2B industrial/manufacturing: $80–300
Ecommerce retail: $15–60
Retail & food service: $20–70
Trucking & logistics (residential-facing): $40–120
Trucking & logistics (B2B fleet): $80–250
Real estate (buyer/seller leads): $40–120
Senior care / assisted living: $100–300

━━━ JOB VALUE CALIBRATION ━━━
avgJobValue = realistic median revenue for a SINGLE job/contract/order:
- Use local market rates (not national high-end)
- For recurring services: use single-visit value, not lifetime value
- For projects: use typical mid-range project cost to the customer

━━━ DAYS TO CLOSE ━━━
1 = emergency/same-day (customer calls, books immediately)
2–3 = standard service call (decides within 24-72h)
4–7 = comparison shopping (gets 1-2 quotes first)
7–21 = project quote → approval
21–60 = commercial contract, RFP, or multi-decision-maker
60–120 = large construction, government, or enterprise

━━━ PLATFORM RATINGS ━━━
1 = Not recommended (wrong audience, won't generate leads)
2 = Limited (niche use case, not a primary channel)
3 = Moderate (works as supplement to primary channels)
4 = Strong (proven, high-ROI secondary or co-primary channel)
5 = Excellent (primary lead generation channel for this industry)

━━━ CONFIDENCE LEVELS ━━━
"high" = very common industry with abundant published CPL data (HVAC, plumbing, roofing, dental)
"medium" = typical business type with some published data; AI estimate is well-grounded
"low" = niche, specialized, or unusual business type with limited published benchmark data

━━━ OUTPUT FORMAT ━━━
Return ONLY valid JSON — no explanation, no markdown, no code blocks, no commentary before or after.

{
  "industryId": "kebab-case-slug-unique-to-this-business-type",
  "industryName": "Industry Name (2-5 words, title case)",
  "closeRate": <integer 1-60>,
  "closeRateSource": "Brief source or rationale for this close rate",
  "services": [
    {
      "serviceName": "Specific Service Name",
      "cplLow": <number — 25th percentile, lower-competition markets or simpler keywords>,
      "cplMid": <number — median CPL, typical market>,
      "cplHigh": <number — 75th percentile, major metro or competitive keywords>,
      "avgJobValue": <number — median single-job revenue in dollars>,
      "recommendedMinAdSpend": <number — minimum monthly spend to generate ~3 jobs/month>,
      "recommendedTargetAdSpend": <number — target monthly spend to generate ~6 jobs/month>,
      "notes": "What this service covers, who the typical customer is, and 3-5 example Google search queries in quotes that buyers use.",
      "source": "LocaliQ 2025 [category] / WordStream 2025 / First Page Sage 2026 / [industry-specific if known]",
      "confidence": "high" | "medium" | "low",
      "avgDaysToClose": <integer>
    }
  ],
  "platformRecommendations": {
    "google": { "rating": <1-5>, "note": "Why Google Search does or doesn't work. Mention specific search behaviors." },
    "meta": { "rating": <1-5>, "note": "Why Facebook/Instagram does or doesn't work. Mention visual content, retargeting, or audience angles." },
    "linkedin": { "rating": <1-5>, "note": "Whether B2B LinkedIn targeting is relevant. Mention job titles or company types if applicable." },
    "lsa": { "rating": <1-5>, "note": "Whether Google Local Service Ads are available and effective for this category." }
  }
}

Generate 5–8 services that cover the full spectrum of what this business offers. Each service should be distinct enough that a campaign manager would run separate ad campaigns for them.`;

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY is not configured. Add it to your Vercel environment variables to enable AI industry generation.",
      },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { url, text, title, password } = body as {
      url?: string;
      text?: string;
      title?: string;
      password?: string;
    };

    if (password !== GENERATE_PASSWORD) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    if (!text?.trim()) {
      return NextResponse.json({ error: "No page text provided." }, { status: 400 });
    }

    const userMessage = `Please generate a complete advertising industry profile for this business.

Website URL: ${url || "(not provided)"}
Page title: ${title || "(not provided)"}

Website content:
${text.substring(0, 7000)}`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => "unknown error");
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return NextResponse.json(
        { error: `AI generation failed (HTTP ${anthropicRes.status}). Check your API key.` },
        { status: 500 }
      );
    }

    const anthropicData = (await anthropicRes.json()) as {
      content?: Array<{ type: string; text: string }>;
    };
    const rawContent = anthropicData.content?.[0]?.text ?? "";

    if (!rawContent) {
      return NextResponse.json({ error: "AI returned an empty response. Please try again." }, { status: 500 });
    }

    // Strip any accidental markdown fences and parse
    let parsed: unknown;
    try {
      const cleaned = rawContent
        .replace(/^```(?:json)?\s*/m, "")
        .replace(/\s*```\s*$/m, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI JSON:", rawContent.substring(0, 600));
      return NextResponse.json(
        { error: "AI returned invalid data format. Please try again." },
        { status: 500 }
      );
    }

    // Basic validation
    const result = parsed as Record<string, unknown>;
    if (!result.industryId || !result.industryName || !Array.isArray(result.services)) {
      return NextResponse.json(
        { error: "AI response was incomplete. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ industry: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("TimeoutError") || msg.includes("abort")) {
      return NextResponse.json(
        { error: "AI generation timed out. Please try again." },
        { status: 504 }
      );
    }
    return NextResponse.json({ error: `Unexpected error: ${msg}` }, { status: 500 });
  }
}
