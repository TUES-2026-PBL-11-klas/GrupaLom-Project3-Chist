-- Align reports and cleaning_tasks tables with their Java entity models.
-- V2 was written against an older domain model; this migration reconciles them.

-- ── reports ───────────────────────────────────────────────────────────────────
-- Rename PK and other columns to match Java Report entity
ALTER TABLE reports RENAME COLUMN id          TO report_id;
ALTER TABLE reports RENAME COLUMN reporter_id TO user_id;
ALTER TABLE reports RENAME COLUMN before_image_url TO photo_url;

-- photo_url is nullable in the Java model (@Column with no nullable=false)
ALTER TABLE reports ALTER COLUMN photo_url DROP NOT NULL;

-- ── cleaning_tasks ────────────────────────────────────────────────────────────
-- Rename PK to match Java CleaningTask entity (@Column(name = "task_id"))
ALTER TABLE cleaning_tasks RENAME COLUMN id             TO task_id;

-- Rename the after-image column
ALTER TABLE cleaning_tasks RENAME COLUMN after_image_url TO after_photo;

-- Add columns present in Java model but absent from the original schema
ALTER TABLE cleaning_tasks ADD COLUMN IF NOT EXISTS before_photo VARCHAR(500);
ALTER TABLE cleaning_tasks ADD COLUMN IF NOT EXISTS verified     BOOLEAN NOT NULL DEFAULT FALSE;

-- Note: claimed_at and completed_at remain in the DB; Hibernate validate ignores extra columns.
-- Note: PostgreSQL automatically updates FK constraints in cleaning_tasks and report_images
--       when the referenced report_id / task_id columns are renamed (tracked by column OID).
