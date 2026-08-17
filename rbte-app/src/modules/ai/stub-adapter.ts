import { createHash } from "node:crypto";

import type {
  AIModelAdapter,
  AIModelRequest,
  AIModelResult,
  AIResponse,
} from "./contracts";
import { aiResponseSchema } from "./schema";

export interface StubAIAdapterOptions {
  latencyMs?: number;
  model?: string;
}

const questionsByStep: Readonly<Record<string, string>> = {
  situation: "Какое наблюдаемое событие лучше всего показывает, что ситуация требует изменения?",
  cloud: "Какую связь в туче вы считаете наименее проверенной и на чём она основана?",
  beliefs: "Какое из сформулированных убеждений сильнее всего ограничивает доступные варианты?",
  solutions: "Какой вариант стоит сначала проверить малой обратимой пробой?",
  experiment: "Какое наблюдение подтвердит или опровергнет ожидаемый результат пробы?",
};

export class StubAIModelAdapter implements AIModelAdapter {
  readonly provider = "stub";
  readonly model: string;
  private readonly latencyMs: number;

  constructor(options: StubAIAdapterOptions = {}) {
    this.model = options.model ?? "rbte-stub-v1";
    this.latencyMs = options.latencyMs ?? 0;
  }

  async generate(request: AIModelRequest, signal?: AbortSignal): Promise<AIModelResult> {
    const startedAt = performance.now();

    if (this.latencyMs > 0) {
      await wait(this.latencyMs, signal);
    } else if (signal?.aborted) {
      throw signal.reason;
    }

    const response: AIResponse = {
      question:
        questionsByStep[request.step] ??
        "Какой следующий вопрос поможет отделить наблюдение от объяснения ситуации?",
      observations: [
        "Ответ сформирован локальной тестовой моделью и предназначен для проверки маршрута.",
      ],
      candidateStatements: request.userMessage.trim()
        ? [
            {
              text: "Проверьте, не принимается ли текущее объяснение за подтверждённое наблюдение.",
              statementType: "hypothesis",
            },
          ]
        : [],
      suggestedChanges: [],
      checks: [
        "Назовите наблюдаемый факт, источник и момент его получения.",
        "Укажите альтернативное объяснение, совместимое с теми же фактами.",
      ],
      supportOptions: [
        "Продолжить вручную.",
        "Предъявить выбранную редакцию наставнику после явного подтверждения.",
      ],
      warnings: ["Тестовая модель не выполняет содержательную доменную проверку."],
      knowledgeRefs: request.knowledge.map(({ content: _content, ...reference }) => reference),
    };

    const validated = aiResponseSchema.parse(response);
    const digest = createHash("sha256").update(request.idempotencyKey).digest("hex");

    return {
      response: validated,
      provider: this.provider,
      model: this.model,
      providerRequestId: `stub-${digest.slice(0, 24)}`,
      usage: {
        inputUnits: estimateUnits(
          JSON.stringify({
            step: request.step,
            userMessage: request.userMessage,
            maskedContext: request.maskedContext,
            knowledge: request.knowledge,
          }),
        ),
        outputUnits: estimateUnits(JSON.stringify(validated)),
      },
      latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
    };
  }
}

function estimateUnits(value: string): number {
  return Math.max(1, Math.ceil(value.length / 4));
}

async function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}
