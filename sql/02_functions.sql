-- =============================================================================
-- Helper functions
--
-- These are SECURITY DEFINER, so they run with the definer's rights. Each one
-- therefore validates its own inputs against a hard allowlist — a SECURITY
-- DEFINER function that interpolates caller-supplied identifiers would be an
-- injection hole regardless of RLS.
-- =============================================================================

-- The caller's role, read from their profile. Used by every policy below.
-- STABLE so Postgres can cache it per statement rather than per row.
create or replace function auth_role() returns user_role
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select case when p.suspended then 'STUDENT'::user_role else p.role end
       from profiles p where p.id = auth.uid()),
    'STUDENT'::user_role
  );
$$;

-- Membership rank check: does the caller hold at least this platform role?
create or replace function has_role(minimum user_role) returns boolean
language sql stable security definer set search_path = public as $$
  select case minimum
    when 'STUDENT'     then true
    when 'CLUB_MEMBER' then auth_role() <> 'STUDENT'
    when 'CLUB_ADMIN'  then auth_role() in ('CLUB_ADMIN','EDITOR','MODERATOR','ADMIN','SUPER_ADMIN')
    when 'EDITOR'      then auth_role() in ('EDITOR','ADMIN','SUPER_ADMIN')
    when 'MODERATOR'   then auth_role() in ('MODERATOR','ADMIN','SUPER_ADMIN')
    when 'ADMIN'       then auth_role() in ('ADMIN','SUPER_ADMIN')
    when 'SUPER_ADMIN' then auth_role() = 'SUPER_ADMIN'
    else false
  end;
$$;

-- Does the caller administer this club?
create or replace function administers_club(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from club_members m
    where m.club_id = target and m.user_id = auth.uid() and m.club_role = 'ADMIN'
  );
$$;

-- Is the caller a member of this club in any capacity?
create or replace function in_club(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from club_members m where m.club_id = target and m.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Counter increment.
--
-- View, download and impression counters must not be a read-modify-write from
-- the application: concurrent requests would lose updates. This does it in one
-- statement. The (table, column) pair is checked against a fixed allowlist, so
-- the dynamic SQL can only ever target a known counter.
-- ---------------------------------------------------------------------------
create or replace function bump_counter(p_table text, p_column text, p_id uuid, p_by integer default 1)
returns void
language plpgsql security definer set search_path = public as $$
declare
  allowed constant text[] := array[
    'posts.view_count','posts.reaction_count','posts.comment_count',
    'events.view_count','events.seats_taken',
    'clubs.follower_count',
    'opportunities.view_count','opportunities.click_count',
    'resources.click_count',
    'pyq_papers.download_count','pyq_papers.report_count',
    'pyq_subjects.paper_count',
    'ads.impression_count','ads.click_count',
    'discussions.upvote_count','discussions.comment_count',
    'comments.upvote_count'
  ];
  target text := p_table || '.' || p_column;
begin
  if not (target = any (allowed)) then
    raise exception 'bump_counter: % is not an allowed counter', target;
  end if;

  -- Identifiers are quoted; the allowlist above already constrains them to a
  -- known set, so this cannot be steered by caller input.
  execute format(
    'update %I set %I = greatest(0, coalesce(%I, 0) + $1) where id = $2',
    p_table, p_column, p_column
  ) using p_by, p_id;
end;
$$;

revoke all on function bump_counter(text, text, uuid, integer) from public;
grant execute on function bump_counter(text, text, uuid, integer) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Profile provisioning.
--
-- Creates the profile row when a new auth user appears, so the application
-- never has to race the trigger. The first account matching a bootstrap email
-- is promoted to SUPER_ADMIN.
-- ---------------------------------------------------------------------------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  final_username text;
  suffix integer := 0;
  bootstrap text[] := string_to_array(
    coalesce(current_setting('app.super_admin_emails', true), ''), ','
  );
begin
  base_username := regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9]', '', 'g');
  base_username := lower(left(nullif(base_username, ''), 24));
  if base_username is null then base_username := 'student'; end if;

  final_username := base_username;
  while exists (select 1 from profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into profiles (id, email, display_name, username, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', base_username),
    final_username,
    case when lower(new.email) = any (bootstrap) then 'SUPER_ADMIN'::user_role else 'STUDENT'::user_role end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Keep denormalised counters honest even if the application forgets.
-- ---------------------------------------------------------------------------
create or replace function sync_club_follower_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update clubs set follower_count = follower_count + 1 where id = new.club_id;
  elsif TG_OP = 'DELETE' then
    update clubs set follower_count = greatest(0, follower_count - 1) where id = old.club_id;
  end if;
  return null;
end;
$$;

create trigger club_follows_count
  after insert or delete on club_follows
  for each row execute function sync_club_follower_count();
