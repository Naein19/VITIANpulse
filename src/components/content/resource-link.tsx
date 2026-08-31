'use client';

import { ExternalLink, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BookmarkButton } from '@/components/content/bookmark-button';
import type { Resource } from '@/types/domain';

/**
 * A resource entry.
 *
 * External links open in a new tab, are marked as leaving VITPulse, and carry
 * `noopener noreferrer` so the destination cannot reach back into this window.
 */
export function ResourceLink({
  resource,
  bookmarked,
  signedIn,
}: {
  resource: Resource;
  bookmarked: boolean;
  signedIn: boolean;
}) {
  return (
    <li id={resource.slug} className="group relative scroll-mt-20">
      <div className="flex h-full items-start gap-3 rounded-md border border-line bg-primary p-3.5 transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-sm">
        <div className="min-w-0 flex-1">
          <h3 className="flex items-start gap-1.5 text-[13.5px] font-semibold leading-snug text-ink">
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="after:absolute after:inset-0 hover:underline underline-offset-2"
            >
              {resource.title}
            </a>
            <ExternalLink className="mt-0.5 size-3 shrink-0 text-faint" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{resource.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {resource.fileType && (
              <Badge tone="outline" size="xs">
                <FileText className="size-2.5" aria-hidden="true" />
                {resource.fileType}
              </Badge>
            )}
            {resource.contact && <span className="text-[11.5px] text-faint">{resource.contact}</span>}
          </div>
        </div>
        <div className="relative z-1 shrink-0">
          <BookmarkButton
            targetType="RESOURCE"
            targetId={resource.id}
            initial={bookmarked}
            signedIn={signedIn}
            size="sm"
          />
        </div>
      </div>
    </li>
  );
}
