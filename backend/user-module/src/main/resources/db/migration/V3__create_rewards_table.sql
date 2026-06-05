CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    points_required INT NOT NULL,
    icon_url VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE
);