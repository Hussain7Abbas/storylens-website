"use client";
import { useCallback, useEffect, useState } from "react";
import { getMessages } from "@/i18n/messages";
import { getPricing, type Pricing } from "@/lib/billing/api";
import {
	formatCents,
	formatMicros,
	formatNumber,
	priceCents,
} from "@/lib/billing/money";
import type { Locale } from "@/lib/site-config";
import { LensPrice, lensLabel } from "./LensPrice";

function fill(text: string, values: Record<string, string>): string {
	return text.replace(
		/\{(\w+)\}/g,
		(match, key: string) => values[key] ?? match,
	);
}

/** Every enabled AI feature with its lens price, loaded from the API on each visit. */
export function PricingTable({ locale }: { locale: Locale }) {
	const m = getMessages(locale).pricing;
	const [pricing, setPricing] = useState<Pricing | null>(null);
	const [failed, setFailed] = useState(false);
	const load = useCallback(async () => {
		setFailed(false);
		try {
			setPricing(await getPricing(locale));
		} catch {
			setFailed(true);
		}
	}, [locale]);
	useEffect(() => {
		void load();
	}, [load]);

	if (failed)
		return (
			<div className="pricing-card" role="alert">
				<p>{m.failed}</p>
				<button
					type="button"
					className="button"
					onClick={() => void load()}
					title={m.retry}
				>
					{m.retry}
				</button>
			</div>
		);
	if (!pricing)
		return (
			<div className="pricing-card pricing-skeleton" aria-busy="true">
				<p className="sr-only">{m.loading}</p>
				{[0, 1, 2, 3].map((row) => (
					<span key={row} className="skeleton-line" />
				))}
			</div>
		);

	const price = pricing.lensPriceMicros;
	const features = pricing.features.filter((feature) => feature.enabled);
	return (
		<div className="pricing-card">
			<div className="pricing-table-wrap">
				<table className="pricing-table">
					<caption className="sr-only">{m.tableCaption}</caption>
					<thead>
						<tr>
							<th scope="col">{m.feature}</th>
							<th scope="col">{m.price}</th>
							{price !== null && <th scope="col">{m.worth}</th>}
						</tr>
					</thead>
					<tbody>
						{features.map((feature) => {
							const description =
								locale === "ar" ? feature.descriptionAr : feature.descriptionEn;
							return (
								<tr key={feature.key}>
									<th scope="row">
										<span>
											{locale === "ar" ? feature.nameAr : feature.nameEn}
										</span>
										{description && (
											<span className="pricing-description">{description}</span>
										)}
									</th>
									<td>
										<LensPrice lenses={feature.lenses} locale={locale} />
									</td>
									{price !== null && (
										<td className="muted">
											{feature.lenses === 0
												? "—"
												: formatCents(
														priceCents(feature.lenses, price),
														locale,
													)}
										</td>
									)}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
			<ul className="pricing-facts">
				{price !== null && (
					<li>{fill(m.lensPrice, { price: formatMicros(price, locale) })}</li>
				)}
				{pricing.trialLenses > 0 && (
					<li>
						{fill(m.trial, { lenses: lensLabel(pricing.trialLenses, locale) })}
					</li>
				)}
				{pricing.available && (
					<li>
						{fill(m.limits, {
							min: formatNumber(pricing.request.min, locale),
							max: formatNumber(pricing.request.max, locale),
						})}
					</li>
				)}
			</ul>
			{pricing.available ? (
				<div className="actions">
					<a className="button" href={`/${locale}/profile/balance/#request`}>
						{m.buy}
					</a>
				</div>
			) : (
				<p className="muted">{m.notSold}</p>
			)}
		</div>
	);
}
