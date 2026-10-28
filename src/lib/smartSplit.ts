import { sanitize } from './sanitize';
import { normalizeUrl } from './normalizeUrl';

export type ItemType = 'url' | 'email' | 'phone' | 'unknown';

export interface Item {
  raw: string;
  type: ItemType;
  payload: string;
  display: string;
  label?: string;
  error?: string;
  warning?: string;
}

// Common TLDs for URL detection
const COMMON_TLDS = new Set([
  'com', 'org', 'net', 'io', 'co', 'app', 'dev', 'ai', 'me', 'tv',
  'edu', 'gov', 'info', 'biz', 'xyz', 'online', 'site', 'store', 'tech',
  'blog', 'shop', 'page', 'link', 'ly', 'gl', 'be', 'ng', 'ke', 'gh',
  'za', 'uk', 'us', 'ca', 'au', 'in', 'de', 'fr', 'es', 'it', 'nl',
  'br', 'jp', 'cn', 'ru', 'ae', 'sa', 'eg', 'ma', 'tz', 'ug', 'rw',
  'ie', 'nz', 'sg', 'ph', 'id', 'my', 'pk', 'bd'
]);

export interface SmartSplitOptions {
  defaultCountryCode: string;
}

/**
 * Insert breaks before schemes (https://, http://, www.)
 * Respects nested links and percent-encoded schemes
 */
function insertSchemeBreaks(text: string): string {
  let result = text;

  // Insert break before https:// and http://
  // But not when preceded by query param indicators or percent-encoded
  result = result.replace(/(?<!^)(?<!%3D)(?<!%2F)(?<!%3A)(?<![=/?:&#@%+([{"'\s])(https?:\/\/)/gi, (match, scheme, offset) => {
    // Check if preceded by query param patterns
    const before = result.slice(Math.max(0, offset - 10), offset);
    if (/(?:u=|url=|q=|redirect=|next=|to=|link=)$/.test(before)) {
      return match; // Don't split
    }
    // Check if previous char is problematic
    if (offset > 0) {
      const prevChar = result[offset - 1];
      if (/[=/?:&#@%+([{"'\s]/.test(prevChar)) {
        return match; // Don't split
      }
      // Check if previous 3 chars are letter, digit, or dot
      if (offset >= 3) {
        const prev3 = result.slice(offset - 3, offset);
        if (/[a-z0-9.]/i.test(prev3[2])) {
          return ' ' + match; // Insert break
        }
      }
    }
    return match;
  });

  // Insert break before www.
  result = result.replace(/(?<!^)(?<![/\.])(www\.)/gi, (match, www, offset) => {
    if (offset > 0) {
      const prevChar = result[offset - 1];
      // Only break if previous is whitespace or letter/digit not preceded by / or .
      if (/[\s]/.test(prevChar)) {
        return match; // Already has space
      }
      if (/[a-z0-9]/i.test(prevChar)) {
        // Check it's not preceded by / or .
        if (offset >= 2) {
          const prev2 = result[offset - 2];
          if (!/[/\.]/.test(prev2)) {
            return ' ' + match;
          }
        } else {
          return ' ' + match;
        }
      }
    }
    return match;
  });

  return result;
}

/**
 * Fix %20 bug: split on %20https:// or %20www. patterns
 * But keep legitimate %20 in paths
 */
function fixPercent20Bug(text: string): string {
  // Split on %20 followed by scheme
  let result = text.replace(/%20(https?:\/\/)/gi, ' $1');
  result = result.replace(/%20(www\.)/gi, ' $1');

  // Also split on literal space followed by scheme (safety net)
  result = result.replace(/\s+(https?:\/\/)/gi, ' $1');

  return result;
}

/**
 * Strip leading/trailing punctuation from tokens
 */
function stripPunctuation(token: string): string {
  let result = token;
  // Strip leading
  result = result.replace(/^[([{<"'`]+/, '');
  // Strip trailing (but keep /)
  result = result.replace(/[.,;:!?)}>"'`]+$/, '');
  return result;
}

/**
 * Check if token is phone-like
 */
function isPhoneLike(token: string): boolean {
  return /^[\d+\-().]+$/.test(token);
}

/**
 * Merge phone fragments
 */
function mergePhoneFragments(tokens: string[]): string[] {
  const result: string[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (isPhoneLike(token)) {
      const digitCount = (token.match(/\d/g) || []).length;

      if (digitCount < 10) {
        // Merge with following phone-like tokens
        let merged = token;
        let mergedDigits = digitCount;
        let j = i + 1;

        while (j < tokens.length && mergedDigits < 15) {
          const next = tokens[j];
          if (isPhoneLike(next)) {
            const nextDigits = (next.match(/\d/g) || []).length;
            merged += ' ' + next;
            mergedDigits += nextDigits;
            j++;

            if (mergedDigits >= 10) break;
          } else {
            break;
          }
        }

        result.push(merged);
        i = j;
      } else {
        result.push(token);
        i++;
      }
    } else {
      result.push(token);
      i++;
    }
  }

  return result;
}

/**
 * Classify a token as url, email, phone, or unknown
 */
function classify(token: string, opts: SmartSplitOptions): Omit<Item, 'raw'> {
  const trimmed = token.trim();

  if (!trimmed) {
    return { type: 'unknown', payload: '', display: '', error: 'Empty' };
  }

  // Email check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  if (emailRegex.test(trimmed) && !trimmed.includes('://')) {
    return {
      type: 'email',
      payload: `mailto:${trimmed}`,
      display: trimmed
    };
  }

  // Phone check
  const phoneCleaned = trimmed.replace(/[\s\-().]/g, '');
  const phoneRegex = /^\+?\d{7,15}$/;

  if (phoneRegex.test(phoneCleaned)) {
    let payload = '';
    let display = '';

    if (phoneCleaned.startsWith('+')) {
      payload = `tel:${phoneCleaned}`;
      display = phoneCleaned;
    } else if (phoneCleaned.startsWith('00')) {
      const withPlus = '+' + phoneCleaned.slice(2);
      payload = `tel:${withPlus}`;
      display = withPlus;
    } else if (phoneCleaned.startsWith('0') && opts.defaultCountryCode) {
      const cc = opts.defaultCountryCode.replace(/^\+/, '');
      const withCC = `+${cc}${phoneCleaned.slice(1)}`;
      payload = `tel:${withCC}`;
      display = withCC;
    } else if (/^\d{10,15}$/.test(phoneCleaned)) {
      const withPlus = `+${phoneCleaned}`;
      payload = `tel:${withPlus}`;
      display = withPlus;
    } else {
      return {
        type: 'unknown',
        payload: '',
        display: trimmed,
        error: 'Add a country code (e.g. +234)'
      };
    }

    return { type: 'phone', payload, display };
  }

  // URL check
  const schemeRegex = /^([a-z][a-z0-9+.-]*):\/\//i;
  const schemeMatch = trimmed.match(schemeRegex);

  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();

    // Block dangerous schemes
    if (['javascript', 'data', 'file', 'vbscript'].includes(scheme)) {
      return {
        type: 'unknown',
        payload: '',
        display: trimmed,
        error: 'Blocked link type'
      };
    }

    // Only allow http/https
    if (scheme !== 'http' && scheme !== 'https') {
      return {
        type: 'unknown',
        payload: '',
        display: trimmed,
        error: 'Only http and https links are supported'
      };
    }

    // Check for %20 in host or before scheme (warning)
    const urlWithoutScheme = trimmed.slice(schemeMatch[0].length);
    const hostPart = urlWithoutScheme.split(/[/?#]/)[0];
    if (hostPart.includes('%20') || trimmed.includes('%20http') || trimmed.includes('%20www')) {
      // This is a warning, not an error
      const sanResult = sanitize(trimmed);
      if (!sanResult.valid) {
        return {
          type: 'unknown',
          payload: '',
          display: trimmed,
          error: sanResult.error
        };
      }
      const normResult = normalizeUrl(sanResult.url);
      return {
        type: 'url',
        payload: normResult.canonical,
        display: normResult.displayUrl,
        warning: 'Space inside link'
      };
    }

    // Validate and normalize
    const sanResult = sanitize(trimmed);
    if (!sanResult.valid) {
      return {
        type: 'unknown',
        payload: '',
        display: trimmed,
        error: sanResult.error
      };
    }

    const normResult = normalizeUrl(sanResult.url);
    return {
      type: 'url',
      payload: normResult.canonical,
      display: normResult.displayUrl
    };
  }

  // www. prefix
  if (trimmed.toLowerCase().startsWith('www.')) {
    const withScheme = `https://${trimmed}`;
    const sanResult = sanitize(withScheme);
    if (!sanResult.valid) {
      return {
        type: 'unknown',
        payload: '',
        display: trimmed,
        error: sanResult.error
      };
    }
    const normResult = normalizeUrl(sanResult.url);
    return {
      type: 'url',
      payload: normResult.canonical,
      display: normResult.displayUrl
    };
  }

  // Domain with TLD check
  const domainRegex = /^([a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,})(?::\d+)?([/?#].*)?$/i;
  const domainMatch = trimmed.match(domainRegex);

  if (domainMatch) {
    const host = domainMatch[1];
    const tld = host.split('.').pop()?.toLowerCase();

    if (tld && COMMON_TLDS.has(tld)) {
      // Check for glued domains warning
      const hostParts = host.split('.');
      let warning: string | undefined;

      for (let i = 0; i < hostParts.length - 1; i++) {
        const part = hostParts[i];
        const nextPart = hostParts[i + 1];
        if (COMMON_TLDS.has(part) && nextPart && nextPart.length > 2) {
          warning = 'May be several links joined. Add a space or new line between them.';
          break;
        }
      }

      const withScheme = `https://${trimmed}`;
      const sanResult = sanitize(withScheme);
      if (!sanResult.valid) {
        return {
          type: 'unknown',
          payload: '',
          display: trimmed,
          error: sanResult.error
        };
      }
      const normResult = normalizeUrl(sanResult.url);
      return {
        type: 'url',
        payload: normResult.canonical,
        display: normResult.displayUrl,
        warning
      };
    }
  }

  return {
    type: 'unknown',
    payload: '',
    display: trimmed,
    error: 'Not recognised'
  };
}

/**
 * Smart split: parse text into items (URLs, emails, phones)
 */
export function smartSplit(text: string, opts: SmartSplitOptions): Item[] {
  // Step 1: Normalize line breaks
  let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Step 2: Fix %20 bug before splitting
  normalized = fixPercent20Bug(normalized);

  // Step 3: Insert scheme breaks
  normalized = insertSchemeBreaks(normalized);

  // Step 4: Split on whitespace, commas, semicolons, newlines
  let tokens = normalized.split(/[\s,;\n]+/).filter(Boolean);

  // Step 5: Strip punctuation
  tokens = tokens.map(stripPunctuation).filter(Boolean);

  // Step 6: Merge phone fragments
  tokens = mergePhoneFragments(tokens);

  // Step 7: Classify each token
  const items: Item[] = [];
  for (const token of tokens) {
    const result = classify(token, opts);
    items.push({
      raw: token,
      ...result
    });
  }

  // Step 8: Cap at 50 items
  return items.slice(0, 50);
}
