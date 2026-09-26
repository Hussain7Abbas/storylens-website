import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function files(root: string): Promise<string[]> {
	const entries = await readdir(root, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map((entry) =>
			entry.isDirectory()
				? files(join(root, entry.name))
				: Promise.resolve([join(root, entry.name)]),
		),
	);
	return nested.flat();
}
const hashes = new Set<string>();
for (const file of await files("out")) {
	if (!file.endsWith(".html")) continue;
	const html = await readFile(file, "utf8");
	for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
		if (/\bsrc=/.test(match[1] ?? "")) continue;
		const text = match[2] ?? "";
		if (text)
			hashes.add(
				`'sha256-${createHash("sha256").update(text).digest("base64")}'`,
			);
	}
}
const csp = `default-src 'self'; script-src 'self' ${[...hashes].sort().join(" ")}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'none'; object-src 'none'`;
const headers = [
	`add_header Content-Security-Policy "${csp}" always;`,
	`add_header Strict-Transport-Security "max-age=31536000" always;`,
	`add_header Referrer-Policy "strict-origin-when-cross-origin" always;`,
	`add_header X-Content-Type-Options "nosniff" always;`,
	`add_header X-Frame-Options "DENY" always;`,
	`add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;`,
	`add_header Cross-Origin-Opener-Policy "same-origin" always;`,
].join("\n");
await writeFile("out/security-headers.conf", `${headers}\n`);
console.log(`Generated CSP hashes for ${hashes.size} inline scripts.`);

await mkdir("out/.well-known", { recursive: true });
await writeFile(
	"out/.well-known/security.txt",
	`Contact: ${process.env.NEXT_PUBLIC_PRIVACY_EMAIL ? `mailto:${process.env.NEXT_PUBLIC_PRIVACY_EMAIL}` : "https://github.com/Hussain7Abbas/storylens-website/issues"}\nExpires: 2027-09-27T00:00:00Z\nPreferred-Languages: en, ar\nCanonical: https://storylens.iscoded.com/.well-known/security.txt\n`,
);
