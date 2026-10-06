"use client";
import { useEffect, useRef, useState } from "react";
import { getMessages } from "@/i18n/messages";
import { markNoticesSeen, type Notice } from "@/lib/billing/api";
import type { Locale } from "@/lib/site-config";
import { LensCoin } from "./LensCoin";
import { lensLabel } from "./LensPrice";
import { SparkBurst } from "./SparkBurst";

/**
 * Celebrates the gifts and purchases the website has not shown yet (decision
 * D12): gifts get a dialog with a sparkle burst, purchases a plain notice.
 * Then they are marked seen for the website only; the extension
 * celebrates on its own.
 */
export function GiftCelebration({
	locale,
	notices,
	onTopUp,
}: {
	locale: Locale;
	notices: Notice[];
	onTopUp: (text: string) => void;
}) {
	const copy = getMessages(locale).billing;
	const dialog = useRef<HTMLDialogElement>(null);
	const opener = useRef<Element | null>(null);
	const shown = useRef(false);
	const [gifts, setGifts] = useState<Notice[]>([]);

	useEffect(() => {
		if (shown.current || notices.length === 0) return;
		shown.current = true;
		const giftNotices = notices.filter((notice) => notice.type !== "TOP_UP");
		const topUps = notices.filter((notice) => notice.type === "TOP_UP");
		if (topUps.length > 0) {
			const lenses = topUps.reduce((sum, notice) => sum + notice.lenses, 0);
			onTopUp(copy.topUpArrived.replace("{lenses}", lensLabel(lenses, locale)));
		}
		if (giftNotices.length > 0) {
			setGifts(giftNotices);
			opener.current = document.activeElement;
			dialog.current?.showModal();
		}
		void markNoticesSeen(
			locale,
			notices.map((notice) => notice.id),
		).catch(() => {});
	}, [notices, locale, onTopUp, copy.topUpArrived]);

	const total = gifts.reduce((sum, notice) => sum + notice.lenses, 0);
	const trialOnly = gifts.every((notice) => notice.type === "TRIAL_GIFT");
	const notes = gifts.flatMap((notice) => (notice.note ? [notice.note] : []));
	const close = () => dialog.current?.close();

	return (
		<dialog
			ref={dialog}
			className="gift-dialog"
			aria-labelledby="gift-title"
			onClose={() => {
				if (opener.current instanceof HTMLElement) opener.current.focus();
			}}
		>
			{gifts.length > 0 && <SparkBurst />}
			<LensCoin size={72} />
			<h2 id="gift-title">{copy.congrats}</h2>
			<p>
				{(trialOnly ? copy.trialGift : copy.adminGift).replace(
					"{lenses}",
					lensLabel(total, locale),
				)}
			</p>
			{notes.map((note) => (
				<blockquote key={note} className="gift-note">
					{note}
				</blockquote>
			))}
			<button
				type="button"
				className="button"
				onClick={close}
				title={copy.close}
			>
				{copy.close}
			</button>
		</dialog>
	);
}
