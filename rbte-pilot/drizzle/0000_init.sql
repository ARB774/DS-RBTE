-- RBTE LMS: initial migration 20260824
-- PostgreSQL 16+, pgcrypto + uuid-ossp extensions

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE role_enum AS ENUM (
  'PARTICIPANT',
  'FACILITATOR',
  'SUPPORTER',
  'ADMIN',
  'MENTOR'
);

CREATE TYPE profile_enum AS ENUM (
  'DILEMMA',
  'CONFLICT',
  'LT_CLOUD',
  'IMMUNITY'
);

CREATE TYPE visibility_enum AS ENUM (
  'private',
  'shared',
  'public'
);

CREATE TYPE revision_kind_enum AS ENUM (
  'STEP_41',
  'STEP_42',
  'STEP_43',
  'STEP_44',
  'STEP_45',
  'STEP_46',
  'STEP_47',
  'MANUAL'
);

CREATE TYPE assertion_kind_enum AS ENUM (
  'OBSERVATION',
  'EXPLANATION',
  'UNKNOWN',
  'SIDE_GOAL',
  'SIDE_NEED',
  'CONFLICTING_ACTION',
  'LOGIC_LINK',
  'BELIEF_PERSON',
  'COMPANY_ASSUMPTION',
  'ARTIFACT_ASSUMPTION',
  'PAST_EXPERIENCE',
  'ACTION_GAP',
  'READINESS'
);

CREATE TYPE assertion_status_enum AS ENUM (
  'DRAFT',
  'STATED',
  'VERIFIED',
  'REFUTED'
);

CREATE TYPE trial_status_enum AS ENUM (
  'PLANNED',
  'IMPOSSIBLE',
  'BLOCKED',
  'DONE'
);

CREATE TYPE level_enum AS ENUM (
  'NOT_PRESENTED',
  'PARTIAL',
  'SUFFICIENT',
  'CONVINCING'
);

CREATE TYPE continuation_enum AS ENUM (
  'OBSERVE',
  'CHANGE_TRIAL',
  'BACKTRACK',
  'CLOSE'
);

CREATE TYPE feedback_kind_enum AS ENUM (
  'DEVELOPMENTAL',
  'ARTIFACT_QUALITY',
  'EFFECT_CLAIM'
);

CREATE TYPE chat_role_enum AS ENUM (
  'USER',
  'ASSISTANT'
);

CREATE TYPE accepted_status_enum AS ENUM (
  'NONE',
  'ACCEPTED',
  'MODIFIED',
  'REJECTED'
);

CREATE TYPE pack_enum AS ENUM (
  'FPF',
  'PACK_AL',
  'PACK_TOC',
  'PACK_ATB'
);

CREATE TYPE mcp_operation_enum AS ENUM (
  'SEARCH',
  'GET',
  'WP_SCHEMA',
  'DISTINCTIONS',
  'SOURCE_META',
  'NOT_FOUND'
);

CREATE TYPE pin_status_enum AS ENUM (
  'ACTIVE',
  'SUPERSEDED'
);

-- ============================================================
-- TABLE: users
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role role_enum NOT NULL DEFAULT 'PARTICIPANT',
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX users_role_idx ON users(role);
CREATE INDEX users_invited_by_idx ON users(invited_by);
CREATE UNIQUE INDEX users_email_unique ON users(email);

-- ============================================================
-- TABLE: sessions (lucia-auth pattern)
-- ============================================================

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX sessions_user_id_idx ON sessions(user_id);

-- ============================================================
-- TABLE: situations
-- ============================================================

CREATE TABLE situations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile profile_enum NOT NULL,
  title VARCHAR(500) NOT NULL,
  signal TEXT,
  sensitivity INTEGER,
  task TEXT,
  desired_change TEXT,
  experience TEXT,
  authority TEXT,
  support_level INTEGER,
  creator_id UUID NOT NULL REFERENCES users(id),
  visibility visibility_enum NOT NULL DEFAULT 'private',
  ai_attempt_baseline TEXT,
  baseline_reason TEXT,
  current_revision_id UUID,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX situations_creator_id_idx ON situations(creator_id);
CREATE INDEX situations_profile_idx ON situations(profile);
CREATE INDEX situations_visibility_idx ON situations(visibility);
CREATE INDEX situations_current_revision_id_idx ON situations(current_revision_id);

ALTER TABLE situations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: revisions
-- ============================================================

CREATE TABLE revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  situation_id UUID NOT NULL REFERENCES situations(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  parent_id UUID REFERENCES revisions(id) ON DELETE SET NULL,
  kind revision_kind_enum NOT NULL,
  snapshot JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT revisions_situation_id_number_unique UNIQUE (situation_id, number)
);

CREATE INDEX revisions_situation_id_idx ON revisions(situation_id);
CREATE INDEX revisions_parent_id_idx ON revisions(parent_id);
CREATE INDEX revisions_created_by_idx ON revisions(created_by);
CREATE INDEX revisions_kind_idx ON revisions(kind);

ALTER TABLE revisions ENABLE ROW LEVEL SECURITY;

-- FK back-link from situations.current_revision_id (created after table exists)
ALTER TABLE situations
  ADD CONSTRAINT situations_current_revision_id_fkey
  FOREIGN KEY (current_revision_id) REFERENCES revisions(id) ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- ============================================================
-- TABLE: assertions
-- ============================================================

CREATE TABLE assertions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id UUID NOT NULL REFERENCES revisions(id) ON DELETE CASCADE,
  situation_id UUID NOT NULL REFERENCES situations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  kind assertion_kind_enum NOT NULL,
  source TEXT,
  status assertion_status_enum NOT NULL DEFAULT 'DRAFT',
  content JSONB NOT NULL,
  element_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX assertions_revision_id_idx ON assertions(revision_id);
CREATE INDEX assertions_situation_id_idx ON assertions(situation_id);
CREATE INDEX assertions_author_id_idx ON assertions(author_id);
CREATE INDEX assertions_kind_idx ON assertions(kind);
CREATE INDEX assertions_status_idx ON assertions(status);

ALTER TABLE assertions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: clouds
-- ============================================================

CREATE TABLE clouds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id UUID NOT NULL REFERENCES revisions(id) ON DELETE CASCADE,
  situation_id UUID NOT NULL REFERENCES situations(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id),
  kind profile_enum NOT NULL,
  goal TEXT,
  needs JSONB NOT NULL DEFAULT '[]'::jsonb,
  conflicting_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  links JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX clouds_revision_id_idx ON clouds(revision_id);
CREATE INDEX clouds_situation_id_idx ON clouds(situation_id);
CREATE INDEX clouds_creator_id_idx ON clouds(creator_id);

ALTER TABLE clouds ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: decision_options
-- ============================================================

CREATE TABLE decision_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id UUID NOT NULL REFERENCES revisions(id) ON DELETE CASCADE,
  situation_id UUID NOT NULL REFERENCES situations(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  mechanism JSONB,
  overcome_belief_id UUID,
  preserved_conditions JSONB,
  context_changes JSONB,
  risks JSONB,
  chosen BOOLEAN NOT NULL DEFAULT FALSE,
  rejected BOOLEAN NOT NULL DEFAULT FALSE,
  choice_reason TEXT,
  creator_id UUID NOT NULL REFERENCES users(id),
  ordinal INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX decision_options_revision_id_idx ON decision_options(revision_id);
CREATE INDEX decision_options_situation_id_idx ON decision_options(situation_id);
CREATE INDEX decision_options_creator_id_idx ON decision_options(creator_id);

ALTER TABLE decision_options ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: trials
-- ============================================================

CREATE TABLE trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id UUID NOT NULL REFERENCES revisions(id) ON DELETE CASCADE,
  situation_id UUID NOT NULL REFERENCES situations(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  prev_trial_id UUID REFERENCES trials(id) ON DELETE SET NULL,
  hypothesis TEXT,
  action TEXT,
  authority_boundary TEXT,
  acceptable_risk TEXT,
  protection_measures TEXT,
  expected_observation TEXT,
  support_indicator TEXT,
  weaken_indicator TEXT,
  feedback_due TIMESTAMPTZ,
  transfer_env_conditions TEXT,
  required_support TEXT,
  academic_vs_work_distinction TEXT,
  next_trial_condition TEXT,
  status trial_status_enum NOT NULL DEFAULT 'PLANNED',
  block_reason TEXT,
  creator_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT trials_situation_id_number_unique UNIQUE (situation_id, revision_id, number)
);

CREATE INDEX trials_revision_id_idx ON trials(revision_id);
CREATE INDEX trials_situation_id_idx ON trials(situation_id);
CREATE INDEX trials_prev_trial_id_idx ON trials(prev_trial_id);
CREATE INDEX trials_status_idx ON trials(status);
CREATE INDEX trials_creator_id_idx ON trials(creator_id);

ALTER TABLE trials ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: trial_results
-- ============================================================

CREATE TABLE trial_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id UUID NOT NULL UNIQUE REFERENCES trials(id) ON DELETE CASCADE,
  planned_action TEXT,
  actual_action TEXT,
  observation TEXT,
  interpretation TEXT,
  capability_level level_enum NOT NULL DEFAULT 'NOT_PRESENTED',
  transfer_level level_enum NOT NULL DEFAULT 'NOT_PRESENTED',
  effect_level level_enum NOT NULL DEFAULT 'NOT_PRESENTED',
  created_by UUID NOT NULL REFERENCES users(id),
  continuation continuation_enum,
  close_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX trial_results_created_by_idx ON trial_results(created_by);

ALTER TABLE trial_results ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: disclosures
-- ============================================================

CREATE TABLE disclosures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  situation_id UUID NOT NULL REFERENCES situations(id) ON DELETE CASCADE,
  revision_id UUID NOT NULL REFERENCES revisions(id) ON DELETE CASCADE,
  disclosed_by UUID NOT NULL REFERENCES users(id),
  recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  recipient_role role_enum,
  scope_summary TEXT,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX disclosures_situation_id_idx ON disclosures(situation_id);
CREATE INDEX disclosures_revision_id_idx ON disclosures(revision_id);
CREATE INDEX disclosures_disclosed_by_idx ON disclosures(disclosed_by);
CREATE INDEX disclosures_recipient_user_id_idx ON disclosures(recipient_user_id);

ALTER TABLE disclosures ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: feedbacks
-- ============================================================

CREATE TABLE feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disclosure_id UUID UNIQUE REFERENCES disclosures(id) ON DELETE SET NULL,
  revision_id UUID NOT NULL REFERENCES revisions(id) ON DELETE CASCADE,
  situation_id UUID NOT NULL REFERENCES situations(id) ON DELETE CASCADE,
  left_by_user_id UUID NOT NULL REFERENCES users(id),
  kind feedback_kind_enum NOT NULL,
  criterion_ref TEXT,
  observed_basis TEXT,
  next_action TEXT,
  accepted BOOLEAN,
  responded_at TIMESTAMPTZ,
  revision_after_id UUID REFERENCES revisions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX feedbacks_disclosure_id_idx ON feedbacks(disclosure_id);
CREATE INDEX feedbacks_revision_id_idx ON feedbacks(revision_id);
CREATE INDEX feedbacks_situation_id_idx ON feedbacks(situation_id);
CREATE INDEX feedbacks_left_by_user_id_idx ON feedbacks(left_by_user_id);
CREATE INDEX feedbacks_kind_idx ON feedbacks(kind);

ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: ai_messages
-- ============================================================

CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  situation_id UUID NOT NULL REFERENCES situations(id) ON DELETE CASCADE,
  revision_id UUID REFERENCES revisions(id) ON DELETE SET NULL,
  model VARCHAR(255) NOT NULL,
  system_prompt_version VARCHAR(255),
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  role chat_role_enum NOT NULL,
  content JSONB NOT NULL,
  used_elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_status accepted_status_enum NOT NULL DEFAULT 'NONE',
  replaced_content JSONB
);

CREATE INDEX ai_messages_situation_id_idx ON ai_messages(situation_id);
CREATE INDEX ai_messages_revision_id_idx ON ai_messages(revision_id);
CREATE INDEX ai_messages_created_at_idx ON ai_messages(created_at);

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: mcp_cache (global, no RLS — shared service cache)
-- ============================================================

CREATE TABLE mcp_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_pack pack_enum NOT NULL,
  entity_id VARCHAR(255),
  operation mcp_operation_enum NOT NULL,
  params_digest UUID NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  response_json JSONB NOT NULL,
  source_refs JSONB,
  terminal_incompatible BOOLEAN NOT NULL DEFAULT FALSE,
  terminal_incompatible_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX mcp_cache_source_pack_operation_idx ON mcp_cache(source_pack, operation);
CREATE INDEX mcp_cache_expires_at_idx ON mcp_cache(expires_at);

-- ============================================================
-- TABLE: audit_log (append-only, no RLS on write but read-scoped)
-- ============================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  role role_enum,
  action VARCHAR(255) NOT NULL,
  target_type VARCHAR(255),
  target_id UUID,
  before_json JSONB,
  after_json JSONB,
  actor_ip VARCHAR(45),
  user_agent TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_actor_id_idx ON audit_log(actor_id);
CREATE INDEX audit_log_action_idx ON audit_log(action);
CREATE INDEX audit_log_target_idx ON audit_log(target_type, target_id);
CREATE INDEX audit_log_created_at_idx ON audit_log(created_at);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: knowledge_pins (admin-managed, global read)
-- ============================================================

CREATE TABLE knowledge_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack pack_enum NOT NULL,
  commit_ref VARCHAR(255) NOT NULL UNIQUE,
  edition_ref VARCHAR(255),
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pinned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status pin_status_enum NOT NULL DEFAULT 'ACTIVE'
);

CREATE INDEX knowledge_pins_pack_status_idx ON knowledge_pins(pack, status);

ALTER TABLE knowledge_pins ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Helper: current user id exposed via app (auth.uid() pattern compatible with Supabase;
-- fall back to a session-scoped GUC "app.current_user_id" set by the drizzle app at connect time).

CREATE OR REPLACE FUNCTION auth_uid() RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    NULLIF(current_setting('app.current_user_id', true), '')::UUID,
    NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    NULLIF(current_setting('app.current_user_role', true), ''),
    NULLIF(current_setting('request.jwt.claim.role', true), '')
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------
-- SITUATIONS
-- ----------
-- 1. Creator gets full access.
-- 2. Anyone with an entry in disclosures (as recipient) can read.
-- 3. Public/shared visibility: additional read rules.
-- 4. ADMIN/FACILITATOR/SUPPORTER/MENTOR scoped access via their role-based logic.

CREATE POLICY situations_creator_all
  ON situations
  FOR ALL
  USING (creator_id = auth_uid())
  WITH CHECK (creator_id = auth_uid());

CREATE POLICY situations_shared_read
  ON situations
  FOR SELECT
  USING (
    visibility = 'public'
    OR (visibility = 'shared' AND EXISTS (
      SELECT 1 FROM disclosures d
      WHERE d.situation_id = situations.id
        AND (d.recipient_user_id = auth_uid()
             OR d.recipient_role::text = auth_role())
    ))
  );

-- ----------
-- REVISIONS (inherits situation visibility)
-- ----------

CREATE POLICY revisions_inherit_situation_read
  ON revisions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM situations s
    WHERE s.id = revisions.situation_id
      AND (
        s.creator_id = auth_uid()
        OR s.visibility = 'public'
        OR (s.visibility = 'shared' AND EXISTS (
          SELECT 1 FROM disclosures d
          WHERE d.situation_id = s.id
            AND (d.recipient_user_id = auth_uid()
                 OR d.recipient_role::text = auth_role())
        ))
      )
  ));

CREATE POLICY revisions_creator_write
  ON revisions
  FOR ALL
  USING (created_by = auth_uid())
  WITH CHECK (created_by = auth_uid());

-- ----------
-- ASSERTIONS (inherit situation + author write)
-- ----------

CREATE POLICY assertions_inherit_situation_read
  ON assertions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM situations s
    WHERE s.id = assertions.situation_id
      AND (
        s.creator_id = auth_uid()
        OR s.visibility = 'public'
        OR (s.visibility = 'shared' AND EXISTS (
          SELECT 1 FROM disclosures d
          WHERE d.situation_id = s.id
            AND (d.recipient_user_id = auth_uid()
                 OR d.recipient_role::text = auth_role())
        ))
      )
  ));

CREATE POLICY assertions_author_write
  ON assertions
  FOR ALL
  USING (author_id = auth_uid())
  WITH CHECK (author_id = auth_uid());

-- ----------
-- CLOUDS
-- ----------

CREATE POLICY clouds_inherit_situation_read
  ON clouds
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM situations s
    WHERE s.id = clouds.situation_id
      AND (
        s.creator_id = auth_uid()
        OR s.visibility = 'public'
        OR (s.visibility = 'shared' AND EXISTS (
          SELECT 1 FROM disclosures d
          WHERE d.situation_id = s.id
            AND (d.recipient_user_id = auth_uid()
                 OR d.recipient_role::text = auth_role())
        ))
      )
  ));

CREATE POLICY clouds_creator_write
  ON clouds
  FOR ALL
  USING (creator_id = auth_uid())
  WITH CHECK (creator_id = auth_uid());

-- ----------
-- DECISION_OPTIONS
-- ----------

CREATE POLICY decision_options_inherit_situation_read
  ON decision_options
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM situations s
    WHERE s.id = decision_options.situation_id
      AND (
        s.creator_id = auth_uid()
        OR s.visibility = 'public'
        OR (s.visibility = 'shared' AND EXISTS (
          SELECT 1 FROM disclosures d
          WHERE d.situation_id = s.id
            AND (d.recipient_user_id = auth_uid()
                 OR d.recipient_role::text = auth_role())
        ))
      )
  ));

CREATE POLICY decision_options_creator_write
  ON decision_options
  FOR ALL
  USING (creator_id = auth_uid())
  WITH CHECK (creator_id = auth_uid());

-- ----------
-- TRIALS
-- ----------

CREATE POLICY trials_inherit_situation_read
  ON trials
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM situations s
    WHERE s.id = trials.situation_id
      AND (
        s.creator_id = auth_uid()
        OR s.visibility = 'public'
        OR (s.visibility = 'shared' AND EXISTS (
          SELECT 1 FROM disclosures d
          WHERE d.situation_id = s.id
            AND (d.recipient_user_id = auth_uid()
                 OR d.recipient_role::text = auth_role())
        ))
      )
  ));

CREATE POLICY trials_creator_write
  ON trials
  FOR ALL
  USING (creator_id = auth_uid())
  WITH CHECK (creator_id = auth_uid());

-- ----------
-- TRIAL_RESULTS
-- ----------

CREATE POLICY trial_results_inherit_situation_read
  ON trial_results
  FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM trials t
    JOIN situations s ON s.id = t.situation_id
    WHERE t.id = trial_results.trial_id
      AND (
        s.creator_id = auth_uid()
        OR s.visibility = 'public'
        OR (s.visibility = 'shared' AND EXISTS (
          SELECT 1 FROM disclosures d
          WHERE d.situation_id = s.id
            AND (d.recipient_user_id = auth_uid()
                 OR d.recipient_role::text = auth_role())
        ))
      )
  ));

CREATE POLICY trial_results_creator_write
  ON trial_results
  FOR ALL
  USING (created_by = auth_uid())
  WITH CHECK (created_by = auth_uid());

-- ----------
-- DISCLOSURES (sender + recipient read, sender write)
-- ----------

CREATE POLICY disclosures_read
  ON disclosures
  FOR SELECT
  USING (
    disclosed_by = auth_uid()
    OR recipient_user_id = auth_uid()
    OR recipient_role::text = auth_role()
  );

CREATE POLICY disclosures_sender_write
  ON disclosures
  FOR ALL
  USING (disclosed_by = auth_uid())
  WITH CHECK (disclosed_by = auth_uid());

-- ----------
-- FEEDBACKS
-- ----------

CREATE POLICY feedbacks_read
  ON feedbacks
  FOR SELECT
  USING (
    left_by_user_id = auth_uid()
    OR EXISTS (
      SELECT 1 FROM disclosures d
      WHERE d.id = feedbacks.disclosure_id
        AND (d.disclosed_by = auth_uid()
             OR d.recipient_user_id = auth_uid()
             OR d.recipient_role::text = auth_role())
    )
    OR EXISTS (
      SELECT 1 FROM situations s
      WHERE s.id = feedbacks.situation_id
        AND s.creator_id = auth_uid()
    )
  );

CREATE POLICY feedbacks_author_write
  ON feedbacks
  FOR ALL
  USING (left_by_user_id = auth_uid())
  WITH CHECK (left_by_user_id = auth_uid());

-- ----------
-- AI_MESSAGES
-- ----------

CREATE POLICY ai_messages_inherit_situation_read
  ON ai_messages
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM situations s
    WHERE s.id = ai_messages.situation_id
      AND (
        s.creator_id = auth_uid()
        OR s.visibility = 'public'
        OR (s.visibility = 'shared' AND EXISTS (
          SELECT 1 FROM disclosures d
          WHERE d.situation_id = s.id
            AND (d.recipient_user_id = auth_uid()
                 OR d.recipient_role::text = auth_role())
        ))
      )
  ));

CREATE POLICY ai_messages_situation_creator_write
  ON ai_messages
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM situations s
    WHERE s.id = ai_messages.situation_id AND s.creator_id = auth_uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM situations s
    WHERE s.id = ai_messages.situation_id AND s.creator_id = auth_uid()
  ));

-- ----------
-- AUDIT_LOG: actor reads own lines; ADMIN reads all; write only via trigger/definer
-- ----------

CREATE POLICY audit_log_actor_read
  ON audit_log
  FOR SELECT
  USING (
    actor_id = auth_uid()
    OR auth_role() = 'ADMIN'
  );

-- ----------
-- KNOWLEDGE_PINS: everyone reads; ADMIN writes
-- ----------

CREATE POLICY knowledge_pins_authenticated_read
  ON knowledge_pins
  FOR SELECT
  USING (auth_uid() IS NOT NULL);

CREATE POLICY knowledge_pins_admin_write
  ON knowledge_pins
  FOR ALL
  USING (auth_role() = 'ADMIN')
  WITH CHECK (auth_role() = 'ADMIN');

-- ============================================================
-- GRANTS for "authenticated" role (Supabase / custom-postgres convention)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON situations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON revisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON assertions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON clouds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON decision_options TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON trials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON trial_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON disclosures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON feedbacks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON mcp_cache TO authenticated;
GRANT SELECT, INSERT ON audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_pins TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
