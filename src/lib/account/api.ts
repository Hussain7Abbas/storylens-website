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

// Reader-account endpoints live under `/api/user/auth`; Better Auth's OAuth
// routes (`/auth/sign-in/social`, callbacks) stay at `/auth`.
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
	return call("/api/user/auth/login", { locale, method: "POST", body: values });
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

/** Confirms the emailed code; a guest token upgrades that guest in place. */
export function verifyRegistration(
	locale: Locale,
	values: { email: string; code: string },
	guestToken?: string,
): Promise<AccountSession> {
	return call("/api/user/auth/register/verify", {
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
	return call("/api/user/auth/me", {
		locale,
		token,
		method: "PUT",
		body: values,
	});
}

/** Checks the current password and emails a code to the account address. */
export function changePassword(
	locale: Locale,
	token: string,
	values: { currentPassword: string; newPassword: string },
): Promise<CodeChallenge> {
	return call("/api/user/auth/change-password", {
		locale,
		token,
		method: "POST",
		body: values,
	});
}

/** Applies the new password once the emailed code matches. */
export function verifyPasswordChange(
	locale: Locale,
	token: string,
	values: { code: string },
): Promise<{ success: boolean }> {
	return call("/api/user/auth/change-password/verify", {
		locale,
		token,
		method: "POST",
		body: values,
	});
}

/** Emails a code to the new address; also resends it. */
export function changeEmail(
	locale: Locale,
	token: string,
	values: { email: string },
): Promise<CodeChallenge> {
	return call("/api/user/auth/change-email", {
		locale,
		token,
		method: "POST",
		body: values,
	});
}

/** Moves the account to the new address once the emailed code matches. */
export function verifyEmailChange(
	locale: Locale,
	token: string,
	values: { code: string },
): Promise<AccountUser> {
	return call("/api/user/auth/change-email/verify", {
		locale,
		token,
		method: "POST",
		body: values,
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

/**
 * Trades the API cookie left by the OAuth callback for an extension session.
 * A guest token merges that guest's data into the signed-in account.
 */
export function completeOAuth(
	locale: Locale,
	guestToken?: string,
): Promise<AccountSession> {
	return call("/api/user/auth/oauth/session", {
		locale,
		method: "POST",
		body: guestToken ? { guestToken } : {},
		withCookies: true,
	});
}
