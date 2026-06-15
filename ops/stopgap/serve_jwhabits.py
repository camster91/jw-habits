#!/usr/bin/env python3
"""Minimal SPA-aware static file server for jw-habits.
Serves /var/www/jwhabits-dist on port 18080 with the standard
SPA fallback (unknown routes → /index.html). Replaces the
docker/nginx setup that is currently broken on the VPS.

This is a stopgap. The caddy-guard cron + the docker build
should be fixed properly. The Python server has zero deps
beyond the standard library.
"""
import http.server
import os
import socketserver
import sys
from pathlib import Path

ROOT = Path("/var/www/jwhabits-dist")
PORT = 18080
SPA_FALLBACK_PATHS = ("/", "/routine", "/habits", "/settings", "/ideas", "/about", "/share")


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_error(self, code, message=None, explain=None):
        # 404 → SPA fallback for known SPA routes; otherwise normal 404
        if code == 404:
            path = self.path.split("?")[0].rstrip("/")
            if path in SPA_FALLBACK_PATHS or path.startswith(("/assets/", "/data/", "/icons/", "/screenshots/")):
                # Static asset — actual 404
                super().send_error(code, message, explain)
                return
            # SPA route — serve index.html with 200
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            with open(ROOT / "index.html", "rb") as f:
                self.wfile.write(f.read())
            return
        super().send_error(code, message, explain)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", PORT), SPAHandler) as httpd:
        print(f"jw-habits SPA server on :{PORT} (root={ROOT})", flush=True)
        httpd.serve_forever()
