CREATE TABLE users (
  user_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username       VARCHAR(255) NOT NULL UNIQUE,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  role           VARCHAR(50) NOT NULL CHECK (role IN ('employee','dept_manager','finance_manager','admin','ceo')),
  dept_id        UUID REFERENCES departments(dept_id),
  public_key_pem TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
