import type { Locale } from "@/lib/site-config";

/**
 * Money is integer micro-dollars (1 USD = 1,000,000) and cents, as in the API
 * (`apps/backend/src/lib/billing/money.ts`); `priceCents` uses the same half-up
 * rounding and test vectors. Never `parseFloat` a price.
 */

const MICROS_PER_USD = 1_000_000;
const USD = /^(\d{1,4})(?:\.(\d{1,6}))?$/;

export function parseUsdToMicros(
	text: string | null | undefined,
): number | null {
	const match = USD.exec((text ?? "").trim());
	if (!match) return null;
	return (
		Number(match[1]) * MICROS_PER_USD + Number((match[2] ?? "").padEnd(6, "0"))
	);
}

/** `lenses × price`, rounded half-up to cents. */
export function priceCents(lenses: number, priceMicros: number): number {
	return Math.floor((lenses * priceMicros + 5_000) / 10_000);
}

// Latin digits in Arabic too, like the rest of the site's numbers.
const numberLocale = (locale: Locale) =>
	locale === "ar" ? "ar-u-nu-latn" : "en";

/** `500` → `$5.00` (Arabic: `‏5.00 US$`). */
export function formatCents(cents: number, locale: Locale): string {
	return new Intl.NumberFormat(numberLocale(locale), {
		style: "currency",
		currency: "USD",
	}).format(cents / 100);
}

/** A per-lens price in micro-dollars: at least cents, more digits only when needed (`$0.015`). */
export function formatMicros(micros: number, locale: Locale): string {
	const digits = Math.max(
		2,
		(micros / MICROS_PER_USD).toFixed(6).replace(/0+$/, "").split(".")[1]
			?.length ?? 0,
	);
	return new Intl.NumberFormat(numberLocale(locale), {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
	}).format(micros / MICROS_PER_USD);
}

export function formatNumber(value: number, locale: Locale): string {
	return new Intl.NumberFormat(numberLocale(locale)).format(value);
}
