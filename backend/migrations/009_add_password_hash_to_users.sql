-- Local email/password authentication for the first-party web client.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
