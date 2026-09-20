import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: { default: "whysogood — Free Online Tools", template: "%s | whysogood" },
  description: "100+ free, fast, private online tools. Image compressor, PDF tools, JSON formatter, calculators and more — all running in your browser. No uploads, no sign-up.",
  keywords: ["online tools", "image compressor", "pdf tools", "json formatter", "free tools", "privacy"],
  metadataBase: new URL("https://whysogood.app"),
  openGraph: {
    type: "website",
    siteName: "whysogood",
    title: "whysogood — Free Online Tools",
    description: "100+ free private browser tools. No uploads. No sign-up.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SessionProvider>
          <ToastProvider>
            <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
              <Header />
              <main style={{ flex: 1 }}>{children}</main>
              <Footer />
            </div>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
