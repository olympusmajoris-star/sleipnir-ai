# Studio expansion — 2026-11-14

Built on the existing gh-pages studio and shared Supabase project. No active app release, channel, catalog product, or renderer v1 was replaced.

## Available in the editor

- Five navigation levels: functional section, page/store, feature, topic, controls. Back/Forward, clickable path, remembered location, save before leaving, and preview remain available.
- Contextual controls, help, save-and-lock settings, protected layer identity, named complete page looks, and existing black-hole controls.
- Shared image/video categories, original folders, three new display fixtures, editable layers, text, price tags, frames, glows, shadows, movement, and swipe/scroll display panels.
- Full store catalog browsing, search and pagination, details, draft corrections, grouping, duplicate candidates, image checks, exact-product render briefs, original display records and replacement assets.
- Owner-only collection/render queue, worker status, pause/cancel/retry, staged product review, and PC connector. Store drafts and catalog corrections remain drafts.

## Verification

125 JavaScript checks and 6 connector checks pass. Original-control retention, renderer behavior, catalog pagination and app-release isolation are covered. The browser displayed the live Publix catalog and editor. Its preview reload was then blocked by browser policy, so the final startup-race and gesture fixes were verified through code checks rather than another browser pass. The live database review function returned the 210 staged Staples items (two-item test page).

## Remaining integrations

No Forge PC worker is connected. Scrape execution requires the installed staging-only Forge adapter and the PC connector to be running. Render jobs require a compatible renderer; creating a brief does not generate art. This workspace cannot start programs on Danny’s Windows PC.

Original native app screens and production callbacks still require their source and FlutterFlow integration/device verification. In particular the original Dart cloud conversation must remain the app screen until that integration is verified. App application remains separate from studio editing. Current source includes Asgard and AsgardRaven handoff files separately; this expansion does not replace them with web previews.
