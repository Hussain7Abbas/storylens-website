"use client";
import { AdaptiveDpr, MeshTransmissionMaterial } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

function Lens() {
	const mesh = useRef<Mesh>(null);
	useFrame(({ pointer }) => {
		if (mesh.current) {
			mesh.current.rotation.x = pointer.y * 0.2;
			mesh.current.rotation.y = pointer.x * 0.2;
		}
	});
	return (
		<mesh ref={mesh} rotation={[0.25, -0.2, 0]}>
			<torusGeometry args={[1, 0.085, 16, 48]} />
			<MeshTransmissionMaterial
				color="#92400e"
				transmission={0.7}
				thickness={0.15}
				roughness={0.18}
				samples={2}
				resolution={128}
			/>
		</mesh>
	);
}
export function LensScene() {
	return (
		<Canvas
			dpr={[1, 1.5]}
			frameloop="demand"
			camera={{ position: [0, 0, 4], fov: 40 }}
			aria-hidden="true"
		>
			<ambientLight intensity={2} />
			<directionalLight position={[3, 4, 4]} intensity={4} />
			<Lens />
			<AdaptiveDpr pixelated />
		</Canvas>
	);
}
