"""Tests for ops/traefik-guard.py.

Run with: python3 -m unittest ops/test_traefik_guard.py
"""
import importlib.util
import os
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("guard", os.path.join(HERE, "traefik-guard.py"))
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)

# Shaped like the live file after another deploy re-dumped it: unquoted
# rules, block-style lists, and a second router for the same host.
LIVE = """\
http:
  middlewares:
    jwhabits-hsts:
      headers:
        stsSeconds: 31536000
    other-sec:
      headers:
        stsSeconds: 1
  routers:
    lull-relay:
      rule: Host(`lull-relay.ashbi.ca`)
      entryPoints:
      - websecure
      service: lull-relay
      middlewares:
      - lull-no-cache
      tls:
        certResolver: letsencrypt
    jwhabits:
      rule: Host(`jwhabits.ashbi.ca`)
      entryPoints:
      - websecure
      service: jwhabits
      tls:
        certResolver: letsencrypt
    lookalike:
      rule: Host(`www.jwhabits.ashbi.ca`)
      service: jwhabits
    jw-habits:
      rule: Host(`jwhabits.ashbi.ca`)
      entryPoints:
      - websecure
      service: jw-habits
      tls:
        certResolver: letsencrypt
  services:
    jwhabits:
      loadBalancer:
        servers:
        - url: http://127.0.0.1:18080
"""

TLS = """\
tls:
  certificates:
    - certFile: /etc/traefik/certs/lull.ashbi.ca.crt
      keyFile: /etc/traefik/certs/lull.ashbi.ca.key
    - certFile: /etc/traefik/certs/jwhabits.ashbi.ca.crt
      keyFile: /etc/traefik/certs/jwhabits.ashbi.ca.key
    - certFile: /etc/traefik/certs/simaqadeer.ashbi.ca.crt
      keyFile: /etc/traefik/certs/simaqadeer.ashbi.ca.key
"""


class GuardTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        guard.ROUTERS = os.path.join(self.dir.name, "routers.yml")
        guard.TLS = os.path.join(self.dir.name, "tls.yml")

    def write(self, path, text):
        with open(path, "w") as f:
            f.write(text)

    def read(self, path):
        with open(path) as f:
            return f.read()

    def block(self, text, name):
        lines = text.splitlines()
        start = lines.index(f"    {name}:")
        end = start + 1
        while end < len(lines) and lines[end].startswith("      "):
            end += 1
        return "\n".join(lines[start:end])

    def test_attaches_hsts_to_every_router_for_the_host(self):
        self.write(guard.ROUTERS, LIVE)
        self.assertTrue(guard.append_routers())
        out = self.read(guard.ROUTERS)
        routers = out.split("  services:")[0]
        self.assertIn("middlewares: [jwhabits-hsts]", self.block(routers, "jwhabits"))
        self.assertIn("middlewares: [jwhabits-hsts]", self.block(routers, "jw-habits"))
        self.assertNotIn("jwhabits-hsts", self.block(routers, "lookalike"))
        self.assertNotIn("jwhabits-hsts", self.block(routers, "lull-relay"))
        # Only the two inserted lines differ.
        self.assertEqual(len(out.splitlines()), len(LIVE.splitlines()) + 2)
        self.assertEqual(out.count("jwhabits-hsts:"), 1)

    def test_second_run_is_a_no_op(self):
        self.write(guard.ROUTERS, LIVE)
        guard.append_routers()
        before = self.read(guard.ROUTERS)
        self.assertFalse(guard.append_routers())
        self.assertEqual(self.read(guard.ROUTERS), before)

    def test_appends_to_a_block_list(self):
        self.write(
            guard.ROUTERS,
            LIVE.replace(
                "      service: jwhabits\n      tls:",
                "      service: jwhabits\n      middlewares:\n      - other-sec\n      tls:",
            ),
        )
        guard.append_routers()
        self.assertIn(
            "      middlewares:\n      - jwhabits-hsts\n      - other-sec\n",
            self.read(guard.ROUTERS),
        )

    def test_appends_to_an_inline_list(self):
        self.write(
            guard.ROUTERS,
            LIVE.replace(
                "      service: jwhabits\n      tls:",
                "      service: jwhabits\n      middlewares: [other-sec]\n      tls:",
            ),
        )
        guard.append_routers()
        self.assertIn("middlewares: [other-sec, jwhabits-hsts]", self.read(guard.ROUTERS))

    def test_quoted_rule_counts_as_our_router(self):
        text = LIVE.replace(
            "      rule: Host(`jwhabits.ashbi.ca`)", '      rule: "Host(`jwhabits.ashbi.ca`)"'
        )
        self.write(guard.ROUTERS, text)
        guard.append_routers()
        out = self.read(guard.ROUTERS)
        self.assertEqual(out.count("Host(`jwhabits.ashbi.ca`)"), 2)  # no third router added
        self.assertEqual(out.count("middlewares: [jwhabits-hsts]"), 2)

    def test_commented_rule_counts_as_our_router(self):
        self.write(
            guard.ROUTERS,
            LIVE.replace(
                "      rule: Host(`jwhabits.ashbi.ca`)",
                "      rule: Host(`jwhabits.ashbi.ca`)  # managed",
            ),
        )
        guard.append_routers()
        out = self.read(guard.ROUTERS)
        self.assertEqual(out.count("    jwhabits:\n"), 2)  # one router, one service
        self.assertEqual(out.count("middlewares: [jwhabits-hsts]"), 2)

    def test_never_duplicates_an_existing_jwhabits_key(self):
        # A router we don't recognise as ours must still block the fallback,
        # or routers.yml ends up with two `jwhabits:` keys.
        self.write(
            guard.ROUTERS,
            LIVE.replace("Host(`jwhabits.ashbi.ca`)", "Host(`jwhabits.ashbi.ca`) || Path(`/x`)"),
        )
        before = self.read(guard.ROUTERS)
        self.assertFalse(guard.append_routers())
        self.assertEqual(self.read(guard.ROUTERS), before)

    @unittest.skipIf(guard.yaml is None, "PyYAML not installed")
    def test_refuses_to_write_duplicate_keys(self):
        self.write(guard.TLS, TLS)
        dup = "http:\n  routers:\n    a:\n      rule: x\n    a:\n      rule: y\n"
        self.assertFalse(guard.write_checked(guard.TLS, dup))
        self.assertEqual(self.read(guard.TLS), TLS)

    def test_adds_router_service_and_middleware_when_missing(self):
        self.write(
            guard.ROUTERS,
            "http:\n  routers:\n    other:\n      rule: Host(`x.ashbi.ca`)\n"
            "      service: other\n  services:\n    other:\n      loadBalancer:\n"
            "        servers:\n        - url: http://127.0.0.1:1\n",
        )
        self.assertTrue(guard.append_routers())
        out = self.read(guard.ROUTERS)
        self.assertIn("  middlewares:\n    jwhabits-hsts:\n", out)
        self.assertEqual(out.count("middlewares: [jwhabits-hsts]"), 1)
        self.assertIn('url: "http://127.0.0.1:18080"', out)
        self.assertFalse(guard.append_routers())

    def test_removes_only_the_jwhabits_cert(self):
        self.write(guard.TLS, TLS)
        self.assertTrue(guard.remove_pinned_cert())
        out = self.read(guard.TLS)
        self.assertNotIn("jwhabits", out)
        self.assertIn("lull.ashbi.ca.key", out)
        self.assertIn("simaqadeer.ashbi.ca.key", out)
        self.assertFalse(guard.remove_pinned_cert())

    def test_write_leaves_no_temp_file_and_keeps_mode(self):
        self.write(guard.TLS, TLS)
        os.chmod(guard.TLS, 0o640)
        guard.remove_pinned_cert()
        self.assertEqual(os.listdir(self.dir.name), ["tls.yml"])
        if os.name == "posix":
            self.assertEqual(os.stat(guard.TLS).st_mode & 0o777, 0o640)

    @unittest.skipIf(guard.yaml is None, "PyYAML not installed")
    def test_refuses_to_write_invalid_yaml(self):
        self.write(guard.TLS, TLS)
        self.assertFalse(guard.write_checked(guard.TLS, "tls: [unclosed\n"))
        self.assertEqual(self.read(guard.TLS), TLS)
        self.assertEqual(os.listdir(self.dir.name), ["tls.yml"])


if __name__ == "__main__":
    unittest.main()
