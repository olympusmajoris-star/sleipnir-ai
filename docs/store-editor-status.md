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

## Direct element editing follow-up
- Clicking individual rendered product images, prices, names, shelf rails, shelf backing, signs, menu descriptions, menu frame/paper, and store logos opens that element's controls.
- Size, horizontal/vertical stretch, position, rotation, visibility and brightness update the preview immediately. Transforms preserve the original element transform.
- Flattened artwork has an explicit **Edit individual parts** tool. Drawing a rectangle separates those original pixels into a reversible layer; moving/shrinking it exposes a configurable fill. This is rectangular separation, not automatic object segmentation or background reconstruction. It does not automatically discover every burger/sign in a flattened photo.
- Layer edits are retained in the shared design JSON; unsupported Dart conversion is still blocked rather than silently discarded.
- Tests cover isolated live resizing, persistence, individual shelf selection, source crop preservation, and drag-direction geometry.

## Drive-through source layers
- Original board slots now place product names, combo names and prices over the source board using saved coordinates. The board's own image stays in place.
- For saved menu-board slots, image regions are derived beside item/combination text and beneath section text. These rectangular source regions become directly selectable without drawing a box first. They are not transparent object masks; resizing a region can expose the underlying fill.
- Source board panels share their element settings with the store-page preview.
