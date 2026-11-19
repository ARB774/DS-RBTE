CREATE TABLE situation_reviews (
 situation_id uuid PRIMARY KEY REFERENCES situations(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 run_id uuid NOT NULL,
 fingerprint varchar(64) NOT NULL,
 state varchar(16) NOT NULL CHECK (state IN ('pending','ready','error')),
 report jsonb,
 updated_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL
);
CREATE INDEX situation_reviews_user_idx ON situation_reviews(user_id);
CREATE TABLE review_limits (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 day varchar(10) NOT NULL,
 count integer NOT NULL CHECK (count >= 0),
 last_at timestamptz NOT NULL
);
