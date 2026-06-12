#!/usr/bin/env bash
# Deploy jw-habits to the Ashbi fleet VPS.
# Two sources for the image, in priority order:
#   1. Pull camster91/jw-habits:build-latest from Docker Hub (CI push, fast)
#   2. Build from /root/jw-habits source tree using the repo's Dockerfile
#      (used when Docker Hub push hasn't happened yet, or fails)
# The CONTAINER_PORT must match the port nginx listens on INSIDE the
# image. The repo Dockerfile bakes nginx:alpine with `EXPOSE 80` and the
# embedded config listens on 80, so HOST_PORT maps to container 80 — not
# 3000 as the project's standalone nginx.conf (which the runtime image
# doesn't actually use) would suggest.
#
# Source for source tree: tarball at /root/jw-habits.tgz (mtime) or git pull
# from the configured branch (set DEPLOY_BRANCH, default main).
#
# Required on the host (created by an earlier setup step):
#   /opt/caddy/Caddyfile  - Caddy route for jwhabits.ashbi.ca → 127.0.0.1:18080
#   (no env file, no postgres, no bind-mounted volume)
#
# What this script does, in order:
#   1. Detect source: tarball at /root/jw-habits.tgz (mtime) or git pull
#   2. Try to pull the image from Docker Hub; if that fails, build locally
#   3. Recreate the jw-habits container
#   4. Verify health on 127.0.0.1:18080

set -euo pipefail

# --- Config ---
APP_DIR="/root/jw-habits"
APP_NAME="jw-habits"
APP_CONTAINER="jw-habits"
HOST_PORT="18080"
# The Dockerfile bakes nginx on port 80 (not 3000). Keep these in sync
# if you swap the Dockerfile.
CONTAINER_PORT="80"
IMAGE="camster91/jw-habits:build-latest"
LOG="/var/log/jw-habits-deploy.log"
TARBALL="/root/jw-habits.tgz"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

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
  log "Source: git pull (branch: $DEPLOY_BRANCH, optional, will continue with current tree on failure)"
  if ! git pull --ff-only origin "$DEPLOY_BRANCH" 2>&1 | tee -a "$LOG"; then
    log "WARN: git pull failed (likely no creds). Continuing with current tree at $(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
  fi
else
  fail "No source: $TARBALL missing and $APP_DIR is not a git repo"
fi

# --- 2. Acquire the image (pull OR build) ---
log "Trying to pull $IMAGE from Docker Hub..."
if docker pull "$IMAGE" 2>&1 | tee -a "$LOG"; then
  log "Pulled $IMAGE"
else
  log "WARN: docker pull failed (image not on Hub yet, or no creds). Falling back to local build."
  log "Building from $APP_DIR/Dockerfile"
  ( cd "$APP_DIR" && docker build -t "$IMAGE" . ) 2>&1 | tee -a "$LOG" || fail "local docker build failed"
fi

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