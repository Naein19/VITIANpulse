import { seedId } from './ids';
import { slugify } from '@/lib/sanitize';
import type { Row } from '@/server/db/store';
import type { Clock } from './data';
import { CLUBS, DEMO_NOTICE } from './data';

/**
 * Demo campus content: posts, events, opportunities, resources, PYQs, ads,
 * discussions, lost & found. All fictional — see the notice in ./data.ts.
 */

const body = (paras: string[]): string => [DEMO_NOTICE, '', ...paras].join('\n\n');

/* ------------------------------------------------------------------ posts */

const POSTS: ReadonlyArray<{
  key: string; title: string; cat: string; imp: string; summary: string; paras: string[];
  club?: string; author: string; ageHours: number; location?: string; tags: string[]; pinned?: boolean;
}> = [
  { key: 'chief-guest', title: 'Chief guest visits VIT-AP for the annual research colloquium', cat: 'GUEST', imp: 'IMPORTANT', author: 'meera', ageHours: 5, location: 'Auditorium', tags: ['research', 'colloquium', 'guest'],
    summary: 'A distinguished guest opened the two-day research colloquium with a keynote on translational research, followed by a student poster walk.',
    paras: [
      'The annual research colloquium opened this morning in the Main Auditorium with a keynote on moving laboratory research into deployed systems. Roughly four hundred students and faculty attended the opening session.',
      'The keynote was followed by a poster walk where forty-two student teams presented work spanning embedded systems, computational biology, materials and applied machine learning. Six posters were shortlisted for the closing session.',
      'Day two continues tomorrow with parallel tracks in AB-2 and the Innovation Centre. Registration desks open at 08:30 and walk-ins are allowed for the plenary sessions only.',
    ] },
  { key: 'state-games', title: 'AP State University Games begin at the Sports Triangle', cat: 'SPORTS', imp: 'NORMAL', author: 'devraj', ageHours: 20, location: 'Sports Triangle', tags: ['sports', 'athletics', 'inter-university'], club: 'sports',
    summary: 'Athletics, football and volleyball fixtures run through the week, with the opening ceremony held on the Sports Triangle ground this morning.',
    paras: [
      'The inter-university games opened this morning with a march past and the lighting of the ceremonial lamp on the Sports Triangle ground. Eleven institutions are participating across nine disciplines.',
      'Track events run from 06:00 to 09:30 each day to avoid the afternoon heat, with team fixtures scheduled in the evening slots. The full fixture board is posted outside the sports complex and updated after each round.',
      'Student volunteers are still needed for scoring and logistics. The Sports Council is coordinating shift sign-ups.',
    ] },
  { key: 'ml-recruitment', title: 'Machine Learning Club opens recruitment for the new cohort', cat: 'CLUB', imp: 'NORMAL', author: 'nithya', ageHours: 30, club: 'aiml', tags: ['recruitment', 'ml', 'club'],
    summary: 'Applications are open for the project track and the paper reading group. No prior ML experience required for first years.',
    paras: [
      'Recruitment is open for two tracks: a project track where members ship a working model over a semester, and a reading group that works through one paper a fortnight.',
      'First-year applicants are assessed on curiosity rather than prior experience. There is a short written round followed by a conversation about something you have built or read.',
      'An introductory session covering what the club actually does runs this week in AB-1. Attendance is not mandatory but is strongly recommended before applying.',
    ] },
  { key: 'genai-workshop', title: 'Hands-on workshop on generative AI announced for Friday', cat: 'EVENT', imp: 'NORMAL', author: 'nithya', ageHours: 44, club: 'aiml', location: 'AB-1 Lab 204', tags: ['workshop', 'genai', 'hands-on'],
    summary: 'A three-hour practical session covering prompt design, retrieval pipelines and evaluation. Bring a laptop; seats are limited to sixty.',
    paras: [
      'The workshop is practical rather than theoretical: participants build a small retrieval-augmented pipeline end to end and then measure it against a held-out set.',
      'Prerequisites are light — comfort with Python and a laptop that can run a notebook. API access for the session is provided by the club.',
      'Seats are capped at sixty because of lab capacity. Registration closes once the cap is reached.',
    ] },
  { key: 'placement-drive', title: 'New placement drive announced for final-year students', cat: 'PLACEMENT', imp: 'IMPORTANT', author: 'aarthi', ageHours: 58, tags: ['placement', 'final-year', 'drive'],
    summary: 'Pre-placement talk followed by an online assessment. Eligibility, CGPA cutoff and the registration window are listed in the placement portal.',
    paras: [
      'A new drive has been opened for final-year students across engineering branches. The process is a pre-placement talk, an online assessment, and two technical rounds followed by an HR round.',
      'Eligibility criteria including the CGPA cutoff and the backlog policy are published on the placement portal. Students must register through the portal — registrations are not accepted by email.',
      'The placement cell will run a mock assessment ahead of the real one. Details are on the placement resources page.',
    ] },
  { key: 'library-hours', title: 'Central Library extends hours through the examination period', cat: 'ACADEMIC', imp: 'NORMAL', author: 'meera', ageHours: 70, location: 'Central Library', tags: ['library', 'exams', 'hours'],
    summary: 'Reading halls stay open until 02:00 for the four weeks around the end-semester examinations.',
    paras: [
      'The first and second floor reading halls will remain open until 02:00 for the four weeks around the end-semester examinations. Circulation counters keep their normal hours.',
      'Entry after 23:00 requires a valid campus ID at the turnstile. Group discussion rooms can be booked in two-hour blocks through the library desk.',
      'The night canteen at the food court extends its hours over the same period.',
    ] },
  { key: 'hostel-maintenance', title: 'Scheduled water maintenance in the ladies’ hostel blocks', cat: 'ALERT', imp: 'URGENT', author: 'devraj', ageHours: 3, location: "Ladies' Hostel Blocks LH-1 and LH-2", tags: ['hostel', 'maintenance', 'water'],
    summary: 'Supply to LH-1 and LH-2 will be interrupted between 10:00 and 14:00 tomorrow for tank cleaning. Store water in advance.',
    paras: [
      'Water supply to the ladies’ hostel blocks will be interrupted between 10:00 and 14:00 tomorrow while the overhead tanks are cleaned and chlorinated.',
      'Residents should store enough water for the interruption window. The ground-floor utility taps in each block will remain connected to the reserve line.',
      'Report any discolouration after supply resumes to the hostel office rather than using the water.',
    ] },
  { key: 'exam-schedule', title: 'End-semester examination schedule published', cat: 'ACADEMIC', imp: 'IMPORTANT', author: 'aarthi', ageHours: 96, tags: ['exams', 'schedule', 'academic'],
    summary: 'The slot-wise timetable is available in the examination section of the resources hub. Check for clashes and raise them within the correction window.',
    paras: [
      'The slot-wise end-semester timetable has been published. Students should verify their own registered courses against the schedule immediately.',
      'Clashes must be raised through the examination cell within the correction window. Requests after the window closes cannot be accommodated.',
      'Hall tickets are released once the no-dues clearance is complete for the semester.',
    ] },
  { key: 'ecell-demo', title: 'E-Cell demo night showcases nine student ventures', cat: 'CAMPUS', imp: 'NORMAL', author: 'lakshmi', ageHours: 120, club: 'ecell', location: 'Innovation & Incubation Centre', tags: ['startup', 'demo', 'ecell'],
    summary: 'Nine teams from the pre-incubation cohort pitched to a panel of founders. Three were selected for continued mentoring.',
    paras: [
      'Nine teams from this semester\'s pre-incubation cohort presented at demo night. Pitches covered campus logistics, agritech, assistive hardware and two developer-tooling ideas.',
      'A panel of four founders and one early-stage investor gave feedback after each pitch. Three teams were selected for a continued mentoring track next semester.',
      'Applications for the next cohort open at the start of the coming semester and are open to all years and all schools.',
    ] },
  { key: 'ctf-results', title: 'Cybersecurity Club wraps up the internal capture-the-flag', cat: 'CLUB', imp: 'NORMAL', author: 'imran', ageHours: 150, club: 'cyber', tags: ['ctf', 'security', 'results'],
    summary: 'Thirty-one teams solved challenges across web, reversing and forensics on club-owned lab infrastructure.',
    paras: [
      'The internal capture-the-flag ran over a weekend with thirty-one teams participating. Categories covered web exploitation, reverse engineering, forensics and cryptography.',
      'All challenges ran on club-owned lab infrastructure under the university acceptable-use policy. Write-ups for every challenge have been published to the club repository.',
      'A beginner track with guided hints ran alongside the main event and drew a strong first-year turnout.',
    ] },
  { key: 'green-audit', title: 'Campus waste audit results published by Green Campus Initiative', cat: 'CAMPUS', imp: 'NORMAL', author: 'lakshmi', ageHours: 190, club: 'green', tags: ['sustainability', 'audit', 'campus'],
    summary: 'A month-long audit found that segregation compliance is highest in the academic blocks and lowest in the hostel corridors.',
    paras: [
      'Volunteers sampled waste streams across academic blocks, hostels and food outlets over four weeks and categorised them by stream.',
      'Segregation compliance was highest in the academic blocks and lowest in hostel corridors, where mixed disposal dominated. Food outlets showed the largest volume of avoidable single-use packaging.',
      'The group has proposed floor-level segregation stations in hostels and is collecting signatures ahead of a proposal to the administration.',
    ] },
  { key: 'bus-schedule', title: 'Revised campus shuttle timings take effect from Monday', cat: 'ANNOUNCEMENT', imp: 'IMPORTANT', author: 'devraj', ageHours: 26, tags: ['transport', 'shuttle', 'timings'],
    summary: 'Two additional evening trips have been added on the city route and the morning frequency has increased during peak hours.',
    paras: [
      'The shuttle schedule has been revised following the usage survey run last month. Morning frequency increases during the 07:30 to 09:00 peak.',
      'Two additional evening trips have been added to the city route, with the last departure moved later. Weekend timings are unchanged.',
      'The updated timetable is posted at every stop and in the resources hub under important links.',
    ] },
  { key: 'design-crit', title: 'Design Collective opens weekly crit sessions to all students', cat: 'CLUB', imp: 'NORMAL', author: 'lakshmi', ageHours: 210, club: 'design', tags: ['design', 'crit', 'open'],
    summary: 'Bring any work in progress — an interface, a poster, a portfolio — and get structured feedback in a thirty-minute slot.',
    paras: [
      'Weekly crit sessions are now open to non-members. Bring work in progress in any medium and get a structured thirty-minute critique.',
      'The format is deliberately blunt but kind: what is the work trying to do, is it doing it, and what is the single highest-leverage change.',
      'Slots are booked on a first-come basis and fill quickly. Portfolio reviews for placement season get priority in the last hour.',
    ] },
  { key: 'hackathon-team', title: 'Campus teams shortlisted for the national hackathon finals', cat: 'CAMPUS', imp: 'IMPORTANT', author: 'aarthi', ageHours: 240, tags: ['hackathon', 'national', 'shortlist'], club: 'coding',
    summary: 'Four teams from campus advanced past the screening round and will travel for the on-site finals next month.',
    paras: [
      'Four teams cleared the national hackathon screening round out of the nineteen that submitted from campus. Problem statements span healthcare logistics, agricultural forecasting and accessibility tooling.',
      'The finals are held on-site next month. Travel and accommodation support is being coordinated through the Innovation Centre.',
      'Teams looking for mentors ahead of the finals can reach the Coding Club, which is running practice reviews.',
    ] },
  { key: 'library-database', title: 'New journal database added to library digital resources', cat: 'ACADEMIC', imp: 'NORMAL', author: 'meera', ageHours: 300, location: 'Central Library', tags: ['library', 'research', 'journals'],
    summary: 'Full-text access to an additional engineering and applied-sciences collection is now available on the campus network.',
    paras: [
      'An additional journal collection covering engineering and applied sciences is now available through the library portal on the campus network.',
      'Off-campus access works through the library proxy using campus credentials. Instructions are in the resources hub under the library section.',
      'The library is running short orientation sessions on literature search and citation management for final-year project students.',
    ] },
  { key: 'blood-drive', title: 'Blood donation drive at the health centre this week', cat: 'ANNOUNCEMENT', imp: 'NORMAL', author: 'lakshmi', ageHours: 62, club: 'nss', location: 'Health Centre', tags: ['health', 'donation', 'outreach'],
    summary: 'Registration desk opens at 09:00 daily. Eligibility screening is done on site before donation.',
    paras: [
      'A blood-donation drive runs at the health centre this week in coordination with a regional blood bank. The registration desk opens at 09:00 each day.',
      'Eligibility screening including haemoglobin and blood-pressure checks is done on site before donation. Bring a campus ID.',
      'Donors are given a rest period and refreshments afterwards, and are advised to skip strenuous activity for the rest of the day.',
    ] },
  { key: 'robotics-lab', title: 'Robotics Club build lab reopens with new equipment', cat: 'CLUB', imp: 'NORMAL', author: 'kabir', ageHours: 330, club: 'robotics', location: 'AB-2 Workshop', tags: ['robotics', 'lab', 'equipment'],
    summary: 'The lab has reopened after refit with additional 3D printers, a laser cutter and a reflow station.',
    paras: [
      'The build lab has reopened after a refit. New equipment includes two additional 3D printers, a laser cutter and a reflow station for surface-mount work.',
      'Lab access requires completing a short safety induction. Inductions run twice weekly and take about forty minutes.',
      'Teams preparing for the rover entry get priority booking on the machining slots through the season.',
    ] },
  { key: 'photo-exhibit', title: 'Photography Club print exhibition opens in the main gallery', cat: 'CAMPUS', imp: 'NORMAL', author: 'lakshmi', ageHours: 400, club: 'photo', tags: ['photography', 'exhibition', 'culture'],
    summary: 'Sixty prints selected from a year of campus photowalks are on display for two weeks.',
    paras: [
      'Sixty prints selected from a year of photowalks are on display in the main gallery for the next two weeks. The theme this year is everyday campus.',
      'All prints were produced in the club darkroom and printing sessions. A short note beside each print records the settings and the story.',
      'The gallery is open through the day and entry is free.',
    ] },
];

export function posts(clock: Clock): Row[] {
  return POSTS.map((p, i) => {
    const published = clock.iso(-clock.hours(p.ageHours));
    return {
      id: seedId('post', p.key),
      slug: slugify(p.title),
      title: p.title,
      summary: p.summary,
      body: body(p.paras),
      category: p.cat,
      importance: p.imp,
      status: 'PUBLISHED',
      coverImageUrl: null,
      coverImageAlt: null,
      source: 'VITPulse Demo Desk',
      location: p.location ?? null,
      eventDate: null,
      tags: p.tags,
      authorId: seedId('profile', p.author),
      clubId: p.club ? seedId('club', p.club) : null,
      viewCount: 120 + ((i * 271) % 2400),
      reactionCount: 4 + ((i * 17) % 90),
      commentCount: 0,
      pinned: Boolean(p.pinned),
      publishedAt: published,
      expiresAt: null,
      createdAt: published,
      updatedAt: published,
      demo: true,
    };
  });
}

/* ----------------------------------------------------------------- events */

const EVENTS: ReadonlyArray<{
  key: string; title: string; cat: string; club?: string; dayOffset: number; startHour: number; hours: number;
  /** Hours from "now" — used instead of `startHour` so today's board is always live. */
  liveOffset?: number;
  venue: string; location?: string; summary: string; paras: string[]; seats?: number; taken?: number;
  paid?: number; regRequired?: boolean; featured?: boolean; tags: string[]; school?: string;
}> = [
  { key: 'genai', title: 'Generative AI Systems: a hands-on build', cat: 'WORKSHOP', club: 'aiml', dayOffset: 4, startHour: 14, hours: 3, venue: 'AB-1 · Lab 204', location: 'ab1-sarvepalli-radhakrishnan-block', seats: 60, taken: 47, regRequired: true, featured: true, tags: ['genai', 'python', 'hands-on'], school: 'SCOPE',
    summary: 'Build a retrieval-augmented pipeline end to end, then evaluate it against a held-out set.',
    paras: ['A practical three-hour session. You will build a small retrieval pipeline, wire an evaluation harness around it, and measure the difference your changes actually make.', 'Bring a laptop that can run a notebook. API access for the session is provided. Comfort with Python is assumed; no ML background needed.'] },
  { key: 'hackathon', title: 'Pulse Hack 36 — a 36-hour campus hackathon', cat: 'HACKATHON', club: 'coding', dayOffset: 12, startHour: 9, hours: 36, venue: 'Innovation & Incubation Centre', location: 'incubation-centre', seats: 240, taken: 186, regRequired: true, featured: true, tags: ['hackathon', 'overnight', 'teams'], school: 'SCOPE',
    summary: 'Teams of up to four build for thirty-six hours across four tracks, with mentors on the floor throughout.',
    paras: ['Four tracks: campus utility, health, sustainability and open innovation. Teams of up to four, at least one first or second year per team.', 'Mentors from the Innovation Centre and alumni engineers are on the floor for the whole run. Hardware from the robotics lab can be borrowed with prior notice.', 'Meals and a rest area are provided. Judging is on working demos, not slides.'] },
  { key: 'today-colloquium', title: 'Annual Research Colloquium — opening day', cat: 'ACADEMIC', dayOffset: 0, startHour: 9, hours: 3, liveOffset: -0.75, venue: 'Auditorium', location: 'auditorium', regRequired: false, featured: true, tags: ['research', 'colloquium', 'poster'], school: 'SCOPE',
    summary: 'Keynote on translational research followed by a forty-two team student poster walk.',
    paras: ['The colloquium opens with a keynote on moving laboratory research into deployed systems, followed by a poster walk across four thematic zones.', 'Open to all students and faculty. The poster walk in particular is worth an hour of anyone\'s time, whatever their branch.'] },
  { key: 'today-recruitment', title: 'Coding Club intro session — what we actually do', cat: 'CLUB_RECRUITMENT', club: 'coding', dayOffset: 0, startHour: 17, hours: 2, liveOffset: 3, venue: 'AB-1 · Lab 108', location: 'ab1-sarvepalli-radhakrishnan-block', seats: 90, taken: 63, regRequired: false, tags: ['recruitment', 'intro', 'coding'],
    summary: 'An honest walkthrough of the contest ladder, the open-source sprint and the time commitment.',
    paras: ['A straight description of what membership involves: the weekly contest ladder, the open-source sprint, and roughly how many hours a week each track really takes.', 'Attend before applying. It is far easier to decide the club is not for you now than in week eight.'] },
  { key: 'today-match', title: 'Inter-hostel volleyball — league fixture', cat: 'SPORTS', club: 'sports', dayOffset: 0, startHour: 18, hours: 2, liveOffset: 5, venue: 'New Basketball Court', location: 'basketball-court', regRequired: false, tags: ['volleyball', 'inter-hostel', 'league'],
    summary: 'Two league fixtures back to back under floodlights. Free entry.',
    paras: ['Two league fixtures back to back on the indoor courts. Standings are updated on the board outside the complex after each round.', 'Free entry, no registration. Supporters welcome.'] },
  { key: 'today-library', title: 'Literature search and citation clinic', cat: 'WORKSHOP', dayOffset: 0, startHour: 14, hours: 2, liveOffset: 1.5, venue: 'Central Library · Seminar Room', location: 'library', seats: 25, taken: 19, regRequired: true, tags: ['library', 'research', 'citation'],
    summary: 'A practical clinic on searching the journal databases and managing citations for final-year projects.',
    paras: ['Covers searching the subscribed journal databases properly, setting up alerts, and running a citation manager so your bibliography is not a last-week panic.', 'Aimed at final-year project students, but open to anyone starting a literature review.'] },
  { key: 'colloquium', title: 'Research Colloquium — day two parallel tracks', cat: 'ACADEMIC', dayOffset: 1, startHour: 9, hours: 8, venue: 'AB-2 & the Innovation & Incubation Centre', location: 'ab2-apj-abdul-kalam-block', regRequired: false, tags: ['research', 'colloquium'], school: 'SCOPE',
    summary: 'Parallel tracks across embedded systems, computational biology, materials and applied machine learning.',
    paras: ['Day two runs parallel tracks with fifteen-minute student presentations and a closing session for the shortlisted posters.', 'Walk-ins are allowed for the plenary sessions. Track rooms have limited seating and prioritise registered attendees.'] },
  { key: 'cc-contest', title: 'Weekly Contest #34 — Coding Club ladder', cat: 'COMPETITION', club: 'coding', dayOffset: 3, startHour: 19, hours: 2, venue: 'AB-1 · Lab 108', location: 'ab1-sarvepalli-radhakrishnan-block', seats: 120, taken: 88, regRequired: true, tags: ['contest', 'dsa', 'weekly'],
    summary: 'Two hours, six problems, rated on the club ladder. Editorial session immediately after.',
    paras: ['Six problems spanning implementation through graph algorithms. Rated on the internal ladder, which seeds the campus team for external contests.', 'An editorial walkthrough runs right after the contest. Attending the editorial is where most of the learning happens.'] },
  { key: 'ecell-pitch', title: 'Pitch Bootcamp — from idea to a ten-slide story', cat: 'WORKSHOP', club: 'ecell', dayOffset: 6, startHour: 16, hours: 3, venue: 'Central Block · VSB Seminar Hall', location: 'central-block', seats: 80, taken: 34, regRequired: true, tags: ['startup', 'pitch', 'bootcamp'], school: 'VSB',
    summary: 'Structure a pitch, cut it to ten slides, then defend it in a mock Q&A with the panel.',
    paras: ['The session covers pitch narrative structure, what a panel actually listens for, and the numbers you must know cold.', 'The second half is a live mock Q&A. Bring an idea in any state of readiness — half-formed is fine and often more useful.'] },
  { key: 'guest-lecture', title: 'Guest Lecture: designing systems that survive contact with users', cat: 'GUEST_LECTURE', club: 'ieee', dayOffset: 2, startHour: 11, hours: 2, venue: 'Auditorium', location: 'auditorium', regRequired: false, featured: true, tags: ['systems', 'guest', 'engineering'], school: 'SENSE',
    summary: 'An industry engineer on the gap between a system that passes tests and one that survives real traffic.',
    paras: ['A talk on operational reality: what breaks first, why load tests lie, and how teams build the instincts to see failure coming.', 'Open to all years and branches. Q&A for the last thirty minutes, followed by informal discussion outside the auditorium.'] },
  { key: 'cultural-night', title: 'Rhythms — inter-club cultural night', cat: 'CULTURAL', club: 'dance', dayOffset: 15, startHour: 18, hours: 4, venue: 'Auditorium · Open Air Stage', location: 'auditorium', regRequired: false, featured: true, tags: ['cultural', 'dance', 'music'],
    summary: 'Four dance crews, three bands and a drama short across an evening on the auditorium open air stage.',
    paras: ['The semester cultural showcase brings together the dance crews, the music club bands and a short piece from the drama society.', 'Free entry, open seating from 17:30. The food court stalls stay open through the event.'] },
  { key: 'chess-blitz', title: 'Friday Blitz Night', cat: 'SPORTS', club: 'chess', dayOffset: 4, startHour: 19, hours: 3, venue: 'Central Block · Seminar Hall', location: 'central-block', seats: 64, taken: 41, regRequired: true, tags: ['chess', 'blitz', 'weekly'],
    summary: 'Seven-round Swiss at five minutes plus three. Boards and clocks provided.',
    paras: ['A seven-round Swiss blitz event. Ratings are internal to the club ladder and reset each semester.', 'Beginners are genuinely welcome — the bottom half of the field is mostly people who learned the moves this year.'] },
  { key: 'football-final', title: 'Inter-hostel football final', cat: 'SPORTS', club: 'sports', dayOffset: 7, startHour: 17, hours: 2, venue: 'Sports Triangle', location: 'sports-triangle', regRequired: false, tags: ['football', 'inter-hostel', 'final'],
    summary: 'The two group winners meet under floodlights for the inter-hostel title.',
    paras: ['The final of the inter-hostel league. Extra time and penalties if level at full time.', 'Free entry. Supporters are asked to stay behind the boundary rope.'] },
  { key: 'ctf', title: 'Capture the Flag — beginner and open tracks', cat: 'COMPETITION', club: 'cyber', dayOffset: 18, startHour: 10, hours: 12, venue: 'AB-1 · Lab 204', location: 'ab1-sarvepalli-radhakrishnan-block', seats: 100, taken: 52, regRequired: true, tags: ['ctf', 'security', 'competition'], school: 'SCOPE',
    summary: 'Web, reversing, forensics and crypto challenges on club lab infrastructure. Guided beginner track alongside.',
    paras: ['Two parallel tracks: an open track for experienced players and a guided beginner track with staged hints and a walkthrough at the end.', 'All challenges run on club-owned lab infrastructure under the university acceptable-use policy. Attacking anything outside the range is disqualifying.'] },
  { key: 'robotics-intro', title: 'Build lab safety induction and open house', cat: 'WORKSHOP', club: 'robotics', dayOffset: 5, startHour: 15, hours: 2, venue: 'AB-2 · Workshop', location: 'ab2-apj-abdul-kalam-block', seats: 40, taken: 29, regRequired: true, tags: ['robotics', 'safety', 'induction'], school: 'SMEC',
    summary: 'Complete the safety induction and get lab access, then tour the new equipment.',
    paras: ['A forty-minute safety induction covering the machining tools, the laser cutter and the reflow station, followed by an open house.', 'Completing the induction is required for lab access. Closed footwear is mandatory.'] },
  { key: 'mun', title: 'Model United Nations — training weekend', cat: 'COMPETITION', club: 'lit', dayOffset: 20, startHour: 9, hours: 9, venue: 'Central Block · Lecture Theatres', location: 'central-block', seats: 150, taken: 61, regRequired: true, tags: ['mun', 'debate', 'training'],
    summary: 'Rules of procedure, position-paper writing and two practice committee sessions.',
    paras: ['A full training weekend for first-time delegates: rules of procedure, how to write a position paper, and two practice committees with live chairing.', 'Experienced delegates are welcome as chairs and will get feedback on chairing rather than delegating.'] },
  { key: 'astro-night', title: 'Observation night — outer planets', cat: 'TECHNICAL', club: 'astro', dayOffset: 9, startHour: 21, hours: 4, venue: 'Central Block · Rooftop', location: 'central-block', seats: 50, taken: 50, regRequired: true, tags: ['astronomy', 'observation', 'night'],
    summary: 'Club telescopes set up on the Central Block rooftop. Weather dependent; a call is made at 18:00.',
    paras: ['Two reflectors and a refractor set up on the rooftop, targeting the outer planets and a couple of deep-sky objects if conditions allow.', 'Weather dependent — a go/no-go call is posted at 18:00 on the day. Bring a jacket; the roof gets cold.'] },
  { key: 'recruitment-drive', title: 'Club recruitment fair — meet twenty student organisations', cat: 'CLUB_RECRUITMENT', dayOffset: 8, startHour: 10, hours: 6, venue: 'Rock Plaza', location: 'rock-plaza', regRequired: false, featured: true, tags: ['recruitment', 'clubs', 'fair'],
    summary: 'Every recruiting club sets up a stall for a day. Talk to people before you fill any form.',
    paras: ['All currently recruiting clubs set up stalls around the food court plaza for the day. This is the fastest way to work out which ones fit you.', 'Bring questions rather than a resume. Most clubs are looking for people who will actually show up, not credentials.'] },
  { key: 'placement-talk', title: 'Pre-placement talk and process briefing', cat: 'PLACEMENT', dayOffset: 10, startHour: 14, hours: 2, venue: 'Auditorium', location: 'auditorium', seats: 800, taken: 612, regRequired: true, tags: ['placement', 'briefing', 'final-year'],
    summary: 'Process overview, eligibility criteria and the assessment format for the upcoming drive.',
    paras: ['The placement cell walks through the full process, eligibility criteria, the assessment format and the timeline for the upcoming drive.', 'Attendance is recorded and is a prerequisite for registering for this drive.'] },
  { key: 'music-openmic', title: 'Open Mic Night', cat: 'CULTURAL', club: 'music', dayOffset: 11, startHour: 19, hours: 3, venue: 'Auditorium · Open Air Stage', location: 'auditorium', regRequired: false, tags: ['music', 'openmic', 'culture'],
    summary: 'Sign up on the night for a seven-minute slot. Any instrument, any language, any level.',
    paras: ['Sign-up sheet opens at the open air stage at 18:30 for seven-minute slots. Backline and a PA are provided.', 'Poetry and spoken word are welcome alongside music. Genuinely all levels — the crowd is kind.'] },
  { key: 'design-portfolio', title: 'Portfolio review clinic for placement season', cat: 'WORKSHOP', club: 'design', dayOffset: 13, startHour: 15, hours: 3, venue: 'Innovation & Incubation Centre · Studio', location: 'incubation-centre', seats: 30, taken: 30, regRequired: true, tags: ['design', 'portfolio', 'placement'],
    summary: 'Thirty-minute one-on-one reviews of design and engineering portfolios ahead of the drive.',
    paras: ['One-on-one thirty-minute reviews with club seniors and one visiting practitioner. Bring the portfolio you would actually send.', 'All slots are booked, but a waitlist runs on the day and cancellations are common.'] },
  { key: 'green-drive', title: 'E-waste collection drive', cat: 'TECHNICAL', club: 'green', dayOffset: 14, startHour: 10, hours: 7, venue: 'Central Block · Forecourt', location: 'central-block', regRequired: false, tags: ['sustainability', 'ewaste', 'drive'],
    summary: 'Drop off dead electronics for certified recycling. Data-bearing devices are wiped on site.',
    paras: ['Bring dead chargers, cables, batteries, drives and small electronics for certified recycling through a registered handler.', 'Data-bearing devices are wiped on site in front of you before being handed over.'] },
  { key: 'quiz', title: 'The General Quiz', cat: 'COMPETITION', club: 'lit', dayOffset: 16, startHour: 17, hours: 3, venue: 'Central Block · LT-2', location: 'central-block', seats: 90, taken: 44, regRequired: true, tags: ['quiz', 'general', 'teams'],
    summary: 'Teams of three, written prelims then eight teams on stage. No subject specialisation needed.',
    paras: ['Teams of three. A written prelim of twenty-five questions, then the top eight play the stage final.', 'Deliberately broad — history, sport, film, science, the internet. Specialists have no particular advantage.'] },
  { key: 'drama', title: 'Improv Night — no audition, just show up', cat: 'CULTURAL', club: 'drama', dayOffset: 17, startHour: 19, hours: 2, venue: 'AB-1 · Seminar Hall', location: 'ab1-sarvepalli-radhakrishnan-block', regRequired: false, tags: ['drama', 'improv', 'open'],
    summary: 'Short-form improv games, open to complete beginners. Watching is also entirely acceptable.',
    paras: ['Short-form improv games run by the drama society. Anyone can join a game; watching is completely fine too.', 'No preparation, no audition, no experience needed. This is the least intimidating thing the society runs.'] },
  { key: 'past-fest', title: 'Convergence — the annual technical festival', cat: 'TECHNICAL', dayOffset: -22, startHour: 9, hours: 30, venue: 'Campus-wide', location: 'central-block', regRequired: false, tags: ['festival', 'technical', 'annual'],
    summary: 'Three days of competitions, exhibits and talks across every school. Concluded last month.',
    paras: ['The annual technical festival ran across the campus with sixty events, an exhibition hall and a talks track.', 'Results and the event archive are available on the festival page.'] },
  { key: 'past-workshop', title: 'Embedded systems bootcamp', cat: 'WORKSHOP', club: 'ieee', dayOffset: -14, startHour: 10, hours: 6, venue: 'AB-2 · Lab 301', location: 'ab2-apj-abdul-kalam-block', seats: 45, taken: 45, regRequired: true, tags: ['embedded', 'bootcamp', 'past'],
    summary: 'A full-day bootcamp on microcontroller firmware, completed last fortnight.',
    paras: ['A full-day bootcamp taking participants from a blinking LED to an interrupt-driven sensor pipeline.', 'Materials from the session are archived in the club repository.'] },
  { key: 'past-marathon', title: 'Campus 10K run', cat: 'SPORTS', club: 'sports', dayOffset: -8, startHour: 6, hours: 4, venue: 'Sports Triangle', location: 'sports-triangle', regRequired: true, seats: 400, taken: 356, tags: ['running', '10k', 'past'],
    summary: 'A 10K and a 5K route around the campus perimeter, held last week.',
    paras: ['Three hundred and fifty-six runners completed the 10K or 5K routes around the campus perimeter.', 'Timing chips and results were handled by the sports council; results are on the notice board.'] },
];

export function events(clock: Clock): Row[] {
  return EVENTS.map((e, i) => {
    const startsAt =
      e.liveOffset === undefined
        ? clock.atDay(e.dayOffset, e.startHour, 0)
        : clock.todayAt(e.liveOffset);
    const endsAt = new Date(Date.parse(startsAt) + e.hours * 3_600_000).toISOString();
    const published = clock.iso(-clock.days(3 + (i % 25)));
    return {
      id: seedId('event', e.key),
      slug: slugify(e.title),
      title: e.title,
      summary: e.summary,
      description: body(e.paras),
      category: e.cat,
      status: 'PUBLISHED',
      posterUrl: null,
      posterAlt: null,
      clubId: e.club ? seedId('club', e.club) : null,
      organiser: CLUBS.find((c) => c.key === e.club)?.name ?? 'VITPulse Demo Desk',
      school: e.school ?? null,
      venue: e.venue,
      locationId: e.location ? seedId('location', e.location) : null,
      startsAt,
      endsAt,
      registrationRequired: Boolean(e.regRequired),
      registrationUrl: e.regRequired ? null : null,
      registrationDeadline: e.regRequired ? clock.atDay(Math.max(e.dayOffset - 1, e.dayOffset), 23, 59) : null,
      seats: e.seats ?? null,
      seatsTaken: e.taken ?? 0,
      isPaid: Boolean(e.paid),
      feeInr: e.paid ?? 0,
      tags: e.tags,
      contactEmail: null,
      createdBy: seedId('profile', 'meera'),
      viewCount: 80 + ((i * 331) % 3100),
      featured: Boolean(e.featured),
      publishedAt: published,
      createdAt: published,
      updatedAt: published,
      demo: true,
    };
  });
}

export { EVENTS, POSTS };
