BEGIN;
CREATE TABLE IF NOT EXISTS value_proposition_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(200) NOT NULL,
  owner_role varchar(200) NOT NULL DEFAULT '',
  confidentiality text NOT NULL DEFAULT '',
  system_boundary text NOT NULL DEFAULT '',
  training_result text NOT NULL DEFAULT '',
  current_state varchar(8) NOT NULL DEFAULT 'S0',
  verification_class varchar(200) NOT NULL DEFAULT '',
  method varchar(200) NOT NULL DEFAULT 'Pack-TOC / DS-RBTE',
  assessment text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  cases jsonb NOT NULL DEFAULT '[]'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  open_gap text NOT NULL DEFAULT '',
  next_step text NOT NULL DEFAULT '',
  stop_or_return_condition text NOT NULL DEFAULT '',
  visualization jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS value_proposition_projects_owner_idx ON value_proposition_projects(owner_id);
CREATE INDEX IF NOT EXISTS value_proposition_projects_updated_idx ON value_proposition_projects(updated_at);

CREATE TABLE IF NOT EXISTS value_proposition_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES value_proposition_projects(id) ON DELETE CASCADE,
  author_role varchar(32) NOT NULL,
  stage varchar(8) NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS value_proposition_turns_project_idx ON value_proposition_turns(project_id);
CREATE INDEX IF NOT EXISTS value_proposition_turns_created_idx ON value_proposition_turns(created_at);
ALTER TABLE value_proposition_projects OWNER TO rbtepilot_owner;
ALTER TABLE value_proposition_turns OWNER TO rbtepilot_owner;
GRANT SELECT, INSERT, UPDATE, DELETE ON value_proposition_projects, value_proposition_turns TO rbtepilot;
COMMIT;
