"use client";

import { ChevronDown, Expand, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { getMessages } from "@/i18n/messages";
import type { Locale } from "@/lib/site-config";

const screens = [
	"01-character-highlighting",
	"02-character-aliases",
	"03-chapter-versions",
	"04-text-replacement",
	"05-character-editor",
] as const;

export function ReadingShowcase({ locale }: { locale: Locale }) {
	const m = getMessages(locale).readingShowcase;
	const dialog = useRef<HTMLDialogElement>(null);
	const video = useRef<HTMLVideoElement>(null);
	const caption = useRef<HTMLSpanElement>(null);
	const [captionText, setCaptionText] = useState("");
	const [selected, setSelected] = useState(0);
	const item = m.items[selected];
	const imagePath = (index: number) =>
		`/images/reading/${screens[index]}-${locale}.webp`;
	const sourceSet = (index: number) =>
		`/images/reading/${screens[index]}-${locale}-small.webp 640w, /images/reading/${screens[index]}-${locale}-medium.webp 960w, ${imagePath(index)} 1280w`;
	// The last two figures sit two-across on wide screens; the rest three.
	const sizes = (index: number) =>
		`(max-width: 700px) calc(100vw - 2.5rem), (max-width: 1000px) 47vw, ${index >= 3 ? "33rem" : "22rem"}`;

	useEffect(() => {
		const player = video.current;
		const overlay = caption.current;
		if (!player || !overlay) return;
		const track = player.textTracks[0];
		if (!track) return;
		track.mode = "hidden";
		const syncNativeCaptions = () => {
			overlay.hidden = track.mode === "showing";
		};
		player.textTracks.addEventListener("change", syncNativeCaptions);
		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
		let frame = 0;
		let lastText = "";
		const updateCaption = () => {
			const cue = track.activeCues?.[0] as VTTCue | undefined;
			const text = cue?.text ?? "";
			if (text !== lastText) {
				lastText = text;
				setCaptionText(text);
			}
			const time = player.currentTime;
			const fade = 0.45;
			const opacity = cue
				? reducedMotion.matches
					? 1
					: Math.max(
							0,
							Math.min(
								1,
								(time - cue.startTime) / fade,
								(cue.endTime - time) / fade,
							),
						)
				: 0;
			overlay.style.opacity = String(opacity);
		};
		const tick = () => {
			updateCaption();
			if (!player.paused && !player.ended) frame = requestAnimationFrame(tick);
		};
		const start = () => {
			cancelAnimationFrame(frame);
			tick();
		};
		const stop = () => {
			cancelAnimationFrame(frame);
			updateCaption();
		};
		player.addEventListener("play", start);
		player.addEventListener("pause", stop);
		player.addEventListener("seeked", updateCaption);
		player.addEventListener("timeupdate", updateCaption);
		track.addEventListener("cuechange", updateCaption);
		return () => {
			cancelAnimationFrame(frame);
			player.removeEventListener("play", start);
			player.removeEventListener("pause", stop);
			player.removeEventListener("seeked", updateCaption);
			player.removeEventListener("timeupdate", updateCaption);
			track.removeEventListener("cuechange", updateCaption);
			player.textTracks.removeEventListener("change", syncNativeCaptions);
		};
	}, []);

	return (
		<section
			id="walkthrough"
			className="container section reading-showcase"
			aria-labelledby="walkthrough-title"
		>
			<div className="section-heading">
				<p className="eyebrow">{m.eyebrow}</p>
				<h2 id="walkthrough-title">{m.title}</h2>
				<p className="section-intro">{m.intro}</p>
			</div>
			<div className="walkthrough-layout">
				<div className="walkthrough-video">
					<video
						ref={video}
						controls
						playsInline
						preload="none"
						poster={`/images/reading/${screens[0]}-${locale}-medium.webp`}
						aria-labelledby="walkthrough-video-title"
						aria-describedby="walkthrough-video-description"
					>
						<source
							src={`/videos/extension/demo-${locale}.mp4`}
							type="video/mp4"
						/>
						<track
							kind="captions"
							src={`/videos/extension/demo-${locale}.vtt`}
							srcLang={locale}
							label={m.captions}
							default
						/>
						<a href={`/videos/extension/demo-${locale}.mp4`}>
							{m.videoFallback}
						</a>
					</video>
					<span
						ref={caption}
						className="walkthrough-caption"
						lang={locale}
						dir={locale === "ar" ? "rtl" : "ltr"}
						aria-hidden="true"
					>
						{captionText}
					</span>
				</div>
				<div className="walkthrough-copy">
					<p className="walkthrough-duration">{m.duration}</p>
					<h3 id="walkthrough-video-title">{m.videoTitle}</h3>
					<p id="walkthrough-video-description">{m.videoDescription}</p>
					<details className="walkthrough-transcript">
						<summary>
							{m.transcript}
							<ChevronDown size={18} strokeWidth={1.75} aria-hidden="true" />
						</summary>
						<ol>
							{m.steps.map((step) => (
								<li key={step}>{step}</li>
							))}
						</ol>
					</details>
				</div>
			</div>
			<div className="reading-gallery-heading">
				<h3>{m.galleryTitle}</h3>
				<p>{m.galleryIntro}</p>
			</div>
			<div className="reading-gallery">
				{m.items.map((screen, index) => (
					<figure key={screens[index]}>
						<a
							className="reading-gallery-image"
							href={imagePath(index)}
							aria-label={`${m.enlarge}: ${screen.title}`}
							aria-haspopup="dialog"
							onClick={(event) => {
								event.preventDefault();
								setSelected(index);
								dialog.current?.showModal();
							}}
						>
							<picture>
								<source srcSet={sourceSet(index)} sizes={sizes(index)} />
								<Image
									src={imagePath(index)}
									alt={screen.alt}
									width={1280}
									height={800}
									unoptimized
									loading="lazy"
								/>
							</picture>
							<span className="reading-expand">
								<Expand size={18} strokeWidth={1.75} aria-hidden="true" />
							</span>
						</a>
						<figcaption>
							<h4>{screen.title}</h4>
							<p>{screen.description}</p>
						</figcaption>
					</figure>
				))}
			</div>
			<dialog
				ref={dialog}
				className="reading-lightbox"
				aria-labelledby="reading-lightbox-title"
			>
				<div className="reading-lightbox-heading">
					<h2 id="reading-lightbox-title">{item?.title}</h2>
					<button
						type="button"
						onClick={() => dialog.current?.close()}
						aria-label={m.close}
					>
						<X size={22} strokeWidth={1.75} aria-hidden="true" />
					</button>
				</div>
				<Image
					src={imagePath(selected)}
					alt={item?.alt ?? m.title}
					width={1280}
					height={800}
					unoptimized
				/>
				<p>{item?.description}</p>
			</dialog>
		</section>
	);
}
