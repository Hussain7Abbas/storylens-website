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
	"balance/": "balanceTitle",
} as const;

export type AccountPath = keyof typeof titles;

/** Account pages are personal tools: keep them out of search results. */
export function accountMetadata(locale: Locale, path: AccountPath): Metadata {
	const page = `profile/${path}`;
	return {
		title:
			path === "balance/"
				? getMessages(locale).billing.balanceTitle
				: getMessages(locale).account[
						titles[path as Exclude<AccountPath, "balance/">]
					],
		robots: { index: false, follow: false },
		alternates: {
			canonical: `/${locale}/${page}`,
			languages: { en: `/en/${page}`, ar: `/ar/${page}` },
		},
	};
}
