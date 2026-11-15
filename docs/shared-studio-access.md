# Shared access for Danny, ChatGPT and Opus

The authoritative workshop is https://olympusmajoris-star.github.io/sleipnir-ai/workshop.html and the shared Supabase project is `afnihsdxtisneuyehatw`. Use the same existing project and repo, not a duplicate studio. Danny explicitly requested that both assistants be able to use his existing creations, items and tools on November 14.

## Entry points

`studio-tool-catalog.json` is the machine-readable tool map. `studio-agent-client.js` runs in a browser or Node with injected `fetch`, public project key and optional owner access token. It lists current designs, media, worker status and jobs, queues supported work, and obtains short-lived links for private outputs. It neither stores credentials nor bypasses existing authorization. Obtain credentials through the assistant's existing authorized connector/session; never put them in the board, source inventory or design documents.

| Work | Shared location | Execution |
| --- | --- | --- |
| Current page/scene designs | `studio_designs` (`raven`, `navigation`, `page_*`, `effects_convo`) | Read the current row before editing; preserve fields and locked values. |
| Reusable images, video, display fixtures | `shared-media-catalog.json`; live `studio` and `menu-images` bucket listings | Reuse the exact selected asset and inspect it before modifying. |
| Catalog and store work | Products & displays in the workshop; `products`, `stores` | Use reviewed catalog operations for live changes. |
| Cropping, cutouts, image checks | `catalog-image-tools.js`, `catalog-quality-core.js` | Browser image/canvas tools; save the result in the existing shared media area. |
| Product placement/rendering | `fixture-placement.js`, `studio-render-core.js` | Queue a `render` job with explicit boards/products/slots. Requires a connected renderer. |
| Retail collection | `studio_work_jobs`, kind `scrape` | Connected Windows Forge worker; staging/review only. |
| Image sweep | `studio_work_jobs`, kind `image_inspection` | Connected Studio renderer. |
| Completed output and product tap map | `studio_work_jobs.result.artifacts` and private `studio-job-artifacts` | Owner authorization. Do not publish private signed links on the board. |
| Construction, cloud motion and clip authoring | `studio-effects.html`; `studio_designs/effects_convo` | Grouped controls, saved looks, locked values and stale-write rejection. |
| Cloud footage preparation | `studio_work_jobs`, kind `cloud_prepare`; `forge/cloud_prepare_core.py` | Connected v1.4 PC worker with FFmpeg, or authorized assistant preparation with the same core. Reviewed result → frozen asset → separate native test. |
| Native Raven/conversation controls | `native-controls.html` | Original settings; separate Raven test widget first. |
| Native rendered aisle test | `native-store.html` | Original StoreEntrances source stays local; separate test export. Target remains on GroceryAisle. |
| App test/release versions | `studio_app_candidates`, `studio_app_releases`, `studio_app_channels` | Test copies and live release changes are distinct operations. |
| Coordination | `studio_board` | Status, scope and references only; no private source or credentials. |

## Current access evidence and limits

On November 14, ChatGPT read current shared designs including Raven updated at 20:13 UTC and shopping home at 20:14 UTC. The Asgard Design Studio connector separately returned Raven revision 799 dated November 10. Do not use that older snapshot to overwrite the current Supabase design. Compare destination, row identity and timestamp first.

Danny’s Windows worker connected on November 14 at about 8:32 PM America/New_York. Worker `339f050d-6ffe-4e39-b9ac-7319a02d3a30` advertised `cloud_prepare`, version 1.4.0. Job `bcacfc79-b29a-458a-8642-ee98bac657da` completed at 8:34 PM and reached `review_ready`: a three-second test video derived from an existing public cloud asset produced a 640 × 426 animated WebP, 45 frames, 5.75 seconds and 440,896 bytes. The original source and app settings were retained. Check the current heartbeat before relying on the PC; download alone or an old heartbeat does not mean it is online. Retail scraping and restart/reconnect proof remain pending. GenAI photoreal interiors are not a supported job kind yet.

The browser's recently kept asset (`asgard-workspace-asset`) is local convenience state. Assistants should locate the same output through its shared completed job and product map, or through the saved page layer; do not assume access to another browser's localStorage. Unsaved edits and files that exist only on the PC are not shared until saved/uploaded.

Do not claim an active Opus connection merely because the shared endpoints exist. The board handoff asks Opus to confirm his reads and FlutterFlow wiring separately.

## Editing and synchronization

Existing studio autosave uses shared rows but is not a multi-editor merge engine. A read does not reserve a design. Coordinate edits on the board and compare `updated_at` immediately before a targeted write. If someone edited it, re-read and merge only the requested keys. Preserve a recoverable copy and `_studioEditor` locks/presets. Do not replace an entire design with a default template. The current browser can hold an older in-memory design; reload it before editing after another assistant's change. The new effects editor already uses a conditional timestamp save. Full concurrent-edit conflict handling for older editor pages remains pending.

Uploaded native widget files are private attachments, not public studio assets. The source inventory records names and fingerprints, not their contents. Opus must use his authorized FlutterFlow/private file access to obtain source; the public board must not relay full files. The SDK/pubspec lockfile and actual device test still need confirmation.
