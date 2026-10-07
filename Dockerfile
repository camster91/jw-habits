# Multi-stage build for Habit Tracker
# Stage 1: Build the React SPA
# Pin by digest to avoid silent alpine drift. Update with:
#   curl -sI -H "Authorization: Bearer $(curl -s 'https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/REPO:pull' | python3 -c 'import json,sys; print(json.load(sys.stdin)[\"token\"])')" -H "Accept: application/vnd.docker.distribution.manifest.list.v2+json" "https://registry-1.docker.io/v2/library/REPO/manifests/TAG" | grep -i docker-content-digest
# Digests pinned 2026-07-23.
# --platform=$BUILDPLATFORM: dist/ is static files, identical for every
# architecture, so build it once on the runner's native platform. Running
# `npm ci` for arm64 under QEMU crashed with "Illegal instruction" and hung
# the multi-arch build until timeout. Only the nginx stage is per-arch.
FROM --platform=$BUILDPLATFORM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS builder
WORKDIR /app
COPY package*.json .npmrc ./
COPY scripts/verify/runtime.cjs scripts/verify/runtime.cjs
RUN npm ci
COPY . .
ARG APP_REVISION=local
RUN APP_REVISION="$APP_REVISION" npm run build

# Stage 2: Serve with nginx
# Digest pinned 2026-07-23 (see update command above).
FROM nginx:1.27-alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10
# Use the canonical nginx.conf from the repo (not an inline echo).
# The standalone config has gzip, security headers, PWA SW no-cache,
# and the manifest MIME type — all missing from the previous inline version.
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Run as the non-root `nginx` user (UID 101 in the alpine image).
# The default nginx master runs as root in nginx:alpine — switch to nginx user.
# Files in /usr/share/nginx/html must remain readable; the COPY above
# preserves root ownership which is fine since we run as nginx:nginx.
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

# Liveness check — server is healthy if /index.html returns 200.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
