import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawUrl: string = body?.url ?? "";

    if (!rawUrl.trim()) {
      return NextResponse.json({ error: "URL is required." }, { status: 400 });
    }

    // Normalise — add https:// if missing
    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

    let html: string;
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; CogentROIScanner/1.0; +https://cogentanalytics.com)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Could not reach that site (HTTP ${response.status}). Try pasting the page text manually.` },
          { status: 400 }
        );
      }

      html = await response.text();
    } catch {
      return NextResponse.json(
        { error: "Could not connect to that URL. Make sure it is publicly accessible." },
        { status: 400 }
      );
    }

    // ── Strip boilerplate ───────────────────────────────────────────────────────
    // Remove scripts, styles, nav/footer boilerplate
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch
      ? titleMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
      : "";

    // Extract meta description
    const descMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    const metaDescription = descMatch ? descMatch[1].trim() : "";

    // Prioritise title + meta desc + first 8K of body text for detection
    const combinedText = [title, metaDescription, stripped]
      .filter(Boolean)
      .join(" ")
      .substring(0, 12000);

    return NextResponse.json({ text: combinedText, title, metaDescription });
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected error: ${String(err)}` },
      { status: 500 }
    );
  }
}
