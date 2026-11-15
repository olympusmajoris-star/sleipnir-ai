# Original app and production workers

The existing workshop now has **Images & production → Original app controls** and **Forge & render jobs**. The URL and shared project are unchanged.

## Forge PC

Download `forge/ForgeStudioConnector.pyw` from the job page and open it on the Windows PC running Sleipnir Product Forge. **Find my running Forge** reads local listening ports and checks the staging app's health contract. Enter the existing app owner account and Connect. The password stays in memory. The optional **Keep connected after Windows restarts** setting encrypts only the refresh token with Windows current-user DPAPI and adds this connector to the current user’s Startup folder. **Forget saved connection** removes both. No plaintext token fallback is used. The connector retries interrupted connections. It does not install packages, open a tunnel, start the underlying collector automatically, or change the Home Depot direct-import bridge.

The recovered `product_forge_app.py` already implements the verified endpoints: health, stores, run, process status, current stages, pause, resume and stop. Collection runs one exact configured store and writes to the existing Forge staging pipeline. Existing processes are never adopted. Cancellation stays pending until the owned process exits; a changed process ID ends control of that job. Store source configuration still belongs to Forge. The source URL entered in a studio brief does not rewrite that configuration.

Connector v1.3 also supports cloud preparation with a chosen installed FFmpeg. A collector address is optional for that work. It converts a bounded shared clip into private animated WebP output; pause restarts the conversion on resume, cancel terminates only its own process. See `cloud-and-construction-controls.md`.

No PC is connected merely by downloading the file. The studio displays actual worker heartbeats and capabilities.

## Display renderer

Connect the owner on the jobs page and choose **Start studio renderer**. Queueing a render brief also starts it. It runs in the main workshop, so moving between editor pages does not interrupt it; keep the workshop tab open. The renderer claims render and image-inspection jobs, supports pause/resume/cancel, and stores output in a private owner-only bucket. Failed image loads fail the display; no package or brand is invented. Other completed outputs remain available when a later board fails.

Outputs are deterministic compositions of exact product photographs on a selected empty display photo, or a simple generated shelf layout. **Place products on this display** sets separate shelf rectangles over the photo. White-edge cleanup can be enabled or disabled per render; it trims connected white background and transparent margins without changing source files. Review white packaging carefully. Shadows and snapshot price labels are included. They are not generative photoreal store interiors. Product IDs, normalized tap rectangles and editable price-label locations are included in the downloadable map. The existing requested photoreal brief is retained; this compositor does not claim to fulfill a generative scene-rendering brief.

**Review rendered displays** opens the saved PNG and product map. **Keep display for a studio page** copies the selected result into the existing shared media area; on an editor page choose **Add kept image**. The kept image carries its product map; runtime v3 projects tap areas through resizing and contain/cover cropping. Keeping is blocked until all product IDs exist in the selected catalog and names/prices match the rendered snapshot. The native product callback must still be wired to the existing app. Prices printed in an image are snapshots; render again after catalog price/name changes.

## Native Raven

The complete connected `AsgardRaven` file preserves every original asset and the original directory, contact actions and cloud-message backend. The Asgard source already invokes `AsgardRaven`; that call needs no replacement. No new native package is required.

The additions read native settings from the approved release channel only. Web-renderer releases, missing releases and unavailable services leave the existing scene intact. An optional `studioTestCandidate` pins a frozen native test, which displays a device-test banner. Test mode never follows the live channel or edits it. Existing local owner controls remain available, and touched local controls are not overwritten during that visit.

Native settings supported here are the actual original fields: sphere size/tilt/position/turning, scene zoom, glow/reveal, hues, text sizes/styles, name-tag dimensions, white colors and outline mode. Repeated preview contacts are explicitly excluded from approved settings. Native settings are distinct from the web black-hole renderer; this integration is not a claim that the web shader has been ported to Dart.

**Installation remains on hold. Do not paste over the working AsgardRaven widget.** The original-control tooling can save a shared native draft and prepare a frozen test; the full-file test exporter now uses AsgardRavenStudioTest. The construction/cloud exporter uses AsgardRavenEffectsTest. Both are separate widget names before device installation. After verifying it on a device, approve that frozen test. The normal connected widget reads the approved native version when opened or resumed. Publishing a native Raven version uses the existing Raven channel; web/native renderer version guards prevent cross-loading.

## Original cloud conversation

The supplied native conversation already reads `raven_scene_settings` every 15 seconds. The new studio page exposes its actual fields: day/night ground speed, brightness, Earth mode, shimmer, message-cloud movement/padding/formation/shadow/spacing/variety, and background-cloud count/speed/size/opacity. Draft saves do not apply them. **Apply these controls to the original conversation** is an explicit owner action with a conditional update that refuses to overwrite another editor's intervening changes. No settings were applied during implementation.

## Verification and remaining work

The prior release passed 147 JavaScript, 10 Python, 68 reusable Flutter-boundary and 6 native-document checks; current effects checks are recorded in the build status. The complete 5.45 MB Raven file parsed with the official Dart formatter. A real four-product catalog composition produced a 1800 × 1050 PNG and four exact-ID tap zones. Private output policies and owner-only access were checked. No app release or live settings were published.

FlutterFlow compilation/device behavior, a Windows retail-collection round trip, and the browser-to-Storage display-rendering upload still require their live environments. Windows cloud preparation and artifact upload passed the live check recorded below. The original delivery, checkout, merchant/menu, grocery, live and store widget sources were received on November 14. Their FlutterFlow route wiring and device checks remain necessary. SleipnirCart.onCheckout must be verified to open SleipnirCheckout; do not place a real order for this check. The full app export and SDK lockfile have not been supplied. The generic web surface now targets immutable renderer v3, matching the current editor, with package pins compatible with the previously reported Flutter 3.35 SDK.

## Email sign-in — connector v1.4

The PC connector and browser owner dialog now support passwordless sign-in to the existing account. In Email sign-in, enter the owner email and choose Email me a sign-in link. In the received email, copy the Log In button's link address without opening it; paste into the connector/dialog and Connect. Numeric email codes are supported when the configured template includes one. No new account is created, no password is changed, and no email is sent automatically. The returned authenticated user must still match the existing owner ID. Only the normal refresh token can be saved, using current-user Windows encryption. Existing password sign-in is retained as an alternative.

Error messages now explain invalid credentials, expired/used links and mail limits without exposing response bodies or tokens. Danny completed email sign-in on his Windows PC; no password or Auth configuration change was needed. Future email requests still require his explicit button click. API settings confirm that email authentication is enabled. This release does not change Auth templates or delivery settings.

Validation: 20 Python checks and 5 focused browser-auth unit checks passed, including existing-account-only requests, link host/type/token validation, wrong-owner rejection, session completeness and sanitized errors. No sign-in email was sent during these tests.

## Windows cloud round trip — November 14, 8:34 PM America/New_York

Confirmed live worker `339f050d-6ffe-4e39-b9ac-7319a02d3a30` (v1.4.0, cloud_prepare). A 90,674-byte three-second MP4 made from the original public message cloud was stored as a connection-check input, then queued as job `bcacfc79-b29a-458a-8642-ee98bac657da`. The user's PC claimed, converted, validated and uploaded the output, ending at review_ready in about ten seconds. Output: animated WebP, 640 × 426, 45 frames, 5.75 seconds, 440,896 bytes; SHA-256 `f836aef5bd8396d54721971151d1b238c9814d051ad126905b8abed7b5e473b6`. The private Storage object exists with the matching size. No cloud slot, native release or live app setting was changed. Pixel-level review of this Windows artifact still happens through the owner's prepared-cloud preview. Windows restart persistence and retail scraping have not yet been demonstrated.
