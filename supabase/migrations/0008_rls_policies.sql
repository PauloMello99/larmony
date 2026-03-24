-- ============================================================
-- Row Level Security Policies
-- Every table is locked down. Users can only access data
-- that belongs to their household(s).
-- ============================================================

-- Helper function: returns array of household IDs for the current user
CREATE OR REPLACE FUNCTION public.my_household_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY(
    SELECT household_id
    FROM household_memberships
    WHERE user_id = auth.uid()
  );
$$;

-- ===== profiles =====
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ===== households =====
ALTER TABLE households ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their households"
  ON households FOR SELECT
  USING (id = ANY(public.my_household_ids()));

CREATE POLICY "Members can update their households"
  ON households FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create households"
  ON households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ===== household_memberships =====
ALTER TABLE household_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view memberships in their households"
  ON household_memberships FOR SELECT
  USING (household_id = ANY(public.my_household_ids()));

CREATE POLICY "Owners can manage memberships"
  ON household_memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM households
      WHERE id = household_memberships.household_id
        AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own membership (accept invite)"
  ON household_memberships FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ===== household_invites =====
ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage invites"
  ON household_invites FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM households
      WHERE id = household_invites.household_id
        AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can read invite by token (for accepting)"
  ON household_invites FOR SELECT
  USING (TRUE);

-- ===== categories =====
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members access categories"
  ON categories FOR ALL
  USING (household_id = ANY(public.my_household_ids()));

-- ===== installment_groups =====
ALTER TABLE installment_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members access installment_groups"
  ON installment_groups FOR ALL
  USING (household_id = ANY(public.my_household_ids()));

-- ===== transactions =====
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members access transactions"
  ON transactions FOR ALL
  USING (household_id = ANY(public.my_household_ids()));

-- ===== transaction_members =====
ALTER TABLE transaction_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members access transaction_members via transaction"
  ON transaction_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_members.transaction_id
        AND t.household_id = ANY(public.my_household_ids())
    )
  );

-- ===== goals =====
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members access goals"
  ON goals FOR ALL
  USING (household_id = ANY(public.my_household_ids()));

-- ===== goal_contributions =====
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members access goal_contributions"
  ON goal_contributions FOR ALL
  USING (household_id = ANY(public.my_household_ids()));

-- ===== budgets =====
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members access budgets"
  ON budgets FOR ALL
  USING (household_id = ANY(public.my_household_ids()));

-- ===== bills =====
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members access bills"
  ON bills FOR ALL
  USING (household_id = ANY(public.my_household_ids()));

-- ===== Trigger: auto-create owner membership when household is created =====
CREATE OR REPLACE FUNCTION create_owner_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO household_memberships (household_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_household_created_membership
  AFTER INSERT ON households
  FOR EACH ROW EXECUTE FUNCTION create_owner_membership();
