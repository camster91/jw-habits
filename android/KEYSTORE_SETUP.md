# Keystore setup for Android release builds

The release keystore lives **outside the repo** at `~/keys/jw-habits-release.keystore` (absolute path in `app/build.gradle`). The build reads passwords from environment variables, never from the repo.

## First time on a new machine

1. Copy the keystore to `~/keys/jw-habits-release.keystore` from your password manager / secure backup.
2. Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

   ```bash
   export KEYSTORE_PASSWORD='<from password manager>'
   export KEY_PASSWORD='<from password manager>'
   ```

3. Reload: `source ~/.zshrc`

## Build a release AAB

```bash
cd /Users/biancabienaime/repos/jw-daily-habits-tracker
npm run build
cd android
./gradlew bundleRelease
```

The signed AAB lands at `android/app/build/outputs/bundle/release/app-release.aab`. Upload this to Google Play Console.

## Local debug builds

Debug builds use the bundled `android/app/debug.keystore` and don't need the env vars set.

## If you lose the keystore

You can never update the app on the Play Store without it. Back it up in **two** places (1Password + a USB drive in a fireproof safe). If you must re-sign with a new key, the app has to be published as a new package — every existing install is stranded.

## CI builds (future)

When you set up GitHub Actions for release builds, add these as repository secrets:

- `ANDROID_KEYSTORE_FILE` — base64 of the keystore file (`base64 -i ~/keys/jw-habits-release.keystore | pbcopy`)
- `KEYSTORE_PASSWORD`
- `KEY_ALIAS` (literal: `jwhabits`)
- `KEY_PASSWORD`

The workflow decodes the keystore to a temp file and exports the env vars before running `gradle bundleRelease`.
