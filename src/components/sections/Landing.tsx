import {
	ArrowRight,
	ArrowUpRight,
	BookOpen,
	CloudOff,
	Highlighter,
	Laptop,
	MousePointer2,
	Replace,
	ScanText,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import { getMessages } from "@/i18n/messages";
import { type Locale, siteConfig } from "@/lib/site-config";
import { Reveal } from "../motion/Reveal";
import { LensEnhancement } from "../three/LensEnhancement";
import { Demo } from "./Demo";

const icons = [
	Highlighter,
	Replace,
	ScanText,
	MousePointer2,
	CloudOff,
	Sparkles,
];
export function Landing({ locale }: { locale: Locale }) {
	const m = getMessages(locale);
	return (
		<Reveal>
			<section id="top" className="hero container" aria-labelledby="hero-title">
				<div className="hero-copy">
					<p className="eyebrow">
						<span className="line" />
						{m.eyebrow}
					</p>
					<h1 id="hero-title">{m.headline}</h1>
					<p className="hero-intro">{m.intro}</p>
					<div className="actions">
						<a className="button" href={siteConfig.chrome} rel="noopener">
							{m.install}
							<ArrowUpRight size={19} aria-hidden="true" />
						</a>
						<a className="text-link" href="#demo">
							{m.action}
							<ArrowRight size={18} aria-hidden="true" />
						</a>
					</div>
					<div className="chips">
						{m.chips.map((c) => (
							<span key={c}>{c}</span>
						))}
					</div>
				</div>
				<div className="hero-art">
					<div className="orb orb-one" />
					<div className="orb orb-two" />
					<div className="reading-card hero-page">
						<div className="chapter-label">{m.chapter}</div>
						<h2>{m.chapterTitle}</h2>
						<div className="short-rule" />
						<p className="story-text">
							<mark className="character character-0">{m.mira}</mark>
							{locale === "en"
								? " reached the archive before dawn. Across the bridge, "
								: " وصلت إلى الأرشيف قبل الفجر. وعلى الجسر، كان "}
							<mark className="character character-1">{m.vale}</mark>
							{locale === "en"
								? " held the last lantern. “The city remembers every name,” he said."
								: " يحمل آخر فانوس. قال: «المدينة تتذكر كل اسم»."}
						</p>
						<p className="story-text quiet">
							{locale === "en"
								? "Behind them, Orin opened the silver gate — and the story began again."
								: "وخلفهما، فتح أورين البوابة الفضية، وبدأت الحكاية من جديد."}
						</p>
						<div className="reading-footer">
							<BookOpen size={17} aria-hidden="true" />
							<span>07</span>
						</div>
					</div>
					<div className="floating-note">
						<span className="note-dot" />
						<div>
							<strong>{m.note}</strong>
							<span>{m.noteBody}</span>
						</div>
					</div>
					<LensEnhancement />
					<p className="art-caption">{m.caption}</p>
				</div>
			</section>
			<section className="why-section" id="why" aria-labelledby="why-title">
				<div className="container why-grid" data-reveal>
					<p className="eyebrow">
						01 / {locale === "en" ? "THE READER’S DILEMMA" : "حيرة القارئ"}
					</p>
					<div>
						<h2 id="why-title">{m.whyTitle}</h2>
						<p className="section-intro">{m.whyIntro}</p>
						<div className="pain-list">
							{m.pains.map((pain, i) => (
								<span key={pain}>
									<span className="small-number">0{i + 1}</span>
									{pain}
								</span>
							))}
						</div>
					</div>
				</div>
			</section>
			<section
				id="features"
				className="container section"
				aria-labelledby="features-title"
			>
				<div className="section-heading" data-reveal>
					<p className="eyebrow">02 / {m.features}</p>
					<h2 id="features-title">{m.featureTitle}</h2>
					<p className="section-intro">{m.featureIntro}</p>
				</div>
				<div className="feature-grid">
					{m.featureCards.map(([title, description], i) => {
						const Icon = icons[i] ?? BookOpen;
						return (
							<article
								className={`feature-card feature-${i}`}
								key={title}
								data-reveal
							>
								<div className="feature-icon">
									<Icon size={25} strokeWidth={1.5} aria-hidden="true" />
								</div>
								<h3>{title}</h3>
								<p>{description}</p>
								{i === 0 && (
									<div className="mini-demo">
										<mark className="character character-0">{m.mira}</mark>
										<mark className="character character-1">{m.vale}</mark>
										<mark className="character character-2">{m.orin}</mark>
									</div>
								)}
								{i === 1 && (
									<div className="mini-demo">
										<s>{m.passageName}</s>
										<ArrowRight size={16} aria-hidden="true" />
										<strong>{m.vale}</strong>
									</div>
								)}
							</article>
						);
					})}
				</div>
			</section>
			<section
				id="demo"
				className="demo-section section"
				aria-labelledby="demo-title"
			>
				<div className="container">
					<div className="section-heading" data-reveal>
						<p className="eyebrow">03 / {m.demoLabel}</p>
						<h2 id="demo-title">{m.demoTitle}</h2>
						<p className="section-intro">{m.demoIntro}</p>
					</div>
					<Demo locale={locale} />
				</div>
			</section>
			<section
				id="how"
				className="container section"
				aria-labelledby="how-title"
			>
				<div className="section-heading" data-reveal>
					<p className="eyebrow">04 / {m.how}</p>
					<h2 id="how-title">{m.howTitle}</h2>
				</div>
				<ol className="steps">
					{m.steps.map(([title, description], i) => (
						<li key={title} data-reveal>
							<span className="step-number">0{i + 1}</span>
							<h3>{title}</h3>
							<p>{description}</p>
						</li>
					))}
				</ol>
			</section>
			<section
				id="companion"
				className="companion-section section"
				aria-labelledby="companion-title"
			>
				<div className="container companion-grid">
					<div data-reveal>
						<p className="eyebrow">05 / {m.companionLabel}</p>
						<h2 id="companion-title">{m.companionTitle}</h2>
						<p className="section-intro">{m.companionBody}</p>
						<div className="actions">
							<a className="button" href={siteConfig.setup}>
								{m.setup}
								<ArrowUpRight size={18} aria-hidden="true" />
							</a>
							<a className="text-link" href={siteConfig.client}>
								{m.source}
							</a>
						</div>
						<p className="download-note">{m.downloadNote}</p>
					</div>
					<div className="companion-panel" data-reveal>
						<div className="panel-top">
							<Laptop aria-hidden="true" />
							<span>Story Lens · {m.companion}</span>
							<span className="status-dot" />
						</div>
						<div className="provider-row">
							<span>Claude Code</span>
							<span>Codex</span>
						</div>
						<ol>
							{m.pairing.map((step, i) => (
								<li key={step}>
									<span>{i + 1}</span>
									{step}
								</li>
							))}
						</ol>
						<div className="local-pill">
							127.0.0.1 · {locale === "en" ? "Your computer" : "حاسوبك"}
						</div>
					</div>
				</div>
			</section>
			<section
				id="privacy"
				className="container section privacy-grid"
				aria-labelledby="privacy-title"
			>
				<div data-reveal>
					<p className="eyebrow">06 / {m.privacyLabel}</p>
					<h2 id="privacy-title">{m.privacyTitle}</h2>
					<a className="text-link" href={`/${locale}/privacy/`}>
						{m.readPolicy}
						<ArrowRight size={18} aria-hidden="true" />
					</a>
				</div>
				<ul data-reveal>
					{m.privacyPoints.map((point) => (
						<li key={point}>
							<ShieldCheck size={23} aria-hidden="true" />
							<span>{point}</span>
						</li>
					))}
				</ul>
			</section>
			<section
				id="faq"
				className="faq-section section"
				aria-labelledby="faq-title"
			>
				<div className="container faq-grid">
					<div data-reveal>
						<p className="eyebrow">07 / {m.faq}</p>
						<h2 id="faq-title">{m.faqTitle}</h2>
					</div>
					<div>
						{m.questions.map(([q, a]) => (
							<details key={q}>
								<summary>
									{q}
									<span aria-hidden="true">+</span>
								</summary>
								<p>{a}</p>
							</details>
						))}
					</div>
				</div>
			</section>
			<section
				id="install"
				className="container final-section"
				aria-labelledby="final-title"
				data-reveal
			>
				<p className="eyebrow">
					{locale === "en" ? "THE NEXT CHAPTER IS YOURS" : "الفصل القادم لك"}
				</p>
				<h2 id="final-title">{m.finalTitle}</h2>
				<p>{m.finalBody}</p>
				<div className="actions">
					<a className="button" href={siteConfig.chrome} rel="noopener">
						{m.install}
						<ArrowUpRight size={19} aria-hidden="true" />
					</a>
					<a className="text-link" href={siteConfig.extension}>
						GitHub
						<ArrowUpRight size={18} aria-hidden="true" />
					</a>
				</div>
			</section>
			<script type="application/ld+json">
				{JSON.stringify({
					"@context": "https://schema.org",
					"@type": "SoftwareApplication",
					name: "Story Lens",
					applicationCategory: "BrowserApplication",
					operatingSystem: "Chrome",
					url: siteConfig.url,
					description: m.intro,
				}).replace(/</g, "\u003c")}
			</script>
			<script type="application/ld+json">
				{JSON.stringify({
					"@context": "https://schema.org",
					"@type": "FAQPage",
					mainEntity: m.questions.map(([name, text]) => ({
						"@type": "Question",
						name,
						acceptedAnswer: { "@type": "Answer", text },
					})),
				}).replace(/</g, "\u003c")}
			</script>
		</Reveal>
	);
}
