# Security reporting and supported release

Report suspected security issues privately to cameron@ashbi.ca. Include the
release/build, platform, reproduction steps and impact. Avoid sending real
routine histories, notes, backups, signing keys or passwords. Public GitHub
issues are suitable for general defects, not credentials or private payloads.

Security fixes target the current released app/main branch; older releases do
not have a guaranteed support window. Response is best effort; no response-time
or bounty commitment is implied. Store and signed-build verification remain
separate from web release checks.

The historical Android signing incident is tracked by #132 (replacement key)
and #133 (coordinated history cleanup). Do not reuse or disclose historical
credentials, rewrite public history before replacement/coordination, or commit
signing material. Key-manager and Play-account ownership are required gates.

CI checks dependencies, committed secrets, immutable Actions references,
coverage and release artifacts. Source code cannot certify hosting log retention,
key escrow or recovery of device-local user data. See `PRIVACY.md` and
`docs/operations-monitoring.md` for those boundaries.
