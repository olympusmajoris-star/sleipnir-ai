# Original page runtime integration — working draft

This branch is not ready for full deployment. It does not yet meet complete control coverage or all-page parity.

The isolated Flutter preview now compiles the supplied GroceryAisle, GroceryStoreNavigator, StoreEntrances, ProduceWall, StationWall, SleipnirCart, RetailStore, McDonaldsComboPanel, FastCasualMenuBoard, SitDownRestaurantMenu and SleipnirCheckout widgets. CartMiniBar was recovered from the supplied older source. FlutterFlow imports are replaced by a local routing/cart bridge. Original sources are kept private, outside this repository.

The preview Supabase client accepts only GET/HEAD/OPTIONS. Preview interactions cannot submit orders, modify accounts, or change catalog records. Editor draft Save remains a separate operation. Checkout remains subject to its original signed-in state; no actual order was tested or submitted.

Verified locally:
- Release web build succeeds for the original widget runtime.
- Publix Snacks draws the original Flutter shelves and original live products, rather than a new grid.
- Changing Rows from 3 to 1 changes that original shelf to one row. Undo preserves the source and restores settings.
- LongHorn's original paper menu renders with its original products and prices.
- Changing menu text to cyan changes the original menu headings, items and prices. Undo restores its saved appearance.
- 194 existing Node tests passed; 19 component/navigation tests passed after product-order regressions.
- Shelf width changes actual native shelf geometry. Sign creation and undo work.
- A shelf product can be added to the basket; it remains in the original basket after navigation and reload.
- Basket colors survive shared Save and reload. Restore original was saved after verification, removing the test color.
- The original checkout displays the basket, store, map, and totals. No order was submitted.
- LongHorn item name size changes its original menu and pagination.
- The basket gallery captures a thumbnail from the actual Flutter frame.

Implemented, needing further verification:
- Native draft settings arrive via a same-origin message bridge with applied acknowledgments.
- Draft cart is shared between preview pages in this browser session.
- Native snapshot thumbnails can be requested by the page gallery.
- Retail card dimensions, spacing, labels and price colors are wired to original Flutter code.
- Source station/fixture/menu product queries are constrained to the chosen store. Produce views are joined to products owned by the selected store.
- Sources for restaurant background artwork use the existing shared shopping-home artwork list.

Remaining before claiming completion:
- Complete every component's controls and verify each control, including all native special-case shelf renderers.
- All other original pages still require original rendering and editable binding.
- Complete validation of every store type, product edits, uploads and remaining controls. Basic checkout/cart routing, gallery capture and shared save/restore are now verified.
- Complete Dart export and ensure exported settings match the native application.
- Package a versioned runtime with this branch; no runtime source maps or private Dart sources should be published.
- Deploy only after the full workflow passes; the live workshop has not been changed by this draft.
