import type { MetadataRoute } from "next";

export const siteName = "Thailand Humanoid Atlas";
export const defaultSeoDescription =
  "Research database for Thailand humanoid, social, and service robotics records, sources, contributions, public perspectives, and relationship networks.";

const fallbackSiteUrl = "https://thailand-humanoid-atlas.vercel.app";

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`.replace(/\/$/, "");
  return fallbackSiteUrl;
}

export const publicSeoRoutes = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/dashboard", priority: 0.85, changeFrequency: "weekly" },
  { path: "/robots", priority: 0.9, changeFrequency: "weekly" },
  { path: "/inventory", priority: 0.65, changeFrequency: "weekly" },
  { path: "/contributions", priority: 0.8, changeFrequency: "weekly" },
  { path: "/perspectives", priority: 0.75, changeFrequency: "weekly" },
  { path: "/analytics", priority: 0.75, changeFrequency: "weekly" },
  { path: "/map", priority: 0.75, changeFrequency: "weekly" },
  { path: "/network", priority: 0.85, changeFrequency: "weekly" },
  { path: "/submit-data", priority: 0.55, changeFrequency: "monthly" }
] satisfies Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}>;

export const noindexRoutes = [
  "/admin",
  "/admin/cms",
  "/admin/submitted-data",
  "/admin-login",
  "/data-pulls",
  "/database",
  "/profile"
];

