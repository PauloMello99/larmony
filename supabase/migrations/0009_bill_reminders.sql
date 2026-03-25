ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS reminder_days_before INT CHECK (reminder_days_before > 0),
  ADD COLUMN IF NOT EXISTS reminder_last_sent_at TIMESTAMPTZ;
