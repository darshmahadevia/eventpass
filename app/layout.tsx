import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Hanken_Grotesk } from "next/font/google";
import { ThemeColorSync } from "@/components/theme";
import { themeScript } from "@/lib/theme";
import { appUrl } from "@/lib/utils";
import "./globals.css";

const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"] });
const atkinsonMono = Atkinson_Hyperlegible_Mono({ variable: "--font-atkinson-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: "EventPass", template: "%s · EventPass" },
  description:
    "Event registration, QR tickets, and a door scanner that keeps working when the venue Wi-Fi doesn't.",
  appleWebApp: { capable: true, title: "EventPass", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${hanken.variable} ${atkinsonMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        {children}
        <ThemeColorSync />
      </body>
    </html>
  );
}
