-- =============================================================================
-- VITPulse — core schema
--
-- Conventions used throughout:
--   * UUID primary keys, defaulted with gen_random_uuid()
--   * created_at / updated_at on every mutable table, maintained by a trigger
--   * enums for closed value sets, so bad data cannot be written at all
--   * foreign keys everywhere, with ON DELETE chosen per relationship
--   * indexes on the columns the repositories actually filter and sort by
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ----------------------------------------------------------------- enums ---
create type user_role as enum (
  'STUDENT','CLUB_MEMBER','CLUB_ADMIN','EDITOR','MODERATOR','ADMIN','SUPER_ADMIN'
);
create type content_status as enum ('DRAFT','PENDING_REVIEW','PUBLISHED','ARCHIVED','REJECTED');
create type post_category as enum (
  'ANNOUNCEMENT','CAMPUS','GUEST','SPORTS','CLUB','EVENT','ACADEMIC','PLACEMENT','OPPORTUNITY','ALERT'
);
create type importance_level as enum ('NORMAL','IMPORTANT','URGENT');
create type event_category as enum (
  'TECHNICAL','CULTURAL','SPORTS','WORKSHOP','HACKATHON','COMPETITION',
  'GUEST_LECTURE','CLUB_RECRUITMENT','PLACEMENT','ACADEMIC'
);
create type club_category as enum (
  'TECHNICAL','CULTURAL','SPORTS','PROFESSIONAL','SOCIAL','REGIONAL','CREATIVE'
);
create type recruitment_status as enum ('OPEN','CLOSED','UPCOMING');
create type club_role as enum ('MEMBER','CORE','LEAD','ADMIN');
create type registration_status as enum ('REGISTERED','WAITLISTED','CANCELLED','ATTENDED');
create type opportunity_type as enum (
  'INTERNSHIP','HACKATHON','COMPETITION','SCHOLARSHIP','RESEARCH',
  'FELLOWSHIP','CAMPUS_JOB','WORKSHOP','CERTIFICATION','PLACEMENT'
);
create type resource_category as enum (
  'ACADEMIC_CALENDAR','TIMETABLE','EXAMINATION','FORMS','IMPORTANT_LINKS','PORTALS',
  'PLACEMENT','SCHOLARSHIP','HOSTEL','LIBRARY','STUDENT_SERVICES','EMERGENCY'
);
create type exam_type as enum ('CAT1','CAT2','FAT','QUIZ','LAB','MAKEUP','RETEST');
create type pyq_source as enum ('UPLOAD','EXTERNAL');
create type ad_placement as enum ('HOME_BANNER','FEED_PROMOTED','SIDEBAR','EVENTS_PROMO','FEATURED_CLUB');
create type ad_status as enum ('DRAFT','PENDING_REVIEW','APPROVED','REJECTED','PAUSED','ENDED');
create type ad_event_kind as enum ('IMPRESSION','CLICK');
create type discussion_category as enum (
  'ACADEMICS','EVENTS','HOSTEL','CAMPUS','CLUBS','PLACEMENTS','GENERAL'
);
create type comment_target as enum ('DISCUSSION','POST','EVENT');
create type vote_target as enum ('DISCUSSION','COMMENT');
create type lost_found_kind as enum ('LOST','FOUND');
create type lost_found_status as enum ('PENDING_REVIEW','OPEN','RESOLVED','REJECTED');
create type contact_method as enum ('EMAIL','PHONE','IN_APP');
create type location_category as enum (
  'ACADEMIC','HOSTEL','LIBRARY','FOOD','SPORTS','AUDITORIUM','ADMIN','MEDICAL','SERVICE','PARKING'
);
-- Where a campus location's coordinate came from. Recorded so the UI can say
-- so, and so an unsourced coordinate can never be added silently.
create type coord_source as enum ('VITAP','OSM');
create type bookmark_target as enum ('POST','EVENT','CLUB','PYQ','OPPORTUNITY','RESOURCE');
create type notification_type as enum (
  'EVENT_REMINDER','CLUB_UPDATE','ANNOUNCEMENT','PYQ_UPLOAD','OPPORTUNITY_DEADLINE','SYSTEM','MODERATION'
);
create type report_target as enum ('POST','COMMENT','DISCUSSION','EVENT','LOST_FOUND','PYQ','AD');
create type report_status as enum ('OPEN','RESOLVED','DISMISSED');

-- --------------------------------------------------- updated_at trigger ---
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------- profiles ---
-- One row per auth.users row. `id` is the FK so RLS can compare to auth.uid().
create table profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text not null unique,
  display_name        text not null,
  username            text not null unique,
  avatar_url          text,
  bio                 text,
  role                user_role not null default 'STUDENT',
  branch              text,
  school              text,
  year                smallint check (year between 1 and 5),
  semester            smallint check (semester between 1 and 10),
  registration_number text,
  interests           text[] not null default '{}',
  suspended           boolean not null default false,
  suspended_reason    text,
  onboarded_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index profiles_role_idx on profiles(role);
create index profiles_branch_year_idx on profiles(branch, year);
create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------- clubs ---
create table clubs (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  name                  text not null,
  short_name            text not null,
  category              club_category not null,
  tagline               text not null,
  description           text not null,
  logo_url              text,
  banner_url            text,
  school                text,
  email                 text,
  faculty_coordinator   text,
  room                  text,
  recruitment_status    recruitment_status not null default 'CLOSED',
  recruitment_url       text,
  recruitment_closes_at timestamptz,
  membership_info       text,
  verified              boolean not null default false,
  status                content_status not null default 'PENDING_REVIEW',
  follower_count        integer not null default 0 check (follower_count >= 0),
  gallery_urls          text[] not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index clubs_status_category_idx on clubs(status, category);
create index clubs_recruitment_idx on clubs(recruitment_status) where status = 'PUBLISHED';
create index clubs_name_trgm_idx on clubs using gin (name gin_trgm_ops);
create trigger clubs_updated_at before update on clubs
  for each row execute function set_updated_at();

create table club_members (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references clubs(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  club_role    club_role not null default 'MEMBER',
  title        text,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  unique (club_id, user_id)
);
create index club_members_user_idx on club_members(user_id);
create index club_members_club_role_idx on club_members(club_id, club_role);

create table club_social_links (
  id       uuid primary key default gen_random_uuid(),
  club_id  uuid not null references clubs(id) on delete cascade,
  platform text not null,
  url      text not null,
  unique (club_id, platform)
);

create table club_follows (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  club_id    uuid not null references clubs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, club_id)
);
create index club_follows_club_idx on club_follows(club_id);

-- ---------------------------------------------------------------- posts ---
create table posts (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  summary         text not null,
  body            text not null,
  category        post_category not null,
  importance      importance_level not null default 'NORMAL',
  status          content_status not null default 'DRAFT',
  cover_image_url text,
  cover_image_alt text,
  source          text not null default 'VITPulse Desk',
  location        text,
  event_date      timestamptz,
  tags            text[] not null default '{}',
  author_id       uuid not null references profiles(id) on delete restrict,
  club_id         uuid references clubs(id) on delete set null,
  view_count      integer not null default 0,
  reaction_count  integer not null default 0,
  comment_count   integer not null default 0,
  pinned          boolean not null default false,
  published_at    timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- The feed's hot path: published posts, pinned first, newest first.
create index posts_feed_idx on posts(status, pinned desc, published_at desc);
create index posts_category_idx on posts(category) where status = 'PUBLISHED';
create index posts_club_idx on posts(club_id) where status = 'PUBLISHED';
create index posts_tags_idx on posts using gin (tags);
create index posts_title_trgm_idx on posts using gin (title gin_trgm_ops);
create trigger posts_updated_at before update on posts
  for each row execute function set_updated_at();

-- --------------------------------------------------------------- events ---
create table events (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text not null unique,
  title                  text not null,
  summary                text not null,
  description            text not null,
  category               event_category not null,
  status                 content_status not null default 'DRAFT',
  poster_url             text,
  poster_alt             text,
  club_id                uuid references clubs(id) on delete set null,
  organiser              text not null,
  school                 text,
  venue                  text not null,
  location_id            uuid,
  starts_at              timestamptz not null,
  ends_at                timestamptz not null,
  registration_required  boolean not null default false,
  registration_url       text,
  registration_deadline  timestamptz,
  seats                  integer check (seats is null or seats >= 0),
  seats_taken            integer not null default 0 check (seats_taken >= 0),
  is_paid                boolean not null default false,
  fee_inr                integer not null default 0 check (fee_inr >= 0),
  tags                   text[] not null default '{}',
  contact_email          text,
  created_by             uuid not null references profiles(id) on delete restrict,
  view_count             integer not null default 0,
  featured               boolean not null default false,
  published_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint events_time_order check (ends_at >= starts_at),
  constraint events_fee_matches_paid check ((is_paid and fee_inr > 0) or (not is_paid and fee_inr = 0))
);
create index events_window_idx on events(status, starts_at);
create index events_ends_idx on events(status, ends_at);
create index events_club_idx on events(club_id) where status = 'PUBLISHED';
create index events_category_idx on events(category) where status = 'PUBLISHED';
create index events_tags_idx on events using gin (tags);
create trigger events_updated_at before update on events
  for each row execute function set_updated_at();

create table event_registrations (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  status     registration_status not null default 'REGISTERED',
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index event_registrations_user_idx on event_registrations(user_id);
create trigger event_registrations_updated_at before update on event_registrations
  for each row execute function set_updated_at();

-- -------------------------------------------------------- opportunities ---
create table opportunities (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  organisation text not null,
  type         opportunity_type not null,
  summary      text not null,
  description  text not null,
  eligibility  text not null,
  location     text not null,
  remote       boolean not null default false,
  stipend      text,
  apply_url    text not null,
  deadline     timestamptz not null,
  status       content_status not null default 'DRAFT',
  tags         text[] not null default '{}',
  branches     text[] not null default '{}',
  years        smallint[] not null default '{}',
  logo_url     text,
  created_by   uuid not null references profiles(id) on delete restrict,
  view_count   integer not null default 0,
  click_count  integer not null default 0,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index opportunities_deadline_idx on opportunities(status, deadline);
create index opportunities_branches_idx on opportunities using gin (branches);
create trigger opportunities_updated_at before update on opportunities
  for each row execute function set_updated_at();

-- ------------------------------------------------------------ resources ---
create table resources (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  description text not null,
  category    resource_category not null,
  url         text not null,
  external    boolean not null default true,
  file_type   text,
  tags        text[] not null default '{}',
  contact     text,
  status      content_status not null default 'PUBLISHED',
  click_count integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index resources_category_idx on resources(status, category);
create trigger resources_updated_at before update on resources
  for each row execute function set_updated_at();

-- ------------------------------------------------------------------ PYQ ---
create table pyq_subjects (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  branch      text not null,
  semester    smallint not null check (semester between 1 and 10),
  credits     smallint,
  faculty     text,
  paper_count integer not null default 0 check (paper_count >= 0)
);
create index pyq_subjects_branch_sem_idx on pyq_subjects(branch, semester);

create table pyq_papers (
  id              uuid primary key default gen_random_uuid(),
  subject_id      uuid not null references pyq_subjects(id) on delete cascade,
  subject_code    text not null,
  subject_name    text not null,
  branch          text not null,
  semester        smallint not null,
  year            smallint not null,
  exam_type       exam_type not null,
  slot            text,
  file_url        text not null,
  file_size_bytes integer,
  page_count      smallint,
  source_kind     pyq_source not null default 'UPLOAD',
  external_id     text,
  status          content_status not null default 'PENDING_REVIEW',
  uploaded_by     uuid references profiles(id) on delete set null,
  download_count  integer not null default 0,
  report_count    integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index pyq_papers_lookup_idx on pyq_papers(status, branch, semester);
create index pyq_papers_subject_idx on pyq_papers(subject_id, year desc);
create index pyq_papers_popular_idx on pyq_papers(status, download_count desc);
create trigger pyq_papers_updated_at before update on pyq_papers
  for each row execute function set_updated_at();

create table pyq_requests (
  id            uuid primary key default gen_random_uuid(),
  subject_code  text not null,
  subject_name  text not null,
  branch        text not null,
  semester      smallint not null,
  detail        text not null,
  requested_by  uuid not null references profiles(id) on delete cascade,
  status        text not null default 'OPEN',
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------------ ads ---
create table ads (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references clubs(id) on delete cascade,
  name            text not null,
  headline        text not null,
  body            text not null,
  cta_label       text not null,
  cta_url         text not null,
  image_url       text,
  image_alt       text,
  placement       ad_placement not null,
  status          ad_status not null default 'PENDING_REVIEW',
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  priority        smallint not null default 10 check (priority between 0 and 100),
  impression_cap  integer check (impression_cap is null or impression_cap > 0),
  impression_count integer not null default 0,
  click_count     integer not null default 0,
  reviewed_by     uuid references profiles(id) on delete set null,
  review_note     text,
  created_by      uuid not null references profiles(id) on delete restrict,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint ads_window check (ends_at > starts_at)
);
-- Ad selection filters on placement + status and orders by priority.
create index ads_serving_idx on ads(placement, status, priority desc);
create index ads_club_idx on ads(club_id);
create trigger ads_updated_at before update on ads
  for each row execute function set_updated_at();

create table ad_events (
  id         uuid primary key default gen_random_uuid(),
  ad_id      uuid not null references ads(id) on delete cascade,
  kind       ad_event_kind not null,
  -- Deduplicates repeat counts per visitor per bucket without storing identity.
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  unique (kind, dedupe_key)
);
create index ad_events_ad_idx on ad_events(ad_id, created_at desc);

-- ------------------------------------------------------------ community ---
create table discussions (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  body          text not null,
  category      discussion_category not null,
  author_id     uuid not null references profiles(id) on delete cascade,
  upvote_count  integer not null default 0,
  comment_count integer not null default 0,
  locked        boolean not null default false,
  hidden        boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index discussions_list_idx on discussions(hidden, created_at desc);
create index discussions_category_idx on discussions(category) where hidden = false;
create trigger discussions_updated_at before update on discussions
  for each row execute function set_updated_at();

create table comments (
  id           uuid primary key default gen_random_uuid(),
  target_type  comment_target not null,
  target_id    uuid not null,
  parent_id    uuid references comments(id) on delete cascade,
  author_id    uuid not null references profiles(id) on delete cascade,
  body         text not null,
  upvote_count integer not null default 0,
  hidden       boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index comments_target_idx on comments(target_type, target_id, created_at);
create trigger comments_updated_at before update on comments
  for each row execute function set_updated_at();

create table votes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  target_type vote_target not null,
  target_id   uuid not null,
  created_at  timestamptz not null default now(),
  -- One vote per user per item: makes the toggle idempotent.
  unique (user_id, target_type, target_id)
);

create table lost_found (
  id             uuid primary key default gen_random_uuid(),
  kind           lost_found_kind not null,
  title          text not null,
  description    text not null,
  image_url      text,
  location_text  text not null,
  happened_on    timestamptz not null,
  contact_method contact_method not null default 'IN_APP',
  contact_value  text not null,
  status         lost_found_status not null default 'PENDING_REVIEW',
  reporter_id    uuid not null references profiles(id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index lost_found_status_idx on lost_found(status, happened_on desc);
create trigger lost_found_updated_at before update on lost_found
  for each row execute function set_updated_at();

-- ------------------------------------------------------- campus & admin ---
create table campus_locations (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  short_name  text not null,
  category    location_category not null,
  description text not null,
  timings     text,
  contact     text,
  -- Nullable throughout: a place with no published coordinate is recorded as
  -- unplaced rather than given a plausible-looking guess.
  map_x        numeric(5,2),
  map_y        numeric(5,2),
  lat          numeric(9,6),
  lng          numeric(9,6),
  levels       smallint,
  coord_source coord_source,
  tags         text[] not null default '{}'
);

alter table events
  add constraint events_location_fk
  foreign key (location_id) references campus_locations(id) on delete set null;

create table bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  target_type bookmark_target not null,
  target_id   text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);
create index bookmarks_user_type_idx on bookmarks(user_id, target_type, created_at desc);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       notification_type not null,
  title      text not null,
  body       text not null,
  href       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_inbox_idx on notifications(user_id, created_at desc);
create index notifications_unread_idx on notifications(user_id) where read_at is null;

create table notification_prefs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       notification_type not null,
  enabled    boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (user_id, type)
);

create table reports (
  id              uuid primary key default gen_random_uuid(),
  target_type     report_target not null,
  target_id       text not null,
  reason          text not null,
  detail          text,
  reporter_id     uuid not null references profiles(id) on delete cascade,
  status          report_status not null default 'OPEN',
  resolved_by     uuid references profiles(id) on delete set null,
  resolution_note text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index reports_queue_idx on reports(status, created_at desc);
create trigger reports_updated_at before update on reports
  for each row execute function set_updated_at();

create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id) on delete set null,
  actor_name  text not null,
  action      text not null,
  entity_type text not null,
  entity_id   text not null,
  detail      text,
  created_at  timestamptz not null default now()
);
create index audit_logs_recent_idx on audit_logs(created_at desc);
create index audit_logs_entity_idx on audit_logs(entity_type, entity_id);

create table analytics_events (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  path         text not null,
  entity_id    text,
  -- A daily-rotating hash. Not reversible, and meaningless after 24 hours.
  visitor_hash text not null,
  meta         jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
create index analytics_events_range_idx on analytics_events(created_at desc);
create index analytics_events_name_idx on analytics_events(name, created_at desc);
