import { seedId } from './ids';
import { clubs, locations, makeClock, profiles, type SeedTables } from './data';
import { events, posts } from './content';
import { opportunities, pyq, resources } from './catalog';
import { ads, discussions, lostFound, reports } from './community';
import type { Row } from '@/server/db/store';

export { DEMO_NOTICE, DEMO_ACCOUNTS } from './data';

/**
 * Builds the full demo dataset.
 *
 * Deterministic given `now`, so a restart produces the same identifiers and any
 * bookmarks or follows written in a previous session still resolve.
 */
export function buildSeed(now: Date = new Date()): SeedTables {
  const clock = makeClock(now);
  const { clubs: clubRows, members, socials } = clubs(clock);
  const { subjects, papers } = pyq(clock);
  const { discussions: discussionRows, comments, votes } = discussions(clock);
  const eventRows = events(clock);
  const postRows = posts(clock);

  // A demo student who already has follows, bookmarks and registrations, so the
  // personalised dashboard has something to render on a fresh install.
  const demoStudent = seedId('profile', 'rohan');

  const follows: Row[] = ['coding', 'aiml', 'design', 'chess', 'ecell'].map((key) => ({
    id: seedId('follow', `rohan-${key}`),
    userId: demoStudent,
    clubId: seedId('club', key),
    createdAt: clock.iso(-clock.days(30)),
  }));

  const bookmarks: Row[] = [
    ...['genai', 'hackathon', 'cc-contest'].map((key) => ({
      id: seedId('bookmark', `rohan-event-${key}`),
      userId: demoStudent,
      targetType: 'EVENT',
      targetId: seedId('event', key),
      createdAt: clock.iso(-clock.days(4)),
    })),
    ...['summer-swe', 'campus-ta'].map((key) => ({
      id: seedId('bookmark', `rohan-opp-${key}`),
      userId: demoStudent,
      targetType: 'OPPORTUNITY',
      targetId: seedId('opportunity', key),
      createdAt: clock.iso(-clock.days(2)),
    })),
    {
      id: seedId('bookmark', 'rohan-post-placement'),
      userId: demoStudent,
      targetType: 'POST',
      targetId: seedId('post', 'placement-drive'),
      createdAt: clock.iso(-clock.days(1)),
    },
    {
      id: seedId('bookmark', 'rohan-pyq-1'),
      userId: demoStudent,
      targetType: 'PYQ',
      targetId: seedId('paper', 'CSE2001-CAT1-2026-0'),
      createdAt: clock.iso(-clock.days(6)),
    },
    {
      id: seedId('bookmark', 'rohan-resource-1'),
      userId: demoStudent,
      targetType: 'RESOURCE',
      targetId: seedId('resource', 'exam-schedule'),
      createdAt: clock.iso(-clock.days(3)),
    },
  ];

  const registrations: Row[] = ['genai', 'cc-contest', 'chess-blitz'].map((key, i) => ({
    id: seedId('registration', `rohan-${key}`),
    eventId: seedId('event', key),
    userId: demoStudent,
    status: 'REGISTERED',
    note: null,
    createdAt: clock.iso(-clock.days(3 + i)),
    updatedAt: clock.iso(-clock.days(3 + i)),
  }));

  const notifications: Row[] = [
    { key: 'n1', type: 'EVENT_REMINDER', title: 'Generative AI workshop starts in 2 days', body: 'AB-1 Lab 204 · 14:00. You are registered — bring a laptop.', href: '/events/generative-ai-systems-a-hands-on-build', hours: 2, read: false },
    { key: 'n2', type: 'CLUB_UPDATE', title: 'Coding Club posted a new event', body: 'Weekly Contest #34 opens for registration.', href: '/events/weekly-contest-34-coding-club-ladder', hours: 8, read: false },
    { key: 'n3', type: 'OPPORTUNITY_DEADLINE', title: 'Summer internship closes in 6 days', body: 'Northwind Systems — Summer Software Engineering Internship.', href: '/opportunities/summer-software-engineering-internship', hours: 20, read: false },
    { key: 'n4', type: 'ANNOUNCEMENT', title: 'Water maintenance in the north hostel blocks', body: 'Supply interrupted 10:00–14:00 tomorrow for tank cleaning.', href: '/news/scheduled-water-maintenance-in-the-north-hostel-blocks', hours: 3, read: false },
    { key: 'n5', type: 'PYQ_UPLOAD', title: '4 new papers added for CSE Semester 5', body: 'Computer Networks and Software Engineering papers were approved.', href: '/pyqs/cse', hours: 30, read: true },
    { key: 'n6', type: 'CLUB_UPDATE', title: 'Design Collective opened crits to everyone', body: 'Weekly thirty-minute critique slots, no membership needed.', href: '/clubs/design-collective', hours: 54, read: true },
    { key: 'n7', type: 'SYSTEM', title: 'Welcome to VITPulse', body: 'Follow a few clubs and set your branch to personalise this feed.', href: '/dashboard', hours: 200, read: true },
  ].map((n) => ({
    id: seedId('notification', n.key),
    userId: demoStudent,
    type: n.type,
    title: n.title,
    body: n.body,
    href: n.href,
    readAt: n.read ? clock.iso(-clock.hours(n.hours - 1)) : null,
    createdAt: clock.iso(-clock.hours(n.hours)),
  }));

  // Backfill comment counts on posts that have seeded discussion activity.
  const commentCountByTarget = new Map<string, number>();
  for (const c of comments) {
    const key = String(c.targetId);
    commentCountByTarget.set(key, (commentCountByTarget.get(key) ?? 0) + 1);
  }

  return {
    profiles: profiles(clock),
    clubs: clubRows,
    club_members: members,
    club_social_links: socials,
    club_follows: follows,
    posts: postRows,
    events: eventRows,
    event_registrations: registrations,
    opportunities: opportunities(clock),
    resources: resources(clock),
    pyq_subjects: subjects,
    pyq_papers: papers,
    pyq_requests: [],
    bookmarks,
    notifications,
    notification_prefs: [],
    ads: ads(clock),
    ad_events: [],
    discussions: discussionRows,
    comments,
    votes,
    reports: reports(clock),
    lost_found: lostFound(clock),
    campus_locations: locations(),
    audit_logs: [
      {
        id: seedId('audit', 'seed'),
        actorId: seedId('profile', 'aarthi'),
        actorName: 'Aarthi Venkatesan',
        action: 'SEED_DATASET_LOADED',
        entityType: 'system',
        entityId: 'seed',
        detail: 'Demo dataset loaded for local development.',
        createdAt: clock.iso(-clock.days(1)),
      },
    ],
    analytics_events: [],
  };
}
