import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Story Lens",
		short_name: "Story Lens",
		start_url: "/en/",
		display: "browser",
		icons: [{ src: "/icon-small.png", sizes: "128x128", type: "image/png" }],
	};
}
