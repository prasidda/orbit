import type { Metadata, Viewport } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import { Providers } from "@/components/providers";
import { themeScript } from "@/components/theme-provider";
import "./globals.css";

const caprasimo = Caprasimo({
  variable: "--font-caprasimo",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Orbit",
  description: "One shell, many tools. Everything you track, in one warm place.",
  manifest: "/manifest.webmanifest",
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Orbit", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3eee5" },
    { media: "(prefers-color-scheme: dark)", color: "#191512" },
  ],
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the inline theme script adds the `dark` class
    // to <html> before React hydrates, which is a deliberate mismatch.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${caprasimo.variable} ${figtree.variable} h-full antialiased`}
    >
      <head>
        {/* Sets the theme class before first paint — no cream flash on dark. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
