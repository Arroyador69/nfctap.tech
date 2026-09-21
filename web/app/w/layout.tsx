import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "Wi‑Fi",
};

export default function WifiTapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
