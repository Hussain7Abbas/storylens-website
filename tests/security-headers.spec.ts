import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { nginxCspHeader } from "../deploy/nginx-csp";

test.beforeEach(() => test.skip(test.info().project.name !== "chromium"));

function resolvePolicy(config: string): string {
	const variables = new Map(
		[...config.matchAll(/^set \$(\w+) "((?:\\.|[^"\\])*)";$/gm)].map(
			(match) => [match[1], (match[2] ?? "").replace(/\\([\\"$])/g, "$1")],
		),
	);
	const header = config.match(
		/^add_header Content-Security-Policy "([^"]*)" always;$/m,
	)?.[1];
	expect(header).toBeDefined();
	return (header ?? "").replace(/\$\{(\w+)\}/g, (_, name: string) => {
		expect(variables.has(name)).toBe(true);
		return variables.get(name) ?? "";
	});
}

test("large CSP remains one exact header with Nginx-safe parameters", () => {
	const hashes = Array.from(
		{ length: 300 },
		(_, index) =>
			`'sha256-${createHash("sha256").update(`script ${index}`).digest("base64")}'`,
	);
	const policy = `script-src 'self' ${hashes.join(" ")}; object-src 'none'`;
	expect(Buffer.byteLength(policy)).toBeGreaterThan(4096);
	const config = nginxCspHeader(policy);
	for (const match of config.matchAll(/"((?:\\.|[^"\\])*)"/g))
		expect(Buffer.byteLength(match[1] ?? "")).toBeLessThan(4096);
	expect(config.match(/add_header Content-Security-Policy/g)).toHaveLength(1);
	expect(resolvePolicy(config)).toBe(policy);
	const special = `script-src 'self'; report-uri https://example.test/report?x="quoted"&label=عدسة\\path`;
	expect(resolvePolicy(nginxCspHeader(special))).toBe(special);
	expect(() => nginxCspHeader("script-src 'self'\nX-Test: injected")).toThrow();
	expect(() =>
		nginxCspHeader("script-src 'self'; report-uri /$report"),
	).toThrow();
});

test("exported CSP preserves every inline script hash", async () => {
	const policy = resolvePolicy(
		await readFile("out/security-headers.conf", "utf8"),
	);
	const expected = new Set<string>();
	async function inspect(directory: string): Promise<void> {
		for (const entry of await readdir(directory, { withFileTypes: true })) {
			const path = join(directory, entry.name);
			if (entry.isDirectory()) await inspect(path);
			else if (entry.name.endsWith(".html")) {
				const html = await readFile(path, "utf8");
				for (const match of html.matchAll(
					/<script\b([^>]*)>([\s\S]*?)<\/script>/g,
				)) {
					if (/\bsrc=/.test(match[1] ?? "") || !match[2]) continue;
					expected.add(
						`'sha256-${createHash("sha256").update(match[2]).digest("base64")}'`,
					);
				}
			}
		}
	}
	await inspect("out");
	expect(expected.size).toBeGreaterThan(0);
	expect(new Set(policy.match(/'sha256-[^']+'/g))).toEqual(expected);
	expect(policy.match(/script-src[^;]*/)?.[0]).not.toContain("'unsafe-inline'");
});
