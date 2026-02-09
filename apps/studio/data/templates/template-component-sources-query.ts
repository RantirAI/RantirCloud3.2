import { useQuery } from '@tanstack/react-query'
import type { ResponseError, UseCustomQueryOptions } from 'types'

import { templateKeys } from './keys'

export interface TemplateComponentSource {
  path: string
  resolvedUrl: string
  content?: string
  error?: string
}

export type TemplateComponentSourcesVariables = {
  templateUrl?: string
  paths?: string[]
}

export async function getTemplateComponentSources(
  { templateUrl, paths = [] }: TemplateComponentSourcesVariables,
  signal?: AbortSignal
) {
  if (!templateUrl) throw new Error('templateUrl is required')

  const uniquePaths = [...new Set(paths.filter(Boolean))]
  if (uniquePaths.length === 0) return [] as TemplateComponentSource[]

  return Promise.all(
    uniquePaths.map(async (path): Promise<TemplateComponentSource> => {
      try {
        const resolvedUrl = new URL(path, templateUrl).toString()
        const response = await fetch(resolvedUrl, { signal })

        if (!response.ok) {
          return {
            path,
            resolvedUrl,
            error: `Failed to load component source (${response.status})`,
          }
        }

        const content = await response.text()
        return { path, resolvedUrl, content }
      } catch (error) {
        return {
          path,
          resolvedUrl: path,
          error: error instanceof Error ? error.message : 'Failed to load component source',
        }
      }
    })
  )
}

export type TemplateComponentSourcesData = Awaited<ReturnType<typeof getTemplateComponentSources>>
export type TemplateComponentSourcesError = ResponseError

export const useTemplateComponentSourcesQuery = <TData = TemplateComponentSourcesData>(
  { templateUrl, paths = [] }: TemplateComponentSourcesVariables,
  {
    enabled = true,
    ...options
  }: UseCustomQueryOptions<TemplateComponentSourcesData, TemplateComponentSourcesError, TData> = {}
) =>
  useQuery<TemplateComponentSourcesData, TemplateComponentSourcesError, TData>({
    queryKey: templateKeys.componentSources(templateUrl, paths),
    queryFn: ({ signal }) => getTemplateComponentSources({ templateUrl, paths }, signal),
    enabled:
      enabled && typeof templateUrl === 'string' && templateUrl.length > 0 && paths.length > 0,
    ...options,
  })
