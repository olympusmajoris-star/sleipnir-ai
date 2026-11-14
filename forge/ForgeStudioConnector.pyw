"""Asgard's outbound Forge connector. Double-click; no console commands.

Only the verified, staging-only Forge HTTP adapter can run collection jobs.
Unknown adapters never run; remote payloads cannot supply commands or paths.
No products are imported into the live catalog by this connector.
"""
import datetime as dt
import json
import queue
import threading
import time
import uuid
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
import tkinter as tk
from tkinter import ttk, messagebox

VERSION = '1.0.0'
CONFIG = Path(__file__).with_name('connector-settings.json')
PROJECT = 'https://afnihsdxtisneuyehatw.supabase.co'
OWNER = '533a05da-fed8-4c92-ba94-7e4867ebce8f'
# A public project identifier; owner authorization uses a separate session.
PUBLIC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmbmloc2R4dGlzbmV1eWVoYXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjUxMDcsImV4cCI6MjA4NzE0MTEwN30.q94Gw7BVKgyGm-I_XXGaoScVK50MMfQMk2RHms3qhps'

def utc(seconds=0):
    return (dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=seconds)).isoformat()

def local_address(value):
    p = urllib.parse.urlsplit(value.strip())
    if p.scheme != 'http' or p.hostname not in ('127.0.0.1', 'localhost', '::1') or p.username or p.password or p.path not in ('', '/') or p.query or p.fragment:
        raise ValueError('Enter the local address displayed by the staging Forge app. The direct-import bridge is not supported.')
    return value.strip().rstrip('/')

def request(url, method='GET', data=None, headers=None):
    req = urllib.request.Request(url, method=method, headers=headers or {},
                                 data=None if data is None else json.dumps(data).encode())
    if data is not None:
        req.add_header('Content-Type', 'application/json')
    # No automatic redirects for credential-bearing or local requests.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None
    with urllib.request.build_opener(NoRedirect).open(req, timeout=25) as response:
        body = response.read(4 * 1024 * 1024 + 1)
        if len(body) > 4 * 1024 * 1024:
            raise ValueError('Forge response is too large. Review it in Forge before continuing.')
        return json.loads(body) if body else None

def configured_names(data):
    rows = data.get('stores', []) if isinstance(data, dict) else data
    if not isinstance(rows, list):
        raise ValueError('Forge store list has an unsupported format.')
    return [r if isinstance(r, str) else r.get('name', r.get('store_name', '')) for r in rows if not isinstance(r, dict) or r.get('enabled', 1)]

class Connector:
    def __init__(self, base, log):
        self.base = local_address(base)
        self.log = log
        self.session = None
        self.worker = None
        self.stop = threading.Event()
        self.job = None
        self.adapter = None

    def cloud(self, path, method='GET', data=None, extra=None):
        if not self.session:
            raise ValueError('Connect your owner account first.')
        if self.session.get('expires_at', 0) < time.time() + 60:
            self.session = request(PROJECT + '/auth/v1/token?grant_type=refresh_token', 'POST',
                                   {'refresh_token': self.session['refresh_token']}, {'apikey': PUBLIC_KEY})
            self.session['expires_at'] = time.time() + self.session['expires_in']
        return request(PROJECT + path, method, data, {'apikey': PUBLIC_KEY,
                      'Authorization': 'Bearer ' + self.session['access_token'], **(extra or {})})

    def connect(self, email, password):
        s = request(PROJECT + '/auth/v1/token?grant_type=password', 'POST',
                    {'email': email, 'password': password}, {'apikey': PUBLIC_KEY})
        if s.get('user', {}).get('id') != OWNER:
            raise ValueError('This queue belongs to the Asgard app owner. Use that account.')
        s['expires_at'] = time.time() + s['expires_in']
        self.session = s

    def local(self, path, method='GET', data=None):
        return request(self.base + path, method, data)

    def check_adapter(self):
        self.adapter = None
        try:
            health = self.local('/api/health')
            # Require a positive safety declaration from the installed adapter.
            if not isinstance(health, dict) or health.get('live_catalog_writes') is not False:
                raise ValueError('Forge has not confirmed staging-only operation.')
            if health.get('database') != 'online' or health.get('supabase_configured') is not True:
                raise ValueError('Forge database or staging connection is offline.')
            names = configured_names(self.local('/api/stores'))
            if not names:
                raise ValueError('Forge has no configured stores.')
            process = self.local('/api/process-status')
            if not isinstance(process, dict) or 'running' not in process:
                raise ValueError('Forge process status is unavailable.')
            self.adapter = {'names': names}
            return ['scrape']
        except Exception as error:
            self.log('Connected to studio; collector unavailable: ' + str(error))
            return []

    def heartbeat(self, capabilities):
        body = {'name': 'Danny’s Forge PC', 'capabilities': capabilities,
                'heartbeat_at': utc(), 'version': VERSION,
                'details': {'adapter': 'staging-http' if self.adapter else 'unverified', 'liveCatalogWrites': False}}
        if self.worker:
            self.cloud('/rest/v1/studio_forge_workers?id=eq.' + self.worker, 'PATCH', body)
        else:
            rows = self.cloud('/rest/v1/studio_forge_workers', 'POST', body, {'Prefer': 'return=representation'})
            self.worker = rows[0]['id']

    def patch(self, **fields):
        self.cloud('/rest/v1/studio_work_jobs?id=eq.' + self.job['id'], 'PATCH',
                   {**fields, 'updated_at': utc()})

    def run_job(self, job):
        self.job = job
        started = False
        try:
            stores = self.cloud('/rest/v1/stores?id=eq.' + str(uuid.UUID(job['store_id'])) + '&select=name')
            if not stores:
                raise ValueError('The store no longer exists.')
            name = stores[0]['name']
            names = self.adapter['names']
            exact = [n for n in names if n.casefold() == name.casefold()]
            if len(exact) != 1:
                raise ValueError('Configure this exact store in Forge first: ' + name)
            # Use Forge's existing source configuration, never a remote command.
            status = self.local('/api/process-status')
            if status.get('running'):
                raise ValueError('Forge is already running another job. Retry after it finishes.')
            result = self.local('/api/run', 'POST', {'start_store': exact[0], 'end_store': exact[0]})
            if result.get('status') != 'running' or not result.get('process_id') or result.get('live_catalog_writes') is not False:
                raise ValueError('Forge did not start this job. It may already be running another collection.')
            started = True
            self.log('Collecting ' + name + ' into staging.')
            while not self.stop.wait(3):
                self.heartbeat(['scrape'])
                current = self.cloud('/rest/v1/studio_work_jobs?id=eq.' + job['id'] + '&select=requested_action')[0]
                action = current.get('requested_action')
                if action:
                    endpoint = {'pause': '/api/pause', 'resume': '/api/resume', 'cancel': '/api/stop'}[action]
                    self.local(endpoint, 'POST', {})
                proc = self.local('/api/process-status')
                stages = self.local('/api/current-stages')
                if action == 'cancel' and not proc.get('running'):
                    self.patch(status='cancelled', requested_action=None, lease_until=None,
                               progress={'message': 'Forge confirmed collection stopped.'})
                    return
                if not proc.get('running'):
                    code = proc.get('return_code')
                    if code != 0:
                        raise ValueError('Forge stopped without a successful result. Exit: ' + str(code))
                    self.patch(status='review_ready', requested_action=None, lease_until=None,
                               result={'message': 'Collection completed in Forge staging. Review products and images before importing.',
                                       'storeName': name, 'stages': stages, 'liveCatalogImported': False})
                    self.log(name + ': collection ready for review; no live import.')
                    return
                self.patch(status='paused' if proc.get('paused') else 'running', requested_action=None,
                           lease_until=utc(180), progress={'message': 'Collecting ' + name, 'stages': stages})
            # Disconnect does not silently relaunch or take over another process.
            if started:
                self.local('/api/stop', 'POST', {})
                self.patch(status='paused', lease_until=utc(), progress={'message': 'Connector disconnected; stop requested. Check Forge before retrying.'})
        except Exception as error:
            self.patch(status='failed', lease_until=None, result={'message': str(error), 'liveCatalogImported': False})
            self.log(str(error))
        finally:
            self.job = None

    def run(self):
        capabilities = self.check_adapter()
        self.heartbeat(capabilities)
        self.log('Studio connected. ' + ('Waiting for scrape jobs.' if capabilities else 'Waiting for a compatible running Forge collector.'))
        while not self.stop.is_set():
            try:
                if not self.adapter:
                    capabilities = self.check_adapter()
                self.heartbeat(capabilities)
                if capabilities:
                    jobs = self.cloud('/rest/v1/rpc/claim_studio_work_job', 'POST', {'p_worker_id': self.worker})
                    if jobs:
                        self.run_job(jobs[0])
            except Exception as error:
                self.log('Connection interrupted: ' + str(error))
            self.stop.wait(15)
        if self.worker:
            try:
                self.cloud('/rest/v1/studio_forge_workers?id=eq.' + self.worker, 'PATCH',
                           {'capabilities': [], 'heartbeat_at': utc(-180), 'details': {'status': 'disconnected'}})
            except Exception:
                pass
        self.session = None

def main():
    root = tk.Tk()
    root.title('Asgard • Forge connection')
    root.geometry('640x530')
    root.minsize(570, 490)
    frame = ttk.Frame(root, padding=22)
    frame.pack(fill='both', expand=True)
    ttk.Label(frame, text='Connect your Forge to the studio', font=('Segoe UI', 16, 'bold')).pack(anchor='w')
    ttk.Label(frame, text='Keep Forge running. This window receives collection jobs from your studio.\n'
              'Products stay in staging for review; this connector does not publish.', wraplength=580).pack(anchor='w', pady=12)
    try:
        settings = json.loads(CONFIG.read_text())
    except Exception:
        settings = {}
    entries = {}
    for key, label, default in [('base', 'Local Forge address', settings.get('base', '')),
                                ('email', 'App owner email', ''), ('password', 'App owner password', '')]:
        ttk.Label(frame, text=label).pack(anchor='w')
        inp = ttk.Entry(frame, show='•' if key == 'password' else '')
        inp.insert(0, default)
        inp.pack(fill='x', pady=(2, 9))
        entries[key] = inp
    ttk.Label(frame, text='Your password and session are held in memory only. Reconnect after restarting.', wraplength=580).pack(anchor='w')
    output = tk.Text(frame, height=9, state='disabled', wrap='word')
    output.pack(fill='both', expand=True, pady=12)
    events = queue.Queue()
    active = {'connector': None, 'thread': None}
    def log(value):
        events.put(value)
    def pump():
        while not events.empty():
            output.configure(state='normal')
            output.insert('end', events.get() + '\n')
            output.see('end')
            output.configure(state='disabled')
        root.after(200, pump)
    def connect():
        if active['thread'] and active['thread'].is_alive():
            return
        try:
            c = Connector(entries['base'].get(), log)
        except ValueError as error:
            messagebox.showerror('Forge address', str(error))
            return
        email, password = entries['email'].get().strip(), entries['password'].get()
        entries['password'].delete(0, 'end')
        active['connector'] = c
        def work():
            try:
                c.connect(email, password)
                CONFIG.write_text(json.dumps({'base': c.base}))
                c.run()
            except Exception as error:
                log('Could not connect: ' + str(error))
        active['thread'] = threading.Thread(target=work, daemon=True)
        active['thread'].start()
    def disconnect():
        if active['connector']:
            active['connector'].stop.set()
            log('Disconnect requested. Finishing the current connection safely…')
    bar = ttk.Frame(frame)
    bar.pack(fill='x')
    ttk.Button(bar, text='Connect', command=connect).pack(side='left')
    ttk.Button(bar, text='Disconnect', command=disconnect).pack(side='left', padx=8)
    def close():
        if active['connector'] and active['connector'].job:
            if not messagebox.askyesno('Collection running', 'Disconnect and request Forge to stop this collection?'):
                return
            disconnect()
            root.after(1500, root.destroy)
        else:
            disconnect()
            root.destroy()
    root.protocol('WM_DELETE_WINDOW', close)
    pump()
    root.mainloop()

if __name__ == '__main__':
    main()
