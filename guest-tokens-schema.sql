-- Guest access tokens for judge/external reviewer access.
-- Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS guest_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token text NOT NULL UNIQUE,
  label text NOT NULL,          -- e.g., "SND Judges 2026", "EPPY Review Panel"
  tool text NOT NULL,           -- e.g., "civic-action-builder", "newsletter-builder"
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz        -- set this to revoke; NULL = active
);

-- Allow reading tokens with the anon key (for client-side validation)
ALTER TABLE guest_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active tokens"
  ON guest_tokens FOR SELECT
  USING (revoked_at IS NULL);

-- To create a new judge link:
--   INSERT INTO guest_tokens (token, label, tool)
--   VALUES ('your-random-token', 'SND Judges 2026', 'civic-action-builder');
--
-- To revoke:
--   UPDATE guest_tokens SET revoked_at = now() WHERE token = 'your-random-token';
--
-- The judge URL would be:
--   https://civic.tools.planetdetroit.org/?access=your-random-token
