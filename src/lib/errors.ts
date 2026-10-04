import type { ApiError, ApiErrorCode } from "@/types/analysis";

/** Error with an API code and HTTP status; message is safe to show users. */
export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fieldErrors?: ApiError["fieldErrors"];

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number = 500,
    fieldErrors?: ApiError["fieldErrors"],
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      ...(this.fieldErrors ? { fieldErrors: this.fieldErrors } : {}),
    };
  }
}
