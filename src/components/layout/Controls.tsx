"use client";
import { Languages, Menu, Monitor, Moon, Sun, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getMessages } from "@/i18n/messages";
import type { Locale } from "@/lib/site-config";

const themes = ["system", "light", "dark"] as const;
type Theme = (typeof themes)[number];
export function Controls({ locale }: { locale: Locale }) {
	const m = getMessages(locale);
	const [theme, setTheme] = useState<Theme>("system");
	const [open, setOpen] = useState(false);
	const dialog = useRef<HTMLDialogElement>(null);
	const [href, setHref] = useState(`/${locale === "en" ? "ar" : "en"}/`);
	useEffect(() => {
		const syncPath = () =>
			setHref(
				location.pathname.replace(
					/^\/(en|ar)/,
					locale === "en" ? "/ar" : "/en",
				) + location.hash,
			);
		syncPath();
		window.addEventListener("hashchange", syncPath);
		try {
			const saved = localStorage.getItem("storylens-theme");
			if (themes.some((t) => t === saved)) setTheme(saved as Theme);
		} catch {}
		return () => window.removeEventListener("hashchange", syncPath);
	}, [locale]);
	useEffect(() => {
		const query = matchMedia("(prefers-color-scheme: dark)");
		const apply = () => {
			document.documentElement.dataset.theme =
				theme === "system" ? (query.matches ? "dark" : "light") : theme;
		};
		apply();
		query.addEventListener("change", apply);
		return () => query.removeEventListener("change", apply);
	}, [theme]);
	function cycle() {
		const next =
			themes[(themes.indexOf(theme) + 1) % themes.length] ?? "system";
		setTheme(next);
		try {
			localStorage.setItem("storylens-theme", next);
		} catch {}
	}
	function close() {
		dialog.current?.close();
		setOpen(false);
	}
	const ThemeIcon =
		theme === "system" ? Monitor : theme === "dark" ? Moon : Sun;
	return (
		<div className="controls">
			<a
				className="locale-link"
				aria-label={
					locale === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"
				}
				href={href}
				lang={locale === "en" ? "ar" : "en"}
			>
				<Languages className="locale-icon" size={19} aria-hidden="true" />
				<span className="locale-name">
					{locale === "en" ? "العربية" : "English"}
				</span>
			</a>
			<button
				type="button"
				className="icon-button"
				onClick={cycle}
				aria-label={`${m.theme}: ${locale === "ar" ? ({ system: "النظام", light: "فاتح", dark: "داكن" })[theme] : theme}`}
				title={`${m.theme}: ${locale === "ar" ? ({ system: "النظام", light: "فاتح", dark: "داكن" })[theme] : theme}`}
			>
				<ThemeIcon size={19} aria-hidden="true" />
			</button>
			<button
				type="button"
				className="icon-button mobile-menu"
				aria-label={m.menu}
				aria-expanded={open}
				onClick={() => {
					dialog.current?.showModal();
					setOpen(true);
				}}
				title={m.menu}
			>
				<Menu size={22} aria-hidden="true" />
			</button>
			<dialog
				ref={dialog}
				className="mobile-dialog"
				onClose={() => setOpen(false)}
			>
				<div className="dialog-top">
					<span className="brand">Story Lens.</span>
					<button
						type="button"
						className="icon-button"
						onClick={close}
						aria-label={locale === "ar" ? "إغلاق" : "Close"}
						title={locale === "ar" ? "إغلاق" : "Close"}
					>
						<X aria-hidden="true" />
					</button>
				</div>
				<nav aria-label={m.menu}>
					{(
						[
							["features", m.features],
							["how", m.how],
							["companion", m.companion],
							["faq", m.faq],
						] as const
					).map(([id, label]) => (
						<a key={id} href={`/${locale}/#${id}`} onClick={close}>
							{label}
						</a>
					))}
					<a href={`/${locale}/pricing/`} onClick={close}>
						{m.pricing.nav}
					</a>
				</nav>
			</dialog>
		</div>
	);
}
