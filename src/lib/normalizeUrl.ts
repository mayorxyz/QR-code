const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_id', 'utm_source_platform', 'utm_creative_format',
  'fbclid', 'gclid', 'igshid', 'mc_eid', 'ref', 'ref_src', 'feature',
]);

const HOST_SPECIFIC_PARAMS: Record<string, Set<string>> = {
  'x.com': new Set(['s', 't']),
  'twitter.com': new Set(['s', 't']),
  'www.x.com': new Set(['s', 't']),
  'www.twitter.com': new Set(['s', 't']),
  'youtube.com': new Set(['t']),
  'www.youtube.com': new Set(['t']),
  'youtu.be': new Set(['t']),
};

export interface NormalizeResult {
  original: string;
  canonical: string;
  displayUrl: string;
  changed: boolean;
  removedParams: string[];
}

export function normalizeUrl(input: string): NormalizeResult {
  const original = input;
  let parsed: URL;

  try {
    parsed = new URL(input);
  } catch {
    return { original, canonical: input, displayUrl: input, changed: false, removedParams: [] };
  }

  // Lowercase scheme and host
  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();

  // Strip default ports
  if ((parsed.protocol === 'http:' && parsed.port === '80') ||
      (parsed.protocol === 'https:' && parsed.port === '443')) {
    parsed.port = '';
  }

  // Remove tracking params
  const removedParams: string[] = [];
  const host = parsed.hostname.toLowerCase();
  const hostSpecific = HOST_SPECIFIC_PARAMS[host] || new Set<string>();

  const params = new URLSearchParams(parsed.search);
  const newParams = new URLSearchParams();

  // Get all keys and sort them
  const keys: string[] = [];
  params.forEach((value, key) => {
    if (TRACKING_PARAMS.has(key) || hostSpecific.has(key)) {
      removedParams.push(`${key}=${value}`);
    } else {
      keys.push(key);
    }
  });

  // Sort remaining params alphabetically
  keys.sort();
  for (const key of keys) {
    newParams.set(key, params.get(key)!);
  }

  parsed.search = newParams.toString() ? `?${newParams.toString()}` : '';

  // Remove trailing slash on bare paths (path is just "/")
  if (parsed.pathname === '/' && !parsed.search && !parsed.hash) {
    // Keep the slash for root URLs - it's fine
  } else if (parsed.pathname.endsWith('/') && parsed.pathname !== '/') {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  // Keep the fragment (hash is preserved by default)

  const canonical = parsed.href;

  // Display URL: map twitter.com -> x.com for display
  let displayUrl = canonical;
  if (host === 'twitter.com' || host === 'www.twitter.com') {
    displayUrl = canonical.replace(/^(https?:\/\/)(www\.)?twitter\.com/i, '$1x.com');
  }

  const changed = canonical !== original || removedParams.length > 0;

  return { original, canonical, displayUrl, changed, removedParams };
}
