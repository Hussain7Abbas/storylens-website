import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

type Session = {
	user: {
		id: string;
		email: string;
		username: string;
		name: string;
		isGuest: boolean;
		role: { id: string; slug: string; name: string } | null;
		permissions: string[];
	};
	token: string;
} | null;

const guest: Session = {
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
const member: NonNullable<Session> = {
	user: {
		id: "guest-id",
		email: "reader@example.com",
		username: "QuietOwl42",
		name: "Reader",
		isGuest: false,
		role: { id: "role-reader", slug: "reader", name: "Reader" },
		permissions: ["GET /api/user/auth/me", "POST /api/user/keywords/"],
	},
	token: "member-token",
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

for (const locale of ["en", "ar"] as const) {
	test(`${locale}: profile explains when the extension is missing`, async ({
		page,
	}) => {
		await page.goto(`/${locale}/profile/login/`);
		await expect(page.locator(".account-card h2")).toHaveText(
			locale === "ar"
				? "لم يُعثر على إضافة Story Lens"
				: "Story Lens extension not found",
		);
		await expect(page.locator("form")).toHaveCount(0);
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
			"content",
			/noindex/,
		);
	});
	for (const theme of ["light", "dark"] as const)
		for (const route of [
			"profile/",
			"profile/login/",
			"profile/register/",
			"profile/email/",
			"profile/oauth/?error=access_denied",
		])
			test(`${locale}/${route}: accessibility ${theme}`, async ({ page }) => {
				await installFakeExtension(page, guest);
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
				expect(
					await page.evaluate(
						() => document.documentElement.scrollWidth <= innerWidth,
					),
				).toBeTruthy();
				const result = await new AxeBuilder({ page })
					.withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
					.analyze();
				expect(result.violations).toEqual([]);
			});
}

test("login form carries password-manager hints and hands the session to the extension", async ({
	page,
}) => {
	await installFakeExtension(page, null);
	await page.route("**/auth/login", async (route) => {
		const body = route.request().postDataJSON();
		await route.fulfill(
			body.password === "right-password"
				? { json: member }
				: { status: 401, json: { message: "Invalid email or password" } },
		);
	});
	await page.goto("/en/profile/login/");
	const email = page.getByLabel("Email");
	const password = page.getByLabel("Password");
	await expect(email).toHaveAttribute("autocomplete", "username");
	await expect(email).toHaveAttribute("name", "email");
	await expect(password).toHaveAttribute("autocomplete", "current-password");
	await expect(password).toHaveAttribute("type", "password");

	await email.fill("reader@example.com");
	await password.fill("wrong-password");
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page.locator(".account-error")).toHaveText(
		"Email or password is incorrect.",
	);
	expect(await storedSession(page)).toBeNull();

	await password.fill("right-password");
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page).toHaveURL(/\/en\/profile\/$/);
	await expect(page.getByText("reader@example.com")).toBeVisible();
	expect(await storedSession(page)).toEqual(member);
});

test("registration verifies the emailed code and upgrades the guest", async ({
	page,
}) => {
	await installFakeExtension(page, guest);
	const authorizations: (string | undefined)[] = [];
	let verifyBody: unknown;
	let registerCalls = 0;
	await page.route("**/auth/register", async (route) => {
		registerCalls += 1;
		authorizations.push(route.request().headers().authorization);
		await route.fulfill({
			json: {
				email: "reader@example.com",
				expiresAt: new Date(Date.now() + 600_000).toISOString(),
				resendAfterSeconds: 0,
			},
		});
	});
	await page.route("**/auth/register/verify", async (route) => {
		authorizations.push(route.request().headers().authorization);
		verifyBody = route.request().postDataJSON();
		if ((verifyBody as { code: string }).code !== "123456") {
			await route.fulfill({
				status: 400,
				json: { message: "Incorrect code. 4 attempts left." },
			});
			return;
		}
		await route.fulfill({ json: member });
	});
	await page.goto("/en/profile/register/");
	await expect(page.getByLabel("Username")).toHaveValue("QuietOwl42");
	await expect(page.getByLabel("Password")).toHaveAttribute(
		"autocomplete",
		"new-password",
	);
	await page.getByLabel("Email").fill("reader@example.com");
	await page.getByLabel("Password").fill("a-long-password");
	await page.getByRole("button", { name: "Create account" }).click();

	const code = page.getByLabel("Verification code");
	await expect(code).toHaveAttribute("autocomplete", "one-time-code");
	await expect(page.getByText("reader@example.com")).toBeVisible();
	expect(await storedSession(page)).toEqual(guest);

	await code.fill("000000");
	await page.getByRole("button", { name: "Verify email" }).click();
	await expect(page.locator(".account-error")).toHaveText(
		"Incorrect code. 4 attempts left.",
	);

	await page.getByRole("button", { name: "Resend code" }).click();
	await expect(page.locator("output.account-hint")).toHaveText(
		"A new code is on its way.",
	);
	expect(registerCalls).toBe(2);

	await code.fill("123456");
	await page.getByRole("button", { name: "Verify email" }).click();
	await expect(page).toHaveURL(/\/en\/profile\/$/);
	expect(verifyBody).toEqual({ email: "reader@example.com", code: "123456" });
	expect(authorizations).toEqual(Array(4).fill("Bearer guest-token"));
	expect(await storedSession(page)).toEqual(member);
});

test("changing the email returns to a prefilled registration form", async ({
	page,
}) => {
	await installFakeExtension(page, guest);
	await page.route("**/auth/register", (route) =>
		route.fulfill({
			json: {
				email: "reader@example.com",
				expiresAt: new Date(Date.now() + 600_000).toISOString(),
				resendAfterSeconds: 60,
			},
		}),
	);
	await page.goto("/ar/profile/register/");
	await page.getByLabel("البريد الإلكتروني").fill("reader@example.com");
	await page.getByLabel("كلمة المرور").fill("a-long-password");
	await page.getByRole("button", { name: "إنشاء حساب" }).click();
	await expect(
		page.getByRole("button", { name: /إعادة الإرسال بعد \d+ ث/ }),
	).toBeDisabled();
	const result = await new AxeBuilder({ page })
		.withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
		.analyze();
	expect(result.violations).toEqual([]);
	await page.getByRole("button", { name: "استخدام بريد إلكتروني آخر" }).click();
	await expect(page.getByLabel("البريد الإلكتروني")).toHaveValue(
		"reader@example.com",
	);
	await expect(page.getByLabel("اسم المستخدم")).toHaveValue("QuietOwl42");
});

test("password changes are confirmed with a code sent to the account email", async ({
	page,
}) => {
	await installFakeExtension(page, member);
	let requestBody: unknown;
	let verifyBody: unknown;
	const authorizations: (string | undefined)[] = [];
	await page.route("**/auth/change-password", async (route) => {
		requestBody = route.request().postDataJSON();
		authorizations.push(route.request().headers().authorization);
		await route.fulfill({
			json: {
				email: "reader@example.com",
				expiresAt: new Date(Date.now() + 600_000).toISOString(),
				resendAfterSeconds: 60,
			},
		});
	});
	await page.route("**/auth/change-password/verify", async (route) => {
		verifyBody = route.request().postDataJSON();
		authorizations.push(route.request().headers().authorization);
		await route.fulfill({ json: { success: true } });
	});
	await page.goto("/en/profile/password/");
	await page.getByLabel("Current password").fill("old-password");
	await page.getByLabel("New password", { exact: true }).fill("new-password");
	await page.getByLabel("Confirm new password").fill("new-password");
	await page.getByRole("button", { name: "Send code" }).click();

	await expect(page.getByText("reader@example.com")).toBeVisible();
	expect(requestBody).toEqual({
		currentPassword: "old-password",
		newPassword: "new-password",
	});
	await page.getByLabel("Verification code").fill("123456");
	await page.getByRole("button", { name: "Confirm" }).click();
	await expect(page.locator(".account-notice")).toHaveText(
		"Your password was changed.",
	);
	expect(verifyBody).toEqual({ code: "123456" });
	expect(authorizations).toEqual(Array(2).fill("Bearer member-token"));
	await expect(page.getByLabel("Current password")).toHaveValue("");
});

test("profile editing leaves the email to a separate verified change", async ({
	page,
}) => {
	await installFakeExtension(page, member);
	let requestBody: unknown;
	await page.route("**/auth/change-email", async (route) => {
		requestBody = route.request().postDataJSON();
		await route.fulfill({
			json: {
				email: "new@example.com",
				expiresAt: new Date(Date.now() + 600_000).toISOString(),
				resendAfterSeconds: 60,
			},
		});
	});
	await page.route("**/auth/change-email/verify", async (route) => {
		const { code } = route.request().postDataJSON();
		await route.fulfill(
			code === "123456"
				? { json: { ...member.user, email: "new@example.com" } }
				: {
						status: 400,
						json: { message: "Incorrect code. 4 attempts left." },
					},
		);
	});
	await page.goto("/en/profile/");
	await page.getByRole("button", { name: "Edit profile" }).click();
	await expect(page.getByLabel("Username")).toBeVisible();
	await expect(page.getByLabel("Email")).toHaveCount(0);
	await page.getByRole("button", { name: "Cancel" }).click();

	await page.getByRole("link", { name: "Change email" }).click();
	await expect(page).toHaveURL(/\/en\/profile\/email\/$/);
	await page.getByLabel("New email").fill("new@example.com");
	await page.getByRole("button", { name: "Send code" }).click();
	expect(requestBody).toEqual({ email: "new@example.com" });

	const code = page.getByLabel("Verification code");
	await code.fill("000000");
	await page.getByRole("button", { name: "Confirm" }).click();
	await expect(page.locator(".account-error")).toHaveText(
		"Incorrect code. 4 attempts left.",
	);
	expect(await storedSession(page)).toEqual(member);

	await code.fill("123456");
	await page.getByRole("button", { name: "Confirm" }).click();
	await expect(page.locator(".account-notice")).toHaveText(
		"Your email was changed.",
	);
	expect(await storedSession(page)).toEqual({
		...member,
		user: { ...member.user, email: "new@example.com" },
	});
});

test("signing out clears the extension session", async ({ page }) => {
	await installFakeExtension(page, member);
	await page.goto("/en/profile/");
	await page.getByRole("button", { name: "Sign out" }).click();
	await expect(page.locator(".account-notice")).toContainText(
		"You’re signed out.",
	);
	expect(await storedSession(page)).toBeNull();
});

test("Google sign-in is offered only when the API enables it", async ({
	page,
}) => {
	await installFakeExtension(page, null);
	await page.route("**/auth/providers", (route) =>
		route.fulfill({ json: { google: false } }),
	);
	await page.goto("/en/profile/login/");
	await expect(page.getByLabel("Email")).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Continue with Google" }),
	).toHaveCount(0);

	await page.unroute("**/auth/providers");
	await page.route("**/auth/providers", (route) =>
		route.fulfill({ json: { google: true } }),
	);
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

test("OAuth callback hands the account to the extension and merges the guest", async ({
	page,
}) => {
	await installFakeExtension(page, guest);
	let body: { guestToken?: string } = {};
	await page.route("**/auth/oauth/session", async (route) => {
		body = route.request().postDataJSON();
		await route.fulfill({ json: member });
	});
	await page.goto("/en/profile/oauth/");
	await expect(page).toHaveURL(/\/en\/profile\/$/);
	expect(body.guestToken).toBe("guest-token");
	expect(await storedSession(page)).toEqual(member);
});

test("OAuth callback reports a cancelled sign-in", async ({ page }) => {
	await installFakeExtension(page, guest);
	let called = false;
	await page.route("**/auth/oauth/session", async (route) => {
		called = true;
		await route.fulfill({ json: member });
	});
	await page.goto("/en/profile/oauth/?error=access_denied");
	await expect(page.locator(".account-error")).toHaveText(
		"Sign-in with Google didn’t complete. Please try again.",
	);
	expect(called).toBe(false);
	expect(await storedSession(page)).toEqual(guest);
});
