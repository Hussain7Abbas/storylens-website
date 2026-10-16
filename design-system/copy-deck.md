# Copy deck and evidence

Final English/Arabic headlines, paragraphs, CTA labels, original story passage, and FAQs live in `src/i18n/messages/{en,ar}.json`. `messages.ts` enforces the same structure for both locales. English hero: “Stay inside the story.” Arabic hero: “ابقَ في عالم الحكاية.” Primary CTA: install from verified Chrome store ID; no rating, user count, or guaranteed price claim.

| Claim | Source |
| --- | --- |
| Keyword colors, aliases, notes, images, versions, click/hover tooltips | extension src/utils/keyword-tooltip.ts; src/lib/tooltip-trigger.ts; docs/extension.md |
| Bilingual names/descriptions, translation links and Arabic matching | extension src/utils/{translation,arabic}.ts; src/lib/offline; docs/extension.md |
| Personal category/nature colors, night light, tooltip size and optional word effects | extension src/lib/personal-colors; src/lib/{night-light,font-size,keyword-effects}.ts; docs/extension.md |
| Replacements | extension replacement UI and content processing; docs/extension.md |
| Multiple popup tabs, text picker and per-tab AI progress | extension src/entrypoints/content/page-popup-launcher.ts; src/lib/launcher-frame; docs/extension.md |
| Shared catalogue and role limits | backend src/routes/{novels,keywords,replacements}.ts; src/middleware/authorize.ts |
| Downloaded reference data/queued edits | extension src/lib/offline; docs/extension.md |
| Cloud/Desktop AI choice for text and images; no automatic legacy selector fallback | extension src/lib/ai-source; src/lib/desktop-client/selector-detection-runner.ts; docs/extension.md |
| Local companion and selected provider | client src/{server,service,providers}; docs/client.md |
| Shared chapter covers, reference images, reuse and default-off automatic generation | extension src/lib/chapter-cover; client src/providers/image.ts; docs/extension.md; privacy 1.5.0 |
| Windows, macOS Intel/Apple Silicon and Linux desktop installers; unsigned packages | client .github/workflows/build.yml; docs/client.md; GitHub release v3.7.0 assets verified 2026-10-16 |
| Arabic and Firefox source builds | extension src/i18n; wxt.config.ts and Makefile |
| Website account works without the extension; an installed extension signs in from it | website src/components/account/AccountApp.tsx, src/lib/account/reconcile.ts; backend src/routes/web-session.ts; docs/website.md "Account pages" |
| Lens prices, trial and request limits (shown from the API only) | backend src/routes/billing.ts `GET /pricing`; src/lib/billing/config.ts |
| Lenses charged at start, refunded on failure, free retry, never expire | backend src/lib/ai/cloud/actions.ts; pricing-plan D5, D19 |
| Payment arranged by contacting the reader; lenses added after approval | backend src/routes/billing.ts, src/routes/admin/billing.ts; pricing-plan D9, D21 |
| Providers that keep no data preferred, others allowed | backend src/lib/ai/openrouter-provider.ts; pricing-plan D18 |
| License | LICENSE.md |
| Website analytics require consent; extension analytics has a separate switch | website src/lib/analytics.ts; src/components/layout/AnalyticsConsent.tsx; privacy 1.5.0 |

The demo passage is original and is not taken from a novel. The reading panel is an illustrative mock, not a screenshot of the extension. The companion download CTA opens the latest GitHub release; v3.7.0 has all five platform installers and SHA256SUMS. No live Firefox store link was verified.

The 2026-10-16 marketing refresh covers the reading and AI changes through 3.7.0 in both languages, including the pricing FAQ and `public/llms.txt`. Prices remain API-owned. Chapter covers are shared, automatic generation is off by default, and desktop images use Codex independently of the text provider. The privacy policy already describes these flows; this refresh changes no data handling.
