"use client";
import { useEffect, useState } from "react";
import { getMessages } from "@/i18n/messages";
import {
	analyticsSettingsEvent,
	openAnalyticsSettings,
	readConsent,
	saveConsent,
	startAnalytics,
	trackEvent,
} from "@/lib/analytics";
import type { Locale } from "@/lib/site-config";

// Rendered only when a measurement ID is configured at build time.
export function AnalyticsConsent({ locale }: { locale: Locale }) {
	const m = getMessages(locale).analytics;
	const [open, setOpen] = useState(false);
	useEffect(() => {
		const consent = readConsent();
		if (consent === "granted") startAnalytics();
		setOpen(consent === null);
		const reopen = () => setOpen(true);
		window.addEventListener(analyticsSettingsEvent, reopen);
		// Chrome Web Store links carry data-analytics-cta with their placement.
		const trackCta = (event: MouseEvent) => {
			const link =
				event.target instanceof Element
					? event.target.closest<HTMLAnchorElement>("a[data-analytics-cta]")
					: null;
			if (link)
				trackEvent("install_extension_click", {
					cta_location: link.dataset.analyticsCta ?? "unknown",
				});
		};
		document.addEventListener("click", trackCta);
		return () => {
			window.removeEventListener(analyticsSettingsEvent, reopen);
			document.removeEventListener("click", trackCta);
		};
	}, []);
	if (!open) return null;
	function choose(consent: "granted" | "denied") {
		saveConsent(consent);
		setOpen(false);
	}
	return (
		<section className="consent-banner" aria-label={m.label}>
			<div>
				<h2>{m.title}</h2>
				<p>
					{m.body} <a href={`/${locale}/privacy/`}>{m.learnMore}</a>
				</p>
			</div>
			<div className="consent-actions">
				<button
					type="button"
					className="button compact secondary"
					onClick={() => choose("denied")}
				>
					{m.decline}
				</button>
				<button
					type="button"
					className="button compact"
					onClick={() => choose("granted")}
				>
					{m.accept}
				</button>
			</div>
		</section>
	);
}

export function AnalyticsSettingsButton({ locale }: { locale: Locale }) {
	return (
		<button
			type="button"
			className="footer-link-button"
			onClick={openAnalyticsSettings}
		>
			{getMessages(locale).analytics.settings}
		</button>
	);
}
