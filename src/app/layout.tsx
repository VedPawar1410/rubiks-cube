import type { Metadata } from "next";
import { Bagel_Fat_One, Bricolage_Grotesque, DM_Mono } from "next/font/google";
import "./globals.css";

// Chunky display face for headings, a characterful grotesque for UI text,
// and a mono for move notation so "R' U2" reads like keycaps.
const display = Bagel_Fat_One({ variable: "--font-display", subsets: ["latin"], weight: "400" });
const body = Bricolage_Grotesque({ variable: "--font-body", subsets: ["latin"] });
const mono = DM_Mono({ variable: "--font-notation", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Cubey — solve your Rubik's cube, layer by layer",
  description: "Paint your scrambled cube and get friendly, step-by-step beginner instructions to solve it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
