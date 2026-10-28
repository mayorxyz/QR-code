# Changelog

Reconstructed from `git log --date=short --pretty=format:"%h %ad %s"`. The repository has two commits, both dated 2026-10-27. `package.json` has no `version` field and there are no git tags, so no release versions are claimed here.

## 2026-10-27

### f785d2f - QR CODE

Initial application commit. The commit stat shows 45 files added: the Vite/React/TypeScript setup, the design system in `src/index.css`, the generator and bulk pages, the history, How It Works, Privacy and 404 pages, the 11 payload types, URL sanitize/normalize/platform modules, SHA-256 history helpers, QR creation and export helpers, the first `pipeline.test.ts`, the public favicon and SPA rewrite files, and a prebuilt `dist/` output.

### 5402a63 - first commit

Added `README.md`. This is the first commit in the repository.

## Uncommitted working tree

No commit date or version is recorded for these changes. They are present in the working tree as of 2026-10-28 and are visible in `git status`.

### Added

- `src/components/ChipInput.tsx` - chip box with typed-delimiter commits, paste handling, keyboard editing, per-item valid/invalid/duplicate styling, and a 50-chip cap.
- `src/components/StyledExportPanel.tsx` - Card, Sticker, Poster and Badge template picker, accent colours, custom text, host/credit toggles, and verified download.
- `src/lib/bulkNaming.ts` - slugging, Numbered/Label/Site-Path filename builders, collision handling, CSV build/parse/escape.
- `src/lib/smartSplit.ts` - text-to-item splitting, nested-link protection, `%20` handling, phone-fragment merging, classification and the 50-item cap.
- `src/lib/styledExport.ts` - tile renderer, four styled templates, and multi-step `verifyStyledExport`.
- `src/lib/styledExport.test.ts` - template and verification tests.
- `src/lib/tileExport.test.ts` - tile geometry and jsQR decode tests.
- `src/lib/diagnostic.ts` and `src/pages/Diagnostic.tsx` - console-based tile decode diagnostic. The page is not routed.

### Changed

- `src/pages/Bulk.tsx` - rebuilt around chips as the single source of truth, with derived items, duplicates, edit/delete/undo, naming controls, tile/plain and PNG/SVG/both export options, progress/cancel, ZIP export, and `index.csv`.
- `src/pages/Generator.tsx` - integrated the payload tabs and dynamic form, field-value persistence, history deduplication with type and style, and the styled export panel.
- `src/components/ExportBar.tsx` - verified tile export with one retry, plain PNG, plain SVG, clipboard fallback, share, and transparent-background preference.
- `src/components/HistoryGrid.tsx`, `src/pages/History.tsx` - history card and restoration updates.
- `src/components/Layout.tsx`, `src/components/PayloadTabs.tsx`, `src/components/PlatformChip.tsx`, `src/components/QrPreview.tsx`, `src/components/PayloadForm.tsx`, `src/components/StylePanel.tsx`, `src/components/dropdown.tsx` - responsive and styling updates.
- `src/index.css` - token and responsive style updates.
- `package.json` and `package-lock.json` - dependency updates.

### Known current failures at this point

- `npm run typecheck` fails with four `Blob | Buffer` errors in `src/lib/qr.ts`.
- `npx vitest run` reports 51 passed and 20 failed out of 71 tests. DOM tests fail because no DOM environment is configured; two `pipeline.test.ts` assertions fail.
