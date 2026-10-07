# How JW Library opens from links on iOS and Android, and how a Capacitor 8 app should launch it

Measurements were taken on 2026-10-07 with curl from Windows, against the live jw.org, Apple CDN and Google Digital Asset Links endpoints. Capacitor source was read from `ionic-team/capacitor` main (latest release tag 8.5.2) and `ionic-team/capacitor-plugins` main (browser 8.0.5). The notes label each fact as MEASURED (fetched by me), DOC (vendor documentation), SOURCE (code I read), or COMMUNITY (third-party projects).

## Q1. iOS universal links: which apps and paths jw.org's association files list, and what each Capacitor launch path does with them

### Takeaway
MEASURED: www.jw.org and jw.org claim exactly one path, `/finder`, for JW Library (`3UJRAJWZ4R.org.jw.jwlibrary`). Fragment `#suppress_app_links` is excluded. wol.jw.org has no association file. So only `https://www.jw.org/finder?...` links can open JW Library on iOS. In Capacitor, a plain `<a href>` tap, `window.open(url,'_blank')` and `AppLauncher.openUrl` all hand the URL to `UIApplication.shared.open`, which honours universal links. `@capacitor/browser` uses SFSafariViewController, which does not.

### Cited Findings
- MEASURED: `https://www.jw.org/.well-known/apple-app-site-association` returns HTTP 200 as `application/json`. Its `applinks.details[0].appIDs` are `3UJRAJWZ4R.org.jw.jwlibrary` and `3UJRAJWZ4R.org.jw.jwlibrary-dev`. Its `components` are `{"#":"suppress_app_links","exclude":true}` and `{"/":"/finder"}`, with legacy `"paths":["/finder"]`, and `defaults.caseSensitive:false`. — [jw.org AASA](https://www.jw.org/.well-known/apple-app-site-association)
- MEASURED: Apple's CDN copy, which is what devices actually download, is identical for `www.jw.org` and for `jw.org`. `https://jw.org/.well-known/...` redirects to www. — [Apple CDN www.jw.org](https://app-site-association.cdn-apple.com/a/v1/www.jw.org); [Apple CDN jw.org](https://app-site-association.cdn-apple.com/a/v1/jw.org)
- MEASURED: `https://www.jw.org/apple-app-site-association` (root, legacy location) returns jw.org's HTML "Page Not Found" page. Only the `.well-known` location is served. — [jw.org root AASA](https://www.jw.org/apple-app-site-association)
- MEASURED: `https://wol.jw.org/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` return the WOL HTML home page, not JSON. Apple's CDN returns `404 Not Found` for `wol.jw.org`. — [Apple CDN wol.jw.org](https://app-site-association.cdn-apple.com/a/v1/wol.jw.org)
- DOC: "if no app is available to handle a universal link, iOS routes it to the person's default browser." In addition, `open(_:options:completionHandler:)` "isn't constrained by the LSApplicationQueriesSchemes requirement." — [Apple: canOpenURL(_:)](https://developer.apple.com/documentation/uikit/uiapplication/canopenurl(_:))
- DOC: with the `universalLinksOnly` option, `UIApplication.open` "opens the URL only if the URL is a valid universal link and there is an installed app capable of opening that URL." — [Apple: universalLinksOnly](https://developer.apple.com/documentation/uikit/uiapplication/openexternalurloptionskey/universallinksonly)
- COMMUNITY/forums: universal links are not supported inside SFSafariViewController; the link loads in the view controller itself. A redirect to a universal link (as opposed to a direct tap) does not open the app. — [Apple Dev Forums 50340](https://developer.apple.com/forums/thread/50340); [Apple Dev Forums 43397](https://developer.apple.com/forums/thread/43397)
- SOURCE (Capacitor iOS `WebViewDelegationHandler.swift`): in `decidePolicyFor navigationAction`, plugins get the first chance to handle a URL. Then a host in `server.allowNavigation` is allowed to load in the WebView. Otherwise, any top-level or new-window navigation that does not start with the app's server or local URL runs `UIApplication.shared.open(navURL, options: [:])` (only when the window scene is `foregroundActive`) and is cancelled. `createWebViewWith`, the `window.open`/`_blank` path, also calls `UIApplication.shared.open(url, options: [:])` and returns nil. — [capacitor/WebViewDelegationHandler.swift](https://github.com/ionic-team/capacitor/blob/main/ios/Capacitor/Capacitor/WebViewDelegationHandler.swift)
- SOURCE (`@capacitor/app-launcher` iOS): `openUrl` calls `UIApplication.shared.open(url, options: [:])` and resolves `{completed}`. `canOpenUrl` calls `UIApplication.shared.canOpenURL`. — [AppLauncherPlugin.swift](https://github.com/ionic-team/capacitor-plugins/blob/main/app-launcher/ios/Sources/AppLauncherPlugin/AppLauncherPlugin.swift)
- SOURCE (`@capacitor/browser` iOS): presents `SFSafariViewController(url:)`. — [Browser.swift](https://github.com/ionic-team/capacitor-plugins/blob/main/browser/ios/Sources/BrowserPlugin/Browser.swift)

### Inferences
- On iOS, `<a href="https://www.jw.org/finder?...">`, `window.open(finderUrl, '_blank')` and `AppLauncher.openUrl({url: finderUrl})` all reach `UIApplication.shared.open` from your app. A different app is calling open on another app's universal link, which is the case universal links are designed for, so JW Library should open if installed and Safari otherwise. I have not tested this on a device.
- Do not add `www.jw.org` to `server.allowNavigation`. If you do, finder links load inside your WebView and never reach the system or JW Library.
- `Browser.open` (SFSafariViewController) will show the jw.org page and will not hand off to JW Library. Use it only when you explicitly want the web version.
- To force the app, appending `#suppress_app_links` stops the hand-off. That gives you a "browser only" variant of the same URL.

### Gaps
- I did not measure on a device that `UIApplication.open` with an https finder URL from a WKWebView-hosted app lands in JW Library. Apple's documentation and the AASA together imply it, but this needs a device test (iOS 17/18/26).
- `options: [:]` means no `universalLinksOnly`, so neither Capacitor path can tell "opened in app" from "opened in Safari". `completed` is true in both cases.

## Q2. Android App Links: which package jw.org verifies, and how Custom Tabs and ACTION_VIEW behave

### Takeaway
MEASURED: `www.jw.org/.well-known/assetlinks.json` verifies `org.jw.jwlibrary.mobile` (one SHA-256 fingerprint), and Google's Digital Asset Links API confirms the statement. The JW Library APK declares an https intent filter only for `www.jw.org` with `pathPrefix /finder`. A plain ACTION_VIEW intent opens JW Library when it is installed and verified, and the default browser otherwise (Android 12+). Capacitor's WebView navigation and `AppLauncher.openUrl` both send ACTION_VIEW. `@capacitor/browser` passes a CustomTabsSession, which per Chrome's documentation forces the Custom Tab even when an app could handle the link.

### Cited Findings
- MEASURED: assetlinks.json contains `delegate_permission/common.handle_all_urls` → `android_app` `org.jw.jwlibrary.mobile`, `sha256_cert_fingerprints: ["7E:A7:4C:8E:1E:69:F2:35:D6:0A:23:F2:91:7A:4E:C1:9A:0D:1C:BC:73:EB:E4:67:0C:2C:E1:BA:E1:01:4E:5D"]`. The same file is served via the jw.org redirect. — [jw.org assetlinks.json](https://www.jw.org/.well-known/assetlinks.json)
- MEASURED: Google's DAL API (`statements:list?source.web.site=https://www.jw.org`) returns the same statement for `org.jw.jwlibrary.mobile`, meaning Google's verifier can read it. — [Google Digital Asset Links API](https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://www.jw.org&relation=delegate_permission/common.handle_all_urls)
- COMMUNITY dataset (TapTrap research, APK from December 2024, targetSdk 34): `org.jw.jwlibrary.mobile.activity.SiloContainer` declares the following VIEW/BROWSABLE intent filters:
  - `scheme="jwlibrary"`
  - `scheme="jwlplaylist"`
  - `content`/`file` with mimeType `*/*` (opens .jwpub and other files)
  - `scheme="https" host="www.jw.org" pathPrefix="/finder"`

  There is no `jwpub` URL scheme. The dump strips intent-filter attributes, so it cannot show `autoVerify`. — [beerphilipp/taptrap result for org.jw.jwlibrary.mobile](https://github.com/beerphilipp/taptrap/blob/main/vulnerable_app_detection/results/2025-05-20/output/org.jw.jwlibrary.mobile.json)
- COMMUNITY: the JWStreak project says it checked JW Library's installed manifest and that "only `https://www.jw.org/finder` is [a registered App Link domain], autoVerify=true", and that "wol.jw.org is *not* one of JW Library's registered App Link domains". — [Hiburger/JWStreak lib/app_constants.dart](https://github.com/Hiburger/JWStreak/blob/main/lib/app_constants.dart)
- DOC: "Starting in Android 12 (API level 31), a generic web intent resolves to an activity in your app only if your app is approved for the specific domain… If your app isn't approved for the domain, the web intent resolves to the user's default browser app instead." — [Android 12 behavior changes: web intent resolution](https://developer.android.com/about/versions/12/behavior-changes-all#web-intent-resolution)
- DOC: on Android 11 and lower, an app becomes the default handler only if verification succeeds for *all* hosts in its manifest. Unverified apps can produce a chooser (disambiguation) dialog there. — [Android: Verify App Links](https://developer.android.com/training/app-links/verify-android-applinks)
- DOC: "By default, Custom Tabs support Android App Links… However, passing a `CustomTabsSession` to a `CustomTabIntent` will force open the link in a Custom Tab, even if the corresponding native app is installed." — [Chrome Custom Tabs: get started](https://developer.chrome.com/docs/android/custom-tabs/guide-get-started)
- SOURCE (`@capacitor/browser` Android): `new CustomTabsIntent.Builder(getCustomTabsSession())`. The session is non-null once the Custom Tabs service is bound (it binds in onResume). — [Browser.java](https://github.com/ionic-team/capacitor-plugins/blob/main/browser/android/src/main/java/com/capacitorjs/plugins/browser/Browser.java)
- SOURCE (Capacitor Android): `BridgeWebViewClient.shouldOverrideUrlLoading` → `Bridge.launchIntent(url)`. For any host other than the app's host or `allowNavigation`, this runs `new Intent(Intent.ACTION_VIEW, url)` and `startActivity`, and it swallows `ActivityNotFoundException`. — [Bridge.java](https://github.com/ionic-team/capacitor/blob/main/android/capacitor/src/main/java/com/getcapacitor/Bridge.java); [BridgeWebViewClient.java](https://github.com/ionic-team/capacitor/blob/main/android/capacitor/src/main/java/com/getcapacitor/BridgeWebViewClient.java)
- SOURCE (`@capacitor/app-launcher` Android): `openUrl` first tries `startActivity(new Intent(ACTION_VIEW, Uri.parse(url)))`. If that fails, it tries `getLaunchIntentForPackage(url)` (the url treated as a package name), then `new Intent(url)`. `canOpenUrl` first tries `getPackageInfo(url)` (package name), then `resolveActivity(ACTION_VIEW url)`. — [AppLauncherPlugin.java](https://github.com/ionic-team/capacitor-plugins/blob/main/app-launcher/android/src/main/java/com/capacitorjs/plugins/applauncher/AppLauncherPlugin.java)

### Inferences
- On Android, `AppLauncher.openUrl({url:'https://www.jw.org/finder?...'})` and a plain link tap in the WebView both send ACTION_VIEW. That opens JW Library when it is installed and verified, and the default browser otherwise, without a chooser on 12+.
- Capacitor's BridgeChromeClient has no `onCreateWindow` and Bridge never calls `setSupportMultipleWindows`. `window.open(url,'_blank')` therefore most likely navigates the main WebView, which triggers `shouldOverrideUrlLoading` and then ACTION_VIEW. I inferred this from the source and did not test it on a device.
- `Browser.open` is the wrong tool for "Open in JW Library" on Android, because the session forces the Custom Tab.
- If the user has turned off "Open supported links" for JW Library, finder links go to the browser. Only the `jwlibrary:` scheme is immune to that setting.

### Gaps
- I could not confirm `autoVerify="true"` on the current (2026) APK from a primary source. The TapTrap dump strips attributes, and JWStreak's claim is self-reported. In practice, the measured assetlinks file plus a matching filter normally verifies.
- I did not test whether a WebView `shouldOverrideUrlLoading` ACTION_VIEW intent, which carries no BROWSABLE category, behaves differently from a browser-originated one. The Android documentation implies it does not.

## Q3. JW Library's custom URL scheme and the URL forms it accepts

### Takeaway
The scheme is `jwlibrary:` (Android, measured via the APK manifest dump; iOS, community usage). It accepts the same `/finder?` query that jw.org finder links use, written as `jwlibrary:///finder?...` (three slashes, no host). Known parameters are:
- `bible=BBCCCVVV`, optionally with a `-BBCCCVVV` range
- `wtlocale=<jw language code>`
- `pub=nwtsty`
- `docid=<MEPS docid>`, optionally with `par=<paragraph>`
- `srcid=jwlshare` and `prefer=lang`
- `alias=daily-text&date=YYYYMMDD`

`jwpub://` is not a registered URL scheme on Android. It appears as a link format inside JW Library's own exports and in the Obsidian plugin, but I found no evidence it opens the mobile app.

### Cited Findings
- COMMUNITY (JW Library Linker, Obsidian): it builds `` `jwlibrary:///finder?bible=${range}${language ? `&wtlocale=${language}` : ''}` `` with an 8-digit `BBCCCVVV` code, ranges as `40005003-40005005`, and multiple ranges as separate links. It converts `jwpub://` publication references to `jwlibrary:///finder?wtlocale=<locale>&docid=<docId>&par=<paragraph>`. — [msakowski/obsidian-library-linker formatJWLibraryLink.ts](https://github.com/msakowski/obsidian-library-linker/blob/main/src/utils/formatJWLibraryLink.ts); [convertPublicationReference.ts](https://github.com/msakowski/obsidian-library-linker/blob/main/src/utils/convertPublicationReference.ts); [plugin page](https://community.obsidian.md/plugins/jw-library-linker)
- COMMUNITY (Bible Linker Pro): uses `jwlibrary:///finder?srcid=jwlshare&wtlocale=O&prefer=lang&pub=nwtsty&bible=01001001`. — [Bible Linker Pro](https://community.obsidian.md/plugins/bible-linker-pro); [Floydv149/bibleLinkerPro](https://github.com/Floydv149/bibleLinkerPro)
- COMMUNITY (JWStreak): uses the daily-text deep link `jwlibrary:///finder?srcid=jwlshare&wtlocale=<code>&prefer=lang&alias=daily-text&date=YYYYMMDD`. The project says this "Mirrors the link JW Library's own in-app Share button produces… `https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&alias=daily-text&date=YYYYMMDD`". It uses `jwlibrary:///finder?bible=01001000` as its installation probe. App Store id is `id672417831`. — [JWStreak app_constants.dart](https://github.com/Hiburger/JWStreak/blob/main/lib/app_constants.dart)
- COMMUNITY: the JW Relink plugin "converts JW.ORG finder and share links … into JW Library–readable format". This supports the view that finder query strings carry over to the scheme unchanged. — [jw-relink](https://community.obsidian.md/plugins/jw-relink)
- MEASURED (web side of finder): the following requests were made with curl.
  - `https://www.jw.org/finder?bible=43003016&wtlocale=E` returned 302 to `https://www.jw.org/en/library/bible/study-bible/books/john/3/#v43003016`.
  - `...&srcid=jwlshare&prefer=lang&pub=nwtsty` redirected to the same place.
  - `pub=nwtsty` alone redirected to the study-bible books index.
  - `docid=1102016001&wtlocale=E` redirected to `https://www.jw.org/en/` (home). That docid may simply not be on jw.org (WOL-only content), so the web fallback for docid links can be the home page. — [jw.org finder](https://www.jw.org/finder?bible=43003016&wtlocale=E)

### Inferences
- The query string is shared, so the simplest design is one function that builds `?bible=…&wtlocale=…` (or `?docid=…&wtlocale=…`) and emits two URLs: `https://www.jw.org/finder` + qs and `jwlibrary:///finder` + qs.
- The iOS URL-scheme registration has no primary evidence. The JWStreak Info.plist lists `jwlibrary` in LSApplicationQueriesSchemes, which only makes sense if the iOS app registers the scheme, and the Obsidian plugins are used on iOS. That is still not a primary source.

### Gaps
- There is no official documentation of the `jwlibrary:` scheme or of `jwpub://`. Both are reverse-engineered or community knowledge and could change without notice.
- I did not verify behaviour for `docid` links to publications the user hasn't downloaded in JW Library. The app presumably prompts a download.

## Q4. Detecting whether JW Library is installed (canOpenUrl, manifest entries, store review)

### Takeaway
iOS: add `jwlibrary` to `LSApplicationQueriesSchemes` and call `AppLauncher.canOpenUrl({url:'jwlibrary://'})`. An https universal link cannot be probed. Android 11+: add a `<queries>` block containing `<package android:name="org.jw.jwlibrary.mobile"/>` and/or a VIEW intent for scheme `jwlibrary`. Then call `canOpenUrl({url:'org.jw.jwlibrary.mobile'})` or `canOpenUrl({url:'jwlibrary:///finder'})`. Both are narrow, policy-friendly declarations.

### Cited Findings
- DOC (Capacitor): "On iOS you must declare the URL schemes you pass to this method by adding the `LSApplicationQueriesSchemes` key… This method always returns false for undeclared schemes". "On Android 11 and newer you have to add the app package names or url schemes you want to query in the `AndroidManifest.xml` inside the `queries` tag." For canOpenUrl/openUrl, "On Android the URL can be a known URLScheme or an app package name." — [Capacitor App Launcher](https://capacitorjs.com/docs/apis/app-launcher)
- DOC (Apple): canOpenURL "doesn't indicate… in the case of a universal link, whether the device has an installed app registered to respond to the universal link." Apps linked on iOS 15+ are limited to 50 LSApplicationQueriesSchemes entries, and apps linked on or after iOS 27 to 25. Using universal links "removes the need to use this method". — [Apple: canOpenURL(_:)](https://developer.apple.com/documentation/uikit/uiapplication/canopenurl(_:))
- COMMUNITY precedent: JWStreak, a shipped Flutter app, declares the following.
  - iOS: `LSApplicationQueriesSchemes = [jwlibrary]`
  - Android: `<queries><intent><action VIEW/><data scheme="jwlibrary"/></intent><intent><action VIEW/><data scheme="https"/></intent></queries>`

  It offers the store link (`apps.apple.com/app/id672417831` / `play.google.com/...id=org.jw.jwlibrary.mobile`) when JW Library is not installed. — [JWStreak Info.plist](https://github.com/Hiburger/JWStreak/blob/main/ios/Runner/Info.plist); [JWStreak AndroidManifest.xml](https://github.com/Hiburger/JWStreak/blob/main/android/app/src/main/AndroidManifest.xml)

### Inferences
- Config snippets:
  - iOS `Info.plist`: `<key>LSApplicationQueriesSchemes</key><array><string>jwlibrary</string></array>`
  - Android `AndroidManifest.xml` (inside `<manifest>`): `<queries><package android:name="org.jw.jwlibrary.mobile"/><intent><action android:name="android.intent.action.VIEW"/><data android:scheme="jwlibrary"/></intent></queries>`
- Store review: one declared scheme on iOS and one targeted package on Android are the documented, narrow mechanisms. They avoid `QUERY_ALL_PACKAGES`, which Play restricts. I found no specific review rejection tied to this.
- On Android, the `<queries>` block is needed only for canOpenUrl and package lookups. `startActivity` with a `jwlibrary:` or https ACTION_VIEW intent works without it, because package visibility filters queries, not launches. I did not fetch a primary source for that last point.

### Gaps
- I did not fetch the Android package-visibility page or the Google Play `QUERY_ALL_PACKAGES` policy page directly. The claim that targeted `<queries>` entries need no declaration is from general knowledge, not a citation.

## Q5. Fallback when JW Library is not installed, and the recommended "Open in JW Library" approach

### Takeaway
Confirmed by documentation and measurement: if JW Library is absent, the https finder link goes to the default browser. Apple documents that iOS does this, Android 12+ resolves the web intent to the browser, and jw.org's finder 302-redirects to the right jw.org page (measured for Bible references). The simplest reliable button calls `AppLauncher.openUrl({ url: 'https://www.jw.org/finder?bible=…&wtlocale=E' })` or uses a plain `<a href>`. It needs no plugin config and no detection, and falls back to the web automatically on both platforms. Add `jwlibrary:` plus `canOpenUrl` only if you need guaranteed in-app opening or an explicit "Install JW Library" prompt.

### Cited Findings
- DOC (Apple): "if no app is available to handle a universal link, iOS routes it to the person's default browser, allowing the associated website to respond." — [Apple: canOpenURL(_:)](https://developer.apple.com/documentation/uikit/uiapplication/canopenurl(_:))
- DOC (Android 12+): unapproved web intents resolve "to the user's default browser app instead." — [Android 12 behavior changes](https://developer.android.com/about/versions/12/behavior-changes-all#web-intent-resolution)
- MEASURED: finder Bible links 302 to `jw.org/en/library/bible/study-bible/books/john/3/#v43003016`, while an unknown or WOL-only docid lands on the jw.org home page (see Q3). — [jw.org finder](https://www.jw.org/finder?bible=43003016&wtlocale=E)
- SOURCE: Capacitor routes non-app top-level navigations and `_blank` windows to `UIApplication.shared.open` on iOS and to ACTION_VIEW on Android (see Q1 and Q2). — [WebViewDelegationHandler.swift](https://github.com/ionic-team/capacitor/blob/main/ios/Capacitor/Capacitor/WebViewDelegationHandler.swift); [Bridge.java](https://github.com/ionic-team/capacitor/blob/main/android/capacitor/src/main/java/com/getcapacitor/Bridge.java)

### Inferences
Recommended design:
1. **Default (zero config):** `await AppLauncher.openUrl({ url: finderHttpsUrl })`. A plain `<a href target="_blank">` is equivalent if `www.jw.org` is not in `server.allowNavigation`. The app opens if installed and verified; otherwise the browser opens at the matching jw.org page.
2. **Optional "app-first, guaranteed" mode:** configure `LSApplicationQueriesSchemes: [jwlibrary]` and Android `<queries>` (package plus the jwlibrary scheme). Then use this logic:

   ```
   if ((await AppLauncher.canOpenUrl({url:'jwlibrary://'})).value) openUrl('jwlibrary:///finder?'+qs)
   else openUrl('https://www.jw.org/finder?'+qs)
   ```

   It also covers Android users who disabled "Open supported links" and iOS cases where universal-link routing was toggled off. Long-press then "Open in Safari" persists per domain.
3. **Explicit web-only option:** `Browser.open({url: 'https://www.jw.org/finder?'+qs})` (in-app SFSafariViewController or Custom Tab, never hands off). Alternatively, append `#suppress_app_links` on iOS.
4. Do not call `openUrl('jwlibrary:...')` blindly without the check. On iOS, `open` on an unregistered scheme just returns `completed:false`. On Android, `openUrl` falls through to `getLaunchIntentForPackage`/`new Intent(url)` and resolves `completed:false`. Either way the user sees nothing unless you handle the result. Branching on `completed` would also work as a no-config fallback.
5. Prefer `bible=` links for the web fallback. `docid=` links may degrade to the jw.org home page in the browser, so consider a wol.jw.org URL as the web fallback for publication references, because wol.jw.org never hands off to the app.

### Gaps
- None of this was tested on a physical iOS or Android device in this session. The key assumption that `UIApplication.open` and ACTION_VIEW from a Capacitor app open JW Library through `www.jw.org/finder` rests on the measured association files plus vendor documentation. Device testing is still needed.
- I did not determine whether JW Library honours every finder parameter (for example `par=`, verse ranges) identically on iOS and Android.
