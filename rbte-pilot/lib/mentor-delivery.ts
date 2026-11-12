import { z } from 'zod';

const noticeSchema = z.object({ message: z.string(), participantId: z.string().uuid(), intent: z.string(), dataMode: z.string() });
export function readMentorNotice(content: string) {
  try { return noticeSchema.parse(JSON.parse(content)); } catch { return null; }
}

function mentorFailureCategory(error: unknown): string {
  if (!(error instanceof Error)) return 'non_error_throwable';
  if (error.name === 'ZodError') return 'model_output_schema';
  if (error.name === 'SyntaxError') return 'model_output_json';
  if (error.name === 'AbortError' || error.name === 'TimeoutError') return 'upstream_timeout';

  // Classify only known, fixed error messages. Never log arbitrary message,
  // response body, prompt, or participant text: some providers include those.
  const message = error.message;
  if (message.includes('Методические источники через MCP') || message.includes('MCP method retrieval')) return 'method_retrieval';
  if (message.includes('MCP response exceeds budget')) return 'method_response_budget';
  if (message.includes('Обязательный метод Pack-TOC')) return 'required_method_missing';
  if (message === 'Наставник временно недоступен.') return 'provider_http_error';
  if (message === 'Ответ наставника не завершён.') return 'provider_incomplete';
  if (message.includes('превышает общий допустимый размер')) return 'response_budget_exceeded';
  if (message.includes('не указал принятое изменение')) return 'missing_accepted_update';
  if (message.includes('непрочитанный источник')) return 'unverified_source_reference';
  if (message.includes('Критерий наставника не подтверждён')) return 'criterion_evidence';
  if (message.includes('Источник принятого пункта') || message.includes('Неверная ссылка на материал')) return 'admission_reference_validation';
  if (message.includes('не обновил обязательную логическую схему')) return 'required_diagram_validation';
  if (message.includes('Проект изменился в другом окне')) return 'concurrent_project_update';
  if (message.includes('Проверка допуска')) return 'admission_check';
  if (message.includes('S5') || message.includes('Тучи')) return 'stage_validation';
  if (message === 'fetch failed') return 'upstream_transport';
  return 'unclassified_error';
}

// Saving the learner's attempt is deliberately outside the reply transaction.
// Provider/validation failures must never roll back their independent work.
export async function deliverSavedMentorTurn<T>(steps: {
  saveParticipant: () => Promise<void>;
  generate: () => Promise<T>;
  saveReply: (reply: T) => Promise<void>;
  saveFailure: () => Promise<void>;
}) {
  await steps.saveParticipant();
  let phase: 'generate' | 'save_reply' = 'generate';
  try {
    const reply = await steps.generate();
    phase = 'save_reply';
    await steps.saveReply(reply);
    return true;
  } catch (error) {
    const providerStatus = error instanceof Error && error.name === 'MentorProviderHttpError'
      ? (error as Error & { providerStatus?: unknown }).providerStatus
      : undefined;
    const safeProviderStatus = typeof providerStatus === 'number' && Number.isInteger(providerStatus) && providerStatus >= 100 && providerStatus <= 599
      ? providerStatus
      : undefined;
    console.error('mentor-reply-failed', JSON.stringify({
      phase,
      category: mentorFailureCategory(error),
      errorName: error instanceof Error ? error.name : 'UnknownError',
      ...(safeProviderStatus === undefined ? {} : { providerStatus: safeProviderStatus }),
    }));
    try { await steps.saveFailure(); } catch { console.error('mentor-failure-notice-unavailable'); }
    return false;
  }
}
