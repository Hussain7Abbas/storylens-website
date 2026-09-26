"use client";
import dynamic from "next/dynamic";
import { type ReactNode, useEffect, useState } from "react";

const Motion = dynamic(
	() => import("./MotionDriver").then((m) => m.MotionDriver),
	{ ssr: false },
);
export function Reveal({ children }: { children: ReactNode }) {
	const [enabled, setEnabled] = useState(false);
	useEffect(() => {
		if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const timer = setTimeout(() => setEnabled(true), 2500);
		return () => clearTimeout(timer);
	}, []);
	return (
		<div>
			{children}
			{enabled && <Motion />}
		</div>
	);
}
