// Nginx's configuration parser limits a single parameter to 4096 bytes.
// Keep each quoted value comfortably below that limit, then assemble one header.
export function nginxCspHeader(policy: string): string {
	if (/[\r\n\0]/.test(policy))
		throw new Error("CSP must be a single header value");
	// Nginx interprets dollar signs in set values even when they are escaped.
	if (policy.includes("$"))
		throw new Error("CSP must not reference Nginx variables");
	const chunks: string[] = [];
	let chunk = "";
	let bytes = 0;
	for (const character of policy) {
		const escaped = character.replace(/[\\"]/g, "\\$&");
		const size = Buffer.byteLength(escaped);
		if (bytes + size > 3072) {
			chunks.push(chunk);
			chunk = "";
			bytes = 0;
		}
		chunk += escaped;
		bytes += size;
	}
	chunks.push(chunk);
	const names = chunks.map((_, index) => `storylens_csp_${index}`);
	return [
		...chunks.map((value, index) => `set $${names[index]} "${value}";`),
		`add_header Content-Security-Policy "${names.map((name) => `\${${name}}`).join("")}" always;`,
	].join("\n");
}
