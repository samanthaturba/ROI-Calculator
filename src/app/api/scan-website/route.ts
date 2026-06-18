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
    let usedJina = false;

    // ── Attempt 1: direct fetch with browser-like headers ──────────────────
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        html = await response.text();
      } else {
        // Non-2xx — fall through to Jina
        throw new Error(`HTTP ${response.status}`);
      }
    } catch {
      // ── Attempt 2: Jina AI reader (bypasses bot-detection on most sites) ──
      // r.jina.ai converts any URL to clean readable text — no API key needed.
      try {
        const jinaUrl = `https://r.jina.ai/${url}`;
        const jinaRes = await fetch(jinaUrl, {
          headers: {
            Accept: "text/plain",
            "User-Agent": "Mozilla/5.0 (compatible; CogentROI/1.0)",
          },
          signal: AbortSignal.timeout(20000),
        });

        if (!jinaRes.ok) {
          return NextResponse.json(
            { error: `Could not reach that site. The page may be private or require login.` },
            { status: 400 }
          );
        }

        // Jina returns clean text/markdown — treat it as the body directly
        const jinaText = await jinaRes.text();
        // Wrap in a fake HTML shell so the stripping logic below still works cleanly
        html = `<html><body>${jinaText}</body></html>`;
        usedJina = true;
      } catch {
        return NextResponse.json(
          { error: "Could not reach that site. Make sure the URL is correct and the site is publicly accessible." },
          { status: 400 }
        );
      }
    }

    void usedJina; // used for debugging if needed

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
