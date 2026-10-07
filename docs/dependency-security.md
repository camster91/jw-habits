# Dependency security maintenance

The earlier dependency-alert draft is reconciled with the v5.1 release rather than replacing its newer lockfile. The package overrides retain patched floors for ws, shell-quote, Babel runtime, tar, fast-uri and js-yaml. Vitest and its coverage provider are paired at 5.0.3; clean installation, 803 tests, coverage, lint, formatting and build pass. The current npm audit reports zero vulnerabilities.

CI treats high/critical audit findings as failures. This is a dated verification, not a guarantee against later advisories. Run npm audit on every dependency change. Signing incident #132/#133 remains separate and blocked by Play owner/key rotation and coordinated history cleanup; dependency fixes do not resolve that incident.
