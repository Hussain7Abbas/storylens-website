// Google Analytics 4 with opt-in consent. gtag.js is only requested after the
// visitor accepts, so declining (or an unset measurement ID) loads nothing.
// The layout defines the standard gtag() queue stub inline (gtagStub) because
// gtag.js only processes the Arguments object that the stub pushes.
const configuredId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
export const measurementId = /^G-[A-Z0-9]+$/.test(configuredId)
	? configuredId
	: "";
export const analyticsEnabled = measurementId !== "";
export const analyticsOrigins = {
	script: ["https://*.googletagmanager.com"],
	connect: [
		"https://*.google-analytics.com",
		"https://*.analytics.google.com",
		"https://*.googletagmanager.com",
	],
	img: ["https://*.google-analytics.com", "https://*.googletagmanager.com"],
} as const;
export const gtagStub =
	"window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)}";
export const analyticsSettingsEvent = "storylens:analytics-settings";

export type AnalyticsConsent = "granted" | "denied";
type EventParams = Record<string, string | number | boolean>;
type Gtag = (...args: unknown[]) => void;
type CookieStoreLike = {
	getAll: () => Promise<{ name: string }[]>;
	delete: (options: {
		name: string;
		path: string;
		domain?: string;
	}) => Promise<void>;
};
declare global {
	interface Window {
		dataLayer?: unknown[];
		gtag?: Gtag;
	}
}

const consentKey = "storylens-analytics-consent";
let loaded = false;

export function readConsent(): AnalyticsConsent | null {
	try {
		const value = localStorage.getItem(consentKey);
		return value === "granted" || value === "denied" ? value : null;
	} catch {
		return null;
	}
}

export function saveConsent(consent: AnalyticsConsent): void {
	try {
		localStorage.setItem(consentKey, consent);
	} catch {}
	if (consent === "granted") startAnalytics();
	else stopAnalytics();
}

// Strips query strings and fragments, which can carry OAuth or reset tokens.
function pageLocation(): string {
	return `${location.origin}${location.pathname}`;
}

export function startAnalytics(): void {
	const gtag = window.gtag;
	if (!analyticsEnabled || loaded || !gtag) return;
	loaded = true;
	Reflect.deleteProperty(window, `ga-disable-${measurementId}`);
	gtag("consent", "default", {
		ad_storage: "denied",
		ad_user_data: "denied",
		ad_personalization: "denied",
		analytics_storage: "granted",
	});
	gtag("js", new Date());
	gtag("config", measurementId, {
		page_location: pageLocation(),
		allow_google_signals: false,
		allow_ad_personalization_signals: false,
	});
	const script = document.createElement("script");
	script.async = true;
	script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
	document.head.append(script);
}

function stopAnalytics(): void {
	if (!analyticsEnabled) return;
	window.gtag?.("consent", "update", { analytics_storage: "denied" });
	Reflect.set(window, `ga-disable-${measurementId}`, true);
	// Where the Cookie Store API exists, remove the first-party _ga cookies;
	// elsewhere they stay inert because gtag.js no longer loads.
	const store = Reflect.get(window, "cookieStore") as
		| CookieStoreLike
		| undefined;
	if (!store) return;
	void store
		.getAll()
		.then((cookies) =>
			Promise.all(
				cookies
					.filter((cookie) => cookie.name.startsWith("_ga"))
					.flatMap((cookie) =>
						cookieDomains().map((domain) =>
							store.delete({ name: cookie.name, path: "/", domain }),
						),
					),
			),
		)
		.catch(() => undefined);
}

// GA sets cookies on the registrable domain; try it and the current host.
function cookieDomains(): (string | undefined)[] {
	const host = location.hostname;
	return [undefined, host, host.split(".").slice(-2).join(".")];
}

export function trackEvent(name: string, params: EventParams = {}): void {
	if (!loaded || readConsent() !== "granted") return;
	window.gtag?.("event", name, { page_location: pageLocation(), ...params });
}

export function openAnalyticsSettings(): void {
	window.dispatchEvent(new Event(analyticsSettingsEvent));
}
