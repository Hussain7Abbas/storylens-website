"use client";
import { type CSSProperties, useEffect, useState } from "react";

const COLORS = ["#6554c0", "#8371e0", "#b5a8f5", "#c9befa", "#26705e"];
const COUNT = 28;
/** Matches the longest spark animation in `globals.css`. */
const LIFETIME_MS = 1500;

type Spark = { id: number; style: CSSProperties };

function sparks(): Spark[] {
	return Array.from({ length: COUNT }, (_, index) => {
		const angle =
			((index / COUNT) * 360 + Math.random() * 12 - 6) * (Math.PI / 180);
		const distance = 90 + Math.random() * 120;
		return {
			id: index,
			style: {
				"--spark-x": `${Math.round(Math.cos(angle) * distance)}px`,
				"--spark-y": `${Math.round(Math.sin(angle) * distance - 30)}px`,
				"--spark-spin": `${Math.round(Math.random() * 600 - 300)}deg`,
				"--spark-scale": `${(0.5 + Math.random() * 0.75).toFixed(2)}`,
				"--spark-delay": `${Math.round(Math.random() * 140)}ms`,
				"--spark-color": COLORS[index % COLORS.length] ?? COLORS[0],
			} as CSSProperties,
		};
	});
}

/**
 * One short burst of the coin's own four-point sparkle, drawn with CSS
 * keyframes over a masked shape instead of a canvas library. It never renders
 * with reduced motion, and it removes itself once the particles have finished
 * so nothing keeps animating behind the dialog.
 */
export function SparkBurst() {
	const [particles, setParticles] = useState<Spark[]>([]);
	useEffect(() => {
		if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		setParticles(sparks());
		const timer = setTimeout(() => setParticles([]), LIFETIME_MS);
		return () => clearTimeout(timer);
	}, []);
	if (particles.length === 0) return null;
	return (
		<span className="gift-sparks" aria-hidden="true">
			{particles.map((spark) => (
				<span className="gift-spark" key={spark.id} style={spark.style} />
			))}
		</span>
	);
}
