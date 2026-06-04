CREATE TABLE IF NOT EXISTS fraud_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_id UUID NOT NULL,
    reporter_user_id UUID NOT NULL,
    reason VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED', 'DISMISSED')),
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (verification_id) REFERENCES verifications(id)
);