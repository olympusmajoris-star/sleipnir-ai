# Studio → test copy → approved app version

The shared studio now has an **App transfer / Get Dart** button. It is on the Workshop header and on the existing page editors. Existing pages, artwork, saved settings and controls remain in place.

Saving a studio design does not publish it. The production widget reads only an approved immutable version. There is no fallback to editable studio designs.

## First installation and verification

1. Select the page/store and adjust it in the existing studio.
2. Open **App transfer / Get Dart → Preview transfer**. This uses the same scene functions without the editor controls. Any sample content is labeled. Pages with missing app connections are explicitly marked.
3. Connect the existing owner account, name the version and choose **Prepare device test**. This freezes the settings and copies the relevant UI media to immutable storage. Test presentation copies are deliberately readable by the test player; private contacts and credentials are forbidden. This does not update an app channel.
4. Choose **Get Test Dart**. Install `AsgardStudioTestSurface` on a test route in the real FlutterFlow project, using the page/design/store values shown in the dialog. It is pinned to that exact test copy and displays a test badge. Connect its navigation, product and contact callbacks to the app's real actions. Supply real contacts through `contactsJson` where needed.
5. Compile in the actual project, then verify artwork, motions, sizing, media, navigation and actions on the intended devices. Compare with the studio. Keep the original page until parity passes. Fix and prepare a new test copy if needed.
6. Select the copy that passed, check the verification box and choose **Approve for app**. Approval applies the exact frozen test document; newer changes in the editor are not included. Stale approvals are rejected when another approval has already changed the channel.
7. Install the production **Get Dart** widget (`AsgardStudioSurface`) on the intended route. It follows approved versions for that page and can optionally pin a prior approved version. Future supported design changes need another test/approval, not another Dart paste. New renderer features may still require an app-code upgrade.

Both widgets use the same renderer build. The test widget reads only its explicit test-copy ID; the production widget reads only approved releases. Never use the test widget for the customer route. Device test copies and approved history remain selectable after refreshing the studio. **Restore this version** creates a new approval from a previous immutable version.

## Current readiness

| Page | Available transfer | Still required |
| --- | --- | --- |
| Raven | Existing scene, live lensing/disk rendering, saved scene settings and navigation | Real contact input, route callbacks, FlutterFlow/device verification. Production does not simulate viewer counts. |
| Navigation rocks | Existing renderer, carving/glow/debris/motion settings | Connect destinations and verify device layout. |
| Store | Existing store-page renderer, real store/catalog data, search, pagination beyond 80 products, stable product IDs, added layers | Connect product actions; verify against the actual native store. Shelf stocking/rendered-aisle authoring is separate work. |
| Store lists / delivery home | Existing saved appearance and declared store/category destinations | Native route connections, original search/profile/other buttons, parity verification. |
| Home feed, Conversation, Share, Swap, Track, Heimdall, Ads, Shop post, Deals | Draft appearance previews and test-copy export | Original app data and behavior must be integrated. Approval is blocked. |

The original native cloud/earth conversation widget and authenticated messaging stay authoritative. Its simplified studio canvas is not a replacement for the working app. This transfer does not implement native cart, checkout, messaging, scraping or order tracking.

## Media and data

Design settings, added UI layers and navigation settings travel together. UI media are frozen under content-addressed paths or use a specific source commit. Local-only media must resolve or publication fails. Catalog photos, prices and real contacts remain live data rather than being frozen into an artwork release. Only selected approved designs are used by the production player; shared legacy studio drafts are never its source.

## Verification so far

The new approval rules, immutable test copies, draft isolation, revisions, restore, media URL checks and owner-only publishing have passed database checks. All test database writes were rolled back. JavaScript contract/page tests and 68 standalone Dart contract checks pass. The full Dart file parses with the official Dart formatter.

**Flutter framework compilation, actual FlutterFlow installation, device rendering and original app route parity remain unverified.** A source export of the current FlutterFlow project (including its dependencies and original widgets) is needed to complete that work. The WebView dependencies currently target Android/iOS/macOS, not Flutter Web. This is a shared WebView renderer integration, not automatic conversion of all JavaScript artwork to native Flutter drawing code.

See [Flutter dependencies and callback contract](../flutter/flutter-transfer.md) for exact parameters and supported versions.
