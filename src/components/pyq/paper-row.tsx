'use client';

import { useTransition } from 'react';
import { Download, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import { BookmarkButton } from '@/components/content/bookmark-button';
import { useToast } from '@/components/ui/toast';
import { formatBytes, formatCount } from '@/lib/format';
import { recordPyqDownloadAction } from '@/server/actions/pyq';
import { EXAM_TYPE_LABEL, type PyqPaper } from '@/types/domain';

/**
 * A single question paper.
 *
 * The download runs through a server action so the counter and the analytics
 * event are recorded, and so the file URL can be a short-lived signed URL rather
 * than a permanent public link.
 */
export function PaperRow({
  paper,
  bookmarked,
  signedIn,
  showSubject = true,
}: {
  paper: PyqPaper;
  bookmarked: boolean;
  signedIn: boolean;
  showSubject?: boolean;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const external = paper.sourceKind === 'EXTERNAL';

  const download = () => {
    if (external) {
      window.open(paper.fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    startTransition(async () => {
      const result = await recordPyqDownloadAction(paper.id);
      if (!result.ok) {
        toast(result.error, 'error');
        return;
      }
      window.open(result.data.url, '_blank', 'noopener,noreferrer');
    });
  };

  return (
    <li className="flex items-center gap-3 p-3 transition-colors hover:bg-accent">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-ink">
          {showSubject && <span className="font-mono text-[12.5px] text-muted">{paper.subjectCode}</span>}
          {showSubject && <span className="mx-1.5 text-faint">·</span>}
          {showSubject ? paper.subjectName : `${EXAM_TYPE_LABEL[paper.examType]} ${paper.year}`}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-faint">
          <Badge tone="outline" size="xs">{EXAM_TYPE_LABEL[paper.examType]}</Badge>
          <span className="vp-numeric">{paper.year}</span>
          {paper.slot && <span>Slot {paper.slot}</span>}
          <span>Sem {paper.semester}</span>
          {paper.fileSizeBytes && <span>{formatBytes(paper.fileSizeBytes)}</span>}
          <span className="vp-numeric">{formatCount(paper.downloadCount)} downloads</span>
          {external && <Badge tone="info" size="xs">PYQ Hub</Badge>}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <BookmarkButton targetType="PYQ" targetId={paper.id} initial={bookmarked} signedIn={signedIn} size="sm" />
        <button
          type="button"
          onClick={download}
          disabled={pending}
          aria-label={`Download ${paper.subjectCode} ${EXAM_TYPE_LABEL[paper.examType]} ${paper.year}`}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-sm border border-line-strong bg-primary px-2.5',
            'text-[12.5px] font-medium text-ink transition-colors hover:border-line-strong disabled:opacity-60',
          )}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : external ? (
            <ExternalLink className="size-3.5" aria-hidden="true" />
          ) : (
            <Download className="size-3.5" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">{external ? 'Open' : 'Download'}</span>
        </button>
      </div>
    </li>
  );
}
