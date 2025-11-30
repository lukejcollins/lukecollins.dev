import {NextRequest} from 'next/server'
import {logRequestStart} from '@/lib/requestLogger'
import {logToLoki} from '@/lib/lokiLogger'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const logger = await logRequestStart('/api/log-client', 'POST', {
    userAgent: request.headers.get('user-agent') || undefined,
    referer: request.headers.get('referer') || undefined,
  })
  const body = await request.json().catch(() => null)

  if (!body || typeof body !== 'object') {
    await logger.error(400, 'invalid_body')
    return new Response('Bad Request', {status: 400})
  }

  const {message, stack, digest, path} = body as {
    message?: string
    stack?: string
    digest?: string
    path?: string
  }

  await logToLoki(
    'error',
    'client_error',
    {route: path || 'unknown', kind: 'client'},
    {message: message || 'Unknown client error', stack, digest},
  )

  await logger.success(204)
  return new Response(null, {status: 204})
}
