/**
 * API Gateway types
 */

export interface APIResponse<T = unknown> {
  statusCode: number;
  headers?: Record<string, string>;
  body: string; // JSON stringified T
}

export function createResponse<T>(statusCode: number, body: T, headers?: Record<string, string>): APIResponse<T> {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

export function createErrorResponse(statusCode: number, message: string, error?: unknown): APIResponse<{ error: string; details?: unknown }> {
  return createResponse(statusCode, {
    error: message,
    ...(error && { details: error }),
  });
}
