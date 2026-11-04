import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://humanoid.or.th";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin-login",
        "/admin/cms",
        "/admin/submitted-data",
        "/api/",
        "/data-pulls"
      ]
    },
    sitemap: `${baseUrl}/sitemap.xml`
  };
}
