-- Seed departments with wrapped K_real values.
-- Replace the wrapped_kreal placeholders after K_system is available.
INSERT INTO departments (dept_name, wrapped_kreal)
VALUES
  ('Engineering', '\\x'),
  ('Finance', '\\x'),
  ('Operations', '\\x'),
  ('Marketing', '\\x');
