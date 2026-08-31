/**
 * VITPulse domain model.
 *
 * These types are the single source of truth shared by the database adapters,
 * server actions and UI. They mirror the SQL schema in supabase/migrations
 * 1:1 (snake_case columns are mapped to camelCase at the adapter boundary).
 */

/* ---------------------------------------------------------------- identity */

export const ROLES = [
  'STUDENT',
  'CLUB_MEMBER',
  'CLUB_ADMIN',
  'EDITOR',
  'MODERATOR',
  'ADMIN',
  'SUPER_ADMIN',
] as const;
export type Role = (typeof ROLES)[number];

export const BRANCHES = [
  'CSE', 'CSE-AI', 'CSE-DS', 'CSE-CYBER', 'ECE', 'EEE', 'MECH', 'CIVIL',
  'BIOTECH', 'BBA', 'BCOM', 'BSC', 'LAW', 'DESIGN', 'MTECH', 'MBA', 'PHD',
] as const;
export type Branch = (typeof BRANCHES)[number];

export const SCHOOLS = ['SCOPE', 'SENSE', 'SMEC', 'SASH', 'VSB', 'VSL', 'VSD', 'SCHOOL_OF_LAW'] as const;
export type School = (typeof SCHOOLS)[number];

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  role: Role;
  branch: Branch | null;
  school: School | null;
  /** Academic year 1-5. */
  year: number | null;
  /** Current semester 1-10. */
  semester: number | null;
  registrationNumber: string | null;
  interests: string[];
  suspended: boolean;
  suspendedReason: string | null;
  onboardedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The minimal, non-sensitive projection safe to render next to public content. */
export interface PublicAuthor {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

/* ------------------------------------------------------------ content core */

export const CONTENT_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED', 'REJECTED'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const POST_CATEGORIES = [
  'ANNOUNCEMENT', 'CAMPUS', 'GUEST', 'SPORTS', 'CLUB',
  'EVENT', 'ACADEMIC', 'PLACEMENT', 'OPPORTUNITY', 'ALERT',
] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];

export const IMPORTANCE = ['NORMAL', 'IMPORTANT', 'URGENT'] as const;
export type Importance = (typeof IMPORTANCE)[number];

export interface Post {
  id: string;
  slug: string;
  title: string;
  summary: string;
  /** Markdown-ish rich text. Rendered through a strict sanitiser — never dangerouslySetInnerHTML with raw input. */
  body: string;
  category: PostCategory;
  importance: Importance;
  status: ContentStatus;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  source: string;
  location: string | null;
  eventDate: string | null;
  tags: string[];
  authorId: string;
  clubId: string | null;
  /** Denormalised counters maintained by the data layer. */
  viewCount: number;
  reactionCount: number;
  commentCount: number;
  pinned: boolean;
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PostWithRelations extends Post {
  author: PublicAuthor | null;
  club: ClubSummary | null;
}

/* ----------------------------------------------------------------- events */

export const EVENT_CATEGORIES = [
  'TECHNICAL', 'CULTURAL', 'SPORTS', 'WORKSHOP', 'HACKATHON',
  'COMPETITION', 'GUEST_LECTURE', 'CLUB_RECRUITMENT', 'PLACEMENT', 'ACADEMIC',
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export interface CampusEvent {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: EventCategory;
  status: ContentStatus;
  posterUrl: string | null;
  posterAlt: string | null;
  clubId: string | null;
  organiser: string;
  school: School | null;
  venue: string;
  locationId: string | null;
  startsAt: string;
  endsAt: string;
  registrationRequired: boolean;
  registrationUrl: string | null;
  registrationDeadline: string | null;
  /** null = unlimited. */
  seats: number | null;
  seatsTaken: number;
  isPaid: boolean;
  feeInr: number;
  tags: string[];
  contactEmail: string | null;
  createdBy: string;
  viewCount: number;
  featured: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventWithRelations extends CampusEvent {
  club: ClubSummary | null;
  location: CampusLocation | null;
}

export const REGISTRATION_STATUSES = ['REGISTERED', 'WAITLISTED', 'CANCELLED', 'ATTENDED'] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  status: RegistrationStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ clubs */

export const CLUB_CATEGORIES = [
  'TECHNICAL', 'CULTURAL', 'SPORTS', 'PROFESSIONAL', 'SOCIAL', 'REGIONAL', 'CREATIVE',
] as const;
export type ClubCategory = (typeof CLUB_CATEGORIES)[number];

export const RECRUITMENT_STATUSES = ['OPEN', 'CLOSED', 'UPCOMING'] as const;
export type RecruitmentStatus = (typeof RECRUITMENT_STATUSES)[number];

export interface ClubSocialLink {
  id: string;
  clubId: string;
  platform: 'INSTAGRAM' | 'LINKEDIN' | 'X' | 'GITHUB' | 'YOUTUBE' | 'DISCORD' | 'WEBSITE';
  url: string;
}

export interface Club {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  category: ClubCategory;
  tagline: string;
  description: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  school: School | null;
  email: string | null;
  facultyCoordinator: string | null;
  room: string | null;
  recruitmentStatus: RecruitmentStatus;
  recruitmentUrl: string | null;
  recruitmentClosesAt: string | null;
  membershipInfo: string | null;
  verified: boolean;
  status: ContentStatus;
  followerCount: number;
  galleryUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export type ClubSummary = Pick<Club, 'id' | 'slug' | 'name' | 'shortName' | 'logoUrl' | 'category' | 'verified'>;

export interface ClubWithRelations extends Club {
  socialLinks: ClubSocialLink[];
  coordinators: ClubMember[];
}

export const CLUB_ROLES = ['MEMBER', 'CORE', 'LEAD', 'ADMIN'] as const;
export type ClubRole = (typeof CLUB_ROLES)[number];

export interface ClubMember {
  id: string;
  clubId: string;
  userId: string;
  clubRole: ClubRole;
  title: string | null;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

/* ---------------------------------------------------------- opportunities */

export const OPPORTUNITY_TYPES = [
  'INTERNSHIP', 'HACKATHON', 'COMPETITION', 'SCHOLARSHIP', 'RESEARCH',
  'FELLOWSHIP', 'CAMPUS_JOB', 'WORKSHOP', 'CERTIFICATION', 'PLACEMENT',
] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export interface Opportunity {
  id: string;
  slug: string;
  title: string;
  organisation: string;
  type: OpportunityType;
  summary: string;
  description: string;
  eligibility: string;
  location: string;
  remote: boolean;
  stipend: string | null;
  applyUrl: string;
  deadline: string;
  status: ContentStatus;
  tags: string[];
  branches: Branch[];
  years: number[];
  logoUrl: string | null;
  createdBy: string;
  viewCount: number;
  clickCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/* --------------------------------------------------------------- resources */

export const RESOURCE_CATEGORIES = [
  'ACADEMIC_CALENDAR', 'TIMETABLE', 'EXAMINATION', 'FORMS', 'IMPORTANT_LINKS',
  'PORTALS', 'PLACEMENT', 'SCHOLARSHIP', 'HOSTEL', 'LIBRARY', 'STUDENT_SERVICES',
  'EMERGENCY',
] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export interface Resource {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: ResourceCategory;
  url: string;
  /** External links open in a new tab and are marked as leaving VITPulse. */
  external: boolean;
  fileType: string | null;
  tags: string[];
  contact: string | null;
  status: ContentStatus;
  clickCount: number;
  updatedAt: string;
  createdAt: string;
}

/* -------------------------------------------------------------------- PYQ */

export interface PyqSubject {
  id: string;
  code: string;
  name: string;
  branch: Branch;
  semester: number;
  credits: number | null;
  faculty: string | null;
  paperCount: number;
}

export const EXAM_TYPES = ['CAT1', 'CAT2', 'FAT', 'QUIZ', 'LAB', 'MAKEUP', 'RETEST'] as const;
export type ExamType = (typeof EXAM_TYPES)[number];

export interface PyqPaper {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  branch: Branch;
  semester: number;
  year: number;
  examType: ExamType;
  slot: string | null;
  fileUrl: string;
  fileSizeBytes: number | null;
  pageCount: number | null;
  /** Where the paper came from — `EXTERNAL` rows are proxied from the PYQ Hub app. */
  sourceKind: 'UPLOAD' | 'EXTERNAL';
  externalId: string | null;
  status: ContentStatus;
  uploadedBy: string | null;
  downloadCount: number;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------- ads */

export const AD_PLACEMENTS = [
  'HOME_BANNER', 'FEED_PROMOTED', 'SIDEBAR', 'EVENTS_PROMO', 'FEATURED_CLUB',
] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export const AD_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PAUSED', 'ENDED'] as const;
export type AdStatus = (typeof AD_STATUSES)[number];

export interface AdCampaign {
  id: string;
  clubId: string;
  name: string;
  /** Plain text only. Advertisers can never submit HTML — see sanitizePlainText. */
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string | null;
  imageAlt: string | null;
  placement: AdPlacement;
  status: AdStatus;
  startsAt: string;
  endsAt: string;
  priority: number;
  /** null = uncapped. */
  impressionCap: number | null;
  impressionCount: number;
  clickCount: number;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdWithClub extends AdCampaign {
  club: ClubSummary | null;
}

/* ------------------------------------------------------- community & misc */

export const DISCUSSION_CATEGORIES = [
  'ACADEMICS', 'EVENTS', 'HOSTEL', 'CAMPUS', 'CLUBS', 'PLACEMENTS', 'GENERAL',
] as const;
export type DiscussionCategory = (typeof DISCUSSION_CATEGORIES)[number];

export interface Discussion {
  id: string;
  slug: string;
  title: string;
  body: string;
  category: DiscussionCategory;
  authorId: string;
  author: PublicAuthor | null;
  upvoteCount: number;
  commentCount: number;
  locked: boolean;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  /** Polymorphic parent — one of the entity kinds below. */
  targetType: 'DISCUSSION' | 'POST' | 'EVENT';
  targetId: string;
  parentId: string | null;
  authorId: string;
  author: PublicAuthor | null;
  body: string;
  upvoteCount: number;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export const LOST_FOUND_KINDS = ['LOST', 'FOUND'] as const;
export type LostFoundKind = (typeof LOST_FOUND_KINDS)[number];

export const LOST_FOUND_STATUSES = ['PENDING_REVIEW', 'OPEN', 'RESOLVED', 'REJECTED'] as const;
export type LostFoundStatus = (typeof LOST_FOUND_STATUSES)[number];

export interface LostFoundItem {
  id: string;
  kind: LostFoundKind;
  title: string;
  description: string;
  imageUrl: string | null;
  locationText: string;
  happenedOn: string;
  /** Contact details are only revealed to signed-in students — never in public JSON. */
  contactMethod: 'EMAIL' | 'PHONE' | 'IN_APP';
  contactValue: string;
  status: LostFoundStatus;
  reporterId: string;
  createdAt: string;
  updatedAt: string;
}

/** Lost & found as exposed to anonymous visitors: contact fields stripped. */
export type PublicLostFoundItem = Omit<LostFoundItem, 'contactValue' | 'reporterId'> & {
  contactAvailable: boolean;
};

/* -------------------------------------------------------- campus / places */

export const LOCATION_CATEGORIES = [
  'ACADEMIC', 'HOSTEL', 'LIBRARY', 'FOOD', 'SPORTS', 'AUDITORIUM',
  'ADMIN', 'MEDICAL', 'SERVICE', 'PARKING',
] as const;
export type LocationCategory = (typeof LOCATION_CATEGORIES)[number];

export interface CampusLocation {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  category: LocationCategory;
  description: string;
  timings: string | null;
  contact: string | null;
  /** Normalised 0-100 coordinates on the illustrated campus plan. */
  mapX: number;
  mapY: number;
  /** Real-world coordinates, populated when a mapping provider is wired up. */
  lat: number | null;
  lng: number | null;
  tags: string[];
}

/* ------------------------------------------------- engagement & messaging */

export const BOOKMARK_TYPES = ['POST', 'EVENT', 'CLUB', 'PYQ', 'OPPORTUNITY', 'RESOURCE'] as const;
export type BookmarkType = (typeof BOOKMARK_TYPES)[number];

export interface Bookmark {
  id: string;
  userId: string;
  targetType: BookmarkType;
  targetId: string;
  createdAt: string;
}

export const NOTIFICATION_TYPES = [
  'EVENT_REMINDER', 'CLUB_UPDATE', 'ANNOUNCEMENT', 'PYQ_UPLOAD',
  'OPPORTUNITY_DEADLINE', 'SYSTEM', 'MODERATION',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export type NotificationPreferences = Record<NotificationType, boolean>;

export interface ClubFollow {
  id: string;
  userId: string;
  clubId: string;
  createdAt: string;
}

/* ---------------------------------------------------- moderation & audit */

export const REPORT_TARGETS = ['POST', 'COMMENT', 'DISCUSSION', 'EVENT', 'LOST_FOUND', 'PYQ', 'AD'] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export const REPORT_STATUSES = ['OPEN', 'RESOLVED', 'DISMISSED'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface Report {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  reason: string;
  detail: string | null;
  reporterId: string;
  status: ReportStatus;
  resolvedBy: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  /** Small, non-sensitive diff summary. Never store raw PII here. */
  detail: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------- analytics */

export const ANALYTICS_EVENTS = [
  'page_view', 'post_view', 'event_view', 'event_register_click', 'pyq_download',
  'search', 'bookmark', 'club_follow', 'ad_impression', 'ad_click', 'resource_click',
  'opportunity_click',
] as const;
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export interface AnalyticsEvent {
  id: string;
  name: AnalyticsEventName;
  path: string;
  entityId: string | null;
  /** A rotating daily hash — lets us count uniques without storing an identity. */
  visitorHash: string;
  meta: Record<string, string | number | boolean | null>;
  createdAt: string;
}

/* -------------------------------------------------------------- utility */

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export type SearchEntity = 'post' | 'event' | 'club' | 'pyq' | 'opportunity' | 'resource';

export interface SearchHit {
  entity: SearchEntity;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  badge: string | null;
  score: number;
}
