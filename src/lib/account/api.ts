import type { Locale } from "@/lib/site-config";
import { siteConfig } from "@/lib/site-config";
import type { AccountSession, AccountUser } from "./bridge";

export class AccountApiError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
	}
}

async function call<T>(
	path: string,
	{
		locale,
		token,
		method = "GET",
		body,
		withCookies = false,
	}: {
		locale: Locale;
		token?: string;
		method?: "GET" | "POST" | "PUT";
		body?: unknown;
		// OAuth state and the post-callback session are API cookies.
		withCookies?: boolean;
	},
): Promise<T> {
	const response = await fetch(`${siteConfig.api}${path}`, {
		method,
		headers: {
			"Accept-Language": locale,
			...(body === undefined ? {} : { "Content-Type": "application/json" }),
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
		credentials: withCookies ? "include" : "same-origin",
	});
	const data: unknown = await response.json().catch(() => null);
	if (!response.ok) {
		// Route errors carry a localized `message`; schema validation errors do not.
		const message =
			response.status !== 422 &&
			typeof data === "object" &&
			data !== null &&
			"message" in data &&
			typeof data.message === "string"
				? data.message
				: "";
		throw new AccountApiError(response.status, message);
	}
	return data as T;
}

export function login(
	locale: Locale,
	values: { email: string; password: string },
): Promise<AccountSession> {
	return call("/auth/login", { locale, method: "POST", body: values });
}

/** Registers a new account, upgrading the guest when its token is supplied. */
export function register(
	locale: Locale,
	values: { email: string; password: string; username: string; name?: string },
	guestToken?: string,
): Promise<AccountSession> {
	return call("/auth/register", {
		locale,
		token: guestToken,
		method: "POST",
		body: values,
	});
}

export function updateProfile(
	locale: Locale,
	token: string,
	values: { username: string; name: string },
): Promise<AccountUser> {
	return call("/auth/me", { locale, token, method: "PUT", body: values });
}

export function changePassword(
	locale: Locale,
	token: string,
	values: { currentPassword: string; newPassword: string },
): Promise<{ success: boolean }> {
	return call("/auth/change-password", {
		locale,
		token,
		method: "POST",
		body: values,
	});
}

export function getProviders(locale: Locale): Promise<{ google: boolean }> {
	return call("/auth/providers", { locale });
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

/**
 * Trades the API cookie left by the OAuth callback for an extension session.
 * A guest token merges that guest's data into the signed-in account.
 */
export function completeOAuth(
	locale: Locale,
	guestToken?: string,
): Promise<AccountSession> {
	return call("/auth/oauth/session", {
		locale,
		method: "POST",
		body: guestToken ? { guestToken } : {},
		withCookies: true,
	});
}
