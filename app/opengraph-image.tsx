import { ImageResponse } from "next/og";

export const alt =
  "EventPass — event check-in that keeps working when the venue network does not";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// Satori resolves neither CSS custom properties nor the app's font variables, so
// this surface has to restate both. Every value below is the sRGB conversion of
// a light-mode token in globals.css — nothing here is a new colour, and if a
// token moves these have to be re-derived.
// Re-derived after the neutral ramp moved to hue 260. Three of these four had
// drifted from the tokens they name — the card was rendering its ink two steps
// lighter and warmer than the product's own foreground.
const INK = "#0c1015"; // --foreground        oklch(0.17 0.013 260)
const PAPER = "#fcfdfe"; // --background      oklch(0.994 0.002 260)
const STAGE = "#65f68e"; // --poster-confirmed oklch(0.87 0.19 150)

async function fontSubset(family: string, text: string) {
  // A card that falls back to Satori's default sans is the one place EventPass
  // appears in a face it does not own, and it is the first thing anyone sees of
  // the product.
  const url = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`;
  // No browser User-Agent on purpose: Google then serves TrueType. A modern
  // browser UA gets woff2, which Satori cannot read.
  const css = await fetch(url).then((response) => response.text());
  const source = /src: url\((https:[^)]+)\) format\('(opentype|truetype)'\)/.exec(css);
  if (!source) return null;
  const fontUrl = source[1];
  if (!fontUrl) return null;
  return fetch(fontUrl).then((response) => response.arrayBuffer());
}

const HEADLINE = "Keep the line moving when the Wi-Fi doesn’t.";
const SUBHEAD = "Registration, tickets, and door check-in for in-person events.";
const WORDMARK = "EventPass";

// The landing page's first screen, held still: the stage, the poster headline,
// and nothing else competing with them.
export default async function OpenGraphImage() {
  const [poster, regular, medium] = await Promise.all([
    fontSubset("Hanken+Grotesk:wght@800", HEADLINE),
    fontSubset("Hanken+Grotesk:wght@400", SUBHEAD),
    fontSubset("Hanken+Grotesk:wght@700", WORDMARK),
  ]);

  const fonts = [
    poster && { name: "Hanken Grotesk", data: poster, weight: 800 as const, style: "normal" as const },
    regular && { name: "Hanken Grotesk", data: regular, weight: 400 as const, style: "normal" as const },
    medium && { name: "Hanken Grotesk", data: medium, weight: 700 as const, style: "normal" as const },
  ].filter((font) => font !== null && font !== undefined);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: STAGE,
          color: INK,
          padding: "64px 72px",
          fontFamily: "Hanken Grotesk",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* The same mark the product uses: an ink tile at the control radius
              carrying a ticket. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "52px",
              height: "52px",
              borderRadius: "6px",
              background: INK,
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={PAPER} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5v2" />
              <path d="M15 11v2" />
              <path d="M15 17v2" />
              <path d="M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-3a2 2 0 0 0 0 -4v-3a2 2 0 0 1 2 -2" />
            </svg>
          </div>
          <div style={{ fontSize: "30px", fontWeight: 700, letterSpacing: "-0.021em" }}>
            {WORDMARK}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Two explicit lines: Satori has no `whitespace-nowrap`, and a natural
              wrap can break inside "Wi-Fi". */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              fontSize: "100px",
              lineHeight: 1.02,
            }}
          >
            <div>Keep the line moving</div>
            <div>when the Wi-Fi doesn’t.</div>
          </div>
          <div style={{ fontSize: "30px", fontWeight: 400, letterSpacing: "-0.019em" }}>
            {SUBHEAD}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length > 0 ? fonts : undefined },
  );
}
