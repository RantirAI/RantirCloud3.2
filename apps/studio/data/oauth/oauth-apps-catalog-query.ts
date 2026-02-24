import { useQuery } from '@tanstack/react-query'

import { components } from 'api-types'
import { get, handleError } from 'data/fetchers'
import type { ResponseError, UseCustomQueryOptions } from 'types'
import { oauthAppKeys } from './keys'

export type CatalogOAuthApp = components['schemas']['CatalogOAuthAppResponse']

export async function getOAuthAppsCatalog(signal?: AbortSignal) {
  const { data, error } = await get('/platform/oauth/apps/catalog', {
    signal,
  })

  if (error) handleError(error)
  return data
}

export type OAuthAppsCatalogData = Awaited<ReturnType<typeof getOAuthAppsCatalog>>
export type OAuthAppsCatalogError = ResponseError

export const useOAuthAppsCatalogQuery = <TData = OAuthAppsCatalogData>(
  {
    enabled = true,
    ...options
  }: UseCustomQueryOptions<OAuthAppsCatalogData, OAuthAppsCatalogError, TData> = {}
) =>
  useQuery<OAuthAppsCatalogData, OAuthAppsCatalogError, TData>({
    queryKey: oauthAppKeys.catalog(),
    queryFn: ({ signal }) => getOAuthAppsCatalog(signal),
    enabled,
    ...options,
  })
