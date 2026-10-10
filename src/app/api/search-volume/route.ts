import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 25;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured", results: {} },
      { status: 503 }
    );
  }

  const body = await req.json();
  const { industryName, serviceNames, geoContext } = body as {
    industryName: string;
    serviceNames: string[];
    geoContext?: string;
  };

  if (!industryName || !serviceNames?.length) {
    return NextResponse.json(
      { error: "industryName and serviceNames required" },
      { status: 400 }
    );
  }

  const geoNote = geoContext
    ? `The user is targeting: ${geoContext}. Give US national monthly volumes (not geo-adjusted).`
    : "Give US national monthly search volumes.";

  const prompt = `You are a Google Ads keyword research expert. For the industry "${industryName}", estimate the approximate US national monthly Google search volume for each service category below.

${geoNote}

Service categories:
${serviceNames.map((s, i) => `${i + 1}. ${s}`).join("\n")}

For each service, estimate the COMBINED monthly search volume across the top 5-10 most relevant keywords someone would search when looking for that service. For example, for "AC Repair" you'd combine volumes for "ac repair near me", "air conditioning repair", "ac not working", "hvac repair", etc.

Respond ONLY with valid JSON — no markdown, no explanation. Format:
{
  "volumes": {
    "Service Name": { "volume": 12000, "keywords": "top 2-3 keywords" },
    ...
  }
}

Use realistic volume ranges. Be honest — some niche services genuinely have low volume. Use round numbers (100, 500, 1000, 2500, 5000, 10000, 25000, etc).`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown");
      return NextResponse.json(
        { error: `AI API error (${res.status}): ${errText}`, results: {} },
        { status: 500 }
      );
    }

    const data = await res.json();
    const text =
      data.content?.[0]?.type === "text" ? data.content[0].text : "";

    const parsed = JSON.parse(text);
    return NextResponse.json({ results: parsed.volumes ?? {} });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, results: {} }, { status: 500 });
  }
}
