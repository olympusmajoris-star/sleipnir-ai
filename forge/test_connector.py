import importlib.machinery
import importlib.util
from pathlib import Path
import unittest

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

if __name__=='__main__':
    unittest.main()

class DiscoveryTests(unittest.TestCase):
    def test_only_local_listeners_are_probed(self):
        sample='  TCP    0.0.0.0:8000   0.0.0.0:0   LISTENING   1\n  TCP    127.0.0.1:8738   0.0.0.0:0   LISTENING   2\n  TCP    192.168.1.10:9000   0.0.0.0:0   LISTENING   3\n  TCP    127.0.0.1:5000   127.0.0.1:8000   ESTABLISHED   4'
        self.assertEqual(c.listening_ports(sample), [8000,8738])
