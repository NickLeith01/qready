-- If paid settings (colours, messages, close button) don't appear on the pager, run this to add any missing columns.
alter table public.merchants add column if not exists plan text not null default 'free';
alter table public.merchants add column if not exists logo_url text;
alter table public.merchants add column if not exists colour_background text;
alter table public.merchants add column if not exists colour_waiting text;
alter table public.merchants add column if not exists colour_ready text;
alter table public.merchants add column if not exists colour_left_column text;
alter table public.merchants add column if not exists colour_right_column text;
alter table public.merchants add column if not exists colour_middle_column text;
alter table public.merchants add column if not exists message_queue text;
alter table public.merchants add column if not exists message_ready text;
alter table public.merchants add column if not exists message_thankyou text;
alter table public.merchants add column if not exists close_btn_text text;
alter table public.merchants add column if not exists close_btn_url text;
