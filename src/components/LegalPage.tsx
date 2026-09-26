import { readFile } from "node:fs/promises";
import path from "node:path";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getMessages } from "@/i18n/messages";
import { type Locale, siteConfig } from "@/lib/site-config";

function slug(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, "-")
		.replace(/^-|-$/g, "");
}
export async function LegalPage({
	locale,
	kind,
}: {
	locale: Locale;
	kind: "privacy" | "terms";
}) {
	const m = getMessages(locale);
	const source = await readFile(
		path.join(process.cwd(), "src/content/legal", locale, `${kind}.mdx`),
		"utf8",
	);
	const front = source.split("---")[1] ?? "";
	const body = source.slice(source.indexOf("---", 3) + 3).trim();
	const title = kind === "privacy" ? m.privacy : m.terms;
	const updated = /lastUpdated: "([^"]+)"/.exec(front)?.[1] ?? "2026-09-27";
	const version = /version: "([^"]+)"/.exec(front)?.[1] ?? "1.0.0";
	const headings = Array.from(
		body.matchAll(/^## (.+)$/gm),
		(match) => match[1] ?? "",
	);
	const components = {
		h2: ({ children }: { children?: React.ReactNode }) => (
			<h2 id={slug(String(children))}>
				<a href={`#${slug(String(children))}`}>{children}</a>
			</h2>
		),
		ContactLink: () => <a href={siteConfig.contact}>{m.contact}</a>,
		LicenseLink: () => (
			<a href={`${siteConfig.website}/blob/main/LICENSE.md`}>
				{locale === "ar" ? "الترخيص" : "license"}
			</a>
		),
	};
	return (
		<>
			<header className="container legal-header">
				<a className="text-link" href={`/${locale}/`}>
					← {m.home}
				</a>
				<h1>{title}</h1>
				<p>
					{m.legalUpdated}:{" "}
					<time dateTime={updated}>
						{new Intl.DateTimeFormat(locale, {
							dateStyle: "long",
							timeZone: "UTC",
						}).format(new Date(`${updated}T00:00:00Z`))}
					</time>{" "}
					· v{version}
				</p>
			</header>
			<div className="container legal-grid">
				<aside className="legal-toc">
					<details open>
						<summary>{m.contents}</summary>
						<nav aria-label={m.contents}>
							{headings.map((h) => (
								<a key={h} href={`#${slug(h)}`}>
									{h}
								</a>
							))}
						</nav>
					</details>
				</aside>
				<article className="prose">
					<MDXRemote source={body} components={components} />
					<p>
						<a href={`/${locale}/${kind === "privacy" ? "terms" : "privacy"}/`}>
							{kind === "privacy" ? m.terms : m.privacy}
						</a>
					</p>
				</article>
			</div>
		</>
	);
}
