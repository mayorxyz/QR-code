// Payload type system for QR content generation
// Each type defines fields, validation, and payload building

export interface PayloadField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'tel' | 'url' | 'number' | 'datetime-local' | 'select' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  maxLength?: number;
  hint?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: Record<string, string>;
  warnings?: string[];
  hints?: Record<string, string>;
}

export interface PayloadType {
  id: string;
  label: string;
  fields: PayloadField[];
  validate: (values: Record<string, string | boolean>) => ValidationResult;
  build: (values: Record<string, string | boolean>) => string;
}

// Helper: escape special chars for WiFi
function escapeWifi(str: string): string {
  return str.replace(/([\\;,:"])/g, '\\$1');
}

// Helper: escape special chars for vCard
function escapeVCard(str: string): string {
  return str.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
}

// Helper: format date as YYYYMMDDTHHMMSSZ
function formatICalDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

// Helper: check if text starts with a dangerous scheme
function hasDangerousScheme(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return lower.startsWith('javascript:') || 
         lower.startsWith('data:') || 
         lower.startsWith('file:') || 
         lower.startsWith('vbscript:');
}

// ─── URL ───
export const urlType: PayloadType = {
  id: 'url',
  label: 'URL',
  fields: [
    { id: 'url', label: 'URL', type: 'url', required: true, placeholder: 'https://example.com' }
  ],
  validate: (values) => {
    const url = String(values.url || '').trim();
    const errors: Record<string, string> = {};
    
    if (!url) {
      errors.url = 'URL is required';
      return { ok: false, errors };
    }
    
    if (hasDangerousScheme(url)) {
      errors.url = 'This scheme is not allowed';
      return { ok: false, errors };
    }
    
    return { ok: true, errors: {} };
  },
  build: (values) => String(values.url || '')
};

// ─── Text ───
export const textType: PayloadType = {
  id: 'text',
  label: 'Text',
  fields: [
    { id: 'text', label: 'Text', type: 'textarea', required: true, placeholder: 'Enter any text...', maxLength: 1000 }
  ],
  validate: (values) => {
    const text = String(values.text || '');
    const errors: Record<string, string> = {};
    const warnings: string[] = [];
    
    if (!text.trim()) {
      errors.text = 'Text is required';
      return { ok: false, errors };
    }
    
    if (hasDangerousScheme(text)) {
      errors.text = 'Text cannot start with a dangerous scheme';
      return { ok: false, errors };
    }
    
    if (text.length > 1000) {
      errors.text = 'Text must be 1000 characters or less';
      return { ok: false, errors };
    }
    
    if (text.length > 300) {
      warnings.push('Dense code, may scan poorly');
    }
    
    return { ok: true, errors, warnings };
  },
  build: (values) => String(values.text || '')
};

// ─── Email ───
export const emailType: PayloadType = {
  id: 'email',
  label: 'Email',
  fields: [
    { id: 'to', label: 'To', type: 'email', required: true, placeholder: 'recipient@example.com' },
    { id: 'subject', label: 'Subject', type: 'text', placeholder: 'Email subject' },
    { id: 'body', label: 'Body', type: 'textarea', placeholder: 'Email body' }
  ],
  validate: (values) => {
    const to = String(values.to || '').trim();
    const errors: Record<string, string> = {};
    
    if (!to) {
      errors.to = 'Recipient is required';
      return { ok: false, errors };
    }
    
    // Simple email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      errors.to = 'Invalid email address';
      return { ok: false, errors };
    }
    
    return { ok: true, errors: {} };
  },
  build: (values) => {
    const to = String(values.to || '').trim();
    const subject = String(values.subject || '').trim();
    const body = String(values.body || '').trim();
    
    let payload = `mailto:${to}`;
    const params: string[] = [];
    
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
    if (body) params.push(`body=${encodeURIComponent(body)}`);
    
    if (params.length > 0) {
      payload += '?' + params.join('&');
    }
    
    return payload;
  }
};

// ─── Phone ───
export const phoneType: PayloadType = {
  id: 'phone',
  label: 'Phone',
  fields: [
    { id: 'number', label: 'Phone Number', type: 'tel', required: true, placeholder: '+234 801 234 5678', hint: 'Include country code (e.g., +234 for Nigeria)' }
  ],
  validate: (values) => {
    const raw = String(values.number || '').trim();
    const errors: Record<string, string> = {};
    const hints: Record<string, string> = {};
    
    if (!raw) {
      errors.number = 'Phone number is required';
      return { ok: false, errors };
    }
    
    // Strip spaces, dashes, parentheses
    const cleaned = raw.replace(/[\s\-()]/g, '');
    
    // Check if starts with 0 (local number without country code)
    if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
      hints.number = 'Add country code (e.g., +234 for Nigeria, +1 for US)';
      return { ok: false, errors, hints };
    }
    
    // Validate: optional + then 7-15 digits
    const phoneRegex = /^\+?\d{7,15}$/;
    if (!phoneRegex.test(cleaned)) {
      errors.number = 'Invalid phone number (7-15 digits, optional + prefix)';
      return { ok: false, errors };
    }
    
    return { ok: true, errors };
  },
  build: (values) => {
    const raw = String(values.number || '').trim();
    const cleaned = raw.replace(/[\s\-()]/g, '');
    
    // Ensure + prefix
    const number = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    return `tel:${number}`;
  }
};

// ─── SMS ───
export const smsType: PayloadType = {
  id: 'sms',
  label: 'SMS',
  fields: [
    { id: 'number', label: 'Phone Number', type: 'tel', required: true, placeholder: '+234 801 234 5678' },
    { id: 'message', label: 'Message', type: 'textarea', placeholder: 'Your message' }
  ],
  validate: (values) => {
    const raw = String(values.number || '').trim();
    const errors: Record<string, string> = {};
    
    if (!raw) {
      errors.number = 'Phone number is required';
      return { ok: false, errors };
    }
    
    const cleaned = raw.replace(/[\s\-()]/g, '');
    const phoneRegex = /^\+?\d{7,15}$/;
    
    if (!phoneRegex.test(cleaned)) {
      errors.number = 'Invalid phone number';
      return { ok: false, errors };
    }
    
    return { ok: true, errors };
  },
  build: (values) => {
    const raw = String(values.number || '').trim();
    const cleaned = raw.replace(/[\s\-()]/g, '');
    const number = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    const message = String(values.message || '');
    
    return `SMSTO:${number}:${message}`;
  }
};

// ─── WhatsApp ───
export const whatsappType: PayloadType = {
  id: 'whatsapp',
  label: 'WhatsApp',
  fields: [
    { id: 'number', label: 'Phone Number', type: 'tel', required: true, placeholder: '2348012345678', hint: 'Digits only with country code, no +' },
    { id: 'message', label: 'Message (optional)', type: 'textarea', placeholder: 'Pre-filled message' }
  ],
  validate: (values) => {
    const raw = String(values.number || '').trim();
    const errors: Record<string, string> = {};
    
    if (!raw) {
      errors.number = 'Phone number is required';
      return { ok: false, errors };
    }
    
    // Strip + and spaces
    const cleaned = raw.replace(/[\+\s\-()]/g, '');
    
    // Must be digits only
    if (!/^\d{7,15}$/.test(cleaned)) {
      errors.number = 'Invalid phone number (digits only, 7-15 digits)';
      return { ok: false, errors };
    }
    
    return { ok: true, errors };
  },
  build: (values) => {
    const raw = String(values.number || '').trim();
    const cleaned = raw.replace(/[\+\s\-()]/g, '');
    const message = String(values.message || '').trim();
    
    let payload = `https://wa.me/${cleaned}`;
    if (message) {
      payload += `?text=${encodeURIComponent(message)}`;
    }
    
    return payload;
  }
};

// ─── WiFi ───
export const wifiType: PayloadType = {
  id: 'wifi',
  label: 'WiFi',
  fields: [
    { id: 'ssid', label: 'Network Name (SSID)', type: 'text', required: true, placeholder: 'MyWiFi' },
    { id: 'password', label: 'Password', type: 'text', placeholder: 'Password' },
    { id: 'security', label: 'Security', type: 'select', required: true, options: ['WPA', 'WEP', 'None'] },
    { id: 'hidden', label: 'Hidden Network', type: 'checkbox' }
  ],
  validate: (values) => {
    const ssid = String(values.ssid || '').trim();
    const errors: Record<string, string> = {};
    
    if (!ssid) {
      errors.ssid = 'Network name is required';
      return { ok: false, errors };
    }
    
    return { ok: true, errors };
  },
  build: (values) => {
    const ssid = String(values.ssid || '').trim();
    const password = String(values.password || '');
    const security = String(values.security || 'WPA');
    const hidden = Boolean(values.hidden);
    
    const secType = security === 'None' ? 'nopass' : security;
    const escapedSsid = escapeWifi(ssid);
    
    let payload = `WIFI:T:${secType};S:${escapedSsid};`;
    
    if (security !== 'None' && password) {
      const escapedPassword = escapeWifi(password);
      payload += `P:${escapedPassword};`;
    }
    
    payload += `H:${hidden ? 'true' : 'false'};;`;
    
    return payload;
  }
};

// ─── vCard ───
export const vcardType: PayloadType = {
  id: 'vcard',
  label: 'vCard',
  fields: [
    { id: 'firstName', label: 'First Name', type: 'text', required: true, placeholder: 'John' },
    { id: 'lastName', label: 'Last Name', type: 'text', required: true, placeholder: 'Doe' },
    { id: 'organization', label: 'Organization', type: 'text', placeholder: 'Company Inc.' },
    { id: 'title', label: 'Title', type: 'text', placeholder: 'Software Engineer' },
    { id: 'phone', label: 'Phone', type: 'tel', placeholder: '+1234567890' },
    { id: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com' },
    { id: 'website', label: 'Website', type: 'url', placeholder: 'https://example.com' },
    { id: 'address', label: 'Address', type: 'text', placeholder: '123 Main St, City, Country' }
  ],
  validate: (values) => {
    const firstName = String(values.firstName || '').trim();
    const lastName = String(values.lastName || '').trim();
    const errors: Record<string, string> = {};
    const warnings: string[] = [];
    
    if (!firstName) {
      errors.firstName = 'First name is required';
    }
    
    if (!lastName) {
      errors.lastName = 'Last name is required';
    }
    
    if (Object.keys(errors).length > 0) {
      return { ok: false, errors };
    }
    
    // Build payload to check length
    const payload = vcardType.build(values);
    if (payload.length > 400) {
      warnings.push('Dense code, may scan poorly');
    }
    
    return { ok: true, errors, warnings };
  },
  build: (values) => {
    const firstName = String(values.firstName || '').trim();
    const lastName = String(values.lastName || '').trim();
    const organization = String(values.organization || '').trim();
    const title = String(values.title || '').trim();
    const phone = String(values.phone || '').trim();
    const email = String(values.email || '').trim();
    const website = String(values.website || '').trim();
    const address = String(values.address || '').trim();
    
    const lines: string[] = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${escapeVCard(lastName)};${escapeVCard(firstName)}`,
      `FN:${escapeVCard(firstName)} ${escapeVCard(lastName)}`
    ];
    
    if (organization) lines.push(`ORG:${escapeVCard(organization)}`);
    if (title) lines.push(`TITLE:${escapeVCard(title)}`);
    if (phone) lines.push(`TEL;TYPE=CELL:${phone}`);
    if (email) lines.push(`EMAIL:${email}`);
    if (website) lines.push(`URL:${website}`);
    if (address) lines.push(`ADR:;;${escapeVCard(address)};;;;`);
    
    lines.push('END:VCARD');
    
    return lines.join('\r\n');
  }
};

// ─── Location ───
export const locationType: PayloadType = {
  id: 'location',
  label: 'Location',
  fields: [
    { id: 'latitude', label: 'Latitude', type: 'number', required: true, placeholder: '40.7128' },
    { id: 'longitude', label: 'Longitude', type: 'number', required: true, placeholder: '-74.0060' }
  ],
  validate: (values) => {
    const lat = parseFloat(String(values.latitude || ''));
    const lng = parseFloat(String(values.longitude || ''));
    const errors: Record<string, string> = {};
    
    if (isNaN(lat)) {
      errors.latitude = 'Latitude is required';
    } else if (lat < -90 || lat > 90) {
      errors.latitude = 'Latitude must be between -90 and 90';
    }
    
    if (isNaN(lng)) {
      errors.longitude = 'Longitude is required';
    } else if (lng < -180 || lng > 180) {
      errors.longitude = 'Longitude must be between -180 and 180';
    }
    
    return { ok: Object.keys(errors).length === 0, errors };
  },
  build: (values) => {
    const lat = parseFloat(String(values.latitude || ''));
    const lng = parseFloat(String(values.longitude || ''));
    return `geo:${lat},${lng}`;
  }
};

// ─── Event ───
export const eventType: PayloadType = {
  id: 'event',
  label: 'Event',
  fields: [
    { id: 'title', label: 'Event Title', type: 'text', required: true, placeholder: 'Team Meeting' },
    { id: 'start', label: 'Start', type: 'datetime-local', required: true },
    { id: 'end', label: 'End', type: 'datetime-local', required: true },
    { id: 'location', label: 'Location', type: 'text', placeholder: 'Conference Room A' },
    { id: 'description', label: 'Description', type: 'textarea', placeholder: 'Event details' }
  ],
  validate: (values) => {
    const title = String(values.title || '').trim();
    const start = String(values.start || '');
    const end = String(values.end || '');
    const errors: Record<string, string> = {};
    
    if (!title) {
      errors.title = 'Event title is required';
    }
    
    if (!start) {
      errors.start = 'Start time is required';
    }
    
    if (!end) {
      errors.end = 'End time is required';
    }
    
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      
      if (endDate <= startDate) {
        errors.end = 'End time must be after start time';
      }
    }
    
    return { ok: Object.keys(errors).length === 0, errors };
  },
  build: (values) => {
    const title = String(values.title || '').trim();
    const start = String(values.start || '');
    const end = String(values.end || '');
    const location = String(values.location || '').trim();
    const description = String(values.description || '').trim();
    
    const dtStart = formatICalDate(start);
    const dtEnd = formatICalDate(end);
    const now = formatICalDate(new Date().toISOString());
    
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//QRLink//EN',
      'BEGIN:VEVENT',
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `DTSTAMP:${now}`,
      `UID:${Date.now()}@qrlink`,
      `SUMMARY:${title}`
    ];
    
    if (location) lines.push(`LOCATION:${location}`);
    if (description) lines.push(`DESCRIPTION:${description}`);
    
    lines.push('END:VEVENT');
    lines.push('END:VCALENDAR');
    
    return lines.join('\r\n');
  }
};

// ─── Crypto ───
export const cryptoType: PayloadType = {
  id: 'crypto',
  label: 'Crypto',
  fields: [
    { id: 'coin', label: 'Coin', type: 'select', required: true, options: ['Bitcoin', 'Ethereum', 'Litecoin'] },
    { id: 'address', label: 'Address', type: 'text', required: true, placeholder: 'Wallet address' },
    { id: 'amount', label: 'Amount (optional)', type: 'number', placeholder: '0.001' }
  ],
  validate: (values) => {
    const coin = String(values.coin || '');
    const address = String(values.address || '').trim();
    const errors: Record<string, string> = {};
    const warnings: string[] = ['Verify the address before sharing.'];
    
    if (!coin) {
      errors.coin = 'Coin is required';
    }
    
    if (!address) {
      errors.address = 'Address is required';
      return { ok: false, errors };
    }
    
    // Basic format validation per coin
    if (coin === 'Bitcoin' && !/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(address)) {
      errors.address = 'Invalid Bitcoin address format';
    } else if (coin === 'Ethereum' && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      errors.address = 'Invalid Ethereum address format';
    } else if (coin === 'Litecoin' && !/^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$|^ltc1[a-z0-9]{39,59}$/.test(address)) {
      errors.address = 'Invalid Litecoin address format';
    }
    
    return { ok: Object.keys(errors).length === 0, errors, warnings };
  },
  build: (values) => {
    const coin = String(values.coin || '');
    const address = String(values.address || '').trim();
    const amount = String(values.amount || '').trim();
    
    const prefix = coin.toLowerCase();
    let payload = `${prefix}:${address}`;
    
    if (amount && (coin === 'Bitcoin' || coin === 'Litecoin')) {
      payload += `?amount=${amount}`;
    }
    
    return payload;
  }
};

// ─── Registry ───
export const payloadTypes: PayloadType[] = [
  urlType,
  textType,
  emailType,
  phoneType,
  smsType,
  whatsappType,
  wifiType,
  vcardType,
  locationType,
  eventType,
  cryptoType
];

export function getPayloadType(id: string): PayloadType | undefined {
  return payloadTypes.find(t => t.id === id);
}
