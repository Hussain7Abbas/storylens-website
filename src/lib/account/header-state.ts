// What the header's account link shows, cached for a few minutes so ordinary
// pages do not ask the API on every view. Only a display name is kept, never a
// token; the account pages update it whenever the website session changes.
const KEY = "storylens-website-account";
// A visitor who has never signed in on this browser has no website session, so
// the header has nothing to ask about. The flag survives the tab, holds no
// personal data, and only decides whether the header probes the API at all.
const HINT_KEY = "storylens-website-session";
const MAX_AGE_MS = 5 * 60 * 1000;
export const ACCOUNT_CHANGED_EVENT = "storylens-account-changed";

export type HeaderAccount =
	| { signedIn: false }
	| { signedIn: true; name: string };

export function readHeaderAccount(): HeaderAccount | null {
	try {
		const raw = sessionStorage.getItem(KEY);
		if (!raw) return null;
		const saved: unknown = JSON.parse(raw);
		if (
			typeof saved !== "object" ||
			saved === null ||
			!("at" in saved) ||
			typeof saved.at !== "number" ||
			Date.now() - saved.at > MAX_AGE_MS
		)
			return null;
		return "name" in saved && typeof saved.name === "string"
			? { signedIn: true, name: saved.name }
			: { signedIn: false };
	} catch {
		return null;
	}
}

/** Whether this browser has ever held a website session worth asking about. */
export function hasSessionHint(): boolean {
	try {
		return localStorage.getItem(HINT_KEY) === "1";
	} catch {
		// Blocked storage only means the header asks the API once per page.
		return true;
	}
}

export function writeHeaderAccount(account: HeaderAccount): void {
	try {
		sessionStorage.setItem(
			KEY,
			JSON.stringify(
				account.signedIn
					? { at: Date.now(), name: account.name }
					: { at: Date.now() },
			),
		);
		if (account.signedIn) localStorage.setItem(HINT_KEY, "1");
		else localStorage.removeItem(HINT_KEY);
	} catch {
		// Blocked storage only means the next page asks the API again.
	}
	window.dispatchEvent(new CustomEvent(ACCOUNT_CHANGED_EVENT));
}
