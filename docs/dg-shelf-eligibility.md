# Dollar General shelf eligibility correction

Applied to the existing SleipnirApp database on 2026-11-25 as part of the Dollar General shelf rendering update.

## Cause and scope

The Studio already recognizes Dollar General (Palm Coast Pkwy), store `0600cb61-45f9-402b-a209-134abdaef10f`, as a grocery shelf destination. Its public catalog contains 6,431 products in 27 categories. The record is live, has category `Grocery`, menu type `retail`, and the Palm Coast address used by the existing store checks.

`private.studio_authored_store(uuid)` still listed only Target, Publix, ALDI, and Walmart. As a result, original shelf stock returned no products and organizer layout saves failed the supported-store check even for a valid Studio publisher.

The correction adds only Dollar General's known UUID to that list. It retains the live-store and address conditions, function identity, invoker behavior, volatility, search path, and grants. It does not alter products, prices, category assignments, store records, tables, RLS policies, publisher authorization, membership validation, or save concurrency checks.

## Exact SQL

The Supabase CLI was unavailable (`supabase --help` returned command not found), so this file records the exact reproducible change rather than fabricating a CLI migration identifier.

```sql
CREATE OR REPLACE FUNCTION private.studio_authored_store(p_store_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select p_store_id in ('35ef70d0-3d20-4599-96a3-648ee3c7c340','189581c9-d728-4e5d-9e02-ae4de19a15af',
                        'e5a01340-424a-4a41-b0e6-99cb9e944733','03dbd8fa-ed64-4236-85be-206c952da024','0600cb61-45f9-402b-a209-134abdaef10f')
      and exists(select 1 from public.stores s where s.id=p_store_id and s.is_live
        and s.address ~* ',[[:space:]]*Palm[[:space:]]+Coast[[:space:]]*,[[:space:]]*(FL|Florida)([^[:alpha:]]|$)');
$function$;
```

The original definition was identical except that the UUID list ended after `03dbd8fa-ed64-4236-85be-206c952da024`.

The live update ran in a transaction with an exact previous-definition hash check and a single-occurrence replacement. It also asserted that the grants and the definitions of `studio_grocery_require_editor`, `studio_write_grocery_shelf_layout`, and `studio_grocery_save_scale` were unchanged.

| Verified property | Before | After |
| --- | --- | --- |
| Function OID | 82310 | 82310 |
| Security definer | false | false |
| Volatility | stable | stable |
| ACL | `{postgres=X/postgres}` | `{postgres=X/postgres}` |
| MD5 of `pg_get_functiondef` | `4839912b561e8a943f977e1b24764f05` | `60572e76ef5726370fae2c47bee6caf0` |

## Verification

The public read path was checked using the actual `anon` role:

```sql
begin;
set local role anon;
select jsonb_build_object(
  'role', current_role,
  'deals_stock', (
    select count(*) from public.studio_grocery_aisle_original_stock(
      '0600cb61-45f9-402b-a209-134abdaef10f', 'Deals & General Merchandise')),
  'catalog_categories', (
    select count(distinct category) from public.products
    where store_id='0600cb61-45f9-402b-a209-134abdaef10f'),
  'catalog_products', (
    select count(*) from public.products
    where store_id='0600cb61-45f9-402b-a209-134abdaef10f'),
  'layout', public.studio_grocery_shelf_layout(
    '0600cb61-45f9-402b-a209-134abdaef10f', 'Deals & General Merchandise')
) as checks;
rollback;
```

Observed result: role `anon`, Deals stock **75**, categories **27**, products **6,431**, and valid empty layout `{ "layout": null, "revision": 0 }`.

An additional comparison of every category against `studio_grocery_aisle_original_stock` returned **27 categories**, **6,431 catalog products**, **6,431 stock products**, and **zero mismatched categories**. Existing Target, Publix, ALDI, and Walmart eligibility remained true.

Publisher saves still require a non-null `auth.uid()` and `private.studio_is_publisher()`. Product scale writes still verify exact store ownership and revision. No dummy layout or product-scale write was published during verification.

The Supabase security advisor was run after the correction. It reported no finding against `private.studio_authored_store`. Separate Target objects appeared in the project-wide findings (`public.target_aisle_override`, `public.target_move`, and `public.target_repack`); this narrowly scoped change did not alter them. The relevant advisor references are [RLS disabled in public](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public) and [mutable function search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
