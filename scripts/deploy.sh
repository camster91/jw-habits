#!/usr/bin/env bash
# Deploy jw-habits to the Ashbi fleet VPS.
# Image is built externally and pulled from Docker Hub (camster91/jw-habits:build-latest).
# Source: local tarball pushed from the dev machine (or git pull if available).
# Idempotent: safe to re-run.
#
# Usage:
#   # From the dev machine: push the tarball, then run on the host
#   tar --exclude='node_modules' --exclude='.git/objects/pack' -czf /tmp/jw-habits.tgz -C /Users/biancabienaime/projects/jw-habits .
#   scp /tmp/jw-habits.tgz coolify:/root/jw-habits.tgz
#   ssh coolify "bash /root/jw-habits/scripts/deploy.sh"
#
# Required on the host (created by an earlier setup step):
#   /opt/caddy/Caddyfile  - Caddy route for jwhabits.ashbi.ca
#   (no env file, no postgres, no bind-mounted volume)
#
# What this script does, in order:
#   1. Detect source: tarball at /root/jw-habits.tgz (mtime) or git pull
#   2. Pull the latest externally-built image from Docker Hub
#   3. Recreate the jw-habits container (no env file, no volumes)
#   4. Verify health on 127.0.0.1:18080

set -euo pipefail

# --- Config ---
APP_DIR="/root/jw-habits"
APP_NAME="jw-habits"
APP_CONTAINER="jw-habits"
HOST_PORT="18080"
CONTAINER_PORT="3000"
IMAGE="camster91/jw-habits:build-latest"
LOG="/var/log/jw-habits-deploy.log"
TARBALL="/root/jw-habits.tgz"

mkdir -p "$(dirname "$LOG")"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }
fail() { log "FAIL: $*"; exit 1; }

# --- 1. Detect source and refresh the working tree ---
cd "$APP_DIR"
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

if [ -f "$TARBALL" ] && [ "$TARBALL" -nt "$APP_DIR/.git/HEAD" ]; then
  log "Source: tarball at $TARBALL (newer than git HEAD)"
  # Clear out everything except .git, then untar
  find "$APP_DIR" -mindepth 1 -maxdepth 1 \
    ! -name '.git' ! -name 'node_modules' \
    -exec rm -rf {} +
  tar -xzf "$TARBALL" -C "$APP_DIR"
  # Consume the tarball so the next deploy without a fresh push uses git pull
  rm -f "$TARBALL"
  log "Tarball consumed"
elif [ -d "$APP_DIR/.git" ]; then
  log "Source: git pull (optional, will continue with current tree on failure)"
  if ! git pull --ff-only 2>&1 | tee -a "$LOG"; then
    log "WARN: git pull failed (likely no creds). Continuing with current tree at $(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
  fi
else
  fail "No source: $TARBALL missing and $APP_DIR is not a git repo"
fi

# --- 2. Pull the latest externally-built image ---
log "Pulling latest image: $IMAGE"
docker pull "$IMAGE" 2>&1 | tee -a "$LOG" || fail "docker pull failed for $IMAGE"

# --- 3. Recreate the container ---
log "Recreating container $APP_CONTAINER"
docker rm -f "$APP_CONTAINER" 2>/dev/null || true
docker run -d \
  --name "$APP_CONTAINER" \
  --network bridge \
  --restart unless-stopped \
  -p "127.0.0.1:${HOST_PORT}:${CONTAINER_PORT}" \
  "$IMAGE" 2>&1 | tee -a "$LOG"

# --- 4. Health check ---
log "Waiting for $APP_CONTAINER to be healthy..."
for i in $(seq 1 20); do
  if curl -sf "http://127.0.0.1:${HOST_PORT}/" >/dev/null 2>&1; then
    log "Health check passed after ${i}s"
    log "DEPLOY OK: $IMAGE"
    exit 0
  fi
  sleep 1
done

log "Health check failed after 20s. Last 20 log lines:"
docker logs "$APP_CONTAINER" --tail 20 2>&1 | tee -a "$LOG"
fail "container did not become healthy"