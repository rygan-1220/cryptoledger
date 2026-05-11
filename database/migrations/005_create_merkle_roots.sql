CREATE TABLE merkle_roots (
  root_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  root_hash        VARCHAR(255) NOT NULL,
  start_expense_id UUID NOT NULL,
  end_expense_id   UUID NOT NULL,
  record_count     INTEGER NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  created_by       UUID REFERENCES users(user_id)
);
