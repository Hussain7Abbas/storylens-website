"use client";
import { AdaptiveDpr, MeshTransmissionMaterial } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { CanvasTexture, type Group, SRGBColorSpace } from "three";

function readPalette() {
	const style = getComputedStyle(document.documentElement);
	return {
		surface: style.getPropertyValue("--surface").trim(),
		ink: style.getPropertyValue("--ink").trim(),
		accent: style.getPropertyValue("--accent").trim(),
	};
}
function Chapter() {
	const [palette, setPalette] = useState(readPalette);
	useEffect(() => {
		const observer = new MutationObserver(() => setPalette(readPalette()));
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});
		return () => observer.disconnect();
	}, []);
	const texture = useMemo(() => {
		const canvas = document.createElement("canvas");
		canvas.width = 512;
		canvas.height = 640;
		const context = canvas.getContext("2d");
		if (!context) return new CanvasTexture(canvas);
		context.fillStyle = palette.surface;
		context.fillRect(0, 0, 512, 640);
		context.fillStyle = palette.ink;
		context.font = "24px Georgia, serif";
		const rtl = document.documentElement.dir === "rtl";
		context.direction = rtl ? "rtl" : "ltr";
		context.textAlign = rtl ? "right" : "left";
		const text =
			document.querySelector(".hero-page .story-text")?.textContent ??
			"Mira reached the archive before dawn. Vale held the last lantern.";
		const words = text.split(/\s+/);
		let line = "";
		let y = 110;
		for (const word of words) {
			const next = `${line} ${word}`.trim();
			if (context.measureText(next).width > 390 && line) {
				context.fillText(line, rtl ? 450 : 62, y);
				y += 44;
				line = word;
			} else line = next;
		}
		context.fillText(line, rtl ? 450 : 62, y);
		context.strokeStyle = palette.accent;
		context.lineWidth = 5;
		context.beginPath();
		context.moveTo(62, 65);
		context.lineTo(180, 65);
		context.stroke();
		const result = new CanvasTexture(canvas);
		result.colorSpace = SRGBColorSpace;
		return result;
	}, [palette]);
	useEffect(() => () => texture.dispose(), [texture]);
	return (
		<mesh position={[0, 0, -0.2]}>
			<circleGeometry args={[0.81, 48]} />
			<meshBasicMaterial map={texture} toneMapped={false} />
		</mesh>
	);
}
function Lens() {
	const mesh = useRef<Group>(null);
	const target = useRef({ x: 0, y: 0 });
	const { invalidate } = useThree();
	useEffect(() => {
		const move = (event: PointerEvent) => {
			target.current = {
				x: (event.clientX / innerWidth - 0.5) * 0.5,
				y: (event.clientY / innerHeight - 0.5) * 0.4,
			};
			invalidate();
		};
		window.addEventListener("pointermove", move, { passive: true });
		return () => window.removeEventListener("pointermove", move);
	}, [invalidate]);
	useFrame(() => {
		const item = mesh.current;
		if (!item) return;
		item.rotation.x += (target.current.y - item.rotation.x) * 0.15;
		item.rotation.y += (target.current.x - item.rotation.y) * 0.15;
		if (
			Math.abs(target.current.y - item.rotation.x) +
				Math.abs(target.current.x - item.rotation.y) >
			0.001
		)
			invalidate();
	});
	return (
		<group ref={mesh}>
			<mesh position={[0, 0, 0.12]} scale={[1, 1, 0.18]}>
				<sphereGeometry args={[0.82, 24, 16]} />
				<MeshTransmissionMaterial
					transmission={1}
					thickness={0.2}
					roughness={0.05}
					samples={2}
					resolution={128}
				/>
			</mesh>
			<mesh position={[0, 0, 0.12]}>
				<torusGeometry args={[0.82, 0.035, 12, 48]} />
				<meshStandardMaterial color="#92400e" metalness={0.5} roughness={0.2} />
			</mesh>
		</group>
	);
}
export function LensScene() {
	return (
		<Canvas
			dpr={[1, 1.5]}
			frameloop="demand"
			camera={{ position: [0, 0, 4.5], fov: 40 }}
			aria-hidden="true"
		>
			<ambientLight intensity={2} />
			<directionalLight position={[3, 4, 4]} intensity={4} />
			<Chapter />
			<Lens />
			<AdaptiveDpr pixelated />
		</Canvas>
	);
}
