# jw.org Terms of Use checklist

Checked against jw.org's Terms of Use on 2026-10-28 (see the "Research basis"
section of `docs/superpowers/specs/2026-10-28-mobile-only-design.md`). This is a
good-faith reading by the developer, not legal advice and not an approval from
jw.org. Re-check at each release.

## Clauses and how the app meets them

| Clause (as quoted in the research) | How Faithful Days meets it |
|---|---|
| The Terms forbid shipping jw.org text, artwork or trademarks inside an app. | The app bundles no jw.org text, verses, catalogue, artwork or marks (`CLAUDE.md`, "No third-party content in shipped code"). Bible book names and chapter counts are public facts; encouragement lines carry references as data, never verse text. The app is described as independent and not affiliated. |
| The Terms forbid distributing tools "specifically made to collect, copy, download, extract, harvest, or scrape data" from the site. | The app is a routine tracker, not a collection tool. Its one request reads two fields (`guid`, `pubDate`) from the official What's New feed, to show a count. It stores no article text, titles or media and republishes nothing. |
| The exception names free apps that download "EPUB, PDF, MP3, and MP4 files". | The app downloads none of these. It does not rely on the exception for its links or its count. |
| Sharing links and "directing others to this website" are allowed. | Link buttons open jw.org / JW Library URLs built from public facts, or a link the user typed, in the system browser or app. |
| The feed (`/en/whats-new/rss/WhatsNewWebArticles/feed.xml`) describes itself as "See what has been recently added to jw.org" and is not blocked by robots.txt and is not linked from the What's New page, and the exception does not name feeds. | Low but non-zero risk, mitigated by: reading only `guid` and `pubDate`; at most one request a day; an off switch in Settings (on by default); and removing the check if jw.org asks. |

## Before release

- [ ] No JW marks in the app name, icon, subtitle, keywords or screenshots. The name is
      "Faithful Days"; do not use "JW", "Jehovah" or "Watchtower" as a name or keyword.
      The store description may state the audience in plain words and carry the disclaimer.
- [ ] The feed check is dates-only: confirm `src/native/whatsNewClient.js` reads only `guid`
      and `pubDate`, and that nothing from the feed is stored beyond ids and counts.
- [ ] The off switch for the feed check works in Settings, and no request is made when off.
- [ ] Decide whether to write to DeveloperSupport@jw.org (the only official contact for
      developer questions) to ask about the feed check. Owner decision; record the outcome
      here. If jw.org objects, drop the feed count.
- [ ] The store listing and in-app About text keep the not-affiliated disclaimer.
