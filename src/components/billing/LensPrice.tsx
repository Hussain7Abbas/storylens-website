import { getMessages } from "@/i18n/messages";
import { formatNumber } from "@/lib/billing/money";
import type { Locale } from "@/lib/site-config";
import { LensCoin } from "./LensCoin";

type PluralForm = "zero" | "one" | "two" | "few" | "many" | "other";

/** "3 lenses" / "3 عدسات", with every Arabic plural form. */
export function lensLabel(lenses: number, locale: Locale): string {
	const forms = getMessages(locale).lens.count;
	const form = new Intl.PluralRules(locale).select(lenses) as PluralForm;
	return forms[form].replace("{count}", formatNumber(lenses, locale));
}

/**
 * A coin and an amount, the only way the website shows a price. `0` reads
 * "Free"; `signed` shows `+5` for credits; `on-brand` uses the line coin for
 * filled buttons.
 */
export function LensPrice({
	lenses,
	locale,
	size = 16,
	tone = "default",
	signed = false,
}: {
	lenses: number;
	locale: Locale;
	size?: number;
	tone?: "default" | "on-brand";
	signed?: boolean;
}) {
	if (lenses === 0 && !signed)
		return <span className="lens-free">{getMessages(locale).lens.free}</span>;
	const amount = `${signed && lenses > 0 ? "+" : ""}${formatNumber(lenses, locale)}`;
	return (
		<span className="lens-price" title={lensLabel(Math.abs(lenses), locale)}>
			<LensCoin size={size} variant={tone === "on-brand" ? "mono" : "color"} />
			<span aria-hidden="true">{amount}</span>
			<span className="sr-only">
				{signed && lenses > 0 ? "+" : signed && lenses < 0 ? "−" : ""}
				{lensLabel(Math.abs(lenses), locale)}
			</span>
		</span>
	);
}
