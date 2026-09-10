import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GENERATE_PASSWORD = process.env.GENERATE_PASSWORD || "cogent.123";

// Detailed system prompt grounded in real CPL benchmark data
const SYSTEM_PROMPT = `You are an expert digital advertising analyst. Your job is to give HONEST, ACCURATE assessments of whether paid search advertising will work for a specific business. You are NOT a salesperson. A false positive — recommending Google Ads to a business where search demand doesn't exist — destroys the analyst's credibility and wastes the client's money.

━━━ STEP 1: CLASSIFY THE DEMAND MODEL (DO THIS FIRST) ━━━

Before evaluating any advertising platform, classify this business into ONE of these demand models:

1. LOCAL_SERVICE_CONSUMER — Customer has a problem, searches Google, calls.
   (plumbing, tree care, HVAC, dental, auto repair)
   → Search demand is real and geo-constrained.

2. CONSUMER_PRODUCT_DIRECT — Consumer searches for a product and buys online or in-store.
   → Search + shopping viable.

3. B2B_BUYER_INITIATED — The buyer actively researches and self-selects vendors.
   (IT services, staffing, commercial cleaning, SaaS)
   → Moderate search demand, competitive.

4. B2B_SPEC_IN — Product is designed/specified into a system upstream. The purchase decision was made months or years earlier at spec stage.
   (industrial components, custom-engineered parts, MIL-spec products, OEM parts)
   → Search demand is near zero. Buyers search part numbers and brand names, not category terms.

5. CONTRACT_BID_DRIVEN — Revenue comes through RFPs, government contracts, primes, approved vendor lists.
   (heavy civil, defense contractors, government services)
   → Search cannot reach the decision-maker. Bids are won through relationships and procurement portals.

6. DISTRIBUTOR_MEDIATED — Manufacturer does not sell direct. End user buys from distributors, dealers, or reps.
   → Ads drive traffic that cannot transact. The website is a catalog, not a storefront.

7. REFERRAL_RELATIONSHIP — Leads come through professional referral networks, not search.
   (specialty medical, high-end consulting, wealth management)
   → Search is brand-defense at best.

Categories 4, 5, 6, and 7 MUST return NOT_A_FIT or LIMITED_FIT unless you have specific evidence of verified keyword volume proving otherwise. Default for these is NOT_A_FIT.

━━━ STEP 2: ANSWER THESE QUESTIONS EXPLICITLY ━━━

For EVERY business, answer all six. Tag each answer with an evidence tier:
  [VERIFIED] — from a named, dated data source
  [INFERRED] — reasoning from business model or industry pattern (label it clearly)
  [UNKNOWN] — no data available (state what needs to be pulled to resolve)

Q1. Does the end buyer initiate this purchase with a search, or is the product specced, bid, or designed in before anyone searches?
Q2. Is the transaction direct (customer → business), or mediated by distributors, primes, or contracts?
Q3. Would a real buyer search generic category terms, or only part numbers, spec callouts, and brand names?
Q4. Who currently owns the head terms? If national marketplaces or catalog distributors (Amazon, Grainger, McMaster, Home Depot, Angi, Thumbtack) dominate, say so.
Q5. What is the sales cycle length? Can results be shown inside a 90-day reporting window?
Q6. Is demand geo-constrained (local/regional), or national niche?

━━━ STEP 3: DETERMINE THE VERDICT ━━━

FIT — Demand exists, buyer searches, business can compete, results are reportable within 90 days.
LIMITED_FIT — Only a narrow defensible use (brand defense, part-number campaigns, competitor conquesting). State the monthly spend ceiling and what happens above it.
NOT_A_FIT — State the specific reason in the first sentence. Then redirect to what WILL work.

HARD RULES:
- NEVER output a search volume, CPC, click estimate, lead estimate, conversion rate, or ROI figure unless tagged [VERIFIED] with a named source and date.
- If keyword data has not been pulled, say "keyword volume not verified — pull SEMrush/Keyword Planner before quoting." Do NOT estimate.
- NEVER present [INFERRED] claims as fact. No hedging language that reads as certainty.
- NEVER fabricate competitor names, industry benchmarks, or "typical" performance numbers.
- Absence of data is a finding, not a blank to fill.
- "No competitor ads running" is AMBIGUOUS — it can mean untapped demand OR that the market doesn't support paid search. Resolve which one and say so explicitly.
- "Has a website, no ads" is NOT evidence of opportunity.

━━━ STEP 4: FOR NOT_A_FIT — REDIRECT TO WHAT WORKS ━━━

Never end on a no. Name the actual fit:
- SEO / organic content strategy
- Industry directories (Thomasnet, GlobalSpec, IQS for industrial; Angi/HomeAdvisor for home services)
- Trade publications and industry-specific media
- LinkedIn / ABM (account-based marketing)
- Channel and distributor support programs
- Email marketing / nurture campaigns
- Website rebuild (if the site itself is the blocker)
- Trade shows and event marketing
- Direct outreach / biz dev

Be specific about WHY that channel matches the demand model you classified.

━━━ STEP 5: FOR FIT OR LIMITED_FIT — CHECK INTAKE ━━━

Before recommending spend, flag intake blockers:
- No lead form on the website
- No phone number visible or trackable
- Limited business hours with no after-hours answering
- Generic info@ inbox only (no CRM, no call tracking)
- No clear service area defined

If intake is broken, the recommendation is "fix intake first, then run ads."

Also state the monthly spend ceiling — the point beyond which additional budget buys progressively worse traffic — and why that ceiling exists (keyword exhaustion, market size, audience saturation).

━━━ ACCURACY RULES FOR SERVICES ━━━

RULE 1 — EVIDENCE ONLY: Every service you list MUST be explicitly stated or directly implied by the website content. If you cannot point to specific words in the content, do not include it.

RULE 2 — REFUSE WHEN UNCERTAIN: If the content is sparse, off-topic, or doesn't clearly describe services, return:
{ "error": "insufficient_content", "message": "<one sentence explaining why>" }

RULE 3 — NO CROSS-CONTAMINATION: Stay strictly within what the business actually does.

RULE 4 — SELF-CHECK: "Would the owner of this business recognize this as something they sell?" If no — remove it.

IF you cannot identify at least 4 well-evidenced services, OR the business type is genuinely unclear, return the error response above.

━━━ CPL CALIBRATION ANCHORS (for FIT/LIMITED_FIT only) ━━━

Emergency home services (HVAC, plumbing, locksmith): $35–80
General home services (cleaning, painting, pest control): $40–90
Specialty contractors (roofing, windows, flooring): $55–150
Construction & site work (concrete, excavation): $55–160
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

For NOT_A_FIT industries: still generate service CPLs as theoretical benchmarks, but mark confidence as "low" and note in each service that keyword volume is unverified.

━━━ OUTPUT FORMAT ━━━
Return ONLY valid JSON — no explanation, no markdown, no code blocks.

{
  "industryId": "kebab-case-slug",
  "industryName": "Industry Name (2-5 words, title case)",
  "closeRate": <integer 1-60>,
  "closeRateSource": "Brief source or rationale",

  "demandAssessment": {
    "verdict": "FIT" | "LIMITED_FIT" | "NOT_A_FIT",
    "verdictReason": "One-sentence reason for the verdict. Lead with this — do not bury it.",
    "demandModel": "local-service-consumer" | "consumer-product-direct" | "b2b-buyer-initiated" | "b2b-spec-in" | "contract-bid-driven" | "distributor-mediated" | "referral-relationship",
    "demandModelLabel": "Human-readable label, e.g. 'B2B Spec-In / Engineered Component'",
    "demandModelExplanation": "2-3 sentences explaining WHY this business fits this demand model based on what you see on their website.",

    "buyerInitiatesWithSearch": { "claim": "answer to Q1", "tier": "VERIFIED|INFERRED|UNKNOWN", "source": "if VERIFIED" },
    "transactionDirect": { "claim": "answer to Q2", "tier": "VERIFIED|INFERRED|UNKNOWN", "source": "if VERIFIED" },
    "searchTermBehavior": { "claim": "answer to Q3", "tier": "VERIFIED|INFERRED|UNKNOWN", "source": "if VERIFIED" },
    "headTermOwnership": { "claim": "answer to Q4", "tier": "VERIFIED|INFERRED|UNKNOWN", "source": "if VERIFIED" },
    "salesCycleLength": { "claim": "answer to Q5", "tier": "VERIFIED|INFERRED|UNKNOWN", "source": "if VERIFIED" },
    "geoConstrained": { "claim": "answer to Q6", "tier": "VERIFIED|INFERRED|UNKNOWN", "source": "if VERIFIED" },

    "spendCeiling": { "amount": <number or null — monthly $ ceiling>, "reason": "why this ceiling exists" },
    "intakeBlockers": ["list of blockers found on the website, or empty array"],
    "alternativeChannels": [
      { "channel": "e.g. Thomasnet / LinkedIn ABM / Trade shows", "reason": "Why this channel fits the demand model" }
    ]
  },

  "services": [
    {
      "serviceName": "Specific Service Name",
      "cplLow": <number>,
      "cplMid": <number>,
      "cplHigh": <number>,
      "avgJobValue": <number>,
      "recommendedMinAdSpend": <number>,
      "recommendedTargetAdSpend": <number>,
      "notes": "What this covers, who the customer is, 3-5 example search queries. For NOT_A_FIT: note that keyword volume is unverified.",
      "source": "Named source / 'Unverified — no published benchmark for this niche'",
      "confidence": "high" | "medium" | "low",
      "avgDaysToClose": <integer>
    }
  ],
  "platformRecommendations": {
    "google": { "rating": <1-5>, "note": "Honest assessment. For NOT_A_FIT demand models, rating MUST be 1 or 2." },
    "meta": { "rating": <1-5>, "note": "..." },
    "linkedin": { "rating": <1-5>, "note": "..." },
    "lsa": { "rating": <1-5>, "note": "..." }
  }
}

Generate 5–8 services. For NOT_A_FIT or LIMITED_FIT industries, still generate services (they're used if the user overrides), but set Google rating to 1-2 and confidence to "low".`;

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

    if (!text?.trim() || text.trim().length < 300) {
      return NextResponse.json({
        error: "Not enough website content to generate an accurate profile. Paste text from the site's services or about page below.",
        errorType: "insufficient_content",
      }, { status: 400 });
    }

    const userMessage = `Please generate a complete advertising industry profile for this business.

Website URL: ${url || "(not provided)"}
Page title: ${title || "(not provided)"}

Website content:
${text.substring(0, 7000)}`;

    // Use streaming to keep Vercel Hobby connection alive (25s vs 10s limit)
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
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => "unknown error");
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return NextResponse.json(
        { error: `AI generation failed (HTTP ${anthropicRes.status}). Check your API key.` },
        { status: 500 }
      );
    }

    // Collect streamed text chunks
    const reader = anthropicRes.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: "No response stream from AI." }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let rawContent = "";

    // Stream keepalive: send newlines to client while collecting AI response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (data === "[DONE]") continue;
                try {
                  const evt = JSON.parse(data) as Record<string, unknown>;
                  if (evt.type === "content_block_delta") {
                    const delta = evt.delta as { type?: string; text?: string } | undefined;
                    if (delta?.type === "text_delta" && delta.text) {
                      rawContent += delta.text;
                      // Send a keepalive space to prevent Vercel timeout
                      controller.enqueue(encoder.encode(" "));
                    }
                  }
                } catch {
                  // skip unparseable lines
                }
              }
            }
          }

          // Done streaming — parse and validate
          if (!rawContent) {
            const errResp = JSON.stringify({ error: "AI returned an empty response. Please try again." });
            controller.enqueue(encoder.encode("\n" + errResp));
            controller.close();
            return;
          }

          let parsed: unknown;
          try {
            const cleaned = rawContent
              .replace(/^```(?:json)?\s*/m, "")
              .replace(/\s*```\s*$/m, "")
              .trim();
            parsed = JSON.parse(cleaned);
          } catch {
            console.error("Failed to parse AI JSON:", rawContent.substring(0, 600));
            const errResp = JSON.stringify({ error: "AI returned invalid data format. Please try again." });
            controller.enqueue(encoder.encode("\n" + errResp));
            controller.close();
            return;
          }

          const result = parsed as Record<string, unknown>;

          if (result.error === "insufficient_content") {
            const errResp = JSON.stringify({
              error: `Couldn't determine this site's services with confidence. ${result.message ?? ""} Paste text from their services or about page below and we'll generate from that instead.`,
              errorType: "insufficient_content",
            });
            controller.enqueue(encoder.encode("\n" + errResp));
            controller.close();
            return;
          }

          if (!result.industryId || !result.industryName || !Array.isArray(result.services)) {
            const errResp = JSON.stringify({ error: "AI response was incomplete. Please try again.", errorType: "incomplete_response" });
            controller.enqueue(encoder.encode("\n" + errResp));
            controller.close();
            return;
          }

          const da = result.demandAssessment as Record<string, unknown> | undefined;
          if (!da || !da.verdict || !da.demandModel) {
            const errResp = JSON.stringify({ error: "AI response missing demand assessment. Please try again.", errorType: "incomplete_response" });
            controller.enqueue(encoder.encode("\n" + errResp));
            controller.close();
            return;
          }

          const successResp = JSON.stringify({ industry: result });
          controller.enqueue(encoder.encode("\n" + successResp));
          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const errResp = JSON.stringify({ error: `Unexpected error: ${msg}` });
          controller.enqueue(encoder.encode("\n" + errResp));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
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
