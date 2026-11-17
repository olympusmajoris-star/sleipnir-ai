# Editable page-reference studio

The store editor now renders editing references, not running Flutter app widgets. It uses saved store artwork, store-scoped catalog records and layout references. Preview taps select appearance controls; they do not navigate a shopping app, modify a customer basket, place orders, or authenticate customers.

- Top-level Sleipnir / Asgard hierarchy and contextual city/store selection.
- Store components, disappearing options column and full-area galleries.
- Shelf layout, appearance, product placement, prices, images, lighting and signs.
- Visual references for entrances, retail, fast-food boards, fast-casual menus, sit-down menus, produce, departments, basket and checkout.
- Individual element controls for text, color, position, size, opacity, rounding, shadow and image replacement.
- Save, restore, undo and editable-design JSON download. Existing saved designs and source assets remain in place.
- The basket and checkout use catalog samples solely to show their appearance; no customer/order operations execute.

Validation: 207 automated checks pass, including DOM integration for selecting, changing, saving/restoring and undoing edits. Visual pixel-for-pixel comparison with every original app screen is not established by those checks.

Dart transfer remains separate: new per-element reference overrides and artwork edits are retained in the editable design but need transfer mapping. The existing Dart exporter refuses to silently discard them. This update does not publish any private compiled Flutter payload.
