/**
 * The WhatsApp or Telegram contact a lens request needs (decision D21). Mirrors
 * the API's `apps/backend/src/lib/billing/contact.ts`; the API checks again.
 */
export type ContactChannel = "WHATSAPP" | "TELEGRAM";

const PHONE_SEPARATORS = /[\s\-().]/g;
const PHONE = /^\+\d{8,15}$/;
const TELEGRAM_USERNAME = /^@[a-zA-Z0-9_]{5,32}$/;

export function normalizePhone(value: string): string | null {
	const compact = value.trim().replace(PHONE_SEPARATORS, "");
	const withPlus = compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
	return PHONE.test(withPlus) ? withPlus : null;
}

/** The handle as the API stores it, or null when it is not valid for the channel. */
export function normalizeContact(
	channel: ContactChannel,
	handle: string,
): string | null {
	const value = handle.trim();
	if (channel === "WHATSAPP") return normalizePhone(value);
	const username = value.startsWith("@")
		? value
		: /^[a-zA-Z]/.test(value)
			? `@${value}`
			: null;
	if (username && TELEGRAM_USERNAME.test(username))
		return username.toLowerCase();
	return normalizePhone(value);
}
