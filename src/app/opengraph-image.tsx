import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const alt = "Google Ads ROI Calculator — Cogent Analytics";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoData = await readFile(join(process.cwd(), "public", "cogent-logo.png"));
  const logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #002B49 0%, #00223A 50%, #00111D 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "#BCC26A",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28,
          }}
        >
          {/* Logos row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
            }}
          >
            {/* Cogent logo */}
            <img
              src={logoBase64}
              width={80}
              height={80}
              style={{ borderRadius: 12 }}
            />

            {/* Divider */}
            <div
              style={{
                width: 2,
                height: 60,
                background: "rgba(188, 194, 106, 0.4)",
              }}
            />

            {/* Google Ads icon */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                {/* Google Ads triangle logo */}
                <path d="M3.272 16.346l6.024-10.39a3.5 3.5 0 116.065 3.5L9.337 19.846a3.5 3.5 0 11-6.065-3.5z" fill="#FBBC04" />
                <path d="M20.728 16.346l-6.024-10.39a3.5 3.5 0 10-6.065 3.5l6.024 10.39a3.5 3.5 0 106.065-3.5z" fill="#4285F4" />
                <circle cx="6.3" cy="18.1" r="3.5" fill="#34A853" />
              </svg>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 28, fontWeight: 500 }}>
                Google Ads
              </span>
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 52,
                fontWeight: 700,
                color: "white",
                letterSpacing: "-0.02em",
              }}
            >
              ROI Calculator
            </span>
            <span
              style={{
                fontSize: 22,
                color: "#BCC26A",
                fontWeight: 500,
                letterSpacing: "0.05em",
              }}
            >
              POWERED BY COGENT ANALYTICS
            </span>
          </div>

          {/* Subtitle */}
          <span
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.5)",
              maxWidth: 600,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            Estimate revenue potential by industry benchmarks, service mix, and close rate
          </span>
        </div>

        {/* Bottom accent */}
        <div
          style={{
            position: "absolute",
            bottom: 30,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <div style={{ width: 40, height: 2, background: "rgba(188, 194, 106, 0.3)" }} />
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>cogentanalytics.com</span>
          <div style={{ width: 40, height: 2, background: "rgba(188, 194, 106, 0.3)" }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
