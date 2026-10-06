import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { pricing } from "./billing-fixtures";

const reader = {
	id: "reader-id",
	email: "reader@example.com",
	username: "reader",
	name: "Reader",
	isGuest: false,
	role: { id: "role-reader", slug: "reader", name: "Reader" },
	permissions: [],
};

type RequestRow = {
	id: string;
	lenses: number;
	unitPriceUsd: string;
	totalUsd: string;
	status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
	contactChannel: "WHATSAPP" | "TELEGRAM";
	contactHandle: string;
	note: string | null;
	rejectionReason: string | null;
	createdAt: string;
	reviewedAt: string | null;
	cancelledAt: string | null;
};

function requestRow(overrides: Partial<RequestRow> = {}): RequestRow {
	return {
		id: crypto.randomUUID(),
		lenses: 500,
		unitPriceUsd: "0.010000",
		totalUsd: "5.00",
		status: "PENDING",
		contactChannel: "WHATSAPP",
		contactHandle: "+9647701234567",
		note: null,
		rejectionReason: null,
		createdAt: "2026-10-01T10:00:00.000Z",
		reviewedAt: null,
		cancelledAt: null,
		...overrides,
	};
}

/** The reader API for a signed-in website; `onCreate` scripts `POST /billing/requests`. */
async function mockBilling(
	page: Page,
	{
		signedIn = true,
		balance = 0,
		notices = [] as unknown[],
		requests = [] as RequestRow[],
		transactions = [] as unknown[],
		price = pricing(),
		onCreate,
	}: {
		signedIn?: boolean;
		balance?: number;
		notices?: unknown[];
		requests?: RequestRow[];
		transactions?: unknown[];
		price?: Record<string, unknown>;
		onCreate?: (body: Record<string, unknown>, attempt: number) => unknown;
	} = {},
) {
	const state = {
		price,
		requests: [...requests],
		created: [] as Record<string, unknown>[],
		seen: [] as unknown[],
	};
	await page.route("**/api/user/**", async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const path = url.pathname.replace("/api/user", "");
		const method = request.method();
		const body = method === "GET" ? null : request.postDataJSON();
		if (path === "/auth/me")
			return signedIn
				? route.fulfill({ json: reader })
				: route.fulfill({ status: 401, json: { message: "No" } });
		if (path === "/auth/providers")
			return route.fulfill({ json: { google: false } });
		if (path === "/billing/pricing")
			return route.fulfill({ json: state.price });
		if (path === "/billing/balance")
			return route.fulfill({ json: { balance, notices } });
		if (path === "/billing/notices/seen") {
			state.seen.push(body);
			return route.fulfill({ json: { updated: body.ids.length } });
		}
		if (path === "/billing/transactions")
			return route.fulfill({
				json: {
					data: transactions,
					page: 1,
					pageSize: 10,
					total: transactions.length,
				},
			});
		if (path === "/billing/requests" && method === "GET")
			return route.fulfill({
				json: {
					data: state.requests,
					page: 1,
					pageSize: 5,
					total: state.requests.length,
					lastContact: state.requests[0]
						? {
								channel: state.requests[0].contactChannel,
								handle: state.requests[0].contactHandle,
							}
						: null,
				},
			});
		if (path === "/billing/requests" && method === "POST") {
			state.created.push(body);
			const answer = onCreate?.(body, state.created.length);
			if (answer === "abort") return route.abort();
			if (answer)
				return route.fulfill(answer as Parameters<typeof route.fulfill>[0]);
			const row = requestRow({
				id: body.id,
				lenses: body.lenses,
				totalUsd: (body.lenses / 100).toFixed(2),
				contactChannel: body.contactChannel,
				contactHandle: body.contactHandle,
			});
			state.requests.unshift(row);
			return route.fulfill({ json: { request: row } });
		}
		const cancel = /^\/billing\/requests\/([^/]+)\/cancel$/.exec(path);
		if (cancel) {
			const row = state.requests.find((item) => item.id === cancel[1]);
			if (row) row.status = "CANCELLED";
			return route.fulfill({ json: { request: row } });
		}
		return route.fulfill({ status: 404, json: { message: "Not mocked" } });
	});
	return state;
}

const amount = (page: Page) => page.getByLabel("Lenses", { exact: true });
const contact = (page: Page) => page.getByLabel("WhatsApp number");
const submit = (page: Page) =>
	page.getByRole("button", { name: "Send request" });

test("signed out, the balance page sends the reader to sign in", async ({
	page,
}) => {
	await mockBilling(page, { signedIn: false });
	await page.goto("/en/profile/balance/");
	await expect(page).toHaveURL(
		/\/en\/profile\/login\/\?next=%2Fen%2Fprofile%2Fbalance%2F$/,
	);
});

test("an empty balance shows the card, the form and empty lists", async ({
	page,
}) => {
	await mockBilling(page);
	await page.goto("/en/profile/balance/");
	await expect(page.locator(".balance-amount")).toHaveText("0 lenses");
	await expect(page.getByText("≈ $0.00 at the current price")).toBeVisible();
	await expect(amount(page)).toHaveValue("500");
	await expect(page.getByText("No requests yet.")).toBeVisible();
	await expect(page.getByText("No lens changes yet.")).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Balance", exact: true }),
	).toHaveAttribute("aria-current", "page");
});

test("the total is computed in the browser with half-up cents", async ({
	page,
}) => {
	await mockBilling(page, {
		price: pricing({ lensPriceUsd: "0.015000", lensPriceMicros: 15000 }),
	});
	await page.goto("/en/profile/balance/");
	await amount(page).fill("333");
	await expect(page.locator(".request-total")).toContainText(
		"333 lenses = $5.00",
	);
	await expect(page.locator(".request-total")).toContainText(
		"($0.015 per lens)",
	);
	await amount(page).fill("500");
	await expect(page.locator(".request-total")).toContainText("$7.50");
});

test("Arabic formats the total with Latin digits and Arabic plurals", async ({
	page,
}) => {
	await mockBilling(page);
	await page.goto("/ar/profile/balance/");
	await page.getByLabel("العدسات", { exact: true }).fill("103");
	await expect(page.locator(".request-total")).toContainText("103 عدسات");
	await page.getByLabel("العدسات", { exact: true }).fill("500");
	await expect(page.locator(".request-total")).toContainText("500 عدسة");
	await expect(page.locator(".request-total")).toContainText("5.00");
});

test("an amount outside the limits is refused before sending", async ({
	page,
}) => {
	const api = await mockBilling(page);
	await page.goto("/en/profile/balance/");
	await amount(page).fill("50");
	await expect(page.locator(".request-total")).toHaveText(
		"Choose between 100 and 50,000 lenses.",
	);
	await contact(page).fill("+9647701234567");
	await submit(page).click();
	await expect(page.locator(".request-form .account-error")).toHaveText(
		"Choose between 100 and 50,000 lenses.",
	);
	expect(api.created).toEqual([]);
});

test("contacts are checked like the API and prefilled from the last request", async ({
	page,
}) => {
	const api = await mockBilling(page);
	await page.goto("/en/profile/balance/");
	await submit(page).click();
	await expect(page.locator("[role=alert]").first()).toHaveText(
		"Enter the WhatsApp number with its country code, for example +9647701234567.",
	);
	await contact(page).fill("07701234567");
	await submit(page).click();
	await expect(contact(page)).toHaveAttribute("aria-invalid", "true");
	await page.getByRole("radio", { name: "Telegram" }).check();
	await page.getByLabel("Telegram username or number").fill("@ab");
	await submit(page).click();
	await expect(page.locator("[role=alert]").first()).toContainText(
		"Enter a Telegram username",
	);
	expect(api.created).toEqual([]);

	await page.unrouteAll({ behavior: "ignoreErrors" });
	await mockBilling(page, {
		requests: [
			requestRow({
				contactChannel: "TELEGRAM",
				contactHandle: "@story_reader",
			}),
		],
	});
	await page.reload();
	await expect(page.getByLabel("Telegram username or number")).toHaveValue(
		"@story_reader",
	);
});

test("sending a request confirms the channel and lists it as pending", async ({
	page,
}) => {
	const api = await mockBilling(page);
	await page.goto("/en/profile/balance/");
	await page.getByRole("button", { name: "1,000 lenses" }).click();
	await contact(page).fill("+964 770 123 4567");
	await page.getByLabel("Note (optional)").fill("Call after 6 pm");
	await submit(page).click();
	await expect(
		page.getByRole("heading", { name: "Request sent" }),
	).toBeFocused();
	await expect(page.locator(".request-sent")).toContainText(
		"We’ll contact you on WhatsApp at +9647701234567 to arrange payment.",
	);
	await expect(page.locator(".request-list")).toContainText("Pending");
	expect(api.created).toEqual([
		{
			id: expect.any(String),
			lenses: 1000,
			quotedLensPriceUsd: "0.010000",
			contactChannel: "WHATSAPP",
			contactHandle: "+9647701234567",
			note: "Call after 6 pm",
		},
	]);
});

test("a changed price is shown and the next send uses it", async ({ page }) => {
	const api = await mockBilling(page, {
		onCreate: (_body, attempt) =>
			attempt === 1
				? {
						status: 409,
						json: {
							message: "The price changed",
							code: "PRICE_CHANGED",
							lensPriceUsd: "0.020000",
							lensPriceMicros: 20000,
						},
					}
				: undefined,
	});
	await page.goto("/en/profile/balance/");
	await contact(page).fill("+9647701234567");
	// The API now quotes the new price.
	api.price = pricing({ lensPriceUsd: "0.020000", lensPriceMicros: 20000 });
	await submit(page).click();
	await expect(page.locator(".request-form .account-error")).toHaveText(
		"The price changed to $0.02 per lens. Check the new total, then send again.",
	);
	await expect(amount(page)).toHaveValue("500");
	await expect(page.locator(".request-total")).toContainText("$10.00");
	await submit(page).click();
	await expect(
		page.getByRole("heading", { name: "Request sent" }),
	).toBeVisible();
	expect(api.created.map((body) => body.quotedLensPriceUsd)).toEqual([
		"0.010000",
		"0.020000",
	]);
	expect(api.created[0]?.id).not.toBe(api.created[1]?.id);
});

test("a retry after a network error sends the same request ID", async ({
	page,
}) => {
	const api = await mockBilling(page, {
		onCreate: (_body, attempt) => (attempt === 1 ? "abort" : undefined),
	});
	await page.goto("/en/profile/balance/");
	await contact(page).fill("+9647701234567");
	await submit(page).click();
	await expect(page.locator(".request-form .account-error")).toBeVisible();
	await submit(page).click();
	await expect(
		page.getByRole("heading", { name: "Request sent" }),
	).toBeVisible();
	expect(api.created).toHaveLength(2);
	expect(api.created[0]?.id).toBe(api.created[1]?.id);
});

test("pending requests can be cancelled after confirming; rejections show their reason", async ({
	page,
}) => {
	const pending = requestRow();
	await mockBilling(page, {
		requests: [
			pending,
			requestRow({
				status: "REJECTED",
				rejectionReason: "Payment not received",
			}),
		],
	});
	await page.goto("/en/profile/balance/");
	await expect(page.getByText("Reason: Payment not received")).toBeVisible();
	await page.getByRole("button", { name: "Cancel request" }).click();
	await expect(
		page.getByText("Cancel your request for 500 lenses?"),
	).toBeVisible();
	await page.getByRole("button", { name: "Cancel request" }).click();
	await expect(page.locator(".request-list .status-chip").first()).toHaveText(
		"Cancelled",
	);
});

test("arriving from the extension explains what is missing and covers it", async ({
	page,
}) => {
	await mockBilling(page, { balance: 1 });
	await page.goto(
		"/en/profile/balance/?need=3&feature=character_image&from=extension#request",
	);
	await expect(page.locator(".balance-need")).toHaveText(
		"Character image needs 3 lenses. You have 1 lens.",
	);
	await expect(amount(page)).toBeFocused();
	await expect(amount(page)).toHaveValue("100");
});

test("gifts are celebrated together, purchases with a notice, then marked seen", async ({
	page,
}) => {
	const api = await mockBilling(page, {
		balance: 560,
		notices: [
			{
				id: crypto.randomUUID(),
				type: "TRIAL_GIFT",
				lenses: 10,
				note: null,
				createdAt: "2026-10-01T10:00:00.000Z",
			},
			{
				id: crypto.randomUUID(),
				type: "ADMIN_GIFT",
				lenses: 50,
				note: "Thanks for the feedback!",
				createdAt: "2026-10-01T11:00:00.000Z",
			},
			{
				id: crypto.randomUUID(),
				type: "TOP_UP",
				lenses: 500,
				note: null,
				createdAt: "2026-10-01T12:00:00.000Z",
			},
		],
	});
	await page.goto("/en/profile/");
	const dialog = page.getByRole("dialog", { name: "Congratulations!" });
	await expect(dialog).toBeVisible();
	await expect(dialog).toContainText("Story Lens sent you 60 lenses.");
	await expect(dialog).toContainText("Thanks for the feedback!");
	await expect(page.locator(".gift-sparks > .gift-spark")).toHaveCount(28);
	await expect(page.locator(".account-notice")).toHaveText(
		"Your 500 lenses have arrived.",
	);
	await expect.poll(() => api.seen.length).toBe(1);
	expect(api.seen[0]).toEqual({
		ids: expect.arrayContaining([expect.any(String)]),
		surface: "website",
	});
	expect((api.seen[0] as { ids: string[] }).ids).toHaveLength(3);
	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();
});

test("with reduced motion the dialog appears without confetti", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await mockBilling(page, {
		notices: [
			{
				id: crypto.randomUUID(),
				type: "TRIAL_GIFT",
				lenses: 10,
				note: null,
				createdAt: "2026-10-01T10:00:00.000Z",
			},
		],
	});
	await page.goto("/en/profile/");
	await expect(
		page.getByRole("dialog", { name: "Congratulations!" }),
	).toContainText("You received 10 lenses to try Story Lens Cloud.");
	await page.waitForTimeout(300);
	await expect(page.locator(".gift-spark")).toHaveCount(0);
});

test("without notices (a trial of 0) nothing celebrates", async ({ page }) => {
	const api = await mockBilling(page);
	await page.goto("/en/profile/");
	await expect(page.locator(".account-details")).toContainText("Balance");
	await page.waitForTimeout(300);
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(page.locator(".gift-spark")).toHaveCount(0);
	expect(api.seen).toEqual([]);
});

for (const locale of ["en", "ar"] as const)
	for (const theme of ["light", "dark"] as const)
		test(`${locale}: the balance page is accessible in ${theme}`, async ({
			page,
		}) => {
			await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
			await mockBilling(page, {
				balance: 42,
				requests: [
					requestRow(),
					requestRow({ status: "REJECTED", rejectionReason: "No payment" }),
				],
				transactions: [
					{
						id: "t1",
						type: "TRIAL_GIFT",
						delta: 10,
						balanceAfter: 10,
						feature: null,
						note: null,
						createdAt: "2026-10-01T10:00:00.000Z",
					},
					{
						id: "t2",
						type: "AI_CHARGE",
						delta: -3,
						balanceAfter: 7,
						feature: "character_image",
						note: null,
						createdAt: "2026-10-01T11:00:00.000Z",
					},
				],
			});
			await page.goto(`/${locale}/profile/balance/`);
			await page.evaluate((t) => {
				document.documentElement.dataset.theme = t;
			}, theme);
			await expect(page.locator(".history-list li")).toHaveCount(2);
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
