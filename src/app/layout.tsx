import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap"
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["500", "600", "700"],
  display: "swap"
});

export const viewport: Viewport = {
  themeColor: "#f8f6ef",
  width: "device-width",
  initialScale: 1
};

export const metadata: Metadata = {
  title: "Maxwellina Foods — Homemade goodness, made easy",
  description: "Make homemade goodness easier with Maxwellina Foods bofrot mix and pancake mix. Order online for GH₵35 per pack.",
  icons: {
    icon: "/logo.svg"
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfairDisplay.variable}`}>
      <body>{children}</body>
    </html>
  );
}
