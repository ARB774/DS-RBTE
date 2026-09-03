import type { AIModelAdapter } from "./contracts";
import { AIAdapterError } from "./errors";
import { OpenAIModelAdapter } from "./openai-adapter";
import { StubAIModelAdapter } from "./stub-adapter";

export type AIProvider = "stub" | "openai";

export interface AIAdapterConfig {
  provider: AIProvider;
  model: string;
  openAIApiKey?: string;
  timeoutMs: number;
  stubLatencyMs: number;
}

export function readAIAdapterConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): AIAdapterConfig {
  const provider = environment.AI_PROVIDER?.trim() || "stub";

  if (provider !== "stub" && provider !== "openai") {
    throw new AIAdapterError("configuration", `Unsupported AI_PROVIDER: ${provider}`);
  }

  if (provider === "stub") {
    return {
      provider,
      model: environment.AI_MODEL?.trim() || "rbte-stub-v1",
      timeoutMs: readNonNegativeInteger(environment.OPENAI_TIMEOUT_MS, 30_000),
      stubLatencyMs: readNonNegativeInteger(environment.AI_STUB_LATENCY_MS, 0),
    };
  }

  const openAIApiKey = environment.OPENAI_API_KEY?.trim();
  if (!openAIApiKey) {
    throw new AIAdapterError(
      "configuration",
      "OPENAI_API_KEY is required when AI_PROVIDER=openai.",
    );
  }

  return {
    provider,
    model: environment.OPENAI_MODEL?.trim() || "gpt-5.6-terra",
    openAIApiKey,
    timeoutMs: readNonNegativeInteger(environment.OPENAI_TIMEOUT_MS, 30_000),
    stubLatencyMs: 0,
  };
}

export function createAIAdapter(config = readAIAdapterConfig()): AIModelAdapter {
  if (config.provider === "stub") {
    return new StubAIModelAdapter({
      model: config.model,
      latencyMs: config.stubLatencyMs,
    });
  }

  if (!config.openAIApiKey) {
    throw new AIAdapterError(
      "configuration",
      "OpenAI adapter configuration has no server-side API key.",
    );
  }

  return new OpenAIModelAdapter({
    apiKey: config.openAIApiKey,
    model: config.model,
    timeoutMs: config.timeoutMs,
  });
}

function readNonNegativeInteger(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new AIAdapterError("configuration", `Expected a non-negative integer, got: ${value}`);
  }

  return parsed;
}
