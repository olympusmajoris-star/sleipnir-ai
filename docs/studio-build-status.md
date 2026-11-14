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
- Windows connector v1.2 adds optional current-user encrypted session persistence, automatic connector startup, reconnect retries and a forget action. The existing staging Forge contract remains required. No Windows installation was performed remotely.

## Verification

147 JavaScript checks, 10 Python checks and 68 standalone Dart contract checks passed. Catalog SQL transaction tests cover creation, insert, update, idempotency, restore, stale/missing review rejection and unauthorized rejection; every test write was rolled back. No catalog-review security advisory was reported. A real product image was rendered on a calibrated shelf photo, then re-rendered with white-edge cleanup; the 1800 × 1200 output retained the exact ID, name, price and facings.

Browser preview reload was previously denied by the browser URL policy. This release therefore has automated and image-output verification, not a new interactive browser/device pass. Windows DPAPI/startup, authenticated browser output upload, and FlutterFlow compile/device behavior remain unverified in their actual environments.

## Work that still needs the original environment or source

1. Install/connect the PC connector and prove one complete scrape/reconnect/retry round trip against the installed Forge. The connector cannot run while that PC is off and does not launch the underlying collector.
2. Receive the missing original store, delivery, checkout and merchant widget sources. The supplied Asgard and Raven files do not contain those implementations. Generic canvas previews cannot certify matching every original app layout or native behavior.
3. Finish native routing and device checks for each transferred page, including product/order actions, then test apply/rollback. A brand-new page needs initial native route/data wiring; it does not become an app screen merely by drawing it.
4. Generative photoreal interiors, perspective/lighting reconstruction and automatic recognition of wrong-product images remain separate work. The current deterministic photo compositor does not fulfill those jobs.
5. Raven installation stays on hold. A future test must use a separate widget name, preserving the existing working widget.
