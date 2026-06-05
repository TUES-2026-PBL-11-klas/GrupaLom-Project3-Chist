-- Align verifications table with Java Verification model.
-- V7 was created with a different domain model; this migration reconciles the two.

-- 1. Rename PK column: id -> verification_id
--    PostgreSQL FK constraints track columns by OID, so FKs in V8/V9/V10
--    that reference verifications(id) remain valid after the rename.
ALTER TABLE verifications RENAME COLUMN id TO verification_id;

-- 2. Drop columns absent from the Java model
ALTER TABLE verifications DROP COLUMN IF EXISTS subject_type;
ALTER TABLE verifications DROP COLUMN IF EXISTS outcome;
ALTER TABLE verifications DROP COLUMN IF EXISTS finalized_at;

-- 3. Migrate any stale status values before replacing the CHECK constraint
UPDATE verifications
    SET status = 'PENDING'
    WHERE status NOT IN ('PENDING', 'APPROVED', 'REJECTED');

-- 4. Replace the status CHECK constraint (old values: PENDING/IN_REVIEW/FINALIZED)
ALTER TABLE verifications DROP CONSTRAINT IF EXISTS verifications_status_check;
ALTER TABLE verifications ALTER COLUMN status DROP DEFAULT;
ALTER TABLE verifications ADD CONSTRAINT verifications_status_check
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'));

-- 5. Add columns required by the Java model
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS type       VARCHAR(20);
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS result     TEXT;
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS actual_lat DOUBLE PRECISION;
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS actual_lng DOUBLE PRECISION;
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- 6. Backfill non-nullable new columns for any existing rows, then add constraints
UPDATE verifications SET type = 'AI' WHERE type IS NULL;
ALTER TABLE verifications ALTER COLUMN type SET NOT NULL;
ALTER TABLE verifications ADD CONSTRAINT verifications_type_check
    CHECK (type IN ('GPS', 'AI', 'ADMIN'));

UPDATE verifications SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE verifications ALTER COLUMN updated_at SET NOT NULL;
