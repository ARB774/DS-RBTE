export interface KnowledgeReference {
  sourceId: string;
  path: string;
  commit: string;
  fragmentId?: string | undefined;
}

export interface KnowledgeFragment extends KnowledgeReference {
  /** Already authorised and version-pinned content returned by the MCP layer. */
  content: string;
}

export interface AIModelRequest {
  /** Stable key allocated before a provider call. Never contains personal data. */
  idempotencyKey: string;
  step: string;
  instructions: string;
  userMessage: string;
  /** Only masked fields selected by the server-side context builder. */
  maskedContext: Readonly<Record<string, unknown>>;
  knowledge: readonly KnowledgeFragment[];
}

export interface AIUsage {
  inputUnits: number;
  outputUnits: number;
}

export interface AIModelResult {
  response: AIResponse;
  provider: string;
  model: string;
  providerRequestId: string;
  usage: AIUsage;
  latencyMs: number;
}

export interface CandidateStatement {
  text: string;
  statementType: "hypothesis";
}

export interface SuggestedChange {
  targetKind: string;
  targetRef?: string | undefined;
  operation: "create" | "replace" | "append" | "remove";
  payload: Readonly<Record<string, unknown>>;
}

export interface AIResponse {
  question: string;
  observations: string[];
  candidateStatements: CandidateStatement[];
  suggestedChanges: SuggestedChange[];
  checks: string[];
  supportOptions: string[];
  warnings: string[];
  knowledgeRefs: KnowledgeReference[];
}

export interface AIModelAdapter {
  readonly provider: string;
  readonly model: string;
  generate(request: AIModelRequest, signal?: AbortSignal): Promise<AIModelResult>;
}
