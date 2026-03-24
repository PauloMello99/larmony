-- Bills: recurring fixed expenses with a monthly due day
CREATE TABLE bills (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  amount       NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  due_day      INT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bills_household_id ON bills(household_id);

CREATE TRIGGER bills_updated_at
  BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
