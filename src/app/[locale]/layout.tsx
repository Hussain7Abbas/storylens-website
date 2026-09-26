import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Noto_Sans_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { Footer, Header } from "@/components/layout/Shell";
import { getMessages } from "@/i18n/messages";
import { isLocale, siteConfig } from "@/lib/site-config";

const display = Cormorant_Garamond({
	subsets: ["latin"],
	weight: ["500", "600"],
	variable: "--font-display",
	display: "optional",
	preload: false,
});
const body = Inter({
	subsets: ["latin"],
	variable: "--font-body",
	display: "optional",
	preload: false,
});
const arabic = Noto_Sans_Arabic({
	subsets: ["arabic"],
	variable: "--font-arabic",
	display: "optional",
	preload: false,
});
export const dynamicParams = false;
export function generateStaticParams() {
	return [{ locale: "en" }, { locale: "ar" }];
}
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	if (!isLocale(locale)) notFound();
	const m = getMessages(locale);
	return {
		metadataBase: new URL(siteConfig.url),
		title: {
			default: `Story Lens — ${m.headline}`,
			template: "%s | Story Lens",
		},
		description: m.intro,
		alternates: {
			canonical: `/${locale}/`,
			languages: { en: "/en/", ar: "/ar/", "x-default": "/en/" },
		},
		openGraph: {
			title: "Story Lens",
			description: m.intro,
			url: `/${locale}/`,
			locale: locale === "ar" ? "ar_IQ" : "en_US",
			type: "website",
			images: ["/og.png"],
		},
		twitter: { card: "summary_large_image", images: ["/og.png"] },
		icons: { icon: "/icon-small.png", apple: "/icon-small.png" },
	};
}
const themeScript = `try{var t=localStorage.getItem('storylens-theme')||'system';document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t}catch{}`;
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
			</head>
			<body>
				<a className="skip-link" href="#main">
					{m.skip}
				</a>
				<Header locale={locale} />
				<main id="main">{children}</main>
				<Footer locale={locale} />
			</body>
		</html>
	);
}
