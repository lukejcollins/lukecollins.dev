import {createClient} from '@sanity/client'
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
