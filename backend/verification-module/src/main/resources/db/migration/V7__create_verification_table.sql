CREATE TABLE IF NOT EXISTS verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    subject_type VARCHAR(20) NOT NULL CHECK (subject_type IN ('REPORT', 'CLEANING_TASK')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_REVIEW', 'FINALIZED')),
    outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('APPROVED', 'REJECTED', 'INCONCLUSIVE')),
    created_at TIMESTAMP NOT NULL,
    finalized_at TIMESTAMP
);