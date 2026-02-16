import { useRouter } from 'next/router'
import { PropsWithChildren } from 'react'

import { useParams } from 'common'
import { AppBannerWrapper } from 'components/interfaces/App/AppBannerWrapper'
import { SidebarInset, SidebarProvider } from 'ui'
import { AppSidebarV2 } from './AppSidebarV2'
import { RightRailLayout } from './RightIconRail'
import { LayoutSidebarProvider } from '../ProjectLayout/LayoutSidebar/LayoutSidebarProvider'
import { ProjectContextProvider } from '../ProjectLayout/ProjectContext'

export interface DefaultLayoutV2Props {
  headerTitle?: string
}

/**
 * New three-column layout for the dashboard (V2 navigation).
 *
 * Layout structure:
 * 1. Left sidebar (collapsible) - navigation with groups (Database, Platform, Observability, Integrations)
 * 2. Main content area - page content (no secondary nav bar)
 * 3. Right icon rail - AI, SQL, Alerts, Help panels
 *
 * This replaces DefaultLayout + ProjectLayout + feature-specific layouts (AuthLayout, DatabaseLayout, etc.)
 * when the navigation V2 feature flag is enabled. The key difference is that there is no longer a
 * secondary product menu sidebar - all navigation is handled in the primary sidebar with collapsible groups.
 */
export const DefaultLayoutV2 = ({ children }: PropsWithChildren<DefaultLayoutV2Props>) => {
  const { ref } = useParams()
  const router = useRouter()

  return (
    <ProjectContextProvider projectRef={ref}>
      <LayoutSidebarProvider>
        <div className="flex flex-col h-screen w-screen">
          <AppBannerWrapper />
          <RightRailLayout>
            <SidebarProvider defaultOpen={true}>
              {!router.pathname.startsWith('/account') && <AppSidebarV2 />}
              <SidebarInset>
                <div className="h-full overflow-y-auto">{children}</div>
              </SidebarInset>
            </SidebarProvider>
          </RightRailLayout>
        </div>
      </LayoutSidebarProvider>
    </ProjectContextProvider>
  )
}

export default DefaultLayoutV2
