"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SetupNeeded } from "@/components/setup-needed";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

/** Clerk's own UI, repainted in the Organic palette so sign-in matches the app. */
const clerkAppearance = {
  variables: {
    colorPrimary: "#c0693e",
    colorText: "#2b2622",
    colorBackground: "#fdfbf6",
    colorInputBackground: "#fdfbf6",
    borderRadius: "1rem",
    fontFamily: "var(--font-figtree)",
  },
  elements: {
    card: "shadow-none border border-line rounded-card",
    formButtonPrimary: "rounded-full text-sm normal-case",
    socialButtonsBlockButton: "rounded-full border-line-strong",
    footerActionLink: "text-terracotta",
  },
};

export function Providers({ children }: { children: React.ReactNode }) {
  // Missing keys is the normal state on a fresh clone, so it gets a real
  // screen rather than a stack trace.
  if (!convex || !clerkKey) {
    return (
      <ThemeProvider>
        <SetupNeeded hasConvex={Boolean(convexUrl)} hasClerk={Boolean(clerkKey)} />
      </ThemeProvider>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkKey} appearance={clerkAppearance}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <ThemeProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              className: "!rounded-full !border-line !bg-surface !text-ink !font-sans",
            }}
          />
        </ThemeProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
