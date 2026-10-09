import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FeedbackBubble } from "@/components/layout/FeedbackBubble";

export const metadata: Metadata = {
  title: { default: "whysogood — Free Online Tools", template: "%s | whysogood" },
  description: "100+ free, fast, private online tools. Image compressor, PDF tools, JSON formatter, calculators and more — all running in your browser. No uploads, no sign-up.",
  keywords: ["online tools", "image compressor", "pdf tools", "json formatter", "free tools", "privacy"],
  metadataBase: new URL("https://whysogood.space"),
  openGraph: {
    type: "website",
    siteName: "whysogood",
    title: "whysogood — Free Online Tools",
    description: "100+ free private browser tools. No uploads. No sign-up.",
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  other: {
    'google-adsense-account': 'ca-pub-4317877277908124',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-adsense-account" content="ca-pub-4317877277908124" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4317877277908124"
          crossOrigin="anonymous"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('whysogood_theme');var t=s||'dark';var p=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=t==='dark'||(t==='system'&&p);var r=document.documentElement;if(d){r.setAttribute('data-theme','dark');r.classList.remove('light');}else{r.setAttribute('data-theme','light');r.classList.add('light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <SessionProvider>
          <ToastProvider>
            <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
              <Header />
              <main style={{ flex: 1 }}>{children}</main>
              <Footer />
            </div>
            <FeedbackBubble />
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
