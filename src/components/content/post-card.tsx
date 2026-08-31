import Link from 'next/link';
import { Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/cn';
import { CategoryBadge, ImportanceBadge } from '@/components/ui/badge';
import { formatCount, formatRelative } from '@/lib/format';
import { BookmarkButton } from './bookmark-button';
import { ShareButton } from './share-button';
import type { PostWithRelations } from '@/types/domain';

/**
 * A campus feed card.
 *
 * Three densities, chosen by the surface rather than by the content:
 *  - `lead`   the first item in the feed, with a larger headline
 *  - `default` the standard feed row
 *  - `compact` sidebar and related lists
 *
 * Importance changes the *frame* (a left accent rule), not the fill. That keeps
 * an urgent notice unmistakable without turning the feed into a wall of red.
 */
export function PostCard({
  post,
  variant = 'default',
  bookmarked = false,
  signedIn = false,
  now,
}: {
  post: PostWithRelations;
  variant?: 'lead' | 'default' | 'compact';
  bookmarked?: boolean;
  signedIn?: boolean;
  now?: number;
}) {
  const href = `/news/${post.slug}`;
  const urgent = post.importance === 'URGENT';
  const important = post.importance === 'IMPORTANT';

  if (variant === 'compact') {
    return (
      <article className="group relative border-b border-line py-2.5 last:border-0">
        <div className="mb-1 flex items-center gap-2">
          <CategoryBadge category={post.category} />
          <time className="text-[11px] text-faint" dateTime={post.publishedAt ?? undefined}>
            {post.publishedAt ? formatRelative(post.publishedAt, now) : 'Draft'}
          </time>
        </div>
        <h3 className="text-[13px] font-medium leading-snug text-ink">
          <Link href={href} className="vp-clamp-2 after:absolute after:inset-0 hover:underline underline-offset-2">
            {post.title}
          </Link>
        </h3>
      </article>
    );
  }

  return (
    <article
      className={cn(
        'group relative rounded-md border bg-surface transition-[border-color,box-shadow] duration-200',
        'hover:border-line-strong hover:shadow-sm',
        urgent ? 'border-danger/40' : important ? 'border-warning/40' : 'border-line',
        variant === 'lead' ? 'p-5' : 'p-4',
      )}
    >
      {(urgent || important) && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-y-3 left-0 w-0.75 rounded-full',
            urgent ? 'bg-danger' : 'bg-warning',
          )}
        />
      )}

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <CategoryBadge category={post.category} size={variant === 'lead' ? 'sm' : 'xs'} />
        <ImportanceBadge importance={post.importance} />
        {post.club && (
          <Link
            href={`/clubs/${post.club.slug}`}
            className="relative z-1 text-[11.5px] font-medium text-muted transition-colors hover:text-ink hover:underline underline-offset-2"
          >
            {post.club.shortName}
          </Link>
        )}
        <time
          className="ml-auto shrink-0 text-[11.5px] text-faint"
          dateTime={post.publishedAt ?? undefined}
        >
          {post.publishedAt ? formatRelative(post.publishedAt, now) : 'Unpublished'}
        </time>
      </div>

      <h3
        className={cn(
          'font-semibold leading-tight text-ink',
          variant === 'lead' ? 'text-[19px] sm:text-[21px]' : 'text-[15.5px]',
        )}
      >
        <Link href={href} className="after:absolute after:inset-0 hover:underline underline-offset-[3px] decoration-2 decoration-line-strong">
          {post.title}
        </Link>
      </h3>

      <p
        className={cn(
          'mt-1.5 leading-relaxed text-muted',
          variant === 'lead' ? 'vp-clamp-3 text-[14px]' : 'vp-clamp-2 text-[13px]',
        )}
      >
        {post.summary}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line pt-2.5 text-[11.5px] text-faint">
        <span>{post.source}</span>
        {post.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" aria-hidden="true" />
            {post.location}
          </span>
        )}
        {post.eventDate && (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" aria-hidden="true" />
            {formatRelative(post.eventDate, now)}
          </span>
        )}
        <span className="vp-numeric">{formatCount(post.viewCount)} views</span>

        <span className="relative z-1 ml-auto flex items-center gap-0.5">
          <ShareButton title={post.title} path={href} />
          <BookmarkButton
            targetType="POST"
            targetId={post.id}
            initial={bookmarked}
            signedIn={signedIn}
            size="sm"
          />
        </span>
      </div>
    </article>
  );
}
