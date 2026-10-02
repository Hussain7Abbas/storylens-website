"use client";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { getMessages } from "@/i18n/messages";
import { AccountApiError } from "@/lib/account/api";
import { trackEvent } from "@/lib/analytics";
import {
	cancelRequest,
	createRequest,
	type FeaturePrice,
	getPricing,
	getRequests,
	getTransactions,
	type LensRequest,
	type Page,
	type Pricing,
	type Transaction,
} from "@/lib/billing/api";
import { type ContactChannel, normalizeContact } from "@/lib/billing/contact";
import {
	formatCents,
	formatMicros,
	formatNumber,
	parseUsdToMicros,
	priceCents,
} from "@/lib/billing/money";
import { type Locale, siteConfig } from "@/lib/site-config";
import { LensCoin } from "./LensCoin";
import { LensPrice, lensLabel } from "./LensPrice";

type Copy = ReturnType<typeof getMessages>["billing"];
const PRESETS = [500, 1_000, 5_000];

function fill(text: string, values: Record<string, string>): string {
	return text.replace(
		/\{(\w+)\}/g,
		(match, key: string) => values[key] ?? match,
	);
}

function featureName(
	features: FeaturePrice[],
	key: string | null,
	locale: Locale,
): string {
	const feature = features.find((item) => item.key === key);
	if (!feature) return key ?? "";
	return locale === "ar" ? feature.nameAr : feature.nameEn;
}

/** A decimal-string total from the API (`"5.00"`) as cents, without float math. */
function centsOf(totalUsd: string): number {
	const [whole = "0", fraction = ""] = totalUsd.split(".");
	return Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

function formatDate(value: string, locale: Locale): string {
	return new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

/** The smallest preset (or the minimum) that covers a shortfall, within the limits. */
function amountFor(shortfall: number, min: number, max: number): number {
	const options = [
		min,
		...PRESETS.filter((value) => value > min && value <= max),
	];
	return (
		options.find((value) => value >= shortfall) ??
		Math.min(max, Math.max(min, shortfall))
	);
}

/**
 * The reader's lenses: balance, a request form priced in the browser from the
 * public lens price, their requests and their history. Signed in only; the
 * extension sends readers here (`?need=&feature=&from=extension`, `#request`).
 */
export function BalancePage({
	locale,
	balance,
	extensionMissing,
}: {
	locale: Locale;
	balance: number | null;
	extensionMissing: boolean;
}) {
	const copy = getMessages(locale).billing;
	const [pricing, setPricing] = useState<Pricing | null>(null);
	const [pricingFailed, setPricingFailed] = useState(false);
	const [requests, setRequests] = useState<
		| (Page<LensRequest> & {
				lastContact: { channel: ContactChannel; handle: string } | null;
		  })
		| null
	>(null);
	const [requestsPage, setRequestsPage] = useState(1);
	const [sent, setSent] = useState<LensRequest | null>(null);
	const [need, setNeed] = useState<{ need: number; feature: string } | null>(
		null,
	);

	const loadPricing = useCallback(async () => {
		try {
			setPricing(await getPricing(locale));
			setPricingFailed(false);
		} catch {
			setPricingFailed(true);
		}
	}, [locale]);
	const loadRequests = useCallback(
		async (page: number) => {
			try {
				setRequests(await getRequests(locale, page));
			} catch {
				setRequests(null);
			}
		},
		[locale],
	);

	useEffect(() => {
		void loadPricing();
	}, [loadPricing]);
	useEffect(() => {
		void loadRequests(requestsPage);
	}, [loadRequests, requestsPage]);
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const count = Number(params.get("need"));
		const feature = params.get("feature");
		if (Number.isInteger(count) && count > 0 && feature)
			setNeed({ need: count, feature });
	}, []);

	const price = pricing?.lensPriceMicros ?? null;
	const worth =
		balance !== null && price !== null
			? formatCents(priceCents(balance, price), locale)
			: null;

	return (
		<div className="balance-page">
			{need && pricing && (
				<output className="balance-need">
					{fill(copy.needBanner, {
						feature: featureName(pricing.features, need.feature, locale),
						need: lensLabel(need.need, locale),
						have: lensLabel(balance ?? 0, locale),
					})}
				</output>
			)}
			<section className="balance-card" aria-labelledby="balance-heading">
				<LensCoin size={56} />
				<div>
					<h2 id="balance-heading">{copy.balanceLabel}</h2>
					<p className="balance-amount">
						{balance === null ? "—" : lensLabel(balance, locale)}
					</p>
					{worth && (
						<p className="balance-worth">
							{fill(copy.worth, { amount: worth })}
						</p>
					)}
					<a className="text-link" href={`/${locale}/pricing/`}>
						{copy.seePricing}
					</a>
				</div>
			</section>

			<section
				id="request"
				className="balance-section"
				aria-labelledby="request-heading"
			>
				<h2 id="request-heading">{copy.requestTitle}</h2>
				{pricingFailed ? (
					<div className="actions">
						<p className="account-error">{copy.loadFailed}</p>
						<button
							type="button"
							className="text-link"
							onClick={() => void loadPricing()}
							title={copy.retry}
						>
							{copy.retry}
						</button>
					</div>
				) : !pricing ? (
					<p className="account-status" aria-busy="true">
						…
					</p>
				) : !pricing.available || price === null ? (
					<p>{copy.unavailable}</p>
				) : sent ? (
					<RequestSent
						copy={copy}
						locale={locale}
						request={sent}
						onAnother={() => setSent(null)}
					/>
				) : (
					<RequestForm
						copy={copy}
						locale={locale}
						pricing={pricing}
						balance={balance ?? 0}
						need={need?.need ?? null}
						lastContact={requests?.lastContact ?? null}
						onPriceChanged={loadPricing}
						onSent={(request) => {
							setSent(request);
							setRequestsPage(1);
							void loadRequests(1);
						}}
					/>
				)}
			</section>

			<section className="balance-section" aria-labelledby="requests-heading">
				<h2 id="requests-heading">{copy.requestsTitle}</h2>
				<RequestList
					copy={copy}
					locale={locale}
					requests={requests}
					onPage={setRequestsPage}
					onCancelled={() => void loadRequests(requestsPage)}
				/>
			</section>

			<section className="balance-section" aria-labelledby="history-heading">
				<h2 id="history-heading">{copy.historyTitle}</h2>
				<History
					copy={copy}
					locale={locale}
					features={pricing?.features ?? []}
				/>
			</section>

			{extensionMissing && (
				<section className="balance-section" aria-labelledby="install-heading">
					<h2 id="install-heading">{copy.installTitle}</h2>
					<p>{copy.installBody}</p>
					<div className="actions">
						<a
							className="button"
							href={siteConfig.chrome}
							rel="noopener"
							data-analytics-cta="balance"
						>
							{getMessages(locale).account.missingInstall}
							<span aria-hidden="true">↗</span>
						</a>
					</div>
				</section>
			)}
		</div>
	);
}

function RequestForm({
	copy,
	locale,
	pricing,
	balance,
	need,
	lastContact,
	onPriceChanged,
	onSent,
}: {
	copy: Copy;
	locale: Locale;
	pricing: Pricing;
	balance: number;
	need: number | null;
	lastContact: { channel: ContactChannel; handle: string } | null;
	onPriceChanged: () => Promise<void>;
	onSent: (request: LensRequest) => void;
}) {
	const { min, max } = pricing.request;
	const price = pricing.lensPriceMicros ?? 0;
	const amountId = useId();
	const contactId = useId();
	const noteId = useId();
	const amountInput = useRef<HTMLInputElement>(null);
	const [amount, setAmount] = useState(() =>
		need
			? amountFor(need - balance, min, max)
			: Math.max(min, Math.min(500, max)),
	);
	const [channel, setChannel] = useState<ContactChannel>(
		lastContact?.channel ?? "WHATSAPP",
	);
	const [handle, setHandle] = useState(lastContact?.handle ?? "");
	const [note, setNote] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [contactError, setContactError] = useState("");
	// The same ID is sent again after a network error, so a retry never doubles a request.
	const requestId = useRef<string | null>(null);
	const requestPayload = useRef<string | null>(null);

	// A later `lastContact` (it loads with the requests) fills an untouched field.
	const touched = useRef(false);
	useEffect(() => {
		if (!lastContact || touched.current) return;
		setChannel(lastContact.channel);
		setHandle(lastContact.handle);
	}, [lastContact]);
	// Opening the page at `#request` puts the reader in the amount field.
	useEffect(() => {
		if (window.location.hash !== "#request") return;
		amountInput.current?.scrollIntoView({ block: "center" });
		amountInput.current?.focus();
	}, []);

	const inRange = Number.isInteger(amount) && amount >= min && amount <= max;
	const total = inRange ? formatCents(priceCents(amount, price), locale) : null;
	const presets = [
		min,
		...PRESETS.filter((value) => value > min && value <= max),
	];

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError("");
		setContactError("");
		if (!inRange) {
			setError(
				fill(copy.amountOutOfRange, {
					min: formatNumber(min, locale),
					max: formatNumber(max, locale),
				}),
			);
			return;
		}
		const contact = normalizeContact(channel, handle);
		if (!contact) {
			setContactError(
				channel === "WHATSAPP"
					? copy.contactInvalidWhatsapp
					: copy.contactInvalidTelegram,
			);
			return;
		}
		const fingerprint = JSON.stringify([
			amount,
			pricing.lensPriceUsd,
			channel,
			contact,
			note.trim(),
		]);
		if (requestPayload.current !== fingerprint) requestId.current = null;
		requestPayload.current = fingerprint;
		requestId.current ??= crypto.randomUUID();
		setBusy(true);
		try {
			const { request } = await createRequest(locale, {
				id: requestId.current,
				lenses: amount,
				quotedLensPriceUsd: pricing.lensPriceUsd ?? "",
				contactChannel: channel,
				contactHandle: contact,
				...(note.trim() ? { note: note.trim() } : {}),
			});
			requestId.current = null;
			trackEvent("lens_request_submitted");
			onSent(request);
		} catch (caught) {
			if (!(caught instanceof AccountApiError) || caught.status === 0) {
				setError(getMessages(locale).account.requestFailed);
				return;
			}
			// The API answered: a new submission is a new request.
			requestId.current = null;
			const details = caught.details ?? {};
			const text = (key: string) =>
				typeof details[key] === "number"
					? formatNumber(details[key], locale)
					: "";
			if (caught.code === "PRICE_CHANGED") {
				await onPriceChanged();
				const micros = parseUsdToMicros(
					typeof details.lensPriceUsd === "string"
						? details.lensPriceUsd
						: null,
				);
				setError(
					fill(copy.priceChanged, {
						price: micros === null ? "" : formatMicros(micros, locale),
					}),
				);
			} else if (caught.code === "CONTACT_INVALID") {
				setContactError(
					channel === "WHATSAPP"
						? copy.contactInvalidWhatsapp
						: copy.contactInvalidTelegram,
				);
			} else if (caught.code === "LENS_AMOUNT_OUT_OF_RANGE") {
				setError(
					fill(copy.amountOutOfRange, { min: text("min"), max: text("max") }),
				);
			} else if (caught.code === "TOO_MANY_PENDING_REQUESTS") {
				setError(fill(copy.tooManyPending, { max: text("max") }));
			} else if (caught.code === "REQUEST_RATE_LIMITED") {
				setError(copy.rateLimited);
			} else if (caught.code === "BILLING_UNAVAILABLE") {
				setError(copy.unavailable);
			} else {
				setError(caught.message || getMessages(locale).account.requestFailed);
			}
		} finally {
			setBusy(false);
		}
	}

	return (
		<form
			className="account-form request-form"
			method="post"
			onSubmit={submit}
			noValidate
		>
			<div className="account-field">
				<label htmlFor={amountId}>{copy.amount}</label>
				<input
					ref={amountInput}
					id={amountId}
					name="lenses"
					type="number"
					inputMode="numeric"
					min={min}
					max={max}
					step={1}
					value={Number.isFinite(amount) ? amount : ""}
					onChange={(event) => setAmount(event.currentTarget.valueAsNumber)}
					aria-describedby={`${amountId}-hint ${amountId}-total`}
					aria-invalid={!inRange}
					required
				/>
				<small id={`${amountId}-hint`} className="account-hint">
					{fill(copy.amountHint, {
						min: formatNumber(min, locale),
						max: formatNumber(max, locale),
					})}
				</small>
			</div>
			<fieldset className="request-presets">
				<legend>{copy.presets}</legend>
				{presets.map((value) => (
					<button
						key={value}
						type="button"
						className="chip-button"
						aria-pressed={amount === value}
						onClick={() => setAmount(value)}
						title={lensLabel(value, locale)}
					>
						<LensPrice lenses={value} locale={locale} />
					</button>
				))}
			</fieldset>
			<output
				id={`${amountId}-total`}
				className="request-total"
				aria-live="polite"
			>
				{total ? (
					<>
						<span>
							{fill(copy.total, { lenses: lensLabel(amount, locale), total })}
						</span>{" "}
						<span className="request-unit">
							{fill(copy.unitPrice, { price: formatMicros(price, locale) })}
						</span>
					</>
				) : (
					<span>
						{fill(copy.amountOutOfRange, {
							min: formatNumber(min, locale),
							max: formatNumber(max, locale),
						})}
					</span>
				)}
			</output>

			<fieldset className="request-contact">
				<legend>{copy.contactLegend}</legend>
				<div className="segmented">
					{(["WHATSAPP", "TELEGRAM"] as const).map((value) => (
						<label key={value}>
							<input
								type="radio"
								name="contact-channel"
								value={value}
								checked={channel === value}
								onChange={() => {
									touched.current = true;
									setChannel(value);
									setContactError("");
								}}
							/>
							<span>
								{value === "WHATSAPP" ? copy.whatsapp : copy.telegram}
							</span>
						</label>
					))}
				</div>
				<div className="account-field">
					<label htmlFor={contactId}>
						{channel === "WHATSAPP" ? copy.whatsappLabel : copy.telegramLabel}
					</label>
					<input
						id={contactId}
						name="contact"
						type={channel === "WHATSAPP" ? "tel" : "text"}
						inputMode={channel === "WHATSAPP" ? "tel" : "text"}
						autoComplete={channel === "WHATSAPP" ? "tel" : "off"}
						dir="ltr"
						value={handle}
						onChange={(event) => {
							touched.current = true;
							setHandle(event.currentTarget.value);
						}}
						aria-describedby={`${contactId}-hint`}
						aria-invalid={contactError ? true : undefined}
						aria-errormessage={contactError ? `${contactId}-error` : undefined}
						maxLength={64}
						required
					/>
					<small id={`${contactId}-hint`} className="account-hint">
						{channel === "WHATSAPP" ? copy.whatsappHint : copy.telegramHint}{" "}
						{copy.contactWhy}
					</small>
					{contactError && (
						<p id={`${contactId}-error`} className="account-error" role="alert">
							{contactError}
						</p>
					)}
				</div>
			</fieldset>

			<div className="account-field">
				<label htmlFor={noteId}>{copy.note}</label>
				<textarea
					id={noteId}
					name="note"
					rows={2}
					maxLength={500}
					value={note}
					onChange={(event) => setNote(event.currentTarget.value)}
					aria-describedby={`${noteId}-hint`}
				/>
				<small id={`${noteId}-hint`} className="account-hint">
					{copy.noteHint}
				</small>
			</div>
			{error && (
				<p className="account-error" role="alert">
					{error}
				</p>
			)}
			<button
				type="submit"
				className="button"
				disabled={busy}
				title={copy.submit}
			>
				{copy.submit}
			</button>
		</form>
	);
}

function RequestSent({
	copy,
	locale,
	request,
	onAnother,
}: {
	copy: Copy;
	locale: Locale;
	request: LensRequest;
	onAnother: () => void;
}) {
	const heading = useRef<HTMLHeadingElement>(null);
	useEffect(() => heading.current?.focus(), []);
	const cents = centsOf(request.totalUsd);
	return (
		<div className="request-sent">
			<h3 ref={heading} tabIndex={-1}>
				{copy.sentTitle}
			</h3>
			<p>
				{fill(copy.sentSummary, {
					lenses: lensLabel(request.lenses, locale),
					total: formatCents(cents, locale),
				})}
			</p>
			<p>
				{fill(copy.sentBody, {
					channel:
						request.contactChannel === "WHATSAPP"
							? copy.whatsapp
							: copy.telegram,
					handle: request.contactHandle,
				})}
			</p>
			<button
				type="button"
				className="text-link"
				onClick={onAnother}
				title={copy.another}
			>
				{copy.another}
			</button>
		</div>
	);
}

function Pager({
	copy,
	locale,
	page,
	pageSize,
	total,
	onPage,
}: {
	copy: Copy;
	locale: Locale;
	page: number;
	pageSize: number;
	total: number;
	onPage: (page: number) => void;
}) {
	const pages = Math.max(1, Math.ceil(total / pageSize));
	if (pages <= 1) return null;
	return (
		<nav className="pager" aria-label={copy.historyTitle}>
			<button
				type="button"
				className="text-link"
				disabled={page <= 1}
				onClick={() => onPage(page - 1)}
				title={copy.previous}
			>
				{copy.previous}
			</button>
			<span>
				{fill(copy.pageOf, {
					page: formatNumber(page, locale),
					pages: formatNumber(pages, locale),
				})}
			</span>
			<button
				type="button"
				className="text-link"
				disabled={page >= pages}
				onClick={() => onPage(page + 1)}
				title={copy.next}
			>
				{copy.next}
			</button>
		</nav>
	);
}

function RequestList({
	copy,
	locale,
	requests,
	onPage,
	onCancelled,
}: {
	copy: Copy;
	locale: Locale;
	requests: Page<LensRequest> | null;
	onPage: (page: number) => void;
	onCancelled: () => void;
}) {
	const [confirming, setConfirming] = useState<string | null>(null);
	const [error, setError] = useState("");
	if (!requests) return null;
	if (requests.data.length === 0)
		return <p className="muted">{copy.noRequests}</p>;
	async function cancel(id: string) {
		setError("");
		try {
			await cancelRequest(locale, id);
			setConfirming(null);
			onCancelled();
		} catch (caught) {
			setError(
				caught instanceof AccountApiError && caught.message
					? caught.message
					: getMessages(locale).account.requestFailed,
			);
		}
	}
	return (
		<>
			<ul className="request-list">
				{requests.data.map((request) => (
					<li key={request.id}>
						<div className="request-row">
							<LensPrice lenses={request.lenses} locale={locale} />
							<span>{formatCents(centsOf(request.totalUsd), locale)}</span>
							<span className={`status-chip ${request.status.toLowerCase()}`}>
								{copy.status[request.status]}
							</span>
							<time dateTime={request.createdAt} className="muted">
								{formatDate(request.createdAt, locale)}
							</time>
						</div>
						<p className="muted">
							{fill(copy.contactUsed, {
								channel:
									request.contactChannel === "WHATSAPP"
										? copy.whatsapp
										: copy.telegram,
								handle: request.contactHandle,
							})}
						</p>
						{request.status === "REJECTED" && request.rejectionReason && (
							<p className="request-reason">
								{fill(copy.reason, { reason: request.rejectionReason })}
							</p>
						)}
						{request.status === "PENDING" &&
							(confirming === request.id ? (
								<div className="actions request-confirm">
									<span>
										{fill(copy.cancelConfirm, {
											lenses: lensLabel(request.lenses, locale),
										})}
									</span>
									<button
										type="button"
										className="button"
										onClick={() => void cancel(request.id)}
										title={copy.cancel}
									>
										{copy.cancel}
									</button>
									<button
										type="button"
										className="text-link"
										onClick={() => setConfirming(null)}
										title={copy.keep}
									>
										{copy.keep}
									</button>
								</div>
							) : (
								<button
									type="button"
									className="text-link"
									onClick={() => setConfirming(request.id)}
									title={copy.cancel}
								>
									{copy.cancel}
								</button>
							))}
					</li>
				))}
			</ul>
			{error && (
				<p className="account-error" role="alert">
					{error}
				</p>
			)}
			<Pager
				copy={copy}
				locale={locale}
				page={requests.page}
				pageSize={requests.pageSize}
				total={requests.total}
				onPage={onPage}
			/>
		</>
	);
}

function History({
	copy,
	locale,
	features,
}: {
	copy: Copy;
	locale: Locale;
	features: FeaturePrice[];
}) {
	const [page, setPage] = useState(1);
	const [history, setHistory] = useState<Page<Transaction> | null>(null);
	const [failed, setFailed] = useState(false);
	const load = useCallback(async () => {
		try {
			setHistory(await getTransactions(locale, page));
			setFailed(false);
		} catch {
			setFailed(true);
		}
	}, [locale, page]);
	useEffect(() => {
		void load();
	}, [load]);
	if (failed)
		return (
			<div className="actions">
				<p className="account-error">{copy.loadFailed}</p>
				<button
					type="button"
					className="text-link"
					onClick={() => void load()}
					title={copy.retry}
				>
					{copy.retry}
				</button>
			</div>
		);
	if (!history) return null;
	if (history.data.length === 0)
		return <p className="muted">{copy.noHistory}</p>;
	return (
		<>
			<ul className="history-list">
				{history.data.map((row) => (
					<li key={row.id}>
						<span className="history-what">
							<span>
								{fill(copy.types[row.type], {
									feature: featureName(features, row.feature, locale),
								})}
							</span>
							{row.note && <span className="muted">“{row.note}”</span>}
						</span>
						<span
							className={
								row.delta > 0 ? "history-delta credit" : "history-delta"
							}
						>
							<LensPrice lenses={row.delta} locale={locale} signed />
						</span>
						<time dateTime={row.createdAt} className="muted">
							{formatDate(row.createdAt, locale)}
						</time>
					</li>
				))}
			</ul>
			<Pager
				copy={copy}
				locale={locale}
				page={history.page}
				pageSize={history.pageSize}
				total={history.total}
				onPage={setPage}
			/>
		</>
	);
}
