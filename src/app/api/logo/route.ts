import { NextRequest, NextResponse } from "next/server";

// Fetches a client logo server-side to bypass browser CORS restrictions.
// Tries multiple logo providers in order of image quality.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawDomain = searchParams.get("domain");

  if (!rawDomain) {
    return NextResponse.json({ error: "Missing domain parameter" }, { status: 400 });
  }

  // Strip protocol and path; extract just the hostname.
  const domain = rawDomain
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "")
    .trim();

  if (!domain) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  // Try multiple logo sources in order of image quality.
  // Logo.dev gives the highest quality, full logos. The others fall back to favicons.
  const sources = [
    `https://img.logo.dev/${domain}?token=pk_anonymous&size=200&format=png`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://favicon.im/${domain}?larger=true`,
  ];

  for (const logoUrl of sources) {
    try {
      const res = await fetch(logoUrl, {
        headers: {
          // Pretend to be a normal browser so providers that block non-browser UAs still respond.
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          Accept: "image/*",
        },
        // Don't hang forever on a slow provider
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) continue;

      const arrayBuffer = await res.arrayBuffer();
      // Skip tiny responses — usually a provider's default fallback icon.
      if (arrayBuffer.byteLength < 500) continue;

      const contentType = res.headers.get("content-type") ?? "image/png";

      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          // Cache aggressively — a company's logo rarely changes.
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      });
    } catch {
      // Try the next source
      continue;
    }
  }

  return NextResponse.json({ error: "No logo found" }, { status: 404 });
}
