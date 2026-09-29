import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const locale of ["en", "ar"] as const) {
	test(`${locale}: reading gallery opens with keyboard and returns focus`, async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto(`/${locale}/`);
		const thumbnails = page.locator(".reading-gallery-image");
		await expect(thumbnails).toHaveCount(5);
		for (let index = 0; index < 5; index++) {
			const thumbnail = thumbnails.nth(index);
			await thumbnail.scrollIntoViewIfNeeded();
			await thumbnail.focus();
			await page.keyboard.press("Enter");
			const lightbox = page.locator(".reading-lightbox");
			await expect(lightbox).toBeVisible();
			const image = lightbox.locator("img");
			await expect(image).toHaveAttribute(
				"src",
				(await thumbnail.getAttribute("href")) ?? "",
			);
			await expect
				.poll(() =>
					image.evaluate(
						(element: HTMLImageElement) =>
							element.complete && element.naturalWidth === 1280,
					),
				)
				.toBeTruthy();
			if (index === 0) {
				const result = await new AxeBuilder({ page })
					.withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
					.analyze();
				expect(result.violations).toEqual([]);
			}
			if (index === 4) await lightbox.getByRole("button").click();
			else await page.keyboard.press("Escape");
			await expect(lightbox).not.toBeVisible();
			await expect(thumbnail).toBeFocused();
		}
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth,
			),
		).toBeTruthy();
	});

	test(`${locale}: walkthrough plays on demand with localized captions`, async ({
		page,
	}, testInfo) => {
		test.skip(
			!["chromium", "mobile"].includes(testInfo.project.name),
			"Playback is verified with Chrome, the extension's target browser.",
		);
		const mediaRequests: string[] = [];
		page.on("request", (request) => {
			if (request.url().endsWith(".mp4")) mediaRequests.push(request.url());
		});
		await page.goto(`/${locale}/`);
		await page.locator("#walkthrough").scrollIntoViewIfNeeded();
		const video = page.locator("#walkthrough video");
		await expect(video).toHaveAttribute("preload", "none");
		expect(mediaRequests).toEqual([]);
		await expect
			.poll(() =>
				video.evaluate(
					(element: HTMLVideoElement) => element.textTracks[0]?.mode,
				),
			)
			.toBe("hidden");
		await video.evaluate((element: HTMLVideoElement) => element.play());
		await expect
			.poll(() =>
				video.evaluate((element: HTMLVideoElement) => element.currentTime),
			)
			.toBeGreaterThan(0);
		await expect
			.poll(() =>
				video.evaluate(
					(element: HTMLVideoElement) => element.textTracks[0]?.cues?.length,
				),
			)
			.toBe(6);
		const caption = page.locator(".walkthrough-caption");
		await expect(caption).toHaveCSS("backdrop-filter", "blur(12px)");
		await expect(caption).toHaveCSS("pointer-events", "none");
		const videoBox = await video.boundingBox();
		const captionBox = await caption.boundingBox();
		expect(videoBox).not.toBeNull();
		expect(captionBox).not.toBeNull();
		if (videoBox && captionBox) {
			expect(
				Math.abs(
					captionBox.x + captionBox.width / 2 - videoBox.x - videoBox.width / 2,
				),
			).toBeLessThan(2);
			expect(captionBox.y).toBeGreaterThan(videoBox.y);
			expect(captionBox.y + captionBox.height).toBeLessThan(
				videoBox.y + videoBox.height / 3,
			);
		}
		await video.evaluate((element: HTMLVideoElement) => element.pause());
		await video.evaluate(async (element: HTMLVideoElement) => {
			await new Promise<void>((resolve) => {
				element.addEventListener("seeked", () => resolve(), { once: true });
				element.currentTime = 0.2;
			});
		});
		await expect
			.poll(() => caption.textContent())
			.toBe(
				locale === "ar"
					? "اقرأ مع تلوين الشخصيات والأماكن والجماعات"
					: "Read with color-coded characters, places and factions",
			);
		await expect
			.poll(() =>
				caption.evaluate((element) =>
					Number(getComputedStyle(element).opacity),
				),
			)
			.toBeGreaterThan(0.1);
		expect(
			await caption.evaluate((element) =>
				Number(getComputedStyle(element).opacity),
			),
		).toBeLessThan(0.9);
		await video.evaluate(async (element: HTMLVideoElement) => {
			await new Promise<void>((resolve) => {
				element.addEventListener("seeked", () => resolve(), { once: true });
				element.currentTime = 3;
			});
		});
		await expect(caption).toHaveCSS("opacity", "1");
		await video.evaluate((element: HTMLVideoElement) => {
			const track = element.textTracks[0];
			if (track) track.mode = "showing";
		});
		await expect(caption).toBeHidden();
		await video.evaluate((element: HTMLVideoElement) => {
			const track = element.textTracks[0];
			if (track) track.mode = "hidden";
		});
		await expect(caption).toBeVisible();
		await video.evaluate(async (element: HTMLVideoElement) => {
			await new Promise<void>((resolve) => {
				element.addEventListener("seeked", () => resolve(), { once: true });
				element.currentTime = 7.15;
			});
		});
		await expect
			.poll(() =>
				caption.evaluate((element) =>
					Number(getComputedStyle(element).opacity),
				),
			)
			.toBeLessThan(0.9);
		await video.evaluate(async (element: HTMLVideoElement) => {
			await new Promise<void>((resolve) => {
				element.addEventListener("seeked", () => resolve(), { once: true });
				element.currentTime = element.duration - 0.28;
			});
		});
		await expect
			.poll(() =>
				caption.evaluate((element) =>
					Number(getComputedStyle(element).opacity),
				),
			)
			.toBeLessThan(0.9);
		await page.emulateMedia({ reducedMotion: "reduce" });
		await video.evaluate(async (element: HTMLVideoElement) => {
			await new Promise<void>((resolve) => {
				element.addEventListener("seeked", () => resolve(), { once: true });
				element.currentTime = 0.2;
			});
		});
		await expect(caption).toHaveCSS("opacity", "1");
		expect(
			await video.evaluate((element: HTMLVideoElement) => element.videoWidth),
		).toBe(1280);
		await expect(video.locator("track")).toHaveAttribute("srclang", locale);
		await video.evaluate((element: HTMLVideoElement) => element.pause());
		await page.locator(".walkthrough-transcript summary").click();
		await expect(page.locator(".walkthrough-transcript li")).toHaveCount(6);
	});
}
