-- Run all of this in the SQL Editor of the SAME Supabase project used by
-- SUPABASE_URL. Safe to run again if you need to reapply the setup.

-- One API key for the single WhatsApp Web session. This table is accessed only
-- by the server with SUPABASE_SERVICE_ROLE_KEY. No anon/authenticated RLS
-- policies are created, so browser clients cannot read or write the key.
create table if not exists public.api_keys (
  session_id text primary key,
  api_key text not null unique,
  created_at timestamptz not null default now()
);
alter table public.api_keys enable row level security;

-- Public means anyone with the object URL can download that file. Uploads
-- happen only on the server using the service-role key; do not create a
-- public INSERT policy for storage.objects.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'whatsapp-media',
  'whatsapp-media',
  true,
  26214400, -- 25 MiB
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/png',
    'image/jpeg'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- To use a different bucket name, change it here AND set SUPABASE_BUCKET
-- to that name in your .env.local file.
