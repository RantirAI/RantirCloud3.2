import { QueryClient, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { executeSql, ExecuteSqlError } from 'data/sql/execute-sql-query'
import { UseCustomQueryOptions } from 'types'
import { privilegeKeys } from './keys'

export type FunctionPrivilegesVariables = {
  projectRef?: string
  connectionString?: string | null
}

// SQL query to get function privileges
// This parses the proacl (access control list) column from pg_proc
const FUNCTION_PRIVILEGES_SQL = /* SQL */ `
with function_privileges as (
  select
    p.oid as function_id,
    n.nspname as schema,
    p.proname as name,
    pg_get_function_identity_arguments(p.oid) as identity_argument_types,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'grantor', grantor::regrole::text,
            'grantee', grantee::regrole::text,
            'privilege_type', privilege_type,
            'is_grantable', is_grantable
          )
        )
        from aclexplode(p.proacl) as acl(grantor, grantee, privilege_type, is_grantable)
      ),
      '[]'::jsonb
    ) as privileges
  from pg_proc p
  join pg_namespace n on p.pronamespace = n.oid
  where p.prokind = 'f'
    and n.nspname not in ('pg_catalog', 'information_schema')
)
select * from function_privileges
`

const pgFunctionPrivilegesZod = z.object({
  function_id: z.number(),
  schema: z.string(),
  name: z.string(),
  identity_argument_types: z.string(),
  privileges: z.array(
    z.object({
      grantor: z.string(),
      grantee: z.string(),
      privilege_type: z.literal('EXECUTE'),
      is_grantable: z.boolean(),
    })
  ),
})

const pgFunctionPrivilegesArrayZod = z.array(pgFunctionPrivilegesZod)

export type FunctionPrivilegesData = z.infer<typeof pgFunctionPrivilegesArrayZod>
export type FunctionPrivilegesError = ExecuteSqlError

async function getFunctionPrivileges(
  { projectRef, connectionString }: FunctionPrivilegesVariables,
  signal?: AbortSignal
) {
  const { result } = await executeSql(
    {
      projectRef,
      connectionString,
      sql: FUNCTION_PRIVILEGES_SQL,
      queryKey: ['function-privileges'],
    },
    signal
  )

  return result as FunctionPrivilegesData
}

export const useFunctionPrivilegesQuery = <TData = FunctionPrivilegesData>(
  { projectRef, connectionString }: FunctionPrivilegesVariables,
  {
    enabled = true,
    ...options
  }: UseCustomQueryOptions<FunctionPrivilegesData, FunctionPrivilegesError, TData> = {}
) =>
  useQuery<FunctionPrivilegesData, FunctionPrivilegesError, TData>({
    queryKey: privilegeKeys.functionPrivilegesList(projectRef),
    queryFn: ({ signal }) => getFunctionPrivileges({ projectRef, connectionString }, signal),
    enabled: enabled && typeof projectRef !== 'undefined',
    ...options,
  })

export function invalidateFunctionPrivilegesQuery(
  client: QueryClient,
  projectRef: string | undefined
) {
  return client.invalidateQueries({ queryKey: privilegeKeys.functionPrivilegesList(projectRef) })
}
