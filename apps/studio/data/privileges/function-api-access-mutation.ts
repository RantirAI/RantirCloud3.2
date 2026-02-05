import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { executeSql } from 'data/sql/execute-sql-query'
import type { UseCustomMutationOptions } from 'types'
import type { ConnectionVars } from '../common.types'
import { invalidateFunctionPrivilegesQuery } from './function-privileges-query'
import { ident, literal } from '@supabase/pg-meta/pg-format'

export const API_ACCESS_ROLES = ['anon', 'authenticated'] as const
export type ApiAccessRole = (typeof API_ACCESS_ROLES)[number]

export type FunctionApiAccessPrivilegesVariables = ConnectionVars & {
  functionSchema: string
  functionName: string
  functionArgs: string
  enable: boolean
}

export async function updateFunctionApiAccessPrivileges({
  projectRef,
  connectionString,
  functionSchema,
  functionName,
  functionArgs,
  enable,
}: FunctionApiAccessPrivilegesVariables) {
  const sqlStatements: string[] = []

  const functionRef = `${ident(functionSchema)}.${ident(functionName)}(${functionArgs})`

  for (const role of API_ACCESS_ROLES) {
    if (enable) {
      sqlStatements.push(`GRANT EXECUTE ON FUNCTION ${functionRef} TO ${ident(role)};`)
    } else {
      sqlStatements.push(`REVOKE EXECUTE ON FUNCTION ${functionRef} FROM ${ident(role)};`)
    }
  }

  if (sqlStatements.length === 0) {
    return null
  }

  const { result } = await executeSql<[]>({
    projectRef,
    connectionString,
    sql: sqlStatements.join('\n'),
    queryKey: ['function-api-access', 'update-privileges'],
  })

  return result
}

type UpdateFunctionApiAccessPrivilegesData = Awaited<
  ReturnType<typeof updateFunctionApiAccessPrivileges>
>

export const useFunctionApiAccessPrivilegesMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<
  UseCustomMutationOptions<
    UpdateFunctionApiAccessPrivilegesData,
    Error,
    FunctionApiAccessPrivilegesVariables
  >,
  'mutationFn'
> = {}) => {
  const queryClient = useQueryClient()

  return useMutation<
    UpdateFunctionApiAccessPrivilegesData,
    Error,
    FunctionApiAccessPrivilegesVariables
  >({
    mutationFn: (vars) => updateFunctionApiAccessPrivileges(vars),
    async onSuccess(data, variables, context) {
      const { projectRef } = variables
      await invalidateFunctionPrivilegesQuery(queryClient, projectRef)
      await onSuccess?.(data, variables, context)
    },
    async onError(data, variables, context) {
      if (onError === undefined) {
        toast.error(`Failed to update API access privileges: ${data.message}`)
      } else {
        onError(data, variables, context)
      }
    },
    ...options,
  })
}
