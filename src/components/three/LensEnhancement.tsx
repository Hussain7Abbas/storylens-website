"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const Scene = dynamic(() => import("./LensScene").then((m) => m.LensScene), {
	ssr: false,
});
export function LensEnhancement() {
	const ref = useRef<HTMLDivElement>(null);
	const [enabled, setEnabled] = useState(false);
	useEffect(() => {
		const query = matchMedia(
			"(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
		);
		const connection = (
			navigator as Navigator & { connection?: { saveData?: boolean } }
		).connection;
		if (
			!query.matches ||
			navigator.hardwareConcurrency < 4 ||
			connection?.saveData
		)
			return;
		const canvas = document.createElement("canvas");
		const gl = canvas.getContext("webgl2");
		if (!gl) return;
		gl.getExtension("WEBGL_lose_context")?.loseContext();
		let timer: ReturnType<typeof setTimeout>;
		const observer = new IntersectionObserver(([entry]) => {
			clearTimeout(timer);
			if (entry?.isIntersecting && !document.hidden)
				timer = setTimeout(() => setEnabled(true), 1800);
			else setEnabled(false);
		});
		if (ref.current) observer.observe(ref.current);
		const visibility = () => {
			if (document.hidden) setEnabled(false);
		};
		const motion = () => {
			if (!query.matches) setEnabled(false);
		};
		document.addEventListener("visibilitychange", visibility);
		query.addEventListener("change", motion);
		return () => {
			clearTimeout(timer);
			observer.disconnect();
			document.removeEventListener("visibilitychange", visibility);
			query.removeEventListener("change", motion);
		};
	}, []);
	return (
		<div ref={ref} className="lens-enhancement" aria-hidden="true">
			{enabled && <Scene />}
		</div>
	);
}
