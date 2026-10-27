import { describe, it, expect } from 'vitest';
import { normalizeUrl } from './normalizeUrl';
import { sanitize } from './sanitize';
import { sha256 } from './hash';
import {
  phoneType,
  wifiType,
  emailType,
  smsType,
  whatsappType,
  vcardType,
  eventType,
  locationType,
  textType,
  urlType
} from './payloads';

describe('sanitize', () => {
  it('rejects empty input', () => {
    const result = sanitize('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects javascript: scheme', () => {
    const result = sanitize('javascript:alert(1)');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('javascript');
  });

  it('rejects  scheme', () => {
    const result = sanitize('text/html,<h1>hi</h1>');
    expect(result.valid).toBe(false);
  });

  it('prepends https:// when no scheme', () => {
    const result = sanitize('example.com');
    expect(result.valid).toBe(true);
    expect(result.url).toBe('https://example.com/');
  });

  it('rejects URLs over 1000 chars', () => {
    const long = 'https://example.com/' + 'a'.repeat(1000);
    const result = sanitize(long);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('1000');
  });

  it('warns for URLs over 300 chars', () => {
    const long = 'https://example.com/' + 'a'.repeat(300);
    const result = sanitize(long);
    expect(result.valid).toBe(true);
    expect(result.warning).toBeDefined();
  });

  it('accepts valid https URLs', () => {
    const result = sanitize('https://example.com/page');
    expect(result.valid).toBe(true);
  });

  it('accepts mailto: scheme', () => {
    const result = sanitize('mailto:test@example.com');
    expect(result.valid).toBe(true);
  });

  it('accepts tel: scheme', () => {
    const result = sanitize('tel:+1234567890');
    expect(result.valid).toBe(true);
  });

  it('trims whitespace', () => {
    const result = sanitize('  https://example.com  \n');
    expect(result.valid).toBe(true);
    expect(result.url).toBe('https://example.com/');
  });
});

describe('normalizeUrl', () => {
  it('strips fbclid from Facebook URLs', () => {
    const result = normalizeUrl('https://facebook.com/page?fbclid=abc');
    expect(result.canonical).toBe('https://facebook.com/page');
    expect(result.changed).toBe(true);
    expect(result.removedParams).toContain('fbclid=abc');
  });

  it('normalizes X/Twitter URLs with host-specific params', () => {
    const result = normalizeUrl('HTTPS://X.com/user/status/1?s=20&t=zz');
    expect(result.canonical).toBe('https://x.com/user/status/1');
    expect(result.changed).toBe(true);
    expect(result.displayUrl).toContain('x.com');
  });

  it('keeps fragment', () => {
    const result = normalizeUrl('https://claude.ai/chat/abc#x');
    expect(result.canonical).toContain('#x');
  });

  it('strips default ports', () => {
    const result = normalizeUrl('https://example.com:443/page');
    expect(result.canonical).toBe('https://example.com/page');
  });

  it('lowercases scheme and host', () => {
    const result = normalizeUrl('HTTPS://EXAMPLE.COM/Page');
    expect(result.canonical).toContain('https://example.com');
  });

  it('sorts query params alphabetically', () => {
    const result = normalizeUrl('https://example.com/page?z=1&a=2&m=3');
    expect(result.canonical).toContain('a=2&m=3&z=1');
  });

  it('strips utm params', () => {
    const result = normalizeUrl('https://example.com/page?utm_source=google&utm_medium=cpc&real=param');
    expect(result.canonical).toContain('real=param');
    expect(result.canonical).not.toContain('utm_');
  });

  it('removes trailing slash on non-root paths', () => {
    const result = normalizeUrl('https://example.com/page/');
    expect(result.canonical).toBe('https://example.com/page');
  });

  it('maps twitter.com to x.com for display', () => {
    const result = normalizeUrl('https://twitter.com/user/status/1');
    expect(result.displayUrl).toContain('x.com');
    expect(result.canonical).toContain('twitter.com');
  });
});

describe('dedupe via hash', () => {
  it('same URL with different param order produces same hash', async () => {
    const url1 = normalizeUrl('https://example.com/page?b=2&a=1').canonical;
    const url2 = normalizeUrl('https://example.com/page?a=1&b=2').canonical;
    expect(url1).toBe(url2);
    const hash1 = await sha256(url1);
    const hash2 = await sha256(url2);
    expect(hash1).toBe(hash2);
  });
});

// ─── Payload Type Tests ───

describe('Phone payload', () => {
  it('formats international number correctly', () => {
    const result = phoneType.build({ number: '+234 801 234 5678' });
    expect(result).toBe('tel:+2348012345678');
  });

  it('shows hint for local number starting with 0', () => {
    const result = phoneType.validate({ number: '0801234567' });
    expect(result.ok).toBe(false);
    expect(result.hints?.number).toBeDefined();
  });

  it('validates number with + prefix', () => {
    const result = phoneType.validate({ number: '+1234567890' });
    expect(result.ok).toBe(true);
  });

  it('rejects invalid number', () => {
    const result = phoneType.validate({ number: '123' });
    expect(result.ok).toBe(false);
  });
});

describe('WiFi payload', () => {
  it('escapes special characters in ssid and password', () => {
    const result = wifiType.build({
      ssid: 'My;Net',
      password: 'a:b,c',
      security: 'WPA',
      hidden: false
    });
    expect(result).toBe('WIFI:T:WPA;S:My\\;Net;P:a\\:b\\,c;H:false;;');
  });

  it('omits P field when security is None', () => {
    const result = wifiType.build({
      ssid: 'OpenNet',
      password: '',
      security: 'None',
      hidden: false
    });
    expect(result).toBe('WIFI:T:nopass;S:OpenNet;H:false;;');
    expect(result).not.toContain('P:');
  });

  it('handles hidden network', () => {
    const result = wifiType.build({
      ssid: 'Hidden',
      password: 'secret',
      security: 'WPA',
      hidden: true
    });
    expect(result).toContain('H:true');
  });

  it('handles WEP security', () => {
    const result = wifiType.build({
      ssid: 'OldNet',
      password: 'pass',
      security: 'WEP',
      hidden: false
    });
    expect(result).toContain('T:WEP');
  });
});

describe('Email payload', () => {
  it('encodes spaces in subject as %20', () => {
    const result = emailType.build({
      to: 'test@example.com',
      subject: 'Hello World',
      body: ''
    });
    expect(result).toContain('subject=Hello%20World');
  });

  it('omits empty params', () => {
    const result = emailType.build({
      to: 'test@example.com',
      subject: '',
      body: ''
    });
    expect(result).toBe('mailto:test@example.com');
  });

  it('includes both subject and body', () => {
    const result = emailType.build({
      to: 'test@example.com',
      subject: 'Test',
      body: 'Message'
    });
    expect(result).toContain('subject=Test');
    expect(result).toContain('body=Message');
  });

  it('validates email format', () => {
    const result = emailType.validate({ to: 'invalid' });
    expect(result.ok).toBe(false);
    expect(result.errors.to).toBeDefined();
  });
});

describe('SMS payload', () => {
  it('builds correct SMSTO format', () => {
    const result = smsType.build({
      number: '+2348012345678',
      message: 'Hello'
    });
    expect(result).toBe('SMSTO:+2348012345678:Hello');
  });

  it('handles empty message', () => {
    const result = smsType.build({
      number: '+1234567890',
      message: ''
    });
    expect(result).toBe('SMSTO:+1234567890:');
  });
});

describe('WhatsApp payload', () => {
  it('strips + and spaces from number', () => {
    const result = whatsappType.build({
      number: '+234 801 234 5678',
      message: ''
    });
    expect(result).toBe('https://wa.me/2348012345678');
  });

  it('includes encoded message', () => {
    const result = whatsappType.build({
      number: '2348012345678',
      message: 'Hello World'
    });
    expect(result).toBe('https://wa.me/2348012345678?text=Hello%20World');
  });

  it('validates digits only', () => {
    const result = whatsappType.validate({ number: 'abc123' });
    expect(result.ok).toBe(false);
  });
});

describe('vCard payload', () => {
  it('has CRLF line breaks', () => {
    const result = vcardType.build({
      firstName: 'John',
      lastName: 'Doe',
      organization: '',
      title: '',
      phone: '',
      email: '',
      website: '',
      address: ''
    });
    expect(result).toContain('\r\n');
    expect(result).toContain('BEGIN:VCARD');
    expect(result).toContain('END:VCARD');
  });

  it('escapes comma in ORG', () => {
    const result = vcardType.build({
      firstName: 'John',
      lastName: 'Doe',
      organization: 'Company, Inc.',
      title: '',
      phone: '',
      email: '',
      website: '',
      address: ''
    });
    expect(result).toContain('ORG:Company\\, Inc.');
  });

  it('includes all provided fields', () => {
    const result = vcardType.build({
      firstName: 'Jane',
      lastName: 'Smith',
      organization: 'Tech Corp',
      title: 'Engineer',
      phone: '+1234567890',
      email: 'jane@example.com',
      website: 'https://jane.dev',
      address: '123 Main St'
    });
    expect(result).toContain('FN:Jane Smith');
    expect(result).toContain('ORG:Tech Corp');
    expect(result).toContain('TITLE:Engineer');
    expect(result).toContain('TEL;TYPE=CELL:+1234567890');
    expect(result).toContain('EMAIL:jane@example.com');
    expect(result).toContain('URL:https://jane.dev');
  });

  it('warns when payload exceeds 400 chars', () => {
    const longAddress = 'A'.repeat(300);
    const result = vcardType.validate({
      firstName: 'John',
      lastName: 'Doe',
      organization: '',
      title: '',
      phone: '',
      email: '',
      website: '',
      address: longAddress
    });
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.length).toBeGreaterThan(0);
  });
});

describe('Event payload', () => {
  it('validates end must be after start', () => {
    const result = eventType.validate({
      title: 'Meeting',
      start: '2024-01-02T10:00',
      end: '2024-01-01T10:00',
      location: '',
      description: ''
    });
    expect(result.ok).toBe(false);
    expect(result.errors.end).toBeDefined();
  });

  it('builds valid iCalendar format', () => {
    const result = eventType.build({
      title: 'Meeting',
      start: '2024-01-15T10:00',
      end: '2024-01-15T11:00',
      location: 'Room A',
      description: 'Weekly sync'
    });
    expect(result).toContain('BEGIN:VCALENDAR');
    expect(result).toContain('BEGIN:VEVENT');
    expect(result).toContain('SUMMARY:Meeting');
    expect(result).toContain('LOCATION:Room A');
    expect(result).toContain('END:VEVENT');
    expect(result).toContain('END:VCALENDAR');
  });
});

describe('Location payload', () => {
  it('rejects latitude out of range', () => {
    const result = locationType.validate({
      latitude: '91',
      longitude: '0'
    });
    expect(result.ok).toBe(false);
    expect(result.errors.latitude).toBeDefined();
  });

  it('rejects longitude out of range', () => {
    const result = locationType.validate({
      latitude: '0',
      longitude: '181'
    });
    expect(result.ok).toBe(false);
    expect(result.errors.longitude).toBeDefined();
  });

  it('builds geo: format', () => {
    const result = locationType.build({
      latitude: '40.7128',
      longitude: '-74.0060'
    });
    expect(result).toBe('geo:40.7128,-74.006');
  });
});

describe('Text payload', () => {
  it('blocks dangerous schemes', () => {
    const result = textType.validate({ text: 'javascript:alert(1)' });
    expect(result.ok).toBe(false);
  });

  it('allows normal text', () => {
    const result = textType.validate({ text: 'Hello World' });
    expect(result.ok).toBe(true);
  });

  it('rejects text over 1000 chars', () => {
    const result = textType.validate({ text: 'A'.repeat(1001) });
    expect(result.ok).toBe(false);
  });

  it('warns for text over 300 chars', () => {
    const result = textType.validate({ text: 'A'.repeat(301) });
    expect(result.ok).toBe(true);
    expect(result.warnings).toBeDefined();
  });
});

describe('URL payload', () => {
  it('blocks dangerous schemes', () => {
    const result = urlType.validate({ url: 'javascript:alert(1)' });
    expect(result.ok).toBe(false);
  });

  it('allows valid URLs', () => {
    const result = urlType.validate({ url: 'https://example.com' });
    expect(result.ok).toBe(true);
  });
});

describe('Dedupe for payloads', () => {
  it('same payload twice produces same hash', async () => {
    const payload1 = phoneType.build({ number: '+234 801 234 5678' });
    const payload2 = phoneType.build({ number: '+2348012345678' });
    expect(payload1).toBe(payload2);
    const hash1 = await sha256('phone' + payload1);
    const hash2 = await sha256('phone' + payload2);
    expect(hash1).toBe(hash2);
  });
});
