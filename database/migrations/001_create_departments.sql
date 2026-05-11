CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE departments (
  dept_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dept_name     VARCHAR(255) NOT NULL UNIQUE,
  wrapped_kreal BYTEA NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
