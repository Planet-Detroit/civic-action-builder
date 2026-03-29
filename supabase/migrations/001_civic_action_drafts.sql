-- Civic action drafts table for per-user draft persistence
-- Stores builder state as JSONB so reporters can save, resume, and submit drafts

create table public.civic_action_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_title text,
  article_url text,
  status text not null default 'in-progress' check (status in ('in-progress', 'complete', 'archived')),
  draft_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for common queries
create index idx_drafts_user_id on public.civic_action_drafts(user_id);
create index idx_drafts_updated_at on public.civic_action_drafts(updated_at desc);

-- Row Level Security
alter table public.civic_action_drafts enable row level security;

-- Reporters can read/write their own drafts
create policy "Users can manage own drafts"
  on public.civic_action_drafts for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Editors and admins can read all drafts (for review)
create policy "Editors can view all drafts"
  on public.civic_action_drafts for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role in ('admin', 'editor')
    )
  );

-- Auto-update updated_at on changes
-- (reuse handle_updated_at function created in 001_user_roles.sql)
create trigger civic_action_drafts_updated_at
  before update on public.civic_action_drafts
  for each row execute function public.handle_updated_at();
