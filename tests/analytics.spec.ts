import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Requires an export built with NEXT_PUBLIC_GA_MEASUREMENT_ID set, e.g.
// NEXT_PUBLIC_GA_MEASUREMENT_ID=G-TEST123 bun run build && bun run test.
const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
test.skip(!measurementId, "analytics is not built without a measurement ID");

test("gtag loads only after consent and can be withdrawn", async ({ page }) => {
	const requests: string[] = [];
	await page.route("https://*.googletagmanager.com/**", (route) => {
		requests.push(route.request().url());
		return route.fulfill({ contentType: "text/javascript", body: "" });
	});
	await page.goto("/en/");
	const banner = page.getByRole("region", { name: "Analytics consent" });
	await expect(banner).toBeVisible();
	expect(requests).toHaveLength(0);
	expect(
		(await new AxeBuilder({ page }).include(".consent-banner").analyze())
			.violations,
	).toEqual([]);

	await banner.getByRole("button", { name: "No thanks" }).click();
	await expect(banner).toBeHidden();
	await page.reload();
	await expect(banner).toBeHidden();
	expect(requests).toHaveLength(0);

	await page.getByRole("button", { name: "Analytics settings" }).click();
	await banner.getByRole("button", { name: "Allow analytics" }).click();
	await expect.poll(() => requests.length).toBe(1);
	expect(requests[0]).toContain(`id=${measurementId}`);
	await page.reload();
	await expect(banner).toBeHidden();
	await expect.poll(() => requests.length).toBe(2);
});

test("Arabic banner is localized", async ({ page }) => {
	await page.goto("/ar/");
	await expect(
		page.getByRole("region", { name: "الموافقة على التحليلات" }),
	).toBeVisible();
});
