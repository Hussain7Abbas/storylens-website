import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PricingTable } from "@/components/billing/PricingTable";
import { getMessages } from "@/i18n/messages";
import { isLocale, siteConfig } from "@/lib/site-config";
import { pricingGraph } from "@/lib/structured-data";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	if (!isLocale(locale)) notFound();
	const m = getMessages(locale).pricing;
	return {
		title: m.title,
		description: m.description,
		alternates: {
			canonical: `/${locale}/pricing/`,
			languages: {
				en: "/en/pricing/",
				ar: "/ar/pricing/",
				"x-default": "/en/pricing/",
			},
		},
		openGraph: {
			title: `${m.title} · Story Lens`,
			description: m.description,
			url: `/${locale}/pricing/`,
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
	const m = getMessages(locale).pricing;
	return (
		<section className="container pricing-page">
			<header className="pricing-header">
				<p className="eyebrow">{m.eyebrow}</p>
				<h1>{m.headline}</h1>
				<p className="section-intro">{m.intro}</p>
			</header>
			{/* Prices come only from the API, never from this static page. */}
			<PricingTable locale={locale} />
			<section className="pricing-faq" aria-labelledby="pricing-faq-title">
				<h2 id="pricing-faq-title">{m.faqTitle}</h2>
				{m.faq.map(([question, answer], index) => (
					<details key={question}>
						<summary>{question}</summary>
						<p>{answer}</p>
						{index === 2 && (
							<p>
								<a className="text-link" href={siteConfig.setup}>
									{m.setupLink}
								</a>
							</p>
						)}
						{index === 3 && (
							<p>
								<a className="text-link" href={`/${locale}/privacy/`}>
									{m.privacyLink}
								</a>
							</p>
						)}
					</details>
				))}
			</section>
			<script type="application/ld+json">{pricingGraph(locale)}</script>
		</section>
	);
}
