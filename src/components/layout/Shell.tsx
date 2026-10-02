import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { getMessages } from "@/i18n/messages";
import { analyticsEnabled } from "@/lib/analytics";
import { type Locale, siteConfig } from "@/lib/site-config";
import { AnalyticsSettingsButton } from "./AnalyticsConsent";
import { Controls } from "./Controls";
import { HeaderAccount } from "./HeaderAccount";
export function Header({ locale }: { locale: Locale }) {
	const m = getMessages(locale);
	return (
		<header className="header">
			<div className="container header-inner">
				<a className="brand" href={`/${locale}/`}>
					<Image src="/logo.webp" width={36} height={36} alt="" />
					<span>
						Story Lens<span className="brand-dot">.</span>
					</span>
				</a>
				<nav
					className="desktop-nav"
					aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main navigation"}
				>
					<a href={`/${locale}/#features`}>{m.features}</a>
					<a href={`/${locale}/#how`}>{m.how}</a>
					<a href={`/${locale}/#companion`}>{m.companion}</a>
					<a href={`/${locale}/pricing/`}>{m.pricing.nav}</a>
				</nav>
				<Controls locale={locale} />
				<HeaderAccount locale={locale} />
				<a
					className="button compact header-install"
					href={siteConfig.chrome}
					data-analytics-cta="header"
					rel="noopener"
				>
					{m.install}
					<ArrowUpRight size={18} aria-hidden="true" />
				</a>
			</div>
		</header>
	);
}
export function Footer({ locale }: { locale: Locale }) {
	const m = getMessages(locale);
	return (
		<footer className="footer">
			<div className="container footer-grid">
				<div>
					<a className="brand" href={`/${locale}/`}>
						Story Lens<span className="brand-dot">.</span>
					</a>
					<p>{m.footerTag}</p>
				</div>
				<nav aria-label={locale === "ar" ? "روابط الموقع" : "Site links"}>
					<a href={`/${locale}/profile/`}>{m.account.nav}</a>
					<a href={`/${locale}/pricing/`}>{m.pricing.nav}</a>
					<a href={`/${locale}/privacy/`}>{m.privacy}</a>
					<a href={`/${locale}/terms/`}>{m.terms}</a>
					{analyticsEnabled ? (
						<AnalyticsSettingsButton locale={locale} />
					) : null}
					<a href={siteConfig.extension}>
						GitHub · {locale === "ar" ? "الإضافة" : "Extension"}
					</a>
					<a href={siteConfig.client}>GitHub · {m.companion}</a>
					<a href={siteConfig.website}>
						GitHub · {locale === "ar" ? "الموقع" : "Website"}
					</a>
					<a href={siteConfig.contact}>{m.contact}</a>
				</nav>
			</div>
			<div className="container footer-bottom">
				<span>© {new Date().getFullYear()} Story Lens</span>
				<span>{m.license}</span>
			</div>
		</footer>
	);
}
