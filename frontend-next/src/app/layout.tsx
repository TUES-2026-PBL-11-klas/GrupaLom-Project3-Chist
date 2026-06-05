import type { Metadata } from "next";
import { fontDisplay, fontBody, fontMono } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "CHIST",
  description: "Sofia · Cleaner City",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg" className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
