import {logRequestStart} from '@/lib/requestLogger'

export const runtime = 'nodejs'

export async function GET() {
  const logger = await logRequestStart('/api/health', 'GET')
  try {
    const response = new Response('ok')
    await logger.success(response.status)
    return response
  } catch (err) {
    await logger.error(500, err)
    throw err
  }
}
