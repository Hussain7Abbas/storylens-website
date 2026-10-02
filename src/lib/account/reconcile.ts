import type { Locale } from "@/lib/site-config";
import type { AccountSession, AccountUser } from "./bridge";

/** The website's own session, read from the API cookie. */
export type WebState =
	| { status: "loading" }
	| { status: "signed-out" }
	| { status: "signed-in"; user: AccountUser };

/** What the extension's bridge reported; `missing` when no extension answers. */
export type BridgeState =
	| { status: "detecting" }
	| { status: "missing" }
	| { status: "ready"; session: AccountSession | null };

export type Decision =
	| "none"
	| "offer-install"
	| "hand-off"
	| "hand-off-merging-guest"
	| "refresh-extension-user"
	| "ask-which-account"
	| "adopt"
	| "show-forms";

/** Whether the extension's copy of the user differs from the website's. */
export function isStale(website: AccountUser, extension: AccountUser): boolean {
	return (
		website.email !== extension.email ||
		website.username !== extension.username ||
		website.name !== extension.name ||
		website.isGuest !== extension.isGuest ||
		website.role?.slug !== extension.role?.slug ||
		website.permissions.join("\n") !== extension.permissions.join("\n")
	);
}

/**
 * Keeps the website and an installed extension on the same account
 * (pricing plan, architecture flow E). Pure, so every state pair is tested.
 */
export function decide(web: WebState, bridge: BridgeState): Decision {
	if (web.status === "loading" || bridge.status === "detecting") return "none";
	if (web.status === "signed-in") {
		if (bridge.status === "missing") return "offer-install";
		const held = bridge.session;
		if (!held) return "hand-off";
		if (held.user.isGuest) return "hand-off-merging-guest";
		if (held.user.id !== web.user.id) return "ask-which-account";
		return isStale(web.user, held.user) ? "refresh-extension-user" : "none";
	}
	if (
		bridge.status === "ready" &&
		bridge.session &&
		!bridge.session.user.isGuest
	)
		return "adopt";
	return "show-forms";
}

/** A `?next=` target, only within this locale's profile or pricing pages. */
export function safeNext(next: string | null, locale: Locale): string | null {
	if (!next) return null;
	const allowed = [`/${locale}/profile/`, `/${locale}/pricing/`];
	if (!allowed.some((prefix) => next.startsWith(prefix))) return null;
	let normalized: URL;
	try {
		normalized = new URL(next, "https://storylens.invalid");
	} catch {
		return null;
	}
	if (!allowed.some((prefix) => normalized.pathname.startsWith(prefix)))
		return null;
	let path: string;
	try {
		path = decodeURIComponent(normalized.pathname);
	} catch {
		return null;
	}
	if (
		!allowed.some((prefix) => path.startsWith(prefix)) ||
		/[\\]|\/\/|\/\.\.?(\/|$)/.test(path)
	)
		return null;
	// Rejects `//host`, `\` tricks and dot segments that would leave the prefix.
	if (/[\\]|\/\/|\/\.\.?(\/|$)/.test(next)) return null;
	return next;
}
