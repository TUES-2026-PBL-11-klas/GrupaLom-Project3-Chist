CREATE TABLE IF NOT EXISTS admin_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_id UUID NOT NULL,
    admin_id UUID NOT NULL,
    decision VARCHAR(20) NOT NULL,
    notes TEXT,
    reviewed_at TIMESTAMP NOT NULL,
    FOREIGN KEY (verification_id) REFERENCES verifications(id)
);