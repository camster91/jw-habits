#!/usr/bin/env bash
# CI runner only. Never runs against the VPS or public production edge.
set -euo pipefail
[[ "$PROJECT_DIR" == /tmp/faithful-days-recovery ]]
[[ "$PUBLIC_URL" == http://127.0.0.1:18080 ]]
mkdir -p "$PROJECT_DIR"
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
docker pull "$IMAGE"
docker logout ghcr.io >/dev/null 2>&1 || true
docker run -d --name "$PROJECT_NAME" --restart unless-stopped -p "127.0.0.1:$PORT:80" "$IMAGE"
printf 'services:\n  app:\n    image: %s\n' "$IMAGE" > "$PROJECT_DIR/docker-compose.yml"
for attempt in $(seq 1 20); do
  if curl -fsS "$PUBLIC_URL/release.json" >/dev/null; then break; fi
  sleep 1
done
original=$(docker inspect --format '{{.Id}}' "$PROJECT_NAME")
assert_restored() {
  [[ "$(docker inspect --format '{{.Id}}' "$PROJECT_NAME")" == "$original" ]]
  [[ "$(docker inspect --format '{{.State.Running}}' "$PROJECT_NAME")" == true ]]
  curl -fsS "$PUBLIC_URL/release.json" | python3 -c 'import json,sys; assert json.load(sys.stdin)["revision"] == sys.argv[1]' "$REVISION"
}
# A mismatched staged revision must be rejected before stopping the old container.
if printf '%s\n' "$GHCR_TOKEN" | REVISION=0000000000000000000000000000000000000000 bash scripts/deploy/remote.sh; then
  echo '::error::Bad staged revision was accepted'; exit 1
fi
assert_restored
# A trusted-HTTPS/public failure after cutover must restore the actual old ID.
if printf '%s\n' "$GHCR_TOKEN" | PUBLIC_URL=https://127.0.0.1:18080 bash scripts/deploy/remote.sh; then
  echo '::error::Invalid public HTTPS endpoint was accepted'; exit 1
fi
assert_restored
# A good release must retain the prior container; manual rollback restores it.
printf '%s\n' "$GHCR_TOKEN" | bash scripts/deploy/remote.sh
[[ "$(docker inspect --format '{{.Id}}' "$PROJECT_NAME")" != "$original" ]]
bash scripts/deploy/rollback.sh "$PROJECT_DIR"
assert_restored
printf 'Exact digest staging, failed public validation and manual rollback passed on isolated Docker host.\n' >> "$GITHUB_STEP_SUMMARY"
