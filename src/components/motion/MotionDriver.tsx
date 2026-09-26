"use client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);
export function MotionDriver() {
	useGSAP(() => {
		const media = gsap.matchMedia();
		media.add("(prefers-reduced-motion: no-preference)", () => {
			gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
				gsap.from(el, {
					y: 24,
					opacity: 0,
					duration: 0.65,
					ease: "power2.out",
					scrollTrigger: { trigger: el, start: "top 95%", once: true },
					immediateRender: false,
				});
			});
		});
		void document.fonts.ready.then(() => ScrollTrigger.refresh());
		return () => media.revert();
	});
	return null;
}
