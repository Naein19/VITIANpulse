-- =============================================================================
-- Row Level Security
--
-- RLS is enabled on every table. The rules below are the *last* line of defence:
-- the application already checks permissions in `requirePermission`, but a bug
-- there must not become a data breach.
--
-- Reading model: published content is public; personal rows are visible only to
-- their owner; moderation and audit surfaces require a staff role.
-- Writing model: students write only rows they own; everything else needs a
-- role, and club-scoped writes additionally need club administration.
-- =============================================================================

alter table profiles            enable row level security;
alter table clubs               enable row level security;
alter table club_members        enable row level security;
alter table club_social_links   enable row level security;
alter table club_follows        enable row level security;
alter table posts               enable row level security;
alter table events              enable row level security;
alter table event_registrations enable row level security;
alter table opportunities       enable row level security;
alter table resources           enable row level security;
alter table pyq_subjects        enable row level security;
alter table pyq_papers          enable row level security;
alter table pyq_requests        enable row level security;
alter table ads                 enable row level security;
alter table ad_events           enable row level security;
alter table discussions         enable row level security;
alter table comments            enable row level security;
alter table votes               enable row level security;
alter table lost_found          enable row level security;
alter table campus_locations    enable row level security;
alter table bookmarks           enable row level security;
alter table notifications       enable row level security;
alter table notification_prefs  enable row level security;
alter table reports             enable row level security;
alter table audit_logs          enable row level security;
alter table analytics_events    enable row level security;

-- ------------------------------------------------------------- profiles ---
-- Every signed-in student can see the public shape of other profiles (names
-- appear next to posts); only the owner or an admin can change one.
create policy profiles_select on profiles for select
  using (true);

create policy profiles_update_own on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_update_staff on profiles for update
  using (has_role('ADMIN')) with check (has_role('ADMIN'));

create policy profiles_insert_self on profiles for insert
  with check (id = auth.uid());

-- ---------------------------------------------------------------- clubs ---
create policy clubs_select on clubs for select
  using (status = 'PUBLISHED' or has_role('MODERATOR') or administers_club(id));

create policy clubs_insert on clubs for insert
  with check (has_role('ADMIN'));

create policy clubs_update on clubs for update
  using (administers_club(id) or has_role('ADMIN'))
  with check (administers_club(id) or has_role('ADMIN'));

create policy clubs_delete on clubs for delete using (has_role('ADMIN'));

create policy club_members_select on club_members for select using (true);
create policy club_members_write on club_members for all
  using (administers_club(club_id) or has_role('ADMIN'))
  with check (administers_club(club_id) or has_role('ADMIN'));

create policy club_socials_select on club_social_links for select using (true);
create policy club_socials_write on club_social_links for all
  using (administers_club(club_id) or has_role('ADMIN'))
  with check (administers_club(club_id) or has_role('ADMIN'));

-- A follow row belongs to the follower; the club sees only its aggregate count.
create policy club_follows_select on club_follows for select
  using (user_id = auth.uid() or administers_club(club_id) or has_role('ADMIN'));
create policy club_follows_insert on club_follows for insert
  with check (user_id = auth.uid());
create policy club_follows_delete on club_follows for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------- posts ---
create policy posts_select on posts for select
  using (
    status = 'PUBLISHED'
    or author_id = auth.uid()
    or has_role('EDITOR')
    or (club_id is not null and administers_club(club_id))
  );

create policy posts_insert on posts for insert
  with check (
    author_id = auth.uid()
    and (
      has_role('EDITOR')
      or (club_id is not null and administers_club(club_id))
    )
    -- Only an editor may create something already published.
    and (status <> 'PUBLISHED' or has_role('EDITOR'))
  );

create policy posts_update on posts for update
  using (
    has_role('EDITOR')
    or author_id = auth.uid()
    or (club_id is not null and administers_club(club_id))
  )
  with check (status <> 'PUBLISHED' or has_role('EDITOR'));

create policy posts_delete on posts for delete using (has_role('ADMIN'));

-- --------------------------------------------------------------- events ---
create policy events_select on events for select
  using (
    status = 'PUBLISHED'
    or created_by = auth.uid()
    or has_role('EDITOR')
    or (club_id is not null and administers_club(club_id))
  );

create policy events_insert on events for insert
  with check (
    created_by = auth.uid()
    and (has_role('EDITOR') or (club_id is not null and administers_club(club_id)))
    and (status <> 'PUBLISHED' or has_role('EDITOR'))
  );

create policy events_update on events for update
  using (
    has_role('EDITOR')
    or created_by = auth.uid()
    or (club_id is not null and administers_club(club_id))
  )
  with check (status <> 'PUBLISHED' or has_role('EDITOR'));

create policy events_delete on events for delete using (has_role('ADMIN'));

-- A student sees only their own registrations; club admins see their event's.
create policy registrations_select on event_registrations for select
  using (
    user_id = auth.uid()
    or has_role('EDITOR')
    or exists (
      select 1 from events e
      where e.id = event_id and e.club_id is not null and administers_club(e.club_id)
    )
  );
create policy registrations_insert on event_registrations for insert
  with check (user_id = auth.uid());
create policy registrations_update on event_registrations for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------- opportunities & docs ---
create policy opportunities_select on opportunities for select
  using (status = 'PUBLISHED' or has_role('EDITOR'));
create policy opportunities_write on opportunities for all
  using (has_role('EDITOR')) with check (has_role('EDITOR'));

create policy resources_select on resources for select
  using (status = 'PUBLISHED' or has_role('EDITOR'));
create policy resources_write on resources for all
  using (has_role('EDITOR')) with check (has_role('EDITOR'));

create policy locations_select on campus_locations for select using (true);
create policy locations_write on campus_locations for all
  using (has_role('ADMIN')) with check (has_role('ADMIN'));

-- ------------------------------------------------------------------ PYQ ---
create policy pyq_subjects_select on pyq_subjects for select using (true);
create policy pyq_subjects_write on pyq_subjects for all
  using (has_role('EDITOR')) with check (has_role('EDITOR'));

-- An uploader can see their own paper while it waits for review.
create policy pyq_papers_select on pyq_papers for select
  using (status = 'PUBLISHED' or uploaded_by = auth.uid() or has_role('EDITOR'));

create policy pyq_papers_insert on pyq_papers for insert
  with check (
    uploaded_by = auth.uid()
    -- A student can never self-publish; approval is an editor action.
    and status = 'PENDING_REVIEW'
  );

create policy pyq_papers_update on pyq_papers for update
  using (has_role('EDITOR')) with check (has_role('EDITOR'));

create policy pyq_papers_delete on pyq_papers for delete using (has_role('ADMIN'));

create policy pyq_requests_select on pyq_requests for select
  using (requested_by = auth.uid() or has_role('EDITOR'));
create policy pyq_requests_insert on pyq_requests for insert
  with check (requested_by = auth.uid());

-- ------------------------------------------------------------------ ads ---
-- Only approved campaigns are readable by students; a club sees its own.
create policy ads_select on ads for select
  using (status = 'APPROVED' or administers_club(club_id) or has_role('MODERATOR'));

create policy ads_insert on ads for insert
  with check (
    created_by = auth.uid()
    and administers_club(club_id)
    -- A club can submit, never approve.
    and status in ('DRAFT','PENDING_REVIEW')
  );

create policy ads_update_own on ads for update
  using (administers_club(club_id))
  with check (administers_club(club_id) and status in ('DRAFT','PENDING_REVIEW','PAUSED'));

create policy ads_update_staff on ads for update
  using (has_role('MODERATOR')) with check (has_role('MODERATOR'));

-- Ad events are written by the service role only; clubs read their own totals.
create policy ad_events_select on ad_events for select
  using (
    has_role('MODERATOR')
    or exists (select 1 from ads a where a.id = ad_id and administers_club(a.club_id))
  );

-- ------------------------------------------------------------ community ---
create policy discussions_select on discussions for select
  using (hidden = false or author_id = auth.uid() or has_role('MODERATOR'));
create policy discussions_insert on discussions for insert
  with check (author_id = auth.uid());
create policy discussions_update on discussions for update
  using (author_id = auth.uid() or has_role('MODERATOR'))
  with check (author_id = auth.uid() or has_role('MODERATOR'));
create policy discussions_delete on discussions for delete using (has_role('MODERATOR'));

create policy comments_select on comments for select
  using (hidden = false or author_id = auth.uid() or has_role('MODERATOR'));
create policy comments_insert on comments for insert
  with check (author_id = auth.uid());
create policy comments_update on comments for update
  using (author_id = auth.uid() or has_role('MODERATOR'))
  with check (author_id = auth.uid() or has_role('MODERATOR'));
create policy comments_delete on comments for delete using (has_role('MODERATOR'));

create policy votes_select on votes for select using (user_id = auth.uid());
create policy votes_insert on votes for insert with check (user_id = auth.uid());
create policy votes_delete on votes for delete using (user_id = auth.uid());

-- Open listings are public, but the contact column is only exposed through the
-- application's own projection — see `toPublicLostFound`.
create policy lost_found_select on lost_found for select
  using (status = 'OPEN' or reporter_id = auth.uid() or has_role('MODERATOR'));
create policy lost_found_insert on lost_found for insert
  with check (reporter_id = auth.uid() and status = 'PENDING_REVIEW');
create policy lost_found_update on lost_found for update
  using (reporter_id = auth.uid() or has_role('MODERATOR'))
  with check (reporter_id = auth.uid() or has_role('MODERATOR'));

-- ------------------------------------------------------------- personal ---
-- The rule that matters for "users cannot modify another user's bookmarks".
create policy bookmarks_all on bookmarks for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_select on notifications for select using (user_id = auth.uid());
create policy notifications_update on notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notification_prefs_all on notification_prefs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------- moderation and audit ---
create policy reports_select on reports for select
  using (reporter_id = auth.uid() or has_role('MODERATOR'));
create policy reports_insert on reports for insert
  with check (reporter_id = auth.uid());
create policy reports_update on reports for update
  using (has_role('MODERATOR')) with check (has_role('MODERATOR'));

-- The audit log is append-only from the application's perspective: no update or
-- delete policy exists, so those operations are denied for every non-service role.
create policy audit_logs_select on audit_logs for select using (has_role('ADMIN'));

-- Analytics rows are written by the service role and read by staff only.
create policy analytics_select on analytics_events for select using (has_role('EDITOR'));
