# Original app pages in the Studio

Danny's requirement on 2026-11-15 applies to every completed app page: open the
existing original appearance and assets, keep the larger phone canvas, and make
edits from that baseline. Generic substitute layouts do not satisfy this.

The source inventory is `original-page-inventory.json`: 43 page definitions in
`SleipnirProject.zip`, with original custom-widget callers identified. The separate
native-source inventory records the 29 received widget sources. Full private
widget files are not published in this repository.

## Current verified scope

- Shopping Home (`HomePage` / `Scaffold_tkcdpypo`) uses its original public assets,
  full-height moving Norse image strip, white background, source grid arrangement,
  original button sizing and source typography. It does not use the Asgard rock
  navigation overlay. The source logo uses cover inside its 120px square.
- The source layout includes clipped second-row category content and the original
  “Button” and “TextField” labels. These are retained intentionally; redesigning
  those is a separate change.
- Old placeholder defaults are migrated in memory on load, field by field. Custom
  values, locks, layers and routes are preserved. Normal Studio Save persists the
  corrected baseline. The original app is not overwritten.
- All existing `studio-layout` phone editors default to the original 820px phone
  height, with independent scrolling and Original / 125% / 150% / Fit choices.
- Other original pages are inventoried, not certified as matching yet. A generic
  Studio renderer or a source-received flag is not proof of app parity.

## Remaining source/runtime gap

The supplied project ZIP contains FlutterFlow YAML definitions, not generated
Dart page code or the complete app's `pubspec.yaml`/lockfile, backend, utilities,
authentication and app-state implementations. The native widget attachments alone
are not a runnable complete FlutterFlow app. Faithfully rendering every remaining
native page requires the original generated app source/runtime and its real page
parameters, rather than another approximate browser reimplementation.

Native installation and existing frozen transfer renderer versions remain held;
this change updates the editable Studio only.
