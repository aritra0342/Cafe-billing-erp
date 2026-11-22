import type { Metadata, Viewport } from "next";
import { Anek_Latin } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

// Anek Latin, by Ek Type (an Indian foundry). Variable width: condensed for titles and money, normal for reading.
// latin-ext carries the ₹ sign.
const anek = Anek_Latin({ subsets: ["latin", "latin-ext"], axes: ["wdth"], variable: "--font-anek", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Chai & Change, café billing", template: "%s | Chai & Change" },
  description: "GST billing for Indian cafés: your menu with sizes and add-ons, a quick counter screen, and invoices that print on A4 or thermal paper.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e6ebe3" },
    { media: "(prefers-color-scheme: dark)", color: "#12162b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`h-full antialiased ${anek.variable}`}>
      <body className="min-h-full">
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/settings?welcome=1"
          appearance={{
            // Clerk's styles go in their own layer, below Tailwind utilities, so the classes in `elements` win.
            cssLayerName: "clerk",
            // Clerk's own theme follows the page's color-scheme. Every colour points at the app's tokens,
            // so the card switches with the page instead of staying a light card on a dark page.
            variables: {
              colorPrimary: "var(--auth-accent)",
              colorPrimaryForeground: "var(--auth-accent-ink)",
              colorBackground: "var(--auth-surface)",
              colorForeground: "var(--auth-ink)",
              colorMutedForeground: "var(--auth-ink-2)",
              colorMuted: "var(--auth-surface-2)",
              colorNeutral: "var(--auth-ink)",
              colorBorder: "var(--auth-line)",
              colorInput: "var(--auth-bg)",
              colorInputForeground: "var(--auth-ink)",
              colorRing: "var(--auth-accent)",
              colorShadow: "transparent",
              colorDanger: "var(--auth-bad)",
              colorSuccess: "var(--auth-good)",
              colorModalBackdrop: "rgb(0 0 0 / 0.5)",
              borderRadius: "0.5rem",
              fontFamily: "var(--font-anek), ui-sans-serif, system-ui, sans-serif",
              fontSize: "0.9375rem",
            },
            // Arbitrary values read the --auth-* aliases, not Tailwind's colour tokens: inside Clerk's parts,
            // --accent and friends may be Clerk's own variables.
            elements: {
              cardBox: "shadow-none border border-[var(--auth-line)] rounded-xl",
              card: "shadow-none",
              headerTitle: "text-[1.75rem] leading-tight font-[720] [font-stretch:78%]",
              formButtonPrimary: "h-11 bg-[var(--auth-accent)] bg-none text-[1rem] font-[600] text-[var(--auth-accent-ink)] shadow-none after:hidden hover:opacity-90",
              socialButtonsBlockButton: "h-11 border border-[var(--auth-line)] bg-[var(--auth-bg)] shadow-none hover:bg-[var(--auth-surface-2)]",
              socialButtonsBlockButtonText: "text-[var(--auth-ink)] font-[560]",
              formFieldInput: "h-11 border border-[var(--auth-line)] bg-[var(--auth-bg)] text-[1rem] text-[var(--auth-ink)] shadow-none placeholder:text-[var(--auth-ink-3)]",
              footer: "bg-none bg-[var(--auth-surface-2)]",
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
