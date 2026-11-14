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
import shutil
import tempfile
import hashlib
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
from tkinter import ttk, messagebox, filedialog

VERSION = '1.4.0'
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
    try:
        with urllib.request.build_opener(NoRedirect).open(req, timeout=timeout) as response:
            body = response.read(4 * 1024 * 1024 + 1)
            if len(body) > 4 * 1024 * 1024:
                raise ValueError('Forge response is too large. Review it in Forge before continuing.')
            return json.loads(body) if body else None
    except urllib.error.HTTPError as error:
        try:
            detail = json.loads(error.read(16384))
        except Exception:
            detail = {}
        messages = {
            'invalid_credentials': 'Email or password was not accepted. You can use Email sign-in instead.',
            'otp_expired': 'This sign-in link or code expired or was already used. Request a fresh email and copy its link before opening it.',
            'over_email_send_rate_limit': 'Please wait before requesting another sign-in email.',
            'email_address_not_authorized': 'This project cannot send to that email address. Check its email delivery settings.',
            'email_not_confirmed': 'This email needs confirmation before password sign-in.',
            'signup_disabled': 'No existing account matches this email. No new account was created.',
            'email_provider_disabled': 'Email sign-in is disabled for this app.',
            'email_address_invalid': 'Enter a valid owner email address.',
        }
        code = (detail.get('error_code') or detail.get('code')) if isinstance(detail, dict) else None
        if isinstance(code, str) and code in messages:
            error.msg = messages[code]
        # Preserve HTTPError for existing reconnect logic. Never log response bodies/tokens.
        raise


def email_address(value):
    value = value.strip().lower()
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value):
        raise ValueError('Enter your existing app owner email.')
    return value


def email_login_payload(email, value):
    email = email_address(email)
    value = value.strip()
    if re.fullmatch(r'[0-9]{6,8}', value):
        return {'email': email, 'token': value, 'type': 'email'}
    try:
        link = urllib.parse.urlsplit(value)
        query = urllib.parse.parse_qs(link.query, strict_parsing=True)
        if link.scheme != 'https' or link.netloc != 'afnihsdxtisneuyehatw.supabase.co' or link.path != '/auth/v1/verify' or link.fragment:
            raise ValueError()
        if len(query.get('type', [])) != 1 or query['type'][0] not in ('magiclink', 'email'):
            raise ValueError()
        tokens = query.get('token_hash', query.get('token', []))
        if len(tokens) != 1 or not re.fullmatch(r'[A-Za-z0-9_-]{20,256}', tokens[0]):
            raise ValueError()
        if 'token_hash' in query and 'token' in query:
            raise ValueError()
        return {'token_hash': tokens[0], 'type': 'email'}
    except ValueError:
        raise ValueError('Copy the Log In link address from the sign-in email and paste it here, or enter its numeric code. Do not open the link first.') from None


def send_login_email(email):
    # Only a user-click sends mail. Existing-account-only: no signup or password reset.
    return request(PROJECT + '/auth/v1/otp', 'POST',
                   {'email': email_address(email), 'create_user': False}, {'apikey': PUBLIC_KEY})

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

# BEGIN BUNDLED CLOUD PREPARATION
"""Bounded cloud footage preparation. Inputs remain intact; output is animated RGBA WebP."""
import json
import math
import subprocess
from pathlib import Path

def cloud_recipe(settings):
    media = settings.get('media', settings)
    prep = settings.get('preparation', {})
    def number(value, default, low, high):
        value = default if value is None else value
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError('Invalid cloud preparation number')
        return max(low, min(high, value))
    start = number(media.get('in'), 0, 0, 36000)
    end = number(media.get('out'), start + 10, 0, 36000)
    if end <= start or end - start > 30:
        raise ValueError('Select a cloud slice longer than zero and no more than 30 seconds')
    crop = media.get('crop') or {}
    x = number(crop.get('x'), 0, 0, .95)
    y = number(crop.get('y'), 0, 0, .95)
    width = number(crop.get('width'), 1, .05, 1 - x)
    height = number(crop.get('height'), 1, .05, 1 - y)
    color = prep.get('keyColor', '#000000')
    if not isinstance(color, str) or len(color) != 7 or color[0] != '#' or any(c not in '0123456789abcdefABCDEF' for c in color[1:]):
        raise ValueError('Choose a six-digit key color')
    fps = int(number(prep.get('fps'), 8, 4, 10))
    brightness = number(media.get('brightness'), 1, .2, 2)
    contrast = number(media.get('contrast'), 1, .2, 2)
    saturation = number(media.get('saturation'), 1, 0, 2)
    # RGB brightness/contrast followed by the same luminance matrix as CSS saturate.
    curve = "'clip((val*%s-127.5)*%s+127.5,0,255)'" % (brightness, contrast)
    luma = [.213, .715, .072]
    channels = ['r', 'g', 'b']
    matrix = ':'.join(channels[row] + channels[col] + '=' + str(luma[col] * (1-saturation) + (saturation if row == col else 0))
                      for row in range(3) for col in range(3))
    filters = ['fps=' + str(fps),
               'crop=iw*%s:ih*%s:iw*%s:ih*%s' % (width, height, x, y),
               'format=rgba', 'lutrgb=r=%s:g=%s:b=%s' % (curve, curve, curve),
               'colorchannelmixer=' + matrix]
    if prep.get('removeBackground', True):
        filters.append('colorkey=0x%s:%s:%s' % (color[1:],
            number(prep.get('similarity'), .10, .01, .9), number(prep.get('softness'), .12, 0, .8)))
    filters.extend(['scale=640:426:force_original_aspect_ratio=decrease',
                    'pad=640:426:(ow-iw)/2:(oh-ih)/2:color=black@0', 'setsar=1'])
    return {'start': start, 'duration': end-start, 'fps': fps, 'filters': ','.join(filters),
            'pingpong': bool(prep.get('pingpong', True)),
            'quality': int(number(prep.get('quality'), 85, 50, 100))}

def cloud_command(ffmpeg, source, destination, settings):
    r = cloud_recipe(settings)
    filters = '[0:v]%s[v0];[v0]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]' % r['filters'] if r['pingpong'] else '[0:v]%s[v]' % r['filters']
    return [str(ffmpeg), '-nostdin', '-v', 'error', '-y', '-ss', str(r['start']), '-t', str(r['duration']), '-i', str(source),
            '-filter_complex', filters, '-map', '[v]', '-an', '-c:v', 'libwebp_anim', '-quality', str(r['quality']),
            '-loop', '0', '-vsync', '0', str(destination)]

def cloud_webp_info(path):
    data = Path(path).read_bytes()
    if len(data) < 20 or data[:4] != b'RIFF' or data[8:12] != b'WEBP':
        raise ValueError('Prepared output is not a WebP file')
    if int.from_bytes(data[4:8], 'little') + 8 != len(data):
        raise ValueError('Prepared cloud size is invalid')
    offset, frames, duration_ms = 12, 0, 0
    width, height = 0, 0
    while offset + 8 <= len(data):
        kind = data[offset:offset+4]
        size = int.from_bytes(data[offset+4:offset+8], 'little')
        body = data[offset+8:offset+8+size]
        if len(body) != size:
            raise ValueError('Prepared cloud is truncated')
        if kind == b'VP8X' and len(body) >= 10:
            width = 1 + int.from_bytes(body[4:7], 'little')
            height = 1 + int.from_bytes(body[7:10], 'little')
        if kind == b'ANMF' and len(body) >= 16:
            frames += 1
            duration_ms += int.from_bytes(body[12:15], 'little')
        offset += 8 + size + size % 2
    if frames < 2:
        raise ValueError('This slice contains no changing cloud frames; choose a moving cloud clip')
    if width != 640 or height != 426 or duration_ms <= 0 or frames > 600:
        raise ValueError('Prepared cloud dimensions, duration or frame count are invalid')
    return {'frames': frames, 'duration': duration_ms / 1000}

def prepare_cloud(source, destination, settings, ffmpeg='ffmpeg'):
    source, destination = Path(source).resolve(), Path(destination).resolve()
    if source == destination or not source.is_file() or source.stat().st_size > 250 * 1024 * 1024:
        raise ValueError('Choose a source clip under 250 MB and a separate output file')
    if destination.exists():
        raise ValueError('Output already exists; choose a new name')
    command = cloud_command(ffmpeg, source, destination, settings)
    try:
        subprocess.run(command, check=True, capture_output=True, timeout=300)
        if not destination.is_file() or destination.stat().st_size > 25 * 1024 * 1024:
            raise ValueError('Cloud output exceeds 25 MB; shorten the slice or lower its quality')
        r = cloud_recipe(settings)
        animation = cloud_webp_info(destination)
        return {'width': 640, 'height': 426, 'fps': r['fps'], 'duration': animation['duration'], 'frames': animation['frames'],
                'alpha': 'keyed' if settings.get('preparation', {}).get('removeBackground', True) else 'source',
                'format': 'animated-webp', 'bytes': destination.stat().st_size, 'sourceUnchanged': True}
    except Exception:
        destination.unlink(missing_ok=True)
        raise

# END BUNDLED CLOUD PREPARATION

class Connector:
    def __init__(self, base, log, ffmpeg=""):
        self.base = local_address(base) if base.strip() else ""
        self.ffmpeg = ffmpeg or shutil.which("ffmpeg")
        self.cloud_ready = False
        if self.ffmpeg:
            try:
                check = subprocess.run([self.ffmpeg, "-hide_banner", "-encoders"], capture_output=True, text=True, timeout=10, creationflags=0x08000000 if sys.platform == "win32" else 0)
                self.cloud_ready = check.returncode == 0 and "libwebp_anim" in check.stdout
            except Exception:
                self.cloud_ready = False
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
                    {'email': email_address(email), 'password': password}, {'apikey': PUBLIC_KEY})
        if s.get('user', {}).get('id') != OWNER:
            raise ValueError('This queue belongs to the Asgard app owner. Use that account.')
        s['expires_at'] = time.time() + s['expires_in']
        self.session = s

    def connect_email(self, email, link_or_code):
        s = request(PROJECT + '/auth/v1/verify', 'POST', email_login_payload(email, link_or_code), {'apikey': PUBLIC_KEY})
        if s.get('user', {}).get('id') != OWNER:
            raise ValueError('Use the email belonging to the Asgard app owner.')
        if not s.get('access_token') or not s.get('refresh_token') or not s.get('expires_in'):
            raise ValueError('Email sign-in did not return a complete session. Request a fresh link.')
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
        if not self.base:
            raise ValueError('No local Forge collector selected; cloud preparation may still run.')
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
            return ['scrape'] + (['cloud_prepare'] if self.cloud_ready else [])
        except Exception as error:
            self.log('Connected to studio; collector unavailable: ' + str(error))
            return ['cloud_prepare'] if self.cloud_ready else []

    def heartbeat(self, capabilities):
        body = {'name': 'Danny’s Forge PC', 'capabilities': capabilities,
                'heartbeat_at': utc(), 'version': VERSION,
                'details': {'adapter': 'staging-http' if self.adapter else 'unverified', 'liveCatalogWrites': False, 'cloudPreparation': self.cloud_ready}}
        if self.worker:
            self.cloud('/rest/v1/studio_forge_workers?id=eq.' + self.worker, 'PATCH', body)
        else:
            rows = self.cloud('/rest/v1/studio_forge_workers', 'POST', body, {'Prefer': 'return=representation'})
            self.worker = rows[0]['id']

    def patch(self, **fields):
        self.cloud('/rest/v1/studio_work_jobs?id=eq.' + self.job['id'], 'PATCH',
                   {**fields, 'updated_at': utc()})

    def run_job(self, job):
        if job.get("kind") == "cloud_prepare":
            return self.run_cloud_job(job)
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
                self.heartbeat(['scrape'] + (['cloud_prepare'] if self.cloud_ready else []))
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

    def run_cloud_job(self, job):
        self.job = job
        proc = None
        folder_path = None
        try:
            if not self.cloud_ready:
                raise ValueError('Choose an installed FFmpeg with animated WebP support.')
            payload = job['payload']
            url = payload.get('sourceUrl', '')
            parsed = urllib.parse.urlsplit(url)
            if parsed.scheme != 'https' or parsed.netloc != 'afnihsdxtisneuyehatw.supabase.co' or parsed.query or parsed.fragment or not parsed.path.startswith(('/storage/v1/object/public/studio/', '/storage/v1/object/public/asgard_ui/')):
                raise ValueError('Choose a clip from the existing shared Studio media.')
            settings = payload.get('settings', {})
            recipe = cloud_recipe(settings)
            with tempfile.TemporaryDirectory(prefix='asgard-cloud-', ignore_cleanup_errors=True) as folder:
                folder_path = folder
                source, output = Path(folder) / 'source.media', Path(folder) / 'cloud.webp'
                class NoRedirect(urllib.request.HTTPRedirectHandler):
                    def redirect_request(self, *args, **kwargs):
                        return None
                with urllib.request.build_opener(NoRedirect).open(url, timeout=30) as response, source.open('wb') as target:
                    total = 0
                    beat = time.monotonic()
                    while True:
                        chunk = response.read(1024 * 1024)
                        if not chunk:
                            break
                        total += len(chunk)
                        if total > 250 * 1024 * 1024 or self.stop.is_set():
                            raise ValueError('Cloud source too large or connector disconnected.')
                        target.write(chunk)
                        if time.monotonic() - beat > 20:
                            self.heartbeat(['cloud_prepare'] + (['scrape'] if self.adapter else []))
                            self.patch(lease_until=utc(180), progress={'message': 'Downloading selected cloud footage'})
                            beat = time.monotonic()
                with source.open('rb') as source_header:
                    header = source_header.read(16)
                if not (header[4:8] == b'ftyp' or header[:4] == b'\x1aE\xdf\xa3' or header[:4] == b'GIF8' or (header[:4] == b'RIFF' and header[8:12] == b'WEBP')):
                    raise ValueError('Choose an MP4, WebM, GIF or WebP clip.')
                error_path = Path(folder) / 'ffmpeg-error.txt'
                paused = False
                started = 0
                with error_path.open('wb') as errors:
                    while not self.stop.is_set():
                        self.heartbeat(['cloud_prepare'] + (['scrape'] if self.adapter else []))
                        rows = self.cloud('/rest/v1/studio_work_jobs?id=eq.' + job['id'] + '&select=requested_action,worker_id,status')
                        current = rows[0] if rows else {}
                        if current.get('worker_id') != self.worker or current.get('status') not in ('running', 'paused'):
                            raise ValueError('Cloud job assignment changed.')
                        action = current.get('requested_action')
                        if action == 'cancel':
                            if proc and proc.poll() is None:
                                proc.terminate()
                                proc.wait(timeout=10)
                            self.patch(status='cancelled', requested_action=None, lease_until=None)
                            return
                        if action == 'pause':
                            if proc and proc.poll() is None:
                                proc.terminate()
                                proc.wait(timeout=10)
                            proc = None
                            paused = True
                            self.patch(status='paused', requested_action=None, lease_until=utc(180), progress={'message': 'Cloud preparation paused. Resume restarts this bounded conversion.'})
                        if action == 'resume':
                            paused = False
                            self.patch(status='running', requested_action=None)
                        if paused:
                            self.patch(lease_until=utc(180))
                            self.stop.wait(3)
                            continue
                        if proc is None:
                            command = cloud_command(self.ffmpeg, source, output, settings)
                            command[1:1] = ['-protocol_whitelist', 'file,pipe']
                            proc = subprocess.Popen(command, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=errors,
                                creationflags=0x08000000 if sys.platform == 'win32' else 0)
                            started = time.monotonic()
                        if proc.poll() is not None:
                            if proc.returncode != 0:
                                raise ValueError('FFmpeg could not prepare this clip. Check its crop and format.')
                            break
                        if time.monotonic() - started > 300:
                            raise ValueError('Cloud preparation exceeded five minutes. Shorten the slice.')
                        self.patch(lease_until=utc(180), progress={'message': 'Preparing transparent animated cloud footage'})
                        self.stop.wait(3)
                if self.stop.is_set():
                    raise ValueError('Connector disconnected. Source retained; queue a retry when connected.')
                metadata = cloud_webp_info(output)
                content = output.read_bytes()
                if len(content) > 25 * 1024 * 1024:
                    raise ValueError('Cloud exceeds 25 MB. Shorten the slice or lower quality.')
                self.cloud('/rest/v1/studio_forge_workers?select=id&limit=1')
                path = OWNER + '/' + job['id'] + '/cloud.webp'
                req = urllib.request.Request(PROJECT + '/storage/v1/object/studio-job-artifacts/' + path,
                    data=content, method='POST', headers={'apikey': PUBLIC_KEY, 'Authorization': 'Bearer ' + self.session['access_token'],
                    'Content-Type': 'image/webp', 'x-upsert': 'false'})
                with urllib.request.build_opener(NoRedirect).open(req, timeout=60) as response:
                    if response.status not in (200, 201):
                        raise ValueError('Could not save the prepared cloud.')
                artifact = {'path': path, 'width': 640, 'height': 426, 'kind': 'cloud', 'format': 'animated-webp',
                            'sha256': hashlib.sha256(content).hexdigest(), 'bytes': len(content), **metadata}
                self.patch(status='review_ready', lease_until=None, requested_action=None,
                    result={'artifacts': [artifact], 'sourceUnchanged': True, 'message': 'Animated cloud prepared. Review transparency and assign a cloud slot in Construction & cloud motion.'})
                self.log('Cloud prepared for review. The installed app was not changed.')
        except Exception as error:
            try:
                self.patch(status='failed', lease_until=None, result={'message': str(error), 'sourceUnchanged': True})
            except Exception:
                self.log('Cloud job could not report its final status. Inspect this job before retrying.')
            self.log(str(error))
        finally:
            if proc and proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait(timeout=5)
            if folder_path:
                shutil.rmtree(folder_path, ignore_errors=True)
            self.job = None

    def run(self):
        capabilities = self.check_adapter()
        self.heartbeat(capabilities)
        self.log('Studio connected. ' + ('Ready for ' + ', '.join(capabilities) + ' jobs.' if capabilities else 'Choose FFmpeg for clouds or connect a compatible Forge collector.'))
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
    root.title('Asgard • Forge connection 1.4 — email sign-in')
    root.geometry('700x830')
    root.minsize(570, 490)
    frame = ttk.Frame(root, padding=22)
    frame.pack(fill='both', expand=True)
    ttk.Label(frame, text='Connect your Forge to the studio', font=('Segoe UI', 16, 'bold')).pack(anchor='w')
    ttk.Label(frame, text='This window receives collection and cloud-preparation jobs from your studio.\n'
              'Products stay in staging for review; this connector does not publish.', wraplength=580).pack(anchor='w', pady=12)
    try:
        settings = json.loads(CONFIG.read_text())
    except Exception:
        settings = {}
    entries = {}
    for key, label, default in [('base', 'Local Forge address', settings.get('base', '')),
                                ('ffmpeg', 'FFmpeg program (optional; detected from PATH)', settings.get('ffmpeg', shutil.which('ffmpeg') or '')),
                                ('email', 'App owner email', '')]:
        ttk.Label(frame, text=label).pack(anchor='w')
        inp = ttk.Entry(frame, show='•' if key == 'password' else '')
        inp.insert(0, default)
        inp.pack(fill='x', pady=(2, 9))
        entries[key] = inp
    signin = ttk.Notebook(frame)
    email_tab, password_tab = ttk.Frame(signin, padding=8), ttk.Frame(signin, padding=8)
    signin.add(email_tab, text='Email sign-in — no password')
    signin.add(password_tab, text='Password')
    signin.pack(fill='x', pady=4)
    send_button = ttk.Button(email_tab, text='Email me a sign-in link', command=lambda: send_email())
    send_button.pack(anchor='w')
    ttk.Label(email_tab, text='In that email, right-click Log In → Copy Link. Paste below without opening it.', wraplength=620).pack(anchor='w', pady=4)
    entries['email_link'] = ttk.Entry(email_tab, show='•')
    entries['email_link'].pack(fill='x')
    def paste_link():
        try:
            value = root.clipboard_get()
            entries['email_link'].delete(0, 'end')
            entries['email_link'].insert(0, value)
        except tk.TclError:
            log('Copy the email’s Log In link first, then choose Paste copied link.')
    ttk.Button(email_tab, text='Paste copied link', command=paste_link).pack(anchor='w', pady=4)
    ttk.Label(password_tab, text='Existing app password (optional alternative)').pack(anchor='w')
    entries['password'] = ttk.Entry(password_tab, show='•')
    entries['password'].pack(fill='x')
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
    def choose_ffmpeg():
        name = filedialog.askopenfilename(title='Choose your installed FFmpeg program', filetypes=[('FFmpeg program', '*.exe'), ('All files', '*')])
        if name:
            entries['ffmpeg'].delete(0, 'end')
            entries['ffmpeg'].insert(0, name)
    ttk.Button(frame, text='Choose FFmpeg for cloud clips', command=choose_ffmpeg).pack(anchor='w', pady=4)
    remember = tk.BooleanVar(value=bool(settings.get('remember', False)))
    ttk.Checkbutton(frame, text='Keep connected after Windows restarts (encrypted on this Windows account)', variable=remember).pack(anchor='w')
    ttk.Label(frame, text='Password is never saved. Remembered connection uses Windows encryption. Keep this file in Downloads.', wraplength=580).pack(anchor='w')
    output = tk.Text(frame, height=5, state='disabled', wrap='word')
    output.pack(fill='both', expand=True, pady=12)
    events = queue.Queue()
    active = {'connector': None, 'thread': None}
    def log(value):
        events.put(value)
    def send_email():
        try:
            email = email_address(entries['email'].get())
        except ValueError as error:
            log(str(error))
            return
        send_button.configure(state='disabled')
        def work():
            try:
                send_login_email(email)
                events.put(('email_done', 'Sign-in email requested. Check your inbox and spam folder; copy its Log In link, paste here, then Connect.'))
            except Exception as error:
                events.put(('email_done', 'Could not send sign-in email: ' + str(error)))
        threading.Thread(target=work, daemon=True).start()
    def pump():
        while not events.empty():
            value = events.get()
            if isinstance(value, tuple) and value[0] == 'email_done':
                send_button.configure(state='normal')
                value = value[1]
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
            c = Connector(entries['base'].get(), log, entries['ffmpeg'].get().strip())
        except ValueError as error:
            messagebox.showerror('Forge address', str(error))
            return
        email, password = entries['email'].get().strip(), entries['password'].get()
        link_or_code = entries['email_link'].get()
        use_email = signin.index(signin.select()) == 0
        entries['email_link'].delete(0, 'end')
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
                elif use_email:
                    c.connect_email(email, link_or_code)
                else:
                    if not password:
                        raise ValueError('Enter your app password or choose Email sign-in.')
                    c.connect(email, password)
                if c.stop.is_set():
                    return
                if c.remember:
                    save_session(c.session)
                    set_startup(True)
                elif sys.platform == 'win32':
                    set_startup(False)
                CONFIG.write_text(json.dumps({'base': c.base, 'remember': c.remember, 'ffmpeg': c.ffmpeg or ''}))
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
            CONFIG.write_text(json.dumps({'base': entries['base'].get(), 'remember': False, 'ffmpeg': entries['ffmpeg'].get()}))
            log('Saved owner connection and Windows startup entry removed.')
        except Exception as error:
            log(str(error))
    ttk.Button(bar, text='Forget saved connection', command=forget).pack(side='left')
    def close():
        if active['connector'] and active['connector'].job:
            if not messagebox.askyesno('Work running', 'Disconnect and stop this job? Its original inputs will be retained.'):
                return
            disconnect()
            def finish_close():
                if active['thread'] and active['thread'].is_alive():
                    root.after(100, finish_close)
                else:
                    root.destroy()
            root.after(100, finish_close)
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
