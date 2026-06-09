CREATE TABLE expense_audit_log (
  log_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  UUID REFERENCES expenses(expense_id),
  action      VARCHAR(50) NOT NULL CHECK (action IN ('CREATE','DEPT_APPROVE','DEPT_REJECT','FINANCE_APPROVE','FINANCE_REJECT','VIEW_PLAINTEXT','DELETE','VERIFY','VERIFY_PAYOUT','EXPORT','CANCEL_PAYOUT','PAYOUT_SUCCESS','FAIL_PAYOUT')),
  actor_id    UUID NOT NULL REFERENCES users(user_id),
  timestamp   TIMESTAMPTZ DEFAULT NOW(),
  metadata    JSONB,
  prev_hash   VARCHAR(255) NOT NULL,
  hash        VARCHAR(255) NOT NULL
);
