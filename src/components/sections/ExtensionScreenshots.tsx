import Image from "next/image";
import { getMessages } from "@/i18n/messages";
import type { Locale } from "@/lib/site-config";

export function ExtensionScreenshots({ locale }: { locale: Locale }) {
	const m = getMessages(locale).screenshots;
	return (
		<section
			className="container section"
			aria-labelledby="extension-screens-title"
		>
			<div className="section-heading">
				<p className="eyebrow">{m.eyebrow}</p>
				<h2 id="extension-screens-title">{m.title}</h2>
				<p className="section-intro">{m.intro}</p>
			</div>
			<div className="extension-screens">
				{["glossary", "form", "selection"].map((screen, index) => (
					<figure key={screen} className="extension-screen">
						<div className="extension-screen-frame">
							{(["light", "dark"] as const).map((theme) => (
								<Image
									key={theme}
									className={`extension-capture capture-${theme}`}
									src={`/images/extension/${screen}-${locale}-${theme}.webp`}
									alt={m.items[index]?.[0] ?? m.title}
									width={384}
									height={640}
									unoptimized
								/>
							))}
						</div>
						<figcaption>
							<h3>{m.items[index]?.[0]}</h3>
							<p>{m.items[index]?.[1]}</p>
						</figcaption>
					</figure>
				))}
			</div>
		</section>
	);
}
