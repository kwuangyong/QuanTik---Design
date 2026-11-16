import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
    ["", 1, "weekly"], ["/plans", 0.9, "weekly"], ["/dashboard", 0.7, "daily"], ["/screener", 0.7, "daily"], ["/analysis", 0.6, "weekly"],
  ];
  return pages.map(([path, priority, changeFrequency]) => ({ url: `${siteUrl}${path}`, lastModified: new Date(), changeFrequency, priority }));
}
