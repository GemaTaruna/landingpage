import { createClient } from '@supabase/supabase-js';

// Read values from the Vite environment environment variables
const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Automatically clean the URL in case the user copied the REST endpoint directly
const cleanSupabaseUrl = (url: string) => {
  let cleaned = url.trim();
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  if (cleaned.endsWith('/rest/v1')) {
    cleaned = cleaned.slice(0, -8);
  }
  return cleaned;
};

const supabaseUrl = cleanSupabaseUrl(rawSupabaseUrl);

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Provide safe fallback values to prevent crashes during initial rendering/build
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project-id.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

/**
 * SQL Setup helper info for user reference.
 * They can copy-paste this direct to Supabase -> SQL Editor.
 */
export const SUPABASE_SQL_SETUP = `
-- 1. Create PERSONNEL table if not exists
create table if not exists public.personnel (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  section text not null,
  instrument text not null,
  angkatan text not null,
  avatar_url text,
  instagram text,
  tiktok text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- JALANKAN INI JIKA TABEL SEBELUMNYA SUDAH ADA (MIGRASI):
-- alter table public.personnel add column if not exists instagram text;
-- alter table public.personnel add column if not exists tiktok text;

-- 2. Create GALLERY table if not exists
create table if not exists public.gallery (
  id uuid default gen_random_uuid() primary key,
  title text default '',
  image_url text not null,
  is_large boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create SETTINGS table for Website Content Management if not exists
create table if not exists public.settings (
  key text primary key,
  value jsonb not null
);

-- Enable RLS (Row Level Security) - Optional but recommended
alter table public.personnel enable row level security;
alter table public.gallery enable row level security;
alter table public.settings enable row level security;

-- Drop existing policies if any to prevent duplicate errors
drop policy if exists "Allow public read access on personnel" on public.personnel;
drop policy if exists "Allow public read access on gallery" on public.gallery;
drop policy if exists "Allow public read access on settings" on public.settings;

drop policy if exists "Allow full access for admin on personnel" on public.personnel;
drop policy if exists "Allow full access for admin on gallery" on public.gallery;
drop policy if exists "Allow full access for admin on settings" on public.settings;

-- Public read access policies
create policy "Allow public read access on personnel" on public.personnel for select using (true);
create policy "Allow public read access on gallery" on public.gallery for select using (true);
create policy "Allow public read access on settings" on public.settings for select using (true);

-- Admin write access policies (replace with your admin email or keep open during setup)
create policy "Allow full access for admin on personnel" on public.personnel for all using (true);
create policy "Allow full access for admin on gallery" on public.gallery for all using (true);
create policy "Allow full access for admin on settings" on public.settings for all using (true);

-- 4. Storage bucket setup
-- Go to Storage in Supabase:
-- Create a public bucket called "gemataruna"
-- Set Storage policies to:
-- - Read: public
-- - Write/Upload: authenticated or public (for testing)
`;
