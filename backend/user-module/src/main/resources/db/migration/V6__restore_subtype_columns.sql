-- V2 dropped bonus_multiplier, verified_since, and admin_level but the Java
-- entity hierarchy (VerifiedUser, Admin) still references these columns.
-- Re-add them with sensible defaults so existing rows are valid.

ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_multiplier FLOAT       DEFAULT 2.5;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_since   TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_level      INT         DEFAULT 1;
