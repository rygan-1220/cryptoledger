-- Migration 006: Per-device signing public keys
-- Each device generates its own RSA key pair for digital signatures.
-- All device keys are tried during signature verification.
-- K_real distribution is handled via password-derived KEK (users.encrypted_kreal_pwd).
CREATE TABLE user_public_keys (
  key_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  public_key_pem TEXT NOT NULL,
  device_name    VARCHAR(255),
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_public_keys_user ON user_public_keys(user_id);
