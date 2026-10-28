# QRLink Architecture

This document describes how the code is wired today. It is derived from the source files, not from a planned design.

## Module dependency overview

Legend: `A -> B` means A imports B.

```
src/main.tsx
  -> src/index.css
  -> src/App.tsx

src/App.tsx
  -> src/components/Layout.tsx
  -> src/pages/Generator.tsx
  -> src/pages/Bulk.tsx
  -> src/pages/History.tsx
  -> src/pages/HowItWorks.tsx
  -> src/pages/Privacy.tsx
  -> src/pages/NotFound.tsx

src/components/Layout.tsx
  -> react-router-dom
  -> lucide-react

src/pages/Generator.tsx
  -> src/components/UrlInput.tsx
  -> src/components/QrPreview.tsx
  -> src/components/StylePanel.tsx
  -> src/components/ExportBar.tsx
  -> src/components/PlatformChip.tsx
  -> src/components/PayloadTabs.tsx
  -> src/components/PayloadForm.tsx
  -> src/components/StyledExportPanel.tsx
  -> src/lib/sanitize.ts
  -> src/lib/normalizeUrl.ts
  -> src/lib/platforms.ts
  -> src/lib/hash.ts
  -> src/lib/qr.ts
  -> src/lib/payloads.ts
  -> src/lib/history.ts
  -> qr-code-styling

src/components/QrPreview.tsx
  -> src/lib/qr.ts
  -> src/lib/history.ts (types)
  -> qr-code-styling

src/components/StylePanel.tsx
  -> src/lib/history.ts (types)

src/components/PayloadTabs.tsx
  -> src/lib/payloads.ts

src/components/PayloadForm.tsx
  -> a Dropdown component (import path "./Dropdown"; actual file is dropdown.tsx)
  -> src/lib/payloads.ts (types)

src/components/ExportBar.tsx
  -> src/lib/qr.ts
  -> src/lib/styledExport.ts
  -> qr-code-styling (type only)

src/components/StyledExportPanel.tsx
  -> src/lib/styledExport.ts

src/components/PlatformChip.tsx
  -> no project imports

src/components/UrlInput.tsx
  -> lucide-react only (no project imports)

src/pages/Bulk.tsx
  -> src/components/ChipInput.tsx
  -> src/lib/smartSplit.ts
  -> src/lib/qr.ts
  -> src/lib/styledExport.ts
  -> src/lib/bulkNaming.ts
  -> jszip (dynamic import inside handleExport)

src/components/ChipInput.tsx
  -> src/lib/smartSplit.ts

src/pages/History.tsx
  -> src/components/HistoryGrid.tsx
  -> src/lib/history.ts

src/components/HistoryGrid.tsx
  -> src/lib/history.ts (types)
  -> src/lib/qr.ts

src/lib/history.ts
  -> no project imports (uses localStorage directly)

src/lib/qr.ts
  -> src/lib/history.ts (StyleSettings type)
  -> qr-code-styling

src/lib/sanitize.ts
  -> no project imports

src/lib/normalizeUrl.ts
  -> no project imports

src/lib/platforms.ts
  -> no project imports

src/lib/hash.ts
  -> no project imports (uses crypto.subtle)

src/lib/payloads.ts
  -> no project imports

src/lib/smartSplit.ts
  -> src/lib/sanitize.ts
  -> src/lib/normalizeUrl.ts

src/lib/styledExport.ts
  -> jsqr

src/lib/bulkNaming.ts
  -> src/lib/smartSplit.ts (Item type only)

src/lib/diagnostic.ts
  -> qrcode
  -> jsqr
  -> src/lib/styledExport.ts
  -> src/lib/qr.ts

src/pages/Diagnostic.tsx
  -> src/lib/diagnostic.ts
```

Note: `src/pages/Diagnostic.tsx` is not imported by `src/App.tsx`, so the `diagnostic.ts` module and its `qrcode` dependency are not part of the routed application graph.

## Data flow: Generator

1. User types a URL in `UrlInput`. `GeneratorPage` stores `rawInput`.
2. An effect in `GeneratorPage` calls `sanitize(rawInput)`. On success it stores `sanitizedUrl`, `sanitizeWarning` and clears `sanitizeError`.
3. The same effect calls `normalizeUrl(result.url)` and stores the `NormalizeResult`.
4. The same effect calls `classifyPlatform(result.url)` and stores `PlatformInfo`.
5. For non-URL tabs, `getPayloadType(activeType)` returns the `PayloadType`. Its `validate(currentFieldValues)` populates errors, hints and warnings.
6. `getPayload()` produces the final string:
   - URL: `useOriginal ? sanitizedUrl : normalized.canonical || sanitizedUrl`.
   - Other types: validate first; if valid, `payloadType.build(currentFieldValues)`; otherwise an empty string.
7. A 250 ms debounce effect copies the payload into `debouncedPayload`.
8. `QrPreview` creates a `QRCodeStyling` instance through `createQrInstance(debouncedPayload, style)`, appends it to its container, then reads the generated `canvas` after 100 ms and reports both the instance and the canvas to the page.
9. A separate effect computes the history id with `sha256(activeType + payload + styleKey)`. It builds a `HistoryEntry`, calls `addEntry`, updates history state and persists with `saveHistory`.
10. Export:
    - `StyledExportPanel` takes `qrCanvas + debouncedPayload + hostname + platform`, calls `generateStyledExport`, converts the PNG blob back into a canvas, calls `verifyStyledExport`, and only then downloads.
    - `ExportBar` takes the `QRCodeStyling` instance and payload. Its `buildVerifiedTile` gets a fresh PNG, renders `renderTileCanvas`, verifies it, retries once at 110% QR size, and downloads or copies it. Plain PNG and SVG bypass the tile and call `downloadQr`.

## Data flow: Bulk

1. `chips: string[]` is the input of record. It is initialized from `localStorage["qrlink_bulk_chips"]` and persisted after a 400 ms debounce.
2. `allItems` is a `useMemo` over `chips.flatMap(raw => smartSplit(raw, { defaultCountryCode }))`.
3. `processedItems` is a `useMemo` that walks `allItems` and tags each item:
   - `invalid` when `type === 'unknown'` or `payload` is empty.
   - `duplicate` when the same `payload` was already seen; `duplicateOf` points to the first index.
   - `valid` otherwise.
4. `validItems` filters `processedItems` to `valid`.
5. `filenames` is `buildNames(validItems, { style: namingStyle, prefix })`.
6. User actions mutate only `chips`: add, edit (replace one chip with parsed items), delete (remove the owning chip), remove invalid, remove duplicates, clear, undo, paste many, CSV import.
7. Export reads `validItems` and `filenames`, creates a QR per item, optionally renders and verifies a tile, adds the file to a JSZip archive, appends an `indexRows` entry, optionally adds `index.csv`, and downloads the ZIP.
8. Cancellation is a `useRef<boolean>` checked at the top of each item iteration.

## State ownership

| Component / module | State owned | Persisted? | Notes |
| --- | --- | --- | --- |
| `src/pages/Generator.tsx` | `activeType`, `allFieldValues`, `rawInput`, `sanitizedUrl`, `sanitizeError`, `sanitizeWarning`, `normalized`, `useOriginal`, `platform`, `style`, `qrInstance`, `qrCanvas`, `duplicateFlash`, `debouncedPayload`, `history`, `validationErrors`, `validationHints`, `validationWarnings` | `activeType` to `qrlink_last_tab`; `allFieldValues` to `qrlink_field_values`; `style` to `qrlink_settings`; `history` to `qrlink_history` | Owns the URL pipeline and the history write path. `useOriginal` is not persisted. |
| `src/components/QrPreview.tsx` | `rendered` | No | Owns the `QRCodeStyling` instance inside `instanceRef`; reports instance and canvas upward. |
| `src/components/StylePanel.tsx` | None | No | Controlled by Generator's `style` and `onChange`. |
| `src/components/ExportBar.tsx` | `busy`, `copied`, `error`, `transparent` | `transparent` to `qrlink_transparent` | Owns export progress and messages. |
| `src/components/StyledExportPanel.tsx` | `template`, `accent`, `customText`, `showHost`, `showCredit`, `isExporting`, `error`, `success` | No | Export settings reset on reload. |
| `src/components/PayloadTabs.tsx` | `showLeftArrow`, `showRightArrow` | No | Scroll affordances only. |
| `src/components/PayloadForm.tsx` | None | No | Controlled by Generator. |
| `src/components/UrlInput.tsx` | None | No | Controlled by Generator. |
| `src/components/PlatformChip.tsx` | None | No | Pure presentation. |
| `src/components/HistoryGrid.tsx` | `search` | No | Filter is temporary. |
| `src/pages/History.tsx` | `entries` | Written back with `saveHistory` | Reads with `loadHistory` on mount. |
| `src/pages/Bulk.tsx` | `chips`, `defaultCountryCode`, `pasteManyMode`, `pasteManyText`, `namingStyle`, `prefix`, `exportStyle`, `exportFormat`, `includeIndex`, `exporting`, `progress`, `previewIndex`, `previewUrl`, `undoStack`, `undoMessage`, `editingRowIndex`, `editDraft` | `chips` to `qrlink_bulk_chips`; `defaultCountryCode` to `qrlink_default_cc` | Export, naming and undo state are not persisted. |
| `src/components/ChipInput.tsx` | `draft`, `editingIndex`, `editDraft`, `note` | No | Chips themselves are owned by Bulk. |
| `src/lib/history.ts` | None | Reads/writes `qrlink_history` and `qrlink_settings` | Pure helper module. |

## Design decisions visible in the code

1. **Exports are built separately from the preview.** `QrPreview` renders a `QRCodeStyling` instance for display, while `ExportBar` and `styledExport.ts` build their own canvases from a fresh PNG. Reason visible in the code: the tile needs a clean QR canvas to crop and verify, and the plain exports need the raw `qr-code-styling` output.
2. **The styled export is decoded before it is offered.** `verifyStyledExport` exists and both export paths call it. Reason: a styled tile can be visually correct but unscannable.
3. **Verification crops the QR area instead of decoding the whole poster.** `cropToQRWithQuietZone` recomputes the tile geometry and cuts out the QR plus quiet zone, then tries multiple sizes and image treatments. Reason: decoding the full decorated canvas is less reliable.
4. **Multiple decoders and fallbacks.** BarcodeDetector is tried first when available, then jsQR at 800 px, 500 px, grayscale with contrast stretch, and forced black. Reason: browser decoder availability and image quality vary.
5. **A failed tile falls back rather than blocking the user.** In `Bulk.tsx` a failed tile is replaced by the plain QR and the `index.csv` note records `plain (tile failed scan check)`. In the Generator the user is told to use Plain PNG. Reason: the user still needs a working code.
6. **Chips are the single source of truth in Bulk.** All derived lists (`allItems`, `processedItems`, `validItems`, `filenames`) are `useMemo` results from `chips`. Reason visible in the code: every mutation, undo snapshot and persistence write operates on `chips` only.
7. **Deleting a row deletes its chip.** The code maps an item index back to the chip that produced it and removes that chip. Reason: chips are the stored unit, and one chip can yield several items.
8. **History dedupe is a hash of type, payload and style.** `sha256(activeType + payload + styleKey)` is used as `HistoryEntry.id`. Reason: the same code with the same look is treated as one entry and moved to the top instead of duplicated.
9. **Bulk dedupe is payload equality within the current list.** It does not consult history. Reason: bulk operations are about the current batch.
10. **URLs are normalized before encoding by default, with an opt-out.** `normalizeUrl` removes tracking parameters, sorts query keys and canonicalizes the host. `useOriginal` lets the user keep the sanitized original. Reason: cleaner, shorter, more stable codes.
11. **Smart split protects nested links and handles `%20` before schemes.** The negative lookbehinds and the query-parameter guard exist so that a URL inside another URL's query string is not torn apart.
12. **Phone fragments are merged.** `mergePhoneFragments` exists because pasted numbers often contain spaces or groups. It stops at 15 digits.
13. **There are hard caps.** `smartSplit` returns at most 50 items, Bulk stores at most 50 chips, history stores at most 50 entries, and the undo stack keeps 20 snapshots. Reason: bounded memory and predictable export size.
14. **localStorage access is defensive.** Every read/write in `src/lib/history.ts`, Generator, Bulk and ExportBar is wrapped in `try/catch`. Reason: storage can be blocked or full, and the app should still run.
15. **CSV output is escaped.** `escapeCsvCell` prefixes `=`, `+`, `-` and `@` cells and quotes values containing commas, quotes or newlines. Reason: spreadsheet formula injection and correct round-tripping.
16. **The QR library is loaded lazily only for ZIP work.** `Bulk.tsx` imports `jszip` inside `handleExport`. Reason: the JSZip chunk is split out of the main bundle.
17. **The design system is CSS-first.** Tokens and component classes live in `src/index.css`; components mostly use those classes plus inline token variables. Reason: one place controls borders, radii, shadows and colours.
18. **The app uses a static SPA with a rewrite.** `BrowserRouter` is used, and `public/vercel.json` plus `public/_redirects` provide the fallback. Reason: no server is needed, but deep links must still resolve.
