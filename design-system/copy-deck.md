# Copy deck and evidence

Final English/Arabic headlines, paragraphs, CTA labels, original story passage, and FAQs live in `src/i18n/messages/{en,ar}.json`. `messages.ts` enforces the same structure for both locales. English hero: “Stay inside the story.” Arabic hero: “ابقَ في عالم الحكاية.” Primary CTA: install from verified Chrome store ID; no rating, user count, or guaranteed price claim.

| Claim | Source |
| --- | --- |
| Keyword colors, aliases, notes, versions, tooltip | extension src/utils/keyword-tooltip.ts; docs/extension.md |
| Replacements | extension replacement UI and content processing; docs/extension.md |
| Page launcher/text picker | extension page-popup utils and docs/extension.md |
| Shared catalogue and role limits | backend src/routes/{novels,keywords,replacements}.ts; src/middleware/authorize.ts |
| Downloaded reference data/queued edits | extension src/lib/offline; docs/extension.md |
| Optional chapter AI | backend src/routes/ai.ts; extension src/components/node-selector/node-selector-form.tsx |
| Local companion and selected provider | client src/{server,service,providers}; docs/client.md |
| Arabic and Firefox source builds | extension src/i18n; wxt.config.ts and Makefile |
| Website account works without the extension; an installed extension signs in from it | website src/components/account/AccountApp.tsx, src/lib/account/reconcile.ts; backend src/routes/web-session.ts; docs/website.md "Account pages" |
| Lens prices, trial and request limits (shown from the API only) | backend src/routes/billing.ts `GET /pricing`; src/lib/billing/config.ts |
| Lenses charged at start, refunded on failure, free retry, never expire | backend src/lib/ai/cloud/actions.ts; pricing-plan D5, D19 |
| Payment arranged by contacting the reader; lenses added after approval | backend src/routes/billing.ts, src/routes/admin/billing.ts; pricing-plan D9, D21 |
| Providers that keep no data preferred, others allowed | backend src/lib/ai/openrouter-provider.ts; pricing-plan D18 |
| License | LICENSE.md |
| No analytics on website | website source and dependency/asset network checks |

The demo passage is original and is not taken from a novel. The reading panel is an illustrative mock, not a screenshot of the extension. Desktop download claims are omitted because no release was returned by GitHub’s latest-release endpoint. No live Firefox store link was verified.
