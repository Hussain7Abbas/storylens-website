import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/LegalPage";
import { getMessages } from "@/i18n/messages";
import { isLocale } from "@/lib/site-config";
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	if (!isLocale(locale)) notFound();
	return {
		title: getMessages(locale).privacy,
		alternates: {
			canonical: `/${locale}/privacy/`,
			languages: {
				en: "/en/privacy/",
				ar: "/ar/privacy/",
				"x-default": "/en/privacy/",
			},
		},
	};
}
export default async function Page({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	if (!isLocale(locale)) notFound();
	return <LegalPage locale={locale} kind="privacy" />;
}
