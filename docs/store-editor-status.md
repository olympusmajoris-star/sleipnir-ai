# Store editor working draft

Validated 2026-11-16. This is not the completed live replacement.

- Two app areas: Sleipnir and Asgard; contextual city/store/component selection.
- Original native store, aisle, department, produce, retail, menu, basket and checkout previews.
- Store-scoped stocked shelf choices and selected-component restoration on reload.
- Owner-only original Dart templates; eleven exported widgets compile together in a Flutter web harness.
- Catalog prices stay authoritative in export, including added shelf products.
- Source templates are not in this public repository. The private database enforces publisher-only reads.
- Unsupported artwork export bindings produce an explicit error instead of silently omitting edits.

Still outstanding: remaining original-page/control coverage, artwork export bindings, full visual/store workflow verification, and live replacement.

The latest browser preview was blocked by browser security. Automatic approval review separately blocked publishing the compiled original-widget runtime to this public repository; explicit approval for that payload is pending. The runtime is built and preserved privately. Do not call this deployed or complete.
