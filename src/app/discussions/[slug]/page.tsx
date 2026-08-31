import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import { PageBody } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Alert, Avatar, Breadcrumbs, RichText } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { ReportButton } from '@/components/content/report-button';
import { UpvoteButton } from '@/components/community/upvote-button';
import { CommentThread } from '@/components/community/comment-thread';
import { pageMetadata } from '@/lib/metadata';
import { formatDateTime, formatRelative, humanise } from '@/lib/format';
import { getDiscussionBySlug, listComments, upvotedIds } from '@/server/db/repositories/community';
import { getSessionUser } from '@/server/auth/session';
import { can } from '@/server/auth/rbac';

/** A single discussion thread with its replies. */

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const discussion = await getDiscussionBySlug(slug);
  if (!discussion || discussion.hidden) {
    return pageMetadata({ title: 'Thread not found', description: 'Not available.', path: `/discussions/${slug}`, noIndex: true });
  }
  return pageMetadata({
    title: discussion.title,
    description: discussion.body.slice(0, 180),
    path: `/discussions/${discussion.slug}`,
    type: 'article',
  });
}

export default async function DiscussionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getSessionUser();
  const canModerate = can(user?.role, 'moderation:act');

  const discussion = await getDiscussionBySlug(slug);
  if (!discussion || (discussion.hidden && !canModerate)) notFound();

  const [comments, upvotedDiscussions, upvotedComments] = await Promise.all([
    listComments('DISCUSSION', discussion.id, canModerate),
    upvotedIds(user?.id ?? null, 'DISCUSSION'),
    upvotedIds(user?.id ?? null, 'COMMENT'),
  ]);

  const now = Date.now();

  return (
    <PageBody>
      <div className="mx-auto max-w-3xl">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Discussions', href: '/discussions' },
            { label: discussion.title },
          ]}
        />

        {discussion.hidden && (
          <Alert tone="warning" className="mb-4" title="Hidden by moderation">
            Only moderators can see this thread. It is not visible to students.
          </Alert>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone="outline" size="xs">{humanise(discussion.category)}</Badge>
          {discussion.locked && (
            <Badge tone="neutral" size="xs">
              <Lock className="size-2.5" aria-hidden="true" />
              Locked
            </Badge>
          )}
        </div>

        <h1 className="t-h2 text-ink">{discussion.title}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-line py-3 text-[12.5px] text-faint">
          {discussion.author && (
            <span className="flex items-center gap-2">
              <Avatar name={discussion.author.displayName} src={discussion.author.avatarUrl} size="xs" />
              <span className="text-soft">{discussion.author.displayName}</span>
            </span>
          )}
          <time dateTime={discussion.createdAt} title={formatDateTime(discussion.createdAt)}>
            {formatRelative(discussion.createdAt, now)}
          </time>
          <span className="vp-numeric">
            {discussion.commentCount} {discussion.commentCount === 1 ? 'reply' : 'replies'}
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <UpvoteButton
              targetType="DISCUSSION"
              targetId={discussion.id}
              initialCount={discussion.upvoteCount}
              initialVoted={upvotedDiscussions.has(discussion.id)}
              signedIn={Boolean(user)}
            />
            <ReportButton targetType="DISCUSSION" targetId={discussion.id} signedIn={Boolean(user)} />
          </span>
        </div>

        <div className="mt-6">
          <RichText text={discussion.body} />
        </div>

        <div className="mt-10">
          <CommentThread
            targetType="DISCUSSION"
            targetId={discussion.id}
            comments={comments}
            upvoted={upvotedComments}
            signedIn={Boolean(user)}
            locked={discussion.locked}
            canModerate={canModerate}
          />
        </div>

        <div className="mt-10 border-t border-line pt-5">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/discussions">
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              All discussions
            </Link>
          </Button>
        </div>
      </div>
    </PageBody>
  );
}
