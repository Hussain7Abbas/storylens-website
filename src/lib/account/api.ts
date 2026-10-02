import type { Locale } from "@/lib/site-config";
import { siteConfig } from "@/lib/site-config";
import type { AccountSession, AccountUser } from "./bridge";

export class AccountApiError extends Error {
	constructor(
		readonly status: number,
		message: string,
		readonly code?: string,
		readonly details?: Record<string, unknown>,
	) {
		super(message);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

// Reader-account endpoints live under `/api/user/auth`; Better Auth's OAuth
// routes (`/auth/sign-in/social`, callbacks) stay at `/auth`.
export async function call<T>(
	path: string,
	{
		locale,
		token,
		method = "GET",
		body,
		withCookies = false,
		web = false,
	}: {
		locale: Locale;
		token?: string;
		method?: "GET" | "POST" | "PUT";
		body?: unknown;
		// OAuth state and the post-callback session are API cookies.
		withCookies?: boolean;
		// The website's own session: the API's HttpOnly cookie plus the CSRF
		// header the API requires from this origin. JavaScript never sees a token.
		web?: boolean;
	},
): Promise<T> {
	const response = await fetch(`${siteConfig.api}${path}`, {
		method,
		headers: {
			"Accept-Language": locale,
			...(body === undefined ? {} : { "Content-Type": "application/json" }),
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(web ? { "X-Storylens-Web": "1" } : {}),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
		credentials: withCookies || web ? "include" : "same-origin",
	});
	const data: unknown = await response.json().catch(() => null);
	if (!response.ok) {
		// Route errors carry a localized `message`; schema validation errors do not.
		const message =
			response.status !== 422 &&
			isRecord(data) &&
			typeof data.message === "string"
				? data.message
				: "";
		const code =
			isRecord(data) && typeof data.code === "string" ? data.code : undefined;
		// The API spreads an error's details (`balance`, `min`…) into the body.
		const details = isRecord(data) ? data : undefined;
		throw new AccountApiError(response.status, message, code, details);
	}
	return data as T;
}

export interface RegistrationValues {
	email: string;
	password: string;
	username: string;
	name?: string;
}
/** Where a verification code went, and when another may be requested. */
export interface CodeChallenge {
	email: string;
	expiresAt: string;
	resendAfterSeconds: number;
}
/** Lenses a new account received (decision D1); null when the trial is 0. */
export type TrialGift = { lenses: number } | null;

/** The signed-in reader from the website's cookie; null when signed out. */
export async function getWebMe(locale: Locale): Promise<AccountUser | null> {
	try {
		return await call<AccountUser>("/api/user/auth/me", { locale, web: true });
	} catch (error) {
		if (error instanceof AccountApiError && error.status === 401) return null;
		throw error;
	}
}

export function webLogin(
	locale: Locale,
	values: { email: string; password: string },
): Promise<{ user: AccountUser }> {
	return call("/api/user/auth/web/login", {
		locale,
		method: "POST",
		body: values,
		web: true,
	});
}

/** Checks the details and emails a verification code; also resends it. */
export function register(
	locale: Locale,
	values: RegistrationValues,
	guestToken?: string,
): Promise<CodeChallenge> {
	return call("/api/user/auth/register", {
		locale,
		token: guestToken,
		method: "POST",
		body: values,
	});
}

/**
 * Confirms the emailed code and signs the website in. The extension's guest
 * token upgrades that guest in place, keeping its data.
 */
export function webVerifyRegistration(
	locale: Locale,
	values: { email: string; code: string },
	guestToken?: string,
): Promise<{ user: AccountUser; gift: TrialGift }> {
	return call("/api/user/auth/web/register/verify", {
		locale,
		token: guestToken,
		method: "POST",
		body: values,
		web: true,
	});
}

/** Trades the API cookie left by the Google callback for the website session. */
export function webCompleteOAuth(
	locale: Locale,
): Promise<{ user: AccountUser }> {
	return call("/api/user/auth/web/oauth/session", {
		locale,
		method: "POST",
		body: {},
		web: true,
	});
}

export function webLogout(locale: Locale): Promise<{ success: boolean }> {
	return call("/api/user/auth/web/logout", {
		locale,
		method: "POST",
		body: {},
		web: true,
	});
}

/**
 * A session for the installed extension, from the website's session. A guest
 * token merges that guest's data into the account.
 */
export function createExtensionSession(
	locale: Locale,
	guestToken?: string,
): Promise<AccountSession> {
	return call("/api/user/auth/web/extension-session", {
		locale,
		method: "POST",
		body: guestToken ? { guestToken } : {},
		web: true,
	});
}

/** Signs the website in as the account the extension holds. */
export function adoptExtensionSession(
	locale: Locale,
	token: string,
): Promise<{ user: AccountUser }> {
	return call("/api/user/auth/web/adopt", {
		locale,
		token,
		method: "POST",
		body: {},
		web: true,
	});
}

export function updateProfile(
	locale: Locale,
	values: { username: string; name: string },
): Promise<AccountUser> {
	return call("/api/user/auth/me", {
		locale,
		method: "PUT",
		body: values,
		web: true,
	});
}

/** Checks the current password and emails a code to the account address. */
export function changePassword(
	locale: Locale,
	values: { currentPassword: string; newPassword: string },
): Promise<CodeChallenge> {
	return call("/api/user/auth/change-password", {
		locale,
		method: "POST",
		body: values,
		web: true,
	});
}

/** Applies the new password once the emailed code matches. */
export function verifyPasswordChange(
	locale: Locale,
	values: { code: string },
): Promise<{ success: boolean }> {
	return call("/api/user/auth/change-password/verify", {
		locale,
		method: "POST",
		body: values,
		web: true,
	});
}

/** Emails a code to the new address; also resends it. */
export function changeEmail(
	locale: Locale,
	values: { email: string },
): Promise<CodeChallenge> {
	return call("/api/user/auth/change-email", {
		locale,
		method: "POST",
		body: values,
		web: true,
	});
}

/** Moves the account to the new address once the emailed code matches. */
export function verifyEmailChange(
	locale: Locale,
	values: { code: string },
): Promise<AccountUser> {
	return call("/api/user/auth/change-email/verify", {
		locale,
		method: "POST",
		body: values,
		web: true,
	});
}

export function getProviders(locale: Locale): Promise<{ google: boolean }> {
	return call("/api/user/auth/providers", { locale });
}

/** Starts Google sign-in; resolves with the Google URL to navigate to. */
export async function startGoogleSignIn(
	locale: Locale,
	callbackURL: string,
): Promise<string> {
	const { url } = await call<{ url: string }>("/auth/sign-in/social", {
		locale,
		method: "POST",
		body: { provider: "google", callbackURL, errorCallbackURL: callbackURL },
		withCookies: true,
	});
	return url;
}
