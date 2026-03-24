-- Installment groups: groups N parceled transactions together
CREATE TABLE installment_groups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
  count        INT NOT NULL CHECK (count > 1),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactions: the core financial entries (income and expenses)
CREATE TABLE transactions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id         UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by           UUID NOT NULL REFERENCES auth.users(id),
  category_id          UUID REFERENCES categories(id) ON DELETE SET NULL,
  description          TEXT NOT NULL,
  amount               NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  type                 TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  date                 DATE NOT NULL,
  notes                TEXT,
  -- Recurrence
  is_recurring         BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_rule      TEXT,
  parent_id            UUID REFERENCES transactions(id) ON DELETE SET NULL,
  -- Installments
  installment_group_id UUID REFERENCES installment_groups(id) ON DELETE SET NULL,
  installment_number   INT,
  installment_count    INT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Links a transaction to household members who participated in it
CREATE TABLE transaction_members (
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_amount   NUMERIC(12, 2),  -- NULL means split equally
  PRIMARY KEY (transaction_id, user_id)
);

CREATE INDEX idx_transactions_household_date ON transactions(household_id, date);
CREATE INDEX idx_transactions_household_type ON transactions(household_id, type);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_created_by ON transactions(created_by);
CREATE INDEX idx_transactions_installment_group ON transactions(installment_group_id);
CREATE INDEX idx_transaction_members_user_id ON transaction_members(user_id);

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
