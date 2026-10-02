import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { pricing } from "./billing-fixtures";

async function mockPricing(page: Page, answer: () => unknown) {
	const state = { calls: 0 };
	await page.route("**/api/user/billing/pricing", async (route) => {
		state.calls += 1;
		const body = answer();
		if (body === "fail")
			return route.fulfill({ status: 503, json: { message: "Down" } });
		return route.fulfill({ json: body });
	});
	await page.route("**/api/user/auth/me", (route) =>
		route.fulfill({ status: 401, json: { message: "No" } }),
	);
	return state;
}

test("the pricing table lists each feature from the API in order", async ({
	page,
}) => {
	await mockPricing(page, () => pricing());
	await page.goto("/en/pricing/");
	const rows = page.locator(".pricing-table tbody tr");
	await expect(rows).toHaveCount(3);
	await expect(rows.nth(0)).toContainText("Summarize page");
	await expect(rows.nth(0)).toContainText("A short summary");
	await expect(rows.nth(0)).toContainText("$0.02");
	await expect(rows.nth(1)).toContainText("Character image");
	await expect(rows.nth(1)).toContainText("$0.03");
	await expect(rows.nth(2)).toContainText("Free");
	await expect(page.locator(".pricing-facts")).toContainText(
		"One lens costs $0.01.",
	);
	await expect(page.locator(".pricing-facts")).toContainText(
		"New accounts get 10 lenses free to try it.",
	);
	await expect(
		page.getByRole("link", { name: "Request lenses" }),
	).toHaveAttribute("href", "/en/profile/balance/#request");
});

test("disabled features are hidden and a trial of 0 is not mentioned", async ({
	page,
}) => {
	const base = pricing();
	await mockPricing(page, () => ({
		...base,
		trialLenses: 0,
		features: base.features.map((feature, index) =>
			index === 1 ? { ...feature, enabled: false } : feature,
		),
	}));
	await page.goto("/en/pricing/");
	await expect(page.locator(".pricing-table tbody tr")).toHaveCount(2);
	await expect(page.locator(".pricing-facts")).not.toContainText("free to try");
});

test("no prices are in the static page, and a failure offers a retry", async ({
	page,
}) => {
	let fail = true;
	const api = await mockPricing(page, () => (fail ? "fail" : pricing()));
	const html = await (await page.request.get("/en/pricing/")).text();
	expect(html).not.toContain("$0.01");
	await page.goto("/en/pricing/");
	await expect(page.locator(".pricing-card[role=alert]")).toContainText(
		"Prices are unavailable right now.",
	);
	fail = false;
	await page.getByRole("button", { name: "Try again" }).click();
	await expect(page.locator(".pricing-table tbody tr")).toHaveCount(3);
	expect(api.calls).toBe(2);
});

test("Arabic shows Arabic names and plurals", async ({ page }) => {
	await mockPricing(page, () => pricing());
	await page.goto("/ar/pricing/");
	await expect(page.locator(".pricing-table")).toContainText("صورة الشخصية");
	await expect(page.locator(".pricing-table")).toContainText("مجاني");
	await expect(page.locator(".pricing-facts")).toContainText("10 عدسات");
});

for (const locale of ["en", "ar"] as const)
	test(`${locale}: pricing is linked from the header, footer and sitemap`, async ({
		page,
		isMobile,
	}) => {
		await mockPricing(page, () => pricing());
		await page.goto(`/${locale}/`);
		const label = locale === "ar" ? "الأسعار" : "Pricing";
		if (!isMobile)
			await expect(
				page.locator(".desktop-nav").getByRole("link", { name: label }),
			).toHaveAttribute("href", `/${locale}/pricing/`);
		await expect(
			page.locator("footer").getByRole("link", { name: label }),
		).toHaveAttribute("href", `/${locale}/pricing/`);
		const sitemap = await (await page.request.get("/sitemap.xml")).text();
		expect(sitemap).toContain(`/${locale}/pricing/`);
	});

for (const locale of ["en", "ar"] as const)
	for (const theme of ["light", "dark"] as const)
		test(`${locale}: the pricing page is accessible in ${theme}`, async ({
			page,
		}) => {
			await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
			await mockPricing(page, () => pricing());
			await page.goto(`/${locale}/pricing/`);
			await page.evaluate((t) => {
				document.documentElement.dataset.theme = t;
			}, theme);
			await expect(page.locator(".pricing-table tbody tr")).toHaveCount(3);
			await page.locator("summary").first().click();
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

for (const locale of ["en", "ar"] as const)
	test(`${locale}: a failed price load keeps the FAQ in place`, async ({
		page,
	}) => {
		let finish: (() => void) | undefined;
		const held = new Promise<void>((resolve) => {
			finish = resolve;
		});
		await page.route("**/api/user/billing/pricing", async (route) => {
			await held;
			await route.fulfill({ status: 503, json: { message: "Down" } });
		});
		await page.route("**/api/user/auth/me", (route) =>
			route.fulfill({ status: 401, json: { message: "No" } }),
		);
		await page.goto(`/${locale}/pricing/`);
		await expect(page.locator(".pricing-skeleton")).toBeVisible();
		const before = await page.locator(".pricing-faq").boundingBox();
		finish?.();
		await expect(page.locator(".pricing-card[role=alert]")).toBeVisible();
		const after = await page.locator(".pricing-faq").boundingBox();
		expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(1);
	});
