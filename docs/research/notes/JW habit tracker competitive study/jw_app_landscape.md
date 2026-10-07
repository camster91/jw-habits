# JW-Oriented Apps for Personal Spiritual Routines: Landscape (official and unofficial), as of Oct 2026

Research method note: about 20 searches/fetches. Google Play listing pages and AppBrain returned empty/403 to the fetch tool, so Android-only metrics (installs, Play ratings) are mostly missing. Reddit threads were not directly retrievable; community sentiment is thin and comes mainly from JWTalk and App Store reviews.

## What does JW Library (official) offer, what does it not do, and can a third-party app link into it?

### Takeaway
JW Library is a strong content and study app: Bible, publications, daily text, meeting materials, highlights, notes, tags and playlists. It has no habit tracking, streaks, reminders/notifications for routines, or weekly planning, and no general Bible-reading-schedule tracker. The only "tracking" is check boxes inside particular publications (for example the *Enjoy Life Forever!* "Track Your Bible Reading" chart). Third-party apps already open JW Library through jw.org "finder" links and the `jwlibrary://` scheme. The JW Library terms of use forbid redistributing its content or trademarks inside other software, so a companion app should link out to it and not embed its content.

### Cited Findings
- JW Library on iOS is rated 4.8/5 from about 48K ratings. The listing names these features: Bible translations, publications in 1,000+ languages, videos and audio, **Daily Text**, **meeting materials (midweek and weekend)**, highlighting, **notes, tags**, playlists and search. — [App Store: JW Library](https://apps.apple.com/us/app/jw-library/id672417831)
- Recent version history: 15.0 (Jun 2024) sign-language publications; 15.4 (Jul 31 2025) redesigned Meetings tab that links the Life and Ministry meeting and the Watchtower Study on one page; 15.5 (Oct 2025) remembers playback speed; 15.6 (Dec 30 2025) search publications by title; 15.7 (Mar 2026) scene images; 15.8 (Apr 30 2026) "Watch Now" shuffle; 15.9 (Jul 2026) iPad/Mac multi-window; 15.9.2 (Oct 2026) crash fixes. None of these entries mention reminders, streaks, reading plans or habit features. — [App Store: JW Library](https://apps.apple.com/us/app/jw-library/id672417831)
- Review themes: gratitude ("helps feed us spiritually"); requests for more highlight colours, note fonts and underlining; complaints that crashes while highlighting or taking notes lost data (at conventions). — [App Store: JW Library](https://apps.apple.com/us/app/jw-library/id672417831)
- JW Library keeps a **history** of recently read Bible chapters and articles (long-press the Bible or Publications tab). This is a recall list, not progress tracking. — [jw.org help: History (iOS)](https://www.jw.org/en/online-help/jw-library/apple/history)
- Inside the *Enjoy Life Forever!* publication, JW Library supports check boxes and date fields. Users can "enter the date they complete a lesson or ... specify a personal goal" and "use the checkboxes" in the "Track Your Bible Reading" chart (Jan 20 2022 article). — [jw.org news](https://www.jw.org/en/news/region/global/Use-Enjoy-Life-Forever-More-Effectively-With-Features-in-JW-Library)
- The JW Library Sign Language app was discontinued; sign-language content moved into JW Library. — [jw.org What's New](https://www.jw.org/en/whats-new/JW-Library-Sign-Language-App-Discontinued/)
- **Deep links:** the community uses a `jwlibrary://` URL format, converted from the older `jwpub://` links, to open content in JW Library. Example: the Obsidian "JW Library Linker" plugin. — [Obsidian stats: JW Library Linker](https://www.obsidianstats.com/plugins/jw-library-linker)
- jw.org "finder" universal links take a Bible reference, for example `https://www.jw.org/finder?wtlocale=E&prefer=lang&bible=19083018&pub=nwtsty` (book number, chapter and verse encoded as BBCCCVVV). Third-party tools generate these to open scriptures. — [JW MCP server README (glama.ai)](https://glama.ai/mcp/servers/@advenimus/jw-mcp/blob/a847af6594a8a73fb4a6b2786e8565ab5fa9d146/README.md)
- NWT Reading (third-party) states that "Scriptures open in the JW Library app," which shows that deep-linking from a companion app works in a shipping product. — [App Store: NWT Reading](https://apps.apple.com/app/id1452909600)
- **JW Library terms of use:**
  - The licence is for personal use on devices you own or control. Users may not "Distribute artwork, electronic publications, trademarks, music, photos, text, or videos from this Application with or as part of any software application."
  - Users may not create for distribution any software "specifically made to collect, copy, download, extract, harvest, or scrape data."
  - Users may not use the trademarks "JW" and "JW.ORG" in a way that gives "the impression that such other individual or entity is a publisher or distributor."
  - Sharing *links* to publications is allowed.
  - The terms do not explicitly address deep linking.
  — [jw.org Terms of Use: JW Library](https://www.jw.org/en/terms-of-use-jwlibrary/)

### Inferences
- Safest integration pattern: store only references (book, chapter, publication symbol) and open them via jw.org finder links or `jwlibrary://` links. Do not bundle daily-text text, workbook content, artwork or NWT text. Do not scrape wol.jw.org.
- Putting "JW" or "JW Library" in an app name carries trademark risk under the terms above. Several third-party apps do it anyway (see below), but a neutral name plus a "not affiliated with Watch Tower" disclaimer is the lower-risk pattern.
- JW Library's 2025–2026 roadmap focuses on content access and media, not habit features, so a habit-tracker companion is unlikely to be made redundant soon. This is speculative.

### Gaps
- I found no official documentation of the `jwlibrary://` scheme's parameters, and no statement from jw.org permitting or forbidding deep links from third-party apps.
- I could not confirm whether JW Library now has any built-in Bible reading schedule or progress marking beyond history and the per-publication check boxes. Release notes from 2024 to 2026 show none.
- No data on whether JW Library sends any notifications (for example a daily text reminder). None appear in the listing or release notes.

## The Nov 2023 field-service reporting change and how ministry-report apps adapted

### Takeaway
Confirmed: from November 2023, publishers report whether they took part in the ministry, plus Bible studies, and no longer report hours. Pioneers and others in special full-time service still report hours. Ministry-report apps now treat hour tracking as a pioneer feature. Most still centre on timers, return visits and Bible studies, and the participation check box is a small part of what they do.

### Cited Findings
- The change was announced at the October 2023 annual meeting, effective November 2023. Publishers file monthly reports saying "whether they've conducted any evangelistic activity and Bible studies, without specifying hours." Pioneers and missionaries continue to record hours. It is the first removal of hour reporting since 1920. Governing Body member Samuel Herd: "Our ministry involves much more than counting time." — [NBC News / RNS](https://www.nbcnews.com/news/religion/timekeepers-no-rank-file-jehovahs-witnesses-say-goodbye-tracking-prose-rcna126582); [Religion News Service](https://religionnews.com/2023/11/27/timekeepers-no-more-rank-and-file-jehovahs-witnesses-say-goodbye-to-tracking-proselytizing-hours/)
- **Field Service Ministry / Field Service Report Pro** (RedTracker LLC, iOS and Android):
  - Free version with ads; Pro version is paid and ad-free.
  - Features: hours timer or manual entry, return visits, Bible studies, monthly goals, contacts with directions, and sending the report by email, WhatsApp or text.
  - Pro adds "pioneer-specific tools (additional hours, travel distance)", renameable fields, an hours-versus-goal chart and yearly summaries.
  - Disclaimer: "This app is not affiliated with the Watch Tower Bible and Tract Society of Pennsylvania."
  - Its Android package id contains "jwministrypro".
  — [jwministryapp.com](http://www.jwministryapp.com/en/); [Google Play listing](https://play.google.com/store/apps/details?id=com.onflabs.jwministrypro&hl=en_US)
- **Ministry Report** (Justin Lettau; Android id `org.jwreport.app`): logs Bible studies, hours and placements; sets service goals; shows service-year progress; schedules visits. Last updated Apr 26 2026 according to the search snippet. — [Google Play](https://play.google.com/store/apps/details?id=org.jwreport.app&hl=en); [mwm.ai](https://mwm.ai/apps/ministry-report/1605507653)
- **JW Ministry+** (Sergei Mazin, iOS): free with no IAP; rated 5.0 from only 2 ratings.
  - Features: service timer, monthly and service-year reports with annual hour goal for regular pioneers, territories, Bible students with lesson progress, calendar planning, follow-up reminders.
  - Data is local-only, with backup and restore.
  - Disclaimer: "not affiliated with any religious organization." Uses "JW" in its name.
  - The fetched listing showed latest version 1.6, "January 2, 2025". The app ID (6756…) suggests a late-2025 launch, so this is probably Jan 2026; unverified.
  — [App Store: JW Ministry+](https://apps.apple.com/app/id6756040136)
- **Service Reports+** (Android): SMS and email reporting, timers, pioneer goals, Bible study tracking, return visits. — [Google Play](https://play.google.com/store/apps/details?id=com.service.reports&hl=en_US)
- **My Report – Service Record** (Android, ve.com.lahrweb). — [Google Play](https://play.google.com/store/apps/details?id=ve.com.lahrweb.informe&hl=en_US)
- **Service Report** (es.cnksoftware, formerly "JW_Service_Report_2016" per its package id) says it was "NOT officially developed by Watch Tower" and is maintained by a Witness as a non-profit app. — [APKPure](https://apkpure.net/service-report-2018/es.cnksoftware.JW_Service_Report_2016/amp)
- **Hourglass** (Congregation Software Foundation): congregation-management software for secretaries and elders. It covers publishers, territories, meeting and ministry schedules, and congregation reports. Publishers can "electronically submit reports from their mobile phones" and get assignment notifications. Pricing is not stated, and the page has no explicit non-affiliation disclaimer. — [hourglass-app.com](https://www.hourglass-app.com/en/)
- Field Service Buddy (iOS id 6446035072) also exists in this category. Details not retrieved. — [mwm.ai](https://mwm.ai/apps/field-service-buddy/6446035072)

### Inferences
- Since Nov 2023, most baptised and unbaptised publishers need only one monthly yes/no for participation plus a Bible-study count. Hour timers, the main feature of these apps, now matter mainly to pioneers. A lightweight "Did I share in the ministry this month?" check-in fits most users better than a timer.
- The category is crowded and utilitarian: timers, return visits, territory. None of the apps found treats ministry as one part of a holistic daily or weekly spiritual routine.

### Gaps
- I could not retrieve Google Play ratings, install counts or reviews for these apps, because the Play pages came back empty to the fetcher. I also found no review text about how users reacted to the 2023 change inside these apps.
- I found no confirmed list of apps removed from the stores. Names seen in older material, such as "NW Publisher" and "JW Field Service", were not verified as current or removed.
- I did not verify whether each app added an explicit publisher "participated" toggle after Nov 2023.

## Unofficial Bible-reading, routine and other "JW-adjacent" apps

### Takeaway
A few small, mostly free hobbyist apps cover Bible-reading schedules for the NWT and open JW Library. NWT Reading is the best maintained and is open source. One older app, Bible Study Tool, already offers reminders across daily text, family worship and personal study, which is the closest existing thing to a routine tracker, but it appears unmaintained. The store also has paid copycats that use the "JW Library" name for unrelated subscription Bible apps.

### Cited Findings
- **NWT Reading** (Werner Fleischer; iOS and Android; free; open source on GitHub):
  - Rated 4.5 from 54 ratings on iOS.
  - Reading schedules for the NWT in 191+ languages; canonical, written-order and chronological plans; several plans at once.
  - Shows how many days you are ahead or behind; links to "See the Good Land" maps; dark mode.
  - Latest version 6.3.9 (Feb 26 2025).
  - Disclaimer: "JW Library is a registered trademark of the Watch Tower Bible and Tract Society of Pennsylvania."
  - Praise: "Love the hyperlink to JW Library and timelines."
  - Complaint after an update: "my target date got moved."
  - Praise for partial-day progress: "I can start a specific day's reading even if I don't have time to finish it all."
  — [App Store: NWT Reading](https://apps.apple.com/app/id1452909600); [APKPure: org.searchwork.nwtreading](https://apkpure.net/nwt-reading/org.searchwork.nwtreading)
- **Bible Study Tool** (Glenn Sonderskov; iOS; free):
  - Rated 4.8 from 743 ratings.
  - Four reading lists: Daily, Personal Bible, Personal Study and **Family Worship**.
  - "Customizable reminders" for daily Bible reading, **daily text, family worship**, and personal study.
  - Chapter and verse progress markers, links to JW.org and WOL, 16 languages.
  - Latest version shown: 2.0.8, Aug 2 2018. It looks unmaintained, and the developer has given Apple no privacy details.
  - A reviewer asked for "a scheduler where I can plan what to study in the upcoming weeks."
  — [App Store: Bible Study Tool](https://apps.apple.com/app/id734412227)
- Other NWT reading-schedule apps found but not examined in detail:
  - "Bible Reading Schedule" (Android, com.mres.schedule): tracks whether you are ahead or behind the NWT schedule. — [Google Play](https://play.google.com/store/apps/details?id=com.mres.schedule&hl=en_US)
  - "Bible Study Companion" (iOS 1528673686): sequential, chronological and thematic schedules. — [mwm.ai](https://mwm.ai/apps/bible-study-companion/1528673686)
  - "Read the Word" (iOS 1572098418). — [mwm.ai](https://mwm.ai/apps/read-the-word/1572098418)
- **Copycat/trademark example: "JW Library – My Holy Bible App"** (Damian Zietkiewicz, iOS):
  - Offers KJV, NIV and other translations, with subscriptions from **$7.99/week to $99.99/year**.
  - A reviewer points out the real "Jw library by Jehovah's Witnesses is completely free."
  — [App Store](https://apps.apple.com/app/id6760021268)
- **"Library Online 2026"** says it is made by Jehovah's Witnesses and is unofficial. — [App Store](https://apps.apple.com/app/id1436849154)
- **Official publisher:** Watchtower Bible and Tract Society of New York, Inc. has 2 apps on the App Store, JW Library and JW Language. — [unstar.app developer page](https://unstar.app/developer/watchtower-bible-and-tract-society-of-new-york-inc-ios-672417834?country=mx)
- **Naming patterns:**
  - Some apps use "JW" in the name: JW Ministry+, and "jwministrypro" / "jwreport" in package ids.
  - Some use NWT: NWT Reading.
  - Others are neutral: Bible Study Tool, Ministry Report, Service Report.
  - Common disclaimers: "not affiliated with the Watch Tower Bible and Tract Society of Pennsylvania" and "not affiliated with any religious organization"; also trademark acknowledgements.
  — sources above
- **Monetisation:**
  - Mostly free with no IAP: NWT Reading, Bible Study Tool, JW Ministry+.
  - Free with ads plus a paid Pro: Field Service Report.
  - Hobbyist and "non-profit" framing is common: Service Report.
  - Aggressive subscriptions appear only in the copycat app.
  — sources above

### Inferences
- The hobbyist and free culture shows that Witness users expect such tools to be free or very cheap. Weekly subscriptions are criticised. A one-time purchase or free-with-tip model fits the norms of this category.
- Bible Study Tool's 743 ratings, despite no updates since 2018, suggest pent-up demand for a single app covering reminders for daily text, family worship and personal study. That niche currently has no maintained occupant.

### Gaps
- No download numbers for any third-party app.
- I could not confirm whether Bible Study Tool is still installable on current iOS, or whether the 2018 date shown is accurate.
- No daily-text widget app was found and verified. Searches surfaced only generic Christian "verse of the day" widget apps.

## Community sentiment among practising Witnesses

### Takeaway
Evidence is sparse but consistent. Practising Witnesses who want to track several spiritual routines piece together printed or PDF schedules, generic task apps such as TickTick, and single-purpose JW apps. They ask for multi-plan Bible-reading tracking and forward planning of study.

### Cited Findings
- On JWTalk (a Witness community forum), Jan 2019, a user asked for an iOS app to track three reading programmes at once: "Weekly Bible Reading, Personal Bible Reading, Family Study Reading." Replies pointed to the printed jw.org reading schedule PDF and to TickTick, where one user imported a "chronological, daily reading list" and checked it off. Free TickTick has a 100-item limit. No dedicated app was recommended. — [JWTalk thread](https://jwtalk.net/topic/38750-app-request-bible-reading-tracking/)
- An App Store reviewer of Bible Study Tool asked for "a scheduler where I can plan what to study in the upcoming weeks." — [App Store: Bible Study Tool](https://apps.apple.com/app/id734412227)
- A NWT Reading reviewer valued being able to log a partial day's reading, and was frustrated when an update moved their target date. This suggests users value flexibility and forgiveness over rigid schedules. — [App Store: NWT Reading](https://apps.apple.com/app/id1452909600)
- Printable and paid spiritual-routine planners (study, prayer, meditation, habit tracking) are sold on Etsy and Gumroad, which points to demand for structured routine tracking. — [Etsy listing](https://www.etsy.com/listing/1542719369); [Gumroad planner](https://bestplanners.gumroad.com/l/planner)
- Mainstream Christian apps show the habit-streak pattern works for Bible reading: YouVersion streaks, and "Bible Streak". Witnesses generally use the NWT and JW Library, so those apps' content does not fit them. — [YouVersion Streak help](https://help.youversion.com/l/en/article/ni583tllli-streak-ios); [Bible Streak](https://apps.apple.com/us/app/-/id6749277910)
- Media framing of the 2023 change ("our ministry involves much more than counting time") points to a cultural shift away from quantitative pressure. — [NBC News](https://www.nbcnews.com/news/religion/timekeepers-no-rank-file-jehovahs-witnesses-say-goodbye-tracking-prose-rcna126582)

### Inferences
- Gentle tracking that never shames the user (no harsh streak resets; "grace days"; weekly rather than daily targets for some items) fits both the user feedback above and the post-2023 tone. This is design inference, not measured.
- r/JehovahsWitnesses is heavily mixed with ex-member content, and I could not retrieve threads from it. Practising users' sentiment there remains unverified.

### Gaps
- No Reddit threads were retrieved. I could not separate practising from ex-member opinion on Reddit.
- No survey data on how many Witnesses use third-party apps.

## Gaps a simple, fun, on-device habit tracker could fill

### Takeaway
No current, maintained app combines these into one gentle checklist: daily text, Bible reading (by schedule), personal study, family worship, meeting preparation with awareness of meeting days, and a monthly ministry-participation check-in. Each piece exists in isolation, in JW Library or in single-purpose apps, or in an abandoned app (Bible Study Tool, last updated 2018). A privacy-first, local-only, free or cheap app that links into JW Library rather than copying its content has clear room.

### Cited Findings
- JW Library supplies the content (daily text, meeting workbook, Bible) but has no reminders, streaks or planner. — [App Store: JW Library](https://apps.apple.com/us/app/jw-library/id672417831)
- Reading-schedule apps cover only Bible reading. — [NWT Reading](https://apps.apple.com/app/id1452909600)
- Ministry apps cover only field service, mainly hours. — [jwministryapp.com](http://www.jwministryapp.com/en/); [JW Ministry+](https://apps.apple.com/app/id6756040136)
- The one multi-routine reminder app found, Bible Study Tool, has daily text, family worship and personal study reminders, but its last listed update is 2018. — [App Store: Bible Study Tool](https://apps.apple.com/app/id734412227)
- Users ask for tracking of several reading programmes and for forward study planning. — [JWTalk](https://jwtalk.net/topic/38750-app-request-bible-reading-tracking/); [Bible Study Tool reviews](https://apps.apple.com/app/id734412227)
- Local-only storage is already a selling point in this niche: JW Ministry+ "collects no data". — [App Store: JW Ministry+](https://apps.apple.com/app/id6756040136)

### Inferences
These are candidate differentiators for the product; none were verified with users.
- **Unified daily checklist:** daily text, Bible reading, personal study and prayer/meditation, with one-tap "open in JW Library" for each item via finder or `jwlibrary://` links.
- **Meeting-day awareness:** the user sets their congregation's midweek and weekend meeting days. The app then prompts "prepare for Thursday's meeting" a day or two before and offers a link to the Meetings tab or the workbook.
- **Family worship slot:** a weekly recurring item with a gentle reminder, as Bible Study Tool offered.
- **Ministry check-in fitted to the 2023 rules:** a monthly "I shared in the ministry" toggle plus a Bible-study count for publishers, and an optional hours mode for pioneers. This avoids a heavy timer-centric tool.
- **Gentle streaks:** weekly completion rings or "grace days" rather than punitive daily streaks, in keeping with the "more than counting time" tone.
- **Fun elements:** visual progress through Bible books, and milestone moments such as finishing a book or reading the whole Bible.
- **Compliance:**
  - Do not embed daily-text or publication text, consistent with the JW Library terms.
  - Avoid "JW" or "JW Library" in the app name.
  - Include a "not affiliated with Watch Tower Bible and Tract Society" disclaimer.
  - Keep data on-device.
  - No subscriptions, so it does not look like the copycat apps.

### Gaps
- None of these gap hypotheses has been tested with user research.
- I could not verify whether a newer combined routine app launched in 2025–2026 that store searches did not surface. A manual store search for terms like "spiritual routine", "theocratic" and "daily text" is recommended.
