# Store setup guide (owner steps)

Plain steps for getting Faithful Days into Google Play and the App Store.
Console menu names can change. If a name below is not where you expect, look for the closest match.

Never paste a key, password or certificate into chat, an issue or a commit. Keep them in a password manager.

## 1. Android: new upload key (fixes issue #132)

The old key was exposed, so make a new one. Do not reuse the old key.

1. On your computer, open a terminal in a safe folder outside this repo.
2. Run this, with your own names in place of the placeholders:
   `keytool -genkeypair -v -keystore <NEW_UPLOAD.keystore> -alias <KEY_ALIAS> -keyalg RSA -keysize 2048 -validity 10000`
3. keytool asks you to choose passwords. Pick strong ones.
4. Save the keystore file, the alias and both passwords in your password manager. Make a second backup copy of the file.
5. Export the certificate for Google:
   `keytool -export -rfc -keystore <NEW_UPLOAD.keystore> -alias <KEY_ALIAS> -file <upload_certificate.pem>`
6. In Play Console, open your app, then Setup, App integrity, App signing. Choose the option to request an upload key reset.
7. Upload the `.pem` file when asked and send the request.
8. Wait for Google to approve. You will get an email.
9. After approval, issue #133 (rewriting git history to remove the old key) can be done. It comes after this step.

## 2. Android: GitHub secrets and the first build

1. Make the keystore into one line of text.
   - Linux: `base64 -w0 <NEW_UPLOAD.keystore>`
   - macOS: `base64 -i <NEW_UPLOAD.keystore>`
2. In GitHub, open the repo, then Settings, Secrets and variables, Actions, New repository secret.
3. Add these four secrets with these exact names:
   - `ANDROID_UPLOAD_KEYSTORE_BASE64` (the one line of text from step 1)
   - `ANDROID_UPLOAD_KEYSTORE_PASSWORD` (the keystore password)
   - `ANDROID_UPLOAD_KEY_ALIAS` (your alias)
   - `ANDROID_UPLOAD_KEY_PASSWORD` (the key password)
4. Open the Actions tab, pick **Android release**, then Run workflow. Leave versionCode empty unless Play says the number is already used.
5. If a secret is missing, the first step fails and names it. Nothing else runs.
6. When it finishes, open the run and download the artifact `faithful-days-release-aab`.
7. In Play Console, go to Testing, Internal testing, create a release and upload the `.aab` by hand. The workflow never uploads to Play.

## 3. Apple: App Store Connect API key for TestFlight

1. In App Store Connect, open Users and Access, then Integrations, then App Store Connect API.
2. Create a new key with the role **App Manager**.
3. Write down the **Key ID**. Write down the **Issuer ID** shown at the top of the page.
4. Download the `.p8` file. Apple lets you download it only once, so store it in your password manager.
5. Find your **Team ID** in the Apple Developer account, under Membership details.
6. In GitHub, add four repository secrets with these exact names (they match `.github/workflows/ios-testflight.yml`):
   - `ASC_API_PRIVATE_KEY` (the full text inside the `.p8` file)
   - `ASC_KEY_ID`
   - `ASC_ISSUER_ID`
   - `ASC_TEAM_ID`
7. The widget needs an App Group and extra Xcode setup. Follow [ios-widget-setup.md](ios-widget-setup.md) first.
8. Open the Actions tab, pick **iOS TestFlight**, then Run workflow. Tick "Unsigned simulator compile only" if you only want a test compile.
9. When it succeeds, wait for processing in App Store Connect, then open TestFlight.

## 4. Reserve the app name

Do this early so nobody else takes the name.

1. App Store Connect: Apps, plus button, New App. Use the bundle ID `ca.ashbi.habittracker`.
2. Play Console: Create app. Use the app name from the listing text.
3. Paste in the listing text from [store-release-pack.md](store-release-pack.md): name, subtitle or short description, and long description.
4. Privacy policy URL: https://faithfuldays.ashbi.ca/privacy/
5. Support URL: https://faithfuldays.ashbi.ca/support/

## 5. Before you press Submit

1. Walk through [release-checklist.md](release-checklist.md) on a real phone.
2. Check [terms-checklist.md](terms-checklist.md).
3. Apple App Privacy: choose **Data Not Collected**.
4. Google Play Data safety: say **no data collected or shared**.
5. Replace the browser-made screenshots with captures from the signed app on real devices if the stores require it. See the screenshots section of the store pack.
6. Answer the age rating questions yourself in each console.
