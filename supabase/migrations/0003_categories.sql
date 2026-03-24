-- Categories: income/expense classifications shared within a household
CREATE TABLE categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('income', 'expense', 'both')),
  color        TEXT NOT NULL DEFAULT '#6366f1',
  icon         TEXT,
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_household_id ON categories(household_id);

-- Insert default categories when a household is created
CREATE OR REPLACE FUNCTION create_default_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.categories (household_id, name, type, color, icon, is_default) VALUES
    (NEW.id, 'Salário',          'income',  '#22c55e', 'Banknote',      TRUE),
    (NEW.id, 'Freelance',        'income',  '#16a34a', 'Briefcase',     TRUE),
    (NEW.id, 'Investimentos',    'income',  '#15803d', 'TrendingUp',    TRUE),
    (NEW.id, 'Outros (entrada)', 'income',  '#4ade80', 'CirclePlus',    TRUE),
    (NEW.id, 'Alimentação',      'expense', '#ef4444', 'UtensilsCrossed', TRUE),
    (NEW.id, 'Moradia',          'expense', '#dc2626', 'Home',          TRUE),
    (NEW.id, 'Transporte',       'expense', '#f97316', 'Car',           TRUE),
    (NEW.id, 'Saúde',            'expense', '#ec4899', 'Heart',         TRUE),
    (NEW.id, 'Educação',         'expense', '#8b5cf6', 'BookOpen',      TRUE),
    (NEW.id, 'Lazer',            'expense', '#06b6d4', 'Gamepad2',      TRUE),
    (NEW.id, 'Vestuário',        'expense', '#f59e0b', 'Shirt',         TRUE),
    (NEW.id, 'Assinaturas',      'expense', '#6366f1', 'RefreshCw',     TRUE),
    (NEW.id, 'Outros (saída)',   'expense', '#64748b', 'CircleMinus',   TRUE);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_household_created_categories
  AFTER INSERT ON households
  FOR EACH ROW EXECUTE FUNCTION create_default_categories();
