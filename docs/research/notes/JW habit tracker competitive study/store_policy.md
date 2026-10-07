# Store policy and trademark constraints for an unofficial JW-oriented habit tracker (Capacitor)

Not legal advice. All guideline text below was fetched on 2026-10-06 from the live pages; the Apple page did not show a "last updated" date in the fetched content. Several trademark databases (Justia, uspto.report, USPTO TSDR) returned HTTP 403 to the fetcher, so some trademark status details are from search snippets and are flagged.

## 1. Trademarks and jw.org Terms of Use

### Takeaway
Watch Tower Bible and Tract Society of Pennsylvania owns registered marks for JW.ORG (US word mark, Canadian word-plus-logo mark) and claims common-law use of "JW" since 1931. It has enforced "JW" at the TTAB (against "JW PLAYER"). The jw.org Terms of Use bar distributing its trademarks, artwork, text or media "with or as part of any software application." Using "JW", "JW.ORG", "JW Library", or the jw.org logo in the app's name or icon is the highest-risk choice available.

### Cited Findings
- **JW.ORG (US):** registered to Watch Tower Bible and Tract Society of Pennsylvania. Serial 85896124, filed 2013-04-05, Registration No. 4797582. Covers Class 9 digital media and Class 41 religious-education services "relating to the tenets of the Jehovah's Witnesses denomination." — [Justia (search snippet)](https://trademarks.justia.com/858/96/jw-85896124.html). A second JW.ORG filing, serial 88559829, is listed — [uspto.report (snippet only, page 403)](https://uspto.report/TM/88559829)
- **JW.ORG and Design (Canada, CIPO):** Registration TMA1182235, filed 2015-11-10, registered 2023-05-26, expires 2033-05-26. Covers goods in Classes 9 and 16, explicitly including "mobile applications," and services in Classes 38 and 41. The mark is the square logo with letters. — [CIPO 1754140](https://ised-isde.canada.ca/cipo/trademark-search/1754140)
- **"JW" enforcement:** Watch Tower petitioned to cancel LongTail Ad Solutions' "JW" and "JW PLAYER" registrations, asserting it "has been using its JW mark since as early as 1931." On 2014-12-01 the TTAB denied LongTail's motion to dismiss, so the case went forward. — [SSJR (Watch Tower's counsel)](https://www.ssjr.com/articles/view/238). I did not find the final outcome.
- **JW LIBRARY:** a search snippet says a "JW LIBRARY" application was filed by Watch Tower (filing date cut off). Watch Tower also holds "WATCHTOWER ONLINE LIBRARY" (serial 97362717). — [Justia owner page (403)](https://trademarks.justia.com/owners/watch-tower-bible-and-tract-society-of-pennsylvania-2608365); [Justia 97362717](https://trademark.justia.com/973/62/watchtower-online-97362717.html)
- **jw.org itself:** its Terms of Use call JW.ORG® a registered trademark and use ® on other product names, for example "JW Language®" and "JW Broadcasting®". — [jw.org Terms of Use](https://www.jw.org/en/terms-of-use/); [JW Language App Discontinued](https://www.jw.org/en/whats-new/JW-Language-App-Discontinued/)
- **What the Terms of Use allow:** viewing, downloading and printing content "for your own personal and non-commercial purposes." Sharing "links to or electronic copies of downloadable publications, videos, or audio programs on this site" is also allowed. — [jw.org Terms of Use](https://www.jw.org/en/terms-of-use/)
- **What the Terms of Use prohibit:**
  - "Post artwork, electronic publications, trademarks, music, photos, videos, or articles from this website on the Internet."
  - "Distribute artwork, electronic publications, trademarks, music, photos, text, or videos from this website with or as part of any software application."
  - Creating for distribution "any software applications, tools, or techniques that are specifically made to collect, copy, download, extract, harvest, or scrape data." The one exception is free, non-commercial apps that download EPUB/PDF/MP3/MP4 files from public areas.
  - The terms are governed by New York law.
  - Source: [jw.org Terms of Use](https://www.jw.org/en/terms-of-use/)
- **Earlier removal:** an unofficial "Watchtower ONLINE LIBRARY" Android app (developer "unitarako apps") was removed from Google Play on 2013-02-12. The reason is not stated. — [AppBrain (via search snippet)](https://www.appbrain.com/app/watchtower-online-library-apps/com.jw.apps)
- **An unofficial app that is still live:** "Library Online 2026" by Rubo Manukyan has the subtitle "Watchtower & Daily Text." Its description says "It is an unofficial app." Users still call it deceptive:
  - "designed to look like it comes from the brothers which makes it dangerous" (2023)
  - Users also point to the developer's personal name and the paid ad-free upsell as "red flags." Official JW apps carry no ads and no in-app purchases.
  - Source: [App Store listing](https://apps.apple.com/us/app/watchtower-library-2024/id1436849154)

### Inferences
- The jw.org Terms of Use rule out bundling or displaying the daily text, Bible text from the NWT, artwork or logos in the app. They also rule out scraping jw.org or wol.jw.org to show content in-app. Linking out to jw.org (opening the system browser or JW Library) is the pattern the terms allow.
- Watch Tower has shown it will litigate over "JW" even outside religious content (a video player). That makes "JW" in an app name or icon a real takedown and complaint risk, not only a review risk. Store reviewers also act on trademark complaints from rights holders. Both Apple 5.2 and the Google IP policy route these complaints.
- Community perception is part of the risk. JW users treat ads, IAP and a personal developer name as signs of an unofficial or "apostate" app. A habit tracker that looks official but monetizes will draw 1-star reviews and reports.

### Gaps
- I could not confirm the US status of the plain word "JW", "JEHOVAH'S WITNESSES", "WATCH TOWER"/"WATCHTOWER" as standalone word marks, or "JW LIBRARY". The USPTO, Justia and uspto.report pages returned 403. A forum thread claims an early JW.ORG application was "Refused" ([jehovahs-witness.com, 403](https://www.jehovahs-witness.com/topic/280822/list-trademark-applications-made-watchtower-jw-org-refused)), but I could not verify it. A later registration (4797582) exists.
- I did not search WIPO Madrid.
- I found no public record of a DMCA or trademark takedown by Watch Tower aimed specifically at an unofficial App Store or Play app. The 2013 Play removal has no stated cause.
- "Jehovah's Witnesses" is the name of a religion. Using it descriptively ("for Jehovah's Witnesses") is likely nominative or descriptive use, but that is a legal judgment I cannot confirm.

## 2. Apple App Review Guidelines (current)

### Takeaway
The Apple risks are 4.1(c) and 5.2.1 (no third-party brand in the name or icon without permission), 2.3.7 (no trademark-stuffed metadata, 30-character name) and 4.2 (a Capacitor shell must feel "app-like"). A privacy policy URL and a support URL are mandatory even if the app collects no data.

### Cited Findings (verbatim from [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/))
- **1.1.1:** prohibits "Defamatory, discriminatory, or mean-spirited content, including references or commentary about religion..." A devotional tool does not trigger this, but copy that disparages other faiths or ex-members would.
- **1.5 Developer Information:** "Make sure your app and its Support URL include an easy way to contact you."
- **2.3.7:**
  - "Choose a unique app name, assign keywords that accurately describe your app, and don't try to pack any of your metadata with trademarked terms, popular app names... App names must be limited to 30 characters."
  - Subtitles "should not ... reference other apps." Apple "may modify inappropriate keywords at any time."
- **4.1(a):** "Don't simply copy the latest popular app ... or make some minor changes to another app's name or UI and pass it off as your own."
- **4.1(b):** "Submitting apps which impersonate other apps or services is considered a violation of the Developer Code of Conduct and may result in removal from the Apple Developer Program."
- **4.1(c):** "You cannot use another developer's icon, brand, or product name in your app's icon or name, without approval from the developer."
- **4.2:** "Your app should include features, content, and UI that elevate it beyond a repackaged website. If your app is not particularly useful, unique, or 'app-like,' it doesn't belong on the App Store."
- **4.2.2:** apps "shouldn't primarily be marketing materials, advertisements, web clippings, content aggregators, or a collection of links."
- **4.2.3(i):** "Your app should work on its own without requiring installation of another app to function." An app that only deep-links into JW Library would fail this.
- **5.1.1(i):** "All apps must include a link to their privacy policy in the App Store Connect metadata field and within the app in an easily accessible manner." The policy must say what data, "if any," is collected, how it is retained or deleted, and how a user can revoke consent or request deletion.
- **5.2.1:** "Don't use protected third-party material such as trademarks ... without permission, and don't include misleading, false, or copycat representations, names, or metadata in your app bundle or developer name."
- **5.2.2:** if the app "uses, accesses, monetizes access to, or displays content from a third-party service, ensure that you are specifically permitted to do so under the service's terms of use. Authorization must be provided upon request." Read together with the jw.org Terms of Use, this blocks in-app display of jw.org content.
- **Capacitor 4.2 precedent (January 2026):** a hybrid Capacitor app was rejected at least twice under 4.2 even with native Core Location, reverse geocoding, clipboard, share sheet and Apple Maps deep links. The reviewer said the experience was not sufficiently different from web browsing, and that such features alone are "not robust enough." — [Apple Developer Forums thread 812889](https://developer.apple.com/forums/thread/812889)
- **Common fix advice from secondary sources:** add a feature the web version can't deliver and make it reachable from the first screen. Examples given are offline storage, home-screen widgets, Siri Shortcuts and server-backed push notifications. — [skillselion: Capacitor Apple review preflight](https://skillselion.com/skills/cap-go/capgo-skills/capacitor-apple-review-preflight); [vp0.com](https://vp0.com/blogs/app-store-rejection-spam-design-ai-fix) (secondary, lower quality)

### Inferences
- A habit tracker is naturally "app-like": it stores data locally, works offline, and sends scheduled local notifications or reminders. That is a stronger 4.2 position than a website wrapper. Bundle all web assets locally (no remote `server.url`), and make reminders, streaks and widgets visible on first launch.
- Things that would strengthen the native case:
  - local notifications
  - a WidgetKit home-screen widget (needs a native Swift extension)
  - haptics
  - App Intents / Siri Shortcuts
  - full offline function
- Put the "Sign in" and "no account needed" behaviour in the review notes, and describe the native features in plain language for the reviewer. The forum reply in thread 812889 criticised jargon.
- For an on-device-only app, the App Privacy ("nutrition label") answer would be "Data Not Collected." Any analytics or crash SDK (for example Firebase or Sentry) changes that answer.

### Gaps
- I did not fetch Apple's App Privacy Details page to quote the "Data Not Collected" definition. It is based on knowledge, not verified this session.
- No public Apple rejection specific to impersonating a religious organization was found.

## 3. Google Play Developer Program Policies

### Takeaway
Play's Impersonation, Intellectual Property and Metadata policies together forbid a title, icon or developer name that implies official JW affiliation. Titles are capped at 30 characters. A privacy policy and a Data safety form are required even when the app collects nothing. New personal accounts (created after 2023-11-13) must run a closed test with 12 or more testers for 14 continuous days before Production unlocks.

### Cited Findings
- **Impersonation:** apps may not "impersonate or misrepresent their identity, ownership, or primary purpose" or "falsely imply a relationship to or authorization by someone." Listed violations include:
  - developer names suggesting an official relationship that doesn't exist
  - copying logos to suggest affiliation
  - titles and icons misleadingly similar to existing products
  - "Official" claims without permission
  - Source: [Play Policy: Impersonation](https://support.google.com/googleplay/android-developer/answer/9888374?hl=en)
- **Intellectual Property:**
  - "We don't allow apps that infringe on others' trademarks." Infringement is "improper or unauthorized use of an identical or similar trademark in a way that is likely to cause confusion as to the source"; "your app may be suspended."
  - Developers should avoid "another party's trademarks, such as logos or brand names without permission and/or in a way that could confuse users." If authorized, "contact the Google Play team in advance with notice and documentation."
  - Source: [Play Policy: Intellectual Property](https://support.google.com/googleplay/android-developer/answer/9888072?hl=en)
- **Metadata:**
  - "Your app title must be 30 characters or less."
  - No "emojis, emoticons, or repeated special characters" in the title, icon or developer name. No ALL CAPS unless it is the brand.
  - No store-performance, price or Play-program claims.
  - No "repetitive or unrelated keywords."
  - "Don't use ... a brand's logo without permission."
  - Source: [Play Policy: Metadata](https://support.google.com/googleplay/android-developer/answer/9898842?hl=en)
- **Spam / Webview:** "We don't allow apps whose primary purpose is to ... provide a webview of a website without permission from the website owner or administrator." — [Play Policy: Spam](https://support.google.com/googleplay/android-developer/answer/9899034?hl=en). Wrapping jw.org or wol.jw.org in a WebView would breach both this policy and the jw.org Terms of Use.
- **Data safety:**
  - "Even developers with apps that do not collect any user data must complete this form and provide a link to their privacy policy."
  - "User data accessed by your app that is only processed locally on the user's device and not sent off device does not need to be disclosed."
  - Source: [Play Console Help: Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- **Testing requirement:** personal accounts "created after November 13, 2023" must run a closed test with "a minimum of 12 testers who have been opted in continuously for at least 14 days." Until then, Production and Pre-registration stay disabled, and the developer then applies for production access from the Dashboard. — [Play Console Help 14151465](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
  - The number was previously 20 testers. — [Android Authority](https://androidauthority.com/google-play-app-testing-requirement-3510580)
  - Organization accounts are exempt. — [ExtendsClass 2026](https://extendsclass.com/blog/google-plays-closed-testing-requirement-what-developers-need-to-know-in-2026)
  - If a tester drops out, the 14-day count can reset. — [levelup.gitconnected](https://levelup.gitconnected.com/the-12-tester-tax-google-plays-closed-testing-rule-is-quietly-killing-solo-devs-2cea83c2e338) (secondary, not confirmed by Google)

### Inferences
- Recruiting 12 testers and keeping them for 14 days is a scheduling cost for an independent developer, and it should go in the launch plan. Registering an organization account (which needs a D-U-N-S number) avoids it.
- Play's search indexing reads the description, so describing the audience there (for example "for Jehovah's Witnesses") is how discovery would work. The title can stay free of trademarks.

### Gaps
- I did not locate a Play policy page that quotes a "minimum functionality" rule beyond the webview-spam text. Play's broken-functionality and minimum-functionality language lives under Spam/Minimum Functionality and was not captured verbatim.

## 4. Precedent: how unofficial religious-community apps name themselves and disclaim

### Takeaway
Unofficial LDS apps routinely use the community nickname ("LDS") in the title, together with an explicit non-affiliation sentence in the description. The one unofficial JW-content app found also disclaims, yet users still see it as deceptive, partly because of its "Watchtower" subtitle and its monetization.

### Cited Findings
- Disclaimer wordings used by unofficial LDS apps:
  - "This mobile app is not affiliated with or endorsed by The Church of Jesus Christ of Latter-day Saints." — [Temple Appointment Scheduling](https://apps.apple.com/hn/app/temple-appointment-scheduling/id1630788532)
  - "LDS Daily Verse is neither affiliated with nor endorsed by The Church of Jesus Christ of Latter-day Saints." — [LDS Daily Verse](https://apps.apple.com/us/app/id926538511)
  - "This app is not officially sponsored by The Church of Jesus Christ of Latter-day Saints." — [Doctrinal Warrior: LDS Tools](https://apps.apple.com/us/app/-/id1418857564)
  - "This is not an official product ... no material compensation or support was received from the church" — [LDS Advocate](https://apps.apple.com/app/id961416599)
  - "This app is not endorsed by the church in any way. The developer is a private entity." — [HolyTemples](https://apps.apple.com/ph/app/holytemples/id6630364864)
  - "This app is not affiliated with The Church of Jesus Christ of Latter-Day Saints." — [LDS Conferences](https://apps.apple.com/us/app/lds-conferences/id1483787977)
- The JW example: "Library Online 2026", subtitle "Watchtower & Daily Text", description says "It is an unofficial app." — [App Store](https://apps.apple.com/us/app/watchtower-library-2024/id1436849154)

### Inferences
- The LDS pattern is not clearly a safe template for "JW":
  - "LDS" is a colloquial nickname whose owner discourages it but does not appear to enforce it against apps.
  - "JW" is a mark Watch Tower actively asserts (the TTAB case) and is part of its registered JW.ORG / JW Library / JW Broadcasting product family.
  - A title like "JW Habits" therefore reads as part of that product family, which is exactly what 4.1(c), 5.2.1 and Play Impersonation target.
- A disclaimer helps but does not cure a confusing name or icon. Reviewers and rights holders judge the overall impression.

### Gaps
- No documented App Store or Play rejection specifically for impersonating a religious organization was found. Catholic and Muslim app naming was not surveyed in this pass, so they remain gaps.

## 5. Is "JW" in name, subtitle or keywords risky, and what are safer alternatives?

### Takeaway
Yes, "JW" in the name, icon, subtitle or developer name is high-risk, and in keywords it is moderate risk. The safer pattern has five parts:
- a neutral, original brand name (for example a "spiritual routine," "theocratic schedule," or "daily habits" style name)
- an original icon with no jw.org square or blue-tile look-alike
- the audience described only in the description body, with a clear disclaimer
- no jw.org content bundled
- outbound links only

### Cited Findings
- Apple bars another party's "brand, or product name in your app's icon or name" without approval — [4.1(c)](https://developer.apple.com/app-store/review/guidelines/). It also bars packing metadata "with trademarked terms" — [2.3.7](https://developer.apple.com/app-store/review/guidelines/).
- Play bars titles, icons and developer names that "falsely imply affiliation" — [Impersonation](https://support.google.com/googleplay/android-developer/answer/9888374?hl=en). It bars confusingly similar use of marks — [IP](https://support.google.com/googleplay/android-developer/answer/9888072?hl=en).
- Watch Tower asserts "JW" as its mark since 1931 — [SSJR](https://www.ssjr.com/articles/view/238). The JW.ORG logo is registered in Canada for mobile applications — [CIPO](https://ised-isde.canada.ca/cipo/trademark-search/1754140).

### Inferences (risk ladder, highest to lowest)
1. jw.org logo or a look-alike icon, or "JW Library"-style naming: very high risk. These are registered or claimed marks covering mobile apps.
2. "JW" or "JW.ORG" in the app name or developer name: high risk under 4.1(c), 5.2.1, Play Impersonation and the TTAB-demonstrated enforcement.
3. "JW" in the subtitle or short description: high-to-moderate risk. Apple's 2.3.7 bans referencing other apps in subtitles.
4. "JW" or "Jehovah's Witnesses" in the iOS keyword field: moderate risk, because Apple may strip keywords. A single descriptive term is less risky than stuffing.
5. "for Jehovah's Witnesses" in the long description, plus a disclaimer: lowest risk. It describes the religion, not a product.

Example disclaimer, modelled on the LDS precedents: "[App] is an independent app made by [developer]. It is not affiliated with, endorsed by, or sponsored by Watch Tower Bible and Tract Society or jw.org, and contains no content from jw.org."

Avoid ads and IAP if the product strategy allows. JW users read monetization as a sign of an unofficial app, according to reviews of Library Online 2026.

### Gaps
- Whether "Jehovah's Witnesses" or "Watchtower" are registered US word marks is unverified (see section 1).
- Counsel should confirm whether nominative or descriptive use in the description is defensible in the US and Canada.
