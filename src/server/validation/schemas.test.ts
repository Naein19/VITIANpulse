import { describe, expect, it } from 'vitest';
import {
  adSchema, commentSchema, discussionSchema, eventSchema, lostFoundSchema,
  opportunitySchema, postSchema, pyqUploadSchema, reportSchema, tagsInput,
} from './schemas';

/**
 * Validation is the write boundary: anything these schemas accept is what ends
 * up in the database. The cases below are the ones that would otherwise become
 * data-integrity or security problems.
 */

const FUTURE = new Date(Date.now() + 7 * 86_400_000).toISOString();
const LATER = new Date(Date.now() + 8 * 86_400_000).toISOString();

describe('postSchema', () => {
  const valid = {
    title: 'A campus announcement',
    summary: 'Something happened on campus today.',
    body: 'The full story goes here with more detail.',
    category: 'CAMPUS',
    source: 'VITPulse Desk',
  };

  it('accepts a well-formed post and applies defaults', () => {
    const result = postSchema.parse(valid);
    expect(result.importance).toBe('NORMAL');
    expect(result.status).toBe('DRAFT');
    expect(result.tags).toEqual([]);
    expect(result.pinned).toBe(false);
  });

  it('sanitises as part of parsing, so unsanitised text cannot be stored', () => {
    const result = postSchema.parse({ ...valid, title: '  Spaced   out  title  ' });
    expect(result.title).toBe('Spaced out title');
  });

  it('rejects an unknown category', () => {
    expect(() => postSchema.parse({ ...valid, category: 'NOT_A_CATEGORY' })).toThrow();
  });

  it('rejects an empty title or body', () => {
    expect(() => postSchema.parse({ ...valid, title: '' })).toThrow();
    expect(() => postSchema.parse({ ...valid, body: '' })).toThrow();
  });

  it('drops a dangerous cover image URL rather than storing it', () => {
    const result = postSchema.parse({ ...valid, coverImageUrl: 'javascript:alert(1)' });
    expect(result.coverImageUrl).toBeNull();
  });
});

describe('eventSchema', () => {
  const valid = {
    title: 'Workshop',
    summary: 'A short summary.',
    description: 'A longer description of the workshop.',
    category: 'WORKSHOP',
    organiser: 'Coding Club',
    venue: 'AB-1 Lab 204',
    startsAt: FUTURE,
    endsAt: LATER,
  };

  it('accepts a valid event', () => {
    expect(() => eventSchema.parse(valid)).not.toThrow();
  });

  it('rejects an event that ends before it starts', () => {
    expect(() => eventSchema.parse({ ...valid, startsAt: LATER, endsAt: FUTURE })).toThrow();
  });

  it('rejects a registration deadline after the event starts', () => {
    expect(() =>
      eventSchema.parse({ ...valid, registrationDeadline: LATER, startsAt: FUTURE, endsAt: LATER }),
    ).toThrow();
  });

  it('keeps the paid flag and the fee consistent', () => {
    // Paid but free.
    expect(() => eventSchema.parse({ ...valid, isPaid: true, feeInr: 0 })).toThrow();
    // Free but charging.
    expect(() => eventSchema.parse({ ...valid, isPaid: false, feeInr: 200 })).toThrow();
    expect(() => eventSchema.parse({ ...valid, isPaid: true, feeInr: 200 })).not.toThrow();
  });
});

describe('adSchema', () => {
  const valid = {
    clubId: '11111111-1111-4111-8111-111111111111',
    name: 'Campaign',
    headline: 'Come to our event',
    body: 'A short pitch for the campaign.',
    ctaLabel: 'Register',
    ctaUrl: 'https://example.com/register',
    placement: 'HOME_BANNER',
    startsAt: FUTURE,
    endsAt: LATER,
  };

  it('accepts a valid campaign', () => {
    expect(() => adSchema.parse(valid)).not.toThrow();
  });

  it('refuses a javascript: CTA — an advertiser cannot inject script', () => {
    expect(() => adSchema.parse({ ...valid, ctaUrl: 'javascript:alert(1)' })).toThrow();
    expect(() => adSchema.parse({ ...valid, ctaUrl: 'data:text/html,<script>x</script>' })).toThrow();
  });

  it('refuses a campaign longer than 120 days', () => {
    const farFuture = new Date(Date.now() + 200 * 86_400_000).toISOString();
    expect(() => adSchema.parse({ ...valid, endsAt: farFuture })).toThrow();
  });

  it('refuses an inverted campaign window', () => {
    expect(() => adSchema.parse({ ...valid, startsAt: LATER, endsAt: FUTURE })).toThrow();
  });

  it('requires a real club id', () => {
    expect(() => adSchema.parse({ ...valid, clubId: 'not-a-uuid' })).toThrow();
  });
});

describe('pyqUploadSchema', () => {
  const valid = {
    subjectCode: 'cse2004',
    subjectName: 'Database Management Systems',
    branch: 'CSE',
    semester: '4',
    year: String(new Date().getFullYear()),
    examType: 'CAT1',
  };

  it('upper-cases the course code and coerces numbers', () => {
    const result = pyqUploadSchema.parse(valid);
    expect(result.subjectCode).toBe('CSE2004');
    expect(result.semester).toBe(4);
    expect(typeof result.year).toBe('number');
  });

  it('rejects a course code with punctuation', () => {
    expect(() => pyqUploadSchema.parse({ ...valid, subjectCode: 'CSE-2004' })).toThrow();
  });

  it('rejects an out-of-range semester or a future year', () => {
    expect(() => pyqUploadSchema.parse({ ...valid, semester: '11' })).toThrow();
    expect(() => pyqUploadSchema.parse({ ...valid, year: '2050' })).toThrow();
  });
});

describe('lostFoundSchema', () => {
  const valid = {
    kind: 'LOST',
    title: 'Blue water bottle',
    description: 'Left it near the library entrance yesterday afternoon.',
    locationText: 'Central Library',
    happenedOn: new Date().toISOString(),
    contactMethod: 'IN_APP',
    contactValue: '',
  };

  it('accepts an in-app listing with no contact value', () => {
    expect(() => lostFoundSchema.parse(valid)).not.toThrow();
  });

  it('demands a real email or phone when that method is chosen', () => {
    expect(() => lostFoundSchema.parse({ ...valid, contactMethod: 'EMAIL', contactValue: 'nope' })).toThrow();
    expect(() => lostFoundSchema.parse({ ...valid, contactMethod: 'PHONE', contactValue: '123' })).toThrow();
    expect(() =>
      lostFoundSchema.parse({ ...valid, contactMethod: 'EMAIL', contactValue: 'a@b.co' }),
    ).not.toThrow();
  });
});

describe('opportunitySchema', () => {
  it('requires a safe apply URL', () => {
    const base = {
      title: 'Internship', organisation: 'Acme', type: 'INTERNSHIP',
      summary: 'A summary.', description: 'A description.', eligibility: 'Anyone.',
      location: 'Remote', deadline: FUTURE,
    };
    expect(() => opportunitySchema.parse({ ...base, applyUrl: 'javascript:alert(1)' })).toThrow();
    expect(() => opportunitySchema.parse({ ...base, applyUrl: 'https://acme.test/apply' })).not.toThrow();
  });
});

describe('community schemas', () => {
  it('caps and normalises tag input', () => {
    const parsed = tagsInput.parse('AI, ai , Machine Learning, a, ,ai');
    // Lower-cased, de-duplicated, single-character values dropped.
    expect(parsed).toContain('ai');
    expect(parsed).toContain('machine learning');
    expect(parsed).not.toContain('a');
    expect(new Set(parsed).size).toBe(parsed.length);
  });

  it('requires a body on discussions and comments', () => {
    expect(() => discussionSchema.parse({ title: 'T', body: '', category: 'GENERAL' })).toThrow();
    expect(() =>
      commentSchema.parse({
        targetType: 'DISCUSSION',
        targetId: '11111111-1111-4111-8111-111111111111',
        body: '',
      }),
    ).toThrow();
  });

  it('constrains report reasons to the known set', () => {
    const base = { targetType: 'POST', targetId: 'abc' };
    expect(() => reportSchema.parse({ ...base, reason: 'SPAM' })).not.toThrow();
    expect(() => reportSchema.parse({ ...base, reason: 'BECAUSE_I_SAID_SO' })).toThrow();
  });
});
