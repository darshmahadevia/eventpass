import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { appUrl } from "@/lib/utils";
import "./globals.css";

const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: "EventPass", template: "%s · EventPass" },
  description:
    "Event registration, QR tickets, and a door scanner that keeps working when the venue Wi-Fi doesn't.",
  appleWebApp: { capable: true, title: "EventPass" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#13151b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={hanken.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
