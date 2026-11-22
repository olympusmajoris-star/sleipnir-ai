"""Exercise the real host with an isolated shelf iframe and an in-memory catalog.

Run: python -m unittest discover -s tests -p 'test_shelf_editor.py'
Set CHROMIUM_PATH to use an installed browser. All network routes are intercepted.
"""
import os
from pathlib import Path
import unittest
from urllib.parse import urlencode
from playwright.sync_api import expect, sync_playwright
from editor_fixture import (Fixture, FIRST, SECOND, SHA, LEGACY_SHA, TARGET, PAGE, PUBLIX,
    PUBLIX_SKU, PUBLIX_RECORD, ALDI, DOLLAR, BUNNELL, WALMART, SPROUTS, SAMPLES, OTHER, UNLISTED)


class ShelfEditorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = sync_playwright().start()
        exe = os.getenv('CHROMIUM_PATH')
        cls.browser = cls.engine.chromium.launch(
            executable_path=exe, args=['--no-sandbox','--disable-dev-shm-usage'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.engine.stop()

    def test_shelf_thickness_resizes_digital_tag_and_both_text_sizes(self):
        page = self.browser.new_page()
        self.addCleanup(page.close)
        page.route('https://**/*', lambda route: route.abort())
        page.set_content('<div id="bay"></div>')
        root = Path(__file__).resolve().parents[1]
        page.add_style_tag(path=root/'shelf-layout-canvas.css')
        page.add_script_tag(path=root/'shelf-layout-canvas.js')
        for width in (320, 390):
            for rows in (3, 4, 8):
                def measure(rail):
                    return page.evaluate('''([width,rows,rail]) => {
                      const host = document.querySelector('#bay');
                      host.style.width = width + 'px';
                      ShelfLayoutCanvas.render(host, {fixture:'cooler',rows,rail,items:[
                        {id:'milk',name:'Organic whole milk',size:'Half gallon',price:1234.95}
                      ]});
                      const tag = host.querySelector('.sl-label');
                      const name = tag.querySelector('.sl-tag-name'), price = tag.querySelector('.sl-tag-price');
                      const rect = tag.getBoundingClientRect(), amount = price.getBoundingClientRect();
                      return {height:rect.height, name:parseFloat(getComputedStyle(name).fontSize),
                        price:parseFloat(getComputedStyle(price).fontSize), amount:price.textContent,
                        fits:amount.left >= rect.left && amount.right <= rect.right &&
                          amount.top >= rect.top && amount.bottom <= rect.bottom};
                    }''', [width, rows, rail])
                previous = measure(1)
                for rail in (4, 8, 12, 15):
                    current = measure(rail)
                    for field in ('height','name','price'):
                        self.assertGreater(current[field],previous[field],(width,rows,rail,field))
                    self.assertEqual(current['amount'], '$1,234.95')
                    self.assertTrue(previous['fits'] and current['fits'], (width,rows,rail,current))
                    previous = current

    def launch(self, width=1280, height=900, *, url=None, expect_frame=True, **permissions):
        self.fixture = Fixture(**permissions)
        self.context = self.browser.new_context(viewport={'width':width,'height':height},
                                                device_scale_factor=1)
        self.addCleanup(self.context.close)
        self.context.route('**/*',self.fixture.serve)
        self.page = self.context.new_page()
        self.errors=[]
        self.page.on('pageerror', lambda error:self.errors.append(str(error)))
        self.page.goto(url or PAGE+'?store='+self.fixture.store)
        if not expect_frame:
            return
        self.page.locator('#editor-frame').wait_for(state='visible')
        self.frame=self.page.frame_locator('#editor-frame')
        expect(self.frame.locator('#first')).to_be_visible()

    def select(self, button='first'):
        self.frame.locator('#'+button).click()
        name='Good & Gather Black Beans' if button=='first' else 'Good & Gather Garbanzo Beans'
        expect(self.page.locator('#product-detail')).to_contain_text(name)

    def received(self, kind):
        return self.frame.locator('body').evaluate(
            '(b,k)=>window.received.filter(x=>x.type===k)',kind)

    def wait_received(self, kind, field=None, value=None):
        frame=self.page.locator('#editor-frame').element_handle().content_frame()
        frame.wait_for_function('([kind,field,value])=>window.received.some(x=>x.type===kind && (field===null || x[field]===value))',arg=[kind,field,value])
        return self.received(kind)

    def verify_geometry(self, width, mobile):
        page=self.page
        self.assertEqual(page.evaluate('document.documentElement.scrollWidth'),width)
        self.assertEqual(page.locator('#editor-frame').bounding_box()['width'],390)
        frame=page.locator('#editor-frame').bounding_box()
        pane=page.locator('#preview-pane').bounding_box()
        inspector=page.locator('#inspector').bounding_box()
        self.assertGreaterEqual(frame['height'],440)
        self.assertLessEqual(frame['x']+frame['width'],width+1)
        if mobile:
            self.assertEqual(frame['x'],0)
            self.assertGreaterEqual(inspector['y'],pane['y']+pane['height']-1)
        else:
            self.assertGreaterEqual(inspector['x'],pane['x']+pane['width']-1)
        page.locator('.back-link').focus()
        page.keyboard.press('Tab')
        next_focus='change-store' if page.locator('#connect-owner').is_disabled() else 'connect-owner'
        self.assertEqual(page.evaluate('document.activeElement.id'),next_focus)
        self.assertEqual(page.locator('#'+next_focus).evaluate(
            'e=>getComputedStyle(e).outlineStyle'),'solid')
        if mobile:
            expect(page.locator('#phone-size-tools')).to_be_hidden()
        else:
            self.assertLessEqual(page.locator('#scale-range').bounding_box()['width'],inspector['width'])

    def optional_capture(self, name):
        output=os.getenv('EDITOR_TEST_ARTIFACTS')
        if output:
            root=Path(output);root.mkdir(parents=True,exist_ok=True)
            self.page.evaluate('window.scrollTo(0,0)')
            self.page.screenshot(path=root/(name+'.png'),full_page=True)

    def test_desktop_product_scale_persists_with_revision_and_flag_keeps_id(self):
        self.launch()
        self.verify_geometry(1280,False)
        self.select()
        controls=self.page.locator('#scale-range')
        self.assertGreaterEqual(float(controls.get_attribute('min')), .5)
        self.page.locator('#scale-plus').click()
        scale=float(controls.input_value())
        self.assertEqual(scale,1.10)
        self.assertIn(FIRST,str(self.wait_received('set-scale')))
        self.page.locator('#save-scale').click()
        self.page.wait_for_function("document.querySelector('#save-scale').disabled")
        self.assertEqual(self.fixture.scales[FIRST]['scale'],scale)
        self.assertEqual(self.fixture.scales[FIRST]['revision'],1)
        self.page.locator('#scale-reset').click()
        self.assertEqual(float(controls.input_value()),1)
        self.page.locator('#scale-minus').click()
        self.page.locator('#save-scale').click()
        self.page.wait_for_function("document.querySelector('#save-scale').disabled")
        self.assertEqual(self.fixture.scales[FIRST]['revision'],2)
        self.select('second')
        self.page.locator('#repair-note').fill('This package front belongs to another size.')
        self.page.locator('#flag-product').click()
        self.page.locator('#repair-drawer summary').click()
        expect(self.page.locator('#repair-list')).to_contain_text('another size')
        self.assertEqual([r['product_id'] for r in self.fixture.flags],[SECOND])
        self.assertEqual(self.fixture.flags[0]['aisle'],'Canned Goods & Soups')
        self.assertEqual(self.fixture.flags[0]['page_key'],'r11871/slot/2')
        self.page.locator('#repair-list button').first.click()
        focus=self.wait_received('focus-product')[-1]
        self.assertEqual((focus['product_id'],focus['aisle']),(SECOND,'Canned Goods & Soups'))
        scale_bodies=[b for _,name,_,b in self.fixture.calls if name=='studio_save_grocery_product_scale']
        self.assertEqual([b['p_expected_revision'] for b in scale_bodies],[0,1])
        self.assertTrue(all(b['p_store_id']==TARGET for b in scale_bodies))
        self.optional_capture('desktop-owner')
        self.assertEqual(self.errors,[])
        self.assertEqual(self.fixture.failures,[])

    def test_phone_selection_search_navigation_and_bounds(self):
        self.launch(390,844)
        self.verify_geometry(390,True)
        self.select()
        shortcut=self.page.locator('#inspect-selected')
        expect(shortcut).to_contain_text('Good & Gather Black Beans')
        expect(shortcut).to_be_visible()
        shortcut.click()
        self.assertEqual(self.page.evaluate('document.activeElement.id'),'product-heading')
        expect(self.page.locator('#return-preview')).to_be_visible()
        self.page.locator('#return-preview').click()
        self.page.locator('#scale-range').focus()
        self.page.keyboard.press('End')
        value=float(self.page.locator('#scale-range').input_value())
        self.assertLessEqual(value,1.3)
        self.page.keyboard.press('Home')
        value=float(self.page.locator('#scale-range').input_value())
        self.assertGreaterEqual(value,.7)
        self.page.locator('#scale-reset').click()
        self.assertEqual(float(self.page.locator('#scale-range').input_value()),1)
        self.page.locator('#department').select_option(label='Dairy & Eggs')
        self.assertIn('Dairy & Eggs',str(self.wait_received('set-aisle','aisle','Dairy & Eggs')))
        for key in ('next-panel','prev-panel'):
            self.page.locator('#'+key).click()
        self.page.locator('#aisle-search').fill('cheese')
        self.page.locator('#search-go').click()
        self.assertEqual([m['direction'] for m in self.wait_received('move')],['right','left'])
        self.assertIn('cheese',str(self.wait_received('search')))
        self.page.locator('#mode-toggle').click()
        shop=self.page.locator('#shopping-frame').element_handle().content_frame()
        shop.wait_for_function("window.received?.some(m=>m.type==='set-mode' && m.mode==='shop')")
        self.assertIn('Dairy+%26+Eggs',shop.url)
        self.assertTrue(all(m['mode']=='select' for m in self.received('set-mode')))
        self.page.locator('#close-shopping').click()
        expect(self.page.locator('#shopping-frame')).to_have_count(0)
        self.optional_capture('phone-selection')
        self.assertEqual(self.fixture.failures,[])
        self.assertEqual(self.errors,[])

    def test_shopping_preview_keeps_the_selected_shelf_product_and_its_size(self):
        self.launch()
        self.select()
        self.page.locator('#scale-plus').click()
        size=float(self.page.locator('#scale-range').input_value())
        self.page.get_by_role('button',name='Preview shopping').click()
        shopper=self.page.locator('#shopping-frame').element_handle().content_frame()
        shopper.wait_for_function("([id,size])=>window.received?.some(x=>x.type==='sync' && x.scales[id]===size)",arg=[FIRST,size])
        self.page.get_by_role('button',name='Back to editing').click()
        expect(self.page.locator('#product-detail')).to_contain_text('Good & Gather Black Beans')
        self.assertEqual(float(self.page.locator('#scale-range').input_value()),size)
        self.assertTrue(all(m['mode']=='select' for m in self.received('set-mode')))
        self.assertEqual(self.fixture.scales,{})

    def test_saved_shopping_shelves_open_exact_product_and_return_to_same_bay(self):
        self.launch(store=PUBLIX, signed_in=False, authorized=False,
                    url=PAGE+'?'+urlencode({'store':PUBLIX,'aisle':'Snacks','layout':0}))
        ids = [f'10000000-0000-4000-8000-{n:012d}' for n in range(5)]
        stock = [dict(id=sku,store_id=PUBLIX,category='Snacks',name=f'Snack {index}',
                      price=1+index,image_url='https://studio.test/pack.png',
                      shelf_group='Nuts' if index==0 else 'Chips')
                 for index,sku in enumerate(ids)]
        rows = {'revision':3, 'layout':{'rows':1,'rail':10,'tabHeight':24,'groupBy':'type',
                'productsPerRow':2,'facings':3,'products':{ids[-1]:{'facings':1}}}}
        self.context.route('**/rpc/studio_grocery_shelf_layout',lambda r:r.fulfill(json=rows))
        self.context.route('**/rpc/studio_grocery_aisle_original_stock?**',
                           lambda r:r.fulfill(json=[{'product_id':sku} for sku in ids]))
        self.context.route('**/rest/v1/products?**',lambda r:r.fulfill(json=stock))
        self.context.route('**/shelf-product-kinds.json',lambda r:r.fulfill(json={}))
        self.context.route('**/pack.png',lambda r:r.fulfill(content_type='image/svg+xml',
                           body='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="40"><rect width="20" height="40" fill="green"/></svg>'))
        self.page.get_by_role('button',name='Preview shopping').click()
        shelf=self.page.locator('#layout-workspace')
        expect(shelf.get_by_role('button',name='Chips')).to_be_visible()
        shelf.get_by_role('button',name='Chips').click()
        shelf.get_by_role('button',name='Next bay').click()
        expect(shelf.locator('#layout-page')).to_have_text('Chips · Bay 2 of 2')
        cells=shelf.locator('.sl-slot')
        expect(cells).to_have_count(2)
        expect(cells.nth(0).locator('.sl-face')).to_have_count(3)
        expect(cells.nth(1).locator('.sl-face')).to_have_count(1)
        expect(shelf.locator('#layout-inspector')).to_be_hidden()
        for index,control in enumerate(('.sl-label','.sl-faces')):
            expected=ids[3+index]
            cells.nth(index).locator(control).click()
            shopper=self.page.locator('#shopping-frame').element_handle().content_frame()
            shopper.wait_for_function("window.received?.some(x=>x.type==='focus-product')")
            messages=shopper.evaluate('window.received')
            self.assertEqual([m['mode'] for m in messages if m['type']=='set-mode'],['shop'])
            focus=[(m['product_id'],m['aisle']) for m in messages if m['type']=='focus-product']
            self.assertEqual(focus,[(expected,'Snacks')])
            self.page.get_by_role('button',name='Back to shelves').click()
            expect(self.page.locator('#shopping-frame')).to_have_count(0)
            expect(shelf.locator('#layout-page')).to_have_text('Chips · Bay 2 of 2')
            expect(cells.nth(index)).to_have_attribute('data-product-id',expected)
        self.assertEqual(self.fixture.failures,[])
        self.assertEqual(self.errors,[])

    def test_delayed_catalog_response_cannot_switch_the_selected_sku(self):
        self.launch()
        pending=[]
        def delay_first(route):
            if FIRST in route.request.url:
                pending.append(route)
            else:
                route.fallback()
        self.context.route('**/rest/v1/products?**',delay_first)
        self.frame.locator('#first').click()
        self.page.wait_for_timeout(50)
        self.assertEqual(len(pending),1)
        self.select('second')
        self.fixture.serve(pending.pop())
        self.page.wait_for_timeout(50)
        expect(self.page.locator('#product-detail')).to_contain_text('Garbanzo Beans')
        self.page.locator('#scale-plus').click()
        self.page.locator('#save-scale').click()
        self.page.wait_for_function("document.querySelector('#save-scale').disabled")
        self.assertEqual(set(self.fixture.scales),{SECOND})

    def test_owner_only_controls_and_foreign_messages(self):
        self.launch(390,650,signed_in=False,authorized=False)
        self.verify_geometry(390,True)
        self.select()
        expect(self.page.locator('#save-scale')).to_be_disabled()
        self.page.evaluate('''() => window.postMessage({channel:'sleipnir-aisle-editor-v1',type:'select',
            store_id:'bogus',product_id:'bogus',name:'Foreign event'},location.origin)''')
        expect(self.page.locator('#product-detail')).not_to_contain_text('Foreign event')
        self.page.locator('#connect-owner').click()
        expect(self.page.locator('#save-scale')).to_be_disabled()
        expect(self.page.locator('#flag-product')).to_be_disabled()
        self.assertEqual(self.fixture.flags,[])
        self.assertEqual(self.fixture.scales,{})
        self.assertEqual(self.fixture.failures,[])

    def test_phone_can_resize_and_connect_from_the_save_button(self):
        self.launch(390,650,signed_in=False)
        self.select()
        tools=self.page.locator('#phone-size-tools')
        tools.locator('#scale-plus').click()
        expect(tools.locator('#scale-value')).to_have_text('110%')
        self.assertEqual(self.fixture.scales,{})
        tools.get_by_role('button',name='Connect to save size').click()
        expect(self.page.locator('#editor-status')).to_contain_text('Saved 110%')
        self.assertEqual(self.fixture.scales[FIRST]['scale'],1.1)

    def test_publix_route_filters_stock_scale_and_flag_queries_by_real_store(self):
        self.launch(390,844,url=f'{PAGE}?store={PUBLIX}&aisle=Snacks',store=PUBLIX)
        expect(self.page.locator('#department')).to_have_value('Snacks')
        iframe=self.page.locator('#editor-frame').element_handle().content_frame()
        self.assertIn('store='+PUBLIX,iframe.url)
        self.assertIn('aisle=Snacks',iframe.url)
        self.frame.locator('#first').click()
        expect(self.page.locator('#product-detail')).to_contain_text(PUBLIX_RECORD[0])
        expect(self.page.locator('#product-detail')).to_contain_text('$1.97')
        # A message from the active, legitimate iframe must still match this store.
        iframe.evaluate("""(target)=>send('select',{store_id:target,product_id:'11111111-1111-4111-8111-111111111111',aisle:'Snacks',name:'Out-of-store product'})""",TARGET)
        self.page.locator('#scale-plus').click()
        self.page.locator('#save-scale').click()
        self.page.wait_for_function("document.querySelector('#save-scale').disabled")
        self.assertEqual(self.fixture.scales[PUBLIX_SKU]['store_id'],PUBLIX)
        self.page.locator('#repair-note').fill('Check the candy wrapper.')
        self.page.locator('#flag-product').click()
        self.page.locator('#repair-drawer summary').click()
        expect(self.page.locator('#repair-list')).to_contain_text(PUBLIX_RECORD[0])
        flag=self.fixture.flags[0]
        self.assertEqual((flag['product_id'],flag['store_id'],flag['aisle']),(PUBLIX_SKU,PUBLIX,'Snacks'))
        self.assertNotIn('target_catalog_categories',[name for _,name,_,_ in self.fixture.calls])
        self.assertNotIn(TARGET,str([c for c in self.fixture.calls if c[1]!='studio_palm_coast_editor_locations']))
        cats=[body for _,name,_,body in self.fixture.calls if name=='studio_product_categories']
        self.assertEqual(cats,[{'p_store_id':PUBLIX}])
        for _,table,qs,_ in self.fixture.calls:
            if table in ('products','studio_grocery_product_scales','studio_grocery_product_flags'):
                self.assertEqual(qs['store_id'],['eq.'+PUBLIX])
        self.assertEqual(self.errors,[])

    def test_unknown_dart_registers_exact_source_and_requires_its_own_preview(self):
        self.launch()
        self.page.locator('#upload-drawer summary').click()
        source='class GroceryAisle extends StatefulWidget { const GroceryAisle({super.key}); }\n' + '// Compile this exact source revision.\n' * 15
        self.page.locator('#dart-file').set_input_files({
            'name':'UpdatedAisle.dart','mimeType':'text/plain','buffer':source.encode()})
        self.page.locator('#upload').click()
        expect(self.page.locator('#version-list')).to_contain_text('UpdatedAisle.dart')
        self.assertEqual(self.fixture.versions[0]['filename'],'UpdatedAisle.dart')
        calls=[c for c in self.fixture.calls if c[1]=='studio_register_grocery_dart']
        self.assertEqual(len(calls),1)
        self.assertEqual(calls[0][3]['p_source'],source)
        self.assertNotEqual(self.fixture.versions[0]['sha256'],SHA)
        expect(self.page.locator('#editor-frame')).to_be_hidden()
        expect(self.page.locator('#pairing-help')).to_be_visible()
        expect(self.page.locator('#editor-status')).to_contain_text('Pair the local compiler')
        self.assertEqual(self.errors,[])
        self.assertEqual(self.fixture.failures,[])

    def test_native_stocked_categories_and_per_sku_actions_in_other_groceries(self):
        for store in (ALDI,WALMART):
            with self.subTest(store=store):
                name,_,_,aisle,product,product_name,price=SAMPLES[store]
                self.launch(url=PAGE+'?'+urlencode({'store':store,'aisle':aisle}),store=store)
                expect(self.page.locator('#preview-heading')).to_contain_text(name)
                expect(self.page.locator('#department')).to_have_value(aisle)
                iframe=self.page.locator('#editor-frame').element_handle().content_frame()
                self.assertIn('store='+store,iframe.url)
                iframe.evaluate('''p=>send('select',{scale:1,min_scale:p.editable?.6:1,max_scale:p.editable?1.2:1,...p})''',
                    {'store_id':store,'aisle':aisle,'product_id':product,'name':product_name,'editable':store!=ALDI})
                expect(self.page.locator('#product-detail')).to_contain_text(f'${price:.2f}')
                if store==ALDI:
                    expect(self.page.locator('#scale-range')).to_be_disabled()
                    expect(self.page.locator('#draft-status')).to_contain_text('repair flags')
                else:
                    self.page.locator('#scale-minus').click()
                    self.page.locator('#save-scale').click()
                    expect(self.page.locator('#editor-status')).to_contain_text('Saved')
                    self.assertEqual(self.fixture.scales[product]['store_id'],store)
                self.page.locator('#repair-note').fill('Check this package.')
                self.page.locator('#flag-product').click()
                expect(self.page.locator('#editor-status')).to_contain_text('Flagged')
                self.assertEqual((self.fixture.flags[0]['store_id'],self.fixture.flags[0]['product_id']),(store,product))
                self.assertNotIn('target_catalog_categories',[c[1] for c in self.fixture.calls])
                self.assertEqual(self.fixture.failures,[])
                self.context.close()

    def test_legacy_release_limits_to_its_native_routes_and_read_only_tools(self):
        store=WALMART
        self.launch(url=PAGE+'?'+urlencode({'store':store,'aisle':'Automotive'}),store=store)
        self.page.locator('#version-list').select_option(LEGACY_SHA)
        expect(self.page.locator('#editor-frame')).to_be_hidden()
        expect(self.page.locator('#frame-status')).to_contain_text('unavailable in the selected version')
        self.page.locator('#department').select_option('Snacks')
        expect(self.page.locator('#editor-frame')).to_be_visible()
        expect(self.page.locator('#mode-toggle')).to_be_disabled()
        expect(self.page.locator('#version-status')).to_contain_text('Shopping preview only for this store')
        self.page.locator('#version-list').select_option(SHA)
        expect(self.page.locator('#mode-toggle')).to_be_enabled()
        self.page.locator('#department').select_option('Automotive')
        self.assertIn('Automotive',str(self.wait_received('set-aisle','aisle','Automotive')))

    def test_bare_link_opens_directory_invalid_or_other_business_never_loads_grocery(self):
        self.launch(url=PAGE,expect_frame=False)
        expect(self.page).to_have_url(PAGE.replace('grocery-aisle-editor.html','store-directory.html?type=grocery'))
        self.assertEqual(self.fixture.calls,[])
        self.page.goto(PAGE+'?store=invalid')
        expect(self.page.locator('#frame-status')).to_contain_text('invalid store ID')
        self.page.goto(PAGE+'?store='+OTHER)
        expect(self.page.locator('#frame-status')).to_contain_text('different store editor')
        expect(self.page.locator('#editor-frame')).to_be_hidden()
        for store in (BUNNELL,DOLLAR,SPROUTS,UNLISTED):
            self.page.goto(PAGE+'?store='+store)
            expect(self.page.locator('#frame-status')).to_contain_text('unavailable in the app')
            expect(self.page.locator('#editor-frame')).to_be_hidden()
        self.assertEqual({call[1] for call in self.fixture.calls},{'studio_palm_coast_editor_locations'})

    def test_unknown_aisle_never_runs_a_different_store_or_fabricates_stock(self):
        self.launch(url=PAGE+'?'+urlencode({'store':WALMART,'aisle':'Invented aisle'}),store=WALMART,expect_frame=False)
        expect(self.page.locator('#frame-status')).to_contain_text('unavailable in the selected version')
        expect(self.page.locator('#editor-frame')).to_be_hidden()
        self.assertNotIn('Invented aisle',self.page.locator('#department option').all_text_contents())
        self.page.locator('#department').select_option('Automotive')
        expect(self.page.locator('#editor-frame')).to_be_visible()


if __name__=='__main__':
    unittest.main()
