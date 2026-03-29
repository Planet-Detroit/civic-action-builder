-- Add 'submitted' status for reporter → editor handoff
alter table public.civic_action_drafts
  drop constraint civic_action_drafts_status_check;

alter table public.civic_action_drafts
  add constraint civic_action_drafts_status_check
  check (status in ('in-progress', 'submitted', 'complete', 'archived'));
