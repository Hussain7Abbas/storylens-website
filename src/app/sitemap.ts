import { readFile } from "node:fs/promises";
import path from "node:path";
import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";
export const dynamic = "force-static";

/** Marketing copy changes with a release; the legal pages carry their own date. */
const SITE_UPDATED = "2026-10-07";

async function legalUpdated(kind: "privacy" | "terms"): Promise<string> {
	const source = await readFile(
		path.join(process.cwd(), "src/content/legal/en", `${kind}.mdx`),
		"utf8",
	);
	return /lastUpdated: "([^"]+)"/.exec(source)?.[1] ?? SITE_UPDATED;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const pages = [
		{ path: "", priority: 1, changeFrequency: "monthly" as const },
		{ path: "pricing/", priority: 0.8, changeFrequency: "monthly" as const },
		{
			path: "privacy/",
			priority: 0.3,
			changeFrequency: "yearly" as const,
			lastModified: await legalUpdated("privacy"),
		},
		{
			path: "terms/",
			priority: 0.3,
			changeFrequency: "yearly" as const,
			lastModified: await legalUpdated("terms"),
		},
	];
	return pages.flatMap((page) =>
		(["en", "ar"] as const).map((locale) => ({
			url: `${siteConfig.url}/${locale}/${page.path}`,
			lastModified: page.lastModified ?? SITE_UPDATED,
			changeFrequency: page.changeFrequency,
			priority: page.priority,
			alternates: {
				languages: {
					en: `${siteConfig.url}/en/${page.path}`,
					ar: `${siteConfig.url}/ar/${page.path}`,
					"x-default": `${siteConfig.url}/en/${page.path}`,
				},
			},
		})),
	);
}
