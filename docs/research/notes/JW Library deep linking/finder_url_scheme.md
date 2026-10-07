# The jw.org "finder" share-link URL scheme (JW Library share links)

Method note: every "MEASURED" item below comes from live probes run on 2026-10-07 from this machine with `curl -sL -A "Mozilla/5.0"` (GET, following redirects, recording each Location header and the final `<title>`). The probe URLs are the sources cited. Items marked "COMMUNITY" come from third-party GitHub code and have not been confirmed by jw.org documentation. I found no official jw.org page that documents the finder parameters.

**Probe gotcha (MEASURED):** `curl -I` (a HEAD request) and a GET can give different answers. With HEAD, every `bible=` link and some others came back **404 with no redirect**, and so did the Spanish daily-text link and the French `pub=nwtsty` link. With GET, the same URLs returned a normal 302 to a valid page. Test finder links with GET (`curl -sL -D - -o /dev/null`), never `-I`.

## What each of the user's four example links resolves to

### Takeaway
All four links redirect correctly. The `alias=daily-text&date=20261007` link goes, via a second finder on wol.jw.org, to the WOL daily-text page for 7 Oct 2026. `pub=nwtsty` goes to the English Study Bible book index. `docid=2026520` is a Watchtower Study article from August 2026. `docid=202026256` is the Life and Ministry Meeting Workbook schedule for the week of 5–11 October 2026.

### Cited Findings
- MEASURED, link 1 (`...&alias=daily-text&date=20261007`): a 302 to `https://wol.jw.org/wol/finder?alias=daily-text&wtlocale=E&date=2026-10-07`, then a 307 to `/en/wol/h/r1/lp-e/2026/10/7`, then 200. The page title is "Watchtower ONLINE LIBRARY". The page shows a three-day window with headings "Tuesday, October 6", (Oct 7), "Thursday, October 8". jw.org rewrites `date` from YYYYMMDD to YYYY-MM-DD and drops `srcid` and `prefer` when it hands off to WOL. — [probe](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&alias=daily-text&date=20261007)
- MEASURED, link 2 (`...&pub=nwtsty`): a 302 to `https://www.jw.org/en/library/bible/study-bible/books/`, then 200. Title: "The New World Translation (Study Edition) | NWT Study Bible". This is the book index, not any particular verse. — [probe](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&pub=nwtsty)
- MEASURED, link 3 (`...&docid=2026520`): a 302 to `https://www.jw.org/en/library/magazines/watchtower-study-august-2026/Resist-Satans-Tactics-Trust-In-Jehovah-and-In-Jesus/`, then 200. Title: "Resist Satan's Tactics—Trust In Jehovah and In Jesus | Watchtower Study". This is a study article in the August 2026 Watchtower Study edition. — [probe](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&docid=2026520)
- MEASURED, link 4 (`...&docid=202026256`): a 302 to `https://www.jw.org/en/library/jw-meeting-workbook/september-october-2026-mwb/Life-and-Ministry-Meeting-Schedule-for-October-5-11-2026/`, then 200. Title: "JW Life and Ministry Meeting Schedule October 5-11, 2026", from the September–October 2026 workbook. — [probe](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&docid=202026256)
- Every jw.org finder hop is a `302 Moved Temporarily`. The WOL finder hop is a `307 Temporary Redirect` with a relative Location. — probes above

### Inferences
- `docid` is a MEPS document id that does not depend on language. The same number resolves to the translated article in each language (see the language section). A `docid` can be a 7-digit number (2026520) or a 9-digit one (202026256), so it has no fixed width.
- Only the daily text is served from wol.jw.org. Every other link type lands on www.jw.org/{lang}/library/...

### Gaps
- I did not test whether the WOL daily-text page scrolls to or highlights the requested day within its three-day window. That would need a browser render.

## Meaning of each parameter

### Takeaway
The resolver keys on one content selector: `docid`, `pub` (optionally with `bible`/`issue`), `alias`, or `lank`. `wtlocale` picks the language. `par` adds a paragraph anchor. `srcid`, `srctype` and `prefer` made no observable difference to any redirect. Unknown selectors or values fall back to the jw.org home page with a 302, never a 404.

### Cited Findings
- **wtlocale** (MEPS language symbol) — MEASURED. `E` gives /en/, `S` gives /es/, `F` gives /fr/, `SV` gives /sl/ (Slovenian), and `ASL` gives /ase/ (American Sign Language). It is case-insensitive: `wtlocale=e` worked. An unknown code (`XYZ`) redirects to `https://www.jw.org`, which 301s to `/en/`. — [S](https://www.jw.org/finder?srcid=jwlshare&wtlocale=S&prefer=lang&docid=202026256), [F](https://www.jw.org/finder?srcid=jwlshare&wtlocale=F&prefer=lang&docid=2026520), [SV](https://www.jw.org/finder?srcid=jwlshare&wtlocale=SV&prefer=lang&pub=nwtsty&bible=43003016), [ASL](https://www.jw.org/finder?srcid=jwlshare&wtlocale=ASL&prefer=lang&docid=202026256), [XYZ](https://www.jw.org/finder?srcid=jwlshare&wtlocale=XYZ&prefer=lang&docid=2026520), [lowercase](https://www.jw.org/finder?srcid=jwlshare&wtlocale=e&prefer=lang&docid=2026520)
- **wtlocale missing** — MEASURED. With no Accept-Language header the link went to English. With `Accept-Language: es-ES` the same `finder?docid=2026520` went to the Spanish article (`/es/biblioteca/revistas/atalaya-estudio-agosto-2026/...`). So when `wtlocale` is absent, the browser's language decides. — [probe](https://www.jw.org/finder?docid=2026520)
- **srcid** — MEASURED: `jwlshare`, `share` and no value at all all produced the identical redirect for `docid=2026520`. COMMUNITY: `srcid=jwlshare` appears in links the JW Library app generates, as the JWStreak source comment says, while `srcid=share` (often with `srctype=wol`) appears in links shared from jw.org or WOL. It looks like an analytics or referrer tag. — [probe srcid=share](https://www.jw.org/finder?srcid=share&wtlocale=E&docid=2026520); [JWStreak app_constants.dart](https://github.com/Hiburger/JWStreak/blob/main/lib/app_constants.dart); [Estienne README (srctype=wol&srcid=share)](https://github.com/JoelMon/Estienne/blob/main/README.md)
- **srctype=wol** — MEASURED to be harmless: `docid=2016167&srctype=wol&srcid=share&par=14` resolved normally to `/watchtower-no2-2016-march/bible-chapters-and-verses/#p14`. — [probe](https://www.jw.org/finder?wtlocale=E&docid=2016167&srctype=wol&srcid=share&par=14)
- **prefer** — MEASURED: `prefer=lang`, `prefer=content` and no `prefer` gave identical redirects in every case I tested. That includes ASL with an MWB docid and Slovenian with `pub=nwtsty`. Slovenian has no Study Bible, and in all three cases the link fell back to Slovenian `nwt` in the same language. — [lang](https://www.jw.org/finder?srcid=jwlshare&wtlocale=SV&prefer=lang&pub=nwtsty&bible=43003016), [content](https://www.jw.org/finder?srcid=jwlshare&wtlocale=SV&prefer=content&pub=nwtsty&bible=43003016), [none](https://www.jw.org/finder?srcid=jwlshare&wtlocale=SV&pub=nwtsty&bible=43003016)
- **alias** — MEASURED: `daily-text` works. An unknown alias (`foobar`) redirects to `https://www.jw.org/en/`. — [probe](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&alias=foobar)
- **date** (used with alias=daily-text) — MEASURED: YYYYMMDD is the documented form. YYYY-MM-DD is also accepted and passed through unchanged. An invalid date (`20261399`), or a date with no published daily text (`20301231`), lands on the WOL daily-text page for today (`/en/wol/h/r1/lp-e`), with no error. A missing `date` also gives today. — [invalid](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&alias=daily-text&date=20261399), [2030](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&alias=daily-text&date=20301231), [none](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&alias=daily-text), [dashed](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&alias=daily-text&date=2026-10-07)
- **pub** — MEASURED.
  - `nwtsty` gives `/library/bible/study-bible/books/`.
  - `nwt` gives `/library/bible/nwt/books/...`.
  - `es26` gives "Examining the Scriptures Daily—2026" (`/library/brochures/Examining-the-Scriptures-Daily-2026/`).
  - `sjjm` gives "Sing Out Joyfully" (`/library/music-songs/sing-out-joyfully/?media=sjjm`).
  - `pub=w&issue=20260800` and `pub=w&issue=202608` both give `/library/magazines/watchtower-study-august-2026/`.
  - `pub=mwb&issue=202609` gives `/library/jw-meeting-workbook/september-october-2026-mwb/`.
  - Unknown pub (`zzzz`) gives the home page.
  - `pub=es&issue=2026` gives the home page, so the year is part of the symbol (`es26`), not an issue.

  — [es26](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&pub=es26), [sjjm](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&pub=sjjm), [w issue](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&pub=w&issue=20260800), [mwb issue](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&pub=mwb&issue=202609), [zzzz](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&pub=zzzz), [es+issue](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&pub=es&issue=2026)
- **docid** — MEASURED: an unknown docid (`9999999999`) redirects to the home page. COMMUNITY: docid equals `Document.MepsDocumentId` inside .jwpub files. — [probe](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&docid=9999999999); [MrCyjaneK/jwapi docs/jwpub](https://github.com/MrCyjaneK/jwapi/blob/master/docs/jwpub/index.md)
- **par** — MEASURED: `docid=2026520&par=5` appends `#p5` to the article URL. — [probe](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&docid=2026520&par=5)
- **lank** (video/media key) — MEASURED: `lank=pub-jwb-130_1_VIDEO` gives `https://www.jw.org/en/library/videos/?item=pub-jwb-130_1_VIDEO&appLanguage=E` ("Online Video Library"). `item=` used as a finder parameter is not recognised and goes to the home page. COMMUNITY: video lank keys also come in the form `docid-1112024040_1_VIDEO`. — [lank probe](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&lank=pub-jwb-130_1_VIDEO), [item probe](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&item=pub-jwb-130_1_VIDEO); [LeomaiaJr/wol-mcp-server videoService.ts](https://github.com/LeomaiaJr/wol-mcp-server/blob/main/src/wol/videoService.ts); [advenimus/jw-mcp captions-tool.js](https://github.com/advenimus/jw-mcp/blob/main/src/tools/captions-tool.js)
- **track** — I did not probe it and found no community usage of it in finder links.

### Inferences
- Valid combinations seen:
  - `docid` [+`par`]
  - `pub` alone
  - `pub` + `issue` for periodicals (w, mwb)
  - `pub` + `bible`, or `bible` alone, which defaults to nwtsty
  - `alias=daily-text` [+`date`]
  - `lank`

  `wtlocale` is optional but should always be included, so the result doesn't depend on the browser's language.
- When a parameter is invalid, the finder fails "softly": a 302 to the language home page, or to today's text for the daily-text alias. A link generator therefore cannot detect a bad link from the HTTP status. It has to compare the final URL with `https://www.jw.org/{lang}/`.
- `prefer` likely only affects the JW Library app's in-app handling, for example which language to prefer when the content is missing. On the website it is a no-op. This is unconfirmed.

### Gaps
- No official documentation exists for `prefer`, `srcid`, `track`, or the full set of `alias` values. I searched and found none.
- I did not test other aliases besides daily-text, such as meeting-related ones.

## Bible chapter and verse-range links

### Takeaway
`bible=BBCCCVVV`: 2-digit book, 3-digit chapter, 3-digit verse. It redirects to the chapter page with a `#vBBCCCVVV` fragment. A range `BBCCCVVV-BBCCCVVV` becomes `#vX-vY`. Verse `000` selects the whole chapter, and chapter `000` gives the book index.

### Cited Findings
- MEASURED: `pub=nwtsty&bible=19001001` gives `https://www.jw.org/en/library/bible/study-bible/books/psalms/1/#v19001001` (title "Psalms 1 | Online Bible | New World Translation"). — [probe](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&pub=nwtsty&bible=19001001)
- MEASURED: `bible=19023001-19023006` gives `.../psalms/23/#v19023001-v19023006`. `bible=43003016-43003018` gives `.../john/3/#v43003016-v43003018`. — [Ps 23](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&pub=nwtsty&bible=19023001-19023006), [John 3](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&pub=nwtsty&bible=43003016-43003018)
- MEASURED: the cross-chapter range `19023001-19024002` was clamped to `.../psalms/23/#v19023001-v19023006`, which is the end of Psalm 23. — [probe](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&pub=nwtsty&bible=19023001-19024002)
- MEASURED: `bible=19001000` gives `.../psalms/1/#v19001001-v19001006`, the whole chapter. `bible=19000000` gives the book index `/study-bible/books/`. — [chapter](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&pub=nwtsty&bible=19001000), [book](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&pub=nwtsty&bible=19000000)
- MEASURED: `bible=` without `pub` defaults to the Study Bible (`/study-bible/books/john/3/`). `pub=nwt` gives `/library/bible/nwt/books/john/3/#v43003016`. — [no pub](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&bible=43003016), [nwt](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&pub=nwt&bible=43003016)
- COMMUNITY: Obsidian plugins build `jwlibrary:///finder?bible=40024014[&wtlocale=X]` (msakowski/obsidian-library-linker) and `jwlibrary:///finder?srcid=jwlshare&wtlocale=O&prefer=lang&pub=nwtsty&bible=01001001` (Floydv149/bibleLinkerPro). The custom `jwlibrary:///finder?...` scheme takes the same query string as the https finder and opens JW Library directly. The plugins also generate `jwlibrary:///finder?wtlocale=X&docid=N&par=P` for publications. — [obsidian-library-linker README](https://github.com/msakowski/obsidian-library-linker/blob/main/README.md), [convertPublicationReference.ts](https://github.com/msakowski/obsidian-library-linker/blob/main/src/utils/convertPublicationReference.ts), [bibleLinkerPro README](https://github.com/Floydv149/bibleLinkerPro/blob/main/README.md)
- COMMUNITY: the JWStreak source says JW Library's own Share button produces `https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&alias=daily-text&date=YYYYMMDD`, and uses the `jwlibrary://` scheme with the same query so that no verified App Link is needed. — [JWStreak app_constants.dart](https://github.com/Hiburger/JWStreak/blob/main/lib/app_constants.dart)

### Inferences
- Book numbers follow canonical order: 01 is Genesis, 19 is Psalms, 40 is Matthew, 43 is John, 66 is Revelation.
- On the website, verse ranges are passed through only as URL fragments. Whether the page highlights them depends on client JavaScript, which I did not render.

### Gaps
- I did not verify how the website renders a cross-chapter range that JW Library itself generates, or whether the app honours a cross-chapter range.
- I did not test the `jwlibrary://` scheme because no device was available.

## Does `date` work for past and future dates?

### Takeaway
Yes, for any date that has a published daily text. Past (2020-01-01) and next year (2027-12-31) both resolved to dated WOL pages. A date with no published text silently falls back to today.

### Cited Findings
- MEASURED: `date=20200101` gives `/en/wol/h/r1/lp-e/2020/1/1`. Its headings start "Wednesday, January 1", "Thursday, January 2". — [probe](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&alias=daily-text&date=20200101)
- MEASURED: `date=20271231` gives `/en/wol/h/r1/lp-e/2027/12/31`, with headings "Thursday, December 30" and "Friday, December 31". The 2027 daily-text booklet is already online as of 2026-10-07. — [probe](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&alias=daily-text&date=20271231)
- MEASURED: `date=20301231` gives `/en/wol/h/r1/lp-e` (undated, today), with headings starting "Tuesday, October 6", the three-day window around 2026-10-07. — [probe](https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&alias=daily-text&date=20301231)
- COMMUNITY: daily-text-api scrapes `https://www.jw.org/finder?srcid=jwlshare&wtlocale={lang}&alias=daily-text&date={YYYYMMDD}` for arbitrary dates, for example `wtlocale=F&date=20230408`. — [andreimuntean1/daily-text-api src/index.ts](https://github.com/andreimuntean1/daily-text-api/blob/main/src/index.ts)

### Inferences
- How far ahead dates work depends on when the next year's "Examining the Scriptures Daily" booklet is published, apparently by October of the prior year. Dates before WOL's earliest booklet probably also fall back to today. I did not test this.

### Gaps
- I did not find the earliest year that works.

## Does wtlocale=S or F produce Spanish and French pages?

### Takeaway
Yes. Every link type tested resolved to the localized jw.org or WOL page, with localized URL slugs and titles.

### Cited Findings
- MEASURED, Spanish:
  - The daily text goes to `https://wol.jw.org/wol/finder?alias=daily-text&wtlocale=S&date=2026-10-07`, then `/es/wol/h/r4/lp-s/2026/10/7`, titled "BIBLIOTECA EN LÍNEA Watchtower".
  - `docid=202026256` goes to `/es/biblioteca/guia-actividades-reunion-testigos-jehova/septiembre-octubre-2026-mwb/Vida-y-Ministerio-Cristianos-5-a-11-de-octubre-de-2026/`.
  - `pub=nwtsty&bible=43003016` goes to `/es/biblioteca/biblia/biblia-estudio/libros/juan/3/#v43003016` ("Juan 3 | Biblia en línea | Traducción del Nuevo Mundo").

  — [daily](https://www.jw.org/finder?srcid=jwlshare&wtlocale=S&prefer=lang&alias=daily-text&date=20261007), [mwb](https://www.jw.org/finder?srcid=jwlshare&wtlocale=S&prefer=lang&docid=202026256), [bible](https://www.jw.org/finder?srcid=jwlshare&wtlocale=S&prefer=lang&pub=nwtsty&bible=43003016)
- MEASURED, French:
  - The daily text goes to `/fr/wol/h/r30/lp-f/2026/10/7` ("BIBLIOTHÈQUE EN LIGNE Watchtower").
  - `docid=2026520` goes to `/fr/bibliothèque/revues/tour-de-garde-etude-aout-2026/Fais-échouer-les-tactiques-de-Satan-aie-confiance-en-Jéhovah-et-en-Jésus/`.
  - `pub=nwtsty` goes to `/fr/bibliothèque/bible/bible-d-etude/livres/` ("Traduction du monde nouveau (édition d'étude) | Bible d'étude TMN").

  — [daily](https://www.jw.org/finder?srcid=jwlshare&wtlocale=F&prefer=lang&alias=daily-text&date=20261007), [docid](https://www.jw.org/finder?srcid=jwlshare&wtlocale=F&prefer=lang&docid=2026520), [nwtsty](https://www.jw.org/finder?srcid=jwlshare&wtlocale=F&prefer=lang&pub=nwtsty)
- MEASURED: the WOL path encodes the language as `r{N}/lp-{x}`: E is r1/lp-e, S is r4/lp-s, F is r30/lp-f. — probes above

### Inferences
- `wtlocale` is the stable, language-neutral input. The output slugs are localized and should not be hand-built. The finder link is the right thing to store or share.

### Gaps
- I did not test languages that lack a given publication, other than Slovenian Study Bible falling back to nwt.
