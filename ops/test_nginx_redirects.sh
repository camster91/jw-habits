#!/usr/bin/env bash
# Serves dist/ with the repo's nginx.conf on a local port and checks that
# directory redirects (/privacy -> /privacy/) never name a scheme, host or
# internal port (#239). TLS ends at the edge, so an absolute redirect built
# by this container would downgrade to http:// and leak its listen port.
# Usage: ops/test_nginx_redirects.sh [dist-dir]   (needs nginx and curl)
set -euo pipefail
dist=$(cd "${1:-dist}" && pwd)
conf=$(cd "$(dirname "$0")/.." && pwd)/nginx.conf
work=$(mktemp -d)
port=18089
trap 'nginx -p "$work" -c "$work/nginx.conf" -s stop 2>/dev/null || true; rm -rf "$work"' EXIT
mkdir -p "$work/logs"
sed -e "s#listen 80;#listen 127.0.0.1:$port;#" -e "s#root /usr/share/nginx/html;#root $dist;#" "$conf" > "$work/site.conf"
grep -q "listen 127.0.0.1:$port;" "$work/site.conf" || { echo "listen directive not found"; exit 1; }
cat > "$work/nginx.conf" <<CONF
pid $work/nginx.pid;
error_log $work/logs/error.log;
events {}
http {
  include /etc/nginx/mime.types;
  access_log off;
  client_body_temp_path $work/body; proxy_temp_path $work/proxy;
  fastcgi_temp_path $work/fcgi; uwsgi_temp_path $work/uwsgi; scgi_temp_path $work/scgi;
  include $work/site.conf;
}
CONF
nginx -p "$work" -c "$work/nginx.conf"
fail=0
for path in /privacy /support; do
  location=$(curl -sS -o /dev/null -w '%{redirect_url}' -H 'Host: jwhabits.ashbi.ca' -H 'X-Forwarded-Proto: https' "http://127.0.0.1:$port$path")
  header=$(curl -sS -D - -o /dev/null -H 'Host: jwhabits.ashbi.ca' "http://127.0.0.1:$port$path" | tr -d '\r' | sed -n 's/^[Ll]ocation: //p')
  if [ "$header" = "$path/" ]; then echo "PASS $path -> $header"; else echo "FAIL $path -> ${header:-none} (resolved $location)"; fail=1; fi
  status=$(curl -sS -o /dev/null -w '%{http_code}' -H 'Host: jwhabits.ashbi.ca' "http://127.0.0.1:$port$path/")
  if [ "$status" = 200 ]; then echo "PASS $path/ -> 200"; else echo "FAIL $path/ -> $status"; fail=1; fi
done
for path in / /notes /plans/preparation; do
  status=$(curl -sS -o /dev/null -w '%{http_code}' -H 'Host: jwhabits.ashbi.ca' "http://127.0.0.1:$port$path")
  if [ "$status" = 200 ]; then echo "PASS $path -> 200 (app shell)"; else echo "FAIL $path -> $status"; fail=1; fi
done
exit $fail
