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

TLS: the router asks Traefik's `letsencrypt` resolver for its
certificate. This guard used to also pin a hand-copied cert file
(/etc/traefik/certs/jwhabits.ashbi.ca.{crt,key}) in tls.yml. A
static cert that matches the host wins over ACME, so when that file
was replaced by a self-signed placeholder (2026-07-20) the site
served it and browsers refused the page. The guard now removes that
pinned entry instead of adding it, so Let's Encrypt issues and renews
the real certificate.

Cron entry (every minute):
  * * * * * root /root/jw-habits/ops/traefik-guard.py >> /var/log/jwhabits-traefik-guard.log 2>&1
"""
import os
import re
import shutil
import subprocess
import sys

try:
    import yaml
except ImportError:  # validation is skipped, the atomic write still applies
    yaml = None

if yaml is not None:

    class UniqueKeyLoader(yaml.SafeLoader):
        """SafeLoader that rejects duplicate mapping keys.

        PyYAML keeps the last of two equal keys without complaint, so a
        second `jwhabits:` router would otherwise pass validation.
        """

        def construct_mapping(self, node, deep=False):
            seen = set()
            for key_node, _ in node.value:
                key = self.construct_object(key_node, deep=deep)
                if key in seen:
                    raise yaml.constructor.ConstructorError(
                        None, None, f"duplicate key {key!r}", key_node.start_mark
                    )
                seen.add(key)
            return super().construct_mapping(node, deep)

ROUTERS = "/opt/traefik/dynamic/routers.yml"
TLS = "/opt/traefik/dynamic/tls.yml"
JW_HOST = "jwhabits.ashbi.ca"

# Use `date` for the timestamp — no datetime import, no
# deprecation warning, no timezone gotchas.
LOG_PREFIX = subprocess.run(
    ["date", "-u", "+%Y-%m-%dT%H:%M:%SZ"], capture_output=True, text=True
).stdout.strip()


def log(msg):
    print(f"[{LOG_PREFIX}] {msg}", flush=True)


def guard_revision():
    here = os.path.dirname(os.path.realpath(__file__))
    r = subprocess.run(
        ["git", "-C", here, "rev-parse", "--short", "HEAD"], capture_output=True, text=True
    )
    return r.stdout.strip() or "unknown"


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
    f"      middlewares: [jwhabits-hsts]\n"
    f"      tls:\n"
    f"        certResolver: letsencrypt\n"
)
# HSTS at the TLS edge (nginx container is :80 only).
# max-age=1 year; includeSubDomains for the apex host.
MIDDLEWARE_BLOCK = (
    f"    jwhabits-hsts:\n"
    f"      headers:\n"
    f"        stsSeconds: 31536000\n"
    f"        stsIncludeSubdomains: true\n"
    f"        stsPreload: false\n"
    f"        forceSTSHeader: true\n"
)
SERVICE_BLOCK = (
    f"    jwhabits:\n"
    f"      loadBalancer:\n"
    f"        servers:\n"
    f"          - url: \"http://127.0.0.1:18080\"\n"
)


HSTS_NAME = "jwhabits-hsts"
# A router rule for our host, whether or not the value is quoted. Other
# deploys rewrite routers.yml through a YAML dumper, which drops the quotes.
HOST_RULE = re.compile(
    r"^ {6}rule: *(?P<q>[\"']?)Host\(`" + re.escape(JW_HOST) + r"`\)(?P=q) *(?:#.*)?$"
)


def router_blocks(lines):
    """Yield (start, end) line ranges of the routers under "  routers:".

    A router starts at a 4-space-indented key and runs until the next line
    indented 4 spaces or less.
    """
    try:
        i = lines.index("  routers:\n") + 1
    except ValueError:
        return
    start = None
    while i < len(lines):
        line = lines[i]
        body = line.lstrip(" ")
        indent = len(line) - len(body)
        if body.strip():
            if indent <= 2:
                break
            if indent == 4:
                if start is not None:
                    yield start, i
                start = i
        i += 1
    if start is not None:
        yield start, i


def jw_router_blocks(lines):
    return [
        (s, e)
        for s, e in router_blocks(lines)
        if any(HOST_RULE.match(l.rstrip("\n")) for l in lines[s + 1 : e])
    ]


def attach_hsts(lines):
    """Add jwhabits-hsts to every router whose rule is our host.

    Handles a router with no middlewares, an inline list
    (`middlewares: [a]`) and a block list (`- a` lines). Returns True when
    any router changed.
    """
    changed = False
    # Work from the bottom so earlier line numbers stay valid.
    for s, e in reversed(jw_router_blocks(lines)):
        block = lines[s:e]
        if any(HSTS_NAME in l for l in block):
            continue
        mw = next((k for k, l in enumerate(block) if l.startswith("      middlewares:")), None)
        if mw is None:
            # Put it after the rule line; key order does not matter to Traefik.
            at = s + next(k for k, l in enumerate(block) if HOST_RULE.match(l.rstrip("\n")))
            lines.insert(at + 1, f"      middlewares: [{HSTS_NAME}]\n")
        else:
            line = block[mw].rstrip("\n")
            inline = re.match(r"^( {6}middlewares: *\[)(.*)\] *$", line)
            if inline:
                items = inline.group(2).strip()
                lines[s + mw] = f"{inline.group(1)}{items + ', ' if items else ''}{HSTS_NAME}]\n"
            elif line.strip() == "middlewares:":
                # Block list: copy the indent of the first "- item".
                item = block[mw + 1] if mw + 1 < len(block) else ""
                dash = item[: len(item) - len(item.lstrip(" "))] if item.lstrip().startswith("- ") else "      "
                lines.insert(s + mw + 1, f"{dash}- {HSTS_NAME}\n")
            else:
                log(f"WARNING: unrecognised middlewares line {line!r}; HSTS not attached")
                continue
        changed = True
    return changed


def append_routers():
    """Add the jw-habits router + HSTS middleware + service if missing.

    The file looks like:
      http:
        middlewares:
          <existing>
        routers:
          <existing router blocks>
        services:
          <existing service blocks>

    We insert the middleware (if absent), the router just before
    "  services:", and the service at the end of the services block.
    Every router for our host gets the HSTS middleware attached.
    """
    text = open(ROUTERS).read()
    changed = False

    if f"{HSTS_NAME}:" not in text:
        # Prefer inserting under an existing middlewares: section;
        # otherwise create one before routers:.
        if "\n  middlewares:\n" in text:
            text = text.replace(
                "\n  middlewares:\n",
                "\n  middlewares:\n" + MIDDLEWARE_BLOCK,
                1,
            )
        elif "\n  routers:\n" in text:
            text = text.replace(
                "\n  routers:\n",
                "\n  middlewares:\n" + MIDDLEWARE_BLOCK + "  routers:\n",
                1,
            )
        else:
            log(f"WARNING: '{ROUTERS}' has no middlewares/routers marker; cannot insert HSTS")
            return False
        changed = True

    lines = text.splitlines(keepends=True)
    # The fallback adds `jwhabits:` keys, so it must not run while any exist,
    # even under a router whose rule we don't recognise as ours.
    has_key = any(lines[s] == "    jwhabits:\n" for s, _ in router_blocks(lines))
    if not has_key and not jw_router_blocks(lines):
        if "\n  services:\n" not in text:
            log(f"WARNING: '{ROUTERS}' has no 'services:' marker; cannot insert router")
            return False
        text = text.replace("\n  services:\n", "\n" + ROUTER_BLOCK + "  services:\n", 1)
        if not text.endswith("\n"):
            text += "\n"
        text += SERVICE_BLOCK
        lines = text.splitlines(keepends=True)
        changed = True
    if attach_hsts(lines):
        changed = True

    if not changed:
        return False
    return write_checked(ROUTERS, "".join(lines))


def write_checked(path, text):
    """Replace `path` with `text` atomically, refusing output that won't parse.

    routers.yml and tls.yml are shared by every site on the VPS, and Traefik
    reloads them the moment they change, so a half-written or broken file
    takes all of them down. Write a sibling temp file (its name does not end
    in .yml, so the file provider ignores it), parse it, then rename it over
    the original. Returns True when the file was replaced.
    """
    if yaml is not None:
        try:
            doc = yaml.load(text, Loader=UniqueKeyLoader)
        except yaml.YAMLError as e:
            log(f"ABORT: refusing to write {path}; result is not valid YAML: {e}")
            return False
        if not isinstance(doc, dict):
            log(f"ABORT: refusing to write {path}; result is not a YAML mapping")
            return False
    tmp = os.path.join(os.path.dirname(path), f".{os.path.basename(path)}.guard-tmp")
    with open(tmp, "w") as f:
        f.write(text)
        f.flush()
        os.fsync(f.fileno())
    shutil.copymode(path, tmp)
    os.replace(tmp, path)
    return True


def remove_pinned_cert():
    """Drop the hand-pinned jwhabits cert entry from tls.yml, if present.

    Removes the whole `- certFile: .../jwhabits.ashbi.ca.crt` list item
    (and its keyFile/stores lines). Other certificates are untouched.
    Returns True when the file changed.
    """
    if not os.path.exists(TLS):
        return False
    lines = open(TLS).read().splitlines(keepends=True)
    out = []
    removed = False
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.lstrip(" ")
        if stripped.startswith("- ") and f"{JW_HOST}." in line:
            # Skip this list item and its continuation lines, which are
            # indented deeper than the "- " marker.
            dash_col = len(line) - len(stripped)
            i += 1
            while i < len(lines):
                nxt = lines[i]
                body = nxt.lstrip(" ")
                indent = len(nxt) - len(body)
                if body.strip() and indent <= dash_col:
                    break
                i += 1
            removed = True
            continue
        out.append(line)
        i += 1
    if not removed:
        return False
    return write_checked(TLS, "".join(out))


def main():
    rc = 0
    if not os.path.exists(ROUTERS):
        log(f"ABORT: {ROUTERS} does not exist; cannot guard")
        return 1

    changed = False
    if append_routers():
        log(f"updated jwhabits router/HSTS middleware in {ROUTERS}")
        changed = True
    if remove_pinned_cert():
        log(f"removed pinned jwhabits cert from {TLS}; letsencrypt resolver takes over")
        changed = True

    # Name the commit in every run, so a checkout that was never pulled
    # shows up in the log instead of passing as "correct".
    rev = f"guard @ {guard_revision()}"
    if changed:
        log(f"traefik dynamic files updated; jw-habits is live again ({rev})")
    else:
        log(f"traefik dynamic files are correct; no action ({rev})")

    return rc


if __name__ == "__main__":
    sys.exit(main())
