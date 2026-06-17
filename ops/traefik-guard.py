#!/usr/bin/env python3
"""jw-habits Traefik dynamic-file guard.

Defends /opt/traefik/dynamic/{routers,tls}.yml against
sibling-deploy wipes. The /opt/vps/bin/render.py script
(Caddy-era) was archived on 2026-06-16 22:28. The current
edge is Traefik with a dynamic file provider that watches
/opt/traefik/dynamic/ (per /opt/vps/bin/README.md).

The caddy-guard.sh and the original traefik-guard.py wrote
to /opt/caddy/Caddyfile and /etc/traefik/dynamic/ — both
of which are NOT the live source of truth. The Caddyfile
was replaced by /opt/traefik/dynamic/, and /etc/traefik/dynamic/
is a separate directory that the traefik container does not
mount. This guard writes to the correct path.

Idempotent: skips work that's already done. Detects the
jw-habits block by its unique router id.

Cron entry (every minute):
  * * * * * root /root/jw-habits/ops/traefik-guard.py >> /var/log/jwhabits-traefik-guard.log 2>&1
"""
import os
import subprocess
import sys

ROUTERS = "/opt/traefik/dynamic/routers.yml"
TLS = "/opt/traefik/dynamic/tls.yml"
CERTS_DIR = "/etc/traefik/certs"
JW_HOST = "jwhabits.ashbi.ca"

# Use `date` for the timestamp — no datetime import, no
# deprecation warning, no timezone gotchas.
LOG_PREFIX = subprocess.run(
    ["date", "-u", "+%Y-%m-%dT%H:%M:%SZ"], capture_output=True, text=True
).stdout.strip()


def log(msg):
    print(f"[{LOG_PREFIX}] {msg}", flush=True)


def has_block(path, marker):
    try:
        return marker in open(path).read()
    except OSError:
        return False


# Router + service blocks, in the exact format render.py
# emits. We append these if missing.
ROUTER_BLOCK = (
    f"    jwhabits:\n"
    f"      rule: \"Host(`{JW_HOST}`)\"\n"
    f"      entryPoints: [websecure]\n"
    f"      service: jwhabits\n"
    f"      tls:\n"
    f"        certResolver: letsencrypt\n"
)
SERVICE_BLOCK = (
    f"    jwhabits:\n"
    f"      loadBalancer:\n"
    f"        servers:\n"
    f"          - url: \"http://127.0.0.1:18080\"\n"
)
CERT_BLOCK = (
    f"    - certFile: {CERTS_DIR}/{JW_HOST}.crt\n"
    f"      keyFile: {CERTS_DIR}/{JW_HOST}.key\n"
)


def append_routers():
    """Add the jw-habits router + service to routers.yml if missing.

    The file looks like:
      http:
        routers:
          <existing router blocks>
        services:
          <existing service blocks>

    We insert the router just before "  services:" and the
    service at the end of the services block.
    """
    text = open(ROUTERS).read()
    if "  jwhabits:" in text:
        return False
    if "\n  services:\n" not in text:
        log(f"WARNING: '{ROUTERS}' has no 'services:' marker; cannot insert router")
        return False
    text = text.replace("\n  services:\n", "\n" + ROUTER_BLOCK + "  services:\n", 1)
    if not text.endswith("\n"):
        text += "\n"
    text += SERVICE_BLOCK
    with open(ROUTERS, "w") as f:
        f.write(text)
    return True


def append_tls():
    text = open(TLS).read()
    if JW_HOST + ".crt" in text:
        return False
    if not text.endswith("\n"):
        text += "\n"
    text += CERT_BLOCK
    with open(TLS, "w") as f:
        f.write(text)
    return True


def main():
    rc = 0
    if not os.path.exists(ROUTERS):
        log(f"ABORT: {ROUTERS} does not exist; cannot guard")
        return 1
    if not os.path.exists(TLS):
        log(f"ABORT: {TLS} does not exist; cannot guard")
        return 1

    changed = False
    if append_routers():
        log(f"appended jwhabits router to {ROUTERS}")
        changed = True
    if append_tls():
        log(f"appended jwhabits cert to {TLS}")
        changed = True

    if changed:
        log("traefik dynamic files updated; jw-habits is live again")
    else:
        log("traefik dynamic files are correct; no action")

    # Sanity: cert files should exist
    cert = f"{CERTS_DIR}/{JW_HOST}.crt"
    key = f"{CERTS_DIR}/{JW_HOST}.key"
    if not (os.path.exists(cert) and os.path.exists(key)):
        log(f"WARNING: cert files missing at {cert} and {key}")
        log("the certs are LE-issued and live in Caddy's cache at")
        log(f"  /root/.local/share/caddy/certificates/acme-v02.api.letsencrypt.org-directory/{JW_HOST}/")
        log(f"copy with: cp <cache_dir>/{JW_HOST}.{ '{' }crt,key{ '}' } {CERTS_DIR}/")
    return rc


if __name__ == "__main__":
    sys.exit(main())
