import type { Metadata } from "next";
import { getMessages } from "@/i18n/messages";
import type { Locale } from "@/lib/site-config";

const titles = {
	"": "title",
	"login/": "loginTitle",
	"register/": "registerTitle",
	"password/": "passwordTitle",
	"email/": "emailTitle",
	"oauth/": "oauthTitle",
} as const;

export type AccountPath = keyof typeof titles;

/** Account pages are personal tools: keep them out of search results. */
export function accountMetadata(locale: Locale, path: AccountPath): Metadata {
	const page = `profile/${path}`;
	return {
		title: getMessages(locale).account[titles[path]],
		robots: { index: false, follow: false },
		alternates: {
			canonical: `/${locale}/${page}`,
			languages: { en: `/en/${page}`, ar: `/ar/${page}` },
		},
	};
}
