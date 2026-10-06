"use client";
import { Check, Highlighter, MessageSquare, Replace } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getMessages } from "@/i18n/messages";
import type { Locale } from "@/lib/site-config";
export function Demo({ locale }: { locale: Locale }) {
	const m = getMessages(locale);
	const [highlight, setHighlight] = useState(true);
	const [replace, setReplace] = useState(false);
	const [tooltip, setTooltip] = useState(false);
	const [status, setStatus] = useState("");
	const manual = useRef(false);
	const passage = useRef<HTMLDivElement>(null);
	// The demo used to be driven by a pinned scroll timeline. It now walks the
	// same five stages from the section's own progress through the viewport:
	// no pinning, no scroll hijacking, and nothing runs until it is on screen.
	useEffect(() => {
		const target = passage.current;
		if (!target) return;
		const allowed = matchMedia(
			"(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
		);
		if (!allowed.matches) return;
		let stage = -1;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (manual.current || !entry) return;
				const next = Math.min(4, Math.floor(entry.intersectionRatio * 5));
				if (next === stage) return;
				stage = next;
				setHighlight(next >= 1);
				setReplace(next >= 2);
				setTooltip(next >= 3);
				if (next === 4) setStatus(m.demoStatus);
			},
			{ threshold: Array.from({ length: 21 }, (_, step) => step / 20) },
		);
		observer.observe(target);
		return () => observer.disconnect();
	}, [m.demoStatus]);
	function update(action: () => void) {
		manual.current = true;
		action();
		setStatus(`${m.demoStatus} ${Date.now() % 2 ? "" : " "}`);
	}
	const text =
		m.passageBefore + (replace ? m.vale : m.passageName) + m.passageAfter;
	const names = [m.mira, replace ? m.vale : m.passageName, m.orin];
	const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
	const pieces = text.split(new RegExp(`(${escaped.join("|")})`, "g"));
	return (
		<div className="demo-grid">
			<div className="demo-controls">
				{[
					{
						label: m.highlight,
						value: highlight,
						set: () => setHighlight(!highlight),
						Icon: Highlighter,
					},
					{
						label: m.replace,
						value: replace,
						set: () => setReplace(!replace),
						Icon: Replace,
					},
					{
						label: m.tooltip,
						value: tooltip,
						set: () => setTooltip(!tooltip),
						Icon: MessageSquare,
					},
				].map(({ label, value, set, Icon }) => (
					<button
						type="button"
						key={label}
						aria-pressed={value}
						onClick={() => update(set)}
					>
						<Icon size={20} aria-hidden="true" />
						<span>{label}</span>
						<span className="check" aria-hidden="true">
							{value ? <Check size={16} /> : null}
						</span>
					</button>
				))}
				<p className="muted">{m.demoNote}</p>
				<p className="sr-only" aria-live="polite">
					{status}
				</p>
			</div>
			<div className="reading-card demo-passage" ref={passage}>
				<span className="demo-lens" aria-hidden="true" />
				<div className="chapter-label">{m.chapter}</div>
				<h3>{m.chapterTitle}</h3>
				<p className="story-text">
					{pieces.map((piece, index) =>
						names.includes(piece) ? (
							<mark
								key={`${index}-${piece}`}
								className={
									highlight
										? `character character-${names.indexOf(piece)}`
										: "character plain"
								}
								data-keyword={piece}
							>
								{piece}
							</mark>
						) : (
							<span key={`${index}-${piece}`}>{piece}</span>
						),
					)}
				</p>
				{tooltip && (
					<aside className="character-note">
						<strong>{m.note}</strong>
						<p>{m.noteBody}</p>
					</aside>
				)}
				<div className="reading-footer">
					<span>Story Lens</span>
					<span>07 / 128</span>
				</div>
			</div>
		</div>
	);
}
