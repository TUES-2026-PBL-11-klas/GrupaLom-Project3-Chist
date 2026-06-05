CREATE TABLE IF NOT EXISTS ai_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_id UUID NOT NULL,
    image_url VARCHAR NOT NULL,
    ai_generated_score DOUBLE PRECISION NOT NULL,
    similarity_score DOUBLE PRECISION NOT NULL,
    provider VARCHAR(50) NOT NULL,
    raw_response TEXT,
    checked_at TIMESTAMP NOT NULL,
    FOREIGN KEY (verification_id) REFERENCES verifications(id)
);