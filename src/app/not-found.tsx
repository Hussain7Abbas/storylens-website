export default function NotFound() {
	return (
		<html lang="en">
			<head>
				<title>Page not found | Story Lens</title>
			</head>
			<body>
				<main className="container section">
					<h1>This chapter is missing.</h1>
					<p>تعذر العثور على الصفحة المطلوبة.</p>
					<a className="text-link" href="/en/">
						Story Lens · English
					</a>
					<br />
					<a className="text-link" href="/ar/" lang="ar">
						Story Lens · العربية
					</a>
				</main>
			</body>
		</html>
	);
}
