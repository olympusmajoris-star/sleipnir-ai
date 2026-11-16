# Component editor draft — not ready for deployment

User specification: only Sleipnir and Asgard at level 1. Level 2 contains the approved shopping categories, including individual restaurant types. Grocery selection opens a city/store modal; level 3 is restricted to the selected store's components; level 4 contains component option groups and disappears on selection; level 5 contains only that group's controls or a full-area thumbnail gallery. Preserve all original pages and shared settings; no generic replacement pages.

Implemented in this draft:
- Two main areas, individual category navigation, store/city modal with exact product and image counts.
- Store-specific source artwork loaded from entrances, aisle renders, menu panels, station renders, and produce records joined through owned products.
- Separate draft rows store_components_<storeId>, optimistic timestamp save protection; no live catalog writes.
- Source artwork gallery, whole-image controls, added product/sign layers, Undo, fit-to-height phone.
- Reset option selection when changing parents; disable automatic sidebar collapse.

Verified:
- 194 Node tests pass from repository root.
- Browser: Palm Coast popup shows ALDI 2570/2569, Publix 12621/12612, Target 18668/18597, Walmart 3539/3539.
- Target shelves gallery includes the existing images. Selecting first shelf opens adjustment groups. Brightness changes image CSS from 100% to 0%; Undo restores 100%.
- Phone bottom 776 within iframe viewport 840; complete phone fits.
- Shared save round trip, uploads and complete control coverage NOT verified. No test save was intentionally performed in new store editor.

Critical incomplete work:
- The original Publix GroceryAisle is code-composed. It has ZERO aisle_renders and ZERO store_entrances rows for store 189581c9-d728-4e5d-9e02-ae4de19a15af. Do not mistake absence of these rows for absence of the original page. Integrate the received private Flutter source with a real runtime/faithful renderer before publishing.
- Artwork previews do NOT reproduce full native page behavior. Native fixture geometry, original shelf products, pricing actions, basket/checkout, store-specific restaurant pages and remaining social pages need full adapters and visual comparison against the existing app.
- Added product layers are not substitutes for existing baked or native product layers. No claim of complete controls or exact page reproduction is justified.
- Expanded store taxonomy may need explicit mappings using recorded subcategory; do not infer classifications from store names.
- Header transfer must delegate only when editor supports export. This new editor has no Dart exporter yet.
- Avoid publishing this partial viewer as the final replacement. Original installed app and live gh-pages remain untouched.
