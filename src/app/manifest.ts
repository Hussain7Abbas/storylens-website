import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Story Lens",
		short_name: "Story Lens",
		start_url: "/en/",
		display: "browser",
		theme_color: "#6554c0",
		background_color: "#f7f7fb",
		icons: [
			{
				src: "/icons/icon-192.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "any",
			},
			{
				src: "/icons/icon-512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "any",
			},
		],
	};
}
