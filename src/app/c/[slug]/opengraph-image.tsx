// /c/[slug]/opengraph-image.tsx — OG image for WhatsApp link preview (PUB-02).
// Renders a 1200x630 PNG via next/og ImageResponse with:
//   - ShramSetu brand logo ("श्र")
//   - Worker first name + trade
//   - "Skill Verified" stamp if applicable
//   - Wage range + city
//   - Brand colors (deep navy + saffron)
// If worker disabled or missing, renders a generic ShramSetu brand card.
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const alt = "ShramSetu Kaam Card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function PublicKaamCardOG({
  params,
}: {
  params: { slug: string };
}) {
  const worker = await db.workerProfile.findUnique({
    where: { id: params.slug },
    select: {
      id: true,
      fullName: true,
      city: true,
      wageMin: true,
      wageMax: true,
      trustTier: true,
      passportPublic: true,
      trade: { select: { nameEn: true } },
    },
  });

  // Generic fallback card if missing/disabled — still branded, but no PII
  if (!worker || !worker.passportPublic) {
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
            background: "linear-gradient(135deg, #1a2750 0%, #1f3a73 60%, #2c4f8c 100%)",
            color: "white",
            fontFamily: "sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              marginBottom: 32,
            }}
          >
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 18,
                background: "#e8a04c",
                color: "#3a1f08",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 56,
                fontWeight: 700,
              }}
            >
              श्र
            </div>
            <div style={{ fontSize: 64, fontWeight: 700 }}>ShramSetu</div>
          </div>
          <div style={{ fontSize: 36, color: "#f3d9a0" }}>
            Honest work finds the right hands.
          </div>
          <div style={{ fontSize: 22, color: "rgba(255,255,255,0.7)", marginTop: 12 }}>
            Voice-first Skill Passport for India's blue-collar workforce.
          </div>
        </div>
      ),
      { ...size },
    );
  }

  const firstName = worker.fullName.split(/\s+/)[0];
  const tradeName = worker.trade?.nameEn ?? "Skilled worker";
  const wageText =
    worker.wageMin === worker.wageMax
      ? `₹${worker.wageMin.toLocaleString("en-IN")}/day`
      : `₹${worker.wageMin.toLocaleString("en-IN")}–₹${worker.wageMax.toLocaleString("en-IN")}/day`;
  const isVerified =
    worker.trustTier === "skill_verified" || worker.trustTier === "top_pro";
  const tierLabel =
    worker.trustTier === "top_pro"
      ? "TOP PRO"
      : worker.trustTier === "skill_verified"
      ? "SKILL VERIFIED"
      : worker.trustTier === "id_verified"
      ? "ID VERIFIED"
      : "NEW";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #1a2750 0%, #1f3a73 50%, #ffffff 50%, #ffffff 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Brand bar (top-left) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "44px 56px",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 14,
              background: "#e8a04c",
              color: "#3a1f08",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 700,
            }}
          >
            श्र
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              color: "white",
            }}
          >
            <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.1 }}>
              ShramSetu
            </div>
            <div style={{ fontSize: 18, color: "#f3d9a0" }}>Kaam Card</div>
          </div>
        </div>

        {/* Main credential panel (bottom — white area) */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 48,
            padding: "0 56px 0 56px",
            flex: 1,
            color: "#1a2750",
          }}
        >
          {/* Initials avatar */}
          <div
            style={{
              width: 220,
              height: 220,
              borderRadius: "50%",
              background: "#1a2750",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 96,
              fontWeight: 700,
              flexShrink: 0,
              boxShadow: "0 8px 32px rgba(26,39,80,0.25)",
            }}
          >
            {firstName.slice(0, 2).toUpperCase()}
          </div>

          {/* Details */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              flex: 1,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 22,
                  color: "#6b7280",
                  fontWeight: 600,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                {tierLabel}
              </div>
              <div
                style={{
                  fontSize: 88,
                  fontWeight: 800,
                  color: "#1a2750",
                  lineHeight: 1.0,
                }}
              >
                {firstName}
              </div>
              <div
                style={{
                  fontSize: 40,
                  color: "#374151",
                  fontWeight: 600,
                  marginTop: 8,
                }}
              >
                {tradeName}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 24,
                marginTop: 12,
                fontSize: 28,
                color: "#1a2750",
              }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "#6b7280" }}>Wage</span>
                <span style={{ fontWeight: 700 }}>{wageText}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  borderLeft: "2px solid #e5e7eb",
                  paddingLeft: 24,
                }}
              >
                <span style={{ color: "#6b7280" }}>City</span>
                <span style={{ fontWeight: 700 }}>{worker.city}</span>
              </div>
            </div>
          </div>

          {/* Verified stamp (rotated dashed border) */}
          {isVerified && (
            <div
              style={{
                position: "absolute",
                top: 60,
                right: 60,
                border: "4px dashed #e8a04c",
                borderRadius: 14,
                padding: "16px 28px",
                color: "#7a4a18",
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: 3,
                transform: "rotate(-8deg)",
                background: "rgba(232,160,76,0.12)",
              }}
            >
              ✓ VERIFIED
            </div>
          )}
        </div>

        {/* Footer tagline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "28px 56px 40px 56px",
            borderTop: "2px solid #e5e7eb",
            color: "#6b7280",
            fontSize: 22,
          }}
        >
          <span>shramsetu.app/c/{worker.id.slice(-8)}</span>
          <span style={{ fontWeight: 600, color: "#1a2750" }}>
            Honest work. Right hands. Built for India.
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        "cache-control":
          process.env.NODE_ENV === "development"
            ? "no-cache, no-store"
            : "public, max-age=300, s-maxage=600, stale-while-revalidate=86400",
      },
    },
  );
}
