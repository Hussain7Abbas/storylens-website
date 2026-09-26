import { notFound } from "next/navigation";
import { Landing } from "@/components/sections/Landing";
import { isLocale } from "@/lib/site-config";
export default async function Page({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	if (!isLocale(locale)) notFound();
	return <Landing locale={locale} />;
}
