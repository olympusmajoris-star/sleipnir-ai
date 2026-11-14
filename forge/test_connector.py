import importlib.machinery
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import tempfile

loader = importlib.machinery.SourceFileLoader('connector', str(Path(__file__).with_name('ForgeStudioConnector.pyw')))
spec = importlib.util.spec_from_loader(loader.name, loader)
c = importlib.util.module_from_spec(spec)
loader.exec_module(c)

class ConnectorTests(unittest.TestCase):
    def test_only_loopback_collector_addresses(self):
        self.assertEqual(c.local_address('http://127.0.0.1:9000/'), 'http://127.0.0.1:9000')
        for value in ['https://example.com', 'http://user:secret@localhost:8000', 'file:///tmp/test', 'http://localhost:8000/api/run', 'http://localhost.attacker.test:8000']:
            with self.assertRaises(ValueError):
                c.local_address(value)

    def test_disabled_stores_are_not_collectable(self):
        self.assertEqual(c.configured_names({'stores': [{'store_name':'One','enabled':1},{'store_name':'Two','enabled':0}]}), ['One'])

    def test_live_import_adapters_are_rejected(self):
        worker = c.Connector('http://127.0.0.1:9000', lambda _:None)
        worker.local = lambda _: {'live_catalog_writes':True}
        self.assertNotIn('scrape', worker.check_adapter())
        self.assertIsNone(worker.adapter)

    def test_offline_staging_does_not_advertise_collection(self):
        worker = c.Connector('http://127.0.0.1:9000', lambda _:None)
        worker.local = lambda _: {'live_catalog_writes':False,'database':'offline','supabase_configured':True}
        self.assertNotIn('scrape', worker.check_adapter())

    def test_staging_adapter_contract(self):
        worker = c.Connector('http://127.0.0.1:9000', lambda _:None)
        data={'/api/health':{'live_catalog_writes':False,'database':'online','supabase_configured':True},'/api/stores':{'stores':[{'store_name':'Store','enabled':1}]},'/api/process-status':{'running':False}}
        worker.local=lambda path:data[path]
        self.assertIn('scrape', worker.check_adapter())

    def test_existing_run_is_never_taken_over(self):
        worker = c.Connector('http://127.0.0.1:9000',lambda _:None)
        worker.adapter={'names':['Store']}
        patches=[]
        worker.cloud=lambda *args:[{'name':'Store'}]
        worker.local=lambda path,*args: {'running':False} if path=='/api/process-status' else {'status':'already_running','live_catalog_writes':False}
        worker.patch=lambda **kw:patches.append(kw)
        worker.run_job({'id':'job','store_id':'189581c9-d728-4e5d-9e02-ae4de19a15af'})
        self.assertEqual(patches[-1]['status'],'failed')
        self.assertIn('did not start',patches[-1]['result']['message'])

class CloudPreparationTests(unittest.TestCase):
    def test_cloud_worker_can_run_without_retail_collector(self):
        worker = c.Connector('', lambda _: None)
        worker.cloud_ready = True
        self.assertEqual(worker.check_adapter(), ['cloud_prepare'])
        worker.cloud_ready = False
        self.assertEqual(worker.check_adapter(), [])

    def test_remote_source_cannot_point_outside_the_shared_project(self):
        worker = c.Connector('', lambda _: None)
        worker.cloud_ready = True
        reports = []
        worker.patch = lambda **kwargs: reports.append(kwargs)
        worker.run_job({'id': 'job', 'kind': 'cloud_prepare', 'payload': {'sourceUrl': 'https://attacker.example/file.mp4'}})
        self.assertEqual(reports[-1]['status'], 'failed')
        self.assertIsNone(worker.job)

    def test_recipe_rejects_unbounded_or_injected_filters(self):
        for settings in [{'media': {'in': 0, 'out': 31}}, {'media': {'in': 9, 'out': 2}}, {'media': {'in': float('nan'), 'out': 10}}, {'preparation': {'keyColor': '#000000;evil'}}]:
            with self.assertRaises(ValueError):
                c.cloud_recipe(settings)
        command = c.cloud_command('ffmpeg', 'source.mp4', 'cloud.webp', {'media': {'out': 2}})
        self.assertIn('libwebp_anim', command)
        self.assertIn('-an', command)

    def test_single_frame_webp_is_rejected_for_native_decoder(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'still.webp'
            path.write_bytes(b'RIFF' + bytes(4) + b'WEBP' + b'VP8 ' + bytes(4))
            with self.assertRaises(ValueError):
                c.cloud_webp_info(path)

class DiscoveryTests(unittest.TestCase):
    def test_only_local_listeners_are_probed(self):
        sample='  TCP    0.0.0.0:8000   0.0.0.0:0   LISTENING   1\n  TCP    127.0.0.1:8738   0.0.0.0:0   LISTENING   2\n  TCP    192.168.1.10:9000   0.0.0.0:0   LISTENING   3\n  TCP    127.0.0.1:5000   127.0.0.1:8000   ESTABLISHED   4'
        self.assertEqual(c.listening_ports(sample), [8000,8738])

class RememberedSessionTests(unittest.TestCase):
    def test_startup_paths_are_quoted_and_shell_substitution_is_rejected(self):
        self.assertEqual(c.startup_command('C:\\Program Files\\Python\\pythonw.exe', 'C:\\Users\\Danny\\Downloads\\ForgeStudioConnector.pyw'), '@echo off\n"C:\\Program Files\\Python\\pythonw.exe" "C:\\Users\\Danny\\Downloads\\ForgeStudioConnector.pyw" --auto\n')
        for character in '%&|<>^\r\n"':
            with self.assertRaises(ValueError):
                c.startup_command('pythonw.exe', 'C:\\' + character + 'bad.pyw')

    def test_saved_file_contains_only_encrypted_refresh_material(self):
        with tempfile.TemporaryDirectory() as folder:
            filename=Path(folder)/'owner-session.dpapi'
            with patch.object(c,'SESSION_FILE',filename), patch.object(c,'protect_session',return_value=b'encrypted') as protect:
                c.save_session({'refresh_token':'private refresh','access_token':'short token','password':'never save'})
                self.assertEqual(filename.read_bytes(),b'encrypted')
                self.assertEqual(c.json.loads(protect.call_args.args[0]),{'refresh_token':'private refresh'})
                self.assertFalse(filename.with_suffix('.tmp').exists())

    def test_no_plaintext_fallback_without_windows_encryption(self):
        with patch.object(c.sys,'platform','linux'):
            with self.assertRaises(ValueError):
                c.protect_session(b'private')


class EmailSignInTests(unittest.TestCase):
    def test_email_request_does_not_create_an_account_or_reset_password(self):
        with patch.object(c, 'request', return_value={}) as req:
            c.send_login_email(' Owner@Example.com ')
            args = req.call_args.args
            self.assertEqual(args[0], c.PROJECT + '/auth/v1/otp')
            self.assertEqual(args[2], {'email':'owner@example.com','create_user':False})

    def test_original_email_link_and_numeric_code_are_verified_in_existing_project(self):
        code = c.email_login_payload('owner@example.com', '12345678')
        self.assertEqual(code, {'email':'owner@example.com','token':'12345678','type':'email'})
        url=c.PROJECT+'/auth/v1/verify?token='+('a'*64)+'&type=magiclink&redirect_to=https%3A%2F%2Fexample.com'
        self.assertEqual(c.email_login_payload('owner@example.com',url), {'token_hash':'a'*64,'type':'email'})

    def test_foreign_links_recovery_links_and_ambiguous_tokens_are_rejected(self):
        for value in ['https://example.com/auth/v1/verify?token='+('a'*64)+'&type=magiclink',
                      c.PROJECT+'/auth/v1/verify?token='+('a'*64)+'&type=recovery',
                      c.PROJECT+'/auth/v1/verify?token='+('a'*64)+'&token='+('b'*64)+'&type=magiclink',
                      c.PROJECT+'/auth/v1/verify?token='+('a'*64)+'&token_hash='+('b'*64)+'&type=email',
                      'javascript:alert(1)']:
            with self.assertRaises(ValueError): c.email_login_payload('owner@example.com',value)

    def test_wrong_owner_session_is_not_retained(self):
        worker=c.Connector('',lambda _:None)
        with patch.object(c,'request',return_value={'user':{'id':'other'},'access_token':'access','refresh_token':'refresh','expires_in':3600}):
            with self.assertRaises(ValueError): worker.connect_email('owner@example.com','123456')
        self.assertIsNone(worker.session)

    def test_owner_email_session_uses_normal_refresh_path(self):
        worker=c.Connector('',lambda _:None)
        with patch.object(c,'request',return_value={'user':{'id':c.OWNER},'access_token':'access','refresh_token':'refresh','expires_in':3600}):
            worker.connect_email('owner@example.com','123456')
        self.assertEqual(worker.session['user']['id'],c.OWNER)
        self.assertGreater(worker.session['expires_at'],c.time.time())

    def test_auth_error_explains_retry_without_logging_response_token(self):
        import io
        error=c.urllib.error.HTTPError(c.PROJECT+'/auth/v1/token',400,'Bad Request',{},io.BytesIO(b'{"error_code":"invalid_credentials","access_token":"never print"}'))
        with patch.object(c.urllib.request,'build_opener') as opener:
            opener.return_value.open.side_effect=error
            with self.assertRaises(c.urllib.error.HTTPError) as caught: c.request(c.PROJECT+'/auth/v1/token')
        self.assertIn('Email sign-in',str(caught.exception))
        self.assertNotIn('never print',str(caught.exception))

if __name__=='__main__':
    unittest.main()
