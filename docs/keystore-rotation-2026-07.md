# Android Keystore Rotation — Runbook (2026-07-22)

> **STATUS (2026-07-24 production audit): STILL OPEN — CRITICAL.**  
> Current tree is redacted (passwords via env; absolute username path removed).  
> **History still contains recoverable credentials** (`jwnews2024secure`, `JWHabits2026!`).  
> Until Play Console upload-key reset + history purge complete, treat the Play signing key as compromised.

**Why this exists:** The production Android keystore credentials for `com.ashbi.jwnews` were committed to git history on 2026-03-02 in commit `cb976d5` and partially redacted on 2026-06-30 in `3dbb112`. Anyone with read access to the repo (current or future mirror/backup) can extract these credentials and sign malicious updates that Google Play will accept as legitimate.

**This is an external coordination task** — it requires Cam to action items in Google Play Console and (optionally) GitHub. Items that can be done from a terminal are done by automation; the rest are checklist items for Cam.

## Credentials that were exposed

The following values were leaked and are still recoverable via `git log -p --all -S 'jwnews2024secure'` / `-S 'JWHabits2026!'`. Full values are in 1Password under `JW Habits / Android Signing (2026 rotation)` — never in source.

| Variable | Was at | Currently in HEAD? |
|---|---|---|
| `KEYSTORE_PASSWORD` | `scripts/generate-android-keystore.sh:11` | No (redacted / env-prompt) |
| `KEY_PASSWORD` | `scripts/generate-android-keystore.sh:12` | No (redacted / env-prompt) |
| `storePassword` (gradle) | `android/app/build.gradle` (historical) | No — `System.getenv('KEYSTORE_PASSWORD')` |
| `keyPassword` (gradle) | `android/app/build.gradle` (historical) | No — `System.getenv('KEY_PASSWORD')` |

The values are still recoverable from git history — that's why this remains a P0.

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

Once Google has the new upload key enrolled, update `android/app/build.gradle`:

```groovy
// OLD (rotated out, do NOT use)
storePassword 'REDACTED'
keyPassword 'REDACTED'

// NEW — read from environment, never commit
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('keystore.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

signingConfigs {
    release {
        storeFile file(keystoreProperties['storeFile'] ?: System.getenv('KEYSTORE_FILE'))
        storePassword keystoreProperties['storePassword'] ?: System.getenv('KEYSTORE_PASSWORD')
        keyAlias keystoreProperties['keyAlias'] ?: System.getenv('KEY_ALIAS')
        keyPassword keystoreProperties['keyPassword'] ?: System.getenv('KEY_PASSWORD')
    }
}
```

And `android/keystore.properties` (gitignored, see `.gitignore` additions):

```properties
storeFile=/absolute/path/to/jwnews-release-2026.keystore
storePassword=...
keyAlias=jwnews-2026
keyPassword=...
```

### Step 4 — Purge old credentials from git history (10 min)

**Only do this AFTER Step 2 (Google has the new key)** — once rotated, the leaked credentials are inert.

```bash
# From a fresh clone
cd ~/Code/jw-habits
git filter-repo --invert-paths \
  --path-glob 'scripts/generate-android-keystore.sh' \
  --path-glob 'android/app/build.gradle' \
  --blob-callback 'cb: if b.decode(errors="ignore").find(b"jwnews-2024-prefix") != -1: skip()'

# Force-push (this is destructive — coordinate with team first)
git remote add origin https://github.com/camster91/jw-habits.git
git push origin --force --all
git push origin --force --tags

# Have all team members re-clone.
```

**Alternative:** Use `bfg` (BFG Repo-Cleaner):

```bash
bfg --replace-text passwords.txt  # file with one password per line
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

### Step 5 — Add ongoing protection (already done by automation in this PR)

- [x] `.gitignore` hardened: `*.keystore`, `*.jks`, `keystore.properties`, `android/keystore.properties`, `android/app/keystore.properties` explicitly added (they were already partly present)
- [x] `ci.yml` runs `gitleaks/gitleaks-action@v2` on every push + PR — fails the build if any new secret is committed
- [x] `scripts/generate-android-keystore.sh` rewrites with hardcoded `***` placeholders + a comment telling the user to use env vars
- [x] Pre-commit hook recommended below

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
- [x] `scripts/generate-android-keystore.sh` redacted with `***` + warning comment
- [ ] **Step 1 (new keystore) — Cam**
- [ ] **Step 2 (Google Play coordination) — Cam**
- [ ] **Step 3 (gradle config update) — pending Step 1**
- [ ] **Step 4 (history purge) — pending Step 2**

Until Step 1–2 are done, the credentials remain hot. Do not delay.
