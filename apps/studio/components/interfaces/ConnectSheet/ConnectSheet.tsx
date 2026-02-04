import { PermissionAction } from '@supabase/shared-types/out/constants'
import { useParams } from 'common'
import { getKeys, useAPIKeysQuery } from 'data/api-keys/api-keys-query'
import { useProjectSettingsV2Query } from 'data/config/project-settings-v2-query'
import { useAsyncCheckPermissions } from 'hooks/misc/useCheckPermissions'
import { useIsFeatureEnabled } from 'hooks/misc/useIsFeatureEnabled'
import { parseAsBoolean, parseAsString, useQueryState } from 'nuqs'
import { useMemo } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, cn } from 'ui'

import type { ProjectKeys } from './Connect.types'
import { ConnectConfigSection, ModeSelector } from './ConnectConfigSection'
import { ConnectStepsSection } from './ConnectStepsSection'
import { useConnectState } from './useConnectState'

export const ConnectSheet = () => {
  const [showConnect, setShowConnect] = useQueryState(
    'showConnect',
    parseAsBoolean.withDefault(false)
  )
  const [connectTab, setConnectTab] = useQueryState('connectTab', parseAsString)

  const handleOpenChange = (sheetOpen: boolean) => {
    if (!sheetOpen) {
      setConnectTab(null)
    }
    setShowConnect(sheetOpen)
  }

  const {
    projectConnectionShowAppFrameworks: showAppFrameworks,
    projectConnectionShowMobileFrameworks: showMobileFrameworks,
  } = useIsFeatureEnabled([
    'project_connection:show_app_frameworks',
    'project_connection:show_mobile_frameworks',
  ])

  const handleSourceChange = (databaseId: string) => {
    // Database selection is handled by the DatabaseSelector's internal state
    // We just need to trigger a re-render of connection strings
  }

  // Filter available modes based on feature flags
  const availableModeIds = useMemo(() => {
    const showFrameworks = showAppFrameworks || showMobileFrameworks

    return showFrameworks ? ['framework'] : []
  }, [showAppFrameworks, showMobileFrameworks])

  const { state, updateField, setMode, activeFields, resolvedSteps, getFieldOptions, schema } =
    useConnectState()

  // Filter modes based on feature flags
  const availableModes = useMemo(
    () => schema.modes.filter((m) => availableModeIds.includes(m.id)),
    [schema.modes, availableModeIds]
  )

  // Project keys for step components
  const { ref: projectRef } = useParams()
  const { data: settings } = useProjectSettingsV2Query({ projectRef }, { enabled: showConnect })
  const { can: canReadAPIKeys } = useAsyncCheckPermissions(
    PermissionAction.READ,
    'service_api_keys'
  )
  const { data: apiKeys } = useAPIKeysQuery({ projectRef }, { enabled: canReadAPIKeys })
  const { anonKey, publishableKey } = canReadAPIKeys
    ? getKeys(apiKeys)
    : { anonKey: null, publishableKey: null }

  const projectKeys: ProjectKeys = useMemo(() => {
    const protocol = settings?.app_config?.protocol ?? 'https'
    const endpoint = settings?.app_config?.endpoint ?? ''
    const apiHost = canReadAPIKeys ? `${protocol}://${endpoint ?? '-'}` : ''

    return {
      apiUrl: apiHost ?? null,
      anonKey: anonKey?.api_key ?? null,
      publishableKey: publishableKey?.api_key ?? null,
    }
  }, [
    settings?.app_config?.protocol,
    settings?.app_config?.endpoint,
    canReadAPIKeys,
    anonKey?.api_key,
    publishableKey?.api_key,
  ])

  return (
    <Sheet open={showConnect} onOpenChange={handleOpenChange}>
      <SheetContent size="lg" className="flex flex-col gap-0 p-0 space-y-0" tabIndex={undefined}>
        <SheetHeader className={cn('text-left border-b shrink-0 py-6 px-8')}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <SheetTitle>Connect to your project</SheetTitle>
              <SheetDescription>Choose how you want to use Supabase</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Configuration Section */}
          <div className="space-y-6 border-b p-8 shrink-0">
            {availableModes.length > 1 && (
              <ModeSelector modes={availableModes} selected={state.mode} onChange={setMode} />
            )}
            <div className="border-t pt-8">
              <ConnectConfigSection
                activeFields={activeFields}
                state={state}
                onFieldChange={updateField}
                getFieldOptions={getFieldOptions}
              />
            </div>
          </div>

          {/* Steps Section */}
          <ConnectStepsSection steps={resolvedSteps} state={state} projectKeys={projectKeys} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
