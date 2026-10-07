> Historical snapshot, superseded by [current commitments](roadmap.md) and [current architecture](../CLAUDE.md). Retained as evidence; claims here do not certify the current release or store readiness.

> **HISTORICAL — superseded 2026-09-21.** This document describes the app before the
> generic-habit-tracker refactor. Organisation-specific rows, the link library it
> references, and the bundle id it names no longer exist. Kept for the record only;
> do not treat it as current. See [CLAUDE.md](./CLAUDE.md).

# JW Habits — Feature Roadmap & PRD
**Date:** 2026-07-01
**Source of ideas:** jw.org research + existing app surface + ToS compliance lens (per CLAUDE.md: link-out only, no JW content hosted, all data on-device).

---

## What the app is today

5-row iOS habit checklist. Each row = a tap-to-open deep link into jw.org / JW Library + a checkbox. Local-only state in `localStorage['jw-daily-habits-state']`. No server, no auth, no JW content stored. 3.1 KB gzipped. Apple App Store ID `com.ashbi.jwnews`, version 4.1.0, live at `https://jwhabits.ashbi.ca/`.

The 5 rows are: Daily text · Daily Bible reading · Meeting prep · Family worship · Prayer.

**Hard product constraint (CLAUDE.md):**
- No Bible text, no prayer content, no progress summaries, no jw.org content.
- The app is a **fast router** to jw.org + a **local habit memory**.
- Whatever gets shipped has to fit that envelope — ToS-safe by construction.

---

## What jw.org actually gives a JW to track (research summary)

| Surface | URL pattern | What the user does there |
|---|---|---|
| Daily text | `jw.org/finder?...&alias=daily-text&date=YYYYMMDD` | Read today's scripture |
| Today's Bible reading | `wol.jw.org/wol/finder?srcid=jwlshare&bible=...` | Read a passage |
| Midweek meeting workbook | `jw.org/en/library/jw-meeting-workbook/{vol}-mwb/Life-and-Ministry-Meeting-Schedule-for-{Month-DD-DD-YYYY}/` | Prep assigned parts |
| Family worship | `jw.org/en/bible-teachings/family/` | Pick a talk prompt or activity |
| Memorial invitation | `jw.org/en/jehovahs-witnesses/memorial/` | Annual event (March/April only) |
| Convention program | `jwevent.org/` + `jw.org/en/jehovahs-witnesses/conventions/` | Annual + regional events |
| Field service / pioneering | meeting workbook assignments + `jw.org/en/library/series/how-the-bible-changes-lives/` | Outreach report hours |
| JW Broadcasting | `jw.org/en/broadcasting/` | Monthly programs |
| What's New? (RSS available) | `jw.org/en/whats-new/` | New releases (videos, articles, music) |
| Online Bible study lessons | `jw.org/en/bible-teachings/online-lessons/` | Self-paced study courses |
| Find a meeting | `apps.jw.org/ui/E/meeting-search.html` | Local Kingdom Hall lookup |

**Third-party precedent (what already exists):** NW Scheduler, OCLM, GetTalkReady, JW Study, jw-push (GitHub). All share the same posture — link out, don't host content, store user metadata only.

---

## The 8 feature ideas (ranked by leverage ÷ effort)

### Tier 1 — High leverage, low effort. Ship these next.

**1. Personal note per habit row (private, on-device only)**
- Each of the 5 rows gets a swipe-to-reveal note field (or a small disclosure chevron).
- Notes auto-save per row per day to localStorage. Never leave the device.
- Use: "Today's meeting part on treasures — ask about Daniel 2." A freeform reminder, scoped to that habit, gone at midnight.
- ToS: zero. Notes are the user's own words, not JW content.
- Effort: 0.5 day.
- Sketch: extend `localStorage['jw-daily-habits-state'].done` to `{ text: { done: true, note: '...' } }` shape.

**2. This week's meeting parts preview (parse the MWB URL)**
- The MWB page (e.g. `Life-and-Ministry-Meeting-Schedule-for-July-06-12-2026`) lists each Tuesday's parts: Treasures, Ministry, Living, Bible reading.
- App fetches that URL server-side (or pre-bundles the schedule at build time via a cron), parses the **part titles only** (no scripture text), and surfaces them as "Your parts this week" on the home page.
- ToS: parses public jw.org HTML; titles only; deep-link back to the source. This is the same thing OCLM and NW Scheduler do. Falls under fair-use link-out + structural metadata.
- Risk: jw.org can change HTML at any time. Mitigation: render as "Couldn't fetch schedule — open on jw.org" with one tap.
- Effort: 1.5 days (fetch + parser + cache + edge-case handling).

**3. "What's new on jw.org" feed (opt-in, pull-to-refresh)**
- Subscribe to the public `jw.org/en/whats-new/` page (no official RSS confirmed, but `jw-push` and `jwpubs.org/tools/subscription/` confirm RSS exists).
- Show last 7 days of new releases (videos, articles, music) in a simple iOS list.
- Tap → open on jw.org.
- ToS: list of titles + links only; no content scraped or stored.
- Effort: 1 day (RSS feed discovery + UI).

### Tier 2 — High leverage, medium effort. Ship if Cam confirms appetite.

**4. Memorial countdown (date-aware, already partial)**
- App already shows the Memorial row in March/April. Extend to a 30/14/7-day countdown card pinned at the top of home during that window.
- Adds: "Share invitation" button → opens system share sheet with a pre-filled text message ("Join us for the Memorial of Christ's death on [date]. [jw.org/en/jehovahs-witnesses/memorial/]").
- ToS: share is system-provided, user-chosen recipient; no JW content embedded beyond the URL.
- Effort: 0.5 day.

**5. Meeting finder (geolocation, opt-in)**
- One button on home → asks for geolocation once → redirects to `apps.jw.org/ui/E/meeting-search.html#{lat},{lng}`.
- App stores nothing (or the lat/lng in localStorage for the session only).
- Use: "Where's the meeting?" right before leaving.
- ToS: passes through to jw.org's own meeting finder. App never sees or stores addresses.
- Effort: 0.5 day.

**6. Annual Bible reading progress (already partial)**
- App already has `dailyBibleReading.json` (366-day schedule) + deep link.
- Add: "X / 366 days read" small chip on the Bible row.
- Add: tap-to-mark-read on the row itself (currently requires opening jw.org).
- Use: visual progress on the *only* JW-surfaced reading plan. No scripture stored — just a count.
- ToS: zero. Counts are user metadata.
- Effort: 0.5 day.

### Tier 3 — Lower leverage or higher risk. Park unless Cam asks.

**7. Field service hour tracker (auxiliary pioneer support)**
- Add a 6th row (or a Settings section): "Field service hours this month: __ / 30".
- Number-entry only; no territory/return visit data.
- Use: auxiliary pioneers hit 30 hrs/mo, regular publishers track their pattern.
- ToS: zero. Just numbers the user types.
- Risk: Cam said earlier (CLAUDE.md) no streaks/gamification. Hours count is borderline — it's personal tracking, not a streak, but could feel like one. Verify with Cam before shipping.
- Effort: 0.5 day.

**8. Convention countdown (regional / annual)**
- Same pattern as Memorial countdown — pin to top of home during the regional convention window.
- Date source: needs to be a list of convention dates by region (no public API; would have to be hardcoded or community-curated).
- Use: regional conventions run June–August typically.
- Risk: date list is hard to keep accurate without scraping.
- Effort: 1 day if dates are bundled; 3+ days if scraped.

---

## What we will NOT build (ToS guardrails)

- **No Bible text, no scripture quotes, no NWT storage.** Even one verse is a problem.
- **No song lyrics.** JW songbook is copyrighted.
- **No Watchtower / Awake / book content.** All reading happens on jw.org.
- **No meeting schedule scraping beyond the public MWB HTML** (Tier 1 #2). The OCLM / NW Scheduler ecosystem has proven this is tolerable, but anything more aggressive (e.g. scraping the assignment roster with names) is off-limits.
- **No JW.org login / session reuse.** JW.org doesn't expose user accounts to third parties. Trying to access a logged-in user session would violate ToS.
- **No push notifications that quote jw.org content.** Notifications can point at jw.org URLs (already done in Wave 3) but the body must be the app's own words.
- **No resale / donation integration.** JW.org does not run a donation funnel for third parties.

---

## The ToS lens in one sentence

> Ship user metadata + deep links to jw.org. Never host JW content. Never pretend to be jw.org. Always surface "Unofficial third-party tool" on every screen that touches JW material.

That sentence is the audit checklist for every feature above.

---

## Suggested order (my pick if Cam says "you decide")

1. **#1 Personal note per row** — tiny, zero risk, fills the only hole in the daily ritual.
2. **#6 Reading progress chip** — surfaces existing data, makes the Bible row feel alive.
3. **#4 Memorial countdown** — one-time-a-year polish, share-invite is the kind of thing a JW actually uses.
4. **#3 What's new feed** — only if RSS is real; otherwise drop.
5. **#2 MWB parser** — biggest leverage but the only one with non-trivial ToS exposure; revisit after the others ship.

That sequence = ~3 days total for Tier 1+2 minus #2, all link-out + on-device metadata, no JW content hosted, no auth, no scraping beyond what's already public.

---

## What I'd want from Cam before shipping

- Confirm the priority order (or re-rank).
- Confirm the "no streaks" rule still applies to #7 hours-tracker (or relax it for that one row).
- Confirm "What's New?" RSS feed exists for en/es/fr — I'll check `jwpubs.org/tools/subscription/` first, fall back to skipping #3 if not.