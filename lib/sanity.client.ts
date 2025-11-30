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

  try {
    const result = params
      ? await sanityClient.fetch<TResult>(query, params)
      : await sanityClient.fetch<TResult>(query)
    const duration_ms = Date.now() - started
    await logToLoki(
      'info',
      'sanity_fetch_success',
      {query: queryName, kind: 'sanity'},
      {
        duration_ms,
        dataset,
        projectId,
        ...(context || {}),
      },
    )
    return result
  } catch (err) {
    const duration_ms = Date.now() - started
    await logToLoki(
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
    )
    throw err
  }
}
