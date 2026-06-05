import { Nunito_Sans, Inter, Space_Mono } from "next/font/google";

// Display / headings. Nunito Sans ships a full Cyrillic subset, so Bulgarian
// headings (e.g. "ВХОД", "РЕГИСТРАЦИЯ") render in-brand instead of falling back
// to the system stack like the previous Bebas Neue (latin-only) did. Variable
// font — the whole weight range is available; headings lean on 800/900.
export const fontDisplay = Nunito_Sans({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-display",
  display: "swap",
});

// Body / UI text. Inter has comprehensive Cyrillic coverage, replacing DM Sans
// (latin / latin-ext only) which left Cyrillic body copy on the fallback stack.
export const fontBody = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-body",
  display: "swap",
});

export const fontMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});
