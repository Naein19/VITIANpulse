import type { Metadata } from 'next';
import { siteUrl } from './env';

/**
 * SEO defaults and per-page helpers.
 *
 * Every shareable entity (post, event, club, opportunity) builds its metadata
 * through `pageMetadata` so titles, canonicals, OG and Twitter cards stay
 * consistent and no page ships without a description.
 */

export const SITE_NAME = 'VITPulse';
export const SITE_TAGLINE = 'Everything happening at VIT-AP, in one place.';
export const SITE_DESCRIPTION =
  'Campus news, events, clubs, previous year question papers, opportunities and student resources for VIT-AP — in one fast, student-built platform.';

export const baseMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'VIT-AP', 'VIT AP', 'campus events', 'student clubs', 'PYQ', 'previous year question papers',
    'internships', 'hackathons', 'Amaravati', 'student platform',
  ],
  authors: [{ name: 'VITPulse' }],
  manifest: '/manifest.webmanifest',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_IN',
    url: siteUrl,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [{ url: '/og.svg', width: 1200, height: 630, alt: `${SITE_NAME} — ${SITE_TAGLINE}` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ['/og.svg'],
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon.png' }],
  },
};

export interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: 'article' | 'website';
  publishedTime?: string | null;
  tags?: readonly string[];
  noIndex?: boolean;
}

export function pageMetadata(input: PageMetaInput): Metadata {
  const url = `${siteUrl}${input.path}`;
  const images = input.image ? [{ url: input.image, alt: input.title }] : baseMetadata.openGraph?.images;

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: input.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: input.type ?? 'website',
      url,
      title: input.title,
      description: input.description,
      images,
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.tags ? { tags: [...input.tags] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      ...(input.image ? { images: [input.image] } : {}),
    },
  };
}

/** JSON-LD builders. Rendered through a script tag with a serialised payload. */
export function eventJsonLd(input: {
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  url: string;
  organiser: string;
  isFree: boolean;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: input.name,
    description: input.description,
    startDate: input.startsAt,
    endDate: input.endsAt,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: input.venue,
      address: { '@type': 'PostalAddress', addressLocality: 'Amaravati', addressRegion: 'Andhra Pradesh', addressCountry: 'IN' },
    },
    organizer: { '@type': 'Organization', name: input.organiser },
    url: input.url,
    isAccessibleForFree: input.isFree,
  };
}

export function articleJsonLd(input: {
  headline: string;
  description: string;
  publishedAt: string | null;
  updatedAt: string;
  url: string;
  author: string;
  section: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: input.headline,
    description: input.description,
    datePublished: input.publishedAt ?? input.updatedAt,
    dateModified: input.updatedAt,
    mainEntityOfPage: input.url,
    author: { '@type': 'Person', name: input.author },
    publisher: { '@type': 'Organization', name: SITE_NAME },
    articleSection: input.section,
  };
}

export function organizationJsonLd(name: string, description: string, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    description,
    url,
    parentOrganization: { '@type': 'CollegeOrUniversity', name: 'VIT-AP University' },
  };
}

export function breadcrumbJsonLd(items: ReadonlyArray<{ label: string; href: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      item: `${siteUrl}${item.href}`,
    })),
  };
}
