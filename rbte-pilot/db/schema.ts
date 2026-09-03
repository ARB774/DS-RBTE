import {
  pgEnum,
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role_enum', [
  'PARTICIPANT',
  'FACILITATOR',
  'SUPPORTER',
  'ADMIN',
  'MENTOR',
]);

export const profileEnum = pgEnum('profile_enum', [
  'DILEMMA',
  'CONFLICT',
  'LT_CLOUD',
  'IMMUNITY',
]);

export const visibilityEnum = pgEnum('visibility_enum', [
  'PRIVATE',
  'SHARED',
  'PUBLIC',
]);

export const sensitivityEnum = pgEnum('sensitivity_enum', [
  'LOW',
  'STANDARD',
  'HIGH',
  'CRITICAL',
]);

export const supportLevelEnum = pgEnum('support_level_enum', [
  'NONE',
  'LOW',
  'MEDIUM',
  'HIGH',
]);

export const revisionKindEnum = pgEnum('revision_kind_enum', [
  'STEP_41',
  'STEP_42',
  'STEP_43',
  'STEP_44',
  'STEP_45',
  'STEP_46',
  'STEP_47',
  'MANUAL',
]);

export const assertionKindEnum = pgEnum('assertion_kind_enum', [
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
  'READINESS',
]);

export const assertionStatusEnum = pgEnum('assertion_status_enum', [
  'DRAFT',
  'STATED',
  'VERIFIED',
  'REFUTED',
]);

export const trialStatusEnum = pgEnum('trial_status_enum', [
  'PLANNED',
  'IMPOSSIBLE',
  'BLOCKED',
  'DONE',
]);

export const levelEnum = pgEnum('level_enum', [
  'NOT_PRESENTED',
  'PARTIAL',
  'SUFFICIENT',
  'CONVINCING',
]);

export const continuationEnum = pgEnum('continuation_enum', [
  'OBSERVE',
  'CHANGE_TRIAL',
  'BACKTRACK',
  'CLOSE',
]);

export const feedbackKindEnum = pgEnum('feedback_kind_enum', [
  'DEVELOPMENTAL',
  'ARTIFACT_QUALITY',
  'EFFECT_CLAIM',
]);

export const chatRoleEnum = pgEnum('chat_role_enum', [
  'USER',
  'ASSISTANT',
]);

export const acceptedStatusEnum = pgEnum('accepted_status_enum', [
  'NONE',
  'ACCEPTED',
  'MODIFIED',
  'REJECTED',
]);

export const packEnum = pgEnum('pack_enum', [
  'FPF',
  'PACK_AL',
  'PACK_TOC',
  'PACK_ATB',
]);

export const mcpOperationEnum = pgEnum('mcp_operation_enum', [
  'SEARCH',
  'GET',
  'WP_SCHEMA',
  'DISTINCTIONS',
  'SOURCE_META',
  'NOT_FOUND',
]);

export const pinStatusEnum = pgEnum('pin_status_enum', [
  'ACTIVE',
  'SUPERSEDED',
]);

export const users: any = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    role: roleEnum('role').notNull().default('PARTICIPANT'),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    invitedBy: uuid('invited_by').references(() => users.id),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    roleIdx: index('users_role_idx').on(table.role),
    invitedByIdx: index('users_invited_by_idx').on(table.invitedBy),
    emailUnique: uniqueIndex('users_email_unique').on(table.email),
  }),
);

export const sessions = pgTable(
  'sessions',
  {
    // Lucia v3 session IDs are 40-character base32 strings, not UUIDs.
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    userIdIdx: index('sessions_user_id_idx').on(table.userId),
  }),
);

export const situations = pgTable(
  'situations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profile: profileEnum('profile').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    signal: text('signal'),
    sensitivity: sensitivityEnum('sensitivity').notNull().default('STANDARD'),
    task: text('task'),
    desiredChange: text('desired_change'),
    experience: text('experience'),
    authority: text('authority'),
    supportLevel: supportLevelEnum('support_level').notNull().default('NONE'),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => users.id),
    visibility: visibilityEnum('visibility').notNull().default('PRIVATE'),
    aiAttemptBaseline: text('ai_attempt_baseline'),
    baselineReason: text('baseline_reason'),
    currentRevisionId: uuid('current_revision_id'),
    locked: boolean('locked').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    creatorIdIdx: index('situations_creator_id_idx').on(table.creatorId),
    profileIdx: index('situations_profile_idx').on(table.profile),
    visibilityIdx: index('situations_visibility_idx').on(table.visibility),
    currentRevisionIdIdx: index('situations_current_revision_id_idx').on(
      table.currentRevisionId,
    ),
  }),
);

export const revisions: any = pgTable(
  'revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    situationId: uuid('situation_id')
      .notNull()
      .references(() => situations.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    parentId: uuid('parent_id').references(() => revisions.id),
    kind: revisionKindEnum('kind').notNull(),
    snapshot: jsonb('snapshot').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    situationIdIdx: index('revisions_situation_id_idx').on(table.situationId),
    situationNumberUnique: uniqueIndex(
      'revisions_situation_id_number_unique',
    ).on(table.situationId, table.number),
    parentIdIdx: index('revisions_parent_id_idx').on(table.parentId),
    createdByIdx: index('revisions_created_by_idx').on(table.createdBy),
    kindIdx: index('revisions_kind_idx').on(table.kind),
  }),
);

export const assertions = pgTable(
  'assertions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => revisions.id, { onDelete: 'cascade' }),
    situationId: uuid('situation_id')
      .notNull()
      .references(() => situations.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    kind: assertionKindEnum('kind').notNull(),
    source: text('source'),
    status: assertionStatusEnum('status').notNull().default('DRAFT'),
    content: jsonb('content').notNull(),
    elementRef: text('element_ref'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    revisionIdIdx: index('assertions_revision_id_idx').on(table.revisionId),
    situationIdIdx: index('assertions_situation_id_idx').on(table.situationId),
    authorIdIdx: index('assertions_author_id_idx').on(table.authorId),
    kindIdx: index('assertions_kind_idx').on(table.kind),
    statusIdx: index('assertions_status_idx').on(table.status),
  }),
);

export const clouds = pgTable(
  'clouds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => revisions.id, { onDelete: 'cascade' }),
    situationId: uuid('situation_id')
      .notNull()
      .references(() => situations.id, { onDelete: 'cascade' }),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => users.id),
    kind: profileEnum('kind').notNull(),
    goal: text('goal'),
    needs: jsonb('needs').notNull().$type<
      Array<{ text: string; side?: string | null }>
    >(),
    conflictingActions: jsonb('conflicting_actions')
      .notNull()
      .$type<Array<{ text: string; side?: string | null }>>(),
    links: jsonb('links')
      .notNull()
      .$type<
        Array<{
          fromNeed: string;
          toAction: string;
          assumptions: string[];
          checks: string[];
        }>
      >(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    revisionIdIdx: index('clouds_revision_id_idx').on(table.revisionId),
    situationIdIdx: index('clouds_situation_id_idx').on(table.situationId),
    creatorIdIdx: index('clouds_creator_id_idx').on(table.creatorId),
  }),
);

export const decisionOptions = pgTable(
  'decision_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => revisions.id, { onDelete: 'cascade' }),
    situationId: uuid('situation_id')
      .notNull()
      .references(() => situations.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 500 }).notNull(),
    mechanism: jsonb('mechanism'),
    overcomeBeliefId: uuid('overcome_belief_id'),
    preservedConditions: jsonb('preserved_conditions'),
    contextChanges: jsonb('context_changes'),
    risks: jsonb('risks'),
    chosen: boolean('chosen').notNull().default(false),
    rejected: boolean('rejected').notNull().default(false),
    choiceReason: text('choice_reason'),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => users.id),
    ordinal: integer('ordinal').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    revisionIdIdx: index('decision_options_revision_id_idx').on(
      table.revisionId,
    ),
    situationIdIdx: index('decision_options_situation_id_idx').on(
      table.situationId,
    ),
    creatorIdIdx: index('decision_options_creator_id_idx').on(table.creatorId),
  }),
);

export const trials: any = pgTable(
  'trials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => revisions.id, { onDelete: 'cascade' }),
    situationId: uuid('situation_id')
      .notNull()
      .references(() => situations.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    prevTrialId: uuid('prev_trial_id').references(() => trials.id),
    hypothesis: text('hypothesis'),
    action: text('action'),
    authorityBoundary: text('authority_boundary'),
    acceptableRisk: text('acceptable_risk'),
    protectionMeasures: text('protection_measures'),
    expectedObservation: text('expected_observation'),
    supportIndicator: text('support_indicator'),
    weakenIndicator: text('weaken_indicator'),
    feedbackDue: timestamp('feedback_due', { withTimezone: true }),
    transferEnvConditions: text('transfer_env_conditions'),
    requiredSupport: text('required_support'),
    academicVsWorkDistinction: text('academic_vs_work_distinction'),
    nextTrialCondition: text('next_trial_condition'),
    status: trialStatusEnum('status').notNull().default('PLANNED'),
    blockReason: text('block_reason'),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    revisionIdIdx: index('trials_revision_id_idx').on(table.revisionId),
    situationIdIdx: index('trials_situation_id_idx').on(table.situationId),
    situationNumberUnique: uniqueIndex('trials_situation_id_number_unique').on(
      table.situationId,
      table.revisionId,
      table.number,
    ),
    prevTrialIdIdx: index('trials_prev_trial_id_idx').on(table.prevTrialId),
    statusIdx: index('trials_status_idx').on(table.status),
    creatorIdIdx: index('trials_creator_id_idx').on(table.creatorId),
  }),
);

export const trialResults = pgTable(
  'trial_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trialId: uuid('trial_id')
      .notNull()
      .unique()
      .references(() => trials.id, { onDelete: 'cascade' }),
    plannedAction: text('planned_action'),
    actualAction: text('actual_action'),
    observation: text('observation'),
    interpretation: text('interpretation'),
    capabilityLevel: levelEnum('capability_level')
      .notNull()
      .default('NOT_PRESENTED'),
    transferLevel: levelEnum('transfer_level')
      .notNull()
      .default('NOT_PRESENTED'),
    effectLevel: levelEnum('effect_level')
      .notNull()
      .default('NOT_PRESENTED'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    continuation: continuationEnum('continuation'),
    closeReason: text('close_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    createdByIdx: index('trial_results_created_by_idx').on(table.createdBy),
  }),
);

export const disclosures = pgTable(
  'disclosures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    situationId: uuid('situation_id')
      .notNull()
      .references(() => situations.id, { onDelete: 'cascade' }),
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => revisions.id, { onDelete: 'cascade' }),
    disclosedBy: uuid('disclosed_by')
      .notNull()
      .references(() => users.id),
    recipientUserId: uuid('recipient_user_id').references(() => users.id),
    recipientRole: roleEnum('recipient_role'),
    scopeSummary: text('scope_summary'),
    sharedAt: timestamp('shared_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    situationIdIdx: index('disclosures_situation_id_idx').on(table.situationId),
    revisionIdIdx: index('disclosures_revision_id_idx').on(table.revisionId),
    disclosedByIdx: index('disclosures_disclosed_by_idx').on(
      table.disclosedBy,
    ),
    recipientUserIdIdx: index('disclosures_recipient_user_id_idx').on(
      table.recipientUserId,
    ),
  }),
);

export const feedbacks = pgTable(
  'feedbacks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    disclosureId: uuid('disclosure_id').unique().references(() => disclosures.id, {
      onDelete: 'set null',
    }),
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => revisions.id, { onDelete: 'cascade' }),
    situationId: uuid('situation_id')
      .notNull()
      .references(() => situations.id, { onDelete: 'cascade' }),
    leftByUserId: uuid('left_by_user_id')
      .notNull()
      .references(() => users.id),
    kind: feedbackKindEnum('kind').notNull(),
    criterionRef: text('criterion_ref'),
    observedBasis: text('observed_basis'),
    nextAction: text('next_action'),
    accepted: boolean('accepted'),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    revisionAfterId: uuid('revision_after_id').references(() => revisions.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    disclosureIdIdx: index('feedbacks_disclosure_id_idx').on(table.disclosureId),
    revisionIdIdx: index('feedbacks_revision_id_idx').on(table.revisionId),
    situationIdIdx: index('feedbacks_situation_id_idx').on(table.situationId),
    leftByUserIdIdx: index('feedbacks_left_by_user_id_idx').on(
      table.leftByUserId,
    ),
    kindIdx: index('feedbacks_kind_idx').on(table.kind),
  }),
);

export const aiMessages = pgTable(
  'ai_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    situationId: uuid('situation_id')
      .notNull()
      .references(() => situations.id, { onDelete: 'cascade' }),
    revisionId: uuid('revision_id').references(() => revisions.id, {
      onDelete: 'set null',
    }),
    model: varchar('model', { length: 255 }).notNull(),
    systemPromptVersion: varchar('system_prompt_version', { length: 255 }),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    role: chatRoleEnum('role').notNull(),
    content: jsonb('content').notNull(),
    usedElements: jsonb('used_elements')
      .notNull()
      .$type<Array<{ type: string; id: string }>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    acceptedStatus: acceptedStatusEnum('accepted_status')
      .notNull()
      .default('NONE'),
    replacedContent: jsonb('replaced_content'),
  },
  (table) => ({
    situationIdIdx: index('ai_messages_situation_id_idx').on(table.situationId),
    revisionIdIdx: index('ai_messages_revision_id_idx').on(table.revisionId),
    createdAtIdx: index('ai_messages_created_at_idx').on(table.createdAt),
  }),
);

export const mcpCache = pgTable(
  'mcp_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourcePack: packEnum('source_pack').notNull(),
    entityId: varchar('entity_id', { length: 255 }),
    operation: mcpOperationEnum('operation').notNull(),
    paramsDigest: uuid('params_digest').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    responseJson: jsonb('response_json').notNull(),
    sourceRefs: jsonb('source_refs'),
    terminalIncompatible: boolean('terminal_incompatible')
      .notNull()
      .default(false),
    terminalIncompatibleReason: text('terminal_incompatible_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    sourcePackOperationIdx: index('mcp_cache_source_pack_operation_idx').on(
      table.sourcePack,
      table.operation,
    ),
    expiresAtIndex: index('mcp_cache_expires_at_idx').on(table.expiresAt),
  }),
);

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id'),
  role: roleEnum('role'),
  action: varchar('action', { length: 255 }).notNull(),
  targetType: varchar('target_type', { length: 255 }),
  targetId: uuid('target_id'),
  beforeJson: jsonb('before_json'),
  afterJson: jsonb('after_json'),
  actorIp: varchar('actor_ip', { length: 45 }),
  userAgent: text('user_agent'),
  meta: jsonb('meta'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const knowledgePins = pgTable(
  'knowledge_pins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pack: packEnum('pack').notNull(),
    commitRef: varchar('commit_ref', { length: 255 }).notNull().unique(),
    editionRef: varchar('edition_ref', { length: 255 }),
    pinnedAt: timestamp('pinned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    pinnedBy: uuid('pinned_by').references(() => users.id),
    status: pinStatusEnum('status').notNull().default('ACTIVE'),
  },
  (table) => ({
    packStatusIdx: index('knowledge_pins_pack_status_idx').on(
      table.pack,
      table.status,
    ),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Situation = typeof situations.$inferSelect;
export type NewSituation = typeof situations.$inferInsert;
export type Revision = typeof revisions.$inferSelect;
export type NewRevision = typeof revisions.$inferInsert;
export type Assertion = typeof assertions.$inferSelect;
export type NewAssertion = typeof assertions.$inferInsert;
export type Cloud = typeof clouds.$inferSelect;
export type NewCloud = typeof clouds.$inferInsert;
export type DecisionOption = typeof decisionOptions.$inferSelect;
export type NewDecisionOption = typeof decisionOptions.$inferInsert;
export type Trial = typeof trials.$inferSelect;
export type NewTrial = typeof trials.$inferInsert;
export type TrialResult = typeof trialResults.$inferSelect;
export type NewTrialResult = typeof trialResults.$inferInsert;
export type Disclosure = typeof disclosures.$inferSelect;
export type NewDisclosure = typeof disclosures.$inferInsert;
export type Feedback = typeof feedbacks.$inferSelect;
export type NewFeedback = typeof feedbacks.$inferInsert;
export type AiMessage = typeof aiMessages.$inferSelect;
export type NewAiMessage = typeof aiMessages.$inferInsert;
export type McpCacheEntry = typeof mcpCache.$inferSelect;
export type NewMcpCacheEntry = typeof mcpCache.$inferInsert;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
export type KnowledgePin = typeof knowledgePins.$inferSelect;
export type NewKnowledgePin = typeof knowledgePins.$inferInsert;

export type UserRole = (typeof roleEnum.enumValues)[number];
export type SituationProfile = (typeof profileEnum.enumValues)[number];
export type SituationVisibility = (typeof visibilityEnum.enumValues)[number];
export type RevisionKind = (typeof revisionKindEnum.enumValues)[number];
export type AssertionKind = (typeof assertionKindEnum.enumValues)[number];
export type AssertionStatus = (typeof assertionStatusEnum.enumValues)[number];
export type TrialStatus = (typeof trialStatusEnum.enumValues)[number];
export type Level = (typeof levelEnum.enumValues)[number];
export type Continuation = (typeof continuationEnum.enumValues)[number];
export type FeedbackKind = (typeof feedbackKindEnum.enumValues)[number];
export type ChatRole = (typeof chatRoleEnum.enumValues)[number];
export type AcceptedStatus = (typeof acceptedStatusEnum.enumValues)[number];
export type PackId = (typeof packEnum.enumValues)[number];
export type McpOperation = (typeof mcpOperationEnum.enumValues)[number];
export type PinStatus = (typeof pinStatusEnum.enumValues)[number];
export type SensitivityLevel = (typeof sensitivityEnum.enumValues)[number];
export type SupportLevel = (typeof supportLevelEnum.enumValues)[number];
