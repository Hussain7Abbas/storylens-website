"use client";
import {
	type FormEvent,
	type InputHTMLAttributes,
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { BalancePage } from "@/components/billing/BalancePage";
import { GiftCelebration } from "@/components/billing/GiftCelebration";
import { LensPrice } from "@/components/billing/LensPrice";
import { getMessages, type Messages } from "@/i18n/messages";
import {
	AccountApiError,
	adoptExtensionSession,
	type CodeChallenge,
	changeEmail,
	changePassword,
	createExtensionSession,
	getProviders,
	getWebMe,
	type RegistrationValues,
	register,
	startGoogleSignIn,
	updateProfile,
	verifyEmailChange,
	verifyPasswordChange,
	webCompleteOAuth,
	webLogin,
	webLogout,
	webVerifyRegistration,
} from "@/lib/account/api";
import {
	type AccountSession,
	type AccountUser,
	requestSession,
	subscribeSession,
} from "@/lib/account/bridge";
import { writeHeaderAccount } from "@/lib/account/header-state";
import {
	type BridgeState,
	type Decision,
	decide,
	safeNext,
	type WebState,
} from "@/lib/account/reconcile";
import { trackEvent } from "@/lib/analytics";
import { getBalance, type Notice as LensNotice } from "@/lib/billing/api";
import { type Locale, siteConfig } from "@/lib/site-config";

export type AccountView =
	| "profile"
	| "login"
	| "register"
	| "password"
	| "email"
	| "oauth"
	| "balance";
type Copy = Messages["account"];
type Notice = { tone: "success" | "error"; text: string } | null;

/** Views that need a signed-in website; signed out, they send the reader to sign in. */
const PROTECTED: AccountView[] = ["profile", "password", "email", "balance"];
/** Decisions the page carries out by itself, once per state pair. */
const AUTOMATIC: Decision[] = [
	"hand-off",
	"hand-off-merging-guest",
	"refresh-extension-user",
	"adopt",
];

/** Localized name of a system role; custom roles show their own name. */
function roleLabel(roles: Copy["roles"], user: AccountUser): string {
	const slug = user.isGuest ? "guest" : user.role?.slug;
	if (slug && slug in roles) return roles[slug as keyof Copy["roles"]];
	return user.role?.name ?? roles.reader;
}

function errorText(error: unknown, fallback: string): string {
	return error instanceof AccountApiError && error.message
		? error.message
		: fallback;
}

function field(form: FormData, name: string): string {
	const value = form.get(name);
	return typeof value === "string" ? value : "";
}

// After the reader signs out here, an extension holding another account must
// not sign the website straight back in. A flag only, never a token.
const SIGNED_OUT_KEY = "storylens-website-signed-out";
function signedOutHere(): boolean {
	try {
		return sessionStorage.getItem(SIGNED_OUT_KEY) === "1";
	} catch {
		return false;
	}
}
function rememberSignedOut(value: boolean): void {
	try {
		if (value) sessionStorage.setItem(SIGNED_OUT_KEY, "1");
		else sessionStorage.removeItem(SIGNED_OUT_KEY);
	} catch {
		// Storage can be blocked; adopting again is the only effect.
	}
}

function fill(text: string, values: Record<string, string>): string {
	return text.replace(
		/\{(\w+)\}/g,
		(match, key: string) => values[key] ?? match,
	);
}

export function AccountApp({
	locale,
	view,
}: {
	locale: Locale;
	view: AccountView;
}) {
	const messages = getMessages(locale);
	const copy = messages.account;
	const [web, setWeb] = useState<WebState>({ status: "loading" });
	const [lenses, setLenses] = useState<{
		userId: string;
		balance: number;
		notices: LensNotice[];
	} | null>(null);
	const [bridge, setBridge] = useState<BridgeState>({ status: "detecting" });
	const [notice, setNotice] = useState<Notice>(null);
	// The page is static, so the sign-out notice is read after hydration.
	useEffect(() => {
		const out = new URLSearchParams(window.location.search).get("signed-out");
		if (out === "both") setNotice({ tone: "success", text: copy.signedOut });
		if (out === "website")
			setNotice({ tone: "success", text: copy.signedOutWebsiteOnly });
	}, [copy.signedOut, copy.signedOutWebsiteOnly]);
	const [linking, setLinking] = useState(false);
	const [linkFailed, setLinkFailed] = useState(false);
	// Signing out navigates by itself; the sign-in redirect must not race it.
	const [leaving, setLeaving] = useState(false);
	const leavingRef = useRef(false);
	const base = `/${locale}/profile/`;
	const handled = useRef(new Set<string>());

	const refreshWeb = useCallback(async () => {
		try {
			const user = await getWebMe(locale);
			setWeb(user ? { status: "signed-in", user } : { status: "signed-out" });
			return user;
		} catch {
			setWeb({ status: "signed-out" });
			return null;
		}
	}, [locale]);

	useEffect(() => {
		void refreshWeb();
	}, [refreshWeb]);

	// The balance (and unseen gifts or purchases) for the signed-in reader.
	const signedInId = web.status === "signed-in" ? web.user.id : null;
	const accountLenses = lenses?.userId === signedInId ? lenses : null;
	useEffect(() => {
		if (!signedInId || (view !== "profile" && view !== "balance")) return;
		let active = true;
		getBalance(locale)
			.then((result) => active && setLenses({ ...result, userId: signedInId }))
			.catch(() => active && setLenses(null));
		return () => {
			active = false;
		};
	}, [signedInId, view, locale]);
	const showTopUp = useCallback(
		(text: string) => setNotice({ tone: "success", text }),
		[],
	);

	// The header's account link follows the session.
	useEffect(() => {
		if (web.status === "signed-in")
			writeHeaderAccount({
				signedIn: true,
				name: web.user.name || web.user.username,
			});
		else if (web.status === "signed-out")
			writeHeaderAccount({ signedIn: false });
	}, [web]);

	useEffect(() => {
		let active = true;
		const unsubscribe = subscribeSession((session) => {
			if (active) setBridge({ status: "ready", session });
		});
		void requestSession({ type: "get" }).then((session) => {
			if (!active) return;
			setBridge(
				session === undefined
					? { status: "missing" }
					: { status: "ready", session },
			);
		});
		return () => {
			active = false;
			unsubscribe();
		};
	}, []);

	// Stores a session in the extension, then reflects what it holds.
	const saveSession = useCallback(
		async (session: AccountSession | null): Promise<boolean> => {
			const stored = await requestSession(
				session ? { type: "set", session } : { type: "clear" },
			);
			if (stored === undefined) {
				setBridge({ status: "missing" });
				return false;
			}
			setBridge({ status: "ready", session: stored });
			return true;
		},
		[],
	);

	const [stayOut, setStayOut] = useState(false);
	useEffect(() => setStayOut(signedOutHere()), []);
	const decided = decide(web, bridge);
	const decision: Decision =
		decided === "adopt" && stayOut ? "show-forms" : decided;
	const held = bridge.status === "ready" ? bridge.session : null;

	// Keeps the extension on the website's account (or the website on the
	// extension's), at most once per state pair so a failing call cannot loop.
	useEffect(() => {
		if (leavingRef.current || !AUTOMATIC.includes(decision)) return;
		const key = [
			decision,
			web.status === "signed-in" ? JSON.stringify(web.user) : web.status,
			held ? JSON.stringify(held) : "none",
		].join("|");
		if (handled.current.has(key)) return;
		handled.current.add(key);
		setLinking(true);
		setLinkFailed(false);
		const run = async () => {
			if (decision === "adopt" && held) {
				const { user } = await adoptExtensionSession(locale, held.token);
				if (!leavingRef.current) setWeb({ status: "signed-in", user });
			} else if (decision === "refresh-extension-user" && held) {
				if (!leavingRef.current && web.status === "signed-in")
					await saveSession({ user: web.user, token: held.token });
			} else {
				const guestToken =
					decision === "hand-off-merging-guest" ? held?.token : undefined;
				const session = await createExtensionSession(locale, guestToken);
				if (!leavingRef.current) await saveSession(session);
			}
		};
		run()
			.catch(() => setLinkFailed(true))
			.finally(() => setLinking(false));
	}, [decision, web, held, locale, saveSession]);

	const next = () => {
		rememberSignedOut(false);
		const target =
			typeof window === "undefined"
				? null
				: safeNext(
						new URLSearchParams(window.location.search).get("next"),
						locale,
					);
		window.location.assign(target ?? base);
	};

	const titles: Record<AccountView, string> = {
		profile: copy.title,
		login: copy.loginTitle,
		register: copy.registerTitle,
		password: copy.passwordTitle,
		email: copy.emailTitle,
		oauth: copy.oauthTitle,
		balance: messages.billing.balanceTitle,
	};

	// Signed out, protected pages wait for an extension account to adopt, then send the reader to sign in.
	const mustSignIn =
		!leaving &&
		PROTECTED.includes(view) &&
		(decision === "show-forms" || (decision === "adopt" && linkFailed));
	useEffect(() => {
		if (!mustSignIn) return;
		const target = `${base}${view === "profile" ? "" : `${view}/`}`;
		window.location.replace(`${base}login/?next=${encodeURIComponent(target)}`);
	}, [mustSignIn, base, view]);

	const guest = held?.user.isGuest ? held : null;
	let content: ReactNode;
	if (view === "oauth") {
		content = (
			<OAuthCallback
				copy={copy}
				locale={locale}
				base={base}
				onSuccess={() => window.location.replace(base)}
			/>
		);
	} else if (
		web.status === "loading" ||
		bridge.status === "detecting" ||
		mustSignIn ||
		(web.status === "signed-out" && decision === "adopt" && !linkFailed)
	) {
		content = (
			<p className="account-status" aria-busy="true">
				{copy.loading}
			</p>
		);
	} else if (web.status === "signed-out") {
		content =
			view === "register" ? (
				<>
					<GoogleSignIn copy={copy} locale={locale} />
					<RegisterForm
						copy={copy}
						locale={locale}
						base={base}
						guest={guest}
						onSuccess={async () => {
							if (await refreshWeb()) next();
							else throw new AccountApiError(0, copy.cookiesBlocked);
						}}
					/>
				</>
			) : (
				<>
					<GoogleSignIn copy={copy} locale={locale} />
					<LoginForm
						copy={copy}
						locale={locale}
						base={base}
						onSuccess={async () => {
							if (await refreshWeb()) next();
							else throw new AccountApiError(0, copy.cookiesBlocked);
						}}
					/>
				</>
			);
	} else {
		const { user } = web;
		if (view === "login" || view === "register") {
			content = <SignedIn copy={copy} user={user} base={base} />;
		} else if (view === "password") {
			content = (
				<PasswordForm
					copy={copy}
					locale={locale}
					base={base}
					user={user}
					onNotice={setNotice}
				/>
			);
		} else if (view === "balance") {
			content = (
				<BalancePage
					key={user.id}
					locale={locale}
					balance={accountLenses?.balance ?? null}
					extensionMissing={bridge.status === "missing"}
				/>
			);
		} else if (view === "email") {
			content = (
				<EmailForm
					copy={copy}
					locale={locale}
					base={base}
					user={user}
					onNotice={setNotice}
					onSaved={(updated) => setWeb({ status: "signed-in", user: updated })}
				/>
			);
		} else {
			content = (
				<>
					<Profile
						copy={copy}
						locale={locale}
						base={base}
						user={user}
						balance={accountLenses?.balance ?? null}
						onNotice={setNotice}
						onSaved={(updated) =>
							setWeb({ status: "signed-in", user: updated })
						}
						onSignOut={async () => {
							leavingRef.current = true;
							setLeaving(true);
							try {
								await webLogout(locale);
							} catch (error) {
								leavingRef.current = false;
								setLeaving(false);
								throw error;
							}
							// Signed out first, so nothing hands the account back or adopts another.
							rememberSignedOut(true);
							setLeaving(true);
							setStayOut(true);
							setWeb({ status: "signed-out" });
							// The extension signs out with the website only when it holds the same account.
							const same =
								held && !held.user.isGuest && held.user.id === user.id;
							if (same) await saveSession(null);
							window.location.assign(
								`${base}login/?signed-out=${same ? "both" : "website"}`,
							);
						}}
					/>
					<ExtensionStatus
						copy={copy}
						locale={locale}
						user={user}
						decision={decision}
						held={held}
						linking={linking}
						failed={linkFailed}
						onUseWebsiteAccount={async () => {
							await saveSession(await createExtensionSession(locale));
						}}
						onUseExtensionAccount={async () => {
							if (!held) return;
							const { user: adopted } = await adoptExtensionSession(
								locale,
								held.token,
							);
							rememberSignedOut(false);
							setNotice(null);
							setWeb({ status: "signed-in", user: adopted });
						}}
					/>
				</>
			);
		}
	}

	return (
		<section className="container account-page">
			<header className="account-header">
				{view !== "profile" && (
					<a className="text-link" href={base}>
						← {copy.back}
					</a>
				)}
				<h1>{titles[view]}</h1>
				<p>{copy.intro}</p>
			</header>
			<div className="account-card">
				{web.status === "signed-in" &&
					(view === "profile" || view === "balance") && (
						<nav className="account-tabs" aria-label={copy.title}>
							<a
								href={base}
								aria-current={view === "profile" ? "page" : undefined}
							>
								{messages.billing.navProfile}
							</a>
							<a
								href={`${base}balance/`}
								aria-current={view === "balance" ? "page" : undefined}
							>
								{messages.billing.navBalance}
							</a>
						</nav>
					)}
				{accountLenses && accountLenses.notices.length > 0 && (
					<GiftCelebration
						key={signedInId}
						locale={locale}
						notices={accountLenses.notices}
						onTopUp={showTopUp}
					/>
				)}
				<output
					className={`account-notice${notice ? ` ${notice.tone}` : ""}`}
					aria-live="polite"
				>
					{notice?.text}
				</output>
				{content}
			</div>
			<p className="account-footnote">{copy.bridgeNote}</p>
		</section>
	);
}

/**
 * Where the extension stands next to the website's account: not installed,
 * on this account, being connected, or on another account (the reader picks).
 */
function ExtensionStatus({
	copy,
	locale,
	user,
	decision,
	held,
	linking,
	failed,
	onUseWebsiteAccount,
	onUseExtensionAccount,
}: {
	copy: Copy;
	locale: Locale;
	user: AccountUser;
	decision: Decision;
	held: AccountSession | null;
	linking: boolean;
	failed: boolean;
	onUseWebsiteAccount: () => Promise<void>;
	onUseExtensionAccount: () => Promise<void>;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const choose = async (action: () => Promise<void>) => {
		setBusy(true);
		setError("");
		try {
			await action();
		} catch (caught) {
			setError(errorText(caught, copy.requestFailed));
		} finally {
			setBusy(false);
		}
	};

	let body: ReactNode;
	if (decision === "offer-install") {
		body = (
			<>
				<p>{copy.installBody}</p>
				<div className="actions">
					<a
						className="button"
						href={siteConfig.chrome}
						rel="noopener"
						data-analytics-cta="profile"
					>
						{copy.missingInstall}
						<span aria-hidden="true">↗</span>
					</a>
				</div>
			</>
		);
	} else if (decision === "ask-which-account" && held) {
		body = (
			<>
				<p>
					{copy.otherAccountBody} <strong dir="ltr">{held.user.email}</strong>.
				</p>
				<div className="actions">
					<button
						type="button"
						className="button"
						disabled={busy}
						onClick={() => void choose(onUseWebsiteAccount)}
						title={fill(copy.useWebsiteAccount, { email: user.email })}
					>
						{fill(copy.useWebsiteAccount, { email: user.email })}
					</button>
					<button
						type="button"
						className="text-link"
						disabled={busy}
						onClick={() => void choose(onUseExtensionAccount)}
						title={fill(copy.useExtensionAccount, { email: held.user.email })}
					>
						{fill(copy.useExtensionAccount, { email: held.user.email })}
					</button>
				</div>
			</>
		);
	} else if (failed) {
		body = <p className="account-error">{copy.linkFailed}</p>;
	} else if (linking || decision !== "none") {
		body = (
			<p className="account-status" aria-busy="true">
				{copy.extensionConnecting}
			</p>
		);
	} else {
		body = <p>{copy.extensionConnected}</p>;
	}
	return (
		<section
			className="account-extension"
			aria-labelledby={`extension-${locale}`}
		>
			<h2 id={`extension-${locale}`}>{copy.extensionTitle}</h2>
			{body}
			<FormError text={error} />
		</section>
	);
}

// Shown only when the API reports Google sign-in as configured.
function GoogleSignIn({ copy, locale }: { copy: Copy; locale: Locale }) {
	const [enabled, setEnabled] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	useEffect(() => {
		let active = true;
		getProviders(locale)
			.then((providers) => active && setEnabled(providers.google))
			.catch(() => active && setEnabled(false));
		return () => {
			active = false;
		};
	}, [locale]);
	if (!enabled) return null;
	async function start() {
		setBusy(true);
		setError("");
		try {
			const callback = `${window.location.origin}/${locale}/profile/oauth/`;
			window.location.assign(await startGoogleSignIn(locale, callback));
		} catch (caught) {
			setError(errorText(caught, copy.requestFailed));
			setBusy(false);
		}
	}
	return (
		<div className="account-oauth">
			<button
				type="button"
				className="button account-google"
				disabled={busy}
				onClick={() => void start()}
				title={copy.continueWithGoogle}
			>
				{copy.continueWithGoogle}
			</button>
			<FormError text={error} />
			<p className="account-divider">
				<span>{copy.or}</span>
			</p>
		</div>
	);
}

function OAuthCallback({
	copy,
	locale,
	base,
	onSuccess,
}: {
	copy: Copy;
	locale: Locale;
	base: string;
	onSuccess: () => void;
}) {
	const [error, setError] = useState("");
	// The exchange ends the API's OAuth cookie, so it must run only once. The
	// profile page then hands the account to the extension, merging its guest.
	const started = useRef(false);
	useEffect(() => {
		if (started.current) return;
		started.current = true;
		if (new URLSearchParams(window.location.search).has("error")) {
			setError(copy.oauthFailed);
			return;
		}
		webCompleteOAuth(locale)
			.then(() => {
				trackEvent("login", { method: "google" });
				onSuccess();
			})
			.catch((caught: unknown) =>
				setError(errorText(caught, copy.oauthFailed)),
			);
	}, [copy.oauthFailed, locale, onSuccess]);
	if (!error) {
		return (
			<p className="account-status" aria-busy="true">
				{copy.oauthWorking}
			</p>
		);
	}
	return (
		<>
			<FormError text={error} />
			<div className="actions">
				<a className="button" href={`${base}login/`}>
					{copy.tryAgain}
				</a>
			</div>
		</>
	);
}

function SignedIn({
	copy,
	user,
	base,
}: {
	copy: Copy;
	user: AccountUser;
	base: string;
}) {
	return (
		<>
			<p>
				{copy.alreadySignedIn} <strong>{user.email}</strong>.
			</p>
			<div className="actions">
				<a className="button" href={base}>
					{copy.back}
				</a>
			</div>
		</>
	);
}

function TextField({
	label,
	hint,
	...input
}: {
	label: string;
	hint?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
	const id = useId();
	return (
		<div className="account-field">
			<label htmlFor={id}>{label}</label>
			<input
				id={id}
				aria-describedby={hint ? `${id}-hint` : undefined}
				{...input}
			/>
			{hint && (
				<small id={`${id}-hint`} className="account-hint">
					{hint}
				</small>
			)}
		</div>
	);
}

function FormError({ text }: { text: string }) {
	return text ? (
		<p className="account-error" role="alert">
			{text}
		</p>
	) : null;
}

function LoginForm({
	copy,
	locale,
	base,
	onSuccess,
}: {
	copy: Copy;
	locale: Locale;
	base: string;
	onSuccess: () => Promise<void>;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		setBusy(true);
		setError("");
		try {
			await webLogin(locale, {
				email: field(form, "email").trim(),
				password: field(form, "password"),
			});
			trackEvent("login", { method: "email" });
			await onSuccess();
		} catch (caught) {
			setError(
				caught instanceof AccountApiError && caught.status === 401
					? copy.loginFailed
					: errorText(caught, copy.requestFailed),
			);
		} finally {
			setBusy(false);
		}
	}
	return (
		<form className="account-form" method="post" onSubmit={submit}>
			<TextField
				label={copy.email}
				type="email"
				name="email"
				autoComplete="username"
				required
			/>
			<TextField
				label={copy.password}
				type="password"
				name="password"
				autoComplete="current-password"
				required
			/>
			<FormError text={error} />
			<button
				type="submit"
				className="button"
				disabled={busy}
				title={copy.login}
			>
				{copy.login}
			</button>
			<p className="account-switch">
				{copy.needAccount} <a href={`${base}register/`}>{copy.register}</a>
			</p>
		</form>
	);
}

function RegisterForm({
	copy,
	locale,
	base,
	guest,
	onSuccess,
}: {
	copy: Copy;
	locale: Locale;
	base: string;
	guest: AccountSession | null;
	onSuccess: () => Promise<void>;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	// Held in memory only, so a resend can repeat the same request.
	const [pending, setPending] = useState<RegistrationValues | null>(null);
	// Refills the form when the reader goes back to change the email.
	const [draft, setDraft] = useState<RegistrationValues | null>(null);
	const [resendAt, setResendAt] = useState(0);

	// The extension's guest token upgrades that guest in place, keeping its data.
	async function requestCode(values: RegistrationValues) {
		const challenge = await register(locale, values, guest?.token);
		setPending({ ...values, email: challenge.email });
		setResendAt(Date.now() + challenge.resendAfterSeconds * 1000);
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const name = field(form, "name").trim();
		setBusy(true);
		setError("");
		try {
			await requestCode({
				email: field(form, "email").trim(),
				username: field(form, "username").trim(),
				password: field(form, "new-password"),
				...(name ? { name } : {}),
			});
		} catch (caught) {
			setError(errorText(caught, copy.requestFailed));
		} finally {
			setBusy(false);
		}
	}

	if (pending) {
		return (
			<CodeForm
				copy={copy}
				email={pending.email}
				resendAt={resendAt}
				verifyLabel={copy.verify}
				backLabel={copy.changeEmail}
				onResend={() => requestCode(pending)}
				onBack={() => {
					setDraft(pending);
					setPending(null);
				}}
				onVerify={async (code) => {
					await webVerifyRegistration(
						locale,
						{ email: pending.email, code },
						guest?.token,
					);
					trackEvent("sign_up", { method: guest ? "guest_upgrade" : "email" });
					await onSuccess();
				}}
			/>
		);
	}

	return (
		<form className="account-form" method="post" onSubmit={submit}>
			<TextField
				label={copy.email}
				type="email"
				name="email"
				autoComplete="username"
				defaultValue={draft?.email}
				required
			/>
			<TextField
				label={copy.username}
				hint={copy.usernameHint}
				name="username"
				autoComplete="nickname"
				defaultValue={draft?.username ?? guest?.user.username}
				minLength={3}
				maxLength={30}
				required
			/>
			<TextField
				label={copy.name}
				name="name"
				autoComplete="name"
				defaultValue={draft?.name}
				maxLength={100}
			/>
			<TextField
				label={copy.password}
				hint={copy.passwordHint}
				type="password"
				name="new-password"
				autoComplete="new-password"
				minLength={8}
				maxLength={72}
				required
			/>
			<FormError text={error} />
			<button
				type="submit"
				className="button"
				disabled={busy}
				title={copy.register}
			>
				{copy.register}
			</button>
			<p className="account-switch">
				{copy.haveAccount} <a href={`${base}login/`}>{copy.login}</a>
			</p>
		</form>
	);
}

// Shared second step for emailed codes: registration, password, and email.
function CodeForm({
	copy,
	email,
	resendAt,
	verifyLabel,
	backLabel,
	onResend,
	onBack,
	onVerify,
}: {
	copy: Copy;
	email: string;
	resendAt: number;
	verifyLabel: string;
	backLabel: string;
	onResend: () => Promise<void>;
	onBack: () => void;
	onVerify: (code: string) => Promise<void>;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [status, setStatus] = useState("");
	const [now, setNow] = useState(() => Date.now());
	const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));

	useEffect(() => {
		if (waitSeconds === 0) return;
		const timer = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, [waitSeconds]);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		setBusy(true);
		setError("");
		setStatus("");
		try {
			await onVerify(field(form, "one-time-code").trim());
		} catch (caught) {
			setError(errorText(caught, copy.requestFailed));
		} finally {
			setBusy(false);
		}
	}

	async function resend() {
		setBusy(true);
		setError("");
		setStatus("");
		try {
			await onResend();
			setNow(Date.now());
			setStatus(copy.codeResent);
		} catch (caught) {
			setError(errorText(caught, copy.requestFailed));
		} finally {
			setBusy(false);
		}
	}

	const resendLabel =
		waitSeconds > 0
			? copy.resendIn.replace("{seconds}", String(waitSeconds))
			: copy.resendCode;

	return (
		<form className="account-form" method="post" onSubmit={submit}>
			<p>
				{copy.codeSent} <strong dir="ltr">{email}</strong>.
			</p>
			<TextField
				label={copy.verificationCode}
				hint={copy.codeHint}
				name="one-time-code"
				autoComplete="one-time-code"
				inputMode="numeric"
				pattern="[0-9]{6}"
				minLength={6}
				maxLength={6}
				dir="ltr"
				required
				autoFocus
			/>
			<FormError text={error} />
			<output className="account-hint" aria-live="polite">
				{status}
			</output>
			<div className="actions">
				<button
					type="submit"
					className="button"
					disabled={busy}
					title={verifyLabel}
				>
					{verifyLabel}
				</button>
				<button
					type="button"
					className="text-link"
					disabled={busy || waitSeconds > 0}
					onClick={() => void resend()}
					title={resendLabel}
				>
					{resendLabel}
				</button>
			</div>
			<p className="account-switch">
				<button
					type="button"
					className="text-link"
					onClick={onBack}
					title={backLabel}
				>
					{backLabel}
				</button>
			</p>
		</form>
	);
}

type PasswordChange = { currentPassword: string; newPassword: string };

function PasswordForm({
	copy,
	locale,
	base,
	user,
	onNotice,
}: {
	copy: Copy;
	locale: Locale;
	base: string;
	user: AccountUser;
	onNotice: (notice: Notice) => void;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	// Held in memory only, so a resend can repeat the same request.
	const [pending, setPending] = useState<PasswordChange | null>(null);
	const [challenge, setChallenge] = useState<CodeChallenge | null>(null);
	const [resendAt, setResendAt] = useState(0);

	async function requestCode(values: PasswordChange) {
		const next = await changePassword(locale, values);
		setPending(values);
		setChallenge(next);
		setResendAt(Date.now() + next.resendAfterSeconds * 1000);
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const newPassword = field(form, "new-password");
		if (newPassword !== field(form, "confirm-password")) {
			setError(copy.passwordMismatch);
			return;
		}
		setBusy(true);
		setError("");
		onNotice(null);
		try {
			await requestCode({
				currentPassword: field(form, "current-password"),
				newPassword,
			});
		} catch (caught) {
			setError(errorText(caught, copy.requestFailed));
		} finally {
			setBusy(false);
		}
	}

	if (pending && challenge) {
		return (
			<CodeForm
				copy={copy}
				email={challenge.email}
				resendAt={resendAt}
				verifyLabel={copy.confirmCode}
				backLabel={copy.startOver}
				onResend={() => requestCode(pending)}
				onBack={() => {
					setPending(null);
					setChallenge(null);
				}}
				onVerify={async (code) => {
					await verifyPasswordChange(locale, { code });
					setPending(null);
					setChallenge(null);
					onNotice({ tone: "success", text: copy.passwordChanged });
				}}
			/>
		);
	}

	return (
		<form className="account-form" method="post" onSubmit={submit}>
			{/* Lets password managers attach the new password to this account. */}
			<input
				type="email"
				name="email"
				autoComplete="username"
				value={user.email}
				readOnly
				hidden
			/>
			<TextField
				label={copy.currentPassword}
				type="password"
				name="current-password"
				autoComplete="current-password"
				required
			/>
			<TextField
				label={copy.newPassword}
				hint={copy.passwordHint}
				type="password"
				name="new-password"
				autoComplete="new-password"
				minLength={8}
				maxLength={72}
				required
			/>
			<TextField
				label={copy.confirmPassword}
				type="password"
				name="confirm-password"
				autoComplete="new-password"
				minLength={8}
				maxLength={72}
				required
			/>
			<FormError text={error} />
			<div className="actions">
				<button
					type="submit"
					className="button"
					disabled={busy}
					title={copy.sendCode}
				>
					{copy.sendCode}
				</button>
				<a className="text-link" href={base}>
					{copy.cancel}
				</a>
			</div>
		</form>
	);
}

function EmailForm({
	copy,
	locale,
	base,
	user,
	onNotice,
	onSaved,
}: {
	copy: Copy;
	locale: Locale;
	base: string;
	user: AccountUser;
	onNotice: (notice: Notice) => void;
	onSaved: (user: AccountUser) => void;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [pending, setPending] = useState<string | null>(null);
	// Refills the field when the reader goes back to fix the address.
	const [draft, setDraft] = useState("");
	const [resendAt, setResendAt] = useState(0);

	async function requestCode(email: string) {
		const challenge = await changeEmail(locale, { email });
		setPending(challenge.email);
		setResendAt(Date.now() + challenge.resendAfterSeconds * 1000);
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		setBusy(true);
		setError("");
		onNotice(null);
		try {
			await requestCode(field(form, "email").trim());
		} catch (caught) {
			setError(errorText(caught, copy.requestFailed));
		} finally {
			setBusy(false);
		}
	}

	if (pending) {
		return (
			<CodeForm
				copy={copy}
				email={pending}
				resendAt={resendAt}
				verifyLabel={copy.confirmCode}
				backLabel={copy.changeEmail}
				onResend={() => requestCode(pending)}
				onBack={() => {
					setDraft(pending);
					setPending(null);
				}}
				onVerify={async (code) => {
					// The extension's copy refreshes through reconciliation.
					onSaved(await verifyEmailChange(locale, { code }));
					setDraft("");
					setPending(null);
					onNotice({ tone: "success", text: copy.emailChanged });
				}}
			/>
		);
	}

	return (
		<form className="account-form" method="post" onSubmit={submit}>
			<dl className="account-details">
				<div>
					<dt>{copy.currentEmail}</dt>
					<dd dir="ltr">{user.email}</dd>
				</div>
			</dl>
			<TextField
				label={copy.newEmail}
				hint={copy.newEmailHint}
				type="email"
				name="email"
				autoComplete="email"
				defaultValue={draft}
				dir="ltr"
				required
			/>
			<FormError text={error} />
			<div className="actions">
				<button
					type="submit"
					className="button"
					disabled={busy}
					title={copy.sendCode}
				>
					{copy.sendCode}
				</button>
				<a className="text-link" href={base}>
					{copy.cancel}
				</a>
			</div>
		</form>
	);
}

function Profile({
	copy,
	locale,
	base,
	user,
	balance,
	onNotice,
	onSaved,
	onSignOut,
}: {
	copy: Copy;
	locale: Locale;
	base: string;
	user: AccountUser;
	balance: number | null;
	onNotice: (notice: Notice) => void;
	onSaved: (user: AccountUser) => void;
	onSignOut: () => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");

	async function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		setBusy(true);
		setError("");
		try {
			onSaved(
				await updateProfile(locale, {
					username: field(form, "username").trim(),
					name: field(form, "name").trim(),
				}),
			);
			setEditing(false);
			onNotice({ tone: "success", text: copy.profileUpdated });
		} catch (caught) {
			setError(errorText(caught, copy.requestFailed));
		} finally {
			setBusy(false);
		}
	}

	async function signOut() {
		setBusy(true);
		try {
			await onSignOut();
		} catch (caught) {
			onNotice({
				tone: "error",
				text: errorText(caught, copy.requestFailed),
			});
			setBusy(false);
		}
	}

	if (editing) {
		return (
			<form className="account-form" method="post" onSubmit={save}>
				<TextField
					label={copy.username}
					hint={copy.usernameHint}
					name="username"
					autoComplete="nickname"
					defaultValue={user.username}
					minLength={3}
					maxLength={30}
					required
				/>
				<TextField
					label={copy.name}
					name="name"
					autoComplete="name"
					defaultValue={user.name}
					maxLength={100}
					required
				/>
				<FormError text={error} />
				<div className="actions">
					<button
						type="submit"
						className="button"
						disabled={busy}
						title={copy.save}
					>
						{copy.save}
					</button>
					<button
						type="button"
						className="text-link"
						onClick={() => {
							setError("");
							setEditing(false);
						}}
						title={copy.cancel}
					>
						{copy.cancel}
					</button>
				</div>
			</form>
		);
	}

	return (
		<>
			<dl className="account-details">
				<div>
					<dt>{copy.username}</dt>
					<dd>{user.username}</dd>
				</div>
				<div>
					<dt>{copy.name}</dt>
					<dd>{user.name}</dd>
				</div>
				<div>
					<dt>{copy.email}</dt>
					<dd>{user.email}</dd>
				</div>
				<div>
					<dt>{copy.role}</dt>
					<dd>{roleLabel(copy.roles, user)}</dd>
				</div>
				<div>
					<dt>{getMessages(locale).billing.balanceLabel}</dt>
					<dd>
						{balance === null ? (
							"—"
						) : (
							<LensPrice lenses={balance} locale={locale} signed />
						)}{" "}
						<a className="text-link" href={`${base}balance/`}>
							{getMessages(locale).billing.balanceLink}
						</a>
					</dd>
				</div>
			</dl>
			<div className="actions">
				<button
					type="button"
					className="button"
					onClick={() => {
						onNotice(null);
						setEditing(true);
					}}
					title={copy.edit}
				>
					{copy.edit}
				</button>
				<a className="text-link" href={`${base}email/`}>
					{copy.changeEmailLink}
				</a>
				<a className="text-link" href={`${base}password/`}>
					{copy.changePassword}
				</a>
				<button
					type="button"
					className="text-link"
					disabled={busy}
					onClick={() => void signOut()}
					title={copy.logout}
				>
					{copy.logout}
				</button>
			</div>
		</>
	);
}
