export type AIAdapterErrorCode =
  | "configuration"
  | "authentication"
  | "rate_limit"
  | "timeout"
  | "unavailable"
  | "invalid_response"
  | "provider_error";

export class AIAdapterError extends Error {
  readonly code: AIAdapterErrorCode;
  readonly retryable: boolean;

  constructor(
    code: AIAdapterErrorCode,
    message: string,
    options: { retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "AIAdapterError";
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}
