import { describe, expect, it } from "vitest";

import { createAIAdapter, readAIAdapterConfig } from "./config";
import type { AIModelRequest } from "./contracts";
import { AIAdapterError } from "./errors";
import { aiResponseSchema } from "./schema";
import { StubAIModelAdapter } from "./stub-adapter";

const request: AIModelRequest = {
  idempotencyKey: "test-request-0001",
  step: "cloud",
  instructions: "Ask one question. Never choose a decision for the participant.",
  userMessage: "Связь кажется очевидной.",
  maskedContext: { profile: "personal_dilemma", node: "B" },
  knowledge: [
    {
      sourceId: "FPF",
      path: "FPF-Spec.md",
      commit: "3d098629dc218572089f1890080c17d6f1d9a867",
      fragmentId: "fragment-1",
      content: "Version-pinned test fragment.",
    },
  ],
};

describe("StubAIModelAdapter", () => {
  it("returns a valid deterministic provider-neutral response", async () => {
    const adapter = new StubAIModelAdapter();
    const first = await adapter.generate(request);
    const second = await adapter.generate(request);

    expect(aiResponseSchema.parse(first.response)).toEqual(first.response);
    expect(first.response).toEqual(second.response);
    expect(first.providerRequestId).toBe(second.providerRequestId);
    expect(first.provider).toBe("stub");
    expect(first.response.knowledgeRefs[0]).not.toHaveProperty("content");
  });

  it("uses the idempotency key to derive the request id", async () => {
    const adapter = new StubAIModelAdapter();
    const first = await adapter.generate(request);
    const second = await adapter.generate({ ...request, idempotencyKey: "test-request-0002" });

    expect(first.providerRequestId).not.toBe(second.providerRequestId);
  });
});

describe("AI adapter configuration", () => {
  it("selects the stub without any API key by default", () => {
    const config = readAIAdapterConfig({});
    const adapter = createAIAdapter(config);

    expect(config.provider).toBe("stub");
    expect(adapter).toBeInstanceOf(StubAIModelAdapter);
  });

  it("requires a key only when OpenAI is selected", () => {
    expect(() => readAIAdapterConfig({ AI_PROVIDER: "openai" })).toThrowError(
      AIAdapterError,
    );
  });

  it("rejects unknown providers", () => {
    expect(() => readAIAdapterConfig({ AI_PROVIDER: "browser-direct" })).toThrow(
      "Unsupported AI_PROVIDER",
    );
  });
});
