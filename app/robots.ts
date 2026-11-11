import type { MetadataRoute } from "next";

import { urlDelSitio } from "@/lib/url-sitio";

export default function robots(): MetadataRoute.Robots {
  const base = urlDelSitio();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
