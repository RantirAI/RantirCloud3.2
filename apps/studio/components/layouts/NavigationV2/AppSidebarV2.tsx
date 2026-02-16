import Link from 'next/link'
import { Settings } from 'lucide-react'

import { useFlag, useParams } from 'common'
import {
  useIsAPIDocsSidePanelEnabled,
  useIsColumnLevelPrivilegesEnabled,
  useUnifiedLogsPreview,
} from 'components/interfaces/App/FeaturePreview/FeaturePreviewContext'
import { useIsETLPrivateAlpha } from 'components/interfaces/Database/Replication/useIsETLPrivateAlpha'
import { useDatabaseExtensionsQuery } from 'data/database-extensions/database-extensions-query'
import { useProjectAddonsQuery } from 'data/subscriptions/project-addons-query'
import { useIsFeatureEnabled } from 'hooks/misc/useIsFeatureEnabled'
import { useSelectedOrganizationQuery } from 'hooks/misc/useSelectedOrganization'
import { useSelectedProjectQuery } from 'hooks/misc/useSelectedProject'
import { Home } from 'icons'
import { IS_PLATFORM } from 'lib/constants'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from 'ui'

import { NavGroup } from './NavGroup'
import { NavUser } from './NavUser'
import {
  generateDatabaseNavItems,
  generateIntegrationsNavItems,
  generateObservabilityNavItems,
  generatePlatformNavItems,
} from './NavigationV2.utils'

export function AppSidebarV2() {
  const { ref: projectRef } = useParams()
  const { data: project } = useSelectedProjectQuery()
  const { data: org } = useSelectedOrganizationQuery()

  // Database flags
  const { data: extensions } = useDatabaseExtensionsQuery({
    projectRef: project?.ref,
    connectionString: project?.connectionString,
  })
  const { data: addons } = useProjectAddonsQuery({ projectRef: project?.ref })

  const pgNetExtensionExists =
    (extensions ?? []).find((ext) => ext.name === 'pg_net') !== undefined
  const pitrEnabled =
    addons?.selected_addons.find((addon) => addon.type === 'pitr') !== undefined
  const columnLevelPrivileges = useIsColumnLevelPrivilegesEnabled()
  const enablePgReplicate = useIsETLPrivateAlpha()

  const {
    databaseReplication: showPgReplicate,
    databaseRoles: showRoles,
    integrationsWrappers: showWrappers,
  } = useIsFeatureEnabled(['database:replication', 'database:roles', 'integrations:wrappers'])

  // Platform flags
  const {
    projectAuthAll: authEnabled,
    projectEdgeFunctionAll: edgeFunctionsEnabled,
    projectStorageAll: storageEnabled,
    realtimeAll: realtimeEnabled,
  } = useIsFeatureEnabled([
    'project_auth:all',
    'project_edge_function:all',
    'project_storage:all',
    'realtime:all',
  ])
  const authOverviewPageEnabled = useFlag('authOverviewPage')

  // Other flags
  const showReports = useIsFeatureEnabled('reports:all')
  const isNewAPIDocsEnabled = useIsAPIDocsSidePanelEnabled()
  const { isEnabled: isUnifiedLogsEnabled } = useUnifiedLogsPreview()

  const ref = projectRef ?? 'default'

  const databaseItems = generateDatabaseNavItems(ref, project, {
    pgNetExtensionExists,
    pitrEnabled,
    columnLevelPrivileges,
    showPgReplicate,
    enablePgReplicate,
    showRoles,
    showWrappers,
  })

  const platformItems = generatePlatformNavItems(ref, project, {
    authEnabled,
    edgeFunctionsEnabled,
    storageEnabled,
    realtimeEnabled,
    authOverviewPageEnabled,
  })

  const observabilityItems = generateObservabilityNavItems(ref, project, {
    showReports,
    unifiedLogs: isUnifiedLogsEnabled,
  })

  const integrationsItems = generateIntegrationsNavItems(ref, project, {
    apiDocsSidePanel: isNewAPIDocsEnabled,
  })

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground gap-3"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg border">
                <SupabaseLogo className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {project?.name ?? 'Loading...'}
                </span>
                <span className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                  {org?.name ?? ''}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarGroup className="py-0 group-data-[collapsible=icon]:hidden">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href={`/project/${ref}`}>
                  <Home size={16} strokeWidth={1.5} />
                  <span>Home</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Database" items={databaseItems} />
        <NavGroup label="Platform" items={platformItems} />
        <NavGroup label="Observability" items={observabilityItems} />
        <NavGroup label="Integrations" items={integrationsItems} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Project Settings">
              <Link
                href={
                  IS_PLATFORM
                    ? `/project/${ref}/settings/general`
                    : `/project/${ref}/settings/log-drains`
                }
              >
                <Settings size={16} />
                <span>Project Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {IS_PLATFORM && <NavUser />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function SupabaseLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 109 113"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z"
        fill="url(#supabase-logo-paint0)"
      />
      <path
        d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z"
        fill="url(#supabase-logo-paint1)"
        fillOpacity="0.2"
      />
      <path
        d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64038 72.2922 -2.92775 62.8321 2.1655 56.4175L45.317 2.07103Z"
        fill="#3ECF8E"
      />
      <defs>
        <linearGradient
          id="supabase-logo-paint0"
          x1="53.9738"
          y1="54.974"
          x2="94.1635"
          y2="71.8295"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#249361" />
          <stop offset="1" stopColor="#3ECF8E" />
        </linearGradient>
        <linearGradient
          id="supabase-logo-paint1"
          x1="36.1558"
          y1="30.578"
          x2="54.4844"
          y2="65.0806"
          gradientUnits="userSpaceOnUse"
        >
          <stop />
          <stop offset="1" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}
