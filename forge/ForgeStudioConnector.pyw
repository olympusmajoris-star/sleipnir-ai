"""Asgard's outbound Forge connector. Double-click; no console commands.

Only the verified, staging-only Forge HTTP adapter can run collection jobs.
Unknown adapters never run; remote payloads cannot supply commands or paths.
No products are imported into the live catalog by this connector.
"""
import datetime as dt
import json
import re
import subprocess
import sys
import os
import ctypes
from concurrent.futures import ThreadPoolExecutor
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

VERSION = '1.2.0'
CONFIG = Path(__file__).with_name('connector-settings.json')
PROJECT = 'https://afnihsdxtisneuyehatw.supabase.co'
OWNER = '533a05da-fed8-4c92-ba94-7e4867ebce8f'
# A public project identifier; owner authorization uses a separate session.
PUBLIC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmbmloc2R4dGlzbmV1eWVoYXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjUxMDcsImV4cCI6MjA4NzE0MTEwN30.q94Gw7BVKgyGm-I_XXGaoScVK50MMfQMk2RHms3qhps'

SESSION_FILE = Path(__file__).with_name('owner-session.dpapi')

def protect_session(data, decrypt=False):
    """Windows current-user encryption; never save a password or plaintext token."""
    if sys.platform != 'win32':
        raise ValueError('Remembered owner connection requires Windows user encryption.')
    from ctypes import wintypes
    class Blob(ctypes.Structure):
        _fields_ = [('size', wintypes.DWORD), ('data', ctypes.POINTER(ctypes.c_ubyte))]
    buffer = (ctypes.c_ubyte * len(data)).from_buffer_copy(data)
    incoming, outgoing = Blob(len(data), buffer), Blob()
    crypt = ctypes.WinDLL('crypt32', use_last_error=True)
    kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    function = crypt.CryptUnprotectData if decrypt else crypt.CryptProtectData
    function.argtypes = [ctypes.POINTER(Blob), ctypes.c_void_p, ctypes.c_void_p,
                         ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(Blob)]
    function.restype = wintypes.BOOL
    kernel.LocalFree.argtypes = [ctypes.c_void_p]
    kernel.LocalFree.restype = ctypes.c_void_p
    if not function(ctypes.byref(incoming), None, None, None, None, 1, ctypes.byref(outgoing)):
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        return ctypes.string_at(outgoing.data, outgoing.size)
    finally:
        kernel.LocalFree(outgoing.data)

def save_session(session):
    data = protect_session(json.dumps({'refresh_token': session['refresh_token']}).encode())
    temporary = SESSION_FILE.with_suffix('.tmp')
    temporary.write_bytes(data)
    temporary.replace(SESSION_FILE)

def startup_path():
    if sys.platform != 'win32' or not os.environ.get('APPDATA'):
        raise ValueError('Automatic startup requires Windows.')
    return Path(os.environ['APPDATA']) / 'Microsoft' / 'Windows' / 'Start Menu' / 'Programs' / 'Startup' / 'AsgardForgeConnector.cmd'

def startup_command(executable, script):
    for path in (str(executable), str(script)):
        if any(c in path for c in '%&|<>^\r\n"'):
            raise ValueError('Move the connector to a folder without shell-special characters before enabling startup.')
    return '@echo off\n"' + str(executable) + '" "' + str(script) + '" --auto\n'

def set_startup(enabled):
    path = startup_path()
    if not enabled:
        path.unlink(missing_ok=True)
        SESSION_FILE.unlink(missing_ok=True)
        return
    executable = Path(sys.executable)
    if executable.name.lower() == 'python.exe' and executable.with_name('pythonw.exe').is_file():
        executable = executable.with_name('pythonw.exe')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(startup_command(executable, Path(__file__).resolve()), encoding='utf-8')


def utc(seconds=0):
    return (dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=seconds)).isoformat()

def local_address(value):
    p = urllib.parse.urlsplit(value.strip())
    if p.scheme != 'http' or p.hostname not in ('127.0.0.1', 'localhost', '::1') or p.username or p.password or p.path not in ('', '/') or p.query or p.fragment:
        raise ValueError('Enter the local address displayed by the staging Forge app. The direct-import bridge is not supported.')
    return value.strip().rstrip('/')

def request(url, method='GET', data=None, headers=None, timeout=25):
    req = urllib.request.Request(url, method=method, headers=headers or {},
                                 data=None if data is None else json.dumps(data).encode())
    if data is not None:
        req.add_header('Content-Type', 'application/json')
    # No automatic redirects for credential-bearing or local requests.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None
    with urllib.request.build_opener(NoRedirect).open(req, timeout=timeout) as response:
        body = response.read(4 * 1024 * 1024 + 1)
        if len(body) > 4 * 1024 * 1024:
            raise ValueError('Forge response is too large. Review it in Forge before continuing.')
        return json.loads(body) if body else None

def listening_ports(output):
    ports = set()
    for line in output.splitlines():
        cols = line.split()
        if len(cols) >= 4 and cols[0].upper() == 'TCP' and cols[3].upper() == 'LISTENING':
            address = cols[1]
            host, _, port = address.rpartition(':')
            if host in ('127.0.0.1', '0.0.0.0', '[::]', '[::1]') and port.isdigit():
                ports.add(int(port))
    return sorted(ports)

def discover_forge():
    """Read running local listeners; never start or change a Forge process."""
    if sys.platform != 'win32':
        raise ValueError('Automatic detection is for your Windows Forge PC. Enter the local address on other systems.')
    result = subprocess.run(['netstat', '-ano', '-p', 'tcp'], capture_output=True,
                            text=True, timeout=10, creationflags=0x08000000, check=True)
    ports = listening_ports(result.stdout)
    def check(port):
        url = 'http://127.0.0.1:' + str(port)
        try:
            health = request(url + '/api/health', timeout=2)
            if isinstance(health, dict) and health.get('live_catalog_writes') is False and health.get('app_server') == 'online':
                return url
        except Exception:
            pass
        return None
    with ThreadPoolExecutor(max_workers=8) as pool:
        found = [url for url in pool.map(check, ports) if url]
    if len(found) != 1:
        raise ValueError('No running staging Forge found. Open Sleipnir Product Forge first.' if not found
                         else 'More than one Forge is running. Enter the address shown by the one you want.')
    return found[0]


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
        self.remember = False

    def cloud(self, path, method='GET', data=None, extra=None):
        if not self.session:
            raise ValueError('Connect your owner account first.')
        if self.session.get('expires_at', 0) < time.time() + 60:
            self.session = request(PROJECT + '/auth/v1/token?grant_type=refresh_token', 'POST',
                                   {'refresh_token': self.session['refresh_token']}, {'apikey': PUBLIC_KEY})
            self.session['expires_at'] = time.time() + self.session['expires_in']
            if self.remember:
                save_session(self.session)
        return request(PROJECT + path, method, data, {'apikey': PUBLIC_KEY,
                      'Authorization': 'Bearer ' + self.session['access_token'], **(extra or {})})

    def connect(self, email, password):
        s = request(PROJECT + '/auth/v1/token?grant_type=password', 'POST',
                    {'email': email, 'password': password}, {'apikey': PUBLIC_KEY})
        if s.get('user', {}).get('id') != OWNER:
            raise ValueError('This queue belongs to the Asgard app owner. Use that account.')
        s['expires_at'] = time.time() + s['expires_in']
        self.session = s

    def restore(self):
        saved = json.loads(protect_session(SESSION_FILE.read_bytes(), decrypt=True))
        session = request(PROJECT + '/auth/v1/token?grant_type=refresh_token', 'POST',
                          {'refresh_token': saved['refresh_token']}, {'apikey': PUBLIC_KEY})
        if session.get('user', {}).get('id') != OWNER:
            raise ValueError('Saved session does not belong to the app owner.')
        session['expires_at'] = time.time() + session['expires_in']
        self.session = session
        if self.remember and not self.stop.is_set():
            save_session(session)

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
        cancel_requested = False
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
                cancel_requested = cancel_requested or action == 'cancel'
                if action:
                    endpoint = {'pause': '/api/pause', 'resume': '/api/resume', 'cancel': '/api/stop'}[action]
                    self.local(endpoint, 'POST', {})
                proc = self.local('/api/process-status')
                stages = self.local('/api/current-stages')
                if proc.get('running') and proc.get('process_id') != result['process_id']:
                    raise ValueError('Forge process changed. This connector will not control the new process.')
                if cancel_requested and not proc.get('running'):
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
                           lease_until=utc(180), progress={'message': ('Stopping ' if cancel_requested else 'Collecting ') + name, 'stages': stages})
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
    root.geometry('660x600')
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
    def detect():
        def work():
            try:
                value = discover_forge()
                events.put(('address', value))
                log('Found staging Forge: ' + value)
            except Exception as error:
                log(str(error))
        threading.Thread(target=work, daemon=True).start()
    ttk.Button(frame, text='Find my running Forge', command=detect).pack(anchor='w', pady=4)
    remember = tk.BooleanVar(value=bool(settings.get('remember', False)))
    ttk.Checkbutton(frame, text='Keep connected after Windows restarts (encrypted on this Windows account)', variable=remember).pack(anchor='w')
    ttk.Label(frame, text='Password is never saved. Remembered connection uses Windows encryption. Keep this file in Downloads.', wraplength=580).pack(anchor='w')
    output = tk.Text(frame, height=9, state='disabled', wrap='word')
    output.pack(fill='both', expand=True, pady=12)
    events = queue.Queue()
    active = {'connector': None, 'thread': None}
    def log(value):
        events.put(value)
    def pump():
        while not events.empty():
            value = events.get()
            if isinstance(value, tuple) and value[0] == 'address':
                entries['base'].delete(0, 'end')
                entries['base'].insert(0, value[1])
                continue
            output.configure(state='normal')
            output.insert('end', value + '\n')
            output.see('end')
            output.configure(state='disabled')
        root.after(200, pump)
    def connect(auto=False):
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
        c.remember = remember.get()
        def work():
            try:
                if auto:
                    while not c.stop.is_set():
                        try:
                            c.restore()
                            break
                        except urllib.error.HTTPError as error:
                            if error.code in (400, 401, 403):
                                raise ValueError('Saved owner connection expired. Connect with your owner account again.') from error
                            log('Waiting for owner service; retrying in 15 seconds.')
                            c.stop.wait(15)
                        except (urllib.error.URLError, TimeoutError, ConnectionError):
                            log('Waiting for internet; retrying in 15 seconds.')
                            c.stop.wait(15)
                    if c.stop.is_set():
                        return
                else:
                    c.connect(email, password)
                if c.stop.is_set():
                    return
                if c.remember:
                    save_session(c.session)
                    set_startup(True)
                elif sys.platform == 'win32':
                    set_startup(False)
                CONFIG.write_text(json.dumps({'base': c.base, 'remember': c.remember}))
                while not c.stop.is_set():
                    try:
                        c.run()
                    except Exception as error:
                        log('Connection interrupted; retrying: ' + str(error))
                        c.stop.wait(15)
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
    def forget():
        if active['connector']:
            active['connector'].remember = False
        disconnect()
        try:
            set_startup(False)
            remember.set(False)
            CONFIG.write_text(json.dumps({'base': entries['base'].get(), 'remember': False}))
            log('Saved owner connection and Windows startup entry removed.')
        except Exception as error:
            log(str(error))
    ttk.Button(bar, text='Forget saved connection', command=forget).pack(side='left')
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
    if '--auto' in sys.argv and remember.get() and SESSION_FILE.exists():
        root.after(500, lambda: connect(auto=True))
        root.iconify()
    root.mainloop()

if __name__ == '__main__':
    main()
