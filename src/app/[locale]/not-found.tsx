import Link from "next/link";
export default function NotFound() {
	return (
		<div className="container section">
			<h1>This chapter is missing / هذا الفصل مفقود</h1>
			<Link href="/en/">Story Lens · English</Link>
			<br />
			<Link href="/ar/">العربية</Link>
		</div>
	);
}
