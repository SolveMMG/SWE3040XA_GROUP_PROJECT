ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT TRUE;

INSERT INTO users (name, email, password_hash, role, is_approved)
VALUES ('Admin', 'admin@gmail.com', '$2b$12$s.EsG2Ff1xTERHbwwXggBuE7YbQxbVFZrpFrkTJr765uCVbmpGj4.', 'superadmin', TRUE)
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, is_approved = TRUE;
