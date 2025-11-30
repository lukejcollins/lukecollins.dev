import {logToLoki} from './lokiLogger'

export async function logRevalidate(path: string, ok: boolean, duration_ms: number, error?: unknown) {
  await logToLoki(
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
  )
}
