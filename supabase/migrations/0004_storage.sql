-- =============================================================================
-- Storage buckets
--
-- `pyq-papers` is private: papers are served through short-lived signed URLs so
-- the library cannot be scraped from a guessable public path.
-- `media` is public, because logos and posters are embedded in pages and cached
-- by the CDN.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('pyq-papers', 'pyq-papers', false, 15728640, array['application/pdf']),
  ('media',      'media',      true,   5242880, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Any signed-in student may upload a paper; only staff may overwrite or delete.
create policy "pyq upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'pyq-papers');

create policy "pyq read staff" on storage.objects for select to authenticated
  using (bucket_id = 'pyq-papers' and has_role('EDITOR'));

create policy "pyq manage" on storage.objects for update to authenticated
  using (bucket_id = 'pyq-papers' and has_role('EDITOR'));

create policy "pyq delete" on storage.objects for delete to authenticated
  using (bucket_id = 'pyq-papers' and has_role('ADMIN'));

-- Media is world-readable; writes need at least a club admin.
create policy "media read" on storage.objects for select
  using (bucket_id = 'media');

create policy "media write" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and has_role('CLUB_ADMIN'));

create policy "media manage" on storage.objects for update to authenticated
  using (bucket_id = 'media' and has_role('CLUB_ADMIN'));

create policy "media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and has_role('ADMIN'));
