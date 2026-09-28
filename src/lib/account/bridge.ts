// Page side of the account bridge. The Story Lens extension injects a content
// script on this origin that answers these messages; keep this protocol in sync
// with the extension's `src/lib/website/account-bridge.ts`.
export const ACCOUNT_BRIDGE_CHANNEL = "storylens-account";
const BRIDGE_TIMEOUT_MS = 1500;

export interface AccountRole {
	id: string;
	slug: string;
	name: string;
}
export interface AccountUser {
	id: string;
	email: string;
	username: string;
	name: string;
	isGuest: boolean;
	role: AccountRole | null;
	/** Permission keys the API granted, e.g. `POST /api/user/keywords/`. */
	permissions: string[];
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

// Extension builds before role permissions stored `role: "guest" | "user" | "admin"`.
const LEGACY_ROLES: Record<string, AccountRole> = {
	guest: { id: "", slug: "guest", name: "Guest" },
	user: { id: "", slug: "reader", name: "Reader" },
	admin: { id: "", slug: "moderator", name: "Moderator" },
};

/** Accepts an API or extension user, current or legacy; null otherwise. */
export function normalizeAccountUser(value: unknown): AccountUser | null {
	if (
		!isRecord(value) ||
		typeof value.id !== "string" ||
		typeof value.email !== "string" ||
		typeof value.username !== "string" ||
		typeof value.name !== "string"
	) {
		return null;
	}
	const base = {
		id: value.id,
		email: value.email,
		username: value.username,
		name: value.name,
	};
	if (typeof value.role === "string") {
		const role = LEGACY_ROLES[value.role];
		if (!role) return null;
		return { ...base, isGuest: value.role === "guest", role, permissions: [] };
	}
	const role =
		isRecord(value.role) &&
		typeof value.role.id === "string" &&
		typeof value.role.slug === "string" &&
		typeof value.role.name === "string"
			? { id: value.role.id, slug: value.role.slug, name: value.role.name }
			: null;
	return {
		...base,
		isGuest: value.isGuest === true,
		role,
		permissions: Array.isArray(value.permissions)
			? value.permissions.filter(
					(key): key is string => typeof key === "string",
				)
			: [],
	};
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
	const user = isRecord(data.session)
		? normalizeAccountUser(data.session.user)
		: null;
	const token =
		isRecord(data.session) && typeof data.session.token === "string"
			? data.session.token
			: "";
	return {
		id: typeof data.id === "string" ? data.id : undefined,
		session: user && token ? { user, token } : null,
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
