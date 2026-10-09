# Illustrated guides and app character

Prepared 2026-10-09 on `agent/261-colour-and-jw-links`; local review candidate, not a published native build.

## Design contract

Use amber for daily text, teal for Bible reading, blue for preparation, rose for family worship, lavender for study, and warm rust for ministry. Pair color with a visible icon and label. Page introductions and optional numbered quick guides share reusable components. Guide text stays real selectable text; illustrations are decorative and have empty alternatives because the adjacent heading explains their meaning. Respect light/dark themes and reduced motion; keep hold-to-check and tap-to-undo unchanged.

Three original transparent illustrations were generated with the built-in image tool on 2026-10-09: a blank open book with sunrise/leaves, a stepping-stone path with a blank planner, and a blank notebook with pencil. No jw.org pictures, logos, published text, or screenshots are reused. Optimized WebP files in `public/illustrations` total 50,088 bytes. Welcome uses the book, planning/preparation/family use the path, and Notes uses the notebook. Source PNGs remain in the local generated-images folder; the application ships optimized files only. WebP is included explicitly in the injected service-worker precache; the offline check fetches and decodes all three with networking disabled.

Notes provides editable question, takeaway, and family-idea starters. Opening one creates an unsaved draft; only Save persists the user's edits. Existing stores and export/import formats stay unchanged.

## Official website shortcut

The optional visible “What's New on jw.org” card opens the official website only when tapped. It makes no claim that unseen new articles were detected. Settings can hide it. Automatic native feed collection is removed; compatibility exports are no-ops and legacy stored metadata is retained without migration. The pure legacy feed parser is not a running refresh service.

Reviewed website terms: https://www.jw.org/en/terms-of-use/ on 2026-10-09. Their link-sharing permission and restrictions on distributing tools that collect/extract site data motivate this conservative implementation. This review is not permission from the publisher or legal certification. Automatic update alerts require a separately reviewed acceptable source/permission before implementation.

## Validation and limits

904 tests across 65 files pass with coverage thresholds; lint, formatting, build, bundle budgets, Chromium smoke/journeys, accessibility in light/dark phone/tablet layouts, and offline/update recovery pass. New guides are scanned both closed and expanded. The selected-tab dark-mode contrast failure was corrected and the full accessibility pass repeated successfully. Original illustrations decode offline. Notes drafts are tested for no write before Save and accurate saved user edits.

All main screens were viewed in the in-app browser at a phone viewport using fabricated local data. Screenshots and the detailed review remain in the task outputs. No new native compile, signed build, device acceptance, store upload, or public launch is established by these web checks. The previously supplied APK does not include this candidate.
