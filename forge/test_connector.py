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
        self.assertEqual(worker.check_adapter(), [])
        self.assertIsNone(worker.adapter)

    def test_offline_staging_does_not_advertise_collection(self):
        worker = c.Connector('http://127.0.0.1:9000', lambda _:None)
        worker.local = lambda _: {'live_catalog_writes':False,'database':'offline','supabase_configured':True}
        self.assertEqual(worker.check_adapter(), [])

    def test_staging_adapter_contract(self):
        worker = c.Connector('http://127.0.0.1:9000', lambda _:None)
        data={'/api/health':{'live_catalog_writes':False,'database':'online','supabase_configured':True},'/api/stores':{'stores':[{'store_name':'Store','enabled':1}]},'/api/process-status':{'running':False}}
        worker.local=lambda path:data[path]
        self.assertEqual(worker.check_adapter(),['scrape'])

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

if __name__=='__main__':
    unittest.main()
