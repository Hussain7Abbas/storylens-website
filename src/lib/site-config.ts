export const siteConfig = {
	operator: { en: "Hussain Abbas", ar: "حسين عباس" },
	privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL ?? "hussain@iscoded.com",
	url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://storylens.iscoded.com",
	api: process.env.NEXT_PUBLIC_API_URL ?? "https://storylens-api.iscoded.com",
	chrome:
		"https://chromewebstore.google.com/detail/story-lens/caimeippciancnajhfokmhadjhmedmnf",
	extension: "https://github.com/Hussain7Abbas/storylens-extension",
	client: "https://github.com/Hussain7Abbas/storylens-client",
	website: "https://github.com/Hussain7Abbas/storylens-website",
	setup:
		"https://github.com/Hussain7Abbas/storylens/blob/develop/docs/client.md",
	contact: "https://github.com/Hussain7Abbas/storylens-website/issues",
} as const;
export type Locale = "en" | "ar";
export function isLocale(value: string): value is Locale {
	return value === "en" || value === "ar";
}
