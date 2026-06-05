CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL,
    locale VARCHAR(10) NOT NULL,
    subject VARCHAR(255),
    body_template TEXT NOT NULL,
    channel VARCHAR(20) NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_template_key_locale_channel UNIQUE (key, locale, channel)
);