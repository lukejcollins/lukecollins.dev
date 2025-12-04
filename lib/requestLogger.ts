import {context, trace, SpanStatusCode} from '@opentelemetry/api'
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
  contextData?: Record<string, unknown>,
) {
  const tracer = trace.getTracer('next-blog');
  const span = tracer.startSpan('http.server', {
    attributes: {
      'http.route': route,
      'http.request.method': method,
      'app.kind': 'request',
    },
  });
  const spanCtx = trace.setSpan(context.active(), span);

  await context.with(spanCtx, () =>
    logToLoki(
      'info',
      'request_start',
      {route, method, kind: 'request'},
      contextData,
    ),
  );
  const started = Date.now();

  return {
    success: (status: number, extra?: Record<string, unknown>) =>
      context.with(spanCtx, async () => {
        span.setAttributes({
          'http.response.status_code': status,
          'http.route': route,
          'http.request.method': method,
          'http.server.duration_ms': Date.now() - started,
        });
        span.setStatus({code: SpanStatusCode.OK});
        await logToLoki(
          'info',
          'request_complete',
          {route, method, status: String(status), kind: 'request'},
          {duration_ms: Date.now() - started, ...(contextData || {}), ...(extra || {})},
        );
        span.end();
      }),
    error: (status: number, err: unknown, extra?: Record<string, unknown>) =>
      context.with(spanCtx, async () => {
        span.recordException(err as Error);
        span.setAttributes({
          'http.response.status_code': status,
          'http.route': route,
          'http.request.method': method,
          'http.server.duration_ms': Date.now() - started,
        });
        span.setStatus({code: SpanStatusCode.ERROR});
        await logToLoki(
          'error',
          'request_failed',
          {route, method, status: String(status), kind: 'request'},
          {
            duration_ms: Date.now() - started,
            ...(contextData || {}),
            ...(extra || {}),
            ...serializeError(err),
          },
        );
        span.end();
      }),
  }
}
