import {logToLoki} from './lokiLogger'

type ErrorPayload = {message: string; stack?: string} | {error: string}

function serializeError(err: unknown): ErrorPayload {
  if (err instanceof Error) {
    return {message: err.message, stack: err.stack}
  }
  return {error: String(err)}
}

export async function logRequestStart(
  route: string,
  method: string,
  context?: Record<string, unknown>,
) {
  await logToLoki(
    'info',
    'request_start',
    {route, method, kind: 'request'},
    context,
  )
  const started = Date.now()

  return {
    success: (status: number, extra?: Record<string, unknown>) =>
      logToLoki(
        'info',
        'request_complete',
        {route, method, status: String(status), kind: 'request'},
        {duration_ms: Date.now() - started, ...(context || {}), ...(extra || {})},
      ),
    error: (status: number, err: unknown, extra?: Record<string, unknown>) =>
      logToLoki(
        'error',
        'request_failed',
        {route, method, status: String(status), kind: 'request'},
        {
          duration_ms: Date.now() - started,
          ...(context || {}),
          ...(extra || {}),
          ...serializeError(err),
        },
      ),
  }
}
