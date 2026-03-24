-- Households: the shared financial unit for a family/home group
CREATE TABLE households (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  owner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Memberships: links users to households
CREATE TABLE household_memberships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, user_id)
);

-- Invites: email-based invite tokens to join a household
CREATE TABLE household_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  token        TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  invited_by   UUID NOT NULL REFERENCES auth.users(id),
  accepted_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_household_memberships_user_id ON household_memberships(user_id);
CREATE INDEX idx_household_memberships_household_id ON household_memberships(household_id);
CREATE INDEX idx_household_invites_token ON household_invites(token);
CREATE INDEX idx_household_invites_email ON household_invites(email);
