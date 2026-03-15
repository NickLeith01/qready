-- Add left/right/middle column colour columns if missing (fixes "column merchants.colour_left_column does not exist")
alter table public.merchants add column if not exists colour_left_column text;
alter table public.merchants add column if not exists colour_right_column text;
alter table public.merchants add column if not exists colour_middle_column text;
