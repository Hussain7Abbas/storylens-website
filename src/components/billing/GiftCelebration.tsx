"use client";
import { useEffect, useRef, useState } from "react";
import { getMessages } from "@/i18n/messages";
import { markNoticesSeen, type Notice } from "@/lib/billing/api";
import type { Locale } from "@/lib/site-config";
import { LensCoin } from "./LensCoin";
import { lensLabel } from "./LensPrice";

// The coin's four-point sparkle, the confetti's shape.
const SPARKLE =
	"M32 17.5c1.3 7.6 5.9 12.2 13.5 13.5-7.6 1.3-12.2 5.9-13.5 13.5-1.3-7.6-5.9-12.2-13.5-13.5 7.6-1.3 12.2-5.9 13.5-13.5z";
const COLORS = ["#6554c0", "#8371e0", "#b5a8f5", "#c9befa", "#26705e"];

/** One short burst; the library loads only when there is a gift, and never with reduced motion. */
async function burst(): Promise<void> {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	const { default: confetti } = await import("canvas-confetti");
	const sparkle = confetti.shapeFromPath({ path: SPARKLE });
	await confetti({
		particleCount: 90,
		spread: 75,
		startVelocity: 38,
		ticks: 120,
		origin: { y: 0.35 },
		colors: COLORS,
		shapes: [sparkle, "circle"],
		scalar: 1.1,
		disableForReducedMotion: true,
	});
}

/**
 * Celebrates the gifts and purchases the website has not shown yet (decision
 * D12): gifts get a dialog with confetti, purchases a plain notice. Then they
 * are marked seen for the website only; the extension celebrates on its own.
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
			void burst().catch(() => {});
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
