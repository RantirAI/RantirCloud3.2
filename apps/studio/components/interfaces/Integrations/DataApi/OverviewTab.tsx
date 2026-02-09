import { useParams } from 'common'
import {
  DataApiEnableSwitch,
  DataApiProjectUrlCard,
} from 'components/interfaces/Settings/API/ServiceList'
import { useProjectPostgrestConfigQuery } from 'data/config/project-postgrest-config-query'
import { useSelectedProjectQuery } from 'hooks/misc/useSelectedProject'
import { PROJECT_STATUS } from 'lib/constants'
import { AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { Alert_Shadcn_, AlertTitle_Shadcn_, cn } from 'ui'
import {
  PageSection,
  PageSectionContent,
  PageSectionDescription,
  PageSectionMeta,
  PageSectionSummary,
  PageSectionTitle,
} from 'ui-patterns/PageSection'

import { IntegrationOverviewTab } from '../Integration/IntegrationOverviewTab'
import { DataApiSettingsSections } from './SettingsTab'

export const DataApiOverviewTab = () => {
  const { ref: projectRef } = useParams()
  const { data: project, isPending: isProjectLoading } = useSelectedProjectQuery()
  const { data: config, isPending: isConfigLoading } = useProjectPostgrestConfigQuery({
    projectRef,
  })

  const isLoading = isProjectLoading || isConfigLoading
  const isEnabled = !!config?.db_schema?.trim()
  const [enableState, setEnableState] = useState<{ enabled: boolean; isDirty: boolean }>()
  const isUnsavedDisable = enableState?.isDirty && !enableState.enabled
  const effectiveIsEnabled = isEnabled && !isUnsavedDisable

  return (
    <IntegrationOverviewTab>
      <div className="px-10 max-w-4xl flex flex-col gap-8">
        {!isProjectLoading && project?.status !== PROJECT_STATUS.ACTIVE_HEALTHY ? (
          <Alert_Shadcn_ variant="destructive">
            <AlertCircle size={16} />
            <AlertTitle_Shadcn_>
              API settings are unavailable as the project is not active
            </AlertTitle_Shadcn_>
          </Alert_Shadcn_>
        ) : (
          <>
            <PageSection className="first:pt-0">
              <PageSectionMeta>
                <PageSectionSummary>
                  <PageSectionTitle>Enable</PageSectionTitle>
                  <PageSectionDescription>
                    Enable the Data API for this project and use the project API URL.
                  </PageSectionDescription>
                </PageSectionSummary>
              </PageSectionMeta>
              <PageSectionContent className="space-y-4">
                <DataApiEnableSwitch onEnableStateChange={setEnableState} />

                <div
                  className={cn(
                    (isLoading || !effectiveIsEnabled) && 'opacity-50 pointer-events-none'
                  )}
                >
                  <DataApiProjectUrlCard embedded />
                </div>
              </PageSectionContent>
            </PageSection>

            <div
              className={cn((isLoading || !effectiveIsEnabled) && 'opacity-50 pointer-events-none')}
            >
              <DataApiSettingsSections embedded />
            </div>
          </>
        )}
      </div>
    </IntegrationOverviewTab>
  )
}
