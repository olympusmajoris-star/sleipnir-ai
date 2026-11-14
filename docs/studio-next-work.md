# Shared studio work order — transfer first

Danny's goal is an editor for the actual app. Saving and explicit approval must reproduce the design and interactions in that app. A visual prototype alone does not satisfy the goal. Keep the same shared studio URL, existing approved art, controls and saved values. Do not rebuild or replace working pages just to add one tool.

## Dependency order

1. **Transfer foundation:** immutable device test copies, owner-approved releases, complete media references, reusable Dart wrapper, callbacks, restore and no draft-to-live coupling. Added in this change. Full FlutterFlow compilation and device proof are still required.
2. **Original app inventory and parity:** obtain the current FlutterFlow source, identify original routes/widgets/data and carry one complete Raven route through a real device test. Preserve the original cloud messaging widget. Then connect each page's original behavior. Do not present sample posts, people or orders as working production data.
3. **Editor structure:** implement Danny's five-area sketch using functional app sections. Do not use the Asgard/Sleipnir/Valhalla brand names as the primary section breakdown. Selecting a section dedicates the whole workspace to it. Area 2 selects the relevant page/store/item; Area 3 selects the feature; Area 4 selects the editing topic and gives way to Area 5. Skip unnecessary levels. Keep a remembered location, Back/Forward and a clickable path. Area 5 adapts to the work and may contain its own live building preview. Retain every existing control. Add small Save & lock actions per setting, named full presets and complete usage popups.
4. **Original pages and store context:** display each existing page as it is in the app. Blank canvases are only for unbuilt pages. Store work includes the full catalog, names, descriptions, prices, images, category/group information, search and inspection. Use Danny's supplied populated-store list for the main picker; keep empty/incomplete stores in a separate accessible folder rather than deleting them. Provide access for creating or completing them.
5. **Shared media and display bins:** access all suitable existing reusable images/videos by category, across stores/pages. Add varied shelves, refrigerator shelves, aisles, displays, price-tag styles/placement and menu boards. Replace an item in place with correct fit; support seamless swiping or scrolling. Direct selection, add and drag on the canvas; complete font, shadow, opacity, size, color, button, floating-motion and display-frame controls. Render missing art deliberately after its brief is established, not unrelated icons.
6. **Forge:** a persistent studio button per store for approved retailer collection, no repeated PowerShell setup. Scrape direct retailer sources by default, deduplicate, validate prices/images, review/correct/group products, inspect sweeps and save to Supabase. Generate explicit rendering jobs from selected display rules (shelf type, brands, repeats/facings, row counts), with automatic sensible display suggestions and user overrides. Preserve product identity and provide visible progress/errors/retries. Do not silently replace catalog data.

## Visual and interaction constraints already agreed

- Black-hole size follows followers; disk/ring growth follows views. Random orientation is stable for each hole throughout its drift. Retain all controls, detailed lensing and gas; no glitter or blinking copied crests.
- Multiple tiers drift left to right, normally at most four visible; five only when some are small. Existing controls and the chosen art stay intact.
- Rock carving follows the surface, preserves original luminous cracks, and exposes line thickness, glow, rotation, spacing and size. The preview must stay visible while editing.
- Still-image disk animation remains a requested authoring tool. An export path alone does not build it.
- A renderer upgrade and a design approval are different operations. Test real app behavior before approving a release. Catalog and private user data must never be included as fake UI assets or leaked into shared test documents.

## Coordination

The shared `studio_board` records transfer status and these priorities. New work should build on these files, not replace the studio. Do not edit a renderer version that already has a tested/approved release; create a new version and test it. Changes that add native app behavior still require the original project and route integration.
