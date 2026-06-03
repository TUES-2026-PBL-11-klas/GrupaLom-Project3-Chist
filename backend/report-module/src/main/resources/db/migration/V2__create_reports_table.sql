CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    before_image_url VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_location ON reports(latitude, longitude);

CREATE TABLE IF NOT EXISTS cleaning_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL,
    cleaner_id UUID NOT NULL,
    after_image_url VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'CLAIMED',
    claimed_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS report_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL,
    url VARCHAR(500) NOT NULL,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('BEFORE', 'AFTER', 'EVIDENCE')),
    uploaded_at TIMESTAMP NOT NULL
);

-- Add foreign key constraints within same database (same service)
-- Since this is the same database, we can add FK constraints for tables within this service
ALTER TABLE cleaning_tasks
    ADD CONSTRAINT fk_cleaning_tasks_reports
    FOREIGN KEY (report_id) REFERENCES reports(id);

ALTER TABLE report_images
    ADD CONSTRAINT fk_report_images_reports
    FOREIGN KEY (report_id) REFERENCES reports(id);