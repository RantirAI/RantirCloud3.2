'use client'

import { useParams } from 'common'
import type { Route } from 'components/ui/ui.types'
import {
  generateOtherRoutes,
  generateProductRoutes,
  generateSettingsRoutes,
  generateToolRoutes,
} from 'components/layouts/ProjectLayout/NavigationBar/NavigationBar.utils'
import { useIsAPIDocsSidePanelEnabled, useUnifiedLogsPreview } from 'components/interfaces/App/FeaturePreview/FeaturePreviewContext'
import { useFlag } from 'common'
import { useIsFeatureEnabled } from 'hooks/misc/useIsFeatureEnabled'
import { useSelectedProjectQuery } from 'hooks/misc/useSelectedProject'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React, { useCallback, useMemo, useState } from 'react'
import { Button, cn } from 'ui'

import { getProductMenuComponent } from './mobileProductMenuRegistry'

export interface MobileMenuContentProps {
  currentProductMenu: React.ReactNode
  currentProduct: string
  currentSectionKey: string | null
  onCloseSheet?: () => void
}

export function MobileMenuContent({
  currentProductMenu,
  currentProduct,
  currentSectionKey,
  onCloseSheet,
}: MobileMenuContentProps) {
  const router = useRouter()
  const { ref } = useParams()
  const { data: project } = useSelectedProjectQuery()
  const pathname = router.asPath?.split('?')[0] ?? router.pathname
  const activeRoute = pathname.split('/')[3]

  const [viewLevel, setViewLevel] = useState<'top' | 'section'>(
    currentProductMenu && currentSectionKey ? 'section' : 'top'
  )
  const [selectedSectionKey, setSelectedSectionKey] = useState<string | null>(null)

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
  const showReports = useIsFeatureEnabled('reports:all')
  const isNewAPIDocsEnabled = useIsAPIDocsSidePanelEnabled()
  const { isEnabled: isUnifiedLogsEnabled } = useUnifiedLogsPreview()

  const toolRoutes = useMemo(
    () => generateToolRoutes(ref, project),
    [ref, project]
  )
  const productRoutes = useMemo(
    () =>
      generateProductRoutes(ref, project, {
        auth: authEnabled,
        edgeFunctions: edgeFunctionsEnabled,
        storage: storageEnabled,
        realtime: realtimeEnabled,
        authOverviewPage: authOverviewPageEnabled,
      }),
    [
      ref,
      project,
      authEnabled,
      edgeFunctionsEnabled,
      storageEnabled,
      realtimeEnabled,
      authOverviewPageEnabled,
    ]
  )
  const otherRoutes = useMemo(
    () =>
      generateOtherRoutes(ref, project, {
        unifiedLogs: isUnifiedLogsEnabled,
        showReports,
        apiDocsSidePanel: isNewAPIDocsEnabled,
      }),
    [ref, project, isUnifiedLogsEnabled, showReports, isNewAPIDocsEnabled]
  )
  const settingsRoutes = useMemo(
    () => generateSettingsRoutes(ref, project),
    [ref, project]
  )

  const homeRoute: Route = useMemo(
    () => ({
      key: 'HOME',
      label: 'Project Overview',
      icon: null,
      link: ref ? `/project/${ref}` : undefined,
    }),
    [ref]
  )

  const allTopLevelRoutes = useMemo(
    () => [
      homeRoute,
      ...toolRoutes,
      ...productRoutes,
      ...otherRoutes,
      ...settingsRoutes,
    ],
    [homeRoute, toolRoutes, productRoutes, otherRoutes, settingsRoutes]
  )

  const hasSubmenu = useCallback(
    (route: Route) => {
      if (route.items && Array.isArray(route.items) && route.items.length > 0)
        return true
      const component = getProductMenuComponent(route.key)
      return component !== null
    },
    []
  )

  const handleTopLevelClick = useCallback(
    (route: Route) => {
      if (route.disabled) return
      if (hasSubmenu(route)) {
        setSelectedSectionKey(route.key)
        setViewLevel('section')
        return
      }
      if (route.link) {
        router.push(route.link)
        onCloseSheet?.()
      }
    },
    [hasSubmenu, router, onCloseSheet]
  )

  const handleBackToTop = useCallback(() => {
    setViewLevel('top')
    setSelectedSectionKey(null)
  }, [])

  const sectionKeyToShow = viewLevel === 'section' ? selectedSectionKey ?? currentSectionKey : null
  const sectionLabel =
    sectionKeyToShow &&
    (sectionKeyToShow === currentSectionKey
      ? currentProduct
      : allTopLevelRoutes.find((r) => r.key === sectionKeyToShow)?.label ?? sectionKeyToShow)

  const SectionMenuContent = sectionKeyToShow ? getProductMenuComponent(sectionKeyToShow) : null
  const pageSegment = pathname.split('/')[4]

  return (
    <div className="flex flex-col h-full">
      {viewLevel === 'section' && sectionLabel && (
        <div
          className={cn(
            'flex-shrink-0 flex items-center gap-2 border-b border-default bg-dash-sidebar px-4 min-h-[var(--header-height)]'
          )}
        >
          <Button
            type="text"
            className="!p-1"
            icon={<ChevronLeft size={20} />}
            onClick={handleBackToTop}
            aria-label="Back to menu"
          />
          <span className="font-medium truncate">{sectionLabel}</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {viewLevel === 'top' && (
          <nav className="py-2 px-3" aria-label="Project menu">
            <ul className="flex flex-col gap-0.5">
              {allTopLevelRoutes.map((route) => {
                const isActive = activeRoute === route.key || (route.key === 'HOME' && !activeRoute)
                const hasItems = hasSubmenu(route)
                const content = (
                  <>
                    {route.icon && (
                      <span className="flex items-center justify-center w-6 h-6 flex-shrink-0">
                        {route.icon}
                      </span>
                    )}
                    <span className="truncate">{route.label}</span>
                  </>
                )
                return (
                  <li key={route.key}>
                    {hasItems ? (
                      <button
                        type="button"
                        onClick={() => handleTopLevelClick(route)}
                        disabled={route.disabled}
                        className={cn(
                          'flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-left text-sm',
                          'hover:bg-overlay-hover',
                          isActive && 'bg-overlay-hover',
                          route.disabled && 'opacity-50 pointer-events-none'
                        )}
                      >
                        {content}
                      </button>
                    ) : route.link ? (
                      <Link
                        href={route.link}
                        onClick={onCloseSheet}
                        className={cn(
                          'flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-left text-sm',
                          'hover:bg-overlay-hover',
                          isActive && 'bg-overlay-hover'
                        )}
                      >
                        {content}
                      </Link>
                    ) : (
                      <span className="flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm opacity-50">
                        {content}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>
        )}
        {viewLevel === 'section' && sectionKeyToShow && (
          <div className="px-3 py-4">
            {sectionKeyToShow === currentSectionKey && currentProductMenu ? (
              currentProductMenu
            ) : SectionMenuContent ? (
              <React.Suspense fallback={<div className="py-4 text-sm text-foreground-muted">Loading...</div>}>
                {sectionKeyToShow === 'advisors' ? (
                  <SectionMenuContent {...({ page: pageSegment } as React.ComponentProps<typeof SectionMenuContent>)} />
                ) : (
                  <SectionMenuContent />
                )}
              </React.Suspense>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
