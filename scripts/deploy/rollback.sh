#!/usr/bin/env bash
# Run on the VPS: sudo bash scripts/deploy/rollback.sh /opt/projects/jw-habits
set -euo pipefail
cd "${1:-/opt/projects/jw-habits}"
name=jw-habits
[[ -f .release/previous-compose.yml ]]
docker inspect "$name-previous" >/dev/null
# Keep the failed/newer container available for inspection.
docker rm -f "$name-rejected" >/dev/null 2>&1 || true
docker stop "$name"
docker rename "$name" "$name-rejected"
docker rename "$name-previous" "$name"
docker start "$name"
cp .release/previous-compose.yml docker-compose.yml
curl -fsS --retry 5 --retry-delay 2 --retry-all-errors --max-time 10 https://jwhabits.ashbi.ca/ >/dev/null
cp .release/previous-image-ref .release/current-image
if revision=$(curl -fsS --max-time 10 https://jwhabits.ashbi.ca/release.json | python3 -c 'import json,sys; print(json.load(sys.stdin)["revision"])'); then
  printf '%s\n' "$revision" > .release/current-revision
else
  printf 'unknown\n' > .release/current-revision
fi
printf 'manual rollback %s\n' "$(cat .release/previous-image-ref)" >> .release/history.log
echo 'Previous container restored; inspect release.json and history.log.'
