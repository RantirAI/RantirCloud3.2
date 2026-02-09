import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
// import { handleError, post } from 'data/fetchers'
import type { ResponseError, UseCustomMutationOptions } from 'types'

import { templateKeys } from './keys'

export type TemplateInstallVariables = {
  projectRef: string
  templateUrl: string
  payload?: Record<string, unknown>
}

export type TemplateInstallResponse = {
  projectRef: string
  templateUrl: string
  status: 'success'
  installedAt: string
}

export async function installTemplate({
  projectRef,
  templateUrl,
  payload,
}: TemplateInstallVariables) {
  if (!projectRef) throw new Error('projectRef is required')
  if (!templateUrl) throw new Error('templateUrl is required')

  // const { data, error } = await post('/platform/projects/{ref}/templates/install', {
  //   params: { path: { ref: projectRef } },
  //   body: { template_url: templateUrl, payload },
  // })
  // if (error) handleError(error)
  // return data as TemplateInstallResponse

  return {
    projectRef,
    templateUrl,
    status: 'success',
    installedAt: new Date().toISOString(),
  } satisfies TemplateInstallResponse
}

type TemplateInstallData = Awaited<ReturnType<typeof installTemplate>>

export const useTemplateInstallMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<
  UseCustomMutationOptions<TemplateInstallData, ResponseError, TemplateInstallVariables>,
  'mutationFn'
> = {}) => {
  const queryClient = useQueryClient()

  return useMutation<TemplateInstallData, ResponseError, TemplateInstallVariables>({
    mutationFn: (vars) => installTemplate(vars),
    async onSuccess(data, variables, context) {
      const { templateUrl } = variables
      await queryClient.invalidateQueries({ queryKey: templateKeys.detailByUrl(templateUrl) })
      await onSuccess?.(data, variables, context)
    },
    async onError(data, variables, context) {
      if (onError === undefined) {
        toast.error(`Failed to install template: ${data.message}`)
      } else {
        onError(data, variables, context)
      }
    },
    ...options,
  })
}
