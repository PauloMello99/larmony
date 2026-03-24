-- Budgets: monthly spending limits per category
CREATE TABLE budgets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month        INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year         INT NOT NULL CHECK (year >= 2000),
  limit_amount NUMERIC(12, 2) NOT NULL CHECK (limit_amount > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, category_id, month, year)
);

CREATE INDEX idx_budgets_household_id ON budgets(household_id);
CREATE INDEX idx_budgets_category_id ON budgets(category_id);

CREATE TRIGGER budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
