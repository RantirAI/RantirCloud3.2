'use client'

import { useEffect, useState, ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DatabaseManager } from '@/components/supabase-manager/database'
import { StorageManager } from '@/components/supabase-manager/storage'
import { AuthManager } from '@/components/supabase-manager/auth'
import { UsersManager } from '@/components/supabase-manager/users'
import { SecretsManager } from '@/components/supabase-manager/secrets'
import { LogsManager } from '@/components/supabase-manager/logs'
import { SuggestionsManager } from '@/components/supabase-manager/suggestions'
import {
  SheetNavigationProvider,
  useSheetNavigation,
} from '@/contexts/SheetNavigationContext'
import {
  ChevronLeft,
  ChevronRight,
  Database,
  HardDrive,
  Shield,
  Users,
  KeyRound,
  ScrollText,
  Lightbulb,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const queryClient = new QueryClient()

interface PlatformKitEmbedProps {
  projectRef: string
}

function PlatformKitContent({ projectRef }: { projectRef: string }) {
  const { stack, push, popTo, reset } = useSheetNavigation()

  const handleTopLevelNavigation = (title: string, component: ReactNode) => {
    if (stack.length === 1 && stack[0].title === title) {
      return
    }
    reset()
    push({ title, component })
  }

  const currentView = stack[stack.length - 1]
  const activeManager = stack.length > 0 ? stack[0].title : null

  const navigationItems = [
    {
      title: 'Database',
      icon: Database,
      component: <DatabaseManager projectRef={projectRef} />,
    },
    {
      title: 'Storage',
      icon: HardDrive,
      component: <StorageManager projectRef={projectRef} />,
    },
    {
      title: 'Auth',
      icon: Shield,
      component: <AuthManager projectRef={projectRef} />,
    },
    {
      title: 'Users',
      icon: Users,
      component: <UsersManager projectRef={projectRef} />,
    },
    {
      title: 'Secrets',
      icon: KeyRound,
      component: <SecretsManager projectRef={projectRef} />,
    },
    {
      title: 'Logs',
      icon: ScrollText,
      component: <LogsManager projectRef={projectRef} />,
    },
    {
      title: 'Suggestions',
      icon: Lightbulb,
      component: <SuggestionsManager projectRef={projectRef} />,
    },
  ]

  return (
    <div className="grid grid-cols-[200px_1fr] h-full overflow-hidden">
      {/* Sidebar */}
      <div className="flex flex-col border-r border-[#2C2C2C] px-3 py-6 pb-3 bg-[#1C1C1C]">
        <div className="px-3 mb-4">
          <h2 className="text-[#808080] font-medium text-xs uppercase tracking-wide">
            Manage Backend
          </h2>
        </div>
        <div className="grow space-y-0.5">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.title}
                variant={activeManager === item.title ? 'secondary' : 'ghost'}
                className={`w-full justify-start text-sm ${
                  activeManager === item.title
                    ? 'bg-[#2C2C2C] text-white'
                    : 'text-[#A0A0A0] hover:text-white hover:bg-[#2C2C2C]/50'
                }`}
                onClick={() => handleTopLevelNavigation(item.title, item.component)}
              >
                <Icon className="mr-2 w-4 h-4" />
                {item.title === 'Auth' ? 'Authentication' : item.title}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-col overflow-hidden h-full bg-[#0E0E0E]">
        {/* Header with breadcrumbs */}
        <div className="flex items-center h-12 shrink-0 px-4 border-b border-[#2C2C2C]">
          {stack.length > 1 && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-[#2C2C2C] bg-transparent hover:bg-[#2C2C2C]"
              onClick={() => popTo(stack.length - 2)}
            >
              <ChevronLeft className="h-4 w-4 text-[#A0A0A0]" />
            </Button>
          )}
          {/* Breadcrumbs */}
          <div className="ml-4 flex items-center gap-1.5 text-sm text-[#A0A0A0]">
            {stack.map((item: { title: string }, index: number) => (
              <div key={`${item.title}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight className="h-3 w-3" />}
                {index === stack.length - 1 ? (
                  <span className="font-medium text-white">{item.title}</span>
                ) : (
                  <button onClick={() => popTo(index)} className="hover:text-white">
                    {item.title}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grow overflow-y-auto">
          {currentView ? (
            currentView.component
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-[#808080]">
                Select a manager from the sidebar to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PlatformKitEmbed({ projectRef }: PlatformKitEmbedProps) {
  return (
    <div
      className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg overflow-hidden"
      style={{ height: 'calc(100vh - 280px)', minHeight: '600px' }}
    >
      <QueryClientProvider client={queryClient}>
        <SheetNavigationProvider
          onStackEmpty={() => {}}
          initialStack={[
            {
              title: 'Database',
              component: <DatabaseManager projectRef={projectRef} />,
            },
          ]}
        >
          <PlatformKitContent projectRef={projectRef} />
        </SheetNavigationProvider>
      </QueryClientProvider>
    </div>
  )
}
