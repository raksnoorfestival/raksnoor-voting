import type { Metadata, Viewport } from "next";
import { UpdateWatch } from "@/components/update-watch";
import { appVersion } from "@/lib/version";
import "./globals.css";

export const metadata: Metadata = {
  title: "Raks Noor Festival | Voting",
  description: "Competition scoring for the Raks Noor Festival.",
  applicationName: "Raks Noor",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/icons/apple-touch-icon.png",
  },
  // Added to an iPhone home screen it opens full screen, with this name.
  appleWebApp: { capable: true, title: "Raks Noor", statusBarStyle: "default" },
  // Next writes the modern tag; older iPhones still read this one.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#8b1e3f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {children}
        {/* Which build this screen runs, to check a tablet against what was
            published: the same short code the publisher reports. */}
        <footer className="pointer-events-none fixed bottom-1 left-2 z-10 text-[10px] text-neutral-400">Version {appVersion().slice(0, 7)}</footer>
        <UpdateWatch version={appVersion()} />
      </body>
    </html>
  );
}
