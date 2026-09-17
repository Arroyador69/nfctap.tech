import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: "https://nfctap.tech", lastModified, changeFrequency: "weekly", priority: 1 },
    { url: "https://nfctap.tech/personalizar", lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: "https://nfctap.tech/envios", lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: "https://nfctap.tech/legal", lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];
}
