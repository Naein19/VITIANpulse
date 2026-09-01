import { seedId } from './ids';
import { slugify } from '@/lib/sanitize';
import { CAMPUS_LOCATIONS, VITAP_CLUBS } from '@/data/vitap';
import type { Row, TableName } from '@/server/db/store';

/**
 * Development / demo dataset.
 *
 * IMPORTANT: everything in this file is fictional sample content created to
 * exercise the product. It is not, and must not be presented as, a real VIT-AP
 * announcement. Every seeded row carries `demo: true`; the UI renders a
 * persistent "Demo data" banner whenever the memory store is active.
 *
 * Club names used here are generic student-chapter names common to many
 * universities. No real person's contact details appear anywhere.
 */

export const DEMO_NOTICE = 'Demo content — sample data for development, not a real university announcement.';

const DAY = 86_400_000;
const HOUR = 3_600_000;

/** All timestamps are generated relative to `now` so the feed always looks live. */
function makeClock(now: Date) {
  const base = now.getTime();
  return {
    iso: (offsetMs: number) => new Date(base + offsetMs).toISOString(),
    /** `atDay(2, 15, 30)` = 15:30 local, two days from now. */
    atDay: (days: number, hour: number, minute = 0) => {
      const d = new Date(base + days * DAY);
      d.setHours(hour, minute, 0, 0);
      return d.toISOString();
    },
    /**
     * Places an event relative to the current hour rather than at a fixed clock
     * time, so today's board always has something live and something upcoming
     * regardless of when the demo dataset is generated. Snapped to the nearest
     * half hour so the times read naturally.
     */
    todayAt: (hoursFromNow: number) => {
      const start = new Date(base + hoursFromNow * HOUR);
      start.setMinutes(start.getMinutes() < 30 ? 0 : 30, 0, 0);
      // Keep the event on today's date. Late in the evening a positive offset
      // would spill into tomorrow and drop off today's board, so fold it back
      // into the remaining hours instead.
      const endOfDay = new Date(base);
      endOfDay.setHours(23, 0, 0, 0);
      if (start.getTime() > endOfDay.getTime()) {
        // Fold the overflow back into the remaining hours, preserving the
        // relative order so several late events do not collapse onto one time.
        const remaining = Math.max(30 * 60_000, endOfDay.getTime() - base);
        const ratio = Math.min(1, hoursFromNow / 6);
        const folded = new Date(base + remaining * (0.25 + ratio * 0.6));
        folded.setMinutes(folded.getMinutes() < 30 ? 0 : 30, 0, 0);
        return folded.toISOString();
      }
      return start.toISOString();
    },
    days: (n: number) => n * DAY,
    hours: (n: number) => n * HOUR,
  };
}

type Clock = ReturnType<typeof makeClock>;

/* ------------------------------------------------------------------ people */

const PEOPLE: ReadonlyArray<{
  key: string; name: string; username: string; role: string; branch: string; school: string;
  year: number; sem: number; interests: string[];
}> = [
  { key: 'aarthi', name: 'Aarthi Venkatesan', username: 'aarthi', role: 'SUPER_ADMIN', branch: 'CSE', school: 'SCOPE', year: 4, sem: 7, interests: ['hackathon', 'ai', 'placements'] },
  { key: 'devraj', name: 'Devraj Nandan', username: 'devraj', role: 'ADMIN', branch: 'ECE', school: 'SENSE', year: 4, sem: 7, interests: ['robotics', 'iot'] },
  { key: 'meera', name: 'Meera Krishnan', username: 'meera', role: 'EDITOR', branch: 'CSE-AIML', school: 'SCOPE', year: 3, sem: 5, interests: ['writing', 'campus', 'ai'] },
  { key: 'imran', name: 'Imran Shaikh', username: 'imran', role: 'MODERATOR', branch: 'CSE-CYBER', school: 'SCOPE', year: 3, sem: 5, interests: ['security', 'ctf'] },
  { key: 'nithya', name: 'Nithya Rao', username: 'nithya', role: 'CLUB_ADMIN', branch: 'CSE-DA', school: 'SCOPE', year: 3, sem: 5, interests: ['ml', 'datascience', 'design'] },
  { key: 'kabir', name: 'Kabir Sethi', username: 'kabir', role: 'CLUB_ADMIN', branch: 'MECH-ROBOTICS', school: 'SMEC', year: 4, sem: 7, interests: ['robotics', 'design'] },
  { key: 'lakshmi', name: 'Lakshmi Prasanna', username: 'lakshmi', role: 'CLUB_ADMIN', branch: 'BBA', school: 'VSB', year: 2, sem: 3, interests: ['entrepreneurship', 'finance'] },
  { key: 'rohan', name: 'Rohan Kulkarni', username: 'rohan', role: 'CLUB_MEMBER', branch: 'CSE', school: 'SCOPE', year: 2, sem: 3, interests: ['webdev', 'opensource'] },
  { key: 'sneha', name: 'Sneha Reddy', username: 'sneha', role: 'STUDENT', branch: 'ECE-VLSI', school: 'SENSE', year: 2, sem: 3, interests: ['music', 'photography'] },
  { key: 'arjun', name: 'Arjun Menon', username: 'arjun', role: 'STUDENT', branch: 'CSE', school: 'SCOPE', year: 1, sem: 1, interests: ['coding', 'sports'] },
  { key: 'priya', name: 'Priya Dutta', username: 'priya', role: 'STUDENT', branch: 'BIOTECH', school: 'SBST', year: 3, sem: 5, interests: ['research', 'literature'] },
  { key: 'vikram', name: 'Vikram Iyer', username: 'vikram', role: 'STUDENT', branch: 'CSBS', school: 'SCOPE', year: 4, sem: 7, interests: ['sports', 'placements'] },
];

export const DEMO_ACCOUNTS = PEOPLE.map((p) => ({
  id: seedId('profile', p.key),
  email: `${p.username}@vitapstudent.ac.in`,
  displayName: p.name,
  role: p.role,
}));

function profiles(clock: Clock): Row[] {
  return PEOPLE.map((p, i) => ({
    id: seedId('profile', p.key),
    email: `${p.username}@vitapstudent.ac.in`,
    displayName: p.name,
    username: p.username,
    avatarUrl: null,
    bio: i % 3 === 0 ? `${p.branch} · ${p.school} · demo account` : null,
    role: p.role,
    branch: p.branch,
    school: p.school,
    year: p.year,
    semester: p.sem,
    registrationNumber: `2${String(26 - p.year).padStart(2, '0')}BCE${String(1000 + i * 37)}`,
    interests: p.interests,
    suspended: false,
    suspendedReason: null,
    onboardedAt: clock.iso(-clock.days(120 + i)),
    createdAt: clock.iso(-clock.days(200 + i * 3)),
    updatedAt: clock.iso(-clock.days(2)),
    demo: true,
  }));
}

/* ------------------------------------------------------------------- clubs */

/**
 * Demo clubs are built from the *real* VIT-AP club register in
 * `src/data/vitap.ts`. The names, categories and taglines are factual; the
 * recruitment windows, follower counts and coordinators are demo values.
 */
const RECRUITMENT_CYCLE: ReadonlyArray<'OPEN' | 'CLOSED' | 'UPCOMING'> = ['OPEN', 'OPEN', 'CLOSED', 'UPCOMING', 'CLOSED'];

const CLUB_ADMINS = ['nithya', 'kabir', 'lakshmi'] as const;

const CLUBS = VITAP_CLUBS.map((club, i) => ({
  key: slugify(club.shortName || club.name),
  name: club.name,
  short: club.shortName,
  cat: club.category,
  // Only technical and professional bodies are tied to a school; the cultural
  // and regional clubs are university-wide.
  school:
    club.category === 'TECHNICAL' || club.category === 'PROFESSIONAL'
      ? (['SCOPE', 'SENSE', 'SCOPE', 'SMEC'][i % 4] as string)
      : null,
  tagline: club.tagline,
  about: club.tagline,
  recruit: RECRUITMENT_CYCLE[i % RECRUITMENT_CYCLE.length]!,
  admin: CLUB_ADMINS[i % CLUB_ADMINS.length]!,
  // Chapters of national/international bodies are the verified ones.
  verified: club.officialGroup === 'Technical' || club.officialGroup === 'Professional Club',
}));

function clubs(clock: Clock): { clubs: Row[]; members: Row[]; socials: Row[] } {
  const clubRows: Row[] = [];
  const memberRows: Row[] = [];
  const socialRows: Row[] = [];

  CLUBS.forEach((c, i) => {
    const id = seedId('club', c.key);
    clubRows.push({
      id,
      slug: slugify(c.name),
      name: c.name,
      shortName: c.short,
      category: c.cat,
      tagline: c.tagline,
      description: c.about,
      logoUrl: null,
      bannerUrl: null,
      school: c.school,
      email: `${c.key}.club@vitap.example.ac.in`,
      facultyCoordinator: ['Dr. S. Ramesh', 'Dr. P. Kavitha', 'Dr. A. Sundaram', 'Dr. N. Bhavani'][i % 4],
      room: `${['AB-1', 'AB-2', 'CB'][i % 3]} · Room ${210 + i * 3}`,
      recruitmentStatus: c.recruit,
      recruitmentUrl: c.recruit === 'OPEN' ? 'https://forms.gle/vitpulse-demo-recruitment' : null,
      recruitmentClosesAt: c.recruit === 'OPEN' ? clock.atDay(9 + (i % 12), 23, 59) : null,
      membershipInfo:
        c.recruit === 'OPEN'
          ? 'Recruitment is open to all years. Fill the form, then attend one intro session before the interview round.'
          : 'Recruitment opens at the start of each semester. Follow the club here to be notified.',
      verified: c.verified,
      status: 'PUBLISHED',
      followerCount: 40 + ((i * 137) % 900),
      galleryUrls: [],
      createdAt: clock.iso(-clock.days(400 - i * 5)),
      updatedAt: clock.iso(-clock.days(3 + (i % 20))),
      demo: true,
    });

    const platforms = ['INSTAGRAM', 'LINKEDIN', 'GITHUB', 'WEBSITE'] as const;
    platforms.slice(0, 2 + (i % 3)).forEach((platform) => {
      socialRows.push({
        id: seedId('social', `${c.key}-${platform}`),
        clubId: id,
        platform,
        url: `https://example.com/${platform.toLowerCase()}/vitpulse-demo-${slugify(c.short)}`,
      });
    });

    const coordinators = [
      { person: c.admin, role: 'ADMIN', title: 'Club Lead' },
      { person: PEOPLE[(i + 7) % PEOPLE.length]!.key, role: 'LEAD', title: 'Events Lead' },
      { person: PEOPLE[(i + 3) % PEOPLE.length]!.key, role: 'CORE', title: 'Outreach Core' },
    ];
    for (const co of coordinators) {
      const person = PEOPLE.find((p) => p.key === co.person)!;
      memberRows.push({
        id: seedId('member', `${c.key}-${co.person}-${co.role}`),
        clubId: id,
        userId: seedId('profile', co.person),
        clubRole: co.role,
        title: co.title,
        displayName: person.name,
        avatarUrl: null,
        createdAt: clock.iso(-clock.days(300)),
      });
    }
  });

  return { clubs: clubRows, members: memberRows, socials: socialRows };
}

/* --------------------------------------------------------------- locations */

/**
 * Campus locations are the real VIT-AP places from `src/data/vitap.ts`, with
 * real coordinates from OpenStreetMap. Nothing here is invented: a place with
 * no published position keeps a null coordinate rather than a plausible one.
 */
function locations(): Row[] {
  return CAMPUS_LOCATIONS.map((place) => ({
    id: seedId('location', place.slug),
    slug: place.slug,
    name: place.name,
    shortName: place.shortName,
    category: place.category,
    description: place.description,
    timings: place.timings,
    contact: place.contact,
    mapX: place.mapX,
    mapY: place.mapY,
    lat: place.lat,
    lng: place.lng,
    levels: place.levels,
    coordSource: place.coordSource,
    tags: place.tags,
  }));
}

export { makeClock, PEOPLE, CLUBS, profiles, clubs, locations, DAY, HOUR };
export type { Clock };
export type SeedTables = Partial<Record<TableName, Row[]>>;
