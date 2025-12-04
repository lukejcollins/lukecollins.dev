import {context, trace, SpanStatusCode} from '@opentelemetry/api'
import {logToLoki} from './lokiLogger'

export async function logRevalidate(path: string, ok: boolean, duration_ms: number, error?: unknown) {
  const tracer = trace.getTracer('next-blog');
  const span = tracer.startSpan('isr.revalidate', {
    attributes: {
      'http.route': path,
      'http.request.method': 'REVALIDATE',
      'revalidate.duration_ms': duration_ms,
    },
  });
  const spanCtx = trace.setSpan(context.active(), span);

  if (error) {
    span.recordException(error as Error);
    span.setStatus({code: SpanStatusCode.ERROR});
  } else {
    span.setStatus({code: SpanStatusCode.OK});
  }

  await context.with(spanCtx, () =>
    logToLoki(
      ok ? 'info' : 'error',
      ok ? 'revalidate_success' : 'revalidate_failed',
      {kind: 'request', route: path, method: 'REVALIDATE'},
      {
        duration_ms,
        ...(error instanceof Error
          ? {message: error.message, stack: error.stack}
          : error
          ? {error: String(error)}
          : {}),
      },
    ),
  );

  span.end();
}
