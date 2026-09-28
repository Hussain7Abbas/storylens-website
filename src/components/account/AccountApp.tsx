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
import { getMessages, type Messages } from "@/i18n/messages";
import {
	AccountApiError,
	type CodeChallenge,
	changeEmail,
	changePassword,
	completeOAuth,
	getProviders,
	login,
	type RegistrationValues,
	register,
	startGoogleSignIn,
	updateProfile,
	verifyEmailChange,
	verifyPasswordChange,
	verifyRegistration,
} from "@/lib/account/api";
import {
	type AccountSession,
	requestSession,
	subscribeSession,
} from "@/lib/account/bridge";
import { trackEvent } from "@/lib/analytics";
import { type Locale, siteConfig } from "@/lib/site-config";

export type AccountView =
	| "profile"
	| "login"
	| "register"
	| "password"
	| "email"
	| "oauth";
type Copy = Messages["account"];
type Bridge =
	| { status: "detecting" }
	| { status: "missing" }
	| { status: "ready"; session: AccountSession | null };
type Notice = { tone: "success" | "error"; text: string } | null;

function errorText(error: unknown, fallback: string): string {
	return error instanceof AccountApiError && error.message
		? error.message
		: fallback;
}

function field(form: FormData, name: string): string {
	const value = form.get(name);
	return typeof value === "string" ? value : "";
}

export function AccountApp({
	locale,
	view,
}: {
	locale: Locale;
	view: AccountView;
}) {
	const copy = getMessages(locale).account;
	const [bridge, setBridge] = useState<Bridge>({ status: "detecting" });
	const [notice, setNotice] = useState<Notice>(null);
	const base = `/${locale}/profile/`;

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

	// Persists a session in the extension, then reflects what it stored.
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

	const titles: Record<AccountView, string> = {
		profile: copy.title,
		login: copy.loginTitle,
		register: copy.registerTitle,
		password: copy.passwordTitle,
		email: copy.emailTitle,
		oauth: copy.oauthTitle,
	};

	let content: ReactNode;
	if (bridge.status === "detecting") {
		content = (
			<p className="account-status" aria-busy="true">
				{copy.detecting}
			</p>
		);
	} else if (bridge.status === "missing") {
		content = <MissingExtension copy={copy} />;
	} else {
		const { session } = bridge;
		const member = session && session.user.role !== "guest" ? session : null;
		const goToProfile = () => window.location.assign(base);
		if (view === "oauth") {
			content = (
				<OAuthCallback
					copy={copy}
					locale={locale}
					base={base}
					guest={session?.user.role === "guest" ? session : null}
					onSuccess={async (next) => {
						if (await saveSession(next)) window.location.replace(base);
					}}
				/>
			);
		} else if (view === "login") {
			content = member ? (
				<SignedIn copy={copy} session={member} base={base} />
			) : (
				<>
					<GoogleSignIn copy={copy} locale={locale} />
					<LoginForm
						copy={copy}
						locale={locale}
						base={base}
						onSuccess={async (next) => {
							if (await saveSession(next)) goToProfile();
						}}
					/>
				</>
			);
		} else if (view === "register") {
			content = member ? (
				<SignedIn copy={copy} session={member} base={base} />
			) : (
				<>
					<GoogleSignIn copy={copy} locale={locale} />
					<RegisterForm
						copy={copy}
						locale={locale}
						base={base}
						guest={session}
						onSuccess={async (next) => {
							if (await saveSession(next)) goToProfile();
						}}
					/>
				</>
			);
		} else if (view === "password" || view === "email") {
			content = member ? (
				view === "password" ? (
					<PasswordForm
						copy={copy}
						locale={locale}
						base={base}
						session={member}
						onNotice={setNotice}
					/>
				) : (
					<EmailForm
						copy={copy}
						locale={locale}
						base={base}
						session={member}
						onNotice={setNotice}
						onSaved={saveSession}
					/>
				)
			) : (
				<>
					<p>
						{view === "password"
							? copy.signInRequired
							: copy.emailSignInRequired}
					</p>
					<div className="actions">
						<a className="button" href={`${base}login/`}>
							{copy.login}
						</a>
					</div>
				</>
			);
		} else {
			content = (
				<Profile
					copy={copy}
					locale={locale}
					base={base}
					session={session}
					onNotice={setNotice}
					onSaved={saveSession}
				/>
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

function MissingExtension({ copy }: { copy: Copy }) {
	return (
		<>
			<h2>{copy.missingTitle}</h2>
			<p>{copy.missingBody}</p>
			<div className="actions">
				<a
					className="button"
					href={siteConfig.chrome}
					rel="noopener"
					data-analytics-cta="account"
				>
					{copy.missingInstall}
					<span aria-hidden="true">↗</span>
				</a>
				<button
					type="button"
					className="text-link"
					onClick={() => window.location.reload()}
					title={copy.reload}
				>
					{copy.reload}
				</button>
			</div>
		</>
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
	guest,
	onSuccess,
}: {
	copy: Copy;
	locale: Locale;
	base: string;
	guest: AccountSession | null;
	onSuccess: (session: AccountSession) => Promise<void>;
}) {
	const [error, setError] = useState("");
	// The exchange ends the API cookie session, so it must run only once.
	const started = useRef(false);
	useEffect(() => {
		if (started.current) return;
		started.current = true;
		if (new URLSearchParams(window.location.search).has("error")) {
			setError(copy.oauthFailed);
			return;
		}
		completeOAuth(locale, guest?.token)
			.then((session) => {
				trackEvent("login", { method: "google" });
				return onSuccess(session);
			})
			.catch((caught: unknown) =>
				setError(errorText(caught, copy.oauthFailed)),
			);
	}, [copy.oauthFailed, guest, locale, onSuccess]);
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
	session,
	base,
}: {
	copy: Copy;
	session: AccountSession;
	base: string;
}) {
	return (
		<>
			<p>
				{copy.alreadySignedIn} <strong>{session.user.email}</strong>.
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
	onSuccess: (session: AccountSession) => Promise<void>;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		setBusy(true);
		setError("");
		try {
			const session = await login(locale, {
				email: field(form, "email").trim(),
				password: field(form, "password"),
			});
			trackEvent("login", { method: "email" });
			await onSuccess(session);
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
	onSuccess: (session: AccountSession) => Promise<void>;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	// Held in memory only, so a resend can repeat the same request.
	const [pending, setPending] = useState<RegistrationValues | null>(null);
	// Refills the form when the reader goes back to change the email.
	const [draft, setDraft] = useState<RegistrationValues | null>(null);
	const [resendAt, setResendAt] = useState(0);

	// A guest token upgrades the guest in place, keeping its data.
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
					const session = await verifyRegistration(
						locale,
						{ email: pending.email, code },
						guest?.token,
					);
					trackEvent("sign_up", { method: guest ? "guest_upgrade" : "email" });
					await onSuccess(session);
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
	session,
	onNotice,
}: {
	copy: Copy;
	locale: Locale;
	base: string;
	session: AccountSession;
	onNotice: (notice: Notice) => void;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	// Held in memory only, so a resend can repeat the same request.
	const [pending, setPending] = useState<PasswordChange | null>(null);
	const [challenge, setChallenge] = useState<CodeChallenge | null>(null);
	const [resendAt, setResendAt] = useState(0);

	async function requestCode(values: PasswordChange) {
		const next = await changePassword(locale, session.token, values);
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
					await verifyPasswordChange(locale, session.token, { code });
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
				value={session.user.email}
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
	session,
	onNotice,
	onSaved,
}: {
	copy: Copy;
	locale: Locale;
	base: string;
	session: AccountSession;
	onNotice: (notice: Notice) => void;
	onSaved: (session: AccountSession | null) => Promise<boolean>;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [pending, setPending] = useState<string | null>(null);
	// Refills the field when the reader goes back to fix the address.
	const [draft, setDraft] = useState("");
	const [resendAt, setResendAt] = useState(0);

	async function requestCode(email: string) {
		const challenge = await changeEmail(locale, session.token, { email });
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
					const user = await verifyEmailChange(locale, session.token, {
						code,
					});
					if (await onSaved({ user, token: session.token })) {
						setDraft("");
						setPending(null);
						onNotice({ tone: "success", text: copy.emailChanged });
					}
				}}
			/>
		);
	}

	return (
		<form className="account-form" method="post" onSubmit={submit}>
			<dl className="account-details">
				<div>
					<dt>{copy.currentEmail}</dt>
					<dd dir="ltr">{session.user.email}</dd>
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
	session,
	onNotice,
	onSaved,
}: {
	copy: Copy;
	locale: Locale;
	base: string;
	session: AccountSession | null;
	onNotice: (notice: Notice) => void;
	onSaved: (session: AccountSession | null) => Promise<boolean>;
}) {
	const [editing, setEditing] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");

	if (!session || session.user.role === "guest") {
		return (
			<>
				{session && (
					<dl className="account-details">
						<div>
							<dt>{copy.username}</dt>
							<dd>{session.user.username}</dd>
						</div>
						<div>
							<dt>{copy.role}</dt>
							<dd>{copy.roles.guest}</dd>
						</div>
					</dl>
				)}
				<h2>{session ? copy.guestTitle : copy.loginTitle}</h2>
				<p>{session ? copy.guestBody : copy.noSessionBody}</p>
				<div className="actions">
					<a className="button" href={`${base}register/`}>
						{copy.register}
					</a>
					<a className="text-link" href={`${base}login/`}>
						{copy.login}
					</a>
				</div>
			</>
		);
	}

	const { user, token } = session;

	async function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		setBusy(true);
		setError("");
		try {
			const updated = await updateProfile(locale, token, {
				username: field(form, "username").trim(),
				name: field(form, "name").trim(),
			});
			if (await onSaved({ user: updated, token })) {
				setEditing(false);
				onNotice({ tone: "success", text: copy.profileUpdated });
			}
		} catch (caught) {
			setError(errorText(caught, copy.requestFailed));
		} finally {
			setBusy(false);
		}
	}

	async function signOut() {
		if (await onSaved(null)) {
			onNotice({ tone: "success", text: copy.signedOut });
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
					<dd>{copy.roles[user.role]}</dd>
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
					onClick={() => void signOut()}
					title={copy.logout}
				>
					{copy.logout}
				</button>
			</div>
		</>
	);
}
