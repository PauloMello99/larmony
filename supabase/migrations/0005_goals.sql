-- Savings goals: financial targets to save towards
CREATE TABLE goals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  target_amount  NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date    DATE,
  color          TEXT NOT NULL DEFAULT '#22c55e',
  icon           TEXT,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual deposits/withdrawals from a savings goal
CREATE TABLE goal_contributions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  goal_id      UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  created_by   UUID NOT NULL REFERENCES auth.users(id),
  amount       NUMERIC(12, 2) NOT NULL CHECK (amount != 0),
  notes        TEXT,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goals_household_id ON goals(household_id);
CREATE INDEX idx_goal_contributions_goal_id ON goal_contributions(goal_id);
CREATE INDEX idx_goal_contributions_household_id ON goal_contributions(household_id);

-- Auto-sync goal current_amount when contributions change
CREATE OR REPLACE FUNCTION sync_goal_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_goal_id UUID;
BEGIN
  target_goal_id := COALESCE(NEW.goal_id, OLD.goal_id);

  UPDATE goals
  SET
    current_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM goal_contributions
      WHERE goal_id = target_goal_id
    ),
    status = CASE
      WHEN (
        SELECT COALESCE(SUM(amount), 0)
        FROM goal_contributions
        WHERE goal_id = target_goal_id
      ) >= target_amount THEN 'completed'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = target_goal_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_goal_contribution_change
  AFTER INSERT OR UPDATE OR DELETE ON goal_contributions
  FOR EACH ROW EXECUTE FUNCTION sync_goal_amount();

CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
