import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { AuthProvider } from "@/components/shared/AuthProvider";
import { QueryProvider } from "@/components/shared/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "ShramSetu",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  title: "ShramSetu — A bridge between India's skilled hands and honest work",
  description: "Voice-first Kaam Profile, Skill Passport, explainable SmartMatch. Trust-first blue-collar hiring for India.",
  keywords: ["ShramSetu", "blue-collar", "hiring", "India", "Skill Passport", "voice", "trust", "verified"],
  authors: [{ name: "ShramSetu Team" }],
  openGraph: {
    title: "ShramSetu",
    description: "A bridge between India's skilled hands and honest work.",
    siteName: "ShramSetu",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShramSetu",
    description: "Trust-first blue-collar hiring for India.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#003a7f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <QueryProvider>
              <LanguageProvider>
                {children}
                <Toaster />
                <Sonner />
              </LanguageProvider>
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
