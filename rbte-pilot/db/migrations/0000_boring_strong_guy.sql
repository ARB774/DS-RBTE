CREATE TYPE "public"."accepted_status_enum" AS ENUM('NONE', 'ACCEPTED', 'MODIFIED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."assertion_kind_enum" AS ENUM('OBSERVATION', 'EXPLANATION', 'UNKNOWN', 'SIDE_GOAL', 'SIDE_NEED', 'CONFLICTING_ACTION', 'LOGIC_LINK', 'BELIEF_PERSON', 'COMPANY_ASSUMPTION', 'ARTIFACT_ASSUMPTION', 'PAST_EXPERIENCE', 'ACTION_GAP', 'READINESS');--> statement-breakpoint
CREATE TYPE "public"."assertion_status_enum" AS ENUM('DRAFT', 'STATED', 'VERIFIED', 'REFUTED');--> statement-breakpoint
CREATE TYPE "public"."chat_role_enum" AS ENUM('USER', 'ASSISTANT');--> statement-breakpoint
CREATE TYPE "public"."continuation_enum" AS ENUM('OBSERVE', 'CHANGE_TRIAL', 'BACKTRACK', 'CLOSE');--> statement-breakpoint
CREATE TYPE "public"."feedback_kind_enum" AS ENUM('DEVELOPMENTAL', 'ARTIFACT_QUALITY', 'EFFECT_CLAIM');--> statement-breakpoint
CREATE TYPE "public"."level_enum" AS ENUM('NOT_PRESENTED', 'PARTIAL', 'SUFFICIENT', 'CONVINCING');--> statement-breakpoint
CREATE TYPE "public"."mcp_operation_enum" AS ENUM('SEARCH', 'GET', 'WP_SCHEMA', 'DISTINCTIONS', 'SOURCE_META', 'NOT_FOUND');--> statement-breakpoint
CREATE TYPE "public"."pack_enum" AS ENUM('FPF', 'PACK_AL', 'PACK_TOC', 'PACK_ATB');--> statement-breakpoint
CREATE TYPE "public"."pin_status_enum" AS ENUM('ACTIVE', 'SUPERSEDED');--> statement-breakpoint
CREATE TYPE "public"."profile_enum" AS ENUM('DILEMMA', 'CONFLICT', 'LT_CLOUD', 'IMMUNITY');--> statement-breakpoint
CREATE TYPE "public"."revision_kind_enum" AS ENUM('STEP_41', 'STEP_42', 'STEP_43', 'STEP_44', 'STEP_45', 'STEP_46', 'STEP_47', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."role_enum" AS ENUM('PARTICIPANT', 'FACILITATOR', 'SUPPORTER', 'ADMIN', 'MENTOR');--> statement-breakpoint
CREATE TYPE "public"."sensitivity_enum" AS ENUM('LOW', 'STANDARD', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."support_level_enum" AS ENUM('NONE', 'LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."trial_status_enum" AS ENUM('PLANNED', 'IMPOSSIBLE', 'BLOCKED', 'DONE');--> statement-breakpoint
CREATE TYPE "public"."visibility_enum" AS ENUM('PRIVATE', 'SHARED', 'PUBLIC');--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"situation_id" uuid NOT NULL,
	"revision_id" uuid,
	"model" varchar(255) NOT NULL,
	"system_prompt_version" varchar(255),
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"role" "chat_role_enum" NOT NULL,
	"content" jsonb NOT NULL,
	"used_elements" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_status" "accepted_status_enum" DEFAULT 'NONE' NOT NULL,
	"replaced_content" jsonb
);
--> statement-breakpoint
CREATE TABLE "assertions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"situation_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"kind" "assertion_kind_enum" NOT NULL,
	"source" text,
	"status" "assertion_status_enum" DEFAULT 'DRAFT' NOT NULL,
	"content" jsonb NOT NULL,
	"element_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"role" "role_enum",
	"action" varchar(255) NOT NULL,
	"target_type" varchar(255),
	"target_id" uuid,
	"before_json" jsonb,
	"after_json" jsonb,
	"actor_ip" varchar(45),
	"user_agent" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clouds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"situation_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"kind" "profile_enum" NOT NULL,
	"goal" text,
	"needs" jsonb NOT NULL,
	"conflicting_actions" jsonb NOT NULL,
	"links" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"situation_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"mechanism" jsonb,
	"overcome_belief_id" uuid,
	"preserved_conditions" jsonb,
	"context_changes" jsonb,
	"risks" jsonb,
	"chosen" boolean DEFAULT false NOT NULL,
	"rejected" boolean DEFAULT false NOT NULL,
	"choice_reason" text,
	"creator_id" uuid NOT NULL,
	"ordinal" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disclosures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"situation_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"disclosed_by" uuid NOT NULL,
	"recipient_user_id" uuid,
	"recipient_role" "role_enum",
	"scope_summary" text,
	"shared_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"disclosure_id" uuid,
	"revision_id" uuid NOT NULL,
	"situation_id" uuid NOT NULL,
	"left_by_user_id" uuid NOT NULL,
	"kind" "feedback_kind_enum" NOT NULL,
	"criterion_ref" text,
	"observed_basis" text,
	"next_action" text,
	"accepted" boolean,
	"responded_at" timestamp with time zone,
	"revision_after_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedbacks_disclosure_id_unique" UNIQUE("disclosure_id")
);
--> statement-breakpoint
CREATE TABLE "knowledge_pins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack" "pack_enum" NOT NULL,
	"commit_ref" varchar(255) NOT NULL,
	"edition_ref" varchar(255),
	"pinned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pinned_by" uuid,
	"status" "pin_status_enum" DEFAULT 'ACTIVE' NOT NULL,
	CONSTRAINT "knowledge_pins_commit_ref_unique" UNIQUE("commit_ref")
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_pack" "pack_enum" NOT NULL,
	"entity_id" varchar(255),
	"operation" "mcp_operation_enum" NOT NULL,
	"params_digest" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"response_json" jsonb NOT NULL,
	"source_refs" jsonb,
	"terminal_incompatible" boolean DEFAULT false NOT NULL,
	"terminal_incompatible_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mcp_cache_params_digest_unique" UNIQUE("params_digest")
);
--> statement-breakpoint
CREATE TABLE "revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"situation_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"parent_id" uuid,
	"kind" "revision_kind_enum" NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "situations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile" "profile_enum" NOT NULL,
	"title" varchar(500) NOT NULL,
	"signal" text,
	"sensitivity" "sensitivity_enum" DEFAULT 'STANDARD' NOT NULL,
	"task" text,
	"desired_change" text,
	"experience" text,
	"authority" text,
	"support_level" "support_level_enum" DEFAULT 'NONE' NOT NULL,
	"creator_id" uuid NOT NULL,
	"visibility" "visibility_enum" DEFAULT 'PRIVATE' NOT NULL,
	"ai_attempt_baseline" text,
	"baseline_reason" text,
	"current_revision_id" uuid,
	"locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "step_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"situation_id" uuid NOT NULL,
	"step" varchar(24) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"fields" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trial_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trial_id" uuid NOT NULL,
	"planned_action" text,
	"actual_action" text,
	"observation" text,
	"interpretation" text,
	"capability_level" "level_enum" DEFAULT 'NOT_PRESENTED' NOT NULL,
	"transfer_level" "level_enum" DEFAULT 'NOT_PRESENTED' NOT NULL,
	"effect_level" "level_enum" DEFAULT 'NOT_PRESENTED' NOT NULL,
	"created_by" uuid NOT NULL,
	"continuation" "continuation_enum",
	"close_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trial_results_trial_id_unique" UNIQUE("trial_id")
);
--> statement-breakpoint
CREATE TABLE "trials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"situation_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"prev_trial_id" uuid,
	"hypothesis" text,
	"action" text,
	"authority_boundary" text,
	"acceptable_risk" text,
	"protection_measures" text,
	"expected_observation" text,
	"support_indicator" text,
	"weaken_indicator" text,
	"feedback_due" timestamp with time zone,
	"transfer_env_conditions" text,
	"required_support" text,
	"academic_vs_work_distinction" text,
	"next_trial_condition" text,
	"status" "trial_status_enum" DEFAULT 'PLANNED' NOT NULL,
	"block_reason" text,
	"creator_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "role_enum" DEFAULT 'PARTICIPANT' NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"invited_by" uuid,
	"password_hash" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_situation_id_situations_id_fk" FOREIGN KEY ("situation_id") REFERENCES "public"."situations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_revision_id_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."revisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assertions" ADD CONSTRAINT "assertions_revision_id_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assertions" ADD CONSTRAINT "assertions_situation_id_situations_id_fk" FOREIGN KEY ("situation_id") REFERENCES "public"."situations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assertions" ADD CONSTRAINT "assertions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clouds" ADD CONSTRAINT "clouds_revision_id_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clouds" ADD CONSTRAINT "clouds_situation_id_situations_id_fk" FOREIGN KEY ("situation_id") REFERENCES "public"."situations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clouds" ADD CONSTRAINT "clouds_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_options" ADD CONSTRAINT "decision_options_revision_id_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_options" ADD CONSTRAINT "decision_options_situation_id_situations_id_fk" FOREIGN KEY ("situation_id") REFERENCES "public"."situations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_options" ADD CONSTRAINT "decision_options_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disclosures" ADD CONSTRAINT "disclosures_situation_id_situations_id_fk" FOREIGN KEY ("situation_id") REFERENCES "public"."situations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disclosures" ADD CONSTRAINT "disclosures_revision_id_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disclosures" ADD CONSTRAINT "disclosures_disclosed_by_users_id_fk" FOREIGN KEY ("disclosed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disclosures" ADD CONSTRAINT "disclosures_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_disclosure_id_disclosures_id_fk" FOREIGN KEY ("disclosure_id") REFERENCES "public"."disclosures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_revision_id_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_situation_id_situations_id_fk" FOREIGN KEY ("situation_id") REFERENCES "public"."situations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_left_by_user_id_users_id_fk" FOREIGN KEY ("left_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_revision_after_id_revisions_id_fk" FOREIGN KEY ("revision_after_id") REFERENCES "public"."revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_pins" ADD CONSTRAINT "knowledge_pins_pinned_by_users_id_fk" FOREIGN KEY ("pinned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_situation_id_situations_id_fk" FOREIGN KEY ("situation_id") REFERENCES "public"."situations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_parent_id_revisions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "situations" ADD CONSTRAINT "situations_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_drafts" ADD CONSTRAINT "step_drafts_situation_id_situations_id_fk" FOREIGN KEY ("situation_id") REFERENCES "public"."situations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trial_results" ADD CONSTRAINT "trial_results_trial_id_trials_id_fk" FOREIGN KEY ("trial_id") REFERENCES "public"."trials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trial_results" ADD CONSTRAINT "trial_results_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trials" ADD CONSTRAINT "trials_revision_id_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trials" ADD CONSTRAINT "trials_situation_id_situations_id_fk" FOREIGN KEY ("situation_id") REFERENCES "public"."situations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trials" ADD CONSTRAINT "trials_prev_trial_id_trials_id_fk" FOREIGN KEY ("prev_trial_id") REFERENCES "public"."trials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trials" ADD CONSTRAINT "trials_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_messages_situation_id_idx" ON "ai_messages" USING btree ("situation_id");--> statement-breakpoint
CREATE INDEX "ai_messages_revision_id_idx" ON "ai_messages" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "ai_messages_created_at_idx" ON "ai_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "assertions_revision_id_idx" ON "assertions" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "assertions_situation_id_idx" ON "assertions" USING btree ("situation_id");--> statement-breakpoint
CREATE INDEX "assertions_author_id_idx" ON "assertions" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "assertions_kind_idx" ON "assertions" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "assertions_status_idx" ON "assertions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "clouds_revision_id_idx" ON "clouds" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "clouds_situation_id_idx" ON "clouds" USING btree ("situation_id");--> statement-breakpoint
CREATE INDEX "clouds_creator_id_idx" ON "clouds" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "decision_options_revision_id_idx" ON "decision_options" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "decision_options_situation_id_idx" ON "decision_options" USING btree ("situation_id");--> statement-breakpoint
CREATE INDEX "decision_options_creator_id_idx" ON "decision_options" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "disclosures_situation_id_idx" ON "disclosures" USING btree ("situation_id");--> statement-breakpoint
CREATE INDEX "disclosures_revision_id_idx" ON "disclosures" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "disclosures_disclosed_by_idx" ON "disclosures" USING btree ("disclosed_by");--> statement-breakpoint
CREATE INDEX "disclosures_recipient_user_id_idx" ON "disclosures" USING btree ("recipient_user_id");--> statement-breakpoint
CREATE INDEX "feedbacks_disclosure_id_idx" ON "feedbacks" USING btree ("disclosure_id");--> statement-breakpoint
CREATE INDEX "feedbacks_revision_id_idx" ON "feedbacks" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "feedbacks_situation_id_idx" ON "feedbacks" USING btree ("situation_id");--> statement-breakpoint
CREATE INDEX "feedbacks_left_by_user_id_idx" ON "feedbacks" USING btree ("left_by_user_id");--> statement-breakpoint
CREATE INDEX "feedbacks_kind_idx" ON "feedbacks" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "knowledge_pins_pack_status_idx" ON "knowledge_pins" USING btree ("pack","status");--> statement-breakpoint
CREATE INDEX "mcp_cache_source_pack_operation_idx" ON "mcp_cache" USING btree ("source_pack","operation");--> statement-breakpoint
CREATE INDEX "mcp_cache_expires_at_idx" ON "mcp_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "revisions_situation_id_idx" ON "revisions" USING btree ("situation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "revisions_situation_id_number_unique" ON "revisions" USING btree ("situation_id","number");--> statement-breakpoint
CREATE INDEX "revisions_parent_id_idx" ON "revisions" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "revisions_created_by_idx" ON "revisions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "revisions_kind_idx" ON "revisions" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "situations_creator_id_idx" ON "situations" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "situations_profile_idx" ON "situations" USING btree ("profile");--> statement-breakpoint
CREATE INDEX "situations_visibility_idx" ON "situations" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "situations_current_revision_id_idx" ON "situations" USING btree ("current_revision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "step_draft_slot" ON "step_drafts" USING btree ("situation_id","step");--> statement-breakpoint
CREATE INDEX "trial_results_created_by_idx" ON "trial_results" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "trials_revision_id_idx" ON "trials" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "trials_situation_id_idx" ON "trials" USING btree ("situation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trials_situation_id_number_unique" ON "trials" USING btree ("situation_id","revision_id","number");--> statement-breakpoint
CREATE INDEX "trials_prev_trial_id_idx" ON "trials" USING btree ("prev_trial_id");--> statement-breakpoint
CREATE INDEX "trials_status_idx" ON "trials" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trials_creator_id_idx" ON "trials" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_invited_by_idx" ON "users" USING btree ("invited_by");