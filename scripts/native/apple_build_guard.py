"""Read Apple metadata to reject reused build numbers. Never logs authentication."""
import base64
import json
import os
from pathlib import Path
import subprocess
import time
import tempfile
import sys
import urllib.parse
import urllib.error
import urllib.request


def encode(value):
    return base64.urlsafe_b64encode(value).rstrip(b'=')


def jwt():
    now = int(time.time())
    header = {'alg': 'ES256', 'kid': os.environ['ASC_KEY_ID'], 'typ': 'JWT'}
    payload = {'iss': os.environ['ASC_ISSUER_ID'], 'iat': now, 'exp': now + 300, 'aud': 'appstoreconnect-v1'}
    message = encode(json.dumps(header).encode()) + b'.' + encode(json.dumps(payload).encode())
    signature = subprocess.check_output(['openssl', 'dgst', '-sha256', '-sign', os.environ['ASC_KEY_PATH']], input=message, stderr=subprocess.PIPE)
    if signature[0] != 48 or signature[1] != len(signature) - 2:
        raise ValueError('Unexpected Apple signature format')
    pos, raw = 2, b''
    for _ in range(2):
        if signature[pos] != 2:
            raise ValueError('Unexpected Apple signature integer')
        length = signature[pos + 1]
        raw += int.from_bytes(signature[pos + 2:pos + 2 + length], 'big').to_bytes(32, 'big')
        pos += 2 + length
    return (message + b'.' + encode(raw)).decode()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('Apple API redirects require reconciliation')


class AppleAPIError(RuntimeError):
    """An Apple API failure reduced to non-sensitive diagnostic fields."""

    def __init__(self, status, path, code=None, title=None):
        self.status = status
        self.path = path
        self.code = code
        self.title = title
        summary = f'Apple API HTTP {status} at {path}'
        if code:
            summary += f' ({code})'
        if title:
            summary += f': {title}'
        super().__init__(summary)


def _api_error(url, status, body):
    """Build a safe error from an Apple JSON error response.

    Keep response details out of logs: Apple can echo request context, while
    the status, code and title are sufficient to distinguish auth, permission,
    endpoint and data failures.
    """
    code = title = None
    try:
        errors = body.get('errors', [])
        if errors:
            first = errors[0]
            code = str(first.get('code') or '') or None
            title = str(first.get('title') or '') or None
    except (AttributeError, TypeError):
        pass
    return AppleAPIError(status, urllib.parse.urlparse(url).path, code, title)


def get(url):
    if not url.startswith('https://api.appstoreconnect.apple.com/v1/'):
        raise ValueError('Unexpected Apple API destination')
    request = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + jwt()})
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        try:
            body = json.load(error)
        except (json.JSONDecodeError, TypeError, ValueError):
            body = {}
        raise _api_error(url, error.code, body) from error
    except urllib.error.URLError as error:
        raise RuntimeError(f'Apple API connection failed at {urllib.parse.urlparse(url).path}') from error


def unused(metadata, builds):
    # Apple can reject a number lower than an earlier upload in this version train.
    versions = [b['attributes']['version'] for b in builds]
    if any(not str(v).isdigit() for v in versions):
        raise ValueError('Non-numeric Apple build history needs owner reconciliation')
    if any(int(v) >= int(metadata['buildNumber']) for v in versions):
        raise ValueError('Commit a new unused build number before releasing')


def main():
    metadata = json.loads(Path('replay-native-version.json').read_text())
    base = 'https://api.appstoreconnect.apple.com/v1/'
    app = get(base + 'apps/' + '6821076241')
    if app['data']['attributes']['bundleId'] != 'ca.ashbi.habittracker':
        raise ValueError('Apple app does not match the repository bundle')
    query = urllib.parse.urlencode({'filter[app]': '6821076241', 'filter[preReleaseVersion.version]': metadata['version'], 'filter[preReleaseVersion.platform]': 'IOS', 'limit': '200'})
    url, builds, seen = base + 'builds?' + query, [], set()
    while url:
        if url in seen:
            raise ValueError('Apple pagination did not advance')
        seen.add(url)
        page = get(url)
        builds.extend(page['data'])
        url = page.get('links', {}).get('next')
    unused(metadata, builds)
    print('Apple identity and unused build number verified. No Apple state changed.')

if __name__ == '__main__':
    try:
        for name in ('ASC_API_PRIVATE_KEY', 'ASC_KEY_ID', 'ASC_ISSUER_ID'):
            if not os.environ.get(name):
                raise ValueError('Missing protected upload authentication')
        with tempfile.TemporaryDirectory(prefix='faithful-apple-') as directory:
            key = Path(directory) / 'private.p8'
            with key.open('x', opener=lambda path, flags: os.open(path, flags, 0o600)) as output:
                output.write(os.environ['ASC_API_PRIVATE_KEY'])
            os.environ['ASC_KEY_PATH'] = str(key)
            main()
    except AppleAPIError as error:
        print(f'Apple build-history verification failed: {error}; reconcile before upload', file=sys.stderr)
        raise SystemExit(1)
    except Exception:
        print('Apple build-history verification failed; reconcile before upload', file=sys.stderr)
        raise SystemExit(1)
