# #239: slashless privacy/support redirects

Prepared 18 October 2026. No deployment has been made from this note.

## Live evidence (18 October 2026, unauthenticated HTTPS)

| Request | Result |
|---|---|
| `https://jwhabits.ashbi.ca/` | 200; `/release.json` reports 5.3.0, revision `95703b7ecb2b26dd84e83a06cb39ec73b9ee407c` |
| `/privacy`, `/support` | 301 to `http://jwhabits.ashbi.ca:8080/privacy/` and `…/support/` |
| `/privacy/`, `/support/` | 200 |
| `Server` header | `nginx/1.31.6` |

## Cause

nginx answers a request for a directory without a trailing slash with an
automatic 301. By default it builds an absolute URL from the scheme it
received and its own listen port. TLS ends at the Traefik edge, so the
backend sees `http` and puts its port in the URL. `ops/test_nginx_redirects.sh`
reproduces the same shape with the repository's `nginx.conf`
(`http://jwhabits.ashbi.ca:<listen port>/privacy/`).

## Fix in this repository

`nginx.conf` sets `absolute_redirect off;`, so the `Location` header is
`/privacy/` and the browser stays on the public HTTPS host. Nothing else
changes: SPA routes, headers, caching, TLS and app data are unaffected.
CI runs `ops/test_nginx_redirects.sh dist` after every build.

## Open question for the server owner: which backend serves production?

The live response does not match this repository's deployment pipeline:

- The image pins `nginx:1.27-alpine` and listens on `:80`. The live server
  reports nginx 1.31.6 and redirects with port 8080.
- Revision `95703b7` is the head of a pull-request branch. `deploy-ashbi.yml`
  only deploys `main`.
- Every `deploy-ashbi.yml` run since 8 October has failed. The 9 October
  run reported "First deployment failed; no previous container was
  available".
- That run's routing diagnosis showed Traefik routers `jwhabits` and
  `jw-habits` both pointing to `127.0.0.1:18080`.
- `production-monitor.yml` fails every run with `Unexpected public revision:
  95703b7… (expected 59a702c…)`.

So production was changed outside the pipeline, by a manual container or
another service on port 8080. Deploying the fixed image to `127.0.0.1:18080`
only fixes the public site if Traefik actually routes the host there.

## Deployment steps (each needs explicit approval)

1. **On the server, read only:**
   - Identify the process or container answering the public host
     (`docker ps`, Traefik dynamic config, and what listens on 8080 and 18080).
   - Record its image digest and config.
   - Back up the current Traefik dynamic files and that container's config.
2. **Choose one bounded change:**
   - **(a, preferred)** Deploy the reviewed image from this pipeline, after
     merging to `main` and passing exact-head checks. `deploy-ashbi.yml`
     stages it on 18080, verifies the served revision and keeps the previous
     container.
   - **(b, interim)** Add `absolute_redirect off;` to the server block of the
     nginx that answers today, run `nginx -t`, then reload. No content or
     data changes.
3. **Verify:**
   - `/privacy` and `/support` return 301 with `Location: /privacy/` and
     `/support/`. Following them ends at HTTPS 200 on the same host, with
     normal certificate checks and no `:8080`.
   - `/`, `/privacy/`, `/support/` and `/release.json` return 200, and the
     revision matches the approved candidate.
   - App journeys still work (`SMOKE_BASE_URL=https://jwhabits.ashbi.ca`).

## Rollback

- **(a):** the deploy workflow restores the retained previous container on
  a failed check. Afterwards, redeploy the previous digest from the
  deployment record, or revert the `nginx.conf` commit.
- **(b):** restore the backed-up config file, run `nginx -t`, then reload.

The change only affects how redirect headers are written, so rolling back
restores the earlier (insecure) redirects and nothing else.
