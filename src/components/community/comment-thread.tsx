'use client';

import { useActionState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { EyeOff, MessageSquare, Send } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import { Alert, Avatar } from '@/components/ui/misc';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { UpvoteButton } from './upvote-button';
import { ReportButton } from '@/components/content/report-button';
import { formatRelative } from '@/lib/format';
import { createCommentAction } from '@/server/actions/community';
import type { Comment } from '@/types/domain';

/**
 * Replies plus the composer.
 *
 * The composer is a real form posting to a server action, so it degrades to a
 * full page submit without JavaScript. Rate limiting (20 per five minutes) and
 * the 2,000 character cap are enforced server-side.
 */
export function CommentThread({
  targetType,
  targetId,
  comments,
  upvoted,
  signedIn,
  locked,
  }: {
  targetType: 'DISCUSSION' | 'POST' | 'EVENT';
  targetId: string;
  comments: readonly Comment[];
  upvoted: ReadonlySet<string>;
  signedIn: boolean;
  locked: boolean;
  canModerate: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const now = Date.now();

  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const result = await createCommentAction(null, formData);
      if (result.ok) {
        formRef.current?.reset();
        toast('Reply posted', 'success');
        router.refresh();
      } else {
        toast(result.error, 'error');
      }
      return result;
    },
    null,
  );

  return (
    <section aria-labelledby="replies-heading">
      <h2 id="replies-heading" className="mb-4 flex items-center gap-2 border-b border-line pb-2.5 t-h4 text-ink">
        <MessageSquare className="size-4 text-faint" aria-hidden="true" />
        {comments.length} {comments.length === 1 ? 'reply' : 'replies'}
      </h2>

      {comments.length === 0 ? (
        <p className="rounded-md border border-dashed border-line-strong bg-primary px-4 py-8 text-center text-[13px] text-muted">
          No replies yet. If you know the answer, you are the person to write it.
        </p>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className={cn(
                'rounded-md border border-line bg-primary p-4',
                comment.hidden && 'border-dashed opacity-70',
              )}
            >
              {comment.hidden && (
                <Badge tone="warning" size="xs" className="mb-2">
                  <EyeOff className="size-2.5" aria-hidden="true" />
                  Hidden by moderation
                </Badge>
              )}
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-faint">
                {comment.author && (
                  <span className="flex items-center gap-2">
                    <Avatar name={comment.author.displayName} src={comment.author.avatarUrl} size="xs" />
                    <span className="font-medium text-soft">{comment.author.displayName}</span>
                  </span>
                )}
                <time dateTime={comment.createdAt}>{formatRelative(comment.createdAt, now)}</time>
              </div>

              <p className="t-prose whitespace-pre-line text-soft">{comment.body}</p>

              <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-2.5">
                <UpvoteButton
                  targetType="COMMENT"
                  targetId={comment.id}
                  initialCount={comment.upvoteCount}
                  initialVoted={upvoted.has(comment.id)}
                  signedIn={signedIn}
                />
                <ReportButton targetType="COMMENT" targetId={comment.id} signedIn={signedIn} label="" />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        {locked ? (
          <Alert tone="neutral" title="This thread is locked">
            A moderator closed it to new replies.
          </Alert>
        ) : !signedIn ? (
          <Alert
            tone="info"
            action={
              <Button size="sm" variant="primary" asChild>
                <a href="/login">Sign in</a>
              </Button>
            }
          >
            Sign in with your university email to reply.
          </Alert>
        ) : (
          <form ref={formRef} action={formAction} className="rounded-md border border-line bg-primary p-4">
            <input type="hidden" name="targetType" value={targetType} />
            <input type="hidden" name="targetId" value={targetId} />

            <label htmlFor="comment-body" className="mb-2 block t-sm-strong text-ink">
              Add a reply
            </label>
            <Textarea
              id="comment-body"
              name="body"
              rows={4}
              required
              maxLength={2000}
              placeholder="Answer from experience where you can — what actually happened, not what should happen."
              invalid={Boolean(state && !state.ok && state.fieldErrors?.body)}
            />
            {state && !state.ok && state.fieldErrors?.body && (
              <p role="alert" className="mt-1.5 text-[12px] font-medium text-danger-ink">
                {state.fieldErrors.body[0]}
              </p>
            )}

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[11.5px] text-faint">Posted under your real name.</p>
              <Button type="submit" variant="primary" size="sm" loading={pending}>
                <Send className="size-3.5" aria-hidden="true" />
                Post reply
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
