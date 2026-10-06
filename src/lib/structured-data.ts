// Schema.org graphs for search engines and for answer engines that read a
// page before quoting it. Every claim here must already be true on the page
// and in `design-system/copy-deck.md`; nothing is invented for ranking.
import { getMessages } from "@/i18n/messages";
import { type Locale, siteConfig } from "@/lib/site-config";

const ORGANIZATION_ID = `${siteConfig.url}/#organization`;
const WEBSITE_ID = `${siteConfig.url}/#website`;
const APPLICATION_ID = `${siteConfig.url}/#extension`;

type JsonObject = Record<string, unknown>;

/** `<script type="application/ld+json">` can only be broken out of with `<`. */
export function jsonLd(graph: readonly JsonObject[]): string {
	return JSON.stringify({
		"@context": "https://schema.org",
		"@graph": graph,
	}).replace(/</g, "\\u003c");
}

function organization(): JsonObject {
	return {
		"@type": "Organization",
		"@id": ORGANIZATION_ID,
		name: "Story Lens",
		url: `${siteConfig.url}/`,
		logo: {
			"@type": "ImageObject",
			url: `${siteConfig.url}/icons/icon-512.png`,
			width: 512,
			height: 512,
		},
		sameAs: [siteConfig.extension, siteConfig.client, siteConfig.website],
	};
}

function website(locale: Locale): JsonObject {
	return {
		"@type": "WebSite",
		"@id": WEBSITE_ID,
		name: "Story Lens",
		url: `${siteConfig.url}/`,
		description: getMessages(locale).intro,
		inLanguage: ["en", "ar"],
		publisher: { "@id": ORGANIZATION_ID },
	};
}

/** A page's place in the site, so an answer engine can cite the right URL. */
export function breadcrumb(
	locale: Locale,
	trail: readonly { name: string; path: string }[],
): JsonObject {
	return {
		"@type": "BreadcrumbList",
		itemListElement: [{ name: "Story Lens", path: "" }, ...trail].map(
			(item, index) => ({
				"@type": "ListItem",
				position: index + 1,
				name: item.name,
				item: `${siteConfig.url}/${locale}/${item.path}`,
			}),
		),
	};
}

function faqPage(questions: readonly (readonly string[])[]): JsonObject {
	return {
		"@type": "FAQPage",
		mainEntity: questions.map(([name, text]) => ({
			"@type": "Question",
			name: name ?? "",
			acceptedAnswer: { "@type": "Answer", text: text ?? "" },
		})),
	};
}

/** The landing page: what Story Lens is, what it does, and how to start. */
export function landingGraph(locale: Locale): string {
	const m = getMessages(locale);
	return jsonLd([
		organization(),
		website(locale),
		{
			"@type": "SoftwareApplication",
			"@id": APPLICATION_ID,
			name: "Story Lens",
			applicationCategory: "BrowserApplication",
			applicationSubCategory: "Browser extension",
			operatingSystem: "Chrome, Edge, Firefox",
			browserRequirements: "Requires a Chromium or Firefox browser",
			url: `${siteConfig.url}/${locale}/`,
			downloadUrl: siteConfig.chrome,
			installUrl: siteConfig.chrome,
			description: m.intro,
			inLanguage: ["en", "ar"],
			isAccessibleForFree: true,
			featureList: m.featureCards.map(([title]) => title),
			screenshot: `${siteConfig.url}/images/reading/01-character-highlighting-${locale}.webp`,
			softwareHelp: `${siteConfig.url}/${locale}/#how`,
			publisher: { "@id": ORGANIZATION_ID },
			offers: {
				"@type": "Offer",
				price: "0",
				priceCurrency: "USD",
				availability: "https://schema.org/InStock",
			},
		},
		{
			"@type": "WebPage",
			"@id": `${siteConfig.url}/${locale}/#webpage`,
			url: `${siteConfig.url}/${locale}/`,
			name: `Story Lens — ${m.headline}`,
			description: m.intro,
			inLanguage: locale,
			isPartOf: { "@id": WEBSITE_ID },
			about: { "@id": APPLICATION_ID },
			primaryImageOfPage: `${siteConfig.url}/og.png`,
		},
		{
			"@type": "HowTo",
			name: m.howTitle,
			description: m.featureIntro,
			totalTime: "PT2M",
			step: m.steps.map(([name, text], index) => ({
				"@type": "HowToStep",
				position: index + 1,
				name: name ?? "",
				text: text ?? "",
				url: `${siteConfig.url}/${locale}/#how`,
			})),
		},
		faqPage(m.questions),
	]);
}

/** Pricing: the lens model in words, without quoting prices the API owns. */
export function pricingGraph(locale: Locale): string {
	const m = getMessages(locale).pricing;
	return jsonLd([
		organization(),
		{
			"@type": "WebPage",
			"@id": `${siteConfig.url}/${locale}/pricing/#webpage`,
			url: `${siteConfig.url}/${locale}/pricing/`,
			name: m.headline,
			description: m.description,
			inLanguage: locale,
			isPartOf: { "@id": WEBSITE_ID },
			about: { "@id": APPLICATION_ID },
		},
		breadcrumb(locale, [{ name: m.nav, path: "pricing/" }]),
		faqPage(m.faq),
	]);
}

/** Legal pages: a dated policy an answer engine can quote with its version. */
export function legalGraph(
	locale: Locale,
	kind: "privacy" | "terms",
	title: string,
	updated: string,
): string {
	return jsonLd([
		organization(),
		{
			"@type": "WebPage",
			"@id": `${siteConfig.url}/${locale}/${kind}/#webpage`,
			url: `${siteConfig.url}/${locale}/${kind}/`,
			name: title,
			inLanguage: locale,
			isPartOf: { "@id": WEBSITE_ID },
			publisher: { "@id": ORGANIZATION_ID },
			...(updated ? { dateModified: updated } : {}),
		},
		breadcrumb(locale, [{ name: title, path: `${kind}/` }]),
	]);
}
