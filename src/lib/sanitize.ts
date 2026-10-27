export interface SanitizeResult {
  valid: boolean;
  url: string;
  error?: string;
  warning?: string;
}

const BLOCKED_SCHEMES = ['javascript:', 'data:', 'file:', 'vbscript:'];
const ALLOWED_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];
const MAX_LENGTH = 1000;
const LONG_URL_THRESHOLD = 300;

export function sanitize(input: string): SanitizeResult {
  // Trim whitespace/newlines
  let cleaned = input.trim().replace(/[\r\n]+/g, '');

  // Reject empty input
  if (!cleaned) {
    return { valid: false, url: '', error: 'Please enter a URL.' };
  }

  // Hard cap at 1000 chars
  if (cleaned.length > MAX_LENGTH) {
    return { valid: false, url: '', error: `URL exceeds maximum length of ${MAX_LENGTH} characters.` };
  }

  // Check for blocked schemes
  const lowerInput = cleaned.toLowerCase();
  for (const blocked of BLOCKED_SCHEMES) {
    if (lowerInput.startsWith(blocked)) {
      return { valid: false, url: '', error: `Blocked scheme "${blocked.replace(':', '')}" is not allowed for security reasons.` };
    }
  }

  // If no scheme, prepend https://
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(cleaned) && !cleaned.startsWith('mailto:') && !cleaned.startsWith('tel:')) {
    cleaned = 'https://' + cleaned;
  }

  // Parse with URL
  try {
    const parsed = new URL(cleaned);

    // Validate scheme
    if (!ALLOWED_SCHEMES.includes(parsed.protocol)) {
      return { valid: false, url: '', error: `Scheme "${parsed.protocol}" is not supported. Use http, https, mailto, or tel.` };
    }

    // Warning for long URLs
    let warning: string | undefined;
    if (cleaned.length > LONG_URL_THRESHOLD) {
      warning = 'Long links make dense QR codes that scan poorly. Shorten first.';
    }

    return { valid: true, url: parsed.href, warning };
  } catch {
    return { valid: false, url: '', error: 'Invalid URL format. Please check and try again.' };
  }
}
