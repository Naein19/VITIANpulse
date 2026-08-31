import { seedId } from './ids';
import { slugify } from '@/lib/sanitize';
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
  { key: 'meera', name: 'Meera Krishnan', username: 'meera', role: 'EDITOR', branch: 'CSE-AI', school: 'SCOPE', year: 3, sem: 5, interests: ['writing', 'campus', 'ai'] },
  { key: 'imran', name: 'Imran Shaikh', username: 'imran', role: 'MODERATOR', branch: 'CSE-CYBER', school: 'SCOPE', year: 3, sem: 5, interests: ['security', 'ctf'] },
  { key: 'nithya', name: 'Nithya Rao', username: 'nithya', role: 'CLUB_ADMIN', branch: 'CSE-DS', school: 'SCOPE', year: 3, sem: 5, interests: ['ml', 'datascience', 'design'] },
  { key: 'kabir', name: 'Kabir Sethi', username: 'kabir', role: 'CLUB_ADMIN', branch: 'MECH', school: 'SMEC', year: 4, sem: 7, interests: ['robotics', 'design'] },
  { key: 'lakshmi', name: 'Lakshmi Prasanna', username: 'lakshmi', role: 'CLUB_ADMIN', branch: 'BBA', school: 'VSB', year: 2, sem: 3, interests: ['entrepreneurship', 'finance'] },
  { key: 'rohan', name: 'Rohan Kulkarni', username: 'rohan', role: 'CLUB_MEMBER', branch: 'CSE', school: 'SCOPE', year: 2, sem: 3, interests: ['webdev', 'opensource'] },
  { key: 'sneha', name: 'Sneha Reddy', username: 'sneha', role: 'STUDENT', branch: 'ECE', school: 'SENSE', year: 2, sem: 3, interests: ['music', 'photography'] },
  { key: 'arjun', name: 'Arjun Menon', username: 'arjun', role: 'STUDENT', branch: 'CSE', school: 'SCOPE', year: 1, sem: 1, interests: ['coding', 'sports'] },
  { key: 'priya', name: 'Priya Dutta', username: 'priya', role: 'STUDENT', branch: 'BIOTECH', school: 'SASH', year: 3, sem: 5, interests: ['research', 'literature'] },
  { key: 'vikram', name: 'Vikram Iyer', username: 'vikram', role: 'STUDENT', branch: 'CIVIL', school: 'SMEC', year: 4, sem: 7, interests: ['sports', 'placements'] },
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

const CLUBS: ReadonlyArray<{
  key: string; name: string; short: string; cat: string; school: string | null;
  tagline: string; about: string; recruit: 'OPEN' | 'CLOSED' | 'UPCOMING'; admin: string; verified: boolean;
}> = [
  { key: 'coding', name: 'Coding Club', short: 'CC', cat: 'TECHNICAL', school: 'SCOPE', recruit: 'OPEN', admin: 'nithya', verified: true,
    tagline: 'Weekly contests, DSA ladders and open-source sprints.',
    about: 'The Coding Club runs weekly competitive-programming contests, a structured DSA ladder for first and second years, and an open-source sprint each semester. Sessions are beginner-friendly; bring a laptop and a willingness to fail a few test cases.' },
  { key: 'aiml', name: 'Machine Learning Club', short: 'MLC', cat: 'TECHNICAL', school: 'SCOPE', recruit: 'OPEN', admin: 'nithya', verified: true,
    tagline: 'Paper reading groups, model builds and applied ML projects.',
    about: 'A project-first community around applied machine learning. We run a fortnightly paper reading group, maintain a shared GPU-hours pool for member projects, and ship two demo days a year.' },
  { key: 'robotics', name: 'Robotics Club', short: 'RC', cat: 'TECHNICAL', school: 'SMEC', recruit: 'UPCOMING', admin: 'kabir', verified: true,
    tagline: 'Line followers to autonomous rovers — build it in the lab.',
    about: 'Hardware-heavy club with an equipped build lab. Teams work on line followers, combat bots, and an annual autonomous rover entry. Mechanical, electronics and firmware roles all open.' },
  { key: 'cyber', name: 'Cybersecurity Club', short: 'CSC', cat: 'TECHNICAL', school: 'SCOPE', recruit: 'OPEN', admin: 'nithya', verified: true,
    tagline: 'CTFs, blue-team drills and secure-coding workshops.',
    about: 'We run internal capture-the-flag events, monthly secure-coding clinics, and a blue-team drill each semester. All activity is on club-owned lab infrastructure and follows the university acceptable-use policy.' },
  { key: 'ieee', name: 'IEEE Student Branch', short: 'IEEE', cat: 'PROFESSIONAL', school: 'SENSE', recruit: 'OPEN', admin: 'kabir', verified: true,
    tagline: 'Technical talks, paper writing help and chapter events.',
    about: 'The student branch hosts distinguished-lecture sessions, runs a paper-writing mentoring track for final-year projects, and coordinates the signal-processing and computer-society chapters.' },
  { key: 'acm', name: 'ACM Student Chapter', short: 'ACM', cat: 'PROFESSIONAL', school: 'SCOPE', recruit: 'CLOSED', admin: 'nithya', verified: true,
    tagline: 'Algorithms, systems talks and the annual programming cup.',
    about: 'Focused on computing fundamentals. The chapter organises the annual programming cup, a systems-reading track, and alumni AMA sessions with engineers working in industry.' },
  { key: 'ecell', name: 'Entrepreneurship Cell', short: 'E-Cell', cat: 'PROFESSIONAL', school: 'VSB', recruit: 'OPEN', admin: 'lakshmi', verified: true,
    tagline: 'From idea to pitch deck to first customer.',
    about: 'E-Cell runs a pre-incubation track each semester: idea clinics, a pitch bootcamp, and demo night in front of a panel of founders and investors. Non-business students are very welcome.' },
  { key: 'design', name: 'Design Collective', short: 'DC', cat: 'CREATIVE', school: null, recruit: 'OPEN', admin: 'lakshmi', verified: true,
    tagline: 'Product design, branding and typography crits.',
    about: 'A studio-style club for interface, product and graphic design. Weekly crit sessions, a shared component library, and paid-brief opportunities from campus organisations.' },
  { key: 'photo', name: 'Photography Club', short: 'PC', cat: 'CREATIVE', school: null, recruit: 'CLOSED', admin: 'lakshmi', verified: true,
    tagline: 'Campus photowalks, darkroom sessions and print shows.',
    about: 'Photowalks every alternate Sunday, an editing workshop series, and an annual print exhibition in the main gallery. Club gear can be borrowed by members with a deposit.' },
  { key: 'music', name: 'Music Club', short: 'MC', cat: 'CULTURAL', school: null, recruit: 'OPEN', admin: 'lakshmi', verified: true,
    tagline: 'Jam rooms, open mics and the campus band programme.',
    about: 'Runs the jam-room booking system, monthly open mics, and the inter-year band competition. Vocalists, instrumentalists and sound engineers all welcome.' },
  { key: 'dance', name: 'Dance Club', short: 'DNC', cat: 'CULTURAL', school: null, recruit: 'UPCOMING', admin: 'lakshmi', verified: true,
    tagline: 'Classical, western and street — four crews, one stage.',
    about: 'Four crews covering classical, western contemporary, street and folk. Weekly practice slots in the activity centre and a showcase every semester.' },
  { key: 'drama', name: 'Drama Society', short: 'DS', cat: 'CULTURAL', school: null, recruit: 'CLOSED', admin: 'lakshmi', verified: true,
    tagline: 'Stage plays, street theatre and improv nights.',
    about: 'Produces two full-length stage plays a year plus street theatre for campus causes. Improv nights are open to everyone, no audition needed.' },
  { key: 'lit', name: 'Literary Society', short: 'LS', cat: 'CULTURAL', school: null, recruit: 'OPEN', admin: 'lakshmi', verified: true,
    tagline: 'Debates, MUN prep, quizzing and the campus magazine.',
    about: 'Home of the debating circuit, MUN training, the quiz team and the student magazine. Weekly parliamentary debate practice every Thursday.' },
  { key: 'sports', name: 'Sports Council', short: 'SPC', cat: 'SPORTS', school: null, recruit: 'OPEN', admin: 'kabir', verified: true,
    tagline: 'Inter-hostel leagues, trials and the campus sports calendar.',
    about: 'Coordinates inter-hostel leagues across cricket, football, basketball, volleyball and athletics, and manages trials for inter-university representation.' },
  { key: 'chess', name: 'Chess Club', short: 'CHC', cat: 'SPORTS', school: null, recruit: 'OPEN', admin: 'kabir', verified: false,
    tagline: 'Rapid ladders, blitz nights and coaching for beginners.',
    about: 'A weekly rapid ladder, Friday blitz nights, and a beginner coaching track. Boards and clocks provided; the club fields the campus team for zonal tournaments.' },
  { key: 'astro', name: 'Astronomy Club', short: 'AC', cat: 'TECHNICAL', school: 'SASH', recruit: 'CLOSED', admin: 'kabir', verified: true,
    tagline: 'Observation nights, astrophotography and orbital mechanics.',
    about: 'Runs monthly observation nights with the club telescopes, an astrophotography stacking workshop, and a reading group on orbital mechanics.' },
  { key: 'green', name: 'Green Campus Initiative', short: 'GCI', cat: 'SOCIAL', school: null, recruit: 'OPEN', admin: 'lakshmi', verified: true,
    tagline: 'Waste audits, campus gardens and sustainability drives.',
    about: 'Student-led sustainability group running monthly waste audits, the campus kitchen garden, and e-waste collection drives each semester.' },
  { key: 'nss', name: 'Community Outreach Wing', short: 'COW', cat: 'SOCIAL', school: null, recruit: 'OPEN', admin: 'lakshmi', verified: true,
    tagline: 'Village outreach, blood drives and teaching programmes.',
    about: 'Coordinates weekend teaching programmes in nearby villages, blood-donation drives with the health centre, and disaster-relief collections.' },
  { key: 'telugu', name: 'Telugu Sahiti', short: 'TS', cat: 'REGIONAL', school: null, recruit: 'OPEN', admin: 'lakshmi', verified: false,
    tagline: 'Telugu literature, poetry evenings and Ugadi celebrations.',
    about: 'Celebrates Telugu literature and culture through poetry evenings, short-film screenings and the annual Ugadi programme.' },
  { key: 'north', name: 'Northeast Students Collective', short: 'NSC', cat: 'REGIONAL', school: null, recruit: 'CLOSED', admin: 'lakshmi', verified: false,
    tagline: 'Food festivals, music nights and a home away from home.',
    about: 'A support and culture collective for students from the Northeast, running food festivals, music nights and an orientation buddy system for first years.' },
];

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
      room: `${['AB-1', 'AB-2', 'AB-3', 'CB'][i % 4]} · Room ${210 + i * 3}`,
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

const LOCATIONS: ReadonlyArray<[key: string, name: string, short: string, cat: string, x: number, y: number, timings: string | null, desc: string]> = [
  ['ab1', 'Academic Block 1', 'AB-1', 'ACADEMIC', 30, 34, '08:00 – 18:00', 'Core engineering classrooms, computing labs and most SCOPE faculty cabins.'],
  ['ab2', 'Academic Block 2', 'AB-2', 'ACADEMIC', 44, 30, '08:00 – 18:00', 'Electronics and mechanical labs, drawing halls and the project workshop.'],
  ['ab3', 'Academic Block 3', 'AB-3', 'ACADEMIC', 58, 34, '08:00 – 18:00', 'Sciences, biotechnology labs and the business school lecture theatres.'],
  ['cb', 'Central Block', 'CB', 'ADMIN', 44, 46, '09:00 – 17:30', 'Administration, admissions, examination cell and the registrar office.'],
  ['lib', 'Central Library', 'LIB', 'LIBRARY', 56, 50, '08:00 – 23:00', 'Four floors of reading space, digital resources, discussion rooms and the archive.'],
  ['aud', 'Main Auditorium', 'AUD', 'AUDITORIUM', 34, 54, 'Event dependent', 'Twelve-hundred seat auditorium used for convocations, guest lectures and cultural nights.'],
  ['amp', 'Open Air Amphitheatre', 'AMP', 'AUDITORIUM', 26, 60, 'Event dependent', 'Outdoor stepped seating used for cultural evenings, open mics and club showcases.'],
  ['mh1', "Men's Hostel Block A", 'MH-A', 'HOSTEL', 14, 20, '24 hours', 'First and second year residential block with common room and reading hall.'],
  ['mh2', "Men's Hostel Block B", 'MH-B', 'HOSTEL', 12, 30, '24 hours', 'Senior residential block, closest to the sports complex.'],
  ['lh1', "Women's Hostel Block A", 'WH-A', 'HOSTEL', 78, 20, '24 hours', 'Residential block with study lounges on every floor.'],
  ['lh2', "Women's Hostel Block B", 'WH-B', 'HOSTEL', 82, 30, '24 hours', 'Senior residential block adjacent to the north dining hall.'],
  ['mess1', 'North Dining Hall', 'ND', 'FOOD', 74, 40, '07:00 – 22:00', 'Main mess for the north hostels; multi-cuisine counters and a night canteen.'],
  ['mess2', 'South Dining Hall', 'SD', 'FOOD', 18, 44, '07:00 – 22:00', 'Mess serving the south hostels with a dedicated special-diet counter.'],
  ['food', 'Food Court', 'FC', 'FOOD', 48, 62, '08:00 – 23:00', 'Cafes and outlets around a shared seating deck. The default meeting spot on campus.'],
  ['sports', 'Sports Complex', 'SPX', 'SPORTS', 20, 72, '05:30 – 21:00', 'Indoor courts, gymnasium, table tennis hall and the equipment issue desk.'],
  ['ground', 'Main Ground', 'GRD', 'SPORTS', 34, 78, '05:30 – 21:00', 'Cricket and football ground with a 400m track around the perimeter.'],
  ['court', 'Basketball Courts', 'BBC', 'SPORTS', 44, 74, '05:30 – 22:00', 'Two floodlit outdoor courts, first-come outside league fixtures.'],
  ['health', 'Health Centre', 'HC', 'MEDICAL', 66, 60, '24 hours', 'On-campus clinic with a resident doctor, pharmacy and ambulance dispatch.'],
  ['admin', 'Student Services Desk', 'SSD', 'SERVICE', 50, 44, '09:00 – 17:00', 'Bonafide letters, ID cards, bus passes, hostel paperwork and general queries.'],
  ['bank', 'Bank & ATM Plaza', 'ATM', 'SERVICE', 62, 46, '10:00 – 16:00', 'Branch counter plus three ATMs available around the clock.'],
  ['incub', 'Innovation & Incubation Centre', 'IIC', 'ACADEMIC', 68, 30, '09:00 – 20:00', 'Startup pre-incubation space, maker lab and the 3D printing bay.'],
  ['park', 'Visitor Parking', 'PKG', 'PARKING', 8, 54, '24 hours', 'Visitor and two-wheeler parking near the main gate.'],
];

function locations(): Row[] {
  return LOCATIONS.map(([key, name, short, cat, x, y, timings, desc]) => ({
    id: seedId('location', key),
    slug: slugify(name),
    name,
    shortName: short,
    category: cat,
    description: desc,
    timings,
    contact: cat === 'MEDICAL' ? 'Health centre desk · extension 1122' : null,
    mapX: x,
    mapY: y,
    lat: null,
    lng: null,
    tags: [cat.toLowerCase()],
    demo: true,
  }));
}

export { makeClock, PEOPLE, CLUBS, LOCATIONS, profiles, clubs, locations, DAY, HOUR };
export type { Clock };
export type SeedTables = Partial<Record<TableName, Row[]>>;
