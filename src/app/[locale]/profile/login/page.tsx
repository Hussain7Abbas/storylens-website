import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountApp } from "@/components/account/AccountApp";
import { accountMetadata } from "@/lib/account/metadata";
import { isLocale } from "@/lib/site-config";
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	if (!isLocale(locale)) notFound();
	return accountMetadata(locale, "login/");
}
export default async function Page({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	if (!isLocale(locale)) notFound();
	return <AccountApp locale={locale} view="login" />;
}
