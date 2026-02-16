import { Bot, Lightbulb, PenLine, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { useSidebarManagerSnapshot } from 'state/sidebar-manager-state'
import { SIDEBAR_KEYS } from '../ProjectLayout/LayoutSidebar/LayoutSidebarProvider'
import { cn } from 'ui'

interface RailItem {
  id: string
  label: string
  icon: LucideIcon
}

const RAIL_ITEMS: RailItem[] = [
  { id: SIDEBAR_KEYS.AI_ASSISTANT, label: 'AI', icon: Bot },
  { id: SIDEBAR_KEYS.EDITOR_PANEL, label: 'Editor', icon: PenLine },
  { id: SIDEBAR_KEYS.ADVISOR_PANEL, label: 'Advisor', icon: Lightbulb },
]

function RightIconRail() {
  const { activeSidebar, toggleSidebar } = useSidebarManagerSnapshot()

  return (
    <aside className="bg-dash-sidebar text-foreground-lighter border-default flex w-12 shrink-0 border-l">
      <nav className="flex flex-1 flex-col items-center gap-1 py-2 pt-3">
        {RAIL_ITEMS.map((item) => {
          const isActive = activeSidebar?.id === item.id

          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-pressed={isActive}
              onClick={() => toggleSidebar(item.id)}
              className={cn(
                'inline-flex size-8 items-center justify-center rounded-md transition-colors',
                isActive
                  ? 'bg-surface-200 text-foreground'
                  : 'hover:bg-surface-200 hover:text-foreground'
              )}
            >
              <item.icon className="size-4" />
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

function RightSidebarPanel() {
  const { activeSidebar } = useSidebarManagerSnapshot()

  if (!activeSidebar?.component) return null

  return (
    <aside className="bg-dash-sidebar border-default flex w-[420px] shrink-0 flex-col border-l overflow-hidden">
      {activeSidebar.component()}
    </aside>
  )
}

export function RightRailLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="min-w-0 flex-1">{children}</div>

      <div className="hidden md:flex md:shrink-0">
        <RightSidebarPanel />
        <RightIconRail />
      </div>
    </div>
  )
}
