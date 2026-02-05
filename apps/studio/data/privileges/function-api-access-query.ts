import { useMemo } from 'react'

import type { ConnectionVars } from 'data/common.types'
import { useIsSchemaExposed } from 'hooks/misc/useIsSchemaExposed'
import type { Prettify } from 'lib/type-helpers'
import type { UseCustomQueryOptions } from 'types'
import {
  useFunctionPrivilegesQuery,
  type FunctionPrivilegesData,
  type FunctionPrivilegesError,
} from './function-privileges-query'

// The contents of this array are never used, so any will allow
// it to be used anywhere an array of any type is required.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STABLE_EMPTY_ARRAY: any[] = []
const STABLE_EMPTY_OBJECT = {}

export const API_ACCESS_ROLES = ['anon', 'authenticated'] as const
export type ApiAccessRole = (typeof API_ACCESS_ROLES)[number]

export type FunctionApiPrivilegesByRole = Record<ApiAccessRole, boolean>

const getApiPrivilegesByRole = (
  privileges: FunctionPrivilegesData[number]['privileges']
): FunctionApiPrivilegesByRole => {
  const privilegesByRole: FunctionApiPrivilegesByRole = {
    anon: false,
    authenticated: false,
  }

  privileges.forEach((privilege) => {
    const { grantee, privilege_type } = privilege
    if (
      (grantee === 'anon' || grantee === 'authenticated') &&
      privilege_type === 'EXECUTE'
    ) {
      privilegesByRole[grantee] = true
    }
  })

  return privilegesByRole
}

const mapPrivilegesByFunctionId = (
  privileges: FunctionPrivilegesData | undefined,
  schemaName: string,
  functionIds: Set<number>
): Record<number, FunctionApiPrivilegesByRole> => {
  if (!privileges) return {}

  const result: Record<number, FunctionApiPrivilegesByRole> = {}

  privileges.forEach((entry) => {
    if (entry.schema !== schemaName) return
    if (!functionIds.has(entry.function_id)) return
    result[entry.function_id] = getApiPrivilegesByRole(entry.privileges)
  })

  return result
}

export type UseFunctionApiAccessQueryParams = Prettify<
  ConnectionVars & {
    schemaName: string
    functionIds: number[]
  }
>

export type DataApiAccessType = 'none' | 'exposed-schema-no-grants' | 'access'

export type FunctionApiAccessData =
  | {
      apiAccessType: 'access'
      privileges: FunctionApiPrivilegesByRole
    }
  | {
      apiAccessType: 'none' | 'exposed-schema-no-grants'
    }

export type FunctionApiAccessMap = Prettify<Record<number, FunctionApiAccessData>>

export type UseFunctionApiAccessQueryReturn =
  | {
      data: FunctionApiAccessMap
      status: 'success'
      isSuccess: true
      isPending: false
      isError: false
    }
  | {
      data: undefined
      status: 'pending'
      isSuccess: false
      isPending: true
      isError: false
    }
  | {
      data: undefined
      status: 'error'
      isSuccess: false
      isPending: false
      isError: true
    }

export const useFunctionApiAccessQuery = (
  {
    projectRef,
    connectionString,
    schemaName,
    functionIds = STABLE_EMPTY_ARRAY,
  }: UseFunctionApiAccessQueryParams,
  {
    enabled = true,
    ...options
  }: { enabled?: boolean } & Omit<
    UseCustomQueryOptions<FunctionPrivilegesData, FunctionPrivilegesError>,
    'enabled'
  > = {}
): UseFunctionApiAccessQueryReturn => {
  const uniqueFunctionIds = useMemo(() => {
    return new Set(
      functionIds.filter((id) => typeof id === 'number' && id > 0)
    )
  }, [functionIds])
  const hasFunctions = uniqueFunctionIds.size > 0

  const schemaExposureStatus = useIsSchemaExposed({ projectRef, schemaName }, { enabled })
  const isSchemaExposed = schemaExposureStatus.isSuccess && schemaExposureStatus.data === true

  const enablePrivilegesQuery = enabled && hasFunctions
  const privilegeStatus = useFunctionPrivilegesQuery(
    { projectRef, connectionString },
    { enabled: enablePrivilegesQuery, ...options }
  )

  const result: UseFunctionApiAccessQueryReturn = useMemo(() => {
    const isPending =
      !enabled ||
      schemaExposureStatus.status === 'pending' ||
      (enablePrivilegesQuery && privilegeStatus.isPending)
    if (isPending) {
      return {
        data: undefined,
        status: 'pending',
        isSuccess: false,
        isPending: true,
        isError: false,
      }
    }

    const isError =
      schemaExposureStatus.status === 'error' || (enablePrivilegesQuery && privilegeStatus.isError)
    if (isError) {
      return {
        data: undefined,
        status: 'error',
        isSuccess: false,
        isPending: false,
        isError: true,
      }
    }

    if (!hasFunctions) {
      return {
        data: STABLE_EMPTY_OBJECT,
        status: 'success',
        isSuccess: true,
        isPending: false,
        isError: false,
      }
    }

    const resultData: FunctionApiAccessMap = {}
    const functionPrivilegesById = isSchemaExposed
      ? mapPrivilegesByFunctionId(privilegeStatus.data, schemaName, uniqueFunctionIds)
      : {}

    uniqueFunctionIds.forEach((functionId) => {
      if (!isSchemaExposed) {
        resultData[functionId] = { apiAccessType: 'none' }
        return
      }

      const functionPrivileges = functionPrivilegesById[functionId] ?? {
        anon: false,
        authenticated: false,
      }
      const hasAnonOrAuthenticatedPrivileges =
        functionPrivileges.anon || functionPrivileges.authenticated

      resultData[functionId] = hasAnonOrAuthenticatedPrivileges
        ? {
            apiAccessType: 'access',
            privileges: functionPrivileges,
          }
        : { apiAccessType: 'exposed-schema-no-grants' }
    })

    return {
      data: resultData,
      status: 'success',
      isSuccess: true,
      isPending: false,
      isError: false,
    }
  }, [
    enabled,
    enablePrivilegesQuery,
    hasFunctions,
    schemaExposureStatus.status,
    isSchemaExposed,
    privilegeStatus.isPending,
    privilegeStatus.isError,
    privilegeStatus.data,
    schemaName,
    uniqueFunctionIds,
  ])

  return result
}
