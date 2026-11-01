import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Política de cookies",
  description:
    "Cookies de NFCTap: necesarias, analítica y Meta Pixel. Gestiona tu consentimiento RGPD / LSSI.",
  path: "/cookies",
});

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
