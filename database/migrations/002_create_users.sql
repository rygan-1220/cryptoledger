CREATE TABLE users (
  user_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username       VARCHAR(255) NOT NULL UNIQUE,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  role           VARCHAR(50) NOT NULL CHECK (role IN ('employee','dept_manager','finance_manager','admin','ceo')),
  dept_id        UUID REFERENCES departments(dept_id),
  public_key_pem TEXT NOT NULL,
  encrypted_kreal_pwd TEXT,  -- K_real encrypted with password-derived KEK (PBKDF2) for cross-device recovery
  bank_name           VARCHAR(100),   -- e.g., 'Maybank', 'CIMB', 'Hong Leong'
  bank_account_no     VARCHAR(50),    -- bank account number
  account_holder_name VARCHAR(255),   -- name on the bank account
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
