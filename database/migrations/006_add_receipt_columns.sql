-- Migration 006: Add encrypted receipt columns to expenses
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS encrypted_receipt BYTEA,
  ADD COLUMN IF NOT EXISTS file_mime_type    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS file_hash         VARCHAR(64);
