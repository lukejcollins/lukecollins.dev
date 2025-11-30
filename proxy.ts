import {NextResponse, type NextRequest} from 'next/server'
import {logToLoki} from '@/lib/lokiLogger'

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

export async function proxy(req: NextRequest) {
  const start = Date.now()

  const res = NextResponse.next()
  const duration_ms = Date.now() - start
  const route = req.nextUrl.pathname || 'unknown'
  const method = req.method || 'GET'

  void logToLoki(
    'info',
    'request_complete',
    {route, method, kind: 'request', runtime: 'edge'},
    {duration_ms},
  )

  return res
}
