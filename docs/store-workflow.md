# Shared store studio: agreed scope and build sequence

Owner: Danny. Recorded 2026-11-13, America/New_York.

This is the durable implementation checklist for the existing shared studio. Update each milestone with evidence, not just a claimed completion. Preserve the current URL, Opus navigation shell, all existing controls, saved designs, and all Asgard work. Do not create a replacement studio.

## Decisions already made

- Show only Danny's supplied store list in the main working folder. `store-scope.json` records the 122 exact store IDs, including all three Mezzaluna records. This is editor organization, not a change to app store availability.
- Stores with zero canonical products/menu items belong in **Stores with no info**. An address/name alone does not make the store stocked. Missing product images do NOT make it empty. Preserve all store records.
- Other populated stores, if added later, stay accessible separately until deliberately added to the working scope. Do not silently expand Danny's selected list.
- Selecting a store must eventually load its actual existing app design and all available store details, products, menus, prices, images, assets, and settings. A generic card preview is not the completed store editor.
- Controls stay grouped by feature, one relevant group at a time. Keep the preview visible while editing. Add controls without deleting earlier controls or changing unrelated layouts.
- Save draft is always available. Save & apply is allowed only after end-to-end transfer is verified. Changes must have version history, automatic backup, and rollback. Until that integration is proven, edits and scrape/render results remain staged.
- Use the existing Supabase as the shared store of records for the studio, Forge, render jobs, and app. Use stable store/product/asset IDs throughout. No repeated PowerShell windows or pasted patches in the normal workflow.

## Dependency order and acceptance criteria

### 1. Inventory and store foundation — deployed and verified; source adapters pending

- [x] Inspect current studio source and Supabase schema rather than reconstructing from screenshots.
- [x] Match the supplied store list to exact IDs and preserve the three Mezzaluna locations.
- [x] Add a read-only store summary obeying the existing stores/products access policies.
- [x] Separate selected stores, empty stores, and other populated stores without changing catalog records.
- [x] Show selected-store address, website/hours when present, product/menu count, and image-link count.
- [x] Page through the complete store inventory; failed fetches must not masquerade as empty stores.
- [x] Verify working/empty folders and a selected store's details in the deployed studio.
- [ ] Confirm current app and installed Forge source versions before implementing their adapters.

Pass condition: every supplied store remains findable; an approved store with zero images remains in the working list; empty stores remain editable; customer-facing store records are unchanged.

### 2. Shared store model, actual layouts, and drafts

- [ ] Inspect the current FlutterFlow store widgets/export and map each layout type to its existing data.
- [ ] Load actual shelf, refrigerator, freezer, produce-bin, storefront, menu, and board layouts with their asset references and product placements.
- [ ] Preserve existing products, orderable IDs, prices, sizes/options, category ordering, navigation, and app interactions.
- [ ] Define a versioned store document: store info, catalog references, ordered displays, display settings, assets, placements, labels, interactions, and source provenance.
- [ ] Add draft/version storage with concurrency checks so ChatGPT, Opus, and Danny do not overwrite newer edits.
- [ ] Add all-store product search with paging/filtering; category/group creation, regrouping, and bulk edits as drafts.
- [ ] Support creating a store and adding to either stocked or empty stores.

Pass condition: representative grocery, fast-food, sit-down, retail, and Valhalla stores match the current app before adding new editing behavior. The initial editor must not start blank or substitute an unrelated generic display.

### 3. Asset bins and direct canvas editing

- [ ] Inventory/reuse existing renders and storage paths; retain originals and store/product associations.
- [ ] Organize reusable bins: dry shelves, refrigerated shelves, freezers, produce bins, specialty racks/displays, menus, menu boards, storefront/interior assets, labels/styles/colors, and product imagery.
- [ ] Add click/select, add, drag, resize, arrange/layer, duplicate, replace, and remove with undo/redo and recovery.
- [ ] Controls include the settings required to recreate each selected object, including size, fit/crop, spacing, colors, label placement/style, and appropriate material/lighting options.
- [ ] Change menu board/display opens the relevant bin, then fits the selected design to the available screen/display dimensions and product placement map.
- [ ] Swipe or scroll is configurable per display, supports multiple seamlessly arranged panels, and preserves hit targets and product IDs.
- [ ] Keep real product names/prices/options data-driven wherever the existing app does so; do not bake inaccurate text/prices into replacement artwork.
- [ ] Keep shelves actually stocked with the approved product renders and working product interactions. A decorative flat placeholder is not a completed shelf.

Pass condition: a replacement fits without clipping/gaps, preserves product ordering/tap targets, and the edited result survives reload and undo.

### 4. Permanent Forge connection and catalog cleanup

- [ ] Inspect the installed Forge version and reuse its current scraper/collector, staging tables, run/checkpoint system, and adapters.
- [ ] Install/configure an automatically starting background worker once; normal operation is entirely from the studio.
- [ ] Add a subtle Scrape action on every store, including empty/new stores. Accept the store/site and user instructions, show status/progress, stop, retry, reconnect, and clear errors.
- [ ] Use a persistent typed job queue and worker heartbeat/lease. Retrying a job must not create duplicate imports or concurrent duplicate runs.
- [ ] Collect exact product names, descriptions where available, location-specific prices, original image sources, URLs, availability, and source timestamps. Missing price/image remains missing; never invent it.
- [ ] Support chain and local independent stores; preserve legitimate ordering variants. Prefer direct store sources according to existing Forge preferences.
- [ ] Clean duplicate captures and irrelevant scrape content. Preserve distinct sizes, flavors, multipacks, brands, and location differences. Ambiguous duplicates go to review with source provenance.
- [ ] Categorize the cleaned catalog and stage it in Supabase before any publication.

Pass condition: choose one test store, scrape from the studio, inspect the correctly categorized results, restart/reconnect the worker, retry safely, and prove the live catalog was not changed by scraping alone.

### 5. Product-to-display planning, rendering, and inspection

- [ ] Store Danny's reusable display and stocking rules by store/category/display, with specific overrides and sensible automatic selection.
- [ ] Auto-select suitable display types: cans/dry goods to shelves, dairy/chilled goods to refrigerators, frozen goods to freezers, loose produce to bins, and category-appropriate retail displays.
- [ ] Generate an exact ordered render manifest: product IDs, names, brand, reference images, quantities, repeated facings, brands per row, products per row, shelf count, scale, spacing, dimensions, lighting, and fit.
- [ ] Group products in the requested category order (e.g. canned goods first). Realistic repeated facings do not create duplicate catalog products.
- [ ] Prepare complete render briefs from the manifest so Danny does not repeatedly explain layout rules to an assistant.
- [ ] Connect a real rendering worker/service, rather than assuming a job-board entry starts ChatGPT. Track queued/running/failed/completed/reviewed states and preserve job inputs and outputs.
- [ ] Import approved finished renders with placement metadata and working product hit targets; preserve original files.
- [ ] Add image correction/replacement tools and inspection sweeps for missing/broken/wrong images, placeholder logos, visible cutout boxes, duplicate listings, wrong categories, bad prices, and clipped/crowded/mismatched shelf placement.
- [ ] Provide findings and controlled fixes with review/history. Never silently delete questionable catalog records.

Pass condition: a test category produces repeatable, accurate briefs and usable stocked shelf renders; image corrections persist; sweep results identify seeded defects without deleting valid variants.

### 6. App transfer, verification, and rollout

- [ ] Build the actual app adapter for the supported versioned store document.
- [ ] Validate all required assets, product IDs, prices/options, placement bounds, and display settings before publishing.
- [ ] Compare preview and app on phone; test taps/order actions, swiping/scrolling, missing-image cases, and reload.
- [ ] Save & apply publishes a validated selected-store version; save draft remains separate. Preserve the previous published version and provide rollback.
- [ ] Enable publishing only after a real transfer and rollback have both passed. New app behavior still requires code integration/testing.
- [ ] Expand from representative test stores to the approved list after each display type passes.

## Verified starting inventory

Snapshot taken during the 2026-11-13 session; live counts must come from the database, not this document.

- 535 stores; 122 stores with 211,273 canonical products/menu items; 413 stores with none.
- 51 aisle renders; 13,967 aisle slots; 940 station render placements.
- 17 grocery fixture assets; 53 store board panels; 11 store entrances; 57 Valhalla assets; 1 legacy menu_boards record.
- 838 Forge staging rows and 4 Forge run checkpoints already exist.
- Existing source tables include stores, products, aisle_renders, aisle_slots, station_render_plan, grocery_fixture_assets, store_board_panels, store_entrances, valhalla_assets, valhalla_stores, and valhalla_menu_catalog.
- Asset storage includes menu-images and the existing studio/Valhalla/board buckets. Counted image URLs are not proof that every image is correct or reachable.

## Connection gaps — do not claim these are already working

1. The current `pages.js` store preview fetches at most 80 products and draws generic cards. It does not reconstruct the existing app's aisle/board layouts. This is the main prerequisite for faithful canvas editing.
2. The accessible GitHub repository contains the shared browser studio and a small agent service, not the current FlutterFlow app export. The current app/widget source must be connected or supplied before matching and publishing actual store layouts can be certified.
3. Historical Forge files show an existing Windows app with run/pause/resume/stop controls and a browser import bridge. The installed current source/runtime has not been inspected from this workspace. Do not claim a permanent worker is connected until an actual command round trip succeeds.
4. Existing studio saves go to studio_designs. A complete store-specific draft-to-app transfer with validated rollback is not implemented.

## Working rules

- Work in this order; update evidence and blockers as each milestone progresses.
- Reuse current data/assets/code; never erase existing controls to simplify a new feature.
- No customer-catalog mutation, automatic deletion, broad permissions, public secrets, or paid render/scrape jobs merely to demonstrate a mock integration.
- User-facing status must distinguish implemented, verified, planned, and blocked.
- Both assistants work from the same checked-in scope and current shared data; read the current revision before editing.

## Verification evidence — inventory foundation

- Published implementation commit: `e1d1d86d459865c1664d0727fd0654ca759663b1`.
- Five automated checks passed: approved scope and three Mezzaluna records, image-less populated stores, invalid-count handling, pagination across 535 stores, and fetch-failure handling. Both modified JavaScript modules passed syntax checks.
- Live Sleipnir store picker: 77 selected stores and 73 stores with no info. Live Valhalla store picker: 45 selected stores and 340 stores with no info. Totals match all 535 records.
- Live Publix detail: 12,621 products/menu items, 12,612 image links, correct stored address.
- Live China One detail: 200 menu items, zero image links, retained in Selected stores with its address and website.
- Customer catalog and app availability were not modified. Next dependency remains current FlutterFlow app/store source; current Forge source is needed before the Forge milestone.

## Added scope — shared media and detailed editing (2026-11-13)

- Every store/page can reuse existing Asgard design folders, images and videos. Choosing a source must not change a storage policy or grant customers new access.
- Shared media picker supports folders, search within a folder, image/video filtering, pagination and multiple selection for layers. Existing design buckets are indexed; studio uploads and product/shelf/menu media are listed live under existing access policies.
- Add separate media, text, button and display-frame layers. Each has position, dimensions, rotation, opacity, ordering, duplication/removal and drag placement. Save in the current page/store draft.
- Button styles include image-only, rounded, pill, circle, glass and outline. Controls include fill, border, image fit/crop, shadows, glow and floating/swaying/orbiting/rocking motion. Existing home/category buttons gain image/shape/motion controls.
- Text controls must include size, font, weight, color, alignment, spacing, italic/underline and shadows. Added layers also expose line spacing and padding.
- Keep existing Norse art speed, opacity and show controls together. Allow replacing the rune artwork with multiple images/videos, with size, spacing, rows and direction; preserve a return-to-original option. This feature is reusable on store pages.
- Drive-through menu boards need independently editable piping/frame width, shape, material/style, color/glow, backgrounds, panels, text and product placements. New display frames expose piping/background controls. Existing flattened artwork must be reconstructed as component layers before its baked-in piping or lettering can truly be changed; this is still part of actual-layout conversion, not complete merely because an overlay control exists.
- Shared assets and layered editing do not complete the app transfer or restore the existing app's full shelf/board layout. Those dependencies remain as stated above.

## Shared-media and layer editor verification

Implementation commits: `4be7c4db93d9bd326f7f2f3032997fe192f9a9aa`, `dc25ff29793d3b16b063681e47d926dfc41aafe6`, `695c05e3779a037a51610e7e8c4b9caf7fd90d7e`.

- Five automated checks pass: folder boundaries/search, safe encoded media URLs, independent layer IDs/defaults, private storage exclusion, and preservation of all pre-existing control keys. JavaScript syntax checks pass.
- Live China One store: added a button, set floating motion, chose two Asgard assets in one selection, dragged one layer, and verified three layers plus the moved position in its own Supabase studio draft. Undo restored zero added layers.
- Live shared picker: Studio uploads lists its current folders; asgard_ui opens reusable artwork folders; raven_earth/v34 displays video choices. Farmland preview reached readyState 4, videoWidth 960 and advancing playback time.
- Live Sleipnir home: Norse show/speed/opacity and replacement-art controls appear together. Existing page/control groups remain available.
- Live exact-value test with the refreshed editor: entering a piping thickness of 20 updates both slider and rendered border to 20px immediately. Test frame was undone.
- Existing underlying app/catalog tables were not changed. Design buttons are visual draft layers; app actions, full board decomposition, precise app layout matching and transfer remain part of the remaining app integration work.

