import { seedId } from './ids';
import { slugify } from '@/lib/sanitize';
import type { Row } from '@/server/db/store';
import type { Clock } from './data';
import { DEMO_NOTICE } from './data';

/** Demo ads, discussions, comments, lost & found and notifications. */

/* -------------------------------------------------------------------- ads */

const ADS: ReadonlyArray<{
  key: string; club: string; name: string; headline: string; body: string; cta: string;
  placement: string; status: string; startDays: number; endDays: number; priority: number;
  impressions: number; clicks: number; cap?: number;
}> = [
  { key: 'hack-banner', club: 'coding', name: 'Pulse Hack 36 — homepage push', placement: 'HOME_BANNER', status: 'APPROVED', startDays: -6, endDays: 11, priority: 90, impressions: 18_420, clicks: 1_286, cap: 60_000,
    headline: 'Pulse Hack 36 — registrations closing soon',
    body: 'Thirty-six hours, four tracks, mentors on the floor the whole way. Teams of up to four.',
    cta: 'Register your team' },
  { key: 'ml-recruit', club: 'aiml', name: 'ML Club recruitment drive', placement: 'FEED_PROMOTED', status: 'APPROVED', startDays: -3, endDays: 9, priority: 70, impressions: 9_140, clicks: 512,
    headline: 'Machine Learning Club is recruiting',
    body: 'Project track and paper reading group. First years welcome — curiosity counts more than a résumé.',
    cta: 'See the tracks' },
  { key: 'ecell-sidebar', club: 'ecell', name: 'E-Cell pre-incubation cohort', placement: 'SIDEBAR', status: 'APPROVED', startDays: -10, endDays: 20, priority: 50, impressions: 6_705, clicks: 233,
    headline: 'Applications open: pre-incubation cohort',
    body: 'Idea clinics, a pitch bootcamp and demo night in front of founders. All schools, all years.',
    cta: 'Apply to the cohort' },
  { key: 'design-featured', club: 'design', name: 'Design Collective open crits', placement: 'FEATURED_CLUB', status: 'APPROVED', startDays: -14, endDays: 25, priority: 40, impressions: 4_211, clicks: 187,
    headline: 'Weekly design crits, now open to everyone',
    body: 'Bring an interface, a poster or a portfolio. Thirty minutes of structured, useful feedback.',
    cta: 'Book a slot' },
  { key: 'chess-events', club: 'chess', name: 'Blitz night on the events page', placement: 'EVENTS_PROMO', status: 'APPROVED', startDays: -2, endDays: 6, priority: 35, impressions: 2_980, clicks: 96,
    headline: 'Friday Blitz Night — beginners genuinely welcome',
    body: 'Seven rounds, five minutes plus three. Boards and clocks provided, no rating required.',
    cta: 'Join the ladder' },
  { key: 'photo-pending', club: 'photo', name: 'Print exhibition promotion', placement: 'SIDEBAR', status: 'PENDING_REVIEW', startDays: 2, endDays: 18, priority: 30, impressions: 0, clicks: 0,
    headline: 'Everyday Campus — a print exhibition',
    body: 'Sixty prints from a year of photowalks, on display in the main gallery for two weeks.',
    cta: 'See the exhibition' },
  { key: 'robotics-pending', club: 'robotics', name: 'Build lab induction push', placement: 'FEED_PROMOTED', status: 'PENDING_REVIEW', startDays: 1, endDays: 14, priority: 45, impressions: 0, clicks: 0,
    headline: 'The build lab is open again',
    body: 'New printers, a laser cutter and a reflow station. Complete the safety induction to get access.',
    cta: 'Book an induction' },
  { key: 'expired-fest', club: 'lit', name: 'Quiz season — concluded', placement: 'SIDEBAR', status: 'ENDED', startDays: -40, endDays: -12, priority: 20, impressions: 11_302, clicks: 402,
    headline: 'The General Quiz returns',
    body: 'Teams of three. Written prelims, then eight teams on stage.',
    cta: 'See results' },
];

export function ads(clock: Clock): Row[] {
  return ADS.map((a) => ({
    id: seedId('ad', a.key),
    clubId: seedId('club', a.club),
    name: a.name,
    headline: a.headline,
    body: a.body,
    ctaLabel: a.cta,
    ctaUrl: `https://example.com/vitpulse-demo/campaign/${a.key}`,
    imageUrl: null,
    imageAlt: null,
    placement: a.placement,
    status: a.status,
    startsAt: clock.atDay(a.startDays, 0, 0),
    endsAt: clock.atDay(a.endDays, 23, 59),
    priority: a.priority,
    impressionCap: a.cap ?? null,
    impressionCount: a.impressions,
    clickCount: a.clicks,
    reviewedBy: a.status === 'PENDING_REVIEW' ? null : seedId('profile', 'imran'),
    reviewNote: a.status === 'PENDING_REVIEW' ? null : 'Approved — plain-text creative, link verified.',
    createdBy: seedId('profile', 'lakshmi'),
    createdAt: clock.iso(-clock.days(20)),
    updatedAt: clock.iso(-clock.days(3)),
    demo: true,
  }));
}

/* ------------------------------------------------------------ discussions */

const DISCUSSIONS: ReadonlyArray<{
  key: string; title: string; cat: string; author: string; ageHours: number; upvotes: number; body: string;
  replies: ReadonlyArray<[author: string, ageHours: number, upvotes: number, text: string]>;
}> = [
  { key: 'sem5-electives', title: 'Which fifth-semester elective is actually worth taking?', cat: 'ACADEMICS', author: 'rohan', ageHours: 14, upvotes: 47,
    body: 'Registration opens next week and the elective descriptions are all written the same way. Has anyone taken these and can say what the workload and the assessment actually look like in practice?',
    replies: [
      ['sneha', 12, 22, 'The analytics one is heavy on assignments but the assignments are the good kind — you end up with three things you can actually show someone. Do not take it alongside two other project courses.'],
      ['arjun', 10, 8, 'Seconding this. A friend in the year above said the grading was fair and the feedback was detailed, which is rarer than it should be.'],
      ['priya', 7, 15, 'Different angle: pick based on who is teaching it rather than the syllabus. The same course code is a completely different experience across sections.'],
    ] },
  { key: 'hostel-wifi', title: 'Wi-fi in the north blocks after midnight', cat: 'HOSTEL', author: 'sneha', ageHours: 30, upvotes: 63,
    body: 'Anyone else seeing throughput drop off a cliff after about midnight in the north blocks? Curious whether it is the block, the floor, or just everyone downloading things at once.',
    replies: [
      ['vikram', 26, 19, 'Same on my floor. It is noticeably better if you are physically close to an access point, which suggests coverage rather than backhaul.'],
      ['rohan', 22, 11, 'Worth raising through the hostel portal ticket system rather than here — they do act on it, but they need the ticket volume to justify it.'],
    ] },
  { key: 'placement-prep', title: 'How early did you actually start placement prep?', cat: 'PLACEMENTS', author: 'vikram', ageHours: 50, upvotes: 88,
    body: 'Final year here. Getting conflicting advice — some people say start in second year, others say six months is plenty. What actually worked for people who have been through it?',
    replies: [
      ['aarthi', 45, 41, 'Consistency beats duration. Two focused hours daily for six months does more than a panicked year. Start with fundamentals, not company-specific question banks.'],
      ['devraj', 40, 26, 'Also: do at least one project you can talk about for twenty minutes without notes. That carries more interviews than another fifty solved problems.'],
      ['meera', 36, 14, 'The mock interviews the placement cell runs are underrated. Being bad at one in a low-stakes room is much better than discovering it in the real thing.'],
    ] },
  { key: 'club-balance', title: 'Balancing two clubs with coursework — is it doable?', cat: 'CLUBS', author: 'arjun', ageHours: 68, upvotes: 34,
    body: 'First year. Got into two clubs and I am starting to think that was optimistic. How do people who do this manage it without their attendance falling apart?',
    replies: [
      ['nithya', 62, 29, 'Doable if the two have different rhythms — one weekly-commitment club and one project-burst club works. Two project clubs in the same semester does not.'],
      ['kabir', 55, 18, 'Be honest with your leads early. Every club I have run would much rather know in week two than find out in week ten.'],
    ] },
  { key: 'mess-feedback', title: 'What actually happens to mess feedback forms?', cat: 'HOSTEL', author: 'priya', ageHours: 90, upvotes: 41,
    body: 'Genuine question rather than a complaint — has anyone seen a specific change come from the feedback forms? Trying to work out whether detail helps or whether it goes nowhere.',
    replies: [
      ['lakshmi', 85, 23, 'Specific feedback does get acted on — the special-diet counter at the south hall came out of a sustained set of them. Vague feedback does not.'],
    ] },
  { key: 'first-year-advice', title: 'Things you wish someone had told you in first year', cat: 'GENERAL', author: 'meera', ageHours: 120, upvotes: 152,
    body: 'Thread for seniors. What is the one thing you would tell a first year that is not on any orientation slide?',
    replies: [
      ['imran', 115, 58, 'Office hours are almost always empty. Faculty are far more approachable one-on-one than they seem in a lecture hall of two hundred.'],
      ['devraj', 110, 44, 'Your CGPA matters for a narrower set of things than you are being told, and the things it does not cover matter more over time. Do not optimise it at the cost of everything else.'],
      ['nithya', 100, 37, 'Join one thing properly rather than five things loosely. The value is entirely in the people you get to know well.'],
      ['vikram', 92, 21, 'Learn to use the library properly in your first month. Most people discover the good floors in third year.'],
    ] },
  { key: 'shuttle-timings', title: 'New shuttle timings — how are they working out?', cat: 'CAMPUS', author: 'rohan', ageHours: 24, upvotes: 27,
    body: 'The revised timings took effect this week. The extra evening trip on the city route has made a real difference for me. Anyone finding the morning peak still tight?',
    replies: [
      ['sneha', 20, 12, 'Morning is better but the 08:15 is still full by the second stop. The 07:45 is comfortable if you can make it.'],
    ] },
  { key: 'project-partners', title: 'Finding project partners outside your own branch', cat: 'ACADEMICS', author: 'nithya', ageHours: 160, upvotes: 39,
    body: 'The best projects I have worked on had someone from a different branch on the team. Is there a good way to find people outside your own section, other than knowing them already?',
    replies: [
      ['kabir', 150, 25, 'The club recruitment fair is genuinely good for this even if you do not join anything. So is turning up to a workshop outside your branch.'],
      ['arjun', 140, 9, 'The hackathon team-forming sessions work too — that is how I met the people I now work with on everything.'],
    ] },
  { key: 'study-spots', title: 'Underrated study spots on campus', cat: 'CAMPUS', author: 'sneha', ageHours: 200, upvotes: 71,
    body: 'The library third floor is always full by 10:00. Where else actually works for a long focused session?',
    replies: [
      ['priya', 190, 33, 'AB-3 upper-floor corridors between class blocks are quiet and have power points. Not officially study space but nobody minds.'],
      ['vikram', 180, 17, 'The reading hall in the hostel common area is empty during the day when everyone is in class.'],
    ] },
  { key: 'exam-stress', title: 'Managing the run-up to end-semesters', cat: 'GENERAL', author: 'priya', ageHours: 6, upvotes: 56,
    body: 'The four weeks before end-semesters are rough for most people I know. What actually helps, beyond the obvious advice?',
    replies: [
      ['meera', 5, 24, 'Sleep is not the thing to cut. Everything else degrades faster than the hours you gain. The extended library hours are useful precisely because they let you shift rather than extend.'],
      ['imran', 4, 18, 'The counselling service has short appointment slots specifically for this period and they are not only for crises. Worth knowing about before you need it.'],
    ] },
];

export function discussions(clock: Clock): { discussions: Row[]; comments: Row[]; votes: Row[] } {
  const discussionRows: Row[] = [];
  const commentRows: Row[] = [];
  const voteRows: Row[] = [];

  DISCUSSIONS.forEach((d) => {
    const id = seedId('discussion', d.key);
    const createdAt = clock.iso(-clock.hours(d.ageHours));
    discussionRows.push({
      id,
      slug: slugify(d.title),
      title: d.title,
      body: d.body,
      category: d.cat,
      authorId: seedId('profile', d.author),
      upvoteCount: d.upvotes,
      commentCount: d.replies.length,
      locked: false,
      hidden: false,
      createdAt,
      updatedAt: createdAt,
      demo: true,
    });

    d.replies.forEach(([author, ageHours, upvotes, text], ri) => {
      const at = clock.iso(-clock.hours(ageHours));
      commentRows.push({
        id: seedId('comment', `${d.key}-${ri}`),
        targetType: 'DISCUSSION',
        targetId: id,
        parentId: null,
        authorId: seedId('profile', author),
        body: text,
        upvoteCount: upvotes,
        hidden: false,
        createdAt: at,
        updatedAt: at,
        demo: true,
      });
    });
  });

  return { discussions: discussionRows, comments: commentRows, votes: voteRows };
}

/* ------------------------------------------------------------ lost & found */

const LOST_FOUND: ReadonlyArray<[key: string, kind: string, title: string, desc: string, place: string, daysAgo: number, status: string, reporter: string]> = [
  ['calc', 'LOST', 'Scientific calculator, silver, name written inside the cover', 'Left it on a bench outside AB-2 after the afternoon lab. Silver body, the back cover has a name written in marker inside it.', 'AB-2 corridor, ground floor', 1, 'OPEN', 'arjun'],
  ['idcard', 'FOUND', 'Campus ID card found near the food court', 'Found on the ground near the seating deck at the food court. Handed a photo to the student services desk; happy to return it directly.', 'Food court seating deck', 2, 'OPEN', 'sneha'],
  ['bottle', 'FOUND', 'Blue steel water bottle with sticker on the side', 'Left behind in the library third floor reading hall. Blue steel, one large sticker on the side. Kept it at the library desk.', 'Central Library, third floor', 3, 'OPEN', 'priya'],
  ['earbuds', 'LOST', 'Wireless earbuds case, black, small scratch on lid', 'Lost somewhere between the sports complex and the north hostels on Tuesday evening. Black case with a scratch across the lid.', 'Between sports complex and north hostels', 4, 'OPEN', 'vikram'],
  ['notebook', 'FOUND', 'Spiral notebook with data structures notes', 'Found in AB-1 lab 108 after the evening contest. Full of handwritten data structures notes — someone will be missing this.', 'AB-1, Lab 108', 5, 'OPEN', 'rohan'],
  ['umbrella', 'LOST', 'Compact black umbrella left in a lecture theatre', 'Left it under a seat in AB-3 LT-2 during the morning slot. Compact, black, folds into a short sleeve.', 'AB-3, LT-2', 7, 'RESOLVED', 'priya'],
  ['keys', 'FOUND', 'Set of keys on a blue lanyard', 'Found on the path near the amphitheatre. Three keys on a blue lanyard. Deposited at the security control room.', 'Near the amphitheatre', 2, 'PENDING_REVIEW', 'arjun'],
  ['charger', 'LOST', 'Laptop charger, 65W, in a grey pouch', 'Left in the Innovation Centre studio over the weekend. 65W brick in a grey drawstring pouch.', 'Innovation Centre studio', 6, 'PENDING_REVIEW', 'rohan'],
];

export function lostFound(clock: Clock): Row[] {
  return LOST_FOUND.map(([key, kind, title, desc, place, daysAgo, status, reporter]) => ({
    id: seedId('lostfound', key),
    kind,
    title,
    description: `${DEMO_NOTICE}\n\n${desc}`,
    imageUrl: null,
    locationText: place,
    happenedOn: clock.atDay(-daysAgo, 12, 0),
    contactMethod: 'IN_APP',
    contactValue: `${reporter}@vitapstudent.ac.in`,
    status,
    reporterId: seedId('profile', reporter),
    createdAt: clock.iso(-clock.days(daysAgo)),
    updatedAt: clock.iso(-clock.days(daysAgo)),
    demo: true,
  }));
}

/* ------------------------------------------------------------- moderation */

export function reports(clock: Clock): Row[] {
  return [
    {
      id: seedId('report', 'spam-1'),
      targetType: 'COMMENT',
      targetId: seedId('comment', 'sem5-electives-1'),
      reason: 'SPAM',
      detail: 'Demo report: flagged for review as part of the sample moderation queue.',
      reporterId: seedId('profile', 'vikram'),
      status: 'OPEN',
      resolvedBy: null,
      resolutionNote: null,
      createdAt: clock.iso(-clock.hours(9)),
      updatedAt: clock.iso(-clock.hours(9)),
      demo: true,
    },
    {
      id: seedId('report', 'wrong-paper'),
      targetType: 'PYQ',
      targetId: seedId('paper', 'CSE2004-FAT-2025-2'),
      reason: 'WRONG_INFO',
      detail: 'Demo report: paper appears to be filed under the wrong exam type.',
      reporterId: seedId('profile', 'sneha'),
      status: 'OPEN',
      resolvedBy: null,
      resolutionNote: null,
      createdAt: clock.iso(-clock.hours(28)),
      updatedAt: clock.iso(-clock.hours(28)),
      demo: true,
    },
    {
      id: seedId('report', 'resolved-1'),
      targetType: 'DISCUSSION',
      targetId: seedId('discussion', 'mess-feedback'),
      reason: 'OTHER',
      detail: 'Demo report: resolved example showing a closed queue item.',
      reporterId: seedId('profile', 'arjun'),
      status: 'RESOLVED',
      resolvedBy: seedId('profile', 'imran'),
      resolutionNote: 'No action needed — the thread is within community guidelines.',
      createdAt: clock.iso(-clock.days(4)),
      updatedAt: clock.iso(-clock.days(3)),
      demo: true,
    },
  ];
}

export { ADS, DISCUSSIONS };
