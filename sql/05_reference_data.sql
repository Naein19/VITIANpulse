-- =============================================================================
-- Reference data — real VIT-AP institutional records
--
-- Generated from src/data/vitap.ts. Do not edit by hand: run `npm run db:sql`.
--
-- Everything here is fact taken from VIT-AP's own public pages and from
-- OpenStreetMap (ODbL) — campus locations with real coordinates, the registered
-- clubs and chapters, and the official portal links. It is NOT demo content.
-- Last verified: 2026-08-31.
--
-- Safe to re-run: every statement upserts on the natural key.
-- =============================================================================

insert into campus_locations
  (slug, name, short_name, category, description, timings, contact,
   map_x, map_y, lat, lng, levels, coord_source, tags)
values
  ('main-entrance', 'Main Entrance', 'Gate', 'SERVICE', 'The main gate on the northern edge of campus, off the road that connects to NH-16. Security check, visitor registration and the drop-off point for cabs and buses.', '24 hours', null, 52.5, 6.9, 16.4970554, 80.4991965, null, 'VITAP', array['gate', 'entrance', 'security', 'visitors']),
  ('visitor-parking', 'Visitor Parking', 'Parking', 'PARKING', 'Surface parking just inside the main gate, on the eastern side of the approach road. Used by visitors and parents on campus for the day.', '24 hours', null, 58.6, 12.4, 16.4967217, 80.4995822, null, 'OSM', array['parking', 'visitors', 'vehicles']),
  ('transport-bay', 'Transport Bay', 'Transport', 'PARKING', 'The bus and transport bay beside the approach road, where university buses to Vijayawada, Guntur and Mangalagiri pick up and set down.', '05:30 - 22:30', null, 45.4, 12.3, 16.4967287, 80.498748, null, 'OSM', array['bus', 'transport', 'shuttle', 'commute']),
  ('mgr-block', 'M.G.R Block', 'MGR', 'ADMIN', 'The main administrative building, named after Dr. M.G. Ramachandran. Houses the offices of the Chancellor, Vice Chancellor and Registrar along with the managerial offices.', '09:00 - 17:30', null, null, null, null, null, null, null, array['administration', 'registrar', 'chancellor', 'offices']),
  ('ab1-sarvepalli-radhakrishnan-block', 'Sarvepalli Radhakrishnan Academic Block (AB-1)', 'AB-1', 'ACADEMIC', 'A three-storey academic block on the eastern side of the central lawn, with lecture halls, laboratories and faculty cabins.', '08:00 - 18:00', null, 71.7, 28.1, 16.495775, 80.5004053, 3, 'OSM', array['academic', 'classrooms', 'labs', 'ab1']),
  ('ab2-apj-abdul-kalam-block', 'APJ Abdul Kalam Academic Block (AB-2)', 'AB-2', 'ACADEMIC', 'A three-storey academic block on the western side of the central lawn, mirroring AB-1, with lecture halls, laboratories and workshops.', '08:00 - 18:00', null, 35.5, 28.7, 16.4957371, 80.498128, 3, 'OSM', array['academic', 'classrooms', 'labs', 'ab2']),
  ('central-block', 'Mahatma Gandhi Academic Block (Central Block)', 'CB', 'ACADEMIC', 'The eleven-storey block at the heart of campus, the tallest building on site. Lecture theatres, seminar halls and school offices across its floors.', '08:00 - 18:00', null, 52.4, 51.7, 16.4943535, 80.4991899, 11, 'OSM', array['academic', 'central block', 'cb', 'lecture theatres']),
  ('central-junction', 'Central Junction & Fountain', 'Junction', 'SERVICE', 'The fountain and open plaza where the campus paths converge, between the Central Block and the academic blocks. The default meeting point on campus.', '24 hours', null, 52.5, 46, 16.4946963, 80.4991941, null, 'OSM', array['fountain', 'meeting point', 'plaza', 'junction']),
  ('auditorium', 'Auditorium', 'Audi', 'AUDITORIUM', 'The main auditorium beside AB-2, used for convocations, guest lectures, cultural nights and university-wide events.', 'Event dependent', null, 38.7, 25.1, 16.4959587, 80.4983284, null, 'OSM', array['auditorium', 'events', 'cultural', 'lectures']),
  ('library', 'Central Library', 'Library', 'LIBRARY', 'The central library with print and digital collections, subscribed journal databases, reading halls and discussion rooms.', '08:00 - 24:00 (extended during exams)', null, null, null, null, null, null, null, array['library', 'study', 'journals', 'reading']),
  ('rock-plaza', 'Rock Plaza', 'Rock Plaza', 'FOOD', 'The food court on the western side of campus, near AB-2 and the gym. Multiple counters and the main daytime eating spot between classes.', '07:30 - 22:00', null, 32.2, 41.6, 16.4949631, 80.4979211, null, 'OSM', array['food court', 'cafeteria', 'lunch', 'canteen']),
  ('food-street', 'Food Street', 'Food St', 'FOOD', 'The row of outlets in the southern half of campus, between the Central Block and the hostels.', '08:00 - 23:00', null, 39, 63, 16.4936691, 80.4983456, null, 'OSM', array['food', 'outlets', 'snacks', 'dinner']),
  ('mh2-food-store', 'MH-2 Food Store', 'MH-2 Store', 'FOOD', 'The store and quick-service counter beside MH-2, the late-night option for residents of the men''s hostel blocks.', 'Late night', null, 80.5, 61.3, 16.4937706, 80.5009574, null, 'OSM', array['night canteen', 'store', 'hostel', 'snacks']),
  ('health-centre', 'Health Centre', 'Health', 'MEDICAL', 'The campus health centre with resident medical officers and nursing staff, running round the clock for residents. Ambulance dispatch for emergencies.', '24 hours', null, null, null, null, null, null, null, array['medical', 'doctor', 'emergency', 'ambulance']),
  ('paid-gym', 'Gym', 'Gym', 'SPORTS', 'The fitness centre on the western side of campus, near Rock Plaza.', '05:30 - 21:30', null, 30.2, 44.4, 16.4947946, 80.4977939, null, 'OSM', array['gym', 'fitness', 'workout']),
  ('sports-triangle', 'Sports Triangle', 'Triangle', 'SPORTS', 'The open sports ground in the south-west of campus, used for football, athletics and evening practice.', '05:30 - 21:00', null, 17, 63.6, 16.493631, 80.4969615, null, 'OSM', array['ground', 'football', 'athletics', 'practice']),
  ('cricket-ground', 'Cricket Ground', 'Cricket', 'SPORTS', 'The cricket ground on the eastern side of campus, beside the men''s hostel blocks.', '05:30 - 21:00', null, 79, 41.1, 16.4949911, 80.5008666, null, 'OSM', array['cricket', 'ground', 'nets']),
  ('basketball-court', 'New Basketball Court', 'Basketball', 'SPORTS', 'The basketball court near the men''s hostel blocks, floodlit for evening play.', '05:30 - 22:00', null, 75.8, 62.3, 16.4937117, 80.5006649, null, 'OSM', array['basketball', 'court', 'evening']),
  ('mh-1', 'Men''s Hostel MH-1 (Sarojini Naidu Block)', 'MH-1', 'HOSTEL', 'A men''s residential block with AC and non-AC rooms, a resident warden on duty and a provision store in the block.', '24 hours', 'Men''s hostel office · 0863-2370501', 75.6, 54.7, 16.4941688, 80.5006523, null, 'OSM', array['hostel', 'mh1', 'residence']),
  ('mh-2', 'Men''s Hostel MH-2 (Rabindranath Tagore Block)', 'MH-2', 'HOSTEL', 'A men''s residential block with AC and non-AC rooms and a food store beside it.', '24 hours', 'Men''s hostel office · 0863-2370501', 86.3, 65.5, 16.493519, 80.5013236, null, 'OSM', array['hostel', 'mh2', 'residence']),
  ('mh-3', 'Men''s Hostel MH-3 (Neelam Sanjiva Reddy Block)', 'MH-3', 'HOSTEL', 'A men''s residential block in the south-east corner of the hostel zone.', '24 hours', 'Men''s hostel office · 0863-2370501', 87.2, 88.3, 16.4921453, 80.5013775, null, 'OSM', array['hostel', 'mh3', 'residence']),
  ('mh-4', 'Men''s Hostel MH-4', 'MH-4', 'HOSTEL', 'A fourteen-storey men''s residential block in the southern hostel zone.', '24 hours', 'Men''s hostel office · 0863-2370501', 78.4, 91.3, 16.4919627, 80.5008241, 14, 'OSM', array['hostel', 'mh4', 'residence']),
  ('mh-5', 'Men''s Hostel MH-5', 'MH-5', 'HOSTEL', 'A fourteen-storey men''s residential block at the northern end of the hostel zone.', '24 hours', 'Men''s hostel office · 0863-2370501', 85.3, 55.6, 16.4941142, 80.5012582, 14, 'OSM', array['hostel', 'mh5', 'residence']),
  ('mh-6', 'Men''s Hostel MH-6', 'MH-6', 'HOSTEL', 'A men''s residential block on the western edge of the hostel zone.', '24 hours', 'Men''s hostel office · 0863-2370501', 61.7, 90.6, 16.4920053, 80.4997767, null, 'OSM', array['hostel', 'mh6', 'residence']),
  ('mh-7', 'Men''s Hostel MH-7', 'MH-7', 'HOSTEL', 'A men''s residential block in the middle of the hostel zone.', '24 hours', 'Men''s hostel office · 0863-2370501', 72.7, 79.2, 16.4926946, 80.5004664, null, 'OSM', array['hostel', 'mh7', 'residence']),
  ('lh-1', 'Ladies'' Hostel LH-1', 'LH-1', 'HOSTEL', 'A women''s residential block in the south-west of campus, with a resident warden on duty and a provision store in the block.', '24 hours', 'Ladies'' hostel office · 0863-2370600', 12.8, 90.5, 16.4920124, 80.4966996, null, 'OSM', array['hostel', 'lh1', 'residence']),
  ('lh-2', 'Ladies'' Hostel LH-2', 'LH-2', 'HOSTEL', 'A fourteen-storey women''s residential block in the south-west of campus.', '24 hours', 'Ladies'' hostel office · 0863-2370600', 23.4, 93.1, 16.4918534, 80.4973656, 14, 'OSM', array['hostel', 'lh2', 'residence']),
  ('lh-3', 'Ladies'' Hostel LH-3', 'LH-3', 'HOSTEL', 'A fourteen-storey women''s residential block, the closest of the women''s blocks to the academic core.', '24 hours', 'Ladies'' hostel office · 0863-2370600', 26.5, 78.8, 16.4927191, 80.4975609, 14, 'OSM', array['hostel', 'lh3', 'residence']),
  ('incubation-centre', 'Innovation & Incubation Centre', 'Incubation', 'ACADEMIC', 'The centre supporting student startups and prototypes, with maker space, mentoring and the university''s incubation programme.', '09:00 - 18:00', null, null, null, null, null, null, null, array['startup', 'incubation', 'innovation', 'prototype']),
  ('research-centres', 'Centres of Excellence', 'CoE', 'ACADEMIC', 'The research centres and centres of excellence, running funded projects across the schools.', '09:00 - 18:00', null, null, null, null, null, null, null, array['research', 'coe', 'projects', 'labs']),
  ('guest-house', 'Guest House & Parent Stay', 'Guest House', 'SERVICE', 'On-campus accommodation for visiting parents, guests and invited speakers. Booked through the front office.', '24 hours', null, null, null, null, null, null, null, array['guest house', 'parents', 'stay', 'visitors']),
  ('bank-and-atm', 'Bank & ATM', 'Bank', 'SERVICE', 'The on-campus bank branch and ATM for fee payment, account services and cash withdrawal.', '10:00 - 16:00 (ATM 24 hours)', null, null, null, null, null, null, null, array['bank', 'atm', 'cash', 'fees'])
on conflict (slug) do update set
  name         = excluded.name,
  short_name   = excluded.short_name,
  category     = excluded.category,
  description  = excluded.description,
  timings      = excluded.timings,
  contact      = excluded.contact,
  map_x        = excluded.map_x,
  map_y        = excluded.map_y,
  lat          = excluded.lat,
  lng          = excluded.lng,
  levels       = excluded.levels,
  coord_source = excluded.coord_source,
  tags         = excluded.tags;


insert into clubs (slug, name, short_name, category, tagline, description, verified, status)
values
  ('acm-student-chapter', 'ACM Student Chapter', 'ACM', 'PROFESSIONAL', 'Computing fundamentals, algorithms and the ACM chapter programme.', 'Computing fundamentals, algorithms and the ACM chapter programme. A registered student club at VIT-AP, listed under Technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('vit-ap-ieee-student-branch', 'VIT-AP IEEE Student Branch', 'IEEE', 'PROFESSIONAL', 'Technical talks, paper writing support and chapter activities.', 'Technical talks, paper writing support and chapter activities. A registered student club at VIT-AP, listed under Technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('computer-society-of-india', 'Computer Society of India', 'CSI', 'PROFESSIONAL', 'The CSI student chapter: workshops, seminars and industry sessions.', 'The CSI student chapter: workshops, seminars and industry sessions. A registered student club at VIT-AP, listed under Technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('machine-learning-club', 'Machine Learning Club', 'MLC', 'TECHNICAL', 'Applied machine learning projects and paper reading.', 'Applied machine learning projects and paper reading. A registered student club at VIT-AP, listed under Technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('innovators-quest-club', 'Innovators Quest Club', 'IQC', 'TECHNICAL', 'Build-first innovation projects and prototyping.', 'Build-first innovation projects and prototyping. A registered student club at VIT-AP, listed under Technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('open-source-community-vit-ap', 'Open Source Community: VIT-AP', 'OSC', 'TECHNICAL', 'Open source contribution, mentoring and community sprints.', 'Open source contribution, mentoring and community sprints. A registered student club at VIT-AP, listed under Technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('wios-women-in-open-source', 'WiOS — Women in Open Source', 'WiOS', 'TECHNICAL', 'Women contributing to and leading in open source.', 'Women contributing to and leading in open source. A registered student club at VIT-AP, listed under Technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('null-chapter', 'Null Chapter', 'null', 'TECHNICAL', 'The student null chapter: security research and hands-on sessions.', 'The student null chapter: security research and hands-on sessions. A registered student club at VIT-AP, listed under Technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('geeksforgeeks-vit-ap-student-chapter', 'GeeksforGeeks VIT-AP Student Chapter', 'GFG', 'TECHNICAL', 'Competitive programming, DSA practice and contests.', 'Competitive programming, DSA practice and contests. A registered student club at VIT-AP, listed under Technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('nextgen-cloud-club', 'NextGen Cloud Club', 'NGC', 'TECHNICAL', 'Cloud platforms, certification tracks and deployment workshops.', 'Cloud platforms, certification tracks and deployment workshops. A registered student club at VIT-AP, listed under Technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('seds-aurora', 'SEDS Aurora', 'SEDS', 'TECHNICAL', 'Students for the Exploration and Development of Space.', 'Students for the Exploration and Development of Space. A registered student club at VIT-AP, listed under Technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('photon-club', 'Photon Club', 'Photon', 'TECHNICAL', 'Photonics, optics and applied physics projects.', 'Photonics, optics and applied physics projects. A registered student club at VIT-AP, listed under Technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('be-a-nerd', 'Be A Nerd', 'BAN', 'TECHNICAL', 'A community for the deeply curious across every discipline.', 'A community for the deeply curious across every discipline. A registered student club at VIT-AP, listed under Technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('uddeshya-club', 'Uddeshya Club', 'Uddeshya', 'TECHNICAL', 'Purpose-driven technical projects and student initiatives.', 'Purpose-driven technical projects and student initiatives. A registered student club at VIT-AP, listed under Technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('western-music-club', 'Western Music Club', 'WMC', 'CULTURAL', 'Bands, jam sessions and western music performance.', 'Bands, jam sessions and western music performance. A registered student club at VIT-AP, listed under Non-technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('indian-classical-music-club', 'Indian Classical Music Club', 'ICMC', 'CULTURAL', 'Carnatic and Hindustani classical music practice and recitals.', 'Carnatic and Hindustani classical music practice and recitals. A registered student club at VIT-AP, listed under Non-technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('beat-the-heat-dance-club', 'Beat The Heat Dance Club', 'BTH', 'CULTURAL', 'Classical, western and street dance crews.', 'Classical, western and street dance crews. A registered student club at VIT-AP, listed under Non-technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('photography-club-vit-ap', 'Photography Club VIT-AP', 'PC', 'CREATIVE', 'Campus photowalks, editing sessions and print shows.', 'Campus photowalks, editing sessions and print shows. A registered student club at VIT-AP, listed under Non-technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('book-buzz-club', 'Book Buzz Club', 'BBC', 'CULTURAL', 'Reading circles, book discussions and author sessions.', 'Reading circles, book discussions and author sessions. A registered student club at VIT-AP, listed under Non-technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('ela-club', 'ELA Club', 'ELA', 'CULTURAL', 'English literary arts: writing, debate and expression.', 'English literary arts: writing, debate and expression. A registered student club at VIT-AP, listed under Non-technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('anchoring-club', 'Anchoring Club', 'AC', 'CULTURAL', 'Stage anchoring, hosting and public speaking practice.', 'Stage anchoring, hosting and public speaking practice. A registered student club at VIT-AP, listed under Non-technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('otaku-haven-club', 'Otaku Haven Club', 'OHC', 'CREATIVE', 'Anime, manga and pop-culture screenings and events.', 'Anime, manga and pop-culture screenings and events. A registered student club at VIT-AP, listed under Non-technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('knit', 'Knit', 'Knit', 'CREATIVE', 'Craft, knitting and hands-on making.', 'Craft, knitting and hands-on making. A registered student club at VIT-AP, listed under Non-technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('diy-club', 'DIY Club', 'DIY', 'CREATIVE', 'Do-it-yourself builds, repairs and creative projects.', 'Do-it-yourself builds, repairs and creative projects. A registered student club at VIT-AP, listed under Non-technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('spic-macay-heritage-club', 'SPIC MACAY Heritage Club', 'SPIC MACAY', 'CULTURAL', 'Indian classical arts and heritage appreciation.', 'Indian classical arts and heritage appreciation. A registered student club at VIT-AP, listed under Non-technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('kalki-personality-development-club', 'Kalki Personality Development Club', 'Kalki', 'SOCIAL', 'Personality development, soft skills and confidence building.', 'Personality development, soft skills and confidence building. A registered student club at VIT-AP, listed under Non-technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('think-and-thrive', 'Think and Thrive', 'T&T', 'SOCIAL', 'Critical thinking, wellbeing and personal growth sessions.', 'Critical thinking, wellbeing and personal growth sessions. A registered student club at VIT-AP, listed under Non-technical on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('chaitra-telugu-association', 'Chaitra Telugu Association', 'Chaitra', 'REGIONAL', 'Telugu language, literature and cultural celebration.', 'Telugu language, literature and cultural celebration. A registered student club at VIT-AP, listed under Regional Club & Chapters on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('semmozhi-tamil-mandram', 'Semmozhi Tamil Mandram', 'Semmozhi', 'REGIONAL', 'Tamil language and cultural programmes.', 'Tamil language and cultural programmes. A registered student club at VIT-AP, listed under Regional Club & Chapters on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('malayalam-association', 'Malayalam Association', 'MA', 'REGIONAL', 'Malayali culture, Onam celebrations and community.', 'Malayali culture, Onam celebrations and community. A registered student club at VIT-AP, listed under Regional Club & Chapters on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('namma-karunadu-kannada-association', 'Namma Karunadu Kannada Association', 'NKKA', 'REGIONAL', 'Kannada language and Karnataka cultural events.', 'Kannada language and Karnataka cultural events. A registered student club at VIT-AP, listed under Regional Club & Chapters on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('bengali-association-bongojo', 'Bengali Association: Bongojo', 'Bongojo', 'REGIONAL', 'Bengali culture, Durga Puja and community events.', 'Bengali culture, Durga Puja and community events. A registered student club at VIT-AP, listed under Regional Club & Chapters on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('haryana-association', 'Haryana Association', 'HA', 'REGIONAL', 'A home away from home for students from Haryana.', 'A home away from home for students from Haryana. A registered student club at VIT-AP, listed under Regional Club & Chapters on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('iete-students-forum', 'IETE Students Forum', 'ISF', 'PROFESSIONAL', 'The Institution of Electronics and Telecommunication Engineers student forum.', 'The Institution of Electronics and Telecommunication Engineers student forum. A registered student club at VIT-AP, listed under Professional Club on the university''s clubs and chapters page.', true, 'PUBLISHED'),
  ('rotaract-club', 'Rotaract Club', 'Rotaract', 'SOCIAL', 'Community service, outreach drives and social projects.', 'Community service, outreach drives and social projects. A registered student club at VIT-AP, listed under Social Outreach Club on the university''s clubs and chapters page.', true, 'PUBLISHED')
on conflict (slug) do update set
  name        = excluded.name,
  short_name  = excluded.short_name,
  category    = excluded.category,
  tagline     = excluded.tagline,
  description = excluded.description,
  verified    = excluded.verified;


insert into resources (slug, title, description, category, url, external, file_type, status)
values
  ('v-top-student-portal', 'V-TOP student portal', 'Attendance, marks, course registration, timetable and academic records.', 'PORTALS', 'https://vtop.vitap.ac.in/', true, null, 'PUBLISHED'),
  ('vit-ap-university-website', 'VIT-AP University website', 'The official university site.', 'PORTALS', 'https://vitap.ac.in/', true, null, 'PUBLISHED'),
  ('academic-calendar', 'Academic calendar', 'Official semester calendars for every programme and batch, including separate freshers calendars.', 'ACADEMIC_CALENDAR', 'https://vitap.ac.in/academiccalender', true, null, 'PUBLISHED'),
  ('fully-flexible-credit-system-ffcs', 'Fully Flexible Credit System (FFCS)', 'How course registration and the flexible credit system work at VIT.', 'ACADEMIC_CALENDAR', 'https://vitap.ac.in/ffcs', true, null, 'PUBLISHED'),
  ('fees-and-scholarships', 'Fees and scholarships', 'Fee structure, payment schedule and the scholarship schemes.', 'SCHOLARSHIP', 'https://vitap.ac.in/fees-and-scholarships', true, null, 'PUBLISHED'),
  ('hostels', 'Hostels', 'Hostel blocks, wardens, amenities, fee structure and the code of conduct.', 'HOSTEL', 'https://vitap.ac.in/hostels', true, null, 'PUBLISHED'),
  ('transport', 'Transport', 'University bus routes and the transport schedule.', 'IMPORTANT_LINKS', 'https://vitap.ac.in/transport', true, null, 'PUBLISHED'),
  ('library', 'Library', 'Library services, digital resources and access.', 'LIBRARY', 'https://vitap.ac.in/newlibrary', true, null, 'PUBLISHED'),
  ('healthcare', 'Healthcare', 'The campus health centre and medical support.', 'STUDENT_SERVICES', 'https://vitap.ac.in/healthcare', true, null, 'PUBLISHED'),
  ('career-development-centre', 'Career Development Centre', 'Placement preparation, training and the CDC office.', 'PLACEMENT', 'https://vitap.ac.in/cdc-overview', true, null, 'PUBLISHED'),
  ('placement-statistics', 'Placement statistics', 'Published placement outcomes and recruiter data.', 'PLACEMENT', 'https://vitap.ac.in/cdc-statistics', true, null, 'PUBLISHED'),
  ('dream-and-super-dream-offers', 'Dream and Super Dream offers', 'How the Dream and Super Dream placement categories work.', 'PLACEMENT', 'https://vitap.ac.in/cdc-superdream', true, null, 'PUBLISHED'),
  ('internships', 'Internships', 'Internship programmes and support.', 'PLACEMENT', 'https://vitap.ac.in/internships', true, null, 'PUBLISHED'),
  ('clubs-and-chapters', 'Clubs and chapters', 'The official directory of registered clubs and chapters.', 'IMPORTANT_LINKS', 'https://vitap.ac.in/clubs-and-chapters', true, null, 'PUBLISHED'),
  ('forms', 'Forms', 'Official university forms and applications.', 'FORMS', 'https://vitap.ac.in/forms', true, null, 'PUBLISHED'),
  ('directory', 'Directory', 'University contact directory.', 'IMPORTANT_LINKS', 'https://vitap.ac.in/directory', true, null, 'PUBLISHED'),
  ('policies', 'Policies', 'University policies and regulations.', 'IMPORTANT_LINKS', 'https://vitap.ac.in/policies', true, null, 'PUBLISHED'),
  ('academic-bank-of-credit-abc', 'Academic Bank of Credit (ABC)', 'The national Academic Bank of Credit, where your credits are deposited.', 'ACADEMIC_CALENDAR', 'https://www.abc.gov.in/', true, null, 'PUBLISHED'),
  ('equal-opportunity-cell', 'Equal Opportunity Cell', 'Support and redressal for equal opportunity matters.', 'STUDENT_SERVICES', 'https://vitap.ac.in/equal-opportunity-cell', true, null, 'PUBLISHED'),
  ('facilities-for-differently-abled-students', 'Facilities for differently-abled students', 'Accessibility provisions and support on campus.', 'STUDENT_SERVICES', 'https://vitap.ac.in/facilities-for-differently-abled', true, null, 'PUBLISHED'),
  ('e-samadhan-grievance-portal', 'e-Samadhan grievance portal', 'Raise and track a grievance with the university.', 'STUDENT_SERVICES', 'https://vitap.ac.in/e-samadhan', true, null, 'PUBLISHED'),
  ('gallery', 'Gallery', 'Photographs from campus events and celebrations.', 'IMPORTANT_LINKS', 'https://vitap.ac.in/gallery', true, null, 'PUBLISHED'),
  ('emergency-information', 'Emergency information', 'Emergency contacts and procedures published by the university.', 'EMERGENCY', 'https://vitap.ac.in/emergency-info', true, null, 'PUBLISHED')
on conflict (slug) do update set
  title       = excluded.title,
  description = excluded.description,
  category    = excluded.category,
  url         = excluded.url,
  file_type   = excluded.file_type;
