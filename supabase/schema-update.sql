alter table public.site_settings
  add column if not exists left_rail_image text default '',
  add column if not exists right_rail_image text default '';

alter table public.posts
  add column if not exists image_url_2 text default '',
  add column if not exists image_url_3 text default '',
  add column if not exists gallery_urls text default '';
