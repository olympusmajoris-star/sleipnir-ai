# Studio expansion — 2026-11-14

The existing GitHub Pages workshop and shared project are retained. This release changes studio tools and adds an immutable v3 generic app renderer. Earlier renderer folders, active Raven settings and the working native widget are retained. No app release or catalog review was applied during implementation.

## Implemented

- Existing grouped navigation, contextual controls, help, save/lock, named whole-page looks, shared assets and original black-hole controls remain available.
- Product image crop/upload, connected white-edge removal, transparent-margin trim and original-image restoration.
- Full filtered image sweeps: load/dimension checks, blank/transparent images, white borders, exact image hashes. Network/CORS failures remain unverified.
- Reversible draft cleanup: whitespace correction and exclusion of blank/missing/placeholder images and exact duplicates from renders. Full names, package weights, pricing, variants and store identities distinguish products. Newer edits survive cleanup undo. This does not delete live products.
- Owner-reviewed catalog additions/corrections with exact before/after values, atomic transactions, idempotency, conflict checks, original image preservation and change history. Restoring corrections refuses to overwrite newer work. Batches that added products cannot automatically delete those additions.
- New store creation sets `is_live=false`; existing store name/address duplicate checks apply. Store metadata editing is still a studio draft; phone/description are explicitly studio notes.
- Render queue produces exact-product composites on chosen fixture photos; shelf rectangles are visually adjustable, overcrowding/overlap is rejected, white-edge preparation is optional, and private outputs carry stable product maps.
- The foreground renderer lives in the workshop and survives editor-page navigation. It requires an open tab and owner connection.
- Kept rendered displays retain product buttons in renderer v3 through resizing/cropping. Existing product callbacks still require native routing. Printed prices are snapshots, not dynamic checkout prices.
- Windows connector v1.3 includes optional current-user encrypted session persistence, automatic connector startup, reconnect retries and a forget action. Retail collection still requires the staging Forge contract. Cloud preparation can run independently with FFmpeg. No Windows installation was performed remotely.

## Verification

The previous release passed 147 JavaScript, 10 Python and 68 standalone Dart contract checks. Current effects/exporter checks are recorded below. Catalog SQL transaction tests cover creation, insert, update, idempotency, restore, stale/missing review rejection and unauthorized rejection; every test write was rolled back. No catalog-review security advisory was reported. A real product image was rendered on a calibrated shelf photo, then re-rendered with white-edge cleanup; the 1800 × 1200 output retained the exact ID, name, price and facings.

Browser preview reload was previously denied by the browser URL policy. This release therefore has automated and image-output verification, not a new interactive browser/device pass. Windows DPAPI/startup, authenticated browser output upload, and FlutterFlow compile/device behavior remain unverified in their actual environments.

## Work that still needs the original environment or source

1. Install/connect the PC connector and prove one complete scrape/reconnect/retry round trip against the installed Forge. The connector cannot run while that PC is off and does not launch the underlying collector.
2. Original store, grocery, menu, cart, checkout, delivery, tracking, camera, live and Raven widget sources have now been received. Connect and verify their actual FlutterFlow routes; source receipt does not certify native layout or interaction parity. The separate StoreEntrancesStudioTest preserves the original cart and can substitute one validated rendered display; Target remains on its existing GroceryAisle photo plan.
3. Finish native routing and device checks for each transferred page, including product/order actions, then test apply/rollback. A brand-new page needs initial native route/data wiring; it does not become an app screen merely by drawing it.
4. Generative photoreal interiors, perspective/lighting reconstruction and automatic recognition of wrong-product images remain separate work. The current deterministic photo compositor does not fulfill those jobs.
5. Raven installation stays on hold. A future test must use a separate widget name, preserving the existing working widget.

## November 14 effects and native test extension

- Construction & cloud motion editor, trim/crop/saved slices, background key/soft edges, loop preparation, five custom cloud source slots, behavior/randomness controls, undo/locks/looks and timestamp conflict checks. See `cloud-and-construction-controls.md`.
- `AsgardRavenStudioTest`, `AsgardRavenEffectsTest` and `StoreEntrancesStudioTest` are separately named full-file exports. No installed widget or app release was changed.
- Shared assistant client/tool catalog exposes current designs/media, owner jobs/workers and private output retrieval. Opus must confirm his connection separately; the older Nov 10 Asgard MCP snapshot is not the current shared design.
- Cloud conversion verified on real moving frames with transparent edges. Database cloud claims and cross-user isolation verified with rolled-back test rows. Full native exports parse; FlutterFlow compile/device, Windows and interactive browser verification are still pending.

Current verification: 166 JavaScript checks and 14 Python checks passed. Default/custom-source Effects test exports parsed with the official Dart formatter and retained original embedded asset bytes. Original Earth/cloud asset requests succeeded, and a canvas output check rendered both the construction stages and cloud scene. Browser interaction, MediaRecorder output on Danny’s browser, FlutterFlow/device and Windows environment checks remain unverified.

## Windows cloud processing verified

On November 14 at 8:34 PM America/New_York, Danny's v1.4 Windows connector completed `cloud_prepare` job `bcacfc79-b29a-458a-8642-ee98bac657da` and uploaded its private animated WebP. The original cloud/app stayed unchanged. Current connectivity and cloud processing are proven; native FlutterFlow/device, browser export, PC restart persistence and retail scrape/reconnect checks remain separate. See `native-and-worker-connection.md` for measured output details.
