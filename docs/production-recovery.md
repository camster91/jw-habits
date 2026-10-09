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
retention. These prove script sequencing. The image workflow additionally runs the
published digest on an isolated Docker runner: mismatched staged revision,
invalid public HTTPS, successful deployment and manual rollback must preserve
or restore the original container ID. This is a real Docker drill, not a VPS
or edge-controlled zero-downtime exercise.
GitHub compile checks and a live successful digest/revision deploy provide
additional evidence. The runner drill must pass before the image workflow succeeds and triggers
production. Clean-host/VPS-edge restore policy remains in #179.

Signing-key replacement/escrow (#132/#133), administrator-required branch
rules (#175), physical-device QA and store-account submission are separate
gates. No device data or activity content is collected by these checks.

## Read-only routing diagnosis

`scripts/deploy/diagnose-routing.py` inspects the known `coolify-proxy` and
`traefik` runtimes, their network mode and mounted file-provider configuration,
and the named current/previous app containers. It reads app-specific routes
from the provider directory resolved through the `/traefik` mount, separately
from the legacy `/opt/traefik/dynamic/routers.yml`. Credentials, environment
values, raw labels and unrelated routes are omitted. These configured routes
do not establish runtime acceptance; compare with the live proxy's local API
and loopback/public probes before proposing a repair. Missing inspection
results alone cannot distinguish absence from Docker permission failures.

The October 9 read-only inspection found no named app container or loopback
listener and no active app router. The running host-network `coolify-proxy`
loads `/data/coolify/proxy/dynamic`; the two legacy app routes are outside that
provider. Its low-priority catch-all serves the public 503. A retained image
and saved deployment records exist, but recovery still requires an approved
exact image, isolated readiness checks, app-specific routing, preserved
configuration and trusted public validation. The removal's actor is unknown.
