"""Browser checks for local native Dart source verification. No source leaves the browser."""
from hashlib import sha256
from pathlib import Path
import os
import unittest
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

SITE = Path(__file__).resolve().parents[1]
ORIGIN='https://studio.test'
BUNDLE=b'compiled fixture artifact'
ORIGINAL=b'\xef\xbb\xbf// approved\r\nclass RetailStore {}\r\n'
FOOD=b'class McDonaldsComboPanel {}\r\n'
STUDIO_FOOD=b'class McDonaldsComboPanel { /* verified adapter */ }\r\n'
SHOPPER=b'class RetailStore { /* transferred shopper widget */ }\r\n'
SHOPPER_BUNDLE=b'compiled and independently linked shopping surface'
STREET=b'class ValhallaStreet {}\r\n'
STUDIO_STREET=b'class ValhallaStreet { /* Studio selection */ }\r\n'
sha=lambda data: sha256(data).hexdigest()


class NativeSourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine=sync_playwright().start()
        cls.browser=cls.engine.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH'),
            args=['--no-sandbox','--disable-dev-shm-usage'])
    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.engine.stop()

    def setup_page(self,adapter='retail',first_store='2d8bbe31-50a6-4565-b7e7-911130bfa4fa'):
        self.requests=[]
        self.artifact=BUNDLE
        self.shopper_artifact=SHOPPER_BUNDLE
        self.release={'sources':{'retail':sha(ORIGINAL),'fast_food':sha(FOOD),'valhalla':sha(STREET)},
            'studioSources':{'fast_food':sha(STUDIO_FOOD)},'studioSourceSHA256':sha(STUDIO_STREET),'artifactSHA256':sha(BUNDLE)}
        self.context=self.browser.new_context(viewport={'width':390,'height':844})
        self.addCleanup(self.context.close)
        self.page=self.context.new_page()
        folder='native-valhalla' if adapter=='valhalla' else 'native-commerce-preview'
        html='''<html><main><section id="versions"></section><div id="preview">Preview</div></main>
        <script src="/native-commerce-source.js"></script><script>
        window.events=[];
        NativeCommerceSource.mount(document.querySelector('#versions'),{
          adapter:ADAPTER,storeId:STORE,releaseURL:location.origin+'/FOLDER/release.json',
          onState(s){events.push(s);document.querySelector('#preview').hidden=!['verified','published','shopper'].includes(s.status)}
        });</script></html>'''.replace('ADAPTER',repr(adapter)).replace('STORE',repr(first_store)).replace('FOLDER',folder)
        def serve(route):
            req=route.request; path=urlparse(req.url).path
            self.requests.append((req.method,path,req.post_data))
            if path=='/store-editor.html':return route.fulfill(content_type='text/html',body=html)
            if path=='/native-commerce-source.js':return route.fulfill(path=SITE/'native-commerce-source.js',content_type='text/javascript')
            if path==f'/{folder}/release.json':return route.fulfill(json=self.release)
            if path==f'/{folder}/main.dart.js':return route.fulfill(content_type='text/javascript',body=self.artifact)
            if path=='/native-shopper-preview/release.json':return route.fulfill(json={
                'sources':{'retail':sha(SHOPPER),'fast_food':sha(STUDIO_FOOD+b'shopper')},'artifactSHA256':sha(SHOPPER_BUNDLE)})
            if path=='/native-shopper-preview/main.dart.js':return route.fulfill(content_type='text/javascript',body=self.shopper_artifact)
            return route.fulfill(status=404,body='')
        self.context.route('**/*',serve)
        self.page.goto(ORIGIN+'/store-editor.html')
        self.state('published')

    def state(self,status):
        self.page.wait_for_function("v=>window.events?.at(-1)?.status===v",arg=status)
    def pick(self,name,content):
        self.page.locator('#native-dart-file').set_input_files({'name':name,'mimeType':'text/plain','buffer':content})

    def test_exact_bytes_verify_saved_hash_and_real_compiled_js(self):
        self.setup_page('convenience')
        self.pick('My Site Export.dart',ORIGINAL)
        self.state('verified')
        expect(self.page.locator('#preview')).to_be_visible()
        self.assertEqual(self.page.evaluate('events.at(-1).sourceSha256'),sha(ORIGINAL))
        self.assertEqual(self.page.evaluate('events.at(-1).artifactSha256'),sha(BUNDLE))
        self.assertTrue(any(path.endswith('/main.dart.js') for _,path,_ in self.requests))
        self.assertTrue(all(method=='GET' and body is None for method,_,body in self.requests))

    def test_wrong_family_edited_source_and_reopen_stay_unbuilt_until_explicit_restore(self):
        self.setup_page()
        for content in [FOOD,ORIGINAL.replace(b'\r\n',b'\n')]:
            self.pick('RetailStore.dart',content)
            self.state('unbuilt')
            expect(self.page.locator('#preview')).to_be_hidden()
            self.assertEqual(self.page.evaluate('events.at(-1).sourceSha256'),sha(content))
        self.page.reload()
        self.state('unbuilt')
        expect(self.page.locator('#preview')).to_be_hidden()
        self.page.get_by_role('button',name='Use published build').click()
        self.state('published')
        expect(self.page.locator('#preview')).to_be_visible()
        self.assertTrue(all(method=='GET' and body is None for method,_,body in self.requests))

    def test_changed_artifact_blocks_approved_file_and_retry_recovers(self):
        self.setup_page('fast_food')
        self.pick('McDonaldsComboPanel_Studio.dart',STUDIO_FOOD)
        self.state('verified')
        self.assertEqual(self.page.evaluate('events.at(-1).sourceSha256'),sha(STUDIO_FOOD))
        self.artifact=b'different served bytes'
        self.pick('McDonaldsComboPanel.dart',FOOD)
        self.state('error')
        expect(self.page.locator('#preview')).to_be_hidden()
        self.page.get_by_role('button',name='Use published build').click()
        self.state('error')
        expect(self.page.locator('#preview')).to_be_hidden()
        self.artifact=BUNDLE
        self.page.get_by_role('button',name='Retry verification').click()
        self.state('published')

    def test_valhalla_accepts_only_both_release_attested_dart_versions(self):
        self.setup_page('valhalla')
        for name,src in [('ValhallaStreet.dart',STREET),('ValhallaStreet_Studio.dart',STUDIO_STREET)]:
            self.pick(name,src)
            self.state('verified')
            self.assertEqual(self.page.evaluate('events.at(-1).sourceSha256'),sha(src))
        self.pick('ValhallaStreet.dart',ORIGINAL)
        self.state('unbuilt')

    def test_shopper_transfer_verifies_its_own_binary_and_restores_interactive_version(self):
        self.setup_page('retail')
        self.pick('RetailStore.dart',SHOPPER)
        self.state('shopper')
        event=self.page.evaluate('events.at(-1)')
        self.assertEqual(event['sourceSha256'],sha(SHOPPER))
        self.assertEqual(event['artifactSha256'],sha(SHOPPER_BUNDLE))
        self.assertEqual(event['previewURL'],ORIGIN+'/native-shopper-preview/index.html?store=2d8bbe31-50a6-4565-b7e7-911130bfa4fa')
        self.page.reload()
        self.state('shopper')
        self.page.get_by_role('button',name='Return to interactive Studio').click()
        self.state('published')
        self.assertEqual(self.page.evaluate('events.at(-1).artifactSha256'),sha(BUNDLE))
        self.shopper_artifact=b'unrelated runtime'
        self.pick('RetailStore.dart',SHOPPER)
        self.state('error')
        expect(self.page.locator('#preview')).to_be_hidden()
        self.assertTrue(all(method=='GET' and payload is None for method,_,payload in self.requests))


if __name__=='__main__':
    unittest.main()
