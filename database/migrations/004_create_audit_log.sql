CREATE TABLE expense_audit_log (
  log_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  UUID REFERENCES expenses(expense_id),
  action      VARCHAR(50) NOT NULL CHECK (action IN ('CREATE','APPROVE','REJECT','VIEW_PLAINTEXT','DELETE','VERIFY')),
  actor_id    UUID NOT NULL REFERENCES users(user_id),
  timestamp   TIMESTAMPTZ DEFAULT NOW(),
  metadata    JSONB,
  prev_hash   VARCHAR(255) NOT NULL,
  hash        VARCHAR(255) NOT NULL
);
