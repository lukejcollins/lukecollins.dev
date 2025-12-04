import { registerOTel } from '@vercel/otel';
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await registerOTel({
      serviceName: process.env.OTEL_SERVICE_NAME || 'next-blog-sanity',
      attributes: {
        'deployment.environment': process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'local',
      },
      instrumentationConfig: {
        fetch: {
          ignoreUrls: [
            /logs-prod-012\.grafana\.net/i,
            /otlp-gateway-prod-eu-west-2\.grafana\.net/i,
          ],
        },
      },
    });
    await import('./sentry.server.config');
    const { setupProcessLogging } = await import('./lib/runtimeLogging');
    setupProcessLogging();
    const { bridgeConsole } = await import('./lib/consoleBridge');
    bridgeConsole();
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

type RequestLike = Request & {
  nextUrl?: { pathname?: string };
  method?: string;
} | {
  nextUrl?: { pathname?: string };
  url?: string;
  method?: string;
};

export const onRequestError = async (
  error: unknown,
  request?: RequestLike,
  errorContext?: Record<string, unknown>,
) => {
  const path = request?.nextUrl?.pathname ?? request?.url ?? 'unknown';
  const method = request?.method ?? 'unknown';

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { logToLoki } = await import('./lib/lokiLogger');
      await logToLoki(
        'error',
        'request_error',
        { route: path, method, kind: 'errorhook' },
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : { error: String(error) }
      );
    } catch (err) {
      console.error('loki push failed', err);
    }
  }

  type RequestParam = Parameters<typeof Sentry.captureRequestError>[1];
  const requestForSentry: RequestParam =
    (request as RequestParam) ?? ({ path, method } as RequestParam);

  return Sentry.captureRequestError(error, requestForSentry, errorContext as never);
};
