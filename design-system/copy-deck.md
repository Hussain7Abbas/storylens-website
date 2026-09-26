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
| License | LICENSE.md |
| No analytics on website | website source and dependency/asset network checks |

The demo passage is original and is not taken from a novel. The reading panel is an illustrative mock, not a screenshot of the extension. Desktop download claims are omitted because no release was returned by GitHub’s latest-release endpoint. No live Firefox store link was verified.
