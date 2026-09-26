import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
	testDir: "tests",
	fullyParallel: true,
	retries: process.env.CI ? 1 : 0,
	reporter: "list",
	use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
	webServer: {
		command: "bunx serve out -l 4173",
		url: "http://localhost:4173/en/",
		reuseExistingServer: !process.env.CI,
	},
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "firefox", use: { ...devices["Desktop Firefox"] } },
		{ name: "webkit", use: { ...devices["Desktop Safari"] } },
		{
			name: "mobile",
			use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
		},
	],
});
