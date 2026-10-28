/**
 * Bulk naming utilities for QR code exports
 */

/**
 * Convert a string to a URL-safe slug
 * - Lowercase
 * - Replace non-alphanumerics with "-"
 * - Collapse repeated dashes
 * - Trim leading/trailing dashes
 * - Max 40 characters
 */
export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

/**
 * Extract host from URL (without www.)
 */
function getHost(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Extract first path segment from URL
 */
function getFirstPathSegment(url: string): string {
  try {
    const u = new URL(url);
    const segments = u.pathname.split('/').filter(Boolean);
    return segments[0] || '';
  } catch {
    return '';
  }
}

/**
 * Extract full path from URL (without leading slash)
 */
function getFullPath(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\//, '');
  } catch {
    return '';
  }
}

export type NamingStyle = 'numbered-site' | 'label' | 'site-path';

export interface NamingOptions {
  style: NamingStyle;
  prefix: string;
}

export interface BulkEntry {
  label?: string;
  url: string;
  canonical: string;
}

// Import Item type from smartSplit
import type { Item } from './smartSplit';

/**
 * Build a filename for a bulk entry or smart split item
 * @param entry - The bulk entry or smart split item
 * @param index - Zero-based index
 * @param total - Total number of entries (for zero-padding)
 * @param opts - Naming options
 * @returns Filename without extension
 */
export function buildName(
  entry: BulkEntry | Item,
  index: number,
  total: number,
  opts: NamingOptions
): string {
  const { style, prefix } = opts;

  // Zero-pad the index (min 2 digits)
  const padWidth = Math.max(2, String(total).length);
  const nn = String(index + 1).padStart(padWidth, '0');

  let name = '';

  // Check if this is a smart split Item (has 'type' property)
  const isSmartItem = 'type' in entry;
  const itemType = isSmartItem ? (entry as Item).type : 'url';
  const payload = isSmartItem ? (entry as Item).payload : (entry as BulkEntry).canonical;
  const label = entry.label;

  if (style === 'label' && label) {
    // Label style: NN-<label-slug>
    name = `${nn}-${slug(label)}`;
  } else if (itemType === 'email') {
    // Email style: NN-email-<local-part>-<domain>
    const emailMatch = payload.match(/^mailto:([^@]+)@(.+)$/);
    if (emailMatch) {
      const localPart = slug(emailMatch[1]);
      const domain = slug(emailMatch[2]);
      name = `${nn}-email-${localPart}-${domain}`;
    } else {
      name = `${nn}-email-${slug(payload.replace('mailto:', ''))}`;
    }
  } else if (itemType === 'phone') {
    // Phone style: NN-phone-<digits>
    const digits = payload.replace(/^tel:\+/, '');
    name = `${nn}-phone-${slug(digits)}`;
  } else if (style === 'site-path') {
    // Site-path style: <host-slug>-<path-slug>
    const hostSlug = slug(getHost(payload));
    const pathSlug = slug(getFullPath(payload));
    name = pathSlug ? `${hostSlug}-${pathSlug}` : hostSlug;
  } else {
    // numbered-site style (default): NN-<host-slug>[-<first-path-segment-slug>]
    const hostSlug = slug(getHost(payload));
    const pathSegment = getFirstPathSegment(payload);
    const pathSlug = pathSegment ? slug(pathSegment) : '';
    name = pathSlug ? `${nn}-${hostSlug}-${pathSlug}` : `${nn}-${hostSlug}`;
  }

  // Add prefix if set
  if (prefix) {
    name = `${slug(prefix)}-${name}`;
  }

  // Truncate to max 80 chars (preserve the number part)
  if (name.length > 80) {
    const numberPart = name.match(/^\d+-/)?.[0] || '';
    const rest = name.slice(numberPart.length);
    name = numberPart + rest.slice(0, 80 - numberPart.length);
  }

  return name;
}

/**
 * Build names for all entries, handling collisions
 * @param entries - Array of bulk entries or smart split items
 * @param opts - Naming options
 * @returns Array of filenames (without extension)
 */
export function buildNames(
  entries: (BulkEntry | Item)[],
  opts: NamingOptions
): string[] {
  const names: string[] = [];
  const usedNames = new Map<string, number>(); // Track usage count

  for (let i = 0; i < entries.length; i++) {
    let name = buildName(entries[i], i, entries.length, opts);

    // Handle collisions (case-insensitive)
    const lowerName = name.toLowerCase();
    const count = usedNames.get(lowerName) || 0;

    if (count > 0) {
      // Append -2, -3, etc.
      name = `${name}-${count + 1}`;
    }

    usedNames.set(lowerName, count + 1);
    names.push(name);
  }

  return names;
}

/**
 * Escape a CSV cell value
 * - Wrap in quotes if contains comma, quote, or newline
 * - Double any quotes
 * - Prefix cells starting with = + - @ with apostrophe
 */
export function escapeCsvCell(value: string): string {
  // Prefix dangerous characters
  if (/^[=+\-@]/.test(value)) {
    value = "'" + value;
  }

  // Check if quoting is needed
  const needsQuoting = value.includes(',') || value.includes('"') || value.includes('\n');

  if (needsQuoting) {
    // Double any quotes and wrap in quotes
    return '"' + value.replace(/"/g, '""') + '"';
  }

  return value;
}

/**
 * Build CSV content from rows
 * @param headers - Column headers
 * @param rows - Array of row arrays
 * @returns CSV string
 */
export function buildCsv(headers: string[], rows: string[][]): string {
  const lines: string[] = [];

  // Header row
  lines.push(headers.map(escapeCsvCell).join(','));

  // Data rows
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(','));
  }

  return lines.join('\n');
}

/**
 * Parse CSV content (simple parser handling quoted values)
 * @param csv - CSV string
 * @returns Array of rows (each row is an array of cells)
 */
export function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let i = 0;

  while (i < csv.length) {
    const char = csv[i];
    const nextChar = csv[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        currentCell += '"';
        i += 2;
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
        i++;
      } else {
        currentCell += char;
        i++;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
        i++;
      } else if (char === ',') {
        // End of field
        currentRow.push(currentCell);
        currentCell = '';
        i++;
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        // End of row
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i += char === '\r' ? 2 : 1;
      } else {
        currentCell += char;
        i++;
      }
    }
  }

  // Handle last cell/row
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}
