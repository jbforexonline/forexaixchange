import type { MetadataRoute } from "next";

const BASE_URL = "https://forexaiexchange.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/register"],
      disallow: [
        "/dashboard/",
        "/admin/",
        "/api/",
        "/auth/",
        "/forgetpassword/",
        "/deposit/",
        "/withdraw/",
        "/spin/",
        "/bets/",
        "/history/",
        "/settings/",
        "/preferences/",
        "/maintenance",
        "/premium/",
        "/premiums/",
        "/referrals/",
        "/rounds/",
        "/statistics/",
        "/suggestions/",
        "/users/",
        "/chat/",
        "/autospin/",
        "/Affiliate/",
        "/Changed/",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
