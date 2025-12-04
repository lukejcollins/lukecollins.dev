import {context as otContext, trace, SpanStatusCode} from '@opentelemetry/api'
import {createClient, type QueryParams} from '@sanity/client'
import {logToLoki} from './lokiLogger'
import {apiVersion, dataset, projectId} from '../sanity/env'

if (!projectId || !dataset) {
  throw new Error(
    'Missing Sanity projectId or dataset. ' +
      'Check sanity/env.ts and your environment variables.',
  )
}

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
})

type FetchArgs<TParams extends QueryParams | undefined> = {
  query: string
  params?: TParams
  queryName: string
  context?: Record<string, unknown>
}

export async function fetchFromSanity<
  TResult,
  TParams extends QueryParams | undefined = QueryParams | undefined
>({query, params, queryName, context}: FetchArgs<TParams>) {
  const started = Date.now()
  const tracer = trace.getTracer('next-blog')
  const span = tracer.startSpan(`sanity.${queryName}`, {
    attributes: {
      'db.system': 'sanity',
      'db.operation': queryName,
      'db.name': dataset,
      ...(context || {}),
    },
  })
  const spanCtx = trace.setSpan(otContext.active(), span)

  try {
    const result = await otContext.with(spanCtx, () =>
      params
        ? sanityClient.fetch<TResult>(query, params)
        : sanityClient.fetch<TResult>(query),
    )
    const duration_ms = Date.now() - started
    span.setStatus({code: SpanStatusCode.OK})
    span.setAttributes({'db.response.time_ms': duration_ms})
    await otContext.with(spanCtx, () =>
      logToLoki(
        'info',
        'sanity_fetch_success',
        {query: queryName, kind: 'sanity'},
        {
          duration_ms,
          dataset,
          projectId,
          ...(context || {}),
        },
      ),
    )
    return result
  } catch (err) {
    const duration_ms = Date.now() - started
    span.recordException(err as Error)
    span.setStatus({code: SpanStatusCode.ERROR})
    span.setAttributes({'db.response.time_ms': duration_ms})
    await otContext.with(spanCtx, () =>
      logToLoki(
        'error',
        'sanity_fetch_failed',
        {query: queryName, kind: 'sanity'},
        {
          duration_ms,
          dataset,
          projectId,
          ...(context || {}),
          ...(err instanceof Error ? {message: err.message, stack: err.stack} : {error: String(err)}),
        },
      ),
    )
    throw err
  } finally {
    span.end()
  }
}
