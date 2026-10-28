# QRLink

QRLink is a browser-based QR code generator built with React, TypeScript and Vite. It is aimed at people who need a QR code quickly without an account, a backend or a paid service. You can generate codes for URLs, plain text, email, phone, SMS, WhatsApp, WiFi, vCard, location, calendar events and crypto addresses, style them, export them as plain images or designed tiles, and produce a ZIP of many codes at once.

The promise is that your data stays in the browser. The code confirms that no `fetch`, `XMLHttpRequest` or analytics call exists in `src/`. QR generation, history, bulk splitting and export all run locally. The one external request is Google Fonts, loaded by `index.html`:

- `https://fonts.googleapis.com` (stylesheet)
- `https://fonts.gstatic.com` (font files)

Those requests load font files only. They do not receive your URLs, payloads, images, history or generated QR codes. Logo images are read with `FileReader` into data URLs and stored in `localStorage`; they are not uploaded. If you need a strict zero-third-party-request setup, self-host the three fonts and remove the Google Fonts links from `index.html`.

## Features

| Area | Feature | What it does | Main file |
| --- | --- | --- | --- |
| Generator | URL pipeline | Trims, validates, normalizes, classifies and deduplicates URLs before encoding | `src/lib/sanitize.ts`, `src/lib/normalizeUrl.ts`, `src/lib/platforms.ts`, `src/pages/Generator.tsx` |
| Generator | Use original link | Switches between the cleaned canonical URL and the sanitized original | `src/pages/Generator.tsx` |
| Generator | Live preview | Renders the QR with `qr-code-styling` and exposes its canvas for export | `src/components/QrPreview.tsx`, `src/lib/qr.ts` |
| Generator | Style panel | Foreground/background colour, dot style, corner style, error correction, centre logo, 1024/2048 size | `src/components/StylePanel.tsx` |
| Generator | Contrast warning | Warns below 4.5:1 contrast or when colours are inverted | `src/lib/qr.ts` |
| Generator | Duplicate flash | Shows a notice when a generated code already exists in history | `src/pages/Generator.tsx`, `src/lib/history.ts` |
| Input types | 11 payload types | URL, Text, Email, Phone, SMS, WhatsApp, WiFi, vCard, Location, Event, Crypto | `src/lib/payloads.ts`, `src/components/PayloadTabs.tsx`, `src/components/PayloadForm.tsx` |
| Input types | Per-type validation | Required fields, format checks, length and density warnings | `src/lib/payloads.ts` |
| Export | Styled tile PNG | Card, Sticker, Poster and Badge templates rendered on canvas | `src/lib/styledExport.ts`, `src/components/StyledExportPanel.tsx` |
| Export | Verified tile export | The tile is decoded before download; the user gets a warning if it fails | `src/lib/styledExport.ts`, `src/components/ExportBar.tsx` |
| Export | Plain PNG and SVG | Downloads the unstyled QR from `qr-code-styling` | `src/components/ExportBar.tsx`, `src/lib/qr.ts` |
| Export | Copy and Share | Copies a PNG to the clipboard, or uses the Web Share API when available | `src/components/ExportBar.tsx` |
| Export | Transparent background | Toggles a transparent tile background | `src/components/ExportBar.tsx` |
| Bulk | Chip box | Chips are the only stored input; items are derived from them | `src/components/ChipInput.tsx`, `src/pages/Bulk.tsx` |
| Bulk | Smart split | Splits pasted text into URLs, emails and phone numbers | `src/lib/smartSplit.ts` |
| Bulk | Paste many | Full-textarea mode for large pastes | `src/pages/Bulk.tsx` |
| Bulk | CSV import | Reads `.csv` or `.txt` and feeds rows into smart split | `src/lib/bulkNaming.ts`, `src/pages/Bulk.tsx` |
| Bulk | Duplicate and invalid handling | Marks duplicates and invalid items, removes them, supports undo | `src/pages/Bulk.tsx` |
| Bulk | Naming | Numbered, Label and Site-Path filename styles with prefix and collision handling | `src/lib/bulkNaming.ts` |
| Bulk | ZIP export | PNG tile or plain, PNG/SVG/both, optional `index.csv` | `src/pages/Bulk.tsx` |
| Scan/Read | Export scan verification | Decodes the exported tile with BarcodeDetector or jsQR before allowing download | `src/lib/styledExport.ts` |
| Scan/Read | Standalone reader page | Not implemented. There is no camera or file-upload reader page | - |
| Settings/History | Local history | Stores up to 50 entries, searches, reopens, deletes and clears | `src/lib/history.ts`, `src/pages/History.tsx`, `src/components/HistoryGrid.tsx` |
| Settings/History | Style persistence | Restores the last style settings | `src/lib/history.ts` |
| Settings/History | Last tab and field values | Restores the selected payload type and its form values | `src/pages/Generator.tsx` |
| Settings/History | Bulk preferences | Default country code and chips persist | `src/pages/Bulk.tsx` |
| UI | Neo-brutalist design system | Flat fills, 3px borders, hard offset shadows, shared utility classes | `src/index.css` |
| UI | Responsive navigation | Header and mobile nav for Generator, Bulk, History, How It Works, Privacy | `src/components/Layout.tsx` |
| UI | 404 page | Catch-all route | `src/pages/NotFound.tsx` |

## Quick start

There is no `engines` field in `package.json`. The commands in this README were run with Node `v24.19.0` and npm `11.17.0`. Vite 6.4.5 declares Node `^18.0.0 || ^20.0.0 || >=22.0.0`. Vitest 5.0.5 declares Node `^22.12.0 || ^24.0.0 || >=26.0.0`. To satisfy both, use Node 22.12.x, 24.x, or 26 and newer.

```powershell
npm install
npm run dev
```

The dev server is fixed to `http://localhost:3000` by `vite.config.js` (`host: 0.0.0.0`, `port: 3000`, `strictPort: true`).

```powershell
# Production build
npm run build

# Type check
npm run typecheck

# Tests (there is no "test" script in package.json)
npx vitest run
```

There is no lint script in `package.json`. Do not assume `npm run lint` exists.

To preview the built site, run `npx vite preview`. The build output is written to `dist/`.

## How to use

### Generate a QR code

1. Open the Generator at `/`.
2. Choose a tab. URL is selected by default, or the last tab you used is restored.
3. For a URL, paste a link. `https://` is added when no scheme is present. The app sanitizes it, removes known tracking parameters, sorts query parameters, lowercases the host, removes default ports and strips a trailing slash on non-root paths.
4. Review the "Cleaned link" banner. Click "Use original" to encode the sanitized original instead.
5. Adjust the style panel: colours, dot style, corner style, error correction, optional logo (under 200 KB, which auto-sets error correction to H), and size (1024 or 2048 px).
6. Export with the controls below the preview.

### Choose a type

Use the tab row above the form. Each tab renders the fields defined in `src/lib/payloads.ts`. Required fields are marked with `*`. Validation messages appear inline. The QR is shown only when the payload is non-empty and valid.

The available types and their fields:

| Type | Fields |
| --- | --- |
| URL | `url` |
| Text | `text` (max 1000 characters) |
| Email | `to` (required), `subject`, `body` |
| Phone | `number` (required, country code expected) |
| SMS | `number` (required), `message` |
| WhatsApp | `number` (required, digits with country code), `message` |
| WiFi | `ssid` (required), `password`, `security` (`WPA`, `WEP`, `None`), `hidden` |
| vCard | `firstName` and `lastName` (required), `organization`, `title`, `phone`, `email`, `website`, `address` |
| Location | `latitude` and `longitude` (required) |
| Event | `title`, `start`, `end` (required), `location`, `description` |
| Crypto | `coin` (`Bitcoin`, `Ethereum`, `Litecoin`), `address` (required), `amount` |

### Export

Four export paths exist:

| Control | Result |
| --- | --- |
| Download PNG | Renders a 1600x1600 neo-brutalist tile, decodes it to verify it still scans, retries once at a 10% larger QR if needed, then downloads it as `qr-<host>-<yyyymmdd>.png` |
| Plain PNG | Downloads the unstyled QR from `qr-code-styling` as `qr-<host>-<yyyymmdd>.png` |
| SVG (plain) | Downloads the unstyled vector as `qr-<host>-<yyyymmdd>.svg` |
| Copy | Copies a verified tile PNG to the clipboard. If the Clipboard API fails, it downloads the PNG instead and shows a message. If the scan check fails, it shows the verification error and does not download |
| Share | Shown only when `navigator.share` exists. Shares a PNG file when file sharing is supported |
| Transparent background | Makes the tile background transparent instead of cream |

The styled template panel offers Card (1600x1600), Sticker (1600x1600, transparent), Poster (1600x2200) and Badge (2000x1000), five accent colours, an optional host label, and an optional "Made with QRLink" credit on Poster. The Poster/Badge heading is limited to 24 characters. A styled download is blocked if verification fails; the error text tells you to use the plain download.

### Bulk generation

1. Open `/bulk`.
2. Type or paste into the chip box. A chip is committed on comma, semicolon, newline, space (except incomplete phone numbers), Enter, Tab, paste, or blur.
3. "Paste many" switches to a textarea; "Use Chips" parses the textarea back into chips.
4. "Import CSV" accepts `.csv` or `.txt`. If the first cell is `label`, `url` or `payload`, that row is treated as a header. Rows with two or more columns become `label | url`; otherwise the first cell is used.
5. Review the result rows. Each row is marked Valid, Invalid or Duplicate. "Remove invalid", "Remove duplicates", "Clear all" and "Undo" act on chips.
6. Choose a naming style and optional prefix (max 20 characters). A live preview shows the first three filenames.
7. Choose export style (Tile or Plain), format (PNG, SVG or Both), and whether to include `index.csv`.
8. Click "Download N QR Codes (ZIP)". The archive is named `qr-bulk-<yyyymmdd>.zip`. With Both, files are placed in `png/` and `svg/` subfolders.

Smart split rules in plain language, as implemented in `src/lib/smartSplit.ts`:

- Windows and old Mac line endings are normalized to `\n`.
- `%20` immediately before `https://` or `www.` is treated as a separator. Literal whitespace before a scheme is also normalized to one space.
- Breaks are inserted before glued `http://` or `https://` schemes unless the text looks like a query parameter value (`u=`, `url=`, `q=`, `redirect=`, `next=`, `to=`, `link=`) or is preceded by URL punctuation. This is the nested-link protection.
- Breaks are inserted before glued `www.` when the previous character is a letter or digit not preceded by `/` or `.`.
- The text is split on whitespace, commas, semicolons and newlines.
- Leading brackets and quotes and trailing punctuation are stripped. A trailing `/` is kept.
- Phone-like tokens (digits, `+`, `-`, `(`, `)`, `.`) with fewer than 10 digits are merged with following phone-like tokens until they reach 10 digits or 15 digits.
- Each token is classified as email, phone, URL or unknown, in that order.
- The result is capped at 50 items. Bulk also stores at most 50 chips.
- Glued links without a scheme cannot always be separated. When a host contains a TLD followed by more text, the item gets the warning "May be several links joined. Add a space or new line between them."

Deleting a result row deletes the whole chip that produced it, not just that item. Editing a row re-parses the edited text and replaces that chip with the parsed items. The undo stack stores up to 20 chip snapshots.

Naming styles:

| Style | Pattern | Example |
| --- | --- | --- |
| Numbered | `NN-<host>-<first-path-segment>` | `01-example-com-page` |
| Label | `NN-<label-slug>` | Only when the item has a label |
| Site-Path | `<host-slug>-<full-path-slug>` | `example-com-page-sub` |

Number padding is at least two digits and grows with the total count. A prefix is slugged and prepended. Names are capped at 80 characters, and case-insensitive collisions get `-2`, `-3`, and so on. Email items always use `NN-email-<local>-<domain>`; phone items always use `NN-phone-<digits>`.

`index.csv` columns are `index, filename, label, payload, type, note`. The note is blank on success, `plain (tile failed scan check)` when a tile falls back, or `ERROR: ...` when an item fails.

### Read a QR code

There is no reader page in this codebase. No page exposes a camera, file upload or drag-and-drop decoder. The only decoding is the safety check that runs before a styled export is downloaded: `verifyStyledExport` reads the generated canvas and compares the decoded text with the original payload. To read a QR code, use the camera app or a separate reader.

## Tech stack

Versions below are the resolved versions from `package-lock.json` / `node_modules`.

| Library | Version | Used for |
| --- | --- | --- |
| React | 18.3.1 | UI |
| React DOM | 18.3.1 | Browser rendering |
| React Router DOM | 7.18.5 | `BrowserRouter`, routes, navigation state |
| qr-code-styling | 1.9.2 | QR generation for preview and exports |
| jsQR | 1.4.0 | Decoding exported tiles during verification |
| JSZip | 3.10.2 | Bulk ZIP archive, loaded dynamically in `Bulk.tsx` |
| lucide-react | 0.294.0 | Icons |
| qrcode | 1.5.4 | Only used by the unrouted diagnostic module and tests |
| Vitest | 5.0.5 | Test runner (declared as a dependency, not a devDependency) |
| Vite | 6.4.5 | Dev server and build |
| TypeScript | 5.9.3 | Type checking |
| Tailwind CSS | 4.3.3 | Utility classes; the design tokens and components live in `src/index.css` |
| @tailwindcss/vite | 4.3.3 | Tailwind Vite plugin |
| @vitejs/plugin-react | 4.7.0 | React plugin for Vite |

`package.json` also declares `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@supabase/supabase-js`, `canvas-confetti`, `date-fns`, `framer-motion`, `recharts` and `uuid`, plus `@types/canvas-confetti` and `@types/uuid`. Nothing in `src/` imports them.

## Project structure

```
src/
  main.tsx                 entry point; mounts App into #root
  App.tsx                  route table
  index.css                Tailwind import, design tokens, shared classes
  components/
    ChipInput.tsx          chip box, commit/edit/delete behaviour
    dropdown.tsx           custom select (note the lowercase filename)
    ExportBar.tsx          plain PNG, SVG, copy, share, verified tile PNG
    HistoryGrid.tsx        history search, cards, reopen/delete
    Layout.tsx             header, desktop nav, mobile nav, footer
    PayloadForm.tsx        renders fields for the active payload type
    PayloadTabs.tsx        horizontally scrollable type tabs
    PlatformChip.tsx       platform icon and label
    QrPreview.tsx          renders the QR and reports its instance and canvas
    StyledExportPanel.tsx  Card/Sticker/Poster/Badge controls
    StylePanel.tsx         colours, dot/corner style, EC, logo, size
    UrlInput.tsx           URL field and validation status
  lib/
    bulkNaming.ts          slugs, filenames, CSV build/parse/escape
    diagnostic.ts          console diagnostic for tile decoding
    hash.ts                SHA-256 via Web Crypto
    history.ts             history/settings types and localStorage helpers
    normalizeUrl.ts        canonical URL rules
    payloads.ts            11 payload type definitions
    pipeline.test.ts       sanitize/normalize/payload tests
    platforms.ts           host-to-platform classification
    qr.ts                  QR instance, downloads, clipboard, contrast
    sanitize.ts            scheme/length validation
    smartSplit.ts          text-to-item splitting and classification
    styledExport.ts        tile renderer, templates, scan verification
    styledExport.test.ts   template and verification tests
    tileExport.test.ts     tile geometry and decode tests
  pages/
    Bulk.tsx               bulk page
    Diagnostic.tsx         diagnostic page (not routed)
    Generator.tsx          generator page
    History.tsx            history page
    HowItWorks.tsx         static explanation page
    NotFound.tsx           404 page
    Privacy.tsx            static privacy page
```

Routes in `src/App.tsx`: `/` (Generator), `/bulk`, `/history`, `/how-it-works`, `/privacy`, and `*` (NotFound). `src/pages/Diagnostic.tsx` exists but is not imported by `App.tsx`, so it is not reachable by URL.

## How it works

### a. URL and payload pipeline

Files: `src/pages/Generator.tsx`, `src/lib/sanitize.ts`, `src/lib/normalizeUrl.ts`, `src/lib/platforms.ts`, `src/lib/payloads.ts`, `src/lib/qr.ts`.

1. `GeneratorPage` holds `rawInput` for the URL tab.
2. An effect calls `sanitize(rawInput)`. It trims, removes newlines, rejects empty input and input over 1000 characters, blocks `javascript:`, `data:`, `file:` and `vbscript:`, prepends `https://` when no scheme exists, parses with `new URL`, and allows only `http:`, `https:`, `mailto:` and `tel:`. URLs over 300 characters get a warning.
3. `normalizeUrl(url)` lowercases scheme and host, strips default ports, removes tracking parameters and host-specific parameters, sorts the remaining query parameters, strips a trailing slash on non-root paths, keeps the fragment, and builds the canonical URL. `displayUrl` maps `twitter.com` to `x.com`.
4. `classifyPlatform(url)` matches the hostname against a fixed host list and returns a platform name, icon key and optional note, or `Generic`.
5. `getPayload()` returns the canonical URL unless "Use original" is on, in which case it returns the sanitized URL.
6. The payload is debounced by 250 ms into `debouncedPayload`.
7. `QrPreview` calls `createQrInstance(debouncedPayload, style)` from `src/lib/qr.ts`, appends the SVG to the DOM, and reports the instance and the generated `canvas` to the page.
8. History is written with an id of `sha256(activeType + payload + styleKey)`.

### b. Payload types and exact formats

All definitions are in `src/lib/payloads.ts`. The registry order is URL, Text, Email, Phone, SMS, WhatsApp, WiFi, vCard, Location, Event, Crypto.

| Type | Built payload |
| --- | --- |
| URL | The URL string itself |
| Text | The raw text |
| Email | `mailto:<to>` plus `?subject=<encodeURIComponent(subject)>&body=<encodeURIComponent(body)>` for non-empty values |
| Phone | `tel:+<digits>` after removing spaces, dashes and parentheses; a leading `+` is added when absent |
| SMS | `SMSTO:+<digits>:<message>`; the message is not URL-encoded |
| WhatsApp | `https://wa.me/<digits>` plus `?text=<encodeURIComponent(message)>` when a message is present |
| WiFi | `WIFI:T:<WPA|WEP|nopass>;S:<ssid>;[P:<password>;]H:<true|false>;;`; `P:` is omitted for `None` or an empty password; `\`, `;`, `,`, `:` and `"` are escaped with a backslash |
| vCard | `BEGIN:VCARD`, `VERSION:3.0`, `N:<last>;<first>`, `FN:<first> <last>`, optional `ORG`, `TITLE`, `TEL;TYPE=CELL`, `EMAIL`, `URL`, `ADR:;;<address>;;;;`, `END:VCARD`, joined with CRLF; `,`, `;` and `\` are escaped and newlines become `\n` |
| Location | `geo:<latitude>,<longitude>` |
| Event | `BEGIN:VCALENDAR`, `VERSION:2.0`, `PRODID:-//QRLink//EN`, `BEGIN:VEVENT`, `DTSTART:<UTC>`, `DTEND:<UTC>`, `DTSTAMP:<UTC now>`, `UID:<Date.now()>@qrlink`, `SUMMARY:<title>`, optional `LOCATION` and `DESCRIPTION`, `END:VEVENT`, `END:VCALENDAR`, joined with CRLF; dates use `YYYYMMDDTHHMMSSZ` |
| Crypto | `<bitcoin|ethereum|litecoin>:<address>`; Bitcoin and Litecoin append `?amount=<amount>` when an amount is present; Ethereum ignores the amount |

Validation lives beside each type. URL and Text block the same dangerous schemes. Phone and WhatsApp require 7 to 15 digits. Email uses a simple `local@domain.tld` check. Location requires latitude -90 to 90 and longitude -180 to 180. Event requires an end after the start. Crypto checks address shapes per coin. Text over 300 characters, vCard payloads over 400 characters, and every crypto address get warnings.

### c. Styled export and scan verification

Files: `src/lib/styledExport.ts`, `src/components/ExportBar.tsx`, `src/components/StyledExportPanel.tsx`.

`renderTileCanvas(qr, S = 1600, transparent = false)` geometry:

- Canvas is `S x S`.
- Background is `#fdf3df` unless `transparent` is true.
- Tile size `T = 0.76 * S`.
- Shadow offset `off = 0.03 * S`, filled `#111` with no stroke.
- Border width `bw = 0.009 * S`.
- Corner radius `r = 0.07 * T`.
- Tile origin `x = (S - (T + off)) / 2`, `y = x`, so tile and shadow are centred together.
- Tile fill is `#ffffff`, border is `#111`.
- QR padding `P = 0.09 * T`, QR size `Q = T - 2 * P`.
- The QR is cropped to the bounding box of non-white, non-transparent pixels by `contentBox`, then drawn into the padded area with `imageSmoothingEnabled = false`.

`verifyStyledExport(canvas, expectedPayload)` tries, in order:

1. `BarcodeDetector` with `formats: ['qr_code']` when the API exists in `window`.
2. `cropToQRWithQuietZone`, resized to 800 px, decoded with jsQR (`inversionAttempts: 'attemptBoth'`).
3. The same crop resized to 500 px.
4. The 800 px crop converted to grayscale with contrast stretch.
5. The 800 px crop forced to black/white by brightness threshold.

Each decoder result is compared with strict equality to `expectedPayload`. On failure the function returns `{ verified: false, method: 'none' }`. The Generator's ExportBar then throws the message "This style may not scan. Use 'Download plain PNG'." and shows it. Before giving up, `buildVerifiedTile` retries once by redrawing the QR 10% larger. The StyledExportPanel shows "Styled export failed the scan check. Use the plain download." and does not download.

The four templates are drawn by `generateStyledExport`: Card 1600x1600, Sticker 1600x1600 with transparent background and a thick border, Poster 1600x2200, Badge 2000x1000. Accent colours are orange `#ff6b2b`, pink `#f472b6`, lime `#c6f432`, teal `#2dd4bf` and purple `#a78bfa`.

### d. Smart split

File: `src/lib/smartSplit.ts`.

`Item` fields: `raw` (the token as split), `type` (`url`, `email`, `phone` or `unknown`), `payload` (final encoded value), `display` (human-readable value), `label` (optional, never set by `smartSplit`), `error` (optional), `warning` (optional).

`smartSplit(text, { defaultCountryCode })` runs these steps:

1. Normalize `\r\n` and `\r` to `\n`.
2. `fixPercent20Bug`: replace `%20https://`, `%20http://` and `%20www.` with a leading space; normalize whitespace before `http://`/`https://` to one space.
3. `insertSchemeBreaks`: add a space before glued schemes and `www.` while protecting nested links.
4. Split on `/[\s,;\n]+/`.
5. `stripPunctuation`: removes leading bracket and quote characters, and trailing punctuation except a trailing slash.
6. `mergePhoneFragments`: merge phone-like tokens that have fewer than 10 digits with following phone-like tokens, up to 15 total digits.
7. `classify` each token.
8. Return the first 50 items.

`classify` order and rules:

1. Email: `^[^\s@]+@[^\s@]+\.[a-z]{2,}$` and no `://`; payload is `mailto:<address>`, type `email`.
2. Phone: after removing spaces, dashes, parentheses and dots, match `^\+?\d{7,15}$`. A leading `+` is kept; `00` becomes `+`; a leading `0` uses `defaultCountryCode` (for example `+234` becomes `+234` plus the number without its leading zero); 10 to 15 bare digits get a `+`. Otherwise type `unknown` with error "Add a country code (e.g. +234)".
3. URL with a scheme: only `http` and `https` are accepted. `javascript`, `data`, `file` and `vbscript` return "Blocked link type"; other schemes return "Only http and https links are supported". `%20` in the host or before the scheme produces the warning "Space inside link" after sanitize and normalize.
4. `www.` prefix: prepend `https://`, then sanitize and normalize.
5. Bare domain: match a host plus optional port and path, and require the TLD to be in the fixed `COMMON_TLDS` set. If a host part before the final TLD is itself a TLD and is followed by more than two characters, add the glued-link warning.
6. Anything else: type `unknown`, error "Not recognised".

### e. Bulk page

File: `src/pages/Bulk.tsx`, with `src/components/ChipInput.tsx` and `src/lib/bulkNaming.ts`.

State and derivation:

1. `chips: string[]` is the single source of truth. It is loaded from `qrlink_bulk_chips`, capped at `MAX_CHIPS = 50`, and saved after a 400 ms debounce.
2. `allItems` is derived by `chips.flatMap(raw => smartSplit(raw, { defaultCountryCode }))`.
3. `processedItems` adds `status` (`valid`, `invalid`, `duplicate`) and `originalIndex`. Duplicates are detected by exact `payload` equality against the first occurrence.
4. `validItems` keeps only `valid`. `uniqueCount` is its length.
5. `filenames` is derived from `validItems` with `buildNames`.
6. Deleting a row finds the chip that owns that item and removes the whole chip. Editing replaces that chip with the smart-split result of the edited text.
7. Undo keeps up to 20 snapshots of `chips` and restores the last one.
8. "Remove invalid" keeps chips that contain at least one valid item. "Remove duplicates" keeps chips that contribute at least one new payload. "Clear all" asks for confirmation.

ZIP export steps:

1. Guard on a non-empty `validItems`.
2. Dynamically import `jszip`, create a ZIP, and reset progress and the cancel flag.
3. For each valid item, create a 1024 px black-on-white square QR with error correction M.
4. If the style is Tile and the format includes PNG, render a 1600 px tile, run `verifyStyledExport`, and use the tile only when verified; otherwise use the plain QR PNG and record the fallback note.
5. If the style is Plain, or no tile blob was produced, use the plain PNG.
6. For SVG or Both, add the plain SVG.
7. With Both, use `png/` and `svg/` folders. Otherwise files sit at the ZIP root.
8. Append a row to `indexRows` for every valid item, including per-item errors caught inside the loop.
9. When "Include index.csv" is on, add `index.csv` built with headers `index, filename, label, payload, type, note`.
10. Generate a DEFLATE blob and download `qr-bulk-<yyyymmdd>.zip`.
11. If any item failed, alert the count and tell the user to check `index.csv`.

The export loop checks `cancelRef` before each item, yields with `setTimeout(r, 0)`, and shows "Building X of Y".

### f. Scan and read

There is no scan or read page. The only decoding path is `verifyStyledExport` in `src/lib/styledExport.ts`, described in section c. It runs on the generated tile canvas, not on a camera feed or an uploaded file. `src/lib/diagnostic.ts` contains a console-based diagnostic that generates QR codes with `qrcode` and decodes them with jsQR and BarcodeDetector, but its page is not routed.

Link safety checks that do exist:

- `sanitize` blocks `javascript:`, `data:`, `file:` and `vbscript:` and allows only `http`, `https`, `mailto` and `tel`.
- `smartSplit` blocks the same dangerous schemes and allows only `http` and `https` for URL items.
- URL and Text payload types block dangerous schemes.
- No link is opened automatically. Reopening history navigates inside the app; it does not open the stored URL.

### g. History and settings

`src/lib/history.ts` defines `HistoryEntry` as `{ id, url, displayUrl, platform, createdAt, style, type?, fieldValues? }` and `StyleSettings` as `{ foreground, background, dotStyle, cornerStyle, logo, size, errorCorrection }`. Defaults are black on white, rounded dots, rounded corners, no logo, 1024 px, error correction M.

| localStorage key | Shape | Read in | Written in |
| --- | --- | --- | --- |
| `qrlink_history` | JSON array of `HistoryEntry`, max 50 | `loadHistory` in `src/lib/history.ts` | `saveHistory` from Generator and History |
| `qrlink_settings` | JSON `StyleSettings` | `loadSettings` in `src/lib/history.ts` | `saveSettings` in Generator when style changes |
| `qrlink_last_tab` | payload type id string | `loadLastTab` in `src/pages/Generator.tsx` | `saveLastTab` in Generator when the tab changes |
| `qrlink_field_values` | JSON object: type id to field-value object | `loadFieldValues` in `src/pages/Generator.tsx` | `saveFieldValues` in Generator when values change |
| `qrlink_bulk_chips` | JSON string array, max 50 | `BulkPage` initial state | `BulkPage` effect, debounced 400 ms |
| `qrlink_default_cc` | country-code string, default `+234` | `BulkPage` initial state | `BulkPage` effect |
| `qrlink_transparent` | `"true"` or `"false"` string | `ExportBar` initial state | `ExportBar` effect |

Generator also removes the legacy keys `qrlink_view_3d` and `qrlink_tree_season` on mount. All localStorage access is wrapped in `try/catch`.

The history dedupe key is `sha256(activeType + payload + JSON.stringify({ fg, bg, dot, corner, logo: Boolean(logo) }))`. Size and error correction are not part of the key. When the same id is added again, `addEntry` moves the existing entry to the top and reports `duplicate: true`, which triggers the "Already in history - moved to top" notice.

Bulk duplicate detection is different: it compares the derived `payload` values within the current chip list only, not against history.

## Design system

Tokens are declared in `@theme` in `src/index.css`:

| Token | Value |
| --- | --- |
| `--color-bg` | `#fdf3df` (cream) |
| `--color-paper` | `#fffef9` |
| `--color-ink` | `#111111` |
| `--color-lime` | `#c6f432` |
| `--color-orange` | `#ff6b2b` |
| `--color-teal` | `#2dd4bf` |
| `--color-purple` | `#a78bfa` |
| `--color-pink` | `#f472b6` |
| `--color-border-width` | `3px` |
| `--color-shadow-chip` | `3px 3px 0 #111` |
| `--color-shadow-btn` | `4px 4px 0 #111` |
| `--color-shadow-card` | `6px 6px 0 #111` |
| `--color-shadow-panel` | `8px 8px 0 #111` |

Fonts are loaded from Google Fonts in `index.html`: Bricolage Grotesque (headings, labels, buttons), DM Sans (body), JetBrains Mono (technical values, inputs, tags).

Reusable classes:

| Class | Purpose |
| --- | --- |
| `nb-box` | Paper card, 3px border, 16px radius, 6px hard shadow |
| `nb-box-lg` | Larger card, 24px radius, 8px shadow |
| `nb-box-sm` | Small card, 12px radius, 4px shadow |
| `nb-tag` | Small icon chip with 3px border and 3px shadow |
| `nb-badge` | Uppercase mono pill with 2px border |
| `nb-hl` | Lime highlight block with border |
| `nb-btn-primary` | Orange primary button, 4px shadow, press-down motion |
| `nb-btn-secondary` | Paper secondary button, 4px shadow, press-down motion |
| `nb-input` | Paper input with 3px border and 4px shadow; deeper shadow on focus |
| `nb-segment` | Joined segmented control with dividers |
| `nb-active` | Lime active state for a segment button |
| `nb-swatch` | Colour swatch with border |
| `nb-dot-grid` | Fixed dot-grid page texture |
| `nb-history-card` | History card with alternating hover tilt |
| `nb-bob`, `nb-bob-delay`, `nb-bob-delay-2` | Floating animation used on the decorative hero cards |
| `nb-h1`, `nb-h2`, `nb-h3`, `nb-body`, `nb-label`, `nb-mono` | Typography |

Visual rules visible in the code:

- Flat colour fills.
- 3px black borders on cards, buttons, inputs and tags.
- Hard offset shadows with no blur radius.
- No decorative gradients. The only gradient is the radial dot pattern in `nb-dot-grid`.
- No blur filters.
- Shadows shrink or disappear on hover/press to simulate a physical button.
- Focus is a 3px black outline with 3px offset.
- Touch targets use `min-height: 44px`; on coarse pointers it becomes 48px.
- Motion is disabled under `prefers-reduced-motion: reduce`.

To add a page in this style:

1. Create a component under `src/pages/`.
2. Wrap content in a container such as `max-w-3xl mx-auto px-4 sm:px-6 py-8`.
3. Use `nb-h2` for the page heading and `nb-body` for text.
4. Put sections in `nb-box` or `nb-box-lg`.
5. Use `nb-btn-primary` for the main action and `nb-btn-secondary` for secondary actions.
6. Use `nb-input`, `nb-segment` and `nb-label` for controls.
7. Add the route in `src/App.tsx` and a nav entry in `src/components/Layout.tsx` if it belongs in the header.

## Making changes

### Add a new QR content type

1. Define the type in `src/lib/payloads.ts` using the `PayloadType` interface (`id`, `label`, `fields`, `validate`, `build`).
2. Add it to the `payloadTypes` array in the same file. The tab row and form are generated from this array.
3. Confirm the field types you use are supported by `src/components/PayloadForm.tsx`: `text`, `textarea`, `email`, `tel`, `url`, `number`, `datetime-local`, `select`, `checkbox`.
4. Add tests in `src/lib/pipeline.test.ts` for validation and exact payload output.
5. If the type has a special input widget, add it to `PayloadForm.tsx` and test it manually.

### Add a platform/logo or platform detection entry

1. Add the host list and icon key to `PLATFORMS` in `src/lib/platforms.ts`.
2. Add the SVG path to `ICON_PATHS` in `src/components/PlatformChip.tsx`.
3. Map the icon key to a CSS class in `PLATFORM_CLASSES` in `PlatformChip.tsx`, and define that class in `src/index.css` under "PLATFORM ACCENT COLORS".
4. Add or update tests for classification. There is currently no platform test file.

### Add an export template or change the tile design

- Tile: edit `renderTileCanvas` in `src/lib/styledExport.ts`. Keep `cropToQRWithQuietZone` in sync, because it recalculates the same geometry. Update `src/lib/tileExport.test.ts` for geometry and background, and add a decode test.
- Styled template: add a value to `StyledTemplate`, add a `case` in `generateStyledExport`, implement a render function, and add a button in `src/components/StyledExportPanel.tsx`. Add a test in `src/lib/styledExport.test.ts`.
- Keep the verification path in `verifyStyledExport` unchanged unless you also update its tests. The invariant is that an exported tile must decode to the original payload.

### Change naming styles or `index.csv` columns

- Naming: edit `NamingStyle`, `buildName` and `buildNames` in `src/lib/bulkNaming.ts`. Update the segment buttons in `src/pages/Bulk.tsx`. Add tests for names and collisions. There is currently no `bulkNaming` test file.
- CSV columns: edit the headers in `handleExport` in `src/pages/Bulk.tsx` and the `indexRows` array in the same function. Test that `escapeCsvCell` protects cells beginning with `=`, `+`, `-` and `@`, and that quoted values round-trip through `parseCsv`.

### Add a page and route

1. Add the component file under `src/pages/`.
2. Import it in `src/App.tsx` and add a `<Route>`.
3. Add an entry to `navItems` in `src/components/Layout.tsx` so it appears in desktop and mobile navigation.
4. Follow the design system classes above.
5. SPA hosting must rewrite unknown paths to `index.html` (see Deployment).

### Change colours or fonts

- Colours: edit the `@theme` block in `src/index.css`. Also update hard-coded colours in canvas code: `src/lib/styledExport.ts` (`#fdf3df`, `#ffffff`, `#111`, `#fffef9`, `#c6f432`, `#2dd4bf`, accent hex values), `src/lib/diagnostic.ts`, and inline styles in components if you want a complete change.
- Fonts: replace the Google Fonts `<link>` in `index.html`. The font families are also referenced by name in `src/index.css`, `src/lib/styledExport.ts` and several components (for example `src/components/Layout.tsx`, `src/components/PayloadForm.tsx`, `src/components/ChipInput.tsx`, `src/components/StylePanel.tsx`, `src/components/UrlInput.tsx`, `src/pages/Bulk.tsx`).

### Add a smart-split rule and its test

1. Add the rule as a helper in `src/lib/smartSplit.ts` and call it in `smartSplit` in the correct order (before tokenization for separators, after tokenization for classification).
2. Keep the 50-item cap and the existing item shape.
3. Add tests. There is no `smartSplit` test file today; create a new test file in `src/lib/` and import `smartSplit` from `./smartSplit`.
4. Test these invariants: nested links are not split, `%20` before a scheme splits, phone fragments merge, glued domains get a warning, dangerous schemes are blocked.

## Testing

Run all tests:

```powershell
npx vitest run
```

There is no `npm test` script. Tests run in the default Vitest Node environment; no jsdom or happy-dom configuration exists. DOM-dependent tests therefore fail with `ReferenceError: document is not defined`.

Test files and coverage:

| File | Tests | Covers |
| --- | --- | --- |
| `src/lib/pipeline.test.ts` | 53 | `sanitize`, `normalizeUrl`, SHA-256 dedupe, and the phone, WiFi, email, SMS, WhatsApp, vCard, event, location, text and URL payload types |
| `src/lib/tileExport.test.ts` | 11 | `renderTileCanvas` size, cream/transparent background, white tile, black border, shadow, QR placement, and jsQR decoding of real QR codes |
| `src/lib/styledExport.test.ts` | 7 | The four templates, accent colours, custom text, and the boolean result of `verifyStyledExport` |

To add a test, create a file named `*.test.ts` in `src/lib/` and run `npx vitest run`. If the test needs `document`, add a DOM environment to Vitest first (for example a `vitest.config` with `environment: 'jsdom'` and install `jsdom`). Do not change source code just to make a DOM test pass in Node.

Key invariants to protect:

- A verified styled export must decode to exactly the original payload.
- Plain PNG and SVG exports must remain the unstyled `qr-code-styling` output.
- No network request should be introduced for QR data or user payloads.
- Invalid and duplicate bulk items must never be exported; only `validItems` go into the ZIP.
- `index.csv` must list every exported valid item, including per-item errors, and must escape CSV cells.
- Deleting an item must remove the whole owning chip, not leave orphan state.
- The smart-split cap is 50 items, and the chip cap is 50.

## Browser and device support / known limitations

| Area | Limit |
| --- | --- |
| Camera reader | No camera reader exists. No `getUserMedia` call is present. Use the phone camera or another reader to scan codes. |
| Clipboard | `navigator.clipboard.write` with `ClipboardItem` is required for Copy. This is not available in every browser and usually requires HTTPS. `ExportBar` falls back to downloading the PNG. |
| Share | The Share button is shown only when `navigator.share` exists. File sharing requires `navigator.canShare({ files })`. |
| Decoding | `BarcodeDetector` is optional. jsQR is the fallback for verification. |
| Storage | `localStorage` is required for history, settings, chips and preferences. If it is blocked, the app still works but does not persist. |
| URL length | `sanitize` rejects URLs over 1000 characters and warns over 300. Text is limited to 1000 characters. |
| vCard density | A vCard payload over 400 characters gets a "Dense code" warning. |
| Glued links | Links joined without a separator cannot always be split. A TLD-shaped part before the final TLD produces a warning. |
| Hosting | Routes are client-side. Hosting must rewrite unknown paths to `index.html` or deep links return 404. |
| Type checking | `npm run typecheck` currently fails with four errors in `src/lib/qr.ts` about `Blob | Buffer` from `qr-code-styling`. The build still succeeds. |
| Case-sensitive imports | `src/components/PayloadForm.tsx` imports `./Dropdown`, but the file is `src/components/dropdown.tsx`. Windows resolves this; case-sensitive filesystems may not. |

## Deployment

The production build is written to `dist/` by `vite build`.

`public/vercel.json` and `public/_redirects` already exist and are copied into `dist/` by Vite. Their contents are the SPA fallback:

Vercel (`vercel.json`):

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Netlify (`_redirects`):

```
/*    /index.html   200
```

Any static host needs the same rewrite: serve `index.html` for paths such as `/bulk`, `/history`, `/how-it-works` and `/privacy`.

Pre-launch checklist:

- Run `npm run build` and deploy `dist/`.
- Open `/bulk`, `/history`, `/how-it-works`, `/privacy` directly and confirm the SPA fallback works.
- Scan every export type with a real phone: plain PNG, styled tile PNG, SVG, and several bulk ZIP files.
- Confirm the page title and description in `index.html` are present. Open Graph and Twitter tags are not present in the file.
- Confirm `public/favicon.svg` is served. There is no `sitemap.xml` in the repository.
- Serve over HTTPS so the Clipboard and Share APIs work.
- If you need zero third-party requests, self-host the Google Fonts and remove the external links from `index.html`.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `rg` or `grep` is not recognised in PowerShell | The tools are not installed or not on PATH | Use PowerShell: `Get-ChildItem -Recurse -File src | Select-String -Pattern "search text"` |
| Styled export says it failed the scan check | `verifyStyledExport` could not decode the tile with BarcodeDetector or any jsQR fallback | Use "Plain PNG", increase contrast, use square dots/corners, avoid very light colours, or reduce logo size |
| Copy does nothing or downloads instead | `navigator.clipboard.write` or `ClipboardItem` is unavailable, the page is not a secure context, or the tile failed verification | Use the downloaded PNG; serve over HTTPS; use a current browser |
| Camera cannot scan through QRLink over HTTP | There is no camera reader in this app | Use the phone camera app or a separate reader. This is not an HTTP/HTTPS issue in this codebase |
| Chips do not commit on a mobile keyboard | The chip input commits from typed text, not key events. Incomplete phone numbers (fewer than 10 digits) intentionally do not commit on space | Type a comma, semicolon or newline, press Enter/Tab, tap away to blur, or use the Add button |
| History, settings or chips disappear after reload | `localStorage` is blocked, full, or being cleared | Allow site storage, leave private browsing, and avoid clearing site data. The app silently ignores storage errors |
| `npm run typecheck` fails | Four `Blob | Buffer` compatibility errors in `src/lib/qr.ts` with the installed `qr-code-styling` types | This is a known current failure; do not treat it as caused by an unrelated change |
| Import fails on Linux/macOS | `./Dropdown` does not match `dropdown.tsx` on a case-sensitive filesystem | Rename the import or the file consistently |
| Tests fail with `document is not defined` | Vitest runs in the Node environment and no DOM environment is configured | Add a DOM test environment before running DOM-dependent tests |

## Privacy and security notes

- No payload data is sent to a server. QR generation, splitting, decoding and ZIP creation happen in the browser.
- Google Fonts is the only external request during page load. The browser fetches its stylesheet and font files; what Google does with those requests is outside this repository, and your QR payloads are not part of them.
- History, style settings, last tab, field values, bulk chips, country code and the transparent-background preference are stored in `localStorage` on your device.
- Logo images are read locally as data URLs. They are stored in `qrlink_settings` through the style object if a logo is selected.
- `sanitize` blocks `javascript:`, `data:`, `file:` and `vbscript:` and allows only `http`, `https`, `mailto` and `tel`.
- `smartSplit` blocks dangerous URL schemes and allows only `http` and `https` URL items.
- URL and Text payload types block dangerous schemes.
- The app does not auto-open links from history or scan results. There is no scan result page.
- CSV injection protection: `escapeCsvCell` prefixes a leading `'` to any cell starting with `=`, `+`, `-` or `@`, doubles quotes, and quotes cells containing commas, quotes or newlines.
- Verification is a safety check, not a guarantee. Always test a printed code with a real phone.

## Status

Checked on 2026-10-28 with Node `v24.19.0` and npm `11.17.0`.

| Command | Result |
| --- | --- |
| `npm run build` | Pass. Vite 6.4.5 built 1407 modules in about 16 s. Output: `dist/index.html` 1.60 kB, CSS 37.55 kB (7.59 kB gzip), main JS 491.51 kB (158.07 kB gzip), lazy JSZip chunk 97.69 kB (30.38 kB gzip). |
| `npx vitest run` | Fail. 3 test files, 71 tests total: 51 passed, 20 failed. |
| `npm run typecheck` | Fail. 4 TypeScript errors in `src/lib/qr.ts` (lines 48, 52, 62, 77) about `qr-code-styling` returning `Blob | Buffer`. |

Test failure breakdown:

- `src/lib/tileExport.test.ts`: 11 failed, all `ReferenceError: document is not defined` because no DOM environment is configured.
- `src/lib/styledExport.test.ts`: 7 failed, all `ReferenceError: document is not defined` for the same reason.
- `src/lib/pipeline.test.ts`: 53 tests, 2 failed:
  - `sanitize > rejects  scheme`: the input `text/html,<h1>hi</h1>` is treated as a valid URL after `https://` is prepended.
  - `vCard payload > warns when payload exceeds 400 chars`: a 300-character address does not push the built payload over 400 characters, so no warning is returned.

No source, config, dependency or test files were changed to produce these results.

## Open questions

- The requested Scan/Read page does not exist. Only export verification decodes QR codes. Confirm whether a reader page is planned.
- `src/pages/Diagnostic.tsx` is not in the route table. Confirm whether it should be exposed or removed.
- `src/lib/diagnostic.ts` and the tests import `qrcode`, but the production generator uses `qr-code-styling`. Confirm whether both QR libraries are intended.
- The Label naming style depends on `Item.label`, but `smartSplit` never sets it. Confirm whether CSV labels were meant to populate it.
- History reopen passes `prefillUrl`, but Generator does not read it. URL history entries therefore do not restore the input. Confirm intended behaviour.
- `src/components/PayloadForm.tsx` imports `./Dropdown` while the file is `dropdown.tsx`. Confirm whether to rename.
- Vitest has no DOM environment even though two test files require `document`. Confirm whether to add jsdom or happy-dom.
- Several declared dependencies are unused. Confirm whether they should be removed.
- The `generatePng`, `generateSvg` and `copyToClipboard` exports in `src/lib/qr.ts` are not used by the current UI. Confirm whether to keep them.
- There is no `sitemap.xml` and no Open Graph or Twitter metadata. Confirm whether these are required for launch.
- There is no license file in the repository.

## License

No license file found.
