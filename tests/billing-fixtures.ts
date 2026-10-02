/** Pricing as `GET /api/user/billing/pricing` returns it, shared by the billing and pricing tests. */
export const features = [
	{
		key: "page_summary",
		nameEn: "Summarize page",
		nameAr: "تلخيص الصفحة",
		descriptionEn: "A short summary of the chapter you are reading.",
		descriptionAr: null,
		lenses: 2,
		enabled: true,
		maxPromptChars: 64000,
	},
	{
		key: "character_image",
		nameEn: "Character image",
		nameAr: "صورة الشخصية",
		descriptionEn: null,
		descriptionAr: null,
		lenses: 3,
		enabled: true,
		maxPromptChars: 24000,
	},
	{
		key: "novel_context",
		nameEn: "Novel background research",
		nameAr: "البحث عن خلفية الرواية",
		descriptionEn: null,
		descriptionAr: null,
		lenses: 0,
		enabled: true,
		maxPromptChars: 8000,
	},
];

export function pricing(overrides: Record<string, unknown> = {}) {
	return {
		currency: "USD",
		available: true,
		lensPriceUsd: "0.010000",
		lensPriceMicros: 10000,
		trialLenses: 10,
		request: { min: 100, max: 50000, pendingMax: 3 },
		cloudAi: { enabled: true },
		features,
		...overrides,
	};
}
