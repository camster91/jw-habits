# Multi-stage build for JW Habits
# Stage 1: Build the React SPA
# Pin by digest to avoid silent alpine drift. Update with `docker pull --quiet`.
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:1.27-alpine
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
