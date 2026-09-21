import { GUIDES } from "@/lib/guides";
import { SITE, SITE_UPDATED } from "@/lib/seo";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = SITE_UPDATED;
  return [
    { url: SITE, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/personalizar`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/wifi`, lastModified, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE}/guia`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    ...GUIDES.map((g) => ({
      url: `${SITE}/guia/${g.slug}`,
      lastModified: new Date(g.datePublished),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    { url: `${SITE}/envios`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/legal`, lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];
}
