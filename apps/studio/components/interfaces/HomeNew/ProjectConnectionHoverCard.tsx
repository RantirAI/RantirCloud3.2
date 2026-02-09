import { PermissionAction } from '@supabase/shared-types/out/constants'
import { getConnectionStrings } from 'components/interfaces/Connect/DatabaseSettings.utils'
import { getKeys, useAPIKeysQuery } from 'data/api-keys/api-keys-query'
import { useProjectSettingsV2Query } from 'data/config/project-settings-v2-query'
import { useReadReplicasQuery } from 'data/read-replicas/replicas-query'
import { useAsyncCheckPermissions } from 'hooks/misc/useCheckPermissions'
import { pluckObjectFields } from 'lib/helpers'
import { ChevronDown, Plug } from 'lucide-react'
import { parseAsBoolean, useQueryState } from 'nuqs'
import { useMemo, useState } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  PrePostTab,
} from 'ui'
import { Input } from 'ui-patterns/DataInputs/Input'

const DB_FIELDS = ['db_host', 'db_name', 'db_port', 'db_user'] as const
const EMPTY_CONNECTION_INFO = {
  db_user: '',
  db_host: '',
  db_port: '',
  db_name: '',
}

type ConnectionMode = 'direct' | 'api'

interface ProjectConnectionHoverCardProps {
  projectRef?: string
}

export const ProjectConnectionHoverCard = ({ projectRef }: ProjectConnectionHoverCardProps) => {
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('direct')
  const [_, setShowConnect] = useQueryState('showConnect', parseAsBoolean.withDefault(false))

  const { data: settings, isPending: isLoadingSettings } = useProjectSettingsV2Query(
    { projectRef },
    { enabled: !!projectRef }
  )

  const protocol = settings?.app_config?.protocol ?? 'https'
  const endpoint = settings?.app_config?.endpoint
  const projectUrl = endpoint ? `${protocol}://${endpoint}` : undefined

  const { isLoading: isLoadingPermissions, can: canReadAPIKeys } = useAsyncCheckPermissions(
    PermissionAction.READ,
    'service_api_keys'
  )

  const { data: apiKeys, isLoading: isLoadingKeys } = useAPIKeysQuery(
    { projectRef },
    { enabled: connectionMode === 'api' && !!projectRef && canReadAPIKeys }
  )

  const { publishableKey } = canReadAPIKeys ? getKeys(apiKeys) : { publishableKey: null }

  const { data: databases, isLoading: isLoadingDatabases } = useReadReplicasQuery(
    { projectRef },
    { enabled: connectionMode === 'direct' && !!projectRef }
  )

  const primaryDatabase = databases?.find((db) => db.identifier === projectRef)

  const directConnectionString = useMemo(() => {
    if (
      !primaryDatabase?.db_host ||
      !primaryDatabase?.db_name ||
      !primaryDatabase?.db_user ||
      !primaryDatabase?.db_port
    ) {
      return ''
    }
    const connectionInfo = pluckObjectFields(primaryDatabase, [...DB_FIELDS])
    return getConnectionStrings({
      connectionInfo: { ...EMPTY_CONNECTION_INFO, ...connectionInfo },
      metadata: { projectRef },
    }).direct.uri
  }, [primaryDatabase, projectRef])

  const directConnectionPlaceholder = isLoadingDatabases
    ? 'Loading connection string...'
    : 'Connection string unavailable'
  const projectUrlPlaceholder = isLoadingSettings
    ? 'Loading project URL...'
    : 'Project URL unavailable'
  const publishableKeyPlaceholder =
    isLoadingPermissions || isLoadingKeys
      ? 'Loading publishable key...'
      : canReadAPIKeys
        ? 'Publishable key unavailable'
        : "You don't have permission to view API keys."

  return (
    <div className="flex flex-col @xl:flex-row w-full @xl:items-center gap-2">
      <PrePostTab
        className="flex-1 [&>div:first-child]:px-0"
        preTab={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="text"
                size="tiny"
                iconRight={<ChevronDown size={14} strokeWidth={1.5} />}
              >
                {connectionMode === 'direct' ? 'Direct' : 'API'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="bottom" className="w-40">
              <DropdownMenuItem onSelect={() => setConnectionMode('direct')}>
                Direct connection
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setConnectionMode('api')}>
                Data API
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      >
        {connectionMode === 'direct' ? (
          <Input
            copy
            readOnly
            className="font-mono text-xs flex-1"
            value={directConnectionString}
            placeholder={directConnectionPlaceholder}
          />
        ) : (
          <div className="flex w-full gap-2">
            <Input
              copy
              readOnly
              containerClassName="min-w-0 flex-1"
              className="font-mono text-xs flex-1"
              value={projectUrl ?? ''}
              placeholder={projectUrlPlaceholder}
            />
            <Input
              readOnly
              copy={canReadAPIKeys}
              containerClassName="min-w-0 flex-1"
              className="!rounded-l-md font-mono text-xs flex-1"
              value={canReadAPIKeys ? publishableKey?.api_key ?? '' : ''}
              placeholder={publishableKeyPlaceholder}
            />
          </div>
        )}
      </PrePostTab>
      <Button
        icon={<Plug className="rotate-90" strokeWidth={1.5} size={14} />}
        type="default"
        size="small"
        className="shrink-0"
        onClick={() => setShowConnect(true)}
      >
        Get Connected
      </Button>
    </div>
  )
}
