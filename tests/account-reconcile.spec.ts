import { expect, test } from "@playwright/test";
import type { AccountUser } from "../src/lib/account/bridge";
import {
	type BridgeState,
	type Decision,
	decide,
	safeNext,
	type WebState,
} from "../src/lib/account/reconcile";

// Pure logic: one browser project is enough.
test.beforeEach(() => test.skip(test.info().project.name !== "chromium"));

const user = (id: string, extra: Partial<AccountUser> = {}): AccountUser => ({
	id,
	email: `${id}@example.com`,
	username: id,
	name: id,
	isGuest: false,
	role: { id: "r", slug: "reader", name: "Reader" },
	permissions: ["GET /api/user/auth/me"],
	...extra,
});
const a = user("a");
const signedIn: WebState = { status: "signed-in", user: a };
const signedOut: WebState = { status: "signed-out" };
const held = (heldUser: AccountUser | null): BridgeState => ({
	status: "ready",
	session: heldUser ? { user: heldUser, token: "t" } : null,
});

test("decide follows the reconciliation table", () => {
	const cases: [WebState, BridgeState, Decision][] = [
		[{ status: "loading" }, held(null), "none"],
		[signedIn, { status: "detecting" }, "none"],
		[signedIn, { status: "missing" }, "offer-install"],
		[signedIn, held(null), "hand-off"],
		[signedIn, held(user("g", { isGuest: true })), "hand-off-merging-guest"],
		[signedIn, held(a), "none"],
		[signedIn, held({ ...a, name: "Renamed" }), "refresh-extension-user"],
		[
			signedIn,
			held({ ...a, isGuest: false, permissions: [] }),
			"refresh-extension-user",
		],
		[signedIn, held(user("b")), "ask-which-account"],
		[signedOut, held(user("b")), "adopt"],
		[signedOut, held(user("g", { isGuest: true })), "show-forms"],
		[signedOut, held(null), "show-forms"],
		[signedOut, { status: "missing" }, "show-forms"],
	];
	for (const [web, bridge, expected] of cases)
		expect(decide(web, bridge), JSON.stringify([web, bridge])).toBe(expected);
});

test("safeNext keeps only this locale's profile and pricing pages", () => {
	expect(safeNext("/en/profile/balance/", "en")).toBe("/en/profile/balance/");
	expect(safeNext("/en/pricing/", "en")).toBe("/en/pricing/");
	for (const bad of [
		null,
		"",
		"https://evil.example/",
		"//evil.example/en/profile/",
		"/ar/profile/",
		"/en/profile/../../evil",
		"/en/profile/%2e%2e/%2e%2e/evil",
		"/en/profile/%5cevil",
		"/en/profile/%2f%2fevil",
		"/en/profile/\\evil",
		"/en/privacy/",
	])
		expect(safeNext(bad, "en"), String(bad)).toBeNull();
});
