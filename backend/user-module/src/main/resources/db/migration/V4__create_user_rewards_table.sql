CREATE TABLE user_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    reward_id UUID NOT NULL,
    earned_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(uuid),
    CONSTRAINT fk_reward FOREIGN KEY (reward_id) REFERENCES rewards(id),
    CONSTRAINT uk_user_reward UNIQUE (user_id, reward_id)
);