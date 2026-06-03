CREATE TABLE point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    amount INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    source_ref UUID,
    created_at TIMESTAMP NOT NULL
);