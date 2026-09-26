"use client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);
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
			const heading = document.querySelector<HTMLElement>("#hero-title");
			if (heading && window.scrollY < 100) {
				const split = SplitText.create(heading, {
					type: document.documentElement.lang === "ar" ? "lines" : "words",
					autoSplit: true,
					onSplit: (self) =>
						gsap.from(self.words.length ? self.words : self.lines, {
							y: 16,
							opacity: 0.7,
							duration: 0.5,
							stagger: 0.04,
							ease: "power2.out",
						}),
				});
				gsap.context(() => {}).add(() => () => split.revert());
			}
			ScrollTrigger.create({
				start: 60,
				onUpdate: (self) =>
					document
						.querySelector(".header")
						?.classList.toggle("scrolled", self.scroll() > 60),
			});
			gsap.from(".step-number", {
				opacity: 0.5,
				duration: 0.6,
				stagger: 0.05,
				scrollTrigger: { trigger: "#how", start: "top 80%", once: true },
				immediateRender: false,
			});
		});
		media.add(
			"(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
			() => {
				let previous = -1;
				const timeline = gsap.timeline({
					scrollTrigger: {
						trigger: "#demo",
						start: "top 90px",
						end: "+=150%",
						pin: true,
						scrub: 0.5,
						onUpdate: (self) => {
							const stage = Math.min(4, Math.floor(self.progress * 5));
							if (stage !== previous) {
								previous = stage;
								window.dispatchEvent(
									new CustomEvent("storylens-demo-stage", { detail: stage }),
								);
							}
						},
					},
				});
				timeline
					.fromTo(
						".demo-lens",
						{
							x: document.documentElement.dir === "rtl" ? 100 : -100,
							opacity: 0,
						},
						{ x: 0, opacity: 1, duration: 1 },
					)
					.to(".demo-lens", {
						x: document.documentElement.dir === "rtl" ? -100 : 100,
						duration: 2,
					})
					.to(".demo-lens", { opacity: 0, duration: 1 });
			},
		);
		void document.fonts.ready.then(() => ScrollTrigger.refresh());
		return () => {
			media.revert();
			document.querySelector(".header")?.classList.remove("scrolled");
		};
	});
	return null;
}
