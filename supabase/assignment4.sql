-- =====================================================================
-- Assignment 4: Caption Clash
-- Paste this whole file into Supabase -> SQL Editor -> Run.
-- Safe to re-run.
-- =====================================================================

-- ---------- 1. New tables -------------------------------------------

create table if not exists public.images (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
    storage_path text not null,          -- path inside the "caption-images" bucket (no binary in the DB)
    image_url    text not null,          -- public URL of that file
    description  text,                   -- LLM step 1 output
    created_at   timestamptz not null default now()
);

create table if not exists public.captions (
    id         uuid primary key default gen_random_uuid(),
    image_id   uuid not null references public.images (id) on delete cascade,
    user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
    content    text not null check (char_length(content) between 1 and 300),  -- LLM step 2 output
    created_at timestamptz not null default now()
);

-- One row is INSERTED per vote. A user can vote once per caption.
create table if not exists public.caption_votes (
    id         uuid primary key default gen_random_uuid(),
    caption_id uuid not null references public.captions (id) on delete cascade,
    user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
    vote       smallint not null check (vote in (-1, 1)),
    created_at timestamptz not null default now(),
    unique (caption_id, user_id)
);

create index if not exists captions_image_id_idx on public.captions (image_id);
create index if not exists caption_votes_caption_id_idx on public.caption_votes (caption_id);

-- ---------- 2. Scores (votes stay private; only totals are public) ---

create or replace function public.caption_scores()
returns table (caption_id uuid, upvotes bigint, downvotes bigint, score bigint)
language sql
stable
security definer
set search_path = public
as $$
    select v.caption_id,
           count(*) filter (where v.vote = 1)  as upvotes,
           count(*) filter (where v.vote = -1) as downvotes,
           coalesce(sum(v.vote), 0)            as score
    from public.caption_votes v
    group by v.caption_id;
$$;

revoke all on function public.caption_scores() from public;
grant execute on function public.caption_scores() to anon, authenticated;

-- ---------- 3. Make the new-user trigger keep working with RLS on ----
-- The trigger on auth.users that creates a profiles row must run as
-- SECURITY DEFINER, otherwise RLS on profiles would block it.

do $$
declare r record;
begin
    for r in
        select distinct p.oid::regprocedure as fn
        from pg_trigger t
        join pg_proc p on p.oid = t.tgfoid
        join pg_namespace n on n.oid = p.pronamespace
        where t.tgrelid = 'auth.users'::regclass
          and not t.tgisinternal
          and n.nspname = 'public'
    loop
        execute format('alter function %s security definer set search_path = public', r.fn);
    end loop;
end $$;

-- ---------- 4. Row Level Security: ON for every table ---------------

do $$
declare r record;
begin
    for r in select tablename from pg_tables where schemaname = 'public' loop
        execute format('alter table public.%I enable row level security', r.tablename);
    end loop;
end $$;

-- profiles: you can only see and edit your own row (rows are created by the trigger)
drop policy if exists "profiles: read own"   on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: read own"   on public.profiles for select to authenticated
    using (id = auth.uid());
create policy "profiles: update own" on public.profiles for update to authenticated
    using (id = auth.uid()) with check (id = auth.uid());

-- humor table from assignment 2: read-only for everyone
drop policy if exists "humor: public read" on public."humor class gdn2112";
create policy "humor: public read" on public."humor class gdn2112" for select to anon, authenticated
    using (true);

-- images: everyone can look, only logged-in users can add their own, nobody can edit/delete
drop policy if exists "images: public read" on public.images;
drop policy if exists "images: insert own"  on public.images;
create policy "images: public read" on public.images for select to anon, authenticated
    using (true);
create policy "images: insert own"  on public.images for insert to authenticated
    with check (user_id = auth.uid());

-- captions: everyone can look, only the image owner can add captions to their image
drop policy if exists "captions: public read" on public.captions;
drop policy if exists "captions: insert own"  on public.captions;
create policy "captions: public read" on public.captions for select to anon, authenticated
    using (true);
create policy "captions: insert own"  on public.captions for insert to authenticated
    with check (
        user_id = auth.uid()
        and exists (select 1 from public.images i where i.id = image_id and i.user_id = auth.uid())
    );

-- caption_votes: logged-in users insert their own vote and can only see their own votes.
-- No update / delete. Public totals come from caption_scores().
drop policy if exists "votes: read own"   on public.caption_votes;
drop policy if exists "votes: insert own" on public.caption_votes;
create policy "votes: read own"   on public.caption_votes for select to authenticated
    using (user_id = auth.uid());
create policy "votes: insert own" on public.caption_votes for insert to authenticated
    with check (user_id = auth.uid());

-- ---------- 5. Storage bucket for uploaded images --------------------

insert into storage.buckets (id, name, public)
values ('caption-images', 'caption-images', true)
on conflict (id) do update set public = true;

-- logged-in users may upload only into a folder named after their user id
drop policy if exists "caption-images: upload own folder" on storage.objects;
create policy "caption-images: upload own folder" on storage.objects for insert to authenticated
    with check (
        bucket_id = 'caption-images'
        and (storage.foldername(name))[1] = auth.uid()::text
    );
