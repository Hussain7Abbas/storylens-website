import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type Request, test } from "@playwright/test";

type User = {
	id: string;
	email: string;
	username: string;
	name: string;
	isGuest: boolean;
	role: { id: string; slug: string; name: string } | null;
	permissions: string[];
};
type Session = { user: User; token: string } | null;

const guest: NonNullable<Session> = {
	user: {
		id: "guest-id",
		email: "reader@guest.storylens.local",
		username: "QuietOwl42",
		name: "QuietOwl42",
		isGuest: true,
		role: { id: "role-guest", slug: "guest", name: "Guest" },
		permissions: ["GET /api/user/auth/me"],
	},
	token: "guest-token",
};
// The same account after registering (a guest upgrades in place, keeping its ID).
const reader: User = {
	id: "guest-id",
	email: "reader@example.com",
	username: "QuietOwl42",
	name: "Reader",
	isGuest: false,
	role: { id: "role-reader", slug: "reader", name: "Reader" },
	permissions: ["GET /api/user/auth/me", "POST /api/user/keywords/"],
};
const other: User = {
	...reader,
	id: "other-id",
	email: "other@example.com",
	username: "Other",
	name: "Other reader",
};

/**
 * Stands in for the extension's website-bridge content script, keeping the
 * session in sessionStorage so it survives navigation between account pages.
 */
async function installFakeExtension(page: Page, session: Session) {
	await page.addInitScript((initial) => {
		const key = "fake-extension-session";
		if (sessionStorage.getItem(key) === null)
			sessionStorage.setItem(key, JSON.stringify(initial));
		window.addEventListener("message", (event) => {
			const data = event.data;
			if (
				event.source !== window ||
				data?.channel !== "storylens-account" ||
				data.from !== "page"
			)
				return;
			if (data.type === "set")
				sessionStorage.setItem(key, JSON.stringify(data.session));
			if (data.type === "clear") sessionStorage.setItem(key, "null");
			window.postMessage(
				{
					channel: "storylens-account",
					from: "extension",
					type: "session",
					id: data.id,
					session: JSON.parse(sessionStorage.getItem(key) ?? "null"),
				},
				location.origin,
			);
		});
	}, session);
}

function storedSession(page: Page): Promise<Session> {
	return page.evaluate(() =>
		JSON.parse(sessionStorage.getItem("fake-extension-session") ?? "null"),
	);
}

type Call = {
	method: string;
	path: string;
	body: unknown;
	authorization?: string;
	csrf?: string;
};

/**
 * The reader API with the website's cookie session held in memory: `web` is
 * the account the cookie belongs to. Every call is recorded.
 */
async function mockApi(
	page: Page,
	{ web = null, google = false }: { web?: User | null; google?: boolean } = {},
) {
	const state = { web, calls: [] as Call[], registerCalls: 0 };
	const bearerUsers: Record<string, User> = {
		"member-token": reader,
		"other-token": other,
	};
	const json = (request: Request) => {
		try {
			return request.postDataJSON() as Record<string, unknown> | null;
		} catch {
			return null;
		}
	};
	await page.route("**/api/user/**", async (route) => {
		const request = route.request();
		const path = new URL(request.url()).pathname.replace("/api/user", "");
		const method = request.method();
		const body = json(request);
		state.calls.push({
			method,
			path,
			body,
			authorization: request.headers().authorization,
			csrf: request.headers()["x-storylens-web"],
		});
		// Answers 401 when the website is signed out; true when it did.
		const signedOut = async () => {
			if (state.web) return false;
			await route.fulfill({
				status: 401,
				json: { message: "Authentication required" },
			});
			return true;
		};
		switch (`${method} ${path}`) {
			case "GET /auth/providers":
				return route.fulfill({ json: { google } });
			case "GET /auth/me":
				return state.web
					? route.fulfill({ json: state.web })
					: route.fulfill({
							status: 401,
							json: { message: "Authentication required" },
						});
			case "PUT /auth/me":
				if (await signedOut()) return;
				state.web = { ...(state.web as User), ...(body as object) };
				return route.fulfill({ json: state.web });
			case "POST /auth/web/login":
				if (body?.password !== "right-password")
					return route.fulfill({
						status: 401,
						json: { message: "Invalid email or password" },
					});
				state.web = reader;
				return route.fulfill({ json: { user: reader } });
			case "POST /auth/register":
				state.registerCalls += 1;
				return route.fulfill({
					json: {
						email: "reader@example.com",
						expiresAt: new Date(Date.now() + 600_000).toISOString(),
						resendAfterSeconds: 0,
					},
				});
			case "POST /auth/web/register/verify":
				if (body?.code !== "123456")
					return route.fulfill({
						status: 400,
						json: { message: "Incorrect code. 4 attempts left." },
					});
				state.web = reader;
				return route.fulfill({ json: { user: reader, gift: { lenses: 10 } } });
			case "POST /auth/web/oauth/session":
				state.web = reader;
				return route.fulfill({ json: { user: reader } });
			case "POST /auth/web/logout":
				state.web = null;
				return route.fulfill({ json: { success: true } });
			case "POST /auth/web/extension-session":
				if (await signedOut()) return;
				return route.fulfill({
					json: { user: state.web, token: "handoff-token" },
				});
			case "POST /auth/web/adopt": {
				const token = request.headers().authorization?.replace("Bearer ", "");
				const user = token ? bearerUsers[token] : undefined;
				if (!user)
					return route.fulfill({ status: 401, json: { message: "No" } });
				state.web = user;
				return route.fulfill({ json: { user } });
			}
			case "POST /auth/change-password":
			case "POST /auth/change-email":
				if (await signedOut()) return;
				return route.fulfill({
					json: {
						email:
							path === "/auth/change-email"
								? (body?.email as string)
								: (state.web as User).email,
						expiresAt: new Date(Date.now() + 600_000).toISOString(),
						resendAfterSeconds: 60,
					},
				});
			case "POST /auth/change-password/verify":
				if (await signedOut()) return;
				return route.fulfill({ json: { success: true } });
			case "POST /auth/change-email/verify":
				if (await signedOut()) return;
				if (body?.code !== "123456")
					return route.fulfill({
						status: 400,
						json: { message: "Incorrect code. 4 attempts left." },
					});
				state.web = { ...(state.web as User), email: "new@example.com" };
				return route.fulfill({ json: state.web });
			default:
				return route.fulfill({ status: 404, json: { message: "Not mocked" } });
		}
	});
	return state;
}

const calls = (state: { calls: Call[] }, method: string, path: string) =>
	state.calls.filter((call) => call.method === method && call.path === path);

async function expectAccessible(page: Page) {
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth,
		),
	).toBeTruthy();
	const result = await new AxeBuilder({ page })
		.withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
		.analyze();
	expect(result.violations).toEqual([]);
}

for (const locale of ["en", "ar"] as const) {
	for (const theme of ["light", "dark"] as const)
		for (const [route, web] of [
			["profile/", reader],
			["profile/login/", null],
			["profile/register/", null],
			["profile/email/", reader],
			["profile/oauth/?error=access_denied", null],
		] as const)
			test(`${locale}/${route}: accessibility ${theme}`, async ({ page }) => {
				await installFakeExtension(page, web ? null : guest);
				await mockApi(page, { web });
				await page.emulateMedia({
					reducedMotion: "reduce",
					colorScheme: theme,
				});
				await page.goto(`/${locale}/${route}`);
				await page.evaluate((t) => {
					document.documentElement.dataset.theme = t;
				}, theme);
				await expect(
					page.locator(".account-card .button").first(),
				).toBeVisible();
				await expect(page.locator("h1")).toHaveCount(1);
				await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
					"content",
					/noindex/,
				);
				await expectAccessible(page);
			});
}

test("without the extension, signing in works and the profile offers the install", async ({
	page,
}) => {
	const api = await mockApi(page);
	await page.goto("/en/profile/login/");
	const email = page.getByLabel("Email");
	const password = page.getByLabel("Password");
	await expect(email).toHaveAttribute("autocomplete", "username");
	await expect(email).toHaveAttribute("name", "email");
	await expect(password).toHaveAttribute("autocomplete", "current-password");

	await email.fill("reader@example.com");
	await password.fill("wrong-password");
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page.locator(".account-error")).toHaveText(
		"Email or password is incorrect.",
	);

	await password.fill("right-password");
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page).toHaveURL(/\/en\/profile\/$/);
	await expect(page.locator(".account-details")).toContainText(
		"reader@example.com",
	);
	const install = page.getByRole("region", { name: "Story Lens extension" });
	await expect(
		install.getByRole("link", { name: /Add to Chrome/ }),
	).toHaveAttribute("data-analytics-cta", "profile");
	const login = calls(api, "POST", "/auth/web/login");
	expect(login.at(-1)?.csrf).toBe("1");
	expect(login.at(-1)?.authorization).toBeUndefined();
	// Phones show the icon only; the accessible name carries the text.
	await expect(page.locator(".header-account")).toHaveAttribute(
		"aria-label",
		"Your profile: Reader",
	);
});

test("registration upgrades the extension's guest, then hands it the account", async ({
	page,
}) => {
	await installFakeExtension(page, guest);
	const api = await mockApi(page);
	await page.goto("/en/profile/register/");
	await expect(page.getByLabel("Username")).toHaveValue("QuietOwl42");
	await page.getByLabel("Email").fill("reader@example.com");
	await page.getByLabel("Password").fill("a-long-password");
	await page.getByRole("button", { name: "Create account" }).click();

	const code = page.getByLabel("Verification code");
	await expect(code).toHaveAttribute("autocomplete", "one-time-code");
	await code.fill("000000");
	await page.getByRole("button", { name: "Verify email" }).click();
	await expect(page.locator(".account-error")).toHaveText(
		"Incorrect code. 4 attempts left.",
	);
	await page.getByRole("button", { name: "Resend code" }).click();
	await expect(page.locator("output.account-hint")).toHaveText(
		"A new code is on its way.",
	);
	expect(api.registerCalls).toBe(2);

	await code.fill("123456");
	await page.getByRole("button", { name: "Verify email" }).click();
	await expect(page).toHaveURL(/\/en\/profile\/$/);
	await expect(
		page.getByText("The extension in this browser uses this account."),
	).toBeVisible();
	const verify = calls(api, "POST", "/auth/web/register/verify");
	expect(verify.map((call) => call.authorization)).toEqual([
		"Bearer guest-token",
		"Bearer guest-token",
	]);
	expect(calls(api, "POST", "/auth/web/extension-session")[0]?.body).toEqual({
		guestToken: "guest-token",
	});
	expect(await storedSession(page)).toEqual({
		user: reader,
		token: "handoff-token",
	});
});

test("changing the email returns to a prefilled registration form", async ({
	page,
}) => {
	await installFakeExtension(page, guest);
	await mockApi(page);
	await page.goto("/ar/profile/register/");
	await page.getByLabel("البريد الإلكتروني").fill("reader@example.com");
	await page.getByLabel("كلمة المرور").fill("a-long-password");
	await page.getByRole("button", { name: "إنشاء حساب" }).click();
	await expect(page.getByLabel("رمز التحقق")).toBeVisible();
	await page.getByRole("button", { name: "استخدام بريد إلكتروني آخر" }).click();
	await expect(page.getByLabel("البريد الإلكتروني")).toHaveValue(
		"reader@example.com",
	);
	await expect(page.getByLabel("اسم المستخدم")).toHaveValue("QuietOwl42");
});

for (const view of ["", "password/", "email/"])
	test(`signed out, profile/${view} sends the reader to sign in and back`, async ({
		page,
	}) => {
		await mockApi(page);
		await page.goto(`/en/profile/${view}`);
		await expect(page).toHaveURL(
			new RegExp(
				`/en/profile/login/\\?next=${encodeURIComponent(`/en/profile/${view}`)}$`,
			),
		);
		await page.getByLabel("Email").fill("reader@example.com");
		await page.getByLabel("Password").fill("right-password");
		await page.getByRole("button", { name: "Sign in" }).click();
		await expect(page).toHaveURL(new RegExp(`/en/profile/${view}$`));
	});

test("a next address outside the account pages is ignored", async ({
	page,
}) => {
	await mockApi(page);
	await page.goto("/en/profile/login/?next=https://evil.example/");
	await page.getByLabel("Email").fill("reader@example.com");
	await page.getByLabel("Password").fill("right-password");
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page).toHaveURL("http://localhost:4173/en/profile/");
});

test("a signed-out extension gets the website's account", async ({ page }) => {
	await installFakeExtension(page, null);
	const api = await mockApi(page, { web: reader });
	await page.goto("/en/profile/");
	await expect(
		page.getByText("The extension in this browser uses this account."),
	).toBeVisible();
	expect(calls(api, "POST", "/auth/web/extension-session")).toHaveLength(1);
	expect(await storedSession(page)).toEqual({
		user: reader,
		token: "handoff-token",
	});
});

for (const staleProfile of [false, true])
	test(`sync recovery renews once with an ${staleProfile ? "outdated" : "unchanged"} extension profile`, async ({
		page,
	}) => {
		await installFakeExtension(page, {
			user: staleProfile ? { ...reader, name: "Old name" } : reader,
			token: "expired-token",
		});
		const api = await mockApi(page, { web: reader });
		await page.goto("/en/profile/login/?reauth=1");
		await expect
			.poll(() => storedSession(page))
			.toEqual({ user: reader, token: "handoff-token" });
		await expect(page.getByText("You’re already signed in as")).toBeVisible();
		expect(calls(api, "POST", "/auth/web/extension-session")).toHaveLength(1);
		expect(calls(api, "POST", "/auth/web/login")).toHaveLength(0);
		expect(calls(api, "POST", "/auth/web/adopt")).toHaveLength(0);
		// Following the normal profile link must not start renewal again.
		await page
			.getByRole("link", { name: "Back to your profile", exact: true })
			.click();
		await expect(
			page.getByText("The extension in this browser uses this account."),
		).toBeVisible();
		expect(calls(api, "POST", "/auth/web/extension-session")).toHaveLength(1);
		await expectAccessible(page);
	});

test("sync recovery survives signing in when both sessions have expired", async ({
	page,
}) => {
	await installFakeExtension(page, { user: reader, token: "expired-token" });
	const api = await mockApi(page);
	await page.goto("/en/profile/login/?reauth=1");
	await page.getByLabel("Email").fill("reader@example.com");
	await page.getByLabel("Password").fill("right-password");
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page).toHaveURL("http://localhost:4173/en/profile/");
	await expect
		.poll(() => storedSession(page))
		.toEqual({ user: reader, token: "handoff-token" });
	await expect(
		page.getByText("The extension in this browser uses this account."),
	).toBeVisible();
	expect(calls(api, "POST", "/auth/web/extension-session")).toHaveLength(1);
});

test("sync recovery survives the Google callback", async ({ page }) => {
	await installFakeExtension(page, { user: reader, token: "expired-token" });
	const api = await mockApi(page);
	await page.goto("/en/profile/login/?reauth=1");
	await expect(page.getByLabel("Email")).toBeVisible();
	await page.goto("/en/profile/oauth/");
	await expect(page).toHaveURL(/\/en\/profile\/$/);
	await expect
		.poll(() => storedSession(page))
		.toEqual({ user: reader, token: "handoff-token" });
	expect(calls(api, "POST", "/auth/web/oauth/session")).toHaveLength(1);
	expect(calls(api, "POST", "/auth/web/extension-session")).toHaveLength(1);
});

test("sync recovery still asks before replacing another account", async ({
	page,
}) => {
	await installFakeExtension(page, { user: other, token: "other-token" });
	const api = await mockApi(page, { web: reader });
	await page.goto("/en/profile/login/?reauth=1");
	await expect(page.getByText("You’re already signed in as")).toBeVisible();
	await page
		.getByRole("link", { name: "Back to your profile", exact: true })
		.click();
	const card = page.getByRole("region", { name: "Story Lens extension" });
	await expect(card).toContainText("other@example.com");
	expect(calls(api, "POST", "/auth/web/extension-session")).toHaveLength(0);
	expect(await storedSession(page)).toEqual({
		user: other,
		token: "other-token",
	});
	await card
		.getByRole("button", { name: "Use reader@example.com in the extension" })
		.click();
	await expect
		.poll(() => storedSession(page))
		.toEqual({ user: reader, token: "handoff-token" });
	await expect(
		card.getByText("The extension in this browser uses this account."),
	).toBeVisible();
	expect(calls(api, "POST", "/auth/web/extension-session")).toHaveLength(1);
});

test("an extension on the same account gets the fresh profile, keeping its token", async ({
	page,
}) => {
	await installFakeExtension(page, {
		user: { ...reader, name: "Old name" },
		token: "member-token",
	});
	const api = await mockApi(page, { web: reader });
	await page.goto("/en/profile/");
	await expect(
		page.getByText("The extension in this browser uses this account."),
	).toBeVisible();
	expect(calls(api, "POST", "/auth/web/extension-session")).toHaveLength(0);
	expect(await storedSession(page)).toEqual({
		user: reader,
		token: "member-token",
	});
});

test("an extension on another account asks which one to keep", async ({
	page,
}) => {
	await installFakeExtension(page, { user: other, token: "other-token" });
	const api = await mockApi(page, { web: reader });
	await page.goto("/en/profile/");
	const card = page.getByRole("region", { name: "Story Lens extension" });
	await expect(card).toContainText("other@example.com");
	expect(calls(api, "POST", "/auth/web/extension-session")).toHaveLength(0);
	await expectAccessible(page);

	await card
		.getByRole("button", { name: "Use reader@example.com in the extension" })
		.click();
	await expect(
		card.getByText("The extension in this browser uses this account."),
	).toBeVisible();
	expect(await storedSession(page)).toEqual({
		user: reader,
		token: "handoff-token",
	});
});

test("the website can switch to the extension's account instead", async ({
	page,
}) => {
	await installFakeExtension(page, { user: other, token: "other-token" });
	const api = await mockApi(page, { web: reader });
	await page.goto("/en/profile/");
	await page
		.getByRole("button", { name: "Switch this site to other@example.com" })
		.click();
	await expect(page.locator(".account-details")).toContainText(
		"other@example.com",
	);
	expect(calls(api, "POST", "/auth/web/adopt")[0]?.authorization).toBe(
		"Bearer other-token",
	);
	expect(await storedSession(page)).toEqual({
		user: other,
		token: "other-token",
	});
});

test("switching accounts clears the old balance and celebrates the new account's gift", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await installFakeExtension(page, { user: other, token: "other-token" });
	const api = await mockApi(page, { web: reader });
	const seen: string[] = [];
	let releaseBalance: (() => void) | undefined;
	const otherBalance = new Promise<void>((resolve) => {
		releaseBalance = resolve;
	});
	await page.route("**/api/user/billing/**", async (route) => {
		const path = new URL(route.request().url()).pathname;
		if (path.endsWith("/notices/seen")) {
			const body = route.request().postDataJSON() as { ids: string[] };
			seen.push(...body.ids);
			return route.fulfill({ json: { updated: body.ids.length } });
		}
		if (path.endsWith("/balance")) {
			const isOther = api.web?.id === other.id;
			if (isOther) await otherBalance;
			return route.fulfill({
				json: {
					balance: isOther ? 20 : 10,
					notices: [
						{
							id: isOther ? "other-gift" : "reader-gift",
							type: "ADMIN_GIFT",
							lenses: isOther ? 20 : 10,
							note: null,
							createdAt: new Date().toISOString(),
						},
					],
				},
			});
		}
		await route.fulfill({ status: 404, json: { message: "Not mocked" } });
	});
	await page.goto("/en/profile/");
	const gift = page.getByRole("dialog", { name: "Congratulations!" });
	await expect(gift).toContainText("10 lenses");
	await gift.getByRole("button", { name: "Close", exact: true }).click();
	await page
		.getByRole("button", { name: "Switch this site to other@example.com" })
		.click();
	await expect(page.locator(".account-details")).toContainText(other.email);
	await expect(page.locator(".account-details")).not.toContainText("10 lenses");
	await expect(gift).toHaveCount(0);
	releaseBalance?.();
	await expect(gift).toContainText("20 lenses");
	await expect.poll(() => seen).toEqual(["reader-gift", "other-gift"]);
});

test("a signed-out website adopts the extension's account", async ({
	page,
}) => {
	await installFakeExtension(page, { user: other, token: "other-token" });
	const api = await mockApi(page);
	await page.goto("/en/profile/");
	await expect(page.locator(".account-details")).toContainText(
		"other@example.com",
	);
	expect(calls(api, "POST", "/auth/web/adopt")).toHaveLength(1);
});

test("signing out with the same account in the extension signs both out", async ({
	page,
}) => {
	await installFakeExtension(page, { user: reader, token: "member-token" });
	await mockApi(page, { web: reader });
	await page.goto("/en/profile/");
	await page.getByRole("button", { name: "Sign out" }).click();
	await expect(page).toHaveURL(/\/en\/profile\/login\/\?signed-out=both$/);
	await expect(page.locator(".account-notice")).toContainText(
		"You’re signed out here and in the extension.",
	);
	expect(await storedSession(page)).toBeNull();
	await expect(page.locator(".header-account")).toHaveAttribute(
		"aria-label",
		"Sign in",
	);
});

test("signing out with another account in the extension leaves the extension alone", async ({
	page,
}) => {
	await installFakeExtension(page, { user: other, token: "other-token" });
	const api = await mockApi(page, { web: reader });
	await page.goto("/en/profile/");
	await expect(
		page.getByText("other@example.com", { exact: true }),
	).toBeVisible();
	await page.getByRole("button", { name: "Sign out" }).click();
	await expect(page.locator(".account-notice")).toContainText(
		"You’re signed out on this website.",
	);
	expect(await storedSession(page)).toEqual({
		user: other,
		token: "other-token",
	});
	// Signing out here is not undone by adopting the extension's account.
	await expect(page.getByLabel("Email")).toBeVisible();
	expect(calls(api, "POST", "/auth/web/adopt")).toHaveLength(0);
});

test("password changes use the website session", async ({ page }) => {
	const api = await mockApi(page, { web: reader });
	await page.goto("/en/profile/password/");
	await page.getByLabel("Current password").fill("old-password");
	await page.getByLabel("New password", { exact: true }).fill("new-password");
	await page.getByLabel("Confirm new password").fill("new-password");
	await page.getByRole("button", { name: "Send code" }).click();
	await expect(page.getByText("reader@example.com")).toBeVisible();
	await page.getByLabel("Verification code").fill("123456");
	await page.getByRole("button", { name: "Confirm" }).click();
	await expect(page.locator(".account-notice")).toHaveText(
		"Your password was changed.",
	);
	const sent = [
		...calls(api, "POST", "/auth/change-password"),
		...calls(api, "POST", "/auth/change-password/verify"),
	];
	expect(sent.map((call) => [call.authorization, call.csrf])).toEqual([
		[undefined, "1"],
		[undefined, "1"],
	]);
});

test("an email change updates the profile and the extension's copy", async ({
	page,
}) => {
	await installFakeExtension(page, { user: reader, token: "member-token" });
	await mockApi(page, { web: reader });
	await page.goto("/en/profile/");
	await page.getByRole("button", { name: "Edit profile" }).click();
	await expect(page.getByLabel("Email")).toHaveCount(0);
	await page.getByRole("button", { name: "Cancel" }).click();
	await page.getByRole("link", { name: "Change email" }).click();
	await expect(page).toHaveURL(/\/en\/profile\/email\/$/);
	await page.getByLabel("New email").fill("new@example.com");
	await page.getByRole("button", { name: "Send code" }).click();
	const code = page.getByLabel("Verification code");
	await code.fill("000000");
	await page.getByRole("button", { name: "Confirm" }).click();
	await expect(page.locator(".account-error")).toHaveText(
		"Incorrect code. 4 attempts left.",
	);
	await code.fill("123456");
	await page.getByRole("button", { name: "Confirm" }).click();
	await expect(page.locator(".account-notice")).toHaveText(
		"Your email was changed.",
	);
	await expect
		.poll(async () => (await storedSession(page))?.user.email)
		.toBe("new@example.com");
	expect((await storedSession(page))?.token).toBe("member-token");
});

test("Google sign-in is offered only when the API enables it", async ({
	page,
}) => {
	await mockApi(page, { google: false });
	await page.goto("/en/profile/login/");
	await expect(page.getByLabel("Email")).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Continue with Google" }),
	).toHaveCount(0);

	await page.unrouteAll({ behavior: "ignoreErrors" });
	await mockApi(page, { google: true });
	let request: { provider?: string; callbackURL?: string } = {};
	await page.route("**/auth/sign-in/social", async (route) => {
		request = route.request().postDataJSON();
		await route.fulfill({
			json: { url: "http://localhost:4173/en/?google-stub", redirect: true },
		});
	});
	await page.reload();
	await page.getByRole("button", { name: "Continue with Google" }).click();
	await expect(page).toHaveURL(/google-stub/);
	expect(request.provider).toBe("google");
	expect(request.callbackURL).toBe("http://localhost:4173/en/profile/oauth/");
});

test("the Google callback signs the website in, then merges the extension's guest", async ({
	page,
}) => {
	await installFakeExtension(page, guest);
	const api = await mockApi(page);
	await page.goto("/en/profile/oauth/");
	await expect(page).toHaveURL(/\/en\/profile\/$/);
	expect(calls(api, "POST", "/auth/web/oauth/session")).toHaveLength(1);
	await expect
		.poll(() => storedSession(page))
		.toEqual({ user: reader, token: "handoff-token" });
	expect(calls(api, "POST", "/auth/web/extension-session")[0]?.body).toEqual({
		guestToken: "guest-token",
	});
});

test("the Google callback reports a cancelled sign-in", async ({ page }) => {
	await installFakeExtension(page, guest);
	const api = await mockApi(page);
	await page.goto("/en/profile/oauth/?error=access_denied");
	await expect(page.locator(".account-error")).toHaveText(
		"Sign-in with Google didn’t complete. Please try again.",
	);
	expect(calls(api, "POST", "/auth/web/oauth/session")).toHaveLength(0);
	expect(await storedSession(page)).toEqual(guest);
});

test("the header shows Sign in, then the reader's name", async ({ page }) => {
	const api = await mockApi(page);
	await page.goto("/en/privacy/", { waitUntil: "domcontentloaded" });
	const link = page.locator(".header-account");
	await expect(link).toHaveAttribute("href", "/en/profile/login/");
	await expect(link).toHaveAttribute("data-state", "ready");
	api.web = reader;
	await page.evaluate(() =>
		sessionStorage.removeItem("storylens-website-account"),
	);
	await page.goto("/en/terms/", { waitUntil: "domcontentloaded" });
	await expect(link).toHaveAttribute("href", "/en/profile/");
	await expect(link).toHaveAttribute("aria-label", "Your profile: Reader");
});
