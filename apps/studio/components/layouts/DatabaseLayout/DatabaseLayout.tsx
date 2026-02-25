import { useRouter } from 'next/router'
import { PropsWithChildren } from 'react'

import { useIsColumnLevelPrivilegesEnabled } from 'components/interfaces/App/FeaturePreview/FeaturePreviewContext'
import { useIsETLPrivateAlpha } from 'components/interfaces/Database/Replication/useIsETLPrivateAlpha'
import { ProductMenu } from 'components/ui/ProductMenu'
import { useDatabaseExtensionsQuery } from 'data/database-extensions/database-extensions-query'
import { useProjectAddonsQuery } from 'data/subscriptions/project-addons-query'
import { useIsFeatureEnabled } from 'hooks/misc/useIsFeatureEnabled'
import { useSelectedProjectQuery } from 'hooks/misc/useSelectedProject'
import { withAuth } from 'hooks/misc/withAuth'
import { ProjectLayout } from '../ProjectLayout'
import { generateDatabaseMenu } from './DatabaseMenu.utils'

export interface DatabaseLayoutProps {
  title?: string
}

const DATABASE_SECTION_TITLE_BY_ROUTE: Record<string, string> = {
  schemas: 'Schema Visualizer',
  tables: 'Tables',
  functions: 'Functions',
  triggers: 'Triggers',
  types: 'Enumerated Types',
  extensions: 'Extensions',
  indexes: 'Indexes',
  publications: 'Publications',
  roles: 'Roles',
  'column-privileges': 'Column Privileges',
  settings: 'Settings',
  replication: 'Replication',
  backups: 'Backups',
  migrations: 'Migrations',
}

const DatabaseProductMenu = () => {
  const { data: project } = useSelectedProjectQuery()

  const router = useRouter()
  const page = router.pathname.split('/')[4]

  const { data } = useDatabaseExtensionsQuery({
    projectRef: project?.ref,
    connectionString: project?.connectionString,
  })
  const { data: addons } = useProjectAddonsQuery({ projectRef: project?.ref })

  const pgNetExtensionExists = (data ?? []).find((ext) => ext.name === 'pg_net') !== undefined
  const pitrEnabled = addons?.selected_addons.find((addon) => addon.type === 'pitr') !== undefined
  const columnLevelPrivileges = useIsColumnLevelPrivilegesEnabled()
  const enablePgReplicate = useIsETLPrivateAlpha()

  const {
    databaseReplication: showPgReplicate,
    databaseRoles: showRoles,
    integrationsWrappers: showWrappers,
  } = useIsFeatureEnabled(['database:replication', 'database:roles', 'integrations:wrappers'])

  return (
    <>
      <ProductMenu
        page={page}
        menu={generateDatabaseMenu(project, {
          pgNetExtensionExists,
          pitrEnabled,
          columnLevelPrivileges,
          showPgReplicate,
          enablePgReplicate,
          showRoles,
          showWrappers,
        })}
      />
    </>
  )
}

const DatabaseLayout = ({ children, title }: PropsWithChildren<DatabaseLayoutProps>) => {
  const router = useRouter()
  const page = router.pathname.split('/')[4]
  const routeSectionTitle = page !== undefined ? DATABASE_SECTION_TITLE_BY_ROUTE[page] : undefined
  const resolvedTitle =
    title && title !== 'Database' ? title : routeSectionTitle ?? title

  return (
    <ProjectLayout
      title={resolvedTitle}
      product="Database"
      productMenu={<DatabaseProductMenu />}
      isBlocking={false}
    >
      {children}
    </ProjectLayout>
  )
}

export default withAuth(DatabaseLayout)
