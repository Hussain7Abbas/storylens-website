import { siteConfig } from "@/lib/site-config";

/**
 * The export has no server, so the bare domain is a language gate: a canonical
 * pointing at English, `hreflang` for both locales, and real links that work
 * when the meta refresh does not.
 */
export default function Index() {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>Story Lens — choose your language</title>
				<meta
					name="description"
					content="Story Lens is a browser extension for web novels: character highlighting, consistent names, chapter detection and optional AI summaries. Available in English and Arabic."
				/>
				<link rel="canonical" href={`${siteConfig.url}/en/`} />
				<link rel="alternate" hrefLang="en" href={`${siteConfig.url}/en/`} />
				<link rel="alternate" hrefLang="ar" href={`${siteConfig.url}/ar/`} />
				<link
					rel="alternate"
					hrefLang="x-default"
					href={`${siteConfig.url}/en/`}
				/>
				<meta httpEquiv="refresh" content="0;url=/en/" />
			</head>
			<body>
				<h1>Story Lens</h1>
				<p>
					<a href="/en/" hrefLang="en">
						Story Lens · English
					</a>
				</p>
				<p>
					<a href="/ar/" hrefLang="ar">
						العربية
					</a>
				</p>
			</body>
		</html>
	);
}
