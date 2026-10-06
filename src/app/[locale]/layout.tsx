import type { Metadata, Viewport } from "next";
import {
	Cormorant_Garamond,
	IBM_Plex_Sans_Arabic,
	Inter,
} from "next/font/google";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { AnalyticsConsent } from "@/components/layout/AnalyticsConsent";
import { Footer, Header } from "@/components/layout/Shell";
import { getMessages } from "@/i18n/messages";
import { analyticsEnabled, gtagStub } from "@/lib/analytics";
import { revealScript, themeScript } from "@/lib/inline-scripts";
import { isLocale, siteConfig } from "@/lib/site-config";

const display = Cormorant_Garamond({
	subsets: ["latin"],
	weight: ["500", "600"],
	variable: "--font-reading",
	display: "optional",
	preload: false,
});
const body = Inter({
	subsets: ["latin"],
	variable: "--font-body",
	display: "optional",
	preload: false,
});
const arabic = IBM_Plex_Sans_Arabic({
	weight: ["400", "600"],
	subsets: ["arabic"],
	variable: "--font-arabic",
	display: "optional",
	preload: false,
});
export const dynamicParams = false;
export function generateStaticParams() {
	return [{ locale: "en" }, { locale: "ar" }];
}
export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#f7f7fb" },
		{ media: "(prefers-color-scheme: dark)", color: "#171820" },
	],
	colorScheme: "light dark",
};
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	if (!isLocale(locale)) notFound();
	const m = getMessages(locale);
	const title = `Story Lens — ${m.headline}`;
	return {
		metadataBase: new URL(siteConfig.url),
		title: { default: title, template: "%s | Story Lens" },
		description: m.intro,
		applicationName: "Story Lens",
		keywords: [...m.seo.keywords],
		category: "technology",
		authors: [{ name: siteConfig.operator[locale], url: siteConfig.website }],
		creator: siteConfig.operator[locale],
		publisher: "Story Lens",
		formatDetection: { telephone: false, address: false, email: false },
		// Answer engines and image search need the long form to quote a page.
		robots: {
			index: true,
			follow: true,
			googleBot: {
				index: true,
				follow: true,
				"max-image-preview": "large",
				"max-snippet": -1,
				"max-video-preview": -1,
			},
		},
		alternates: {
			canonical: `/${locale}/`,
			languages: { en: "/en/", ar: "/ar/", "x-default": "/en/" },
		},
		openGraph: {
			siteName: "Story Lens",
			title,
			description: m.intro,
			url: `/${locale}/`,
			locale: locale === "ar" ? "ar_IQ" : "en_US",
			alternateLocale: locale === "ar" ? "en_US" : "ar_IQ",
			type: "website",
			images: [
				{
					url: "/og.png",
					width: 1200,
					height: 630,
					alt: `Story Lens — ${m.headline}`,
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title,
			description: m.intro,
			images: ["/og.png"],
		},
		icons: {
			icon: [
				{
					url: "/favicon.ico",
					sizes: "16x16 32x32 48x48",
					type: "image/x-icon",
				},
				{ url: "/icons/icon-16.png", sizes: "16x16", type: "image/png" },
				{ url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
			],
			apple: {
				url: "/apple-touch-icon.png",
				sizes: "180x180",
				type: "image/png",
			},
		},
	};
}
export default async function LocaleLayout({
	children,
	params,
}: {
	children: ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	if (!isLocale(locale)) notFound();
	setRequestLocale(locale);
	const m = getMessages(locale);
	return (
		<html
			lang={locale}
			dir={locale === "ar" ? "rtl" : "ltr"}
			className={`${display.variable} ${body.variable} ${arabic.variable}`}
			suppressHydrationWarning
		>
			<head>
				<script>{themeScript}</script>
				{analyticsEnabled ? <script>{gtagStub}</script> : null}
			</head>
			<body>
				<a className="skip-link" href="#main">
					{m.skip}
				</a>
				<Header locale={locale} />
				<main id="main">{children}</main>
				<Footer locale={locale} />
				{analyticsEnabled ? <AnalyticsConsent locale={locale} /> : null}
				<script>{revealScript}</script>
			</body>
		</html>
	);
}
