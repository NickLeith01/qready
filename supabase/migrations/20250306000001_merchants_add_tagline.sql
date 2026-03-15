-- If you already ran the first merchants migration, run this to add the tagline column.
alter table public.merchants add column if not exists business_tagline text;
