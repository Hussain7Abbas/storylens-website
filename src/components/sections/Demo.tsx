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
	useEffect(() => {
		const updateStage = (event: Event) => {
			if (
				manual.current ||
				!(event instanceof CustomEvent) ||
				typeof event.detail !== "number"
			)
				return;
			const stage = event.detail;
			setHighlight(stage >= 1);
			setReplace(stage >= 2);
			setTooltip(stage >= 3);
			if (stage === 4) setStatus(m.demoStatus);
		};
		window.addEventListener("storylens-demo-stage", updateStage);
		return () =>
			window.removeEventListener("storylens-demo-stage", updateStage);
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
			<div className="reading-card demo-passage">
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
