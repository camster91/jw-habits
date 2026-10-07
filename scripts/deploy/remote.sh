#!/usr/bin/env bash
# Runs on the VPS; registry credential is supplied only on stdin.
set -euo pipefail
: "${PROJECT_DIR:?}" "${PROJECT_NAME:?}" "${PORT:?}" "${IMAGE:?}" "${REVISION:?}" "${PUBLIC_URL:?}" "${GHCR_USER:?}"
[[ "$IMAGE" =~ ^ghcr.io/camster91/jw-habits@sha256:[a-f0-9]{64}$ ]]
[[ "$REVISION" =~ ^[a-f0-9]{40}$ ]]
read -r GHCR_TOKEN
mkdir -p "$PROJECT_DIR/.release"
cd "$PROJECT_DIR"
stage="$PROJECT_NAME-candidate"
previous="$PROJECT_NAME-previous"
cutover=0
had_previous=0
probe() {
  local url="$1" expected="$2" marker
  curl -fsS --max-time 10 "$url/" | grep 'Faithful Days' > /dev/null || return 1
  marker=$(curl -fsS --max-time 10 "$url/release.json?revision=$expected") || return 1
  printf '%s' "$marker" | python3 -c 'import json,sys; assert json.load(sys.stdin)["revision"] == sys.argv[1]' "$expected" || return 1
  curl -fsS --max-time 10 "$url/manifest.webmanifest" | python3 -c 'import json,sys; assert json.load(sys.stdin)["name"] == "Faithful Days"' || return 1
  curl -fsS --max-time 10 "$url/sw.js" | grep 'precache' > /dev/null || return 1
}
cleanup() {
  local rc=$?
  trap - EXIT
  docker rm -f "$stage" >/dev/null 2>&1 || true
  docker logout ghcr.io >/dev/null 2>&1 || true
  if (( rc != 0 && cutover )); then
    echo 'Candidate failed; restoring the retained previous container and compose file.'
    docker rm -f "$PROJECT_NAME" >/dev/null 2>&1 || true
    if (( had_previous )); then
      docker rename "$previous" "$PROJECT_NAME"
      docker start "$PROJECT_NAME"
      cp .release/previous-compose.yml docker-compose.yml
      curl -fsS --retry 5 --retry-delay 2 --retry-all-errors --max-time 10 "$PUBLIC_URL/" >/dev/null || echo '::error::Rollback public probe failed; operator intervention required'
    else
      echo '::error::First deployment failed; no previous container was available'
    fi
    printf 'rollback %s\n' "$IMAGE" >> .release/history.log
  fi
  exit "$rc"
}
trap cleanup EXIT
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
unset GHCR_TOKEN
docker pull "$IMAGE"
docker logout ghcr.io >/dev/null 2>&1 || true
# Never attach the staged container to production traffic.
docker rm -f "$stage" >/dev/null 2>&1 || true
docker run -d --name "$stage" -p '127.0.0.1::80' "$IMAGE"
stage_port=$(docker port "$stage" 80/tcp | sed 's/.*://')
ready=0
for attempt in $(seq 1 20); do
  if probe "http://127.0.0.1:$stage_port" "$REVISION"; then ready=1; break; fi
  sleep 2
done
(( ready )) || { echo '::error::Staged revision failed; production was not touched'; exit 1; }
# Preserve the exact old container (including its immutable image/config).
if docker inspect "$PROJECT_NAME" >/dev/null 2>&1; then
  [[ -f docker-compose.yml ]] || { echo '::error::Missing previous compose; refusing cutover'; exit 1; }
  docker rm -f "$previous" >/dev/null 2>&1 || true
  cp docker-compose.yml .release/previous-compose.yml
  docker inspect --format '{{.Image}}' "$PROJECT_NAME" > .release/previous-image-id
  docker inspect --format '{{.Config.Image}}' "$PROJECT_NAME" > .release/previous-image-ref
  docker rename "$PROJECT_NAME" "$previous"
  had_previous=1
  cutover=1
fi
cat > .release/candidate-compose.yml <<YAML
services:
  app:
    image: ${IMAGE}
    container_name: ${PROJECT_NAME}
    restart: unless-stopped
    ports:
      - "127.0.0.1:${PORT}:80"
    networks:
      - ${PROJECT_NAME}-net
networks:
  ${PROJECT_NAME}-net:
    name: ${PROJECT_NAME}-net
YAML
# The single-host port transfer has a brief interruption; old state stays recoverable.
cutover=1
if (( had_previous )); then docker stop "$previous"; fi
cp .release/candidate-compose.yml docker-compose.yml
# Use an explicit new container: Compose labels on the retained container must
# never let `compose up` adopt/recreate the only rollback copy.
docker network inspect "$PROJECT_NAME-net" >/dev/null 2>&1 || docker network create "$PROJECT_NAME-net"
docker run -d --name "$PROJECT_NAME" --restart unless-stopped \
  --network "$PROJECT_NAME-net" -p "127.0.0.1:$PORT:80" "$IMAGE"
ready=0
for attempt in $(seq 1 20); do
  if probe "http://127.0.0.1:$PORT" "$REVISION" && probe "$PUBLIC_URL" "$REVISION"; then ready=1; break; fi
  sleep 2
done
(( ready )) || { echo '::error::Local/public revision or TLS check failed'; exit 1; }
printf '%s\n' "$IMAGE" > .release/current-image
printf '%s\n' "$REVISION" > .release/current-revision
printf 'deployed %s %s\n' "$REVISION" "$IMAGE" >> .release/history.log
cutover=0
echo "Verified production revision $REVISION at $IMAGE"
