# Original app and production workers

The existing workshop now has **Images & production → Original app controls** and **Forge & render jobs**. The URL and shared project are unchanged.

## Forge PC

Download `forge/ForgeStudioConnector.pyw` from the job page and open it on the Windows PC running Sleipnir Product Forge. **Find my running Forge** reads local listening ports and checks the staging app's health contract. Enter the existing app owner account and Connect. Credentials stay in memory. This connector does not install packages, open a tunnel, start a collector automatically, or change the Home Depot direct-import bridge.

The recovered `product_forge_app.py` already implements the verified endpoints: health, stores, run, process status, current stages, pause, resume and stop. Collection runs one exact configured store and writes to the existing Forge staging pipeline. Existing processes are never adopted. Cancellation stays pending until the owned process exits; a changed process ID ends control of that job. Store source configuration still belongs to Forge. The source URL entered in a studio brief does not rewrite that configuration.

No PC is connected merely by downloading the file. The studio displays actual worker heartbeats and capabilities.

## Display renderer

Connect the owner on the jobs page and choose **Start studio renderer**. Keep that tab open. The renderer claims render and image-inspection jobs, supports pause/resume/cancel, and stores output in a private owner-only bucket. Failed image loads fail the display; no package or brand is invented. Other completed outputs remain available when a later board fails.

Outputs are deterministic compositions of exact product photographs with shelf rails, shadows and price labels. They are not generative photoreal store interiors. Product IDs, normalized tap rectangles and editable price-label locations are included in the downloadable map. The existing requested photoreal brief is retained; this compositor does not claim to fulfill a generative scene-rendering brief.

**Review rendered displays** opens the saved PNG and product map. **Keep display for a studio page** copies the selected result into the existing shared media area; on an editor page choose **Add kept image**. The image layer alone does not implement checkout or automatically install the product-map interactions in an original store widget.

## Native Raven

The complete connected `AsgardRaven` file preserves every original asset and the original directory, contact actions and cloud-message backend. The Asgard source already invokes `AsgardRaven`; that call needs no replacement. No new native package is required.

The additions read native settings from the approved release channel only. Web-renderer releases, missing releases and unavailable services leave the existing scene intact. An optional `studioTestCandidate` pins a frozen native test, which displays a device-test banner. Test mode never follows the live channel or edits it. Existing local owner controls remain available, and touched local controls are not overwritten during that visit.

Native settings supported here are the actual original fields: sphere size/tilt/position/turning, scene zoom, glow/reveal, hues, text sizes/styles, name-tag dimensions, white colors and outline mode. Repeated preview contacts are explicitly excluded from approved settings. Native settings are distinct from the web black-hole renderer; this integration is not a claim that the web shader has been ported to Dart.

Use the Original app controls page to save a shared native draft, prepare a native test and export a full test widget from the original or connected Raven source. After verifying it on a device, approve that frozen test. The normal connected widget reads the approved native version when opened or resumed. Publishing a native Raven version uses the existing Raven channel; web/native renderer version guards prevent cross-loading.

## Original cloud conversation

The supplied native conversation already reads `raven_scene_settings` every 15 seconds. The new studio page exposes its actual fields: day/night ground speed, brightness, Earth mode, shimmer, message-cloud movement/padding/formation/shadow/spacing/variety, and background-cloud count/speed/size/opacity. Draft saves do not apply them. **Apply these controls to the original conversation** is an explicit owner action with a conditional update that refuses to overwrite another editor's intervening changes. No settings were applied during implementation.

## Verification and remaining work

135 JavaScript checks, 7 Python checks, 68 reusable Flutter-boundary checks, and 6 native-document checks passed. The complete 5.45 MB Raven file parsed with the official Dart formatter. A real four-product catalog composition produced a 1800 × 1050 PNG and four exact-ID tap zones. Private output policies and owner-only access were checked. No app release or live settings were published.

FlutterFlow compilation/device behavior, an actual Windows Forge run, and the browser-to-Storage rendering upload still require their live environments. The missing original delivery/checkout/merchant/store widget sources remain necessary for their native integration. The full app export and SDK lockfile have not been supplied. The generic web surface now targets immutable renderer v2, matching the current editor, with package pins compatible with the previously reported Flutter 3.35 SDK.
