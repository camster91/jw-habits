# Production artifact and recovery contract

Faithful Days is a static app at https://jwhabits.ashbi.ca, served by nginx on
container port 80 through the existing VPS edge. Device-local routines, notes
and backups are not on this server. Server recovery cannot restore them.

## Publication and deployment

`Build and Push Image` verifies install, audit, lint, tests, formatting, build,
Playwright smoke and deployment failure-path checks before publishing. It also
waits for the independent CI/security, browser and both native compile checks
for that exact commit; failed, cancelled, absent or timed-out checks deny publication. Its
`production-image` artifact records the full commit and GHCR digest (90-day
GitHub artifact retention). Deploy reads that successful main-push run's
artifact and refuses floating-tag fallback, missing/expired artifacts, stale
automatic builds and mismatched records. The VPS pulls by `@sha256:…` using
read-only package access and immediately logs out.

`release.json` exposes only package version and build commit. Readiness checks
validate that commit, app title, PWA manifest and service worker. The staged
container uses an ephemeral loopback port and receives no production traffic.
Only after it passes does the script transfer the production loopback port.
Local and public revision/PWA checks, including trusted HTTPS, must both pass.

The current single-port host has a brief cutover interruption. This is not a
verified zero-downtime deployment; #173 stays open for an edge-controlled
blue/green transition and a real safe-target failure drill.

## Automatic and manual rollback

The prior container is renamed `jw-habits-previous`, stopped, and retained with
its exact image ID/config. It is never recreated with Compose during cutover.
A startup or public validation failure removes the candidate, restores the
prior name/container and saved compose file, and checks the public URL.
The script exits nonzero even after a successful rollback so Actions reports
the failed deployment. `.release/history.log` records deploy/rollback events;
`.release/current-image` and `current-revision` record the last success.

On the VPS, after reviewing the failed release:

```sh
sudo bash /opt/projects/jw-habits/.release/rollback.sh
curl -fsS https://jwhabits.ashbi.ca/release.json
```

The rollback script is installed by each successful deployment. The newest
rejected container is retained for inspection. Do not run image/container
pruning against the current or previous image. Retention of older GHCR
digests, encrypted VPS configuration copies and clean-host restores still
need an operations policy and an actual drill (#179).

## Validation and remaining gates

`python3 scripts/deploy/test_remote.py` exercises isolated simulated failures:
bad staged image, failed production start, failed public probe, and successful
retention. These prove script sequencing; they are not a real Docker/VPS drill.
GitHub compile checks and a live successful digest/revision deploy provide
additional evidence. Manual rollback and induced failure on a safe Docker
host remain open until actually exercised.

Signing-key replacement/escrow (#132/#133), administrator-required branch
rules (#175), physical-device QA and store-account submission are separate
gates. No device data or activity content is collected by these checks.
