import Link from 'next/link';
import { BadgeCheck, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import { formatCount, humanise } from '@/lib/format';
import { FollowButton } from './follow-button';
import type { Club } from '@/types/domain';

/** Club directory card. Recruitment state is the loudest signal on it. */
export function ClubCard({
  club,
  following = false,
  signedIn = false,
  variant = 'grid',
}: {
  club: Club;
  following?: boolean;
  signedIn?: boolean;
  variant?: 'grid' | 'row';
}) {
  const href = `/clubs/${club.slug}`;
  const recruiting = club.recruitmentStatus === 'OPEN';

  if (variant === 'row') {
    return (
      <article className="group relative flex items-center gap-3 border-b border-line py-3 last:border-0">
        <ClubAvatar club={club} size="sm" />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink">
            <Link href={href} className="truncate after:absolute after:inset-0 hover:underline underline-offset-2">
              {club.name}
            </Link>
            {club.verified && <BadgeCheck className="size-3.5 shrink-0 text-link" aria-label="Verified club" />}
          </h3>
          <p className="truncate text-[11.5px] text-faint">
            {humanise(club.category)} · {formatCount(club.followerCount)} followers
          </p>
        </div>
        {recruiting && <Badge tone="pulse" size="xs" dot>Recruiting</Badge>}
      </article>
    );
  }

  return (
    <article className="group relative flex flex-col rounded-md border border-line bg-primary p-4 transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-sm">
      <div className="flex items-start gap-3">
        <ClubAvatar club={club} />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-start gap-1.5 text-[14.5px] font-semibold leading-snug text-ink">
            <Link href={href} className="after:absolute after:inset-0 hover:underline underline-offset-[3px]">
              {club.name}
            </Link>
            {club.verified && (
              <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-link" aria-label="Verified club" />
            )}
          </h3>
          <p className="mt-0.5 text-[11.5px] text-faint">{humanise(club.category)}</p>
        </div>
      </div>

      <p className="vp-clamp-2 mt-2.5 text-[13px] leading-relaxed text-muted">{club.tagline}</p>

      <div className="mt-auto flex items-center gap-2 border-t border-line pt-3 text-[11.5px] text-faint">
        <span className="inline-flex items-center gap-1">
          <Users className="size-3" aria-hidden="true" />
          <span className="vp-numeric">{formatCount(club.followerCount)}</span>
        </span>
        {recruiting && <Badge tone="pulse" size="xs" dot>Recruiting</Badge>}
        {club.recruitmentStatus === 'UPCOMING' && <Badge tone="info" size="xs">Opening soon</Badge>}
        <span className="relative z-1 ml-auto">
          <FollowButton clubId={club.id} initial={following} signedIn={signedIn} size="xs" />
        </span>
      </div>
    </article>
  );
}

export function ClubAvatar({ club, size = 'md' }: { club: Pick<Club, 'name' | 'shortName' | 'logoUrl' | 'category'>; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'size-9 text-[11px]', md: 'size-11 text-[13px]', lg: 'size-16 text-[19px]' };

  if (club.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- club logos are small, remote, and already sized
    return <img src={club.logoUrl} alt="" className={cn('shrink-0 rounded-md border border-line object-cover', sizes[size])} loading="lazy" />;
  }

  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex shrink-0 items-center justify-center rounded-md border font-bold tracking-tight', sizes[size])}
      style={{
        backgroundColor: `var(--cat-${categoryHue(club.category)}-bg)`,
        color: `var(--cat-${categoryHue(club.category)}-fg)`,
        borderColor: 'transparent',
      }}
    >
      {club.shortName.slice(0, 4)}
    </span>
  );
}

function categoryHue(category: Club['category']): string {
  const map: Record<Club['category'], string> = {
    TECHNICAL: 'campus',
    CULTURAL: 'guest',
    SPORTS: 'sports',
    PROFESSIONAL: 'placement',
    SOCIAL: 'opportunity',
    REGIONAL: 'club',
    CREATIVE: 'announcement',
  };
  return map[category];
}
