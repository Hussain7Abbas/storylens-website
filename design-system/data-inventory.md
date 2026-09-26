# Data handling inventory — verified 2026-09-27

Source snapshots: backend `6a800550c57c3e022aebf40633adeb4337edc9da`, extension `78b3c8e87603d9be46922f7612ec2e76eecb65d4`, client `a1ee92e07ab21ddd883b074e381d8406a1e5a1b8`.

| Data / behavior | Evidence | Policy limit |
| --- | --- | --- |
| User email/name/username/hash/role/verification | backend prisma/schema.prisma; src/routes/accounts.ts | Guest gets synthetic email; registered account supplies email |
| Session token/expiry; optional IP/user agent fields | schema; src/lib/auth/session.ts; src/lib/auth/index.ts | Schema supports metadata; no blanket statement every custom login populates it; no immediate expiry cleanup promise |
| Shared reference catalogue | novels/keywords/replacements routes and middleware/authorize.ts | Authenticated reads, role-limited writes; not private |
| Images and URL metadata | storage/helpers.ts and routes/files.ts | ImgBB upload; no verified guarantee that removing DB reference erases third-party copy |
| Optional selector detection | extension node-selector-form.tsx handleAutoDetect; utils/detect-chapter-selectors.ts; backend routes/ai.ts | User action, page URL+HTML → backend/OpenRouter; route has no DB write; form save persists selectors separately |
| Provider selection | backend lib/ai/client.ts | Google Gemini default configurable; no zero-retention guarantee |
| Summaries | extension lib/desktop-client; client server/service/providers; docs/client.md | Requested page body sanitized, may retain personal content; local transport then own provider; no backend summary path |
| Local preferences and downloaded references | extension lib/offline and popup settings; client config.ts | Local until cleared; queue sends supported edits when synced; desktop uninstall does not promise settings removal |
| Extension permissions | extension wxt.config.ts and content entry point | tabs/storage/alarms/unlimitedStorage, HTTP(S) content script, API and loopback host access |
| History | extension content/API flows | No dedicated visited-URL list found; avoid claiming no URL/chapter data ever reaches API |
| Logs | backend plugins/logger.ts; server /etc/logrotate.d/nginx | method/status/path/errors; Nginx daily rotate 14; app-log TTL not established |
| Account deletion | accounts.ts; Better Auth configuration | No enabled self-service deletion path verified; use manual private requests |
| Website | website controls, static export, Nginx config | Theme localStorage, URL locale, Cloudflare/network logs; no analytics |
| Hosting region/transfers | ssh raseen infrastructure | Host country/provider not authoritatively established; do not promise single-country processing or contractual transfer terms |

No ad integration, sale, or Story Lens model-training path was found in the inspected implementation. This does not bind upstream AI providers. Provider privacy links are included rather than inventing retention periods.

Legal choices pending owner review: operator identity, public private-contact address, age threshold and jurisdiction wording. Draft proposes Hussain Abbas, age 13/16, and mandatory applicable law without exclusive venue. Professional legal review is recommended before treating the documents as store-ready.
