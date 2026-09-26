import type { Locale } from "@/lib/site-config";
import ar from "./messages/ar.json";
import en from "./messages/en.json";
export type Messages = typeof en;
const messages: Record<Locale, Messages> = { en, ar };
export function getMessages(locale: Locale): Messages {
	return messages[locale];
}
