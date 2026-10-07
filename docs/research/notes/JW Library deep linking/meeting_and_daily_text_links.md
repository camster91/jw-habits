# JW.org finder / JW Library links for weekly meeting materials and the daily text

Probed live with curl on 2026-10-07 (today is in ISO week 41, Oct 5-11, 2026). Labels used below:
- **[VERIFIED]**: observed directly in a probe (HTTP status, Location headers, final URL, page `<title>`, or `/d/` links in the HTML).
- **[INFERRED]**: a pattern fitted to the probed data. It is not documented anywhere, so treat it as a heuristic.

No publication text was stored. Only URLs, ids and titles were recorded.

## docid structure: what do 2026520 and 202026256 point to, are they language-independent, is there a pattern?

### Takeaway
The two example docids are the reverse of what you might guess. **2026520 is the Watchtower study article** for Oct 5-11, 2026 (Aug 2026 study edition). **202026256 is the midweek workbook (mwb) schedule** for Oct 5-11, 2026. Docids are language-independent: the same docid works with wtlocale=E, S and F. There is a strong numbering pattern, but it has gaps and anomalies. It is fine for a guess, but a link that must be correct needs a lookup table (or a date-based wol link, covered in the next section).

### Cited Findings
- [VERIFIED] `https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&docid=2026520` returns one 302, then 200 at `https://www.jw.org/en/library/magazines/watchtower-study-august-2026/Resist-Satans-Tactics-Trust-In-Jehovah-and-In-Jesus/` — [probe](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&docid=2026520)
- [VERIFIED] Same docid in other languages:
  - wtlocale=S goes to `https://www.jw.org/es/biblioteca/revistas/atalaya-estudio-agosto-2026/No-creamos-las-mentiras-de-Satanás-y-confiemos-en-Jehová-y-Jesús/`
  - wtlocale=F goes to `https://www.jw.org/fr/bibliothèque/revues/tour-de-garde-etude-aout-2026/Fais-échouer-les-tactiques-de-Satan-aie-confiance-en-Jéhovah-et-en-Jésus/`
  - Source: [probe S](https://www.jw.org/finder?srcid=jwlshare&wtlocale=S&prefer=lang&docid=2026520)
- [VERIFIED] `docid=202026256` with wtlocale=E goes to `https://www.jw.org/en/library/jw-meeting-workbook/september-october-2026-mwb/Life-and-Ministry-Meeting-Schedule-for-October-5-11-2026/` — [probe](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&docid=202026256)
  - S goes to `.../es/biblioteca/guia-actividades-reunion-testigos-jehova/septiembre-octubre-2026-mwb/Vida-y-Ministerio-Cristianos-5-a-11-de-octubre-de-2026/`
  - F goes to `.../fr/bibliothèque/reunion-tj-cahier/mwb-septembre-octobre-2026/Programme-pour-la-réunion-Vie-et-ministère-du-5-au-11-octobre-2026/`
- [VERIFIED] The wol meetings pages for ISO week 2026/41 link to the same two docids in all three languages:
  - `/en/wol/d/r1/lp-e/202026256` and `/en/wol/d/r1/lp-e/2026520`
  - `/es/wol/d/r4/lp-s/...` and `/fr/wol/d/r30/lp-f/...` carry the identical numbers
  - Sources: [en](https://wol.jw.org/en/wol/meetings/r1/lp-e/2026/41), [es](https://wol.jw.org/es/wol/meetings/r4/lp-s/2026/41), [fr](https://wol.jw.org/fr/wol/meetings/r30/lp-f/2026/41)
- [VERIFIED] Docids listed on the wol meetings page for each ISO week of 2026 (source pattern: `https://wol.jw.org/en/wol/meetings/r1/lp-e/2026/<WW>`):

  | ISO wk | Week | mwb docid | WT study docid |
  |---|---|---|---|
  | 1 | Dec 29 2025–Jan 4 | 202025409 | 2025604 |
  | 2–5 | Jan 5 – Feb 1 | 202026001–004 | 2025640, 642, 643, 644 |
  | 6–9 | Feb 2 – Mar 1 | 202026005–008 | 2025682–685 |
  | 10–13 | Mar 2–29 | 202026081–084 | 2026240, 241, 243, 244 |
  | 14 | (page title "Table of Contents"; no meeting week listed) | — | 2026242 only |
  | 15–18 | Apr 6 – May 3 | 202026086–089 | 2026281, 282, 283, **280** |
  | 19–23 | May 4 – Jun 7 | 202026161–165 | 2026320–324 |
  | 24–27 | Jun 8 – Jul 5 | 202026166–169 | 2026365–368 |
  | 28–32 | Jul 6 – Aug 9 | 202026241–245 | 2026400–404 |
  | 33–36 | Aug 10 – Sep 6 | 202026246–249 | 2026442–445 |
  | 37–40 | Sep 7 – Oct 4 | 202026252–255 | 2026482–485 |
  | 41–44 | Oct 5 – Nov 1 | 202026256–259 | 2026520–523 |
  | 45–49 | Nov 2 – Dec 6 | 202026401–405 | 2026560, 561, 562, 565, 566 |
  | 50–53 | Dec 7 2026 – Jan 3 2027 | 202026406–409 | 2026601, 602, 604, 605 |
  | 2027/1–2 | Jan 4–17 2027 | 202027001–002 | 2026642–643 |

- [VERIFIED] The JW pub-media API (GETPUBMEDIALINKS) returns `"docid":0` for every weekly mwb item. So that API **cannot** be used to discover docids. It does return week titles such as "October 5-11 (Jeremiah 40-41)" and JWPUB/RTF file URLs — [API probe](https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?pub=mwb&issue=202609&langwritten=E&output=json&fileformat=RTF)

### Inferences
- [INFERRED] **Watchtower study docid** ≈ `YYYY*1000 + 200 + 40*M + k`:
  - YYYY and M are the year and month of the *study edition issue* (not the study date). The issue is studied about 2 months later.
  - k is roughly the article number.
  - Fits every issue checked: Oct 2025 → 2025600s; Nov 2025 → 640s; Dec 2025 → 680s; Jan 2026 → 240s; Mar → 320s; Apr → 360s; May → 400s; Jun → 440s; Jul → 480s; Aug → 520s; Sep → 560s; Oct → 600s; Nov → 640s.
  - **But k is not reliably sequential.** Week 18 uses 2026280, out of order. Values are skipped (242, 563, 564, 603). Week 14 (the Memorial week, which I take to be Mar 30–Apr 5, 2026) shows only 2026242 and no meeting schedule.
  - So you cannot reliably compute the article for a given week.
- [INFERRED] **mwb weekly docid** ≈ `2020 + YY + NNN`, with an NNN block for each issue:
  - Jan–Feb: 001–
  - Mar–Apr: 081–
  - May–Jun: 161–
  - Jul–Aug: 241–
  - Nov–Dec: 401–
  - The Sep–Oct 2026 issue breaks the 80-step pattern: it continues at 252–259 rather than starting near 321. A formula would therefore have produced wrong docids for Sep–Oct 2026.
  - Conclusion: docids must be looked up (pre-built table or wol meetings page), not computed.
- Docids identify a document, not a language edition, so one stored docid serves E/S/F by changing `wtlocale`. This was verified for both example docids.

### Gaps
- No official documentation of the docid numbering scheme was found.
- Not checked: whether the jw.org finder offers per-paragraph or per-section anchors within the mwb (for example, jumping straight to "Treasures" or "Living as Christians").

## Is there a date-based link to "this week's meeting" without knowing a docid?

### Takeaway
Yes. Use wol's meetings URL with an ISO year and week (`/YYYY/WW`), or wol's own finder with `alias=meetings&date=`. The www.jw.org finder only supports `alias=meetings` *without* a date: it resolves to the current week and returns 404 when a date is added. `pub=mwb&issue=YYYYMM` and `pub=w&issue=YYYYMM` resolve to the issue's table-of-contents page, not to the week.

### Cited Findings
- [VERIFIED] `https://www.jw.org/finder?wtlocale=E&alias=meetings` goes:
  1. 302 to `https://wol.jw.org/wol/finder?alias=meetings&wtlocale=E`
  2. 307 to `/en/wol/meetings/r1/lp-e`
  3. 307 to `/en/wol/meetings/r1/lp-e/2026/41`, then 200
  - Source: [probe](https://www.jw.org/finder?wtlocale=E&alias=meetings)
- [VERIFIED] `https://www.jw.org/finder?wtlocale=E&alias=meetings&date=20261019` returns **404**. The `date=2026-10-19` form also returns 404 — [probe](https://www.jw.org/finder?wtlocale=E&alias=meetings&date=20261019)
- [VERIFIED] `https://wol.jw.org/wol/finder?alias=meetings&wtlocale=E&date=2026-10-19` does a 307 to `/en/wol/meetings/r1/lp-e/2026/43`, then 200.
  - `date=20261019` (no dashes) works too.
  - wtlocale=S goes to `/es/wol/meetings/r4/lp-s/2026/43`; F goes to `/fr/wol/meetings/r30/lp-f/2026/43`.
  - Source: [probe](https://wol.jw.org/wol/finder?alias=meetings&wtlocale=E&date=2026-10-19)
- [VERIFIED] `https://wol.jw.org/en/wol/meetings/r1/lp-e` (no week) does a 307 to `/2026/41`. Direct `/YYYY/WW` URLs return 200 with no redirect — [probe](https://wol.jw.org/en/wol/meetings/r1/lp-e/2026/41)
- [VERIFIED] The week number is the **ISO-8601 week** (Monday-based). Evidence:
  - `/2026/1` is titled "December 29, 2025–January 4, 2026".
  - `/2026/41` is titled "October 5-11".
  - `/2026/53` exists and is titled "December 28, 2026–January 3, 2027". 2026 is a 53-week ISO year.
  - `/2027/1` is titled "January 4-10".
  - Source: [2026/53](https://wol.jw.org/en/wol/meetings/r1/lp-e/2026/53)
- [VERIFIED] wol language segments:

  | Language | URL path | Finder wtlocale |
  |---|---|---|
  | English | `/en/wol/.../r1/lp-e` | E |
  | Spanish | `/es/wol/.../r4/lp-s` | S |
  | French | `/fr/wol/.../r30/lp-f` | F |

- [VERIFIED] `https://www.jw.org/finder?wtlocale=E&pub=mwb&issue=202609` resolves to `https://www.jw.org/en/library/jw-meeting-workbook/september-october-2026-mwb/` (the issue page) — [probe](https://www.jw.org/finder?wtlocale=E&pub=mwb&issue=202609)
- [VERIFIED] `https://www.jw.org/finder?wtlocale=E&pub=w&issue=202608` resolves to `https://www.jw.org/en/library/magazines/watchtower-study-august-2026/` (the issue page) — [probe](https://www.jw.org/finder?wtlocale=E&pub=w&issue=202608)
- [VERIFIED] The meetings page for ISO week 14 of 2026 has the title "Table of Contents" and lists no mwb week. A week-based link therefore still resolves in a no-meeting week, but it shows no schedule — [probe](https://wol.jw.org/en/wol/meetings/r1/lp-e/2026/14)
- Open-source projects reference the `wol/meetings/.../lp-e` path in their code. Examples found by GitHub code search: berba-q/meeting_timer (`src/config.py`) and TanisJam/wol-API (`src/api/wol.ts`). Their code was not reviewed — [GitHub code search](https://github.com/search?q=%22wol%2Fmeetings%22+%22lp-e%22&type=code)

### Inferences
- **Best no-lookup rule for a week:** `https://wol.jw.org/{en|es|fr}/wol/meetings/{r1|r4|r30}/{lp-e|lp-s|lp-f}/{ISOYEAR}/{ISOWEEK}`. Both the midweek and weekend materials are on that page.
  - Use the ISO week-year, not the calendar year. For example, Dec 29 2025 is in 2026/1.
- **Alternative that takes any date:** `https://wol.jw.org/wol/finder?alias=meetings&wtlocale={E|S|F}&date=YYYY-MM-DD`. The server maps the date to its week.
- These links open in a browser, on wol, **not** inside JW Library. Only docid-based `jw.org/finder?...docid=` links resolve to a single article. JW Library's "share" links use the docid form (`srcid=jwlshare&prefer=lang`).
- To land directly on the mwb or WT article, you still need the docid.

### Gaps
- Not tested: whether JW Library (Windows/iOS/Android) intercepts `wol.jw.org/wol/finder?alias=meetings` or `jw.org/finder?alias=meetings` and opens its own Meetings tab. Only HTTP behaviour was probed.
- No `jwlibrary://` scheme documentation was found. A web search for `jwlibrary:///finder` returned only a generic `jw.org/finder?prefer=content&wtlocale=E&docid=...` example — [search result: JW Library help](https://www.jw.org/en/online-help/jw-library/windows/search/)

## Can docids be discovered from wol HTML or the pub-media API, and do jw.org terms allow runtime fetching?

### Takeaway
The wol meetings page HTML contains exactly the two docids for the week, as `/wol/d/` links: the mwb one is 9 digits starting `2020YY`, and the WT one is 7 digits starting with the issue year. The pub-media API does not expose docids (it returns 0). However, jw.org's Terms of Use forbid distributing tools made to scrape the site. That rules out shipping an app that fetches wol at runtime. Prefer either:
- date-based wol links, which need no fetching, or
- a docid table built offline and bundled with the app (a one-off build-time step, still legally grey).

### Cited Findings
- [VERIFIED] The 2026/41 page contains exactly `href="/en/wol/d/r1/lp-e/202026256"` and `href="/en/wol/d/r1/lp-e/2026520"`. 2026/42 contains `202026257` and `2026521` — [2026/42](https://wol.jw.org/en/wol/meetings/r1/lp-e/2026/42)
- [VERIFIED] `https://wol.jw.org/fr/wol/d/r30/lp-f/202026256` returns 200. The wol `/d/` form is a valid docid deep link per language — [probe](https://wol.jw.org/fr/wol/d/r30/lp-f/202026256)
- [VERIFIED] GETPUBMEDIALINKS for `pub=mwb&issue=202609`:
  - Returns publication metadata, JWPUB file URLs (for example `mwb_E_202609.jwpub`) and weekly RTF titles.
  - Every item has `"docid":0`.
  - `pub=w&issue=202608&langwritten=S` returns `w_S_202608.jwpub`.
  - Source: [API](https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?pub=mwb&issue=202609&langwritten=E&output=json&fileformat=JWPUB)
- [VERIFIED] The jw.org Terms of Use list as not allowed: "Create for distribution purposes, any software applications, tools, or techniques that are specifically made to collect, copy, download, extract, harvest, or scrape data, HTML, images, or text from this site." The same list also prohibits "Share links to or electronic copies of downloadable publications, videos, or audio programs on this site." — [jw.org Terms of Use](https://www.jw.org/en/terms-of-use/)

### Inferences
- The "share links to … downloadable publications" clause appears to target redistributing download files. jw.org's own share buttons generate `finder?srcid=jwlshare` links, which suggests ordinary links to articles are expected use. This is my reading, not legal advice.
- Runtime fetching of wol HTML to extract docids would be a tool "specifically made to … extract … HTML", which conflicts with the terms. The GETPUBMEDIALINKS API is useless for docids anyway.
- **Recommended approach:**
  - Generate links from the date alone (ISO week → wol meetings URL; date → daily-text alias).
  - Use docid links only from a small hand-maintained table, or from docids the user pastes from JW Library's share sheet.
- A docid table built offline could also be checked against the pattern in the first section. A docid outside its expected block (for example, an mwb NNN not near the issue base) signals an error.

### Gaps
- No official jw.org API documentation or developer policy exists to confirm what automated use is allowed.
- The JWPUB files (SQLite inside) are believed to contain document ids. Not examined, because that means downloading publication content.

## Daily text: does `alias=daily-text&date=YYYYMMDD` work for arbitrary dates and per language?

### Takeaway
Yes. `https://www.jw.org/finder?wtlocale={E|S|F}&alias=daily-text&date=YYYYMMDD` works for past, current and future dates and for each language. The date must be **YYYYMMDD without dashes**; the dashed form returns 404 on www.jw.org. It resolves to the wol daily-text page `/{lang}/wol/h/{r}/{lp}/YYYY/M/D`, which can also be linked directly.

### Cited Findings
- [VERIFIED] `https://www.jw.org/finder?wtlocale=E&alias=daily-text&date=20261007` goes:
  1. 302 to `https://wol.jw.org/wol/finder?alias=daily-text&wtlocale=E&date=2026-10-07`
  2. 307 to `/en/wol/h/r1/lp-e/2026/10/7`, then 200
  - Source: [probe](https://www.jw.org/finder?wtlocale=E&alias=daily-text&date=20261007)
- [VERIFIED] wtlocale=S goes to `https://wol.jw.org/es/wol/h/r4/lp-s/2026/10/7`; wtlocale=F goes to `https://wol.jw.org/fr/wol/h/r30/lp-f/2026/10/7` — [probe S](https://www.jw.org/finder?wtlocale=S&alias=daily-text&date=20261007)
- [VERIFIED] The JW Library share form works the same way. `https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&alias=daily-text&date=20261007` follows the same chain to `/en/wol/h/r1/lp-e/2026/10/7` — [probe](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&alias=daily-text&date=20261007)
- [VERIFIED] A future date works. `date=20270315` resolves to `/en/wol/h/r1/lp-e/2027/3/15`, and that page has a daily-text tab for 2027-03-15 linking docid `1102027202` — [probe](https://wol.jw.org/en/wol/h/r1/lp-e/2027/3/15)
- [VERIFIED] A past date works. `/2025/1/1` has a tab for 2025-01-01 linking `1102025200` — [probe](https://wol.jw.org/en/wol/h/r1/lp-e/2025/1/1)
- [VERIFIED] `date=2026-10-07` (dashed) on www.jw.org/finder returns 404 — [probe](https://www.jw.org/finder?wtlocale=E&alias=daily-text&date=2026-10-07)
- [VERIFIED] `alias=daily-text` with no date resolves to `https://wol.jw.org/en/wol/h/r1/lp-e`, which shows today's text — [probe](https://www.jw.org/finder?wtlocale=E&alias=daily-text)
- [VERIFIED] `https://wol.jw.org/en/wol/dt/r1/lp-e/2026/10/7` also returns 200, so a `dt` path variant exists — [probe](https://wol.jw.org/en/wol/dt/r1/lp-e/2026/10/7)
- [VERIFIED] The daily-text page links a monthly document docid:

  | Month | Docid |
  |---|---|
  | Oct 2026 | 1102026209 |
  | Mar 2027 | 1102027202 |
  | Jan 2025 | 1102025200 |
  | Dec 2024 | 1102024211 |

  Source: probes above.

### Inferences
- [INFERRED] The daily-text (Examining the Scriptures Daily) docid is `110 + YYYY + (200 + month − 1)`. It is one document per month, not per day, so the date alias is the right way to reach a specific day.
- The year/month/day in the wol path are **not zero-padded** (`2026/10/7`, `2027/3/15`). The finder `date` parameter **is** zero-padded (`YYYYMMDD`).

### Gaps
- Not tested how far into the future the text is available. 2027-03-15 resolved, but whether the 2027 booklet text is fully published was not checked beyond the tab and docid being present.
- Not tested whether JW Library opens `alias=daily-text` links in the app rather than the browser.
