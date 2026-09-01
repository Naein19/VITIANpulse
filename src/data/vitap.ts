/**
 * Verified VIT-AP institutional data.
 *
 * Everything in this file was gathered from VIT-AP's own public web presence
 * and is factual, unlike `src/seed/` which holds clearly-marked demo content.
 *
 * Sources (all public, all vitap.ac.in unless noted):
 *   - Homepage .............................. schools, programmes, portals
 *   - /clubs-and-chapters ................... club and chapter names
 *   - /hostels .............................. hostel blocks, offices, fees
 *   - /academiccalender ..................... Fall 2026-27 calendars
 *   - /Campustour/index04.html .............. building names and descriptions
 *   - footer "How to reach" Google Maps link. campus coordinates
 *
 * VERIFIED_ON records when this was last checked. Anything time-sensitive
 * (calendar dates, recruitment windows) should be re-checked against the
 * source before a new academic year.
 */

export const VERIFIED_ON = '2026-08-31';

export const UNIVERSITY = {
  name: 'VIT-AP University',
  shortName: 'VIT-AP',
  addressLines: ['VIT-AP University, Amaravati', 'Beside AP Secretariat', 'Andhra Pradesh 522241', 'India'],
  /** From the university's own "How to reach VIT-AP" map link. */
  coordinates: { lat: 16.4970554, lng: 80.4991965 },
  mapsUrl: 'https://www.google.com/maps/place/VIT-AP+University/@16.4970554,80.4991965,17z',
  website: 'https://vitap.ac.in',
  motto: 'INDIA should lead the world. VIT should lead India',
} as const;

/* ---------------------------------------------------------------- schools */

/**
 * The eight schools, with the codes VIT-AP itself uses in its URLs
 * (vitap.ac.in/allschools/<code>).
 */
export const SCHOOLS_INFO = [
  { code: 'SCOPE', name: 'School of Computer Science and Engineering', slug: 'scope' },
  { code: 'SENSE', name: 'School of Electronics Engineering', slug: 'sense' },
  { code: 'SMEC', name: 'School of Mechanical Engineering', slug: 'smec' },
  { code: 'SAS', name: 'School of Advanced Sciences', slug: 'sas' },
  { code: 'VISH', name: 'School of Social Sciences and Humanities', slug: 'vish' },
  { code: 'VSB', name: 'School of Business', slug: 'vsb' },
  { code: 'VSL', name: 'School of Law', slug: 'vsl' },
  { code: 'SBST', name: 'School of Bio Sciences and Technology', slug: 'sbst' },
] as const;

/* ------------------------------------------------------------- programmes */

/**
 * Undergraduate programmes actually offered, as listed on the homepage.
 * `code` is the short form students use; `school` links to SCHOOLS_INFO.
 */
export const PROGRAMMES = [
  { code: 'CSE', name: 'B.Tech. Computer Science and Engineering', school: 'SCOPE' },
  { code: 'CSE-AIML', name: 'B.Tech. CSE (Artificial Intelligence and Machine Learning)', school: 'SCOPE' },
  { code: 'CSE-BLOCKCHAIN', name: 'B.Tech. CSE (Blockchain)', school: 'SCOPE' },
  { code: 'CSE-CYBER', name: 'B.Tech. CSE (Cyber Security)', school: 'SCOPE' },
  { code: 'CSE-DA', name: 'B.Tech. CSE (Data Analytics)', school: 'SCOPE' },
  { code: 'CSE-SE', name: 'B.Tech. CSE (Software Engineering)', school: 'SCOPE' },
  { code: 'CSBS', name: 'B.Tech. Computer Science and Business Systems', school: 'SCOPE' },
  { code: 'ECE', name: 'B.Tech. Electronics and Communication Engineering', school: 'SENSE' },
  { code: 'ECE-EMBEDDED', name: 'B.Tech. ECE (Embedded Systems)', school: 'SENSE' },
  { code: 'ECE-VLSI', name: 'B.Tech. ECE (VLSI)', school: 'SENSE' },
  { code: 'EEE', name: 'B.Tech. Electrical and Electronics Engineering', school: 'SENSE' },
  { code: 'ECM', name: 'B.Tech. Electronics and Computer Engineering', school: 'SENSE' },
  { code: 'MECH', name: 'B.Tech. Mechanical Engineering', school: 'SMEC' },
  { code: 'MECH-AUTO', name: 'B.Tech. Mechanical Engineering (Automotive Design)', school: 'SMEC' },
  { code: 'MECH-ROBOTICS', name: 'B.Tech. Mechanical Engineering (Robotics)', school: 'SMEC' },
  { code: 'BIOTECH', name: 'B.Tech. Biotechnology', school: 'SBST' },
  { code: 'BBA', name: 'BBA', school: 'VSB' },
  { code: 'BCOM', name: 'B.Com Finance', school: 'VSB' },
  { code: 'BSC-STATS', name: 'B.Sc. Applied Statistics and Analytics', school: 'SAS' },
  { code: 'BSC-PSYCH', name: 'B.Sc. Psychology', school: 'VISH' },
  { code: 'LAW', name: 'B.B.A. LL.B. (Hons.)', school: 'VSL' },
  { code: 'MTECH', name: 'M.Tech.', school: 'SCOPE' },
  { code: 'MBA', name: 'MBA', school: 'VSB' },
  { code: 'PHD', name: 'Ph.D.', school: 'SCOPE' },
] as const;

/* ------------------------------------------------------ campus locations */

/**
 * Campus buildings and facilities.
 *
 * Two public sources, and every row records which one gave its coordinate:
 *
 *   - Names, descriptions and opening hours come from VIT-AP's own 360 campus
 *     tour and facilities pages.
 *   - `lat`/`lng` come from OpenStreetMap (ODbL), read from the mapped campus at
 *     16.4911-16.4971 N, 80.4947-80.5018 E — except the main gate, which uses
 *     the university's own published point.
 *
 * Seven entries carry no coordinate: neither source places them, and guessing
 * would be fabrication. They stay in the directory and are listed on the map as
 * unplaced rather than dropped or invented.
 *
 * The real plan is not the symmetric one the aerial photograph suggests: AB-1
 * is east and AB-2 west of the lawn, the eleven-storey Central Block sits south
 * of both, the gate is at the north, and the hostels occupy the south — the
 * men's blocks east, the women's blocks west.
 */
export interface VitapLocation {
  slug: string;
  name: string;
  shortName: string;
  category:
    | 'ACADEMIC' | 'HOSTEL' | 'LIBRARY' | 'FOOD' | 'SPORTS'
    | 'AUDITORIUM' | 'ADMIN' | 'MEDICAL' | 'SERVICE' | 'PARKING';
  description: string;
  timings: string | null;
  contact: string | null;
  /** Real WGS84 coordinates, or null when no public source gives them. */
  lat: number | null;
  lng: number | null;
  /** Storeys, where OpenStreetMap records `building:levels`. */
  levels: number | null;
  /** Where the coordinate came from, so the claim is auditable. */
  coordSource: 'VITAP' | 'OSM' | null;
  /** The same point projected into the 0-100 schematic plan, or null. */
  mapX: number | null;
  mapY: number | null;
  tags: string[];
}

export const CAMPUS_LOCATIONS: readonly VitapLocation[] = [
  {
    slug: 'main-entrance',
    name: 'Main Entrance',
    shortName: 'Gate',
    category: 'SERVICE',
    description:
      'The main gate on the northern edge of campus, off the road that connects to NH-16. Security check, visitor registration and the drop-off point for cabs and buses.',
    timings: '24 hours',
    contact: null,
    lat: 16.4970554,
    lng: 80.4991965,
    levels: null,
    coordSource: 'VITAP',
    mapX: 52.5,
    mapY: 6.9,
    tags: ['gate', 'entrance', 'security', 'visitors'],
  },
  {
    slug: 'visitor-parking',
    name: 'Visitor Parking',
    shortName: 'Parking',
    category: 'PARKING',
    description:
      'Surface parking just inside the main gate, on the eastern side of the approach road. Used by visitors and parents on campus for the day.',
    timings: '24 hours',
    contact: null,
    lat: 16.4967217,
    lng: 80.4995822,
    levels: null,
    coordSource: 'OSM',
    mapX: 58.6,
    mapY: 12.4,
    tags: ['parking', 'visitors', 'vehicles'],
  },
  {
    slug: 'transport-bay',
    name: 'Transport Bay',
    shortName: 'Transport',
    category: 'PARKING',
    description:
      'The bus and transport bay beside the approach road, where university buses to Vijayawada, Guntur and Mangalagiri pick up and set down.',
    timings: '05:30 - 22:30',
    contact: null,
    lat: 16.4967287,
    lng: 80.498748,
    levels: null,
    coordSource: 'OSM',
    mapX: 45.4,
    mapY: 12.3,
    tags: ['bus', 'transport', 'shuttle', 'commute'],
  },
  {
    slug: 'mgr-block',
    name: 'M.G.R Block',
    shortName: 'MGR',
    category: 'ADMIN',
    description:
      'The main administrative building, named after Dr. M.G. Ramachandran. Houses the offices of the Chancellor, Vice Chancellor and Registrar along with the managerial offices.',
    timings: '09:00 - 17:30',
    contact: null,
    lat: null,
    lng: null,
    levels: null,
    coordSource: null,
    mapX: null,
    mapY: null,
    tags: ['administration', 'registrar', 'chancellor', 'offices'],
  },
  {
    slug: 'ab1-sarvepalli-radhakrishnan-block',
    name: 'Sarvepalli Radhakrishnan Academic Block (AB-1)',
    shortName: 'AB-1',
    category: 'ACADEMIC',
    description:
      'A three-storey academic block on the eastern side of the central lawn, with lecture halls, laboratories and faculty cabins.',
    timings: '08:00 - 18:00',
    contact: null,
    lat: 16.495775,
    lng: 80.5004053,
    levels: 3,
    coordSource: 'OSM',
    mapX: 71.7,
    mapY: 28.1,
    tags: ['academic', 'classrooms', 'labs', 'ab1'],
  },
  {
    slug: 'ab2-apj-abdul-kalam-block',
    name: 'APJ Abdul Kalam Academic Block (AB-2)',
    shortName: 'AB-2',
    category: 'ACADEMIC',
    description:
      'A three-storey academic block on the western side of the central lawn, mirroring AB-1, with lecture halls, laboratories and workshops.',
    timings: '08:00 - 18:00',
    contact: null,
    lat: 16.4957371,
    lng: 80.498128,
    levels: 3,
    coordSource: 'OSM',
    mapX: 35.5,
    mapY: 28.7,
    tags: ['academic', 'classrooms', 'labs', 'ab2'],
  },
  {
    slug: 'central-block',
    name: 'Mahatma Gandhi Academic Block (Central Block)',
    shortName: 'CB',
    category: 'ACADEMIC',
    description:
      'The eleven-storey block at the heart of campus, the tallest building on site. Lecture theatres, seminar halls and school offices across its floors.',
    timings: '08:00 - 18:00',
    contact: null,
    lat: 16.4943535,
    lng: 80.4991899,
    levels: 11,
    coordSource: 'OSM',
    mapX: 52.4,
    mapY: 51.7,
    tags: ['academic', 'central block', 'cb', 'lecture theatres'],
  },
  {
    slug: 'central-junction',
    name: 'Central Junction & Fountain',
    shortName: 'Junction',
    category: 'SERVICE',
    description:
      'The fountain and open plaza where the campus paths converge, between the Central Block and the academic blocks. The default meeting point on campus.',
    timings: '24 hours',
    contact: null,
    lat: 16.4946963,
    lng: 80.4991941,
    levels: null,
    coordSource: 'OSM',
    mapX: 52.5,
    mapY: 46.0,
    tags: ['fountain', 'meeting point', 'plaza', 'junction'],
  },
  {
    slug: 'auditorium',
    name: 'Auditorium',
    shortName: 'Audi',
    category: 'AUDITORIUM',
    description:
      'The main auditorium beside AB-2, used for convocations, guest lectures, cultural nights and university-wide events.',
    timings: 'Event dependent',
    contact: null,
    lat: 16.4959587,
    lng: 80.4983284,
    levels: null,
    coordSource: 'OSM',
    mapX: 38.7,
    mapY: 25.1,
    tags: ['auditorium', 'events', 'cultural', 'lectures'],
  },
  {
    slug: 'library',
    name: 'Central Library',
    shortName: 'Library',
    category: 'LIBRARY',
    description:
      'The central library with print and digital collections, subscribed journal databases, reading halls and discussion rooms.',
    timings: '08:00 - 24:00 (extended during exams)',
    contact: null,
    lat: null,
    lng: null,
    levels: null,
    coordSource: null,
    mapX: null,
    mapY: null,
    tags: ['library', 'study', 'journals', 'reading'],
  },
  {
    slug: 'rock-plaza',
    name: 'Rock Plaza',
    shortName: 'Rock Plaza',
    category: 'FOOD',
    description:
      'The food court on the western side of campus, near AB-2 and the gym. Multiple counters and the main daytime eating spot between classes.',
    timings: '07:30 - 22:00',
    contact: null,
    lat: 16.4949631,
    lng: 80.4979211,
    levels: null,
    coordSource: 'OSM',
    mapX: 32.2,
    mapY: 41.6,
    tags: ['food court', 'cafeteria', 'lunch', 'canteen'],
  },
  {
    slug: 'food-street',
    name: 'Food Street',
    shortName: 'Food St',
    category: 'FOOD',
    description:
      'The row of outlets in the southern half of campus, between the Central Block and the hostels.',
    timings: '08:00 - 23:00',
    contact: null,
    lat: 16.4936691,
    lng: 80.4983456,
    levels: null,
    coordSource: 'OSM',
    mapX: 39.0,
    mapY: 63.0,
    tags: ['food', 'outlets', 'snacks', 'dinner'],
  },
  {
    slug: 'mh2-food-store',
    name: 'MH-2 Food Store',
    shortName: 'MH-2 Store',
    category: 'FOOD',
    description:
      'The store and quick-service counter beside MH-2, the late-night option for residents of the men\'s hostel blocks.',
    timings: 'Late night',
    contact: null,
    lat: 16.4937706,
    lng: 80.5009574,
    levels: null,
    coordSource: 'OSM',
    mapX: 80.5,
    mapY: 61.3,
    tags: ['night canteen', 'store', 'hostel', 'snacks'],
  },
  {
    slug: 'health-centre',
    name: 'Health Centre',
    shortName: 'Health',
    category: 'MEDICAL',
    description:
      'The campus health centre with resident medical officers and nursing staff, running round the clock for residents. Ambulance dispatch for emergencies.',
    timings: '24 hours',
    contact: null,
    lat: null,
    lng: null,
    levels: null,
    coordSource: null,
    mapX: null,
    mapY: null,
    tags: ['medical', 'doctor', 'emergency', 'ambulance'],
  },
  {
    slug: 'paid-gym',
    name: 'Gym',
    shortName: 'Gym',
    category: 'SPORTS',
    description:
      'The fitness centre on the western side of campus, near Rock Plaza.',
    timings: '05:30 - 21:30',
    contact: null,
    lat: 16.4947946,
    lng: 80.4977939,
    levels: null,
    coordSource: 'OSM',
    mapX: 30.2,
    mapY: 44.4,
    tags: ['gym', 'fitness', 'workout'],
  },
  {
    slug: 'sports-triangle',
    name: 'Sports Triangle',
    shortName: 'Triangle',
    category: 'SPORTS',
    description:
      'The open sports ground in the south-west of campus, used for football, athletics and evening practice.',
    timings: '05:30 - 21:00',
    contact: null,
    lat: 16.493631,
    lng: 80.4969615,
    levels: null,
    coordSource: 'OSM',
    mapX: 17.0,
    mapY: 63.6,
    tags: ['ground', 'football', 'athletics', 'practice'],
  },
  {
    slug: 'cricket-ground',
    name: 'Cricket Ground',
    shortName: 'Cricket',
    category: 'SPORTS',
    description:
      'The cricket ground on the eastern side of campus, beside the men\'s hostel blocks.',
    timings: '05:30 - 21:00',
    contact: null,
    lat: 16.4949911,
    lng: 80.5008666,
    levels: null,
    coordSource: 'OSM',
    mapX: 79.0,
    mapY: 41.1,
    tags: ['cricket', 'ground', 'nets'],
  },
  {
    slug: 'basketball-court',
    name: 'New Basketball Court',
    shortName: 'Basketball',
    category: 'SPORTS',
    description:
      'The basketball court near the men\'s hostel blocks, floodlit for evening play.',
    timings: '05:30 - 22:00',
    contact: null,
    lat: 16.4937117,
    lng: 80.5006649,
    levels: null,
    coordSource: 'OSM',
    mapX: 75.8,
    mapY: 62.3,
    tags: ['basketball', 'court', 'evening'],
  },
  {
    slug: 'mh-1',
    name: 'Men\'s Hostel MH-1 (Sarojini Naidu Block)',
    shortName: 'MH-1',
    category: 'HOSTEL',
    description:
      'A men\'s residential block with AC and non-AC rooms, a resident warden on duty and a provision store in the block.',
    timings: '24 hours',
    contact: 'Men\'s hostel office · 0863-2370501',
    lat: 16.4941688,
    lng: 80.5006523,
    levels: null,
    coordSource: 'OSM',
    mapX: 75.6,
    mapY: 54.7,
    tags: ['hostel', 'mh1', 'residence'],
  },
  {
    slug: 'mh-2',
    name: 'Men\'s Hostel MH-2 (Rabindranath Tagore Block)',
    shortName: 'MH-2',
    category: 'HOSTEL',
    description:
      'A men\'s residential block with AC and non-AC rooms and a food store beside it.',
    timings: '24 hours',
    contact: 'Men\'s hostel office · 0863-2370501',
    lat: 16.493519,
    lng: 80.5013236,
    levels: null,
    coordSource: 'OSM',
    mapX: 86.3,
    mapY: 65.5,
    tags: ['hostel', 'mh2', 'residence'],
  },
  {
    slug: 'mh-3',
    name: 'Men\'s Hostel MH-3 (Neelam Sanjiva Reddy Block)',
    shortName: 'MH-3',
    category: 'HOSTEL',
    description:
      'A men\'s residential block in the south-east corner of the hostel zone.',
    timings: '24 hours',
    contact: 'Men\'s hostel office · 0863-2370501',
    lat: 16.4921453,
    lng: 80.5013775,
    levels: null,
    coordSource: 'OSM',
    mapX: 87.2,
    mapY: 88.3,
    tags: ['hostel', 'mh3', 'residence'],
  },
  {
    slug: 'mh-4',
    name: 'Men\'s Hostel MH-4',
    shortName: 'MH-4',
    category: 'HOSTEL',
    description:
      'A fourteen-storey men\'s residential block in the southern hostel zone.',
    timings: '24 hours',
    contact: 'Men\'s hostel office · 0863-2370501',
    lat: 16.4919627,
    lng: 80.5008241,
    levels: 14,
    coordSource: 'OSM',
    mapX: 78.4,
    mapY: 91.3,
    tags: ['hostel', 'mh4', 'residence'],
  },
  {
    slug: 'mh-5',
    name: 'Men\'s Hostel MH-5',
    shortName: 'MH-5',
    category: 'HOSTEL',
    description:
      'A fourteen-storey men\'s residential block at the northern end of the hostel zone.',
    timings: '24 hours',
    contact: 'Men\'s hostel office · 0863-2370501',
    lat: 16.4941142,
    lng: 80.5012582,
    levels: 14,
    coordSource: 'OSM',
    mapX: 85.3,
    mapY: 55.6,
    tags: ['hostel', 'mh5', 'residence'],
  },
  {
    slug: 'mh-6',
    name: 'Men\'s Hostel MH-6',
    shortName: 'MH-6',
    category: 'HOSTEL',
    description:
      'A men\'s residential block on the western edge of the hostel zone.',
    timings: '24 hours',
    contact: 'Men\'s hostel office · 0863-2370501',
    lat: 16.4920053,
    lng: 80.4997767,
    levels: null,
    coordSource: 'OSM',
    mapX: 61.7,
    mapY: 90.6,
    tags: ['hostel', 'mh6', 'residence'],
  },
  {
    slug: 'mh-7',
    name: 'Men\'s Hostel MH-7',
    shortName: 'MH-7',
    category: 'HOSTEL',
    description:
      'A men\'s residential block in the middle of the hostel zone.',
    timings: '24 hours',
    contact: 'Men\'s hostel office · 0863-2370501',
    lat: 16.4926946,
    lng: 80.5004664,
    levels: null,
    coordSource: 'OSM',
    mapX: 72.7,
    mapY: 79.2,
    tags: ['hostel', 'mh7', 'residence'],
  },
  {
    slug: 'lh-1',
    name: 'Ladies\' Hostel LH-1',
    shortName: 'LH-1',
    category: 'HOSTEL',
    description:
      'A women\'s residential block in the south-west of campus, with a resident warden on duty and a provision store in the block.',
    timings: '24 hours',
    contact: 'Ladies\' hostel office · 0863-2370600',
    lat: 16.4920124,
    lng: 80.4966996,
    levels: null,
    coordSource: 'OSM',
    mapX: 12.8,
    mapY: 90.5,
    tags: ['hostel', 'lh1', 'residence'],
  },
  {
    slug: 'lh-2',
    name: 'Ladies\' Hostel LH-2',
    shortName: 'LH-2',
    category: 'HOSTEL',
    description:
      'A fourteen-storey women\'s residential block in the south-west of campus.',
    timings: '24 hours',
    contact: 'Ladies\' hostel office · 0863-2370600',
    lat: 16.4918534,
    lng: 80.4973656,
    levels: 14,
    coordSource: 'OSM',
    mapX: 23.4,
    mapY: 93.1,
    tags: ['hostel', 'lh2', 'residence'],
  },
  {
    slug: 'lh-3',
    name: 'Ladies\' Hostel LH-3',
    shortName: 'LH-3',
    category: 'HOSTEL',
    description:
      'A fourteen-storey women\'s residential block, the closest of the women\'s blocks to the academic core.',
    timings: '24 hours',
    contact: 'Ladies\' hostel office · 0863-2370600',
    lat: 16.4927191,
    lng: 80.4975609,
    levels: 14,
    coordSource: 'OSM',
    mapX: 26.5,
    mapY: 78.8,
    tags: ['hostel', 'lh3', 'residence'],
  },
  {
    slug: 'incubation-centre',
    name: 'Innovation & Incubation Centre',
    shortName: 'Incubation',
    category: 'ACADEMIC',
    description:
      'The centre supporting student startups and prototypes, with maker space, mentoring and the university\'s incubation programme.',
    timings: '09:00 - 18:00',
    contact: null,
    lat: null,
    lng: null,
    levels: null,
    coordSource: null,
    mapX: null,
    mapY: null,
    tags: ['startup', 'incubation', 'innovation', 'prototype'],
  },
  {
    slug: 'research-centres',
    name: 'Centres of Excellence',
    shortName: 'CoE',
    category: 'ACADEMIC',
    description:
      'The research centres and centres of excellence, running funded projects across the schools.',
    timings: '09:00 - 18:00',
    contact: null,
    lat: null,
    lng: null,
    levels: null,
    coordSource: null,
    mapX: null,
    mapY: null,
    tags: ['research', 'coe', 'projects', 'labs'],
  },
  {
    slug: 'guest-house',
    name: 'Guest House & Parent Stay',
    shortName: 'Guest House',
    category: 'SERVICE',
    description:
      'On-campus accommodation for visiting parents, guests and invited speakers. Booked through the front office.',
    timings: '24 hours',
    contact: null,
    lat: null,
    lng: null,
    levels: null,
    coordSource: null,
    mapX: null,
    mapY: null,
    tags: ['guest house', 'parents', 'stay', 'visitors'],
  },
  {
    slug: 'bank-and-atm',
    name: 'Bank & ATM',
    shortName: 'Bank',
    category: 'SERVICE',
    description:
      'The on-campus bank branch and ATM for fee payment, account services and cash withdrawal.',
    timings: '10:00 - 16:00 (ATM 24 hours)',
    contact: null,
    lat: null,
    lng: null,
    levels: null,
    coordSource: null,
    mapX: null,
    mapY: null,
    tags: ['bank', 'atm', 'cash', 'fees'],
  },
];

/**
 * The map viewport: the window the real coordinates occupy.
 *
 * `mapX`/`mapY` above are this same window projected to 0-100, so the schematic
 * fallback frames the campus exactly as the real map does.
 */
export const CAMPUS_VIEW = {
  center: { lat: 16.4944544, lng: 80.4990385 },
  /** Passed to the map as `fitBounds`: [west, south, east, north]. */
  bounds: [80.4962, 16.4914, 80.5019, 16.4975] as [number, number, number, number],
  defaultZoom: 16.4,
  defaultPitch: 55,
  defaultBearing: -18,
} as const;

/* ------------------------------------------------------ academic calendar */

/**
 * The Fall 2026-27 academic calendar, transcribed from the university's own
 * published calendar at vitap.ac.in/academiccalender.
 *
 * VIT-AP publishes a *separate* calendar for the incoming batch, because
 * freshers start a month later and therefore sit one continuous assessment
 * instead of two. Both are reproduced here — that difference is exactly what
 * students get wrong when they read a senior's dates.
 */

export type CalendarAudience = 'SENIORS' | 'FRESHERS';

export interface CalendarEntry {
  /** The description exactly as the university words it. */
  description: string;
  /** ISO start date. */
  startsOn: string;
  /** ISO end date for multi-day items, else null. */
  endsOn: string | null;
  /** The university's own remark column: "No Class Day", "Exam Days", etc. */
  remark: string | null;
  kind: 'TERM' | 'EXAM' | 'HOLIDAY' | 'EVENT' | 'DEADLINE';
}

export interface AcademicCalendar {
  academicYear: string;
  semester: string;
  audience: CalendarAudience;
  title: string;
  entries: readonly CalendarEntry[];
  notes: readonly string[];
  sourceUrl: string;
}

const SHARED_NOTES = [
  'A minimum of 75% attendance is mandatory to appear for the examinations (CAT and FAT); 100% attendance is expected.',
  'Last date for upload of assignments and projects is 21 November 2026 (Saturday).',
  'The FAT schedule is notified by the Controller of Examinations at the appropriate time.',
] as const;

export const FALL_2026_SENIORS: AcademicCalendar = {
  academicYear: '2026-27',
  semester: 'Fall',
  audience: 'SENIORS',
  title: 'Modified Academic Calendar FALL 2026-27 Semester',
  sourceUrl: 'https://vitap.ac.in/academiccalender',
  entries: [
    { description: 'Commencement of FALL 2026-27 Semester', startsOn: '2026-07-14', endsOn: null, remark: 'First Class Day', kind: 'TERM' },
    { description: 'Independence Day', startsOn: '2026-08-15', endsOn: null, remark: 'No Class Day', kind: 'HOLIDAY' },
    { description: 'CAT-1', startsOn: '2026-08-17', endsOn: '2026-08-24', remark: 'Exam Days', kind: 'EXAM' },
    { description: 'Milad-un-Nabi', startsOn: '2026-08-26', endsOn: null, remark: 'No Class Day', kind: 'HOLIDAY' },
    { description: 'V-TAPP', startsOn: '2026-09-11', endsOn: '2026-09-12', remark: 'No Class Day', kind: 'EVENT' },
    { description: 'Vinayaka Chaturthi', startsOn: '2026-09-14', endsOn: null, remark: 'No Class Day', kind: 'HOLIDAY' },
    { description: 'CAT-2', startsOn: '2026-09-28', endsOn: '2026-10-05', remark: 'Exam Days', kind: 'EXAM' },
    { description: 'Mahatma Gandhi Jayanti', startsOn: '2026-10-02', endsOn: null, remark: 'No Class Day', kind: 'HOLIDAY' },
    { description: 'Vijaya Dashami / Dussehra', startsOn: '2026-10-20', endsOn: null, remark: 'No Class Day', kind: 'HOLIDAY' },
    { description: 'LAB FAT', startsOn: '2026-10-31', endsOn: '2026-11-06', remark: null, kind: 'EXAM' },
    { description: 'Deepavali', startsOn: '2026-11-07', endsOn: '2026-11-10', remark: 'No Class Day', kind: 'HOLIDAY' },
    { description: 'Engineering Clinics Expo', startsOn: '2026-11-14', endsOn: null, remark: 'Evaluation and demonstration of multi-disciplinary engineering projects', kind: 'EVENT' },
    { description: 'Last Instructional day of FALL 2026-27 Semester', startsOn: '2026-11-14', endsOn: null, remark: null, kind: 'TERM' },
    { description: 'Theory FAT', startsOn: '2026-11-16', endsOn: '2026-12-01', remark: 'Exam Days', kind: 'EXAM' },
    { description: 'Tentative Commencement of WIN 2026-27 Semester', startsOn: '2026-12-02', endsOn: null, remark: 'First Class Day', kind: 'TERM' },
    { description: 'Winter vacation for students (Tentative)', startsOn: '2026-12-20', endsOn: '2027-01-04', remark: null, kind: 'HOLIDAY' },
  ],
  notes: SHARED_NOTES,
};

export const FALL_2026_FRESHERS: AcademicCalendar = {
  academicYear: '2026-27',
  semester: 'Fall',
  audience: 'FRESHERS',
  title: 'Academic Calendar FALL 2026-27 Semester for Freshers 2026 Batch',
  sourceUrl: 'https://vitap.ac.in/academiccalender',
  entries: [
    { description: 'Commencement of FALL 2026-27 Semester', startsOn: '2026-08-17', endsOn: null, remark: 'First Class Day', kind: 'TERM' },
    { description: 'Milad-un-Nabi', startsOn: '2026-08-26', endsOn: null, remark: 'No Class Day', kind: 'HOLIDAY' },
    { description: 'V-TAPP', startsOn: '2026-09-11', endsOn: '2026-09-12', remark: 'No Class Day', kind: 'EVENT' },
    { description: 'Vinayaka Chaturthi', startsOn: '2026-09-14', endsOn: null, remark: 'No Class Day', kind: 'HOLIDAY' },
    { description: 'CAT', startsOn: '2026-09-28', endsOn: '2026-10-05', remark: 'Exam Days', kind: 'EXAM' },
    { description: 'Mahatma Gandhi Jayanti', startsOn: '2026-10-02', endsOn: null, remark: 'No Class Day', kind: 'HOLIDAY' },
    { description: 'Vijaya Dashami / Dussehra', startsOn: '2026-10-20', endsOn: null, remark: 'No Class Day', kind: 'HOLIDAY' },
    { description: 'Deepavali', startsOn: '2026-11-07', endsOn: '2026-11-10', remark: 'No Class Day', kind: 'HOLIDAY' },
    { description: 'Engineering Clinics Expo', startsOn: '2026-11-14', endsOn: null, remark: 'Evaluation and demonstration of multi-disciplinary engineering projects', kind: 'EVENT' },
    { description: 'Last Instructional day of FALL 2026-27 Semester', startsOn: '2026-11-14', endsOn: null, remark: null, kind: 'TERM' },
    { description: 'LAB FAT', startsOn: '2026-11-16', endsOn: '2026-11-21', remark: null, kind: 'EXAM' },
    { description: 'Theory FAT', startsOn: '2026-11-23', endsOn: '2026-12-01', remark: 'Exam Days', kind: 'EXAM' },
    { description: 'Tentative Commencement of WIN 2026-27 Semester', startsOn: '2026-12-02', endsOn: null, remark: 'First Class Day', kind: 'TERM' },
    { description: 'Winter vacation for students (Tentative)', startsOn: '2026-12-20', endsOn: '2027-01-04', remark: null, kind: 'HOLIDAY' },
  ],
  notes: SHARED_NOTES,
};

export const ACADEMIC_CALENDARS = [FALL_2026_SENIORS, FALL_2026_FRESHERS] as const;

/** The calendar variants VIT-AP publishes, for the picker on /calendar. */
export const CALENDAR_VARIANTS = [
  'Fall Semester',
  'Fall Semester Freshers',
  'Winter Semester',
  'Winter Semester Freshers',
  'Long Summer sem',
  'Short Summer-1 Sem',
  'Short Summer-2 Sem',
] as const;

/* ------------------------------------------------------------------ clubs */

/**
 * Registered clubs and chapters, as listed on vitap.ac.in/clubs-and-chapters.
 * The university states there are 70+ in total; these are the ones published
 * by name at the time of verification.
 */
export interface VitapClub {
  name: string;
  shortName: string;
  category: 'TECHNICAL' | 'CULTURAL' | 'SPORTS' | 'PROFESSIONAL' | 'SOCIAL' | 'REGIONAL' | 'CREATIVE';
  /** The university's own grouping, which is coarser than ours. */
  officialGroup: 'Technical' | 'Non-technical' | 'Regional Club & Chapters' | 'Professional Club' | 'Social Outreach Club';
  tagline: string;
}

export const VITAP_CLUBS: readonly VitapClub[] = [
  // --- Technical -----------------------------------------------------------
  { name: 'ACM Student Chapter', shortName: 'ACM', category: 'PROFESSIONAL', officialGroup: 'Technical', tagline: 'Computing fundamentals, algorithms and the ACM chapter programme.' },
  { name: 'VIT-AP IEEE Student Branch', shortName: 'IEEE', category: 'PROFESSIONAL', officialGroup: 'Technical', tagline: 'Technical talks, paper writing support and chapter activities.' },
  { name: 'Computer Society of India', shortName: 'CSI', category: 'PROFESSIONAL', officialGroup: 'Technical', tagline: 'The CSI student chapter: workshops, seminars and industry sessions.' },
  { name: 'Machine Learning Club', shortName: 'MLC', category: 'TECHNICAL', officialGroup: 'Technical', tagline: 'Applied machine learning projects and paper reading.' },
  { name: 'Innovators Quest Club', shortName: 'IQC', category: 'TECHNICAL', officialGroup: 'Technical', tagline: 'Build-first innovation projects and prototyping.' },
  { name: 'Open Source Community: VIT-AP', shortName: 'OSC', category: 'TECHNICAL', officialGroup: 'Technical', tagline: 'Open source contribution, mentoring and community sprints.' },
  { name: 'WiOS — Women in Open Source', shortName: 'WiOS', category: 'TECHNICAL', officialGroup: 'Technical', tagline: 'Women contributing to and leading in open source.' },
  { name: 'Null Chapter', shortName: 'null', category: 'TECHNICAL', officialGroup: 'Technical', tagline: 'The student null chapter: security research and hands-on sessions.' },
  { name: 'GeeksforGeeks VIT-AP Student Chapter', shortName: 'GFG', category: 'TECHNICAL', officialGroup: 'Technical', tagline: 'Competitive programming, DSA practice and contests.' },
  { name: 'NextGen Cloud Club', shortName: 'NGC', category: 'TECHNICAL', officialGroup: 'Technical', tagline: 'Cloud platforms, certification tracks and deployment workshops.' },
  { name: 'SEDS Aurora', shortName: 'SEDS', category: 'TECHNICAL', officialGroup: 'Technical', tagline: 'Students for the Exploration and Development of Space.' },
  { name: 'Photon Club', shortName: 'Photon', category: 'TECHNICAL', officialGroup: 'Technical', tagline: 'Photonics, optics and applied physics projects.' },
  { name: 'Be A Nerd', shortName: 'BAN', category: 'TECHNICAL', officialGroup: 'Technical', tagline: 'A community for the deeply curious across every discipline.' },
  { name: 'Uddeshya Club', shortName: 'Uddeshya', category: 'TECHNICAL', officialGroup: 'Technical', tagline: 'Purpose-driven technical projects and student initiatives.' },

  // --- Non-technical -------------------------------------------------------
  { name: 'Western Music Club', shortName: 'WMC', category: 'CULTURAL', officialGroup: 'Non-technical', tagline: 'Bands, jam sessions and western music performance.' },
  { name: 'Indian Classical Music Club', shortName: 'ICMC', category: 'CULTURAL', officialGroup: 'Non-technical', tagline: 'Carnatic and Hindustani classical music practice and recitals.' },
  { name: 'Beat The Heat Dance Club', shortName: 'BTH', category: 'CULTURAL', officialGroup: 'Non-technical', tagline: 'Classical, western and street dance crews.' },
  { name: 'Photography Club VIT-AP', shortName: 'PC', category: 'CREATIVE', officialGroup: 'Non-technical', tagline: 'Campus photowalks, editing sessions and print shows.' },
  { name: 'Book Buzz Club', shortName: 'BBC', category: 'CULTURAL', officialGroup: 'Non-technical', tagline: 'Reading circles, book discussions and author sessions.' },
  { name: 'ELA Club', shortName: 'ELA', category: 'CULTURAL', officialGroup: 'Non-technical', tagline: 'English literary arts: writing, debate and expression.' },
  { name: 'Anchoring Club', shortName: 'AC', category: 'CULTURAL', officialGroup: 'Non-technical', tagline: 'Stage anchoring, hosting and public speaking practice.' },
  { name: 'Otaku Haven Club', shortName: 'OHC', category: 'CREATIVE', officialGroup: 'Non-technical', tagline: 'Anime, manga and pop-culture screenings and events.' },
  { name: 'Knit', shortName: 'Knit', category: 'CREATIVE', officialGroup: 'Non-technical', tagline: 'Craft, knitting and hands-on making.' },
  { name: 'DIY Club', shortName: 'DIY', category: 'CREATIVE', officialGroup: 'Non-technical', tagline: 'Do-it-yourself builds, repairs and creative projects.' },
  { name: 'SPIC MACAY Heritage Club', shortName: 'SPIC MACAY', category: 'CULTURAL', officialGroup: 'Non-technical', tagline: 'Indian classical arts and heritage appreciation.' },
  { name: 'Kalki Personality Development Club', shortName: 'Kalki', category: 'SOCIAL', officialGroup: 'Non-technical', tagline: 'Personality development, soft skills and confidence building.' },
  { name: 'Think and Thrive', shortName: 'T&T', category: 'SOCIAL', officialGroup: 'Non-technical', tagline: 'Critical thinking, wellbeing and personal growth sessions.' },

  // --- Regional ------------------------------------------------------------
  { name: 'Chaitra Telugu Association', shortName: 'Chaitra', category: 'REGIONAL', officialGroup: 'Regional Club & Chapters', tagline: 'Telugu language, literature and cultural celebration.' },
  { name: 'Semmozhi Tamil Mandram', shortName: 'Semmozhi', category: 'REGIONAL', officialGroup: 'Regional Club & Chapters', tagline: 'Tamil language and cultural programmes.' },
  { name: 'Malayalam Association', shortName: 'MA', category: 'REGIONAL', officialGroup: 'Regional Club & Chapters', tagline: 'Malayali culture, Onam celebrations and community.' },
  { name: 'Namma Karunadu Kannada Association', shortName: 'NKKA', category: 'REGIONAL', officialGroup: 'Regional Club & Chapters', tagline: 'Kannada language and Karnataka cultural events.' },
  { name: 'Bengali Association: Bongojo', shortName: 'Bongojo', category: 'REGIONAL', officialGroup: 'Regional Club & Chapters', tagline: 'Bengali culture, Durga Puja and community events.' },
  { name: 'Haryana Association', shortName: 'HA', category: 'REGIONAL', officialGroup: 'Regional Club & Chapters', tagline: 'A home away from home for students from Haryana.' },

  // --- Professional and outreach ------------------------------------------
  { name: 'IETE Students Forum', shortName: 'ISF', category: 'PROFESSIONAL', officialGroup: 'Professional Club', tagline: 'The Institution of Electronics and Telecommunication Engineers student forum.' },
  { name: 'Rotaract Club', shortName: 'Rotaract', category: 'SOCIAL', officialGroup: 'Social Outreach Club', tagline: 'Community service, outreach drives and social projects.' },
];

/* --------------------------------------------------------- official links */

/**
 * Real university systems and documents. These are the links students actually
 * need, taken from the site's own navigation.
 */
export const OFFICIAL_LINKS = [
  { title: 'V-TOP student portal', url: 'https://vtop.vitap.ac.in/', category: 'PORTALS', description: 'Attendance, marks, course registration, timetable and academic records.', fileType: null },
  { title: 'VIT-AP University website', url: 'https://vitap.ac.in/', category: 'PORTALS', description: 'The official university site.', fileType: null },
  { title: 'Academic calendar', url: 'https://vitap.ac.in/academiccalender', category: 'ACADEMIC_CALENDAR', description: 'Official semester calendars for every programme and batch, including separate freshers calendars.', fileType: null },
  { title: 'Fully Flexible Credit System (FFCS)', url: 'https://vitap.ac.in/ffcs', category: 'ACADEMIC_CALENDAR', description: 'How course registration and the flexible credit system work at VIT.', fileType: null },
  { title: 'Fees and scholarships', url: 'https://vitap.ac.in/fees-and-scholarships', category: 'SCHOLARSHIP', description: 'Fee structure, payment schedule and the scholarship schemes.', fileType: null },
  { title: 'Hostels', url: 'https://vitap.ac.in/hostels', category: 'HOSTEL', description: 'Hostel blocks, wardens, amenities, fee structure and the code of conduct.', fileType: null },
  { title: 'Transport', url: 'https://vitap.ac.in/transport', category: 'IMPORTANT_LINKS', description: 'University bus routes and the transport schedule.', fileType: null },
  { title: 'Library', url: 'https://vitap.ac.in/newlibrary', category: 'LIBRARY', description: 'Library services, digital resources and access.', fileType: null },
  { title: 'Healthcare', url: 'https://vitap.ac.in/healthcare', category: 'STUDENT_SERVICES', description: 'The campus health centre and medical support.', fileType: null },
  { title: 'Career Development Centre', url: 'https://vitap.ac.in/cdc-overview', category: 'PLACEMENT', description: 'Placement preparation, training and the CDC office.', fileType: null },
  { title: 'Placement statistics', url: 'https://vitap.ac.in/cdc-statistics', category: 'PLACEMENT', description: 'Published placement outcomes and recruiter data.', fileType: null },
  { title: 'Dream and Super Dream offers', url: 'https://vitap.ac.in/cdc-superdream', category: 'PLACEMENT', description: 'How the Dream and Super Dream placement categories work.', fileType: null },
  { title: 'Internships', url: 'https://vitap.ac.in/internships', category: 'PLACEMENT', description: 'Internship programmes and support.', fileType: null },
  { title: 'Clubs and chapters', url: 'https://vitap.ac.in/clubs-and-chapters', category: 'IMPORTANT_LINKS', description: 'The official directory of registered clubs and chapters.', fileType: null },
  { title: 'Forms', url: 'https://vitap.ac.in/forms', category: 'FORMS', description: 'Official university forms and applications.', fileType: null },
  { title: 'Directory', url: 'https://vitap.ac.in/directory', category: 'IMPORTANT_LINKS', description: 'University contact directory.', fileType: null },
  { title: 'Policies', url: 'https://vitap.ac.in/policies', category: 'IMPORTANT_LINKS', description: 'University policies and regulations.', fileType: null },
  { title: 'Academic Bank of Credit (ABC)', url: 'https://www.abc.gov.in/', category: 'ACADEMIC_CALENDAR', description: 'The national Academic Bank of Credit, where your credits are deposited.', fileType: null },
  { title: 'Equal Opportunity Cell', url: 'https://vitap.ac.in/equal-opportunity-cell', category: 'STUDENT_SERVICES', description: 'Support and redressal for equal opportunity matters.', fileType: null },
  { title: 'Facilities for differently-abled students', url: 'https://vitap.ac.in/facilities-for-differently-abled', category: 'STUDENT_SERVICES', description: 'Accessibility provisions and support on campus.', fileType: null },
  { title: 'e-Samadhan grievance portal', url: 'https://vitap.ac.in/e-samadhan', category: 'STUDENT_SERVICES', description: 'Raise and track a grievance with the university.', fileType: null },
  { title: 'Gallery', url: 'https://vitap.ac.in/gallery', category: 'IMPORTANT_LINKS', description: 'Photographs from campus events and celebrations.', fileType: null },
  { title: 'Emergency information', url: 'https://vitap.ac.in/emergency-info', category: 'EMERGENCY', description: 'Emergency contacts and procedures published by the university.', fileType: null },
] as const;

/** Published institutional phone numbers. Offices, never individuals. */
export const CAMPUS_CONTACTS = [
  { label: "Men's hostel — secretary", value: '0863-2370501' },
  { label: "Men's hostel — chief warden", value: '0863-2370550' },
  { label: "Men's hostel — MH-1 office", value: '0863-2370527' },
  { label: "Ladies' hostel office", value: '0863-2370600 (intercom 5600)' },
  { label: "Ladies' hostel — alternate", value: '0863-2370617 (intercom 5617)' },
] as const;

/** Real recurring university events, from the university's own listings. */
export const SIGNATURE_EVENTS = [
  { name: 'V-TAPP', description: 'The annual VIT-AP talent and performance platform. A no-class-day university event.' },
  { name: 'Engineering Clinics Expo', description: 'Evaluation and demonstration of multi-disciplinary engineering projects.' },
  { name: 'University Day', description: 'The annual university day celebration.' },
  { name: 'Freshers Orientation', description: 'Induction programme for the incoming batch.' },
  { name: 'Graduation Day', description: 'Convocation for the graduating batch.' },
] as const;
