#!/usr/bin/env bash
# jw-habits Caddyfile guard.
#
# Re-adds the jwhabits.ashbi.ca Caddy route to /opt/caddy/Caddyfile
# if a fleet-wide edit (e.g. alinenasseh / lull / markup / contractions
# caddy-guard cron jobs) wipes it. Mirrors the
# contraction-tracker/scripts/caddy-guard.sh pattern.
#
# Cron entry (one row, /etc/cron.d/jwhabits-caddy-guard):
#   * * * * * /root/jw-habits/ops/caddy-guard.sh >> /var/log/jwhabits-caddy-guard.log 2>&1
#
# Why every minute: matches the sibling-guard cadence. Worst-case
# missing-route window is 60 seconds. The caddy reload is only
# triggered if the file changed, so the steady-state cost is one
# grep per minute.
#
# Env vars (override before cron, defaults match production):
#   JW_HABITS_HOSTNAME  default jwhabits.ashbi.ca
#   JW_HABITS_PORT      default 18080
#   JW_HABITS_NAME      default jw-habits
#   LIVE_CADDYFILE      default /opt/caddy/Caddyfile

set -euo pipefail

JW_HABITS_HOSTNAME="${JW_HABITS_HOSTNAME:-jwhabits.ashbi.ca}"
JW_HABITS_PORT="${JW_HABITS_PORT:-18080}"
JW_HABITS_NAME="${JW_HABITS_NAME:-jw-habits}"
LIVE_CADDYFILE="${LIVE_CADDYFILE:-/opt/caddy/Caddyfile}"
LOG_PREFIX="[$(date -u +%Y-%m-%dT%H:%M:%SZ)]"

# Escape dots for the regex match
HOSTNAME_RE="${JW_HABITS_HOSTNAME//./\\.}"

changed=0
[ -f "$LIVE_CADDYFILE" ] || { echo "$LOG_PREFIX $LIVE_CADDYFILE not found, nothing to do"; exit 0; }

if ! grep -qE "^${HOSTNAME_RE}\\s*\\{" "$LIVE_CADDYFILE"; then
  echo "$LOG_PREFIX missing ${JW_HABITS_HOSTNAME} route in $LIVE_CADDYFILE, re-adding"
  cat >> "$LIVE_CADDYFILE" <<ROUTE_EOF

# ${JW_HABITS_NAME} (auto-added by caddy-guard.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ))
${JW_HABITS_HOSTNAME} {
    reverse_proxy 127.0.0.1:${JW_HABITS_PORT}
    header Strict-Transport-Security "max-age=63072000; includeSubDomains"
    header X-Frame-Options "SAMEORIGIN"
    header X-Content-Type-Options "nosniff"
    header Referrer-Policy "strict-origin-when-cross-origin"
    header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=()"
    @sw path /sw.js
    header @sw Cache-Control "no-cache, no-store, must-revalidate"
    @manifest path /manifest.webmanifest
    header @manifest Content-Type "application/manifest+json"
}
ROUTE_EOF
  changed=1
fi

[ "$changed" -eq 0 ] && exit 0

# File changed. Reload caddy softly via the admin API if available,
# else via systemctl restart.
if curl -sf --max-time 1 http://127.0.0.1:2019/config/ >/dev/null 2>&1; then
  caddy adapt --config "$LIVE_CADDYFILE" --pretty 2>/dev/null > /tmp/jwhabits-caddy-guard.json || {
    echo "$LOG_PREFIX caddy adapt failed; falling back to systemctl restart caddy"
    systemctl restart caddy >/dev/null 2>&1 || true
    exit 0
  }
  curl -sf -X POST -H "Content-Type: application/json" --data @/tmp/jwhabits-caddy-guard.json http://127.0.0.1:2019/load >/dev/null 2>&1 && \
    echo "$LOG_PREFIX caddy reloaded via admin API" || \
    echo "$LOG_PREFIX admin API POST failed; falling back to systemctl restart"
else
  systemctl restart caddy >/dev/null 2>&1 && \
    echo "$LOG_PREFIX caddy restarted" || \
    echo "$LOG_PREFIX caddy restart failed"
fi
