import { describe, expect, it } from 'vitest';
import {
  maskContact, safeExternalUrl, safeInternalPath, sanitizeLine, sanitizePlainText, slugify, uniqueSlug,
} from './sanitize';

// Written as escapes rather than literals so the hostile characters under test
// stay visible in review and in a diff.
const RLO = '\u202E'; // right-to-left override
const ZWSP = '\u200B'; // zero-width space
const NUL = '\u0000'; // a control character

describe('sanitizePlainText', () => {
  it('strips control, bidi and zero-width characters', () => {
    // A bidi override can make a filename render backwards; it must not survive.
    expect(sanitizePlainText(`safe${RLO}txt.exe`)).toBe('safetxt.exe');
    expect(sanitizePlainText(`a${NUL}bc`)).toBe('abc');
    expect(sanitizePlainText(`in${ZWSP}visible`)).toBe('invisible');
  });

  it('normalises whitespace without destroying paragraphs', () => {
    expect(sanitizePlainText('a\r\nb')).toBe('a\nb');
    expect(sanitizePlainText('one\n\n\n\n\ntwo')).toBe('one\n\n\ntwo');
    expect(sanitizePlainText('   padded   ')).toBe('padded');
  });

  it('truncates to the requested length', () => {
    expect(sanitizePlainText('abcdefghij', { maxLength: 4 })).toBe('abcd');
  });

  it('collapses newlines for single-line fields', () => {
    expect(sanitizeLine('first\nsecond')).toBe('first second');
  });
});

describe('safeExternalUrl', () => {
  it('accepts http, https and mailto', () => {
    expect(safeExternalUrl('https://example.com/x')).toBe('https://example.com/x');
    expect(safeExternalUrl('http://example.com')).toBe('http://example.com/');
    expect(safeExternalUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
  });

  it('rejects script-bearing and opaque protocols', () => {
    // The exact vector an advertiser would try on a CTA link.
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('JavaScript:alert(1)')).toBeNull();
    expect(safeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeExternalUrl('vbscript:msgbox(1)')).toBeNull();
    expect(safeExternalUrl('file:///etc/passwd')).toBeNull();
  });

  it('rejects values that are not URLs at all', () => {
    expect(safeExternalUrl('')).toBeNull();
    expect(safeExternalUrl('   ')).toBeNull();
    expect(safeExternalUrl('not a url')).toBeNull();
  });
});

describe('safeInternalPath', () => {
  it('accepts ordinary internal paths', () => {
    expect(safeInternalPath('/events')).toBe('/events');
    expect(safeInternalPath('/pyqs/cse?sem=5')).toBe('/pyqs/cse?sem=5');
  });

  it('blocks open-redirect vectors on ?next=', () => {
    expect(safeInternalPath('//evil.com')).toBeNull();
    expect(safeInternalPath('/\\evil.com')).toBeNull();
    expect(safeInternalPath('https://evil.com')).toBeNull();
    expect(safeInternalPath('evil.com')).toBeNull();
    expect(safeInternalPath(`/ok${NUL}/x`)).toBeNull();
  });
});

describe('slugify', () => {
  it('produces url-safe slugs', () => {
    expect(slugify('Chief Guest Visits VIT-AP!')).toBe('chief-guest-visits-vit-ap');
    expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
    expect(slugify("Club's Night")).toBe('clubs-night');
  });

  it('strips diacritics rather than dropping the letter', () => {
    expect(slugify('Café Sessión')).toBe('cafe-session');
  });

  it('never returns an empty slug', () => {
    expect(slugify('!!!')).toBe('item');
    expect(slugify('')).toBe('item');
  });

  it('deduplicates against taken slugs', () => {
    const taken = new Set(['hack', 'hack-2']);
    expect(uniqueSlug('Hack', taken)).toBe('hack-3');
    expect(uniqueSlug('Fresh', taken)).toBe('fresh');
  });
});

describe('maskContact', () => {
  it('keeps the domain but hides the mailbox', () => {
    const masked = maskContact('student@vitapstudent.ac.in', 'EMAIL');
    expect(masked).toContain('@vitapstudent.ac.in');
    expect(masked).not.toContain('student@');
    expect(masked.startsWith('st')).toBe(true);
  });

  it('leaves only the last three digits of a phone number', () => {
    expect(maskContact('9876543210', 'PHONE')).toBe('•••••••210');
  });

  it('never echoes an in-app contact', () => {
    expect(maskContact('someone@example.com', 'IN_APP')).toBe('Via VITPulse message');
  });
});
