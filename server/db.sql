-- Enum types
-- CREATE TYPE privacy_setting AS ENUM ('public', 'friends_only', 'private');
-- CREATE TYPE friendship_status AS ENUM ('accepted', 'pending', 'blocked');
-- CREATE TYPE friend_request_status AS ENUM ('pending', 'accepted', 'rejected');

-- Users table

-- DO $
-- $ 
-- BEGIN
--     CREATE TYPE payment_tier_enum AS ENUM
--     ('Owner', 'Premium', 'Basic', 'Free');
-- EXCEPTION
--     WHEN duplicate_object THEN null;
-- END $$;

CREATE TABLE users
(
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    avatar TEXT,
    bio TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    bio_visibility privacy_setting DEFAULT 'public',
    interests_visibility privacy_setting DEFAULT 'public',
    payment_tier payment_tier_enum DEFAULT 'Free' NOT NULL,
    subscription_updated_at TIMESTAMP DEFAULT NOW(),
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP,
    daily_prompt_count INTEGER DEFAULT 0,
    last_prompt_reset DATE DEFAULT CURRENT_DATE
);

CREATE TABLE friend_requests
(
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status friend_request_status DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sender_id, receiver_id)
);

CREATE TABLE friends
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status friendship_status DEFAULT 'pending',
    UNIQUE(user_id, friend_id)
);

CREATE TABLE interests
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    visibility privacy_setting DEFAULT 'public'
);

CREATE TABLE items
(
    id SERIAL PRIMARY KEY,
    interest_id INTEGER REFERENCES interests(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 10)
);

CREATE TABLE notifications
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    "read" BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE daily_recommendations
(
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recommendations JSON,
    generated_at DATE,
    PRIMARY KEY (user_id, generated_at)
);

CREATE TABLE scheduled_downgrades
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    new_tier VARCHAR(50) NOT NULL,
    downgrade_date TIMESTAMP NOT NULL
);

CREATE TABLE subscription_logs
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    old_tier VARCHAR(50),
    new_tier VARCHAR(50),
    changed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_privileges
(
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    max_interests INTEGER DEFAULT 3,
    max_friends INTEGER DEFAULT 0
);

CREATE TABLE upgrade_attempts
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    new_tier VARCHAR(50),
    payment_intent_id VARCHAR(255),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scheduled_downgrades_date ON scheduled_downgrades(downgrade_date);