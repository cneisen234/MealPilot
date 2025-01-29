CREATE TABLE users
(
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP,
    ai_actions INTEGER NOT NULL DEFAULT 60,
    last_action_reset DATE DEFAULT NOW(),
    admin BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE users
    ADD COLUMN has_subscription BOOLEAN DEFAULT false,
ADD COLUMN subscription_updated_at TIMESTAMP DEFAULT NOW
(),
ADD COLUMN stripe_subscription_id VARCHAR
(255),
ADD COLUMN stripe_customer_id VARCHAR
(255),
ADD COLUMN stripe_payment_method_id VARCHAR
(255);

ALTER TABLE users
    ADD COLUMN subscription_consent BOOLEAN DEFAULT false,
ADD COLUMN trial_start_date TIMESTAMP DEFAULT NOW
(),
ADD COLUMN trial_end_date TIMESTAMP DEFAULT
(NOW
() + INTERVAL '30 days');

CREATE TABLE cant_haves
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item VARCHAR(255) NOT NULL
);

CREATE TABLE must_haves
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item VARCHAR(255) NOT NULL
);

CREATE TABLE taste_preferences
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item VARCHAR(255) NOT NULL
);

CREATE TABLE dietary_goals
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item VARCHAR(255) NOT NULL
);

CREATE TABLE cuisine_preferences
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item VARCHAR(255) NOT NULL
);

CREATE TABLE meal_types
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item VARCHAR(50)
);

CREATE TABLE selected_servings
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item VARCHAR(50)
);

CREATE TABLE recipes
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    prep_time VARCHAR(50),
    cook_time VARCHAR(50),
    servings VARCHAR(50),
    ingredients TEXT
    [],
    instructions TEXT[],
    nutritional_info TEXT[],
    meal_type VARCHAR
    (50)
);

    CREATE TABLE meal_plans
    (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        meals JSONB NOT NULL,
        CONSTRAINT unique_user_meal_plan UNIQUE (user_id)
    );

    CREATE TABLE inventory
    (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        item_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(20,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        expiration_date DATE
    );

    CREATE TABLE shopping_list
    (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        item_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(20,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE shopping_list_recipes
    (
        id SERIAL PRIMARY KEY,
        shopping_list_item_id INTEGER REFERENCES shopping_list(id) ON DELETE CASCADE,
        recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
        UNIQUE(shopping_list_item_id, recipe_id)
    );

    CREATE TABLE shared_lists
    (
        share_id VARCHAR(255) PRIMARY KEY,
        items JSONB
        [] NOT NULL,
        created_at TIMESTAMP DEFAULT NOW
        (),
        expires_at TIMESTAMP NOT NULL
    );

        CREATE INDEX idx_shared_lists_expires_at ON shared_lists(expires_at);

        CREATE TABLE global_recipes
        (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            prep_time VARCHAR(50),
            cook_time VARCHAR(50),
            servings VARCHAR(50),
            ingredients TEXT
            [],
    instructions TEXT[],
    nutritional_info TEXT[],
    created_at TIMESTAMP DEFAULT NOW
            (),
    last_queried_at TIMESTAMP DEFAULT NOW
            (),
    
    -- Preference flags (based on user preferences when recipe was created)
    cant_haves TEXT[],
    must_haves TEXT[],
    taste_preferences TEXT[],
    dietary_goals TEXT[],
    cuisine_preferences TEXT[],
    meal_type VARCHAR
            (50)
);

            -- Index for efficient querying of recipes based on last query date
            CREATE INDEX idx_global_recipes_last_queried 
ON global_recipes(last_queried_at);

            -- Composite index for meal type and preferences for faster lookups
            CREATE INDEX idx_global_recipes_preferences 
ON global_recipes(meal_type, cant_haves, must_haves, taste_preferences, dietary_goals, cuisine_preferences);

            -- Index on title for quick duplicate checks
            CREATE INDEX idx_global_recipes_title 
ON global_recipes(title);

            CREATE INDEX idx_global_recipes_restrictions ON global_recipes (cant_haves, must_haves);
            CREATE INDEX idx_recipes_title ON recipes (title);