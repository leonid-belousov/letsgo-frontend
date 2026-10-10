/**
 * Mirrors lets_go_back `ErrorCode`. Until the OpenAPI client is generated
 * (`npm run api:generate`), this is the single hand-maintained copy here.
 */
export const API_ERROR_CODES = [
  'VALIDATION',
  'ACCESS_DENIED',
  'EXPIRED',
  'CAPACITY_CHANGED',
  'BOOKING_CONFLICT',
  'VERSION_CHANGED',
  'UPLOAD_FAILED',
  'UNAUTHENTICATED',
  'NOT_FOUND',
  'INTERNAL',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Client-side codes for failures that never reached the API. */
export type ClientErrorCode = 'NETWORK' | 'UNKNOWN';

export class ApiRequestError extends Error {
  constructor(
    readonly code: ApiErrorCode | ClientErrorCode,
    message: string,
    readonly status: number,
    readonly details?: Record<string, unknown>,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/** User-facing messages from the approved states table (Handoff §19). */
export function userMessageFor(code: ApiErrorCode | ClientErrorCode): string {
  switch (code) {
    case 'CAPACITY_CHANGED':
      return 'That place was just taken.';
    case 'BOOKING_CONFLICT':
      return 'This time is no longer available.';
    case 'ACCESS_DENIED':
      return 'You no longer have access to this action.';
    case 'EXPIRED':
      return 'Invitation expired';
    case 'NETWORK':
      return 'You’re offline';
    case 'NOT_FOUND':
      return 'This content isn’t available';
    default:
      return 'Couldn’t load this. Try again.';
  }
}
