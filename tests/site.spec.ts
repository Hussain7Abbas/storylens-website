import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const locale of ["en", "ar"] as const) {
	test(`${locale}: reading controls, language, theme, navigation`, async ({
		page,
	}) => {
		await page.goto(`/${locale}/`);
		await expect(page.locator("html")).toHaveAttribute(
			"dir",
			locale === "ar" ? "rtl" : "ltr",
		);
		await expect(page.locator("h1")).toHaveCount(1);
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth,
			),
		).toBeTruthy();
		await page.locator("#demo").scrollIntoViewIfNeeded();
		const replace = page.getByRole("button", {
			name: locale === "ar" ? "تطبيق الاستبدالات" : "Apply replacements",
		});
		await replace.click();
		await expect(replace).toHaveAttribute("aria-pressed", "true");
		await expect(page.locator(".demo-passage .story-text")).not.toContainText(
			locale === "ar" ? "القائد فايل" : "Captain Vale",
		);
		const highlight = page.getByRole("button", {
			name: locale === "ar" ? "تلوين الشخصيات" : "Highlight characters",
		});
		await highlight.click();
		await expect(page.locator(".demo-passage mark.plain")).toHaveCount(3);
		await page
			.getByRole("button", {
				name: locale === "ar" ? "إظهار ملاحظة الشخصية" : "Show character note",
			})
			.click();
		await expect(page.locator(".character-note")).toBeVisible();
		await page.locator("#faq summary").first().click();
		await expect(page.locator("#faq details").first()).toHaveAttribute(
			"open",
			"",
		);
		const theme = page.getByRole("button", {
			name: locale === "ar" ? /مظهر الألوان/ : /Color theme/,
		});
		await theme.click();
		const selected = await page.locator("html").getAttribute("data-theme");
		await page.reload();
		await expect(page.locator("html")).toHaveAttribute(
			"data-theme",
			selected ?? "light",
		);
		await page.goto(`/${locale}/privacy/#retention-and-deletion`);
		await page.locator(".locale-link").click();
		await expect(page).toHaveURL(
			new RegExp(`/${locale === "en" ? "ar" : "en"}/privacy/`),
		);
	});
	test(`${locale}: mobile menu keyboard`, async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto(`/${locale}/`);
		await page
			.getByRole("button", {
				name: locale === "ar" ? "القائمة" : "Menu",
				exact: true,
			})
			.click();
		await expect(page.locator(".mobile-dialog")).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page.locator(".mobile-dialog")).not.toBeVisible();
	});
	for (const theme of ["light", "dark"] as const)
		for (const route of ["", "privacy/", "terms/"]) {
			test(`${locale}/${route}: accessibility ${theme}`, async ({ page }) => {
				await page.emulateMedia({
					reducedMotion: "reduce",
					colorScheme: theme,
				});
				await page.goto(`/${locale}/${route}`);
				await page.evaluate((t) => {
					document.documentElement.dataset.theme = t;
				}, theme);
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
	test(`${locale}: reduced motion loads no scene`, async ({ page }) => {
		const requested: string[] = [];
		page.on("request", (req) => requested.push(req.url()));
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto(`/${locale}/`);
		await page.waitForTimeout(2200);
		expect(await page.locator("canvas").count()).toBe(0);
		await expect(page.locator("#install h2")).toBeVisible();
	});
}
test("static pages remain usable without JavaScript", async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto("http://localhost:4173/en/");
	await expect(page.locator("#features h2")).toBeVisible();
	await expect(page.locator("#install a.button")).toHaveAttribute(
		"href",
		/chromewebstore/,
	);
	await context.close();
});
