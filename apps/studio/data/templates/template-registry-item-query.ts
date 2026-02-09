import { useQuery } from '@tanstack/react-query'
import type { ResponseError, UseCustomQueryOptions } from 'types'
import type { TemplateRegistryItem } from 'types/cookbook'

import { templateKeys } from './keys'

export type TemplateRegistryItemVariables = {
  templateUrl?: string
}

export async function getTemplateRegistryItem(
  { templateUrl }: TemplateRegistryItemVariables,
  signal?: AbortSignal
) {
  if (!templateUrl) throw new Error('templateUrl is required')

  const response = await fetch(templateUrl, { signal })

  if (!response.ok) {
    throw new Error(`Failed to load template JSON (${response.status})`)
  }

  const data: unknown = await response.json()

  if (!isTemplateRegistryItem(data)) {
    throw new Error('Template JSON is invalid')
  }

  return data
}

export type TemplateRegistryItemData = Awaited<ReturnType<typeof getTemplateRegistryItem>>
export type TemplateRegistryItemError = ResponseError

export const useTemplateRegistryItemQuery = <TData = TemplateRegistryItemData>(
  { templateUrl }: TemplateRegistryItemVariables,
  {
    enabled = true,
    ...options
  }: UseCustomQueryOptions<TemplateRegistryItemData, TemplateRegistryItemError, TData> = {}
) =>
  useQuery<TemplateRegistryItemData, TemplateRegistryItemError, TData>({
    queryKey: templateKeys.detailByUrl(templateUrl),
    queryFn: ({ signal }) => getTemplateRegistryItem({ templateUrl }, signal),
    enabled: enabled && typeof templateUrl === 'string' && templateUrl.length > 0,
    ...options,
  })

function isTemplateRegistryItem(value: unknown): value is TemplateRegistryItem {
  if (value === null || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.version === 'string' &&
    candidate.inputs !== null &&
    typeof candidate.inputs === 'object' &&
    Array.isArray(candidate.steps)
  )
}
