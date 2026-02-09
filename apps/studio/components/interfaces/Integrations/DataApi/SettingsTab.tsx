import { zodResolver } from '@hookform/resolvers/zod'
import { PermissionAction } from '@supabase/shared-types/out/constants'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'common'
import { FormActions } from 'components/ui/Forms/FormActions'
import {
  parseDbSchemaString,
  useProjectPostgrestConfigQuery,
} from 'data/config/project-postgrest-config-query'
import { useProjectPostgrestConfigUpdateMutation } from 'data/config/project-postgrest-config-update-mutation'
import { useSchemasQuery } from 'data/database/schemas-query'
import { useExecuteSqlMutation } from 'data/sql/execute-sql-mutation'
import { executeSql } from 'data/sql/execute-sql-query'
import { useAsyncCheckPermissions } from 'hooks/misc/useCheckPermissions'
import { useSelectedProjectQuery } from 'hooks/misc/useSelectedProject'
import { PROJECT_STATUS } from 'lib/constants'
import { AlertCircle } from 'lucide-react'
import minify from 'pg-minify'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  Alert_Shadcn_,
  AlertTitle_Shadcn_,
  Card,
  CardContent,
  CardFooter,
  Form_Shadcn_,
  FormControl_Shadcn_,
  FormField_Shadcn_,
  FormItem_Shadcn_,
  Input_Shadcn_,
  PrePostTab,
  RadioGroupStacked,
  RadioGroupStackedItem,
  Skeleton,
} from 'ui'
import { Admonition } from 'ui-patterns/admonition'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'
import {
  MultiSelector,
  MultiSelectorContent,
  MultiSelectorItem,
  MultiSelectorList,
  MultiSelectorTrigger,
} from 'ui-patterns/multi-select'
import {
  PageSection,
  PageSectionContent,
  PageSectionDescription,
  PageSectionMeta,
  PageSectionSummary,
  PageSectionTitle,
} from 'ui-patterns/PageSection'
import { z } from 'zod'

const HIDDEN_SCHEMAS = new Set([
  'auth',
  'extensions',
  'hooks',
  'information_schema',
  'pg_catalog',
  'pgbouncer',
  'pgsodium',
  'pgsodium_masks',
  'realtime',
  'storage',
  'vault',
])

const DATA_API_ACCESS_STATE_SQL = minify(/* SQL */ `
with schema_defaults as (
  select
    n.nspname as schema_name,
    bool_or(d.defaclobjtype = 'r' and pg_catalog.pg_get_userbyid(acl.grantee) = 'anon') as tables_anon,
    bool_or(d.defaclobjtype = 'r' and pg_catalog.pg_get_userbyid(acl.grantee) = 'authenticated') as tables_authenticated,
    bool_or(d.defaclobjtype = 'r' and pg_catalog.pg_get_userbyid(acl.grantee) = 'service_role') as tables_service_role,
    bool_or(d.defaclobjtype = 'S' and pg_catalog.pg_get_userbyid(acl.grantee) = 'anon') as sequences_anon,
    bool_or(d.defaclobjtype = 'S' and pg_catalog.pg_get_userbyid(acl.grantee) = 'authenticated') as sequences_authenticated,
    bool_or(d.defaclobjtype = 'S' and pg_catalog.pg_get_userbyid(acl.grantee) = 'service_role') as sequences_service_role,
    bool_or(d.defaclobjtype = 'f' and pg_catalog.pg_get_userbyid(acl.grantee) = 'anon') as functions_anon,
    bool_or(d.defaclobjtype = 'f' and pg_catalog.pg_get_userbyid(acl.grantee) = 'authenticated') as functions_authenticated,
    bool_or(d.defaclobjtype = 'f' and pg_catalog.pg_get_userbyid(acl.grantee) = 'service_role') as functions_service_role
  from pg_default_acl d
  join pg_namespace n
    on n.oid = d.defaclnamespace
  join lateral aclexplode(coalesce(d.defaclacl, acldefault(d.defaclobjtype, d.defaclrole))) as acl
    on true
  where pg_catalog.pg_get_userbyid(d.defaclrole) in ('postgres', 'supabase_admin')
  group by n.nspname
),
table_grants as (
  select
    c.oid::text as id,
    n.nspname as schema_name,
    c.relname as name,
    coalesce(
      bool_or(
        pg_catalog.pg_get_userbyid(acl.grantee) in ('anon', 'authenticated', 'service_role')
        and acl.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
      ),
      false
    ) as has_grant
  from pg_class c
  join pg_namespace n
    on n.oid = c.relnamespace
  left join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) as acl
    on true
  where c.relkind in ('r', 'p', 'v', 'm', 'f')
  group by c.oid, n.nspname, c.relname
),
function_grants as (
  select
    p.oid::text as id,
    n.nspname as schema_name,
    p.proname as name,
    pg_get_function_identity_arguments(p.oid) as identity_arguments,
    coalesce(
      bool_or(
        pg_catalog.pg_get_userbyid(acl.grantee) in ('anon', 'authenticated', 'service_role')
        and acl.privilege_type = 'EXECUTE'
      ),
      false
    ) as has_grant
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  left join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as acl
    on true
  group by p.oid, n.nspname, p.proname
)
select jsonb_build_object(
  'schema_defaults',
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'schema_name', schema_name,
          'has_schema_defaults',
          coalesce(tables_anon, false)
          and coalesce(tables_authenticated, false)
          and coalesce(tables_service_role, false)
          and coalesce(sequences_anon, false)
          and coalesce(sequences_authenticated, false)
          and coalesce(sequences_service_role, false)
          and coalesce(functions_anon, false)
          and coalesce(functions_authenticated, false)
          and coalesce(functions_service_role, false)
        )
      )
      from schema_defaults
    ),
    '[]'::jsonb
  ),
  'table_grants',
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', id,
          'schema', schema_name,
          'name', name,
          'has_grant', has_grant
        )
      )
      from table_grants
    ),
    '[]'::jsonb
  ),
  'function_grants',
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', id,
          'schema', schema_name,
          'name', name,
          'identity_arguments', identity_arguments,
          'has_grant', has_grant
        )
      )
      from function_grants
    ),
    '[]'::jsonb
  )
) as data;
`)

type ApiAccessState = {
  schema_defaults: Array<{
    schema_name: string
    has_schema_defaults: boolean
  }>
  table_grants: Array<{
    id: string
    schema: string
    name: string
    has_grant: boolean
  }>
  function_grants: Array<{
    id: string
    schema: string
    name: string
    identity_arguments: string | null
    has_grant: boolean
  }>
}

const EMPTY_ACCESS_STATE: ApiAccessState = {
  schema_defaults: [],
  table_grants: [],
  function_grants: [],
}

const formSchema = z.object({
  generateApiFor: z.enum(['schemas', 'specific']),
  selectedSchemas: z.array(z.string()),
  selectedTableIds: z.array(z.string()),
  selectedFunctionIds: z.array(z.string()),
  dbExtraSearchPath: z.array(z.string()),
  maxRows: z.number().max(1_000_000, "Can't be more than 1,000,000"),
  dbPool: z
    .number()
    .min(0, 'Must be more than 0')
    .max(1000, "Can't be more than 1000")
    .optional()
    .nullable(),
})

type FormValues = z.infer<typeof formSchema>
type WhatToExposeFormValues = Pick<
  FormValues,
  'generateApiFor' | 'selectedSchemas' | 'selectedTableIds' | 'selectedFunctionIds'
>
type HowToExposeFormValues = Pick<FormValues, 'dbExtraSearchPath' | 'maxRows' | 'dbPool'>

const whatToExposeFormSchema = formSchema.pick({
  generateApiFor: true,
  selectedSchemas: true,
  selectedTableIds: true,
  selectedFunctionIds: true,
})

const howToExposeFormSchema = formSchema.pick({
  dbExtraSearchPath: true,
  maxRows: true,
  dbPool: true,
})

type TableOption = {
  id: string
  schema: string
  name: string
  label: string
}

type FunctionOption = {
  id: string
  schema: string
  name: string
  identityArguments: string
  label: string
}

const quoteIdent = (value: string) => `"${value.replace(/"/g, '""')}"`

const uniqueSorted = (values: string[]) => {
  return Array.from(new Set(values.filter((x) => x.length > 0))).sort((a, b) => a.localeCompare(b))
}

const buildSchemaDefaultPrivilegesSql = (schema: string, action: 'grant' | 'revoke') => {
  const schemaIdentifier = quoteIdent(schema)
  const tableStatement =
    action === 'grant'
      ? 'grant all on tables to anon, authenticated, service_role'
      : 'revoke all on tables from anon, authenticated, service_role'
  const sequenceStatement =
    action === 'grant'
      ? 'grant all on sequences to anon, authenticated, service_role'
      : 'revoke all on sequences from anon, authenticated, service_role'
  const functionStatement =
    action === 'grant'
      ? 'grant all on functions to anon, authenticated, service_role'
      : 'revoke all on functions from anon, authenticated, service_role'

  return minify(/* SQL */ `
    do $$
    begin
      if to_regrole('postgres') is not null then
        execute format(
          'alter default privileges for role postgres in schema %s ${functionStatement}',
          '${schemaIdentifier}'
        );
        execute format(
          'alter default privileges for role postgres in schema %s ${sequenceStatement}',
          '${schemaIdentifier}'
        );
        execute format(
          'alter default privileges for role postgres in schema %s ${tableStatement}',
          '${schemaIdentifier}'
        );
        alter default privileges for role postgres revoke all on functions from public;
      end if;

      if to_regrole('supabase_admin') is not null then
        execute format(
          'alter default privileges for role supabase_admin in schema %s ${functionStatement}',
          '${schemaIdentifier}'
        );
        execute format(
          'alter default privileges for role supabase_admin in schema %s ${sequenceStatement}',
          '${schemaIdentifier}'
        );
        execute format(
          'alter default privileges for role supabase_admin in schema %s ${tableStatement}',
          '${schemaIdentifier}'
        );
      end if;
    end $$;
  `)
}

const buildTablePrivilegesSql = (
  table: { schema: string; name: string },
  action: 'grant' | 'revoke'
) => {
  const relation = `${quoteIdent(table.schema)}.${quoteIdent(table.name)}`

  if (action === 'grant') {
    return `grant select, insert, update, delete on table ${relation} to anon, authenticated, service_role;`
  }

  return `revoke all on table ${relation} from anon, authenticated, service_role;`
}

const buildFunctionPrivilegesSql = (functionIds: number[], action: 'grant' | 'revoke') => {
  if (functionIds.length === 0) return ''

  const statement =
    action === 'grant'
      ? 'grant execute on function %s to anon, authenticated, service_role'
      : 'revoke all on function %s from anon, authenticated, service_role, public'

  return minify(/* SQL */ `
    do $$
    declare
      function_oid oid;
    begin
      foreach function_oid in array array[${functionIds.join(',')}]::oid[] loop
        execute format('${statement}', function_oid::regprocedure);
      end loop;
    end $$;
  `)
}

const inferSelectableSchemas = (
  values: Pick<
    FormValues,
    'generateApiFor' | 'selectedSchemas' | 'selectedTableIds' | 'selectedFunctionIds'
  >,
  tableById: Map<string, TableOption>,
  functionById: Map<string, FunctionOption>
) => {
  if (values.generateApiFor === 'schemas') {
    return uniqueSorted(values.selectedSchemas)
  }

  const schemas = new Set<string>()

  values.selectedTableIds.forEach((id) => {
    const table = tableById.get(id)
    if (table) schemas.add(table.schema)
  })

  values.selectedFunctionIds.forEach((id) => {
    const fn = functionById.get(id)
    if (fn) schemas.add(fn.schema)
  })

  return uniqueSorted(Array.from(schemas))
}

const normalizeAccessState = (value: unknown): ApiAccessState => {
  if (!value) return EMPTY_ACCESS_STATE

  const payload = typeof value === 'string' ? JSON.parse(value) : value
  if (!payload || typeof payload !== 'object') return EMPTY_ACCESS_STATE

  const shape = payload as ApiAccessState
  return {
    schema_defaults: Array.isArray(shape.schema_defaults) ? shape.schema_defaults : [],
    table_grants: Array.isArray(shape.table_grants) ? shape.table_grants : [],
    function_grants: Array.isArray(shape.function_grants) ? shape.function_grants : [],
  }
}

type DataApiSettingsSectionsProps = {
  embedded?: boolean
}

export const DataApiSettingsSections = ({ embedded = false }: DataApiSettingsSectionsProps) => {
  const { ref: projectRef } = useParams()
  const { data: project, isPending: isProjectLoading } = useSelectedProjectQuery()

  const { can: canUpdatePostgrestConfig, isSuccess: isPermissionsLoaded } =
    useAsyncCheckPermissions(PermissionAction.UPDATE, 'custom_config_postgrest')

  const {
    data: config,
    isError: isConfigError,
    isPending: isConfigLoading,
  } = useProjectPostgrestConfigQuery({ projectRef })

  const {
    data: allSchemas = [],
    isError: isSchemasError,
    isPending: isSchemasLoading,
  } = useSchemasQuery({
    projectRef: project?.ref,
    connectionString: project?.connectionString,
  })

  const {
    data: accessState = EMPTY_ACCESS_STATE,
    isError: isAccessStateError,
    isPending: isAccessStateLoading,
    refetch: refetchAccessState,
  } = useQuery({
    queryKey: ['projects', project?.ref, 'data-api-settings', 'access-state'],
    queryFn: async () => {
      const { result } = await executeSql<{ data: unknown }[]>({
        projectRef: project?.ref,
        connectionString: project?.connectionString,
        sql: DATA_API_ACCESS_STATE_SQL,
        queryKey: ['data-api-settings', 'access-state'],
      })
      return normalizeAccessState(result?.[0]?.data)
    },
    enabled: !!project?.ref,
  })

  const { mutateAsync: executeSqlMutation, isPending: isExecutingSql } = useExecuteSqlMutation()
  const { mutateAsync: updatePostgrestConfig, isPending: isUpdatingConfig } =
    useProjectPostgrestConfigUpdateMutation()

  const whatToExposeFormId = 'data-api-settings-what-to-expose-form'
  const howToExposeFormId = 'data-api-settings-how-to-expose-form'

  const whatToExposeForm = useForm<WhatToExposeFormValues>({
    resolver: zodResolver(whatToExposeFormSchema),
    mode: 'onChange',
    defaultValues: {
      generateApiFor: 'schemas',
      selectedSchemas: [],
      selectedTableIds: [],
      selectedFunctionIds: [],
    },
  })

  const howToExposeForm = useForm<HowToExposeFormValues>({
    resolver: zodResolver(howToExposeFormSchema),
    mode: 'onChange',
    defaultValues: {
      dbExtraSearchPath: [],
      maxRows: 1000,
      dbPool: null,
    },
  })

  const schemaOptions = useMemo(() => {
    return allSchemas
      .filter((schema) => !HIDDEN_SCHEMAS.has(schema.name))
      .map((schema) => ({
        id: schema.id,
        value: schema.name,
        label: schema.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [allSchemas])

  const selectableSchemaSet = useMemo(() => {
    return new Set(schemaOptions.map((schema) => schema.value))
  }, [schemaOptions])

  const tableOptions = useMemo(() => {
    return accessState.table_grants
      .filter((table) => selectableSchemaSet.has(table.schema))
      .map((table) => ({
        id: table.id,
        schema: table.schema,
        name: table.name,
        label: `${table.schema}.${table.name}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [accessState.table_grants, selectableSchemaSet])

  const functionOptions = useMemo(() => {
    return accessState.function_grants
      .filter((fn) => selectableSchemaSet.has(fn.schema))
      .map((fn) => ({
        id: fn.id,
        schema: fn.schema,
        name: fn.name,
        identityArguments: fn.identity_arguments ?? '',
        label: `${fn.schema}.${fn.name}(${fn.identity_arguments ?? ''})`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [accessState.function_grants, selectableSchemaSet])

  const tableById = useMemo(() => {
    return new Map(tableOptions.map((table) => [table.id, table]))
  }, [tableOptions])

  const tableByLabel = useMemo(() => {
    return new Map(tableOptions.map((table) => [table.label, table]))
  }, [tableOptions])

  const functionById = useMemo(() => {
    return new Map(functionOptions.map((fn) => [fn.id, fn]))
  }, [functionOptions])

  const functionByLabel = useMemo(() => {
    return new Map(functionOptions.map((fn) => [fn.label, fn]))
  }, [functionOptions])

  const currentExposedSchemas = useMemo(() => {
    return parseDbSchemaString(config?.db_schema ?? '')
  }, [config?.db_schema])

  const currentSelectableExposedSchemas = useMemo(() => {
    return currentExposedSchemas.filter((schema) => selectableSchemaSet.has(schema))
  }, [currentExposedSchemas, selectableSchemaSet])

  const preservedSchemas = useMemo(() => {
    return currentExposedSchemas.filter((schema) => !selectableSchemaSet.has(schema))
  }, [currentExposedSchemas, selectableSchemaSet])

  const isLoading = isProjectLoading || isConfigLoading || isSchemasLoading || isAccessStateLoading
  const isError = isConfigError || isSchemasError || isAccessStateError

  const initialWhatToExposeValues = useMemo<WhatToExposeFormValues | undefined>(() => {
    if (!config) return undefined
    if (isLoading || isError) return undefined

    const schemasWithDefaultPrivileges = new Set(
      accessState.schema_defaults
        .filter((entry) => entry.has_schema_defaults)
        .map((entry) => entry.schema_name)
    )

    const tableIdsWithGrants = new Set(
      accessState.table_grants.filter((entry) => entry.has_grant).map((entry) => entry.id)
    )

    const functionIdsWithGrants = new Set(
      accessState.function_grants.filter((entry) => entry.has_grant).map((entry) => entry.id)
    )

    const selectedTableIds = tableOptions
      .filter((table) => currentSelectableExposedSchemas.includes(table.schema))
      .filter((table) => tableIdsWithGrants.has(table.id))
      .map((table) => table.id)

    const selectedFunctionIds = functionOptions
      .filter((fn) => currentSelectableExposedSchemas.includes(fn.schema))
      .filter((fn) => functionIdsWithGrants.has(fn.id))
      .map((fn) => fn.id)

    const canUseSchemaMode =
      currentSelectableExposedSchemas.length > 0 &&
      currentSelectableExposedSchemas.every((schema) => schemasWithDefaultPrivileges.has(schema))

    const hasObjectSelections = selectedTableIds.length > 0 || selectedFunctionIds.length > 0

    return {
      generateApiFor: canUseSchemaMode ? 'schemas' : hasObjectSelections ? 'specific' : 'schemas',
      selectedSchemas: canUseSchemaMode ? currentSelectableExposedSchemas : [],
      selectedTableIds,
      selectedFunctionIds,
    }
  }, [
    config,
    currentSelectableExposedSchemas,
    accessState.schema_defaults,
    accessState.table_grants,
    accessState.function_grants,
    functionOptions,
    isError,
    isLoading,
    tableOptions,
  ])

  const initialHowToExposeValues = useMemo<HowToExposeFormValues | undefined>(() => {
    if (!config) return undefined
    if (isLoading || isError) return undefined

    return {
      dbExtraSearchPath: (config.db_extra_search_path ?? '')
        .split(',')
        .map((schema) => schema.trim())
        .filter((schema) => schema.length > 0 && allSchemas.some((x) => x.name === schema)),
      maxRows: config.max_rows,
      dbPool: config.db_pool,
    }
  }, [allSchemas, config, isError, isLoading])

  useEffect(() => {
    if (!initialWhatToExposeValues) return
    if (whatToExposeForm.formState.isDirty) return
    whatToExposeForm.reset(initialWhatToExposeValues)
  }, [initialWhatToExposeValues, whatToExposeForm, whatToExposeForm.formState.isDirty])

  useEffect(() => {
    if (!initialHowToExposeValues) return
    if (howToExposeForm.formState.isDirty) return
    howToExposeForm.reset(initialHowToExposeValues)
  }, [howToExposeForm, howToExposeForm.formState.isDirty, initialHowToExposeValues])

  const watchedGenerateApiFor = whatToExposeForm.watch('generateApiFor')
  const watchedSchemas = whatToExposeForm.watch('selectedSchemas')
  const watchedTableIds = whatToExposeForm.watch('selectedTableIds')
  const watchedFunctionIds = whatToExposeForm.watch('selectedFunctionIds')

  const inferredSelectableSchemas = useMemo(() => {
    return inferSelectableSchemas(
      {
        generateApiFor: watchedGenerateApiFor,
        selectedSchemas: watchedSchemas,
        selectedTableIds: watchedTableIds,
        selectedFunctionIds: watchedFunctionIds,
      },
      tableById,
      functionById
    )
  }, [
    functionById,
    tableById,
    watchedFunctionIds,
    watchedGenerateApiFor,
    watchedSchemas,
    watchedTableIds,
  ])

  const inferredDbSchemas = useMemo(() => {
    return uniqueSorted([...preservedSchemas, ...inferredSelectableSchemas])
  }, [inferredSelectableSchemas, preservedSchemas])

  const resetWhatToExposeForm = () => {
    if (!initialWhatToExposeValues) return
    whatToExposeForm.reset(initialWhatToExposeValues)
  }

  const resetHowToExposeForm = () => {
    if (!initialHowToExposeValues) return
    howToExposeForm.reset(initialHowToExposeValues)
  }

  const onSubmitWhatToExpose = async (values: WhatToExposeFormValues) => {
    if (!projectRef || !project || !config) return

    const nextSelectableSchemas = inferSelectableSchemas(values, tableById, functionById)
    const nextDbSchemas = uniqueSorted([...preservedSchemas, ...nextSelectableSchemas])

    const managedSchemas = new Set(
      uniqueSorted([...currentSelectableExposedSchemas, ...nextSelectableSchemas])
    )

    const currentSchemaDefaults = new Set(
      accessState.schema_defaults
        .filter((entry) => entry.has_schema_defaults)
        .map((entry) => entry.schema_name)
        .filter((schema) => managedSchemas.has(schema))
    )

    const desiredSchemaDefaults =
      values.generateApiFor === 'schemas' ? new Set(nextSelectableSchemas) : new Set<string>()

    const schemaDefaultsToGrant = Array.from(desiredSchemaDefaults).filter(
      (schema) => !currentSchemaDefaults.has(schema)
    )

    const schemaDefaultsToRevoke = Array.from(currentSchemaDefaults).filter(
      (schema) => !desiredSchemaDefaults.has(schema)
    )

    const sqlStatements: string[] = []

    schemaDefaultsToGrant.forEach((schema) => {
      sqlStatements.push(buildSchemaDefaultPrivilegesSql(schema, 'grant'))
    })

    schemaDefaultsToRevoke.forEach((schema) => {
      sqlStatements.push(buildSchemaDefaultPrivilegesSql(schema, 'revoke'))
    })

    if (values.generateApiFor === 'specific') {
      const currentTableGrants = new Set(
        accessState.table_grants
          .filter((entry) => entry.has_grant && managedSchemas.has(entry.schema))
          .map((entry) => entry.id)
      )
      const desiredTableGrants = new Set(values.selectedTableIds)

      const tablesToGrant = Array.from(desiredTableGrants).filter(
        (id) => !currentTableGrants.has(id)
      )
      const tablesToRevoke = Array.from(currentTableGrants).filter(
        (id) => !desiredTableGrants.has(id)
      )

      tablesToGrant.forEach((tableId) => {
        const table = tableById.get(tableId)
        if (!table) return
        sqlStatements.push(buildTablePrivilegesSql(table, 'grant'))
      })

      tablesToRevoke.forEach((tableId) => {
        const table = tableById.get(tableId)
        if (!table) return
        sqlStatements.push(buildTablePrivilegesSql(table, 'revoke'))
      })

      const currentFunctionGrants = new Set(
        accessState.function_grants
          .filter((entry) => entry.has_grant && managedSchemas.has(entry.schema))
          .map((entry) => entry.id)
      )
      const desiredFunctionGrants = new Set(values.selectedFunctionIds)

      const functionIdsToGrant = Array.from(desiredFunctionGrants)
        .filter((id) => !currentFunctionGrants.has(id))
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)

      const functionIdsToRevoke = Array.from(currentFunctionGrants)
        .filter((id) => !desiredFunctionGrants.has(id))
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)

      const grantFunctionsSql = buildFunctionPrivilegesSql(functionIdsToGrant, 'grant')
      if (grantFunctionsSql.length > 0) {
        sqlStatements.push(grantFunctionsSql)
      }

      const revokeFunctionsSql = buildFunctionPrivilegesSql(functionIdsToRevoke, 'revoke')
      if (revokeFunctionsSql.length > 0) {
        sqlStatements.push(revokeFunctionsSql)
      }
    }

    try {
      if (sqlStatements.length > 0) {
        await executeSqlMutation({
          projectRef,
          connectionString: project.connectionString,
          sql: sqlStatements.join('\n\n'),
          queryKey: ['data-api-settings', 'apply'],
          contextualInvalidation: true,
        })
      }

      await updatePostgrestConfig({
        projectRef,
        dbSchema: nextDbSchemas.join(', '),
        maxRows: config.max_rows,
        dbExtraSearchPath: config.db_extra_search_path ?? '',
        dbPool: config.db_pool ?? null,
      })

      whatToExposeForm.reset({
        ...values,
        selectedSchemas: uniqueSorted(values.selectedSchemas),
        selectedTableIds: uniqueSorted(values.selectedTableIds),
        selectedFunctionIds: uniqueSorted(values.selectedFunctionIds),
      })

      await refetchAccessState()
      toast.success('Successfully saved settings')
    } catch {
      // Errors are surfaced by mutation hooks
    }
  }

  const onSubmitHowToExpose = async (values: HowToExposeFormValues) => {
    if (!projectRef || !config) return

    try {
      await updatePostgrestConfig({
        projectRef,
        dbSchema: config.db_schema,
        maxRows: values.maxRows,
        dbExtraSearchPath: values.dbExtraSearchPath.join(','),
        dbPool: values.dbPool === undefined || values.dbPool === null ? null : values.dbPool,
      })

      howToExposeForm.reset({
        ...values,
        dbExtraSearchPath: uniqueSorted(values.dbExtraSearchPath),
      })

      toast.success('Successfully saved settings')
    } catch {
      // Errors are surfaced by mutation hooks
    }
  }

  if (!embedded && !isProjectLoading && project?.status !== PROJECT_STATUS.ACTIVE_HEALTHY) {
    return (
      <div className="px-10 py-10 max-w-4xl">
        <Alert_Shadcn_ variant="destructive">
          <AlertCircle size={16} />
          <AlertTitle_Shadcn_>
            API settings are unavailable as the project is not active
          </AlertTitle_Shadcn_>
        </Alert_Shadcn_>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={embedded ? 'space-y-8' : 'px-10 py-10 max-w-4xl space-y-8'}>
        <PageSection className="first:pt-0">
          <PageSectionMeta>
            <PageSectionSummary>
              <PageSectionTitle>What to expose</PageSectionTitle>
              <PageSectionDescription>
                Select whether the Data API should generate endpoints from schemas or specific
                tables and functions.
              </PageSectionDescription>
            </PageSectionSummary>
          </PageSectionMeta>
          <PageSectionContent>
            <Card>
              <CardContent className="space-y-4 p-6">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </PageSectionContent>
        </PageSection>

        <PageSection>
          <PageSectionMeta>
            <PageSectionSummary>
              <PageSectionTitle>How to expose</PageSectionTitle>
              <PageSectionDescription>
                Configure request behavior for generated Data API endpoints.
              </PageSectionDescription>
            </PageSectionSummary>
          </PageSectionMeta>
          <PageSectionContent>
            <Card>
              <CardContent className="space-y-4 p-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </PageSectionContent>
        </PageSection>
      </div>
    )
  }

  if (isError || !config) {
    return (
      <div className={embedded ? '' : 'px-10 py-10 max-w-4xl'}>
        <Alert_Shadcn_ variant="destructive">
          <AlertCircle size={16} />
          <AlertTitle_Shadcn_>Failed to retrieve API settings</AlertTitle_Shadcn_>
        </Alert_Shadcn_>
      </div>
    )
  }

  return (
    <div className={embedded ? '' : 'px-10 py-10 max-w-4xl'}>
      <PageSection className="first:pt-0">
        <PageSectionMeta>
          <PageSectionSummary>
            <PageSectionTitle>What to expose</PageSectionTitle>
            <PageSectionDescription>
              Choose how API endpoints should be generated. 
            </PageSectionDescription>
          </PageSectionSummary>
        </PageSectionMeta>
        <PageSectionContent>
          <Form_Shadcn_ {...whatToExposeForm}>
            <form
              id={whatToExposeFormId}
              onSubmit={whatToExposeForm.handleSubmit(onSubmitWhatToExpose)}
            >
              <Card>
                <CardContent className="space-y-6 p-6">
                  <FormField_Shadcn_
                    control={whatToExposeForm.control}
                    name="generateApiFor"
                    render={({ field }) => (
                      <FormItem_Shadcn_>
                        <FormItemLayout
                          layout="flex-row-reverse"
                          label="Generate API for"
                          description="Choose whether to expose complete schemas or specific tables and functions."
                        >
                          <FormControl_Shadcn_>
                            <RadioGroupStacked
                              id="data-api-generate-for"
                              name="data-api-generate-for"
                              value={field.value}
                              disabled={!canUpdatePostgrestConfig}
                              onValueChange={(value) =>
                                field.onChange(value as 'schemas' | 'specific')
                              }
                            >
                              <RadioGroupStackedItem
                                id="schemas"
                                value="schemas"
                                label=""
                                showIndicator={false}
                                className="text-left justify-start items-start"
                              >
                                <div className="flex flex-col">
                                  <p className="text-foreground">Schemas</p>
                                  <p className="text-foreground-light text-sm">
                                    Expose all tables and functions in selected schemas.
                                  </p>
                                </div>
                              </RadioGroupStackedItem>
                              <RadioGroupStackedItem
                                id="specific"
                                value="specific"
                                label=""
                                showIndicator={false}
                                className="text-left justify-start items-start"
                              >
                                <div className="flex flex-col">
                                  <p className="text-foreground">Specific tables and functions</p>
                                  <p className="text-foreground-light text-sm">
                                    Expose only selected tables and functions.
                                  </p>
                                </div>
                              </RadioGroupStackedItem>
                            </RadioGroupStacked>
                          </FormControl_Shadcn_>
                        </FormItemLayout>
                      </FormItem_Shadcn_>
                    )}
                  />

                  {watchedGenerateApiFor === 'schemas' ? (
                    <FormField_Shadcn_
                      control={whatToExposeForm.control}
                      name="selectedSchemas"
                      render={({ field }) => (
                        <FormItem_Shadcn_>
                          <FormItemLayout
                            layout="flex-row-reverse"
                            label="Schemas"
                            description="Select schemas to fully expose through the Data API."
                          >
                            {schemaOptions.length === 0 ? (
                              <p className="text-sm text-foreground-light">No schemas available.</p>
                            ) : (
                              <MultiSelector
                                onValuesChange={field.onChange}
                                values={field.value}
                                size="small"
                                disabled={!canUpdatePostgrestConfig}
                              >
                                <MultiSelectorTrigger
                                  mode="inline-combobox"
                                  label="Select schemas..."
                                  badgeLimit="wrap"
                                  showIcon={false}
                                  deletableBadge
                                />
                                <MultiSelectorContent>
                                  <MultiSelectorList>
                                    {schemaOptions.map((schema) => (
                                      <MultiSelectorItem key={schema.id} value={schema.value}>
                                        {schema.label}
                                      </MultiSelectorItem>
                                    ))}
                                  </MultiSelectorList>
                                </MultiSelectorContent>
                              </MultiSelector>
                            )}
                          </FormItemLayout>
                        </FormItem_Shadcn_>
                      )}
                    />
                  ) : (
                    <>
                      <FormField_Shadcn_
                        control={whatToExposeForm.control}
                        name="selectedTableIds"
                        render={({ field }) => (
                          <FormItem_Shadcn_>
                            <FormItemLayout
                              layout="flex-row-reverse"
                              label="Tables"
                              description="Grant Data API access to selected tables."
                            >
                              {tableOptions.length === 0 ? (
                                <p className="text-sm text-foreground-light">
                                  No tables available.
                                </p>
                              ) : (
                                <MultiSelector
                                  onValuesChange={(selectedLabels) => {
                                    const selectedIds = selectedLabels
                                      .map((label) => tableByLabel.get(label)?.id)
                                      .filter((id): id is string => !!id)
                                    field.onChange(selectedIds)
                                  }}
                                  values={field.value
                                    .map((id) => tableById.get(id)?.label)
                                    .filter((label): label is string => !!label)}
                                  size="small"
                                  disabled={!canUpdatePostgrestConfig}
                                >
                                  <MultiSelectorTrigger
                                    mode="inline-combobox"
                                    label="Select tables..."
                                    badgeLimit="wrap"
                                    showIcon={false}
                                    deletableBadge
                                  />
                                  <MultiSelectorContent>
                                    <MultiSelectorList>
                                      {tableOptions.map((table) => (
                                        <MultiSelectorItem key={table.id} value={table.label}>
                                          {table.label}
                                        </MultiSelectorItem>
                                      ))}
                                    </MultiSelectorList>
                                  </MultiSelectorContent>
                                </MultiSelector>
                              )}
                            </FormItemLayout>
                          </FormItem_Shadcn_>
                        )}
                      />

                      <FormField_Shadcn_
                        control={whatToExposeForm.control}
                        name="selectedFunctionIds"
                        render={({ field }) => (
                          <FormItem_Shadcn_>
                            <FormItemLayout
                              layout="flex-row-reverse"
                              label="Functions"
                              description="Grant Data API access to selected functions."
                            >
                              {functionOptions.length === 0 ? (
                                <p className="text-sm text-foreground-light">
                                  No functions available.
                                </p>
                              ) : (
                                <MultiSelector
                                  onValuesChange={(selectedLabels) => {
                                    const selectedIds = selectedLabels
                                      .map((label) => functionByLabel.get(label)?.id)
                                      .filter((id): id is string => !!id)
                                    field.onChange(selectedIds)
                                  }}
                                  values={field.value
                                    .map((id) => functionById.get(id)?.label)
                                    .filter((label): label is string => !!label)}
                                  size="small"
                                  disabled={!canUpdatePostgrestConfig}
                                >
                                  <MultiSelectorTrigger
                                    mode="inline-combobox"
                                    label="Select functions..."
                                    badgeLimit="wrap"
                                    showIcon={false}
                                    deletableBadge
                                  />
                                  <MultiSelectorContent>
                                    <MultiSelectorList>
                                      {functionOptions.map((fn) => (
                                        <MultiSelectorItem key={fn.id} value={fn.label}>
                                          {fn.label}
                                        </MultiSelectorItem>
                                      ))}
                                    </MultiSelectorList>
                                  </MultiSelectorContent>
                                </MultiSelector>
                              )}
                            </FormItemLayout>
                          </FormItem_Shadcn_>
                        )}
                      />
                    </>
                  )}

                  {inferredDbSchemas.length === 0 && (
                    <Admonition
                      type="warning"
                      title="No schema is currently selected"
                      description="Saving with no selected schema, table, or function will disable the Data API."
                    />
                  )}
                </CardContent>
                <CardFooter className="border-t">
                  <FormActions
                    form={whatToExposeFormId}
                    isSubmitting={isExecutingSql || isUpdatingConfig}
                    hasChanges={whatToExposeForm.formState.isDirty}
                    handleReset={resetWhatToExposeForm}
                    disabled={!canUpdatePostgrestConfig}
                    helper={
                      isPermissionsLoaded && !canUpdatePostgrestConfig
                        ? "You need additional permissions to update your project's API settings"
                        : undefined
                    }
                  />
                </CardFooter>
              </Card>
            </form>
          </Form_Shadcn_>
        </PageSectionContent>
      </PageSection>

      <PageSection>
        <PageSectionMeta>
          <PageSectionSummary>
            <PageSectionTitle>How to expose</PageSectionTitle>
            <PageSectionDescription>
              Configure request behavior for the generated Data API endpoints.
            </PageSectionDescription>
          </PageSectionSummary>
        </PageSectionMeta>
        <PageSectionContent>
          <Form_Shadcn_ {...howToExposeForm}>
            <form
              id={howToExposeFormId}
              onSubmit={howToExposeForm.handleSubmit(onSubmitHowToExpose)}
            >
              <Card>
                <CardContent className="space-y-6 p-6">
                  <FormField_Shadcn_
                    control={howToExposeForm.control}
                    name="dbExtraSearchPath"
                    render={({ field }) => (
                      <FormItem_Shadcn_>
                        <FormItemLayout
                          layout="flex-row-reverse"
                          label="Extra search path"
                          description="Extra schemas to add to the search path of every request."
                        >
                          <MultiSelector
                            onValuesChange={field.onChange}
                            values={field.value}
                            size="small"
                            disabled={!canUpdatePostgrestConfig}
                          >
                            <MultiSelectorTrigger
                              mode="inline-combobox"
                              label="Select schemas..."
                              badgeLimit="wrap"
                              showIcon={false}
                              deletableBadge
                            />
                            <MultiSelectorContent>
                              <MultiSelectorList>
                                {allSchemas.map((schema) => (
                                  <MultiSelectorItem key={schema.id} value={schema.name}>
                                    {schema.name}
                                  </MultiSelectorItem>
                                ))}
                              </MultiSelectorList>
                            </MultiSelectorContent>
                          </MultiSelector>
                        </FormItemLayout>
                      </FormItem_Shadcn_>
                    )}
                  />

                  <FormField_Shadcn_
                    control={howToExposeForm.control}
                    name="maxRows"
                    render={({ field }) => (
                      <FormItem_Shadcn_>
                        <FormItemLayout
                          layout="flex-row-reverse"
                          label="Max rows"
                          description="The maximum number of rows returned from a view, table, or stored procedure."
                        >
                          <FormControl_Shadcn_>
                            <PrePostTab postTab="rows">
                              <Input_Shadcn_
                                size="small"
                                disabled={!canUpdatePostgrestConfig}
                                type="number"
                                value={Number.isNaN(field.value) ? '' : field.value}
                                onChange={(event) => field.onChange(Number(event.target.value))}
                              />
                            </PrePostTab>
                          </FormControl_Shadcn_>
                        </FormItemLayout>
                      </FormItem_Shadcn_>
                    )}
                  />

                  <FormField_Shadcn_
                    control={howToExposeForm.control}
                    name="dbPool"
                    render={({ field }) => (
                      <FormItem_Shadcn_>
                        <FormItemLayout
                          layout="flex-row-reverse"
                          label="Pool size"
                          description="Maximum connections to keep open in the Data API server's connection pool."
                        >
                          <FormControl_Shadcn_>
                            <PrePostTab postTab="connections">
                              <Input_Shadcn_
                                size="small"
                                disabled={!canUpdatePostgrestConfig}
                                type="number"
                                placeholder="Configured automatically"
                                onChange={(event) =>
                                  field.onChange(
                                    event.target.value === '' ? null : Number(event.target.value)
                                  )
                                }
                                value={field.value === null ? '' : field.value}
                              />
                            </PrePostTab>
                          </FormControl_Shadcn_>
                        </FormItemLayout>
                      </FormItem_Shadcn_>
                    )}
                  />
                </CardContent>
                <CardFooter className="border-t">
                  <FormActions
                    form={howToExposeFormId}
                    isSubmitting={isUpdatingConfig}
                    hasChanges={howToExposeForm.formState.isDirty}
                    handleReset={resetHowToExposeForm}
                    disabled={!canUpdatePostgrestConfig}
                    helper={
                      isPermissionsLoaded && !canUpdatePostgrestConfig
                        ? "You need additional permissions to update your project's API settings"
                        : undefined
                    }
                  />
                </CardFooter>
              </Card>
            </form>
          </Form_Shadcn_>
        </PageSectionContent>
      </PageSection>
    </div>
  )
}

export const DataApiSettingsTab = () => {
  return <DataApiSettingsSections />
}
