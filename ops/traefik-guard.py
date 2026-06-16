#!/usr/bin/env python3
"""jw-habits Traefik + manifest guard.

The /opt/vps/bin/render.py script (Caddy-era) was archived on
2026-06-16 22:28. The current edge is Traefik with a dynamic
file provider watching /etc/traefik/dynamic/. The new way to
add a site is to manually edit the two dynamic files:

  /etc/traefik/dynamic/routers.yml   - router + service blocks
  /etc/traefik/dynamic/tls.yml        - cert file references

The /opt/vps/manifest/sites.yaml file still exists but is no
longer the live source of truth (per /opt/vps/bin/README.md).
It IS however the source of truth for what should be in
the dynamic files - the manifest is the spec.

This guard:
  1. Verifies the jw-habits block is in routers.yml
  2. Verifies the jw-habits cert is in tls.yml
  3. If either is missing, appends the canonical block to the
     file. Idempotent: re-running is a no-op once both files
     are correct.

Cron entry (every minute):
  * * * * * root /root/jw-habits/ops/traefik-guard.py >> /var/log/jwhabits-traefik-guard.log 2>&1
"""
import os
import subprocess
import sys

ROUTERS = "/etc/traefik/dynamic/routers.yml"
TLS = "/etc/traefik/dynamic/tls.yml"
CERTS_DIR = "/etc/traefik/certs"
JW_HOST = "jwhabits.ashbi.ca"

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


ROUTER_BLOCK = (
    "    jw-habits:\n"
    f"      rule: \"Host(`{JW_HOST}`)\"\n"
    "      entryPoints:\n"
    "        - tls_https\n"
    "      service: jw-habits\n"
    "      tls: {}\n"
)
SERVICE_BLOCK = (
    "    jw-habits:\n"
    "      loadBalancer:\n"
    "        servers:\n"
    "          - url: \"http://127.0.0.1:18080\"\n"
)
CERT_BLOCK = (
    f"    - certFile: {CERTS_DIR}/{JW_HOST}.crt\n"
    f"      keyFile: {CERTS_DIR}/{JW_HOST}.key\n"
)


def main():
    rc = 0

    # 1. Routers file
    if not has_block(ROUTERS, "jw-habits:"):
        log(f"jwhabits block missing in {ROUTERS}; appending")
        try:
            text = open(ROUTERS).read()
        except OSError as e:
            log(f"cannot read {ROUTERS}: {e}")
            return 1
        # Insert the router block before "  services:" and the
        # service block at end of services section. The current
        # format ends with a trailing newline.
        if "  services:" in text:
            text = text.replace("  services:", ROUTER_BLOCK + "  services:", 1)
        else:
            text = text.rstrip() + "\n  services:\n" + ROUTER_BLOCK
        # Append the service block. If the file ends with a
        # service block for another host (no trailing newline),
        # add a newline first.
        if not text.endswith("\n"):
            text += "\n"
        text += SERVICE_BLOCK
        with open(ROUTERS, "w") as f:
            f.write(text)
        rc = 0

    # 2. TLS file
    if not has_block(TLS, JW_HOST + ".crt"):
        log(f"jwhabits cert entry missing in {TLS}; appending")
        try:
            text = open(TLS).read()
        except OSError as e:
            log(f"cannot read {TLS}: {e}")
            return 1
        if not text.endswith("\n"):
            text += "\n"
        text += CERT_BLOCK
        with open(TLS, "w") as f:
            f.write(text)
        rc = 0

    # 3. Sanity: if the cert files are missing, log a warning.
    # The guard can't obtain LE certs itself (no DNS, no HTTP
    # challenge from the cert resolver). The user has to put
    # the certs in place manually if they ever disappear.
    if not (os.path.exists(f"{CERTS_DIR}/{JW_HOST}.crt") and os.path.exists(f"{CERTS_DIR}/{JW_HOST}.key")):
        log(f"WARNING: cert files missing at {CERTS_DIR}/{JW_HOST}.{{crt,key}}")
        log("the certs are LE-issued and live in Caddy's cache at")
        log("/root/.local/share/caddy/certificates/acme-v02.api.letsencrypt.org-directory/jwhabits.ashbi.ca/")
        log("copy them with: cp /root/.local/share/caddy/certificates/acme-v02.api.letsencrypt.org-directory/jwhabits.ashbi.ca/jwhabits.ashbi.ca.{crt,key} /etc/traefik/certs/")

    if rc == 0:
        log("traefik dynamic files are correct; no action")
    return rc


if __name__ == "__main__":
    sys.exit(main())
