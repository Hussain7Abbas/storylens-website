import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";
export const dynamic = "force-static";

/**
 * Answer engines read and quote the public pages, so they are named here
 * rather than left to the wildcard: several of them ignore `*` and look only
 * for their own agent. Account pages stay out of every index.
 */
const answerEngines = [
	"Applebot-Extended",
	"ChatGPT-User",
	"Claude-SearchBot",
	"Claude-User",
	"ClaudeBot",
	"DuckAssistBot",
	"GPTBot",
	"Google-Extended",
	"MistralAI-User",
	"OAI-SearchBot",
	"Perplexity-User",
	"PerplexityBot",
];
const privatePaths = ["/en/profile/", "/ar/profile/"];

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{ userAgent: "*", allow: "/", disallow: privatePaths },
			{ userAgent: answerEngines, allow: "/", disallow: privatePaths },
		],
		sitemap: `${siteConfig.url}/sitemap.xml`,
		host: siteConfig.url,
	};
}
