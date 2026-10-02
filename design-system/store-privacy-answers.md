# Store disclosure draft

Owner must review and submit through store dashboards; no store submission is part of the automated deployment.

Single purpose: improve web-novel reading through character reference highlighting, replacement rules, chapter recognition, and user-requested summaries.

Permissions: tabs for active-page actions; storage for preferences, pairing and analytics settings; alarms for sync; unlimitedStorage for offline reference data; HTTP(S) content scripts for reading tools; API host access for catalogue/accounts/sync; loopback host access for the paired companion; Google Analytics host access for configured usage events.

Data categories to disclose: account identifiers and credentials; contributed/reference catalogue content; website/page/chapter information for requested cloud or desktop summaries, suggestions, extraction, novel research, images and selector detection; lens transaction/request data and supplied WhatsApp or Telegram contact; necessary security/network diagnostics; usage events and supported reading-site hostnames when analytics is configured and enabled. A hostname reveals a visited site, so include web history in the dashboard disclosure. Desktop AI requests reach the user-selected provider; Cloud actions send content through the developer API to OpenRouter/model providers (and Exa for research), using deny routing with a disclosed fallback. Prompts/results/images are not retained in cloud usage rows; separately saved references/images are. Account/billing emails use Resend; uploads reach ImgBB; configured usage events reach Google Analytics. State that reference content is shared, not private.

Data is not sold, used for ads, or used for credit/lending. Do not claim Google API Limited Use certification because those APIs are not integrated. Chrome privacy URL: https://storylens.iscoded.com/en/privacy/ ; Arabic: https://storylens.iscoded.com/ar/privacy/ . Copy-ready localized drafts live in apps/extension/store/ and the umbrella docs/chrome-store/docs/. Firefox source build exists but no live AMO listing is verified. Use the same data handling disclosure when listing Firefox.
