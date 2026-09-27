// Page side of the account bridge. The Story Lens extension injects a content
// script on this origin that answers these messages; keep this protocol in sync
// with the extension's `src/lib/website/account-bridge.ts`.
export const ACCOUNT_BRIDGE_CHANNEL = "storylens-account";
const BRIDGE_TIMEOUT_MS = 1500;

export type AccountRole = "guest" | "user" | "admin";
export interface AccountUser {
	id: string;
	email: string;
	username: string;
	name: string;
	role: AccountRole;
}
export interface AccountSession {
	user: AccountUser;
	token: string;
}
export type BridgeRequest =
	| { type: "get" }
	| { type: "set"; session: AccountSession }
	| { type: "clear" };

interface ExtensionMessage {
	id?: string;
	session: AccountSession | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function readExtensionMessage(event: MessageEvent): ExtensionMessage | null {
	if (event.source !== window || event.origin !== window.location.origin) {
		return null;
	}
	const data: unknown = event.data;
	if (
		!isRecord(data) ||
		data.channel !== ACCOUNT_BRIDGE_CHANNEL ||
		data.from !== "extension" ||
		data.type !== "session"
	) {
		return null;
	}
	const session = isRecord(data.session)
		? (data.session as unknown as AccountSession)
		: null;
	return {
		id: typeof data.id === "string" ? data.id : undefined,
		session: session?.token && session.user ? session : null,
	};
}

/**
 * Sends a request to the extension and resolves with its current session.
 * Resolves `undefined` when no extension answers (not installed or disabled).
 */
export function requestSession(
	request: BridgeRequest,
): Promise<AccountSession | null | undefined> {
	return new Promise((resolve) => {
		const id = crypto.randomUUID();
		const timer = window.setTimeout(() => {
			window.removeEventListener("message", onMessage);
			resolve(undefined);
		}, BRIDGE_TIMEOUT_MS);
		function onMessage(event: MessageEvent) {
			const message = readExtensionMessage(event);
			if (!message || message.id !== id) return;
			window.clearTimeout(timer);
			window.removeEventListener("message", onMessage);
			resolve(message.session);
		}
		window.addEventListener("message", onMessage);
		window.postMessage(
			{ channel: ACCOUNT_BRIDGE_CHANNEL, from: "page", id, ...request },
			window.location.origin,
		);
	});
}

/** Follows session changes the extension pushes (for example from another tab). */
export function subscribeSession(
	listener: (session: AccountSession | null) => void,
): () => void {
	function onMessage(event: MessageEvent) {
		const message = readExtensionMessage(event);
		if (message && !message.id) listener(message.session);
	}
	window.addEventListener("message", onMessage);
	return () => window.removeEventListener("message", onMessage);
}
