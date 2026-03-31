-- Allow any authenticated user to mark a pending, non-expired invite as accepted.
-- This is needed because the accepting user is not yet a household owner.
CREATE POLICY "Authenticated users can accept invites"
  ON household_invites FOR UPDATE
  USING (accepted_at IS NULL AND expires_at >= NOW())
  WITH CHECK (auth.uid() IS NOT NULL);
