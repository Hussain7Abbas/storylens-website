import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
	return ["", "privacy/", "terms/"].flatMap((page) =>
		["en", "ar"].map((locale) => ({
			url: `${siteConfig.url}/${locale}/${page}`,
			lastModified: "2026-09-27",
			alternates: {
				languages: {
					en: `${siteConfig.url}/en/${page}`,
					ar: `${siteConfig.url}/ar/${page}`,
				},
			},
		})),
	);
}
