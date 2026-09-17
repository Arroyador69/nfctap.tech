import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wi‑Fi",
  description: "TAP only.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true, nosnippet: true },
  },
  referrer: "no-referrer",
  other: { googlebot: "noindex, nofollow, noarchive, nosnippet" },
};

export default function WifiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
