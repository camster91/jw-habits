"""Public metadata probes only; never reads local routines, notes or backups."""
import argparse
import datetime
import json
import socket
import ssl
import urllib.request
from urllib.parse import urlparse


def validate_release(actual, expected):
    if actual.get('revision') != expected:
        raise ValueError(f'Unexpected public revision: {actual.get("revision")} (expected {expected})')
    if not isinstance(actual.get('version'), str):
        raise ValueError('Missing package version')


def validate_expiry(not_after, now=None):
    now = now or datetime.datetime.now(datetime.timezone.utc)
    expires = datetime.datetime.fromtimestamp(ssl.cert_time_to_seconds(not_after), datetime.timezone.utc)
    days = (expires - now).total_seconds() / 86400
    if days < 14:
        raise ValueError(f'TLS certificate expires in {days:.1f} days')
    return round(days, 1)


def get(base, route):
    request = urllib.request.Request(base + route, headers={'User-Agent': 'FaithfulDays-MetadataMonitor/1'})
    with urllib.request.urlopen(request, timeout=20) as response:
        if response.status != 200:
            raise ValueError(f'{route}: HTTP {response.status}')
        return response.read(2_000_000).decode('utf-8')


def monitor(base, revision):
    parsed = urlparse(base)
    if parsed.scheme != 'https':
        raise ValueError('Production monitor requires trusted HTTPS')
    with socket.create_connection((parsed.hostname, 443), timeout=20) as tcp:
        with ssl.create_default_context().wrap_socket(tcp, server_hostname=parsed.hostname) as tls:
            days = validate_expiry(tls.getpeercert()['notAfter'])
    if 'Faithful Days' not in get(base, '/'):
        raise ValueError('Unexpected app shell')
    validate_release(json.loads(get(base, '/release.json')), revision)
    if json.loads(get(base, '/manifest.webmanifest')).get('name') != 'Faithful Days':
        raise ValueError('Unexpected PWA manifest')
    if 'precache' not in get(base, '/sw.js'):
        raise ValueError('Missing service worker precache')
    for route in ('/privacy.html', '/support.html'):
        get(base, route)
    print(json.dumps({'status': 'healthy', 'revision': revision, 'tlsDaysRemaining': days}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', default='https://jwhabits.ashbi.ca')
    parser.add_argument('--revision', required=True)
    args = parser.parse_args()
    monitor(args.base.rstrip('/'), args.revision)
