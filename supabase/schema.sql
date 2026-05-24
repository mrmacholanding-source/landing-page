create extension if not exists pgcrypto;

create table if not exists public.site_settings (
  id integer primary key,
  site_title text not null default 'Biblioteca Viva de Historia',
  hero_kicker text default 'Archivo editorial',
  hero_title text not null default 'Biblioteca Viva de Historia',
  hero_text text not null default 'Archivo visual y editorial para historia, libros, revistas y fuentes.',
  base_color text not null default '#f5eddc',
  accent_color text not null default '#caa35f',
  secondary_color text not null default '#9eb8b2',
  ink_color text not null default '#33241b',
  background_image text default '',
  hero_image text default '',
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references public.sections(id) on delete set null,
  title text not null,
  summary text not null,
  display_date text not null,
  era text default '',
  source text default '',
  image_url text default '',
  content text not null,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.sections (name, description, slug, sort_order)
values
  ('Antiguedad', 'Fuentes, imperios y origenes del mundo antiguo.', 'antiguedad', 1),
  ('Edad Media', 'Cronicas, iglesias, ciudades y manuscritos.', 'edad-media', 2),
  ('Historia Biblica', 'Textos, contextos y lecturas historicas.', 'historia-biblica', 3)
on conflict (slug) do nothing;

alter table public.site_settings enable row level security;
alter table public.sections enable row level security;
alter table public.posts enable row level security;

create policy "public can read settings"
on public.site_settings for select
to anon, authenticated
using (true);

create policy "public can read sections"
on public.sections for select
to anon, authenticated
using (true);

create policy "public can read posts"
on public.posts for select
to anon, authenticated
using (true);

create policy "authenticated can manage settings"
on public.site_settings for all
to authenticated
using (true)
with check (true);

create policy "authenticated can manage sections"
on public.sections for all
to authenticated
using (true)
with check (true);

create policy "authenticated can manage posts"
on public.posts for all
to authenticated
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do nothing;

create policy "public can view site media"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'site-media');

create policy "authenticated can upload site media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'site-media');

create policy "authenticated can update site media"
on storage.objects for update
to authenticated
using (bucket_id = 'site-media')
with check (bucket_id = 'site-media');

create policy "authenticated can delete site media"
on storage.objects for delete
to authenticated
using (bucket_id = 'site-media');
