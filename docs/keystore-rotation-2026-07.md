# Android Keystore Rotation — Runbook (2026-07-22)

**Why this exists:** The production Android keystore credentials for `com.ashbi.jwnews` were committed to git history on 2026-03-02 in commit `cb976d5` and partially redacted on 2026-06-30 in `3dbb112`. Anyone with read access to the repo (current or future mirror/backup) can extract these credentials and sign malicious updates that Google Play will accept as legitimate.

**This is an external coordination task** — it requires Cam to action items in Google Play Console and (optionally) GitHub. Items that can be done from a terminal are done by automation; the rest are checklist items for Cam.

## Credentials that were exposed

The following values were leaked and are still recoverable via `git log -p --all | grep -E "jwnews-2024-prefix"` (substitute the actual leaked prefix). Full values are in 1Password under `JW Habits / Android Signing (2026 rotation)` — never in source.

| Variable | Was at | Currently in HEAD? |
|---|---|---|
| `KEYSTORE_PASSWORD` | `scripts/generate-android-keystore.sh:11` | No (redacted to `[REDACTED]`) |
| `KEY_PASSWORD` | `scripts/generate-android-keystore.sh:12` | No (redacted to `[REDACTED]`) |
| `storePassword` (gradle) | `android/app/build.gradle` (historical) | Need to verify (likely also redacted) |
| `keyPassword` (gradle) | `android/app/build.gradle` (historical) | Need to verify (likely also redacted) |

The values are still recoverable via `git log -p --all | grep -E "jwnews-2024-prefix"` — that's why this is a P0.

## Action checklist (Cam)

### Step 1 — Generate a fresh keystore (local, 2 min)

```bash
# Generate new keystore with NEW credentials. Use 1Password or a hardware key.
keytool -genkeypair \
  -alias jwnews-2026 \
  -keyalg RSA -keysize 4096 -validity 25000 \
  -keystore ~/secure/jwnews-release-2026.keystore \
  -storepass "$NEW_KEYSTORE_PASSWORD" \
  -keypass "$NEW_KEY_PASSWORD" \
  -dname "CN=JW Habits, OU=Ashbi, O=Ashbi, L=Toronto, ST=ON, C=CA"

# Verify it's good
keytool -list -v -keystore ~/secure/jwnews-release-2026.keystore
```

Save the keystore file + both passwords in 1Password under `JW Habits / Android Signing (2026 rotation)`. **Do not commit any of these.**

### Step 2 — Coordinate with Google Play (15–30 min, support contact)

1. Open **Google Play Console → JW Habits → Setup → App signing**
2. Click **"Request upload key reset"** (under App signing key → Upload key)
3. Choose **"I have a new key I want to use"** → upload the new `.keystore` file's public certificate (`.pem` or `.cer` exported from the new keystore)
4. Google will give you a 7-day window where they accept both the old and new upload key for builds
5. **Within those 7 days:** ship at least one new build signed with the NEW keystore to TestFlight-equivalent (internal testing track is enough)

### Step 3 — Update Gradle to use the new keystore

**Done in-repo (2026-07-24):** `android/app/build.gradle` now reads
`android/keystore.properties` (gitignored) or `KEYSTORE_*` /
`KEY_ALIAS` / `KEYSTORE_FILE` env vars. The hardcoded
`/Users/biancabienaime/keys/...` path is gone.

After you generate the new keystore (Step 1), copy the example and fill in:

```bash
cp android/keystore.properties.example android/keystore.properties
# edit storeFile / passwords / keyAlias — never commit this file
```

Example contents:

```properties
storeFile=/absolute/path/to/jwnews-release-2026.keystore
storePassword=...
keyAlias=jwnews-2026
keyPassword=...
```

### Step 4 — Purge old credentials from git history (10 min)

**Only do this AFTER Step 2 (Google has the new key)** — once rotated, the leaked credentials are inert.

Preferred: **BFG Repo-Cleaner** with a replacements file (do **not** commit
`passwords.txt` — keep it outside the repo):

```bash
# passwords.txt is sensitive material and must stay outside the repository.
# Put recovered values in the local file only; never paste them into docs, commands, prompts, or logs.

cd /tmp
git clone --mirror https://github.com/camster91/jw-habits.git
cd jw-habits.git
bfg --replace-text ~/secure/jw-habits-passwords.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

Alternative with `git filter-repo` (rewrites all history; all clones must re-clone):

```bash
git filter-repo --replace-text ~/secure/jw-habits-passwords.txt
git remote add origin https://github.com/camster91/jw-habits.git
git push origin --force --all
git push origin --force --tags
```

### Step 5 — Add ongoing protection (already done)

- [x] `.gitignore` hardened: `*.keystore`, `*.jks`, `keystore.properties`, `android/keystore.properties`, `android/app/keystore.properties`
- [x] `ci.yml` runs `gitleaks/gitleaks-action@v3` on every push + PR
- [x] `scripts/generate-android-keystore.sh` — env/prompt only; **never echoes passwords**
- [x] `android/app/build.gradle` — `keystore.properties` / env only (no machine path)
- [x] `android/keystore.properties.example` committed as a template

### Step 6 (recommended) — Pre-commit hook for local devs

Add to `.git/hooks/pre-commit` (Cam's local machine):

```bash
#!/bin/sh
# Block commits that contain anything resembling a credential
# Substitute YOUR_LEAKED_PREFIX for the actual leaked prefix string.
if git diff --cached | grep -iE "(YOUR_LEAKED_PREFIX|KEYSTORE_PASSWORD\s*=\s*['\"][^'\"*])"; then
  echo "ERROR: credential-looking string detected in diff"
  echo "If this is intentional, override with: git commit --no-verify"
  exit 1
fi
```

Make it executable: `chmod +x .git/hooks/pre-commit`.

## Status

- [x] Runbook written
- [x] `gitleaks` added to CI
- [x] `.gitignore` hardened
- [x] Keystore generator never prints passwords
- [x] Gradle reads `keystore.properties` / env (Step 3 in-repo)
- [ ] **Step 1 (new keystore) — Cam** (requires local keytool + 1Password)
- [ ] **Step 2 (Google Play upload-key reset) — Cam** (Play Console only)
- [ ] **Step 4 (history purge) — Cam** (after Step 2; force-push)

Until Step 1–2 are done, historical passwords remain hot. Do not delay.
