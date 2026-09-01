import { seedId } from './ids';
import { slugify } from '@/lib/sanitize';
import type { Row } from '@/server/db/store';
import type { Clock } from './data';
import { DEMO_NOTICE } from './data';
import { CAMPUS_CONTACTS, OFFICIAL_LINKS } from '@/data/vitap';

/** Demo opportunities, resources, PYQ catalogue, ads and community content. */

const body = (paras: string[]): string => [DEMO_NOTICE, '', ...paras].join('\n\n');

/* --------------------------------------------------------- opportunities */

const OPPS: ReadonlyArray<{
  key: string; title: string; org: string; type: string; deadlineDays: number; location: string;
  remote?: boolean; stipend?: string | null; summary: string; paras: string[]; eligibility: string;
  branches: string[]; years: number[]; tags: string[];
}> = [
  { key: 'summer-swe', title: 'Summer Software Engineering Internship', org: 'Northwind Systems', type: 'INTERNSHIP', deadlineDays: 6, location: 'Hyderabad', stipend: '₹45,000 / month', branches: ['CSE', 'CSE-AI', 'CSE-DS', 'ECE'], years: [3], tags: ['internship', 'backend', 'summer'],
    summary: 'A ten-week internship on backend infrastructure with a mentor and a shipped project at the end.',
    eligibility: 'Third-year students in a computing or electronics branch. No active backlogs. Comfortable in at least one systems language.',
    paras: ['Ten weeks on a backend infrastructure team, with a named mentor and a project scoped to actually ship before you leave.', 'The process is a screening assessment, one systems interview and one project conversation. Prior internship experience is not expected.'] },
  { key: 'research-fellow', title: 'Undergraduate Research Fellowship in Applied Biology', org: 'Coastal Research Institute', type: 'RESEARCH', deadlineDays: 11, location: 'Visakhapatnam', stipend: '₹20,000 / month', branches: ['BIOTECH', 'BSC'], years: [2, 3], tags: ['research', 'biology', 'fellowship'],
    summary: 'An eight-week summer fellowship in a wet lab with a supervising researcher and a publication track.',
    eligibility: 'Second and third-year biology or biotechnology students with completed laboratory coursework.',
    paras: ['Eight weeks in a wet lab attached to an ongoing project, with a supervising researcher and a realistic path to a co-authored abstract.', 'Applications need a statement of interest and one faculty reference. Prior research experience is not required.'] },
  { key: 'nat-hack', title: 'National Open Innovation Hackathon', org: 'Open Innovation Foundation', type: 'HACKATHON', deadlineDays: 3, location: 'Bengaluru', remote: false, stipend: null, branches: [], years: [1, 2, 3, 4], tags: ['hackathon', 'national', 'teams'],
    summary: 'Teams of four across six problem tracks. Travel support for shortlisted teams.',
    eligibility: 'Open to all currently enrolled undergraduates. Teams of up to four from the same institution.',
    paras: ['Six problem tracks spanning healthcare, agriculture, accessibility, climate, logistics and open innovation.', 'Screening is on a written proposal. Shortlisted teams get travel and accommodation support for the on-site finals.'] },
  { key: 'merit-scholarship', title: 'State Merit Scholarship — renewal window', org: 'State Higher Education Council', type: 'SCHOLARSHIP', deadlineDays: 9, location: 'Andhra Pradesh', branches: [], years: [2, 3, 4], tags: ['scholarship', 'merit', 'renewal'],
    summary: 'Annual renewal for existing recipients. Fresh applications also accepted in the same window.',
    eligibility: 'Domicile requirement applies. Minimum aggregate as specified in the scheme document; income ceiling applies to fresh applications.',
    paras: ['The renewal window is open for existing recipients, who need to submit an updated mark sheet and a continuation certificate.', 'Fresh applications are accepted in the same window and require income and domicile documentation.'] },
  { key: 'product-intern', title: 'Product Design Internship', org: 'Meridian Labs', type: 'INTERNSHIP', deadlineDays: 15, location: 'Remote', remote: true, stipend: '₹30,000 / month', branches: ['DESIGN', 'CSE', 'BBA'], years: [2, 3, 4], tags: ['design', 'product', 'remote'],
    summary: 'Remote product design internship working on a live consumer surface with weekly critique.',
    eligibility: 'Any branch. A portfolio showing at least one end-to-end project is required.',
    paras: ['Work on a live consumer surface with a design team, from problem framing through to shipped interface, with weekly critique.', 'A portfolio matters far more than a resume here. One well-explained end-to-end project beats ten screenshots.'] },
  { key: 'campus-ta', title: 'Teaching Assistant — Data Structures', org: 'School of Computer Science', type: 'CAMPUS_JOB', deadlineDays: 5, location: 'On campus', stipend: '₹8,000 / month', branches: ['CSE', 'CSE-AI', 'CSE-DS', 'CSE-CYBER'], years: [3, 4], tags: ['teaching', 'campus', 'part-time'],
    summary: 'Run lab sessions and grading for the data structures course. Around eight hours a week.',
    eligibility: 'Third and fourth-year computing students with an A grade in the course.',
    paras: ['Run lab sessions, hold office hours and handle grading for a section of the data structures course. Around eight hours a week.', 'Selection is on course performance plus a short teaching demonstration.'] },
  { key: 'cloud-cert', title: 'Cloud Practitioner Certification — subsidised cohort', org: 'Campus Learning Cell', type: 'CERTIFICATION', deadlineDays: 8, location: 'On campus', stipend: null, branches: [], years: [2, 3, 4], tags: ['certification', 'cloud', 'subsidised'],
    summary: 'Subsidised exam vouchers plus a six-week preparation cohort with weekly checkpoints.',
    eligibility: 'Open to all branches from second year onward. Attendance in the preparation cohort is mandatory to keep the voucher.',
    paras: ['A six-week preparation cohort with weekly checkpoints, followed by the certification exam on a subsidised voucher.', 'The subsidy is conditional on attendance. Dropping out after the voucher is issued blocks future subsidised cohorts.'] },
  { key: 'analytics-intern', title: 'Data Analytics Internship', org: 'Vantage Retail Group', type: 'INTERNSHIP', deadlineDays: 20, location: 'Chennai', stipend: '₹25,000 / month', branches: ['CSE-DS', 'CSE-AI', 'BBA', 'BSC'], years: [3, 4], tags: ['analytics', 'sql', 'internship'],
    summary: 'Work on demand forecasting and store-level reporting with the central analytics team.',
    eligibility: 'Strong SQL, comfort with a statistical toolkit, and one project involving real data.',
    paras: ['Work alongside the central analytics team on demand forecasting and store-level reporting.', 'The interview is heavily SQL-based plus a case discussion. Bring a project where the data was messy.'] },
  { key: 'robotics-comp', title: 'National Robotics Challenge — team registration', org: 'Robotics Society of India', type: 'COMPETITION', deadlineDays: 25, location: 'Pune', branches: ['MECH', 'ECE', 'EEE', 'CSE'], years: [1, 2, 3, 4], tags: ['robotics', 'competition', 'hardware'],
    summary: 'Autonomous navigation challenge with a build budget cap and an on-site final.',
    paras: ['An autonomous navigation challenge on a fixed arena, with a strict build budget cap declared at registration.', 'Teams must submit a design document at registration. The build window runs for ten weeks before the on-site final.'],
    eligibility: 'Teams of up to six from one institution, any branch, any year.' },
  { key: 'writing-fellow', title: 'Science Communication Fellowship', org: 'Public Understanding Trust', type: 'FELLOWSHIP', deadlineDays: 30, location: 'Remote', remote: true, stipend: '₹15,000 / month', branches: [], years: [2, 3, 4], tags: ['writing', 'science', 'fellowship'],
    summary: 'Write about research for a general audience under editorial mentorship for one semester.',
    eligibility: 'Any branch. Submit two writing samples of any kind.',
    paras: ['A semester-long remote fellowship writing about research for a non-specialist audience, with editorial mentorship on every piece.', 'The application is two writing samples. They do not need to be about science, or published anywhere.'] },
  { key: 'placement-drive-opp', title: 'Campus Placement Drive — Engineering Graduate Programme', org: 'Ashwin Technologies', type: 'PLACEMENT', deadlineDays: 4, location: 'Multiple', stipend: 'As per offer', branches: ['CSE', 'CSE-AI', 'CSE-DS', 'CSE-CYBER', 'ECE', 'EEE'], years: [4], tags: ['placement', 'graduate', 'drive'],
    summary: 'Graduate programme intake. Register through the placement portal within the window.',
    eligibility: 'Final-year students meeting the CGPA cutoff published on the placement portal. Backlog policy applies.',
    paras: ['Intake for the graduate engineering programme. The process is an online assessment, two technical rounds and an HR round.', 'Registration is only through the placement portal. Email registrations are not accepted.'] },
  { key: 'closing-workshop', title: 'Embedded Firmware Masterclass', org: 'Kestrel Electronics', type: 'WORKSHOP', deadlineDays: 2, location: 'On campus', stipend: null, branches: ['ECE', 'EEE', 'MECH'], years: [2, 3, 4], tags: ['embedded', 'firmware', 'masterclass'],
    summary: 'A two-day masterclass on interrupt-driven firmware and low-power design. Closing very soon.',
    eligibility: 'Electronics, electrical and mechanical students who have completed a microcontrollers course.',
    paras: ['Two days on interrupt-driven firmware architecture, timing analysis and low-power design, taught by practising firmware engineers.', 'Boards are provided for the sessions. Places are limited and allocated in application order.'] },
];

export function opportunities(clock: Clock): Row[] {
  return OPPS.map((o, i) => {
    const published = clock.iso(-clock.days(2 + (i % 18)));
    return {
      id: seedId('opportunity', o.key),
      slug: slugify(o.title),
      title: o.title,
      organisation: o.org,
      type: o.type,
      summary: o.summary,
      description: body(o.paras),
      eligibility: o.eligibility,
      location: o.location,
      remote: Boolean(o.remote),
      stipend: o.stipend ?? null,
      applyUrl: `https://example.com/vitpulse-demo/apply/${slugify(o.key)}`,
      deadline: clock.atDay(o.deadlineDays, 23, 59),
      status: 'PUBLISHED',
      tags: o.tags,
      branches: o.branches,
      years: o.years,
      logoUrl: null,
      createdBy: seedId('profile', 'meera'),
      viewCount: 60 + ((i * 197) % 1500),
      clickCount: 5 + ((i * 43) % 320),
      publishedAt: published,
      createdAt: published,
      updatedAt: published,
      demo: true,
    };
  });
}

/* -------------------------------------------------------------- resources */

/**
 * Resources are the *real* VIT-AP systems, documents and offices from
 * `src/data/vitap.ts`, plus the campus contact numbers the university
 * publishes. These are genuine links, not demo content.
 */
export function resources(clock: Clock): Row[] {
  const links = OFFICIAL_LINKS.map((link, i) => ({
    id: seedId('resource', link.url),
    slug: slugify(link.title),
    title: link.title,
    description: link.description,
    category: link.category,
    url: link.url,
    external: true,
    fileType: link.fileType,
    tags: link.title.toLowerCase().split(/[^a-z]+/).filter((t) => t.length > 3).slice(0, 4),
    contact: null,
    status: 'PUBLISHED',
    clickCount: 20 + ((i * 89) % 900),
    createdAt: clock.iso(-clock.days(150 - i)),
    updatedAt: clock.iso(-clock.days(4 + (i % 40))),
    demo: false,
  }));

  // Published institutional phone numbers, surfaced under Emergency so they are
  // one tap away rather than buried in a PDF.
  const contacts = CAMPUS_CONTACTS.map((contact, i) => ({
    id: seedId('resource', `contact-${contact.label}`),
    slug: slugify(contact.label),
    title: contact.label,
    description: `Published university contact number: ${contact.value}`,
    category: 'EMERGENCY',
    url: `tel:${contact.value.replace(/[^0-9+]/g, '')}`,
    external: true,
    fileType: null,
    tags: ['contact', 'phone', 'hostel'],
    contact: contact.value,
    status: 'PUBLISHED',
    clickCount: 10 + i * 7,
    createdAt: clock.iso(-clock.days(120)),
    updatedAt: clock.iso(-clock.days(10)),
    demo: false,
  }));

  return [...links, ...contacts];
}

/* -------------------------------------------------------------------- PYQ */

const SUBJECTS: ReadonlyArray<[code: string, name: string, branch: string, sem: number, credits: number]> = [
  ['CSE1001', 'Problem Solving and Programming', 'CSE', 1, 4],
  ['MAT1001', 'Calculus and Linear Algebra', 'CSE', 1, 4],
  ['PHY1001', 'Engineering Physics', 'CSE', 1, 3],
  ['CSE1002', 'Object Oriented Programming', 'CSE', 2, 4],
  ['MAT1002', 'Differential Equations and Transforms', 'CSE', 2, 4],
  ['CSE2001', 'Data Structures and Algorithms', 'CSE', 3, 4],
  ['CSE2002', 'Computer Organisation and Architecture', 'CSE', 3, 3],
  ['CSE2003', 'Discrete Mathematics', 'CSE', 3, 3],
  ['CSE2004', 'Database Management Systems', 'CSE', 4, 4],
  ['CSE2005', 'Operating Systems', 'CSE', 4, 4],
  ['CSE2006', 'Theory of Computation', 'CSE', 4, 3],
  ['CSE3001', 'Computer Networks', 'CSE', 5, 4],
  ['CSE3002', 'Software Engineering', 'CSE', 5, 3],
  ['CSE3003', 'Design and Analysis of Algorithms', 'CSE', 5, 4],
  ['CSE3004', 'Compiler Design', 'CSE', 6, 4],
  ['CSE3005', 'Machine Learning', 'CSE', 6, 4],
  ['CSE4001', 'Distributed Systems', 'CSE', 7, 3],
  ['CSE4002', 'Cloud Computing', 'CSE', 7, 3],
  ['AIE2001', 'Foundations of Artificial Intelligence', 'CSE-AI', 3, 4],
  ['AIE3001', 'Deep Learning', 'CSE-AI', 5, 4],
  ['AIE3002', 'Natural Language Processing', 'CSE-AI', 6, 3],
  ['DSE2001', 'Probability and Statistics for Data Science', 'CSE-DS', 3, 4],
  ['DSE3001', 'Data Visualisation and Analytics', 'CSE-DS', 5, 3],
  ['CYS3001', 'Network Security', 'CSE-CYBER', 5, 4],
  ['CYS3002', 'Applied Cryptography', 'CSE-CYBER', 6, 3],
  ['ECE1001', 'Basic Electronics Engineering', 'ECE', 1, 3],
  ['ECE2001', 'Signals and Systems', 'ECE', 3, 4],
  ['ECE2002', 'Analog Circuits', 'ECE', 4, 4],
  ['ECE3001', 'Digital Signal Processing', 'ECE', 5, 4],
  ['ECE3002', 'Microcontrollers and Embedded Systems', 'ECE', 5, 4],
  ['ECE3003', 'Communication Systems', 'ECE', 6, 4],
  ['EEE2001', 'Electrical Machines', 'EEE', 3, 4],
  ['EEE3001', 'Power Systems', 'EEE', 5, 4],
  ['MEC1001', 'Engineering Mechanics', 'MECH', 1, 3],
  ['MEC2001', 'Thermodynamics', 'MECH', 3, 4],
  ['MEC3001', 'Fluid Mechanics and Machinery', 'MECH', 5, 4],
  ['CIV2001', 'Structural Analysis', 'CIVIL', 3, 4],
  ['CIV3001', 'Geotechnical Engineering', 'CIVIL', 5, 4],
  ['BIO2001', 'Cell and Molecular Biology', 'BIOTECH', 3, 4],
  ['BIO3001', 'Bioprocess Engineering', 'BIOTECH', 5, 4],
  ['BBA2001', 'Financial Accounting', 'BBA', 3, 3],
  ['BBA3001', 'Marketing Management', 'BBA', 5, 3],
];

const EXAM_MIX: ReadonlyArray<[type: string, slot: string | null]> = [
  ['CAT1', 'A1'], ['CAT2', 'A1'], ['FAT', 'A1'],
  ['CAT1', 'B2'], ['CAT2', 'B2'], ['FAT', 'B2'],
  ['QUIZ', 'C1'], ['FAT', 'C1'], ['MAKEUP', null],
];

export function pyq(clock: Clock): { subjects: Row[]; papers: Row[] } {
  const subjects: Row[] = [];
  const papers: Row[] = [];
  const currentYear = new Date(clock.iso(0)).getFullYear();

  SUBJECTS.forEach(([code, name, branch, sem, credits], si) => {
    const subjectId = seedId('subject', code);
    // Deterministic, varied paper counts so the catalogue looks real.
    const paperCount = 3 + ((si * 7) % 6);
    subjects.push({
      id: subjectId,
      code,
      name,
      branch,
      semester: sem,
      credits,
      faculty: ['Dr. S. Ramesh', 'Dr. P. Kavitha', 'Dr. A. Sundaram', 'Dr. N. Bhavani', 'Dr. R. Gopalan'][si % 5],
      paperCount,
      demo: true,
    });

    for (let i = 0; i < paperCount; i += 1) {
      const [examType, slot] = EXAM_MIX[(si + i) % EXAM_MIX.length]!;
      const year = currentYear - (i % 4);
      papers.push({
        id: seedId('paper', `${code}-${examType}-${year}-${i}`),
        subjectId,
        subjectCode: code,
        subjectName: name,
        branch,
        semester: sem,
        year,
        examType,
        slot,
        fileUrl: `https://example.com/vitpulse-demo/pyq/${code}-${examType}-${year}.pdf`,
        fileSizeBytes: 180_000 + ((si * 9973 + i * 613) % 900_000),
        pageCount: 2 + ((si + i) % 6),
        sourceKind: 'UPLOAD',
        externalId: null,
        status: 'PUBLISHED',
        uploadedBy: seedId('profile', ['rohan', 'sneha', 'arjun', 'priya'][(si + i) % 4]!),
        downloadCount: 15 + ((si * 131 + i * 47) % 1400),
        reportCount: 0,
        createdAt: clock.iso(-clock.days(20 + ((si * 5 + i) % 300))),
        updatedAt: clock.iso(-clock.days(20 + ((si * 5 + i) % 300))),
        demo: true,
      });
    }
  });

  // A handful of uploads waiting in the moderation queue.
  ['CSE3001', 'ECE3002', 'BBA2001'].forEach((code, i) => {
    const subject = SUBJECTS.find((s) => s[0] === code)!;
    papers.push({
      id: seedId('paper', `pending-${code}`),
      subjectId: seedId('subject', code),
      subjectCode: code,
      subjectName: subject[1],
      branch: subject[2],
      semester: subject[3],
      year: currentYear,
      examType: 'CAT2',
      slot: 'A1',
      fileUrl: `https://example.com/vitpulse-demo/pyq/pending-${code}.pdf`,
      fileSizeBytes: 420_000,
      pageCount: 4,
      sourceKind: 'UPLOAD',
      externalId: null,
      status: 'PENDING_REVIEW',
      uploadedBy: seedId('profile', ['sneha', 'arjun', 'priya'][i]!),
      downloadCount: 0,
      reportCount: 0,
      createdAt: clock.iso(-clock.days(1 + i)),
      updatedAt: clock.iso(-clock.days(1 + i)),
      demo: true,
    });
  });

  return { subjects, papers };
}

export { SUBJECTS };
