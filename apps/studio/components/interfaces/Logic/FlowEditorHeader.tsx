import { useState } from 'react'
import {
  MessageSquare,
  Key,
  Link2,
  BarChart3,
  Settings,
  Save,
  Rocket,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
} from 'lucide-react'
import { cn } from 'ui'

export type HeaderTab =
  | 'variables'
  | 'monitoring'
  | 'deploy'
  | null

interface FlowEditorHeaderProps {
  flowName?: string
  activeTab: HeaderTab
  onTabChange: (tab: HeaderTab) => void
  onRunFlow: () => void
  onSaveFlow: () => void
  isRunning: boolean
  lastRunStatus?: 'success' | 'error' | null
  deployVersion?: number
}

export function FlowEditorHeader({
  flowName = 'Untitled Flow',
  activeTab,
  onTabChange,
  onRunFlow,
  onSaveFlow,
  isRunning,
  lastRunStatus,
  deployVersion,
}: FlowEditorHeaderProps) {
  const toggle = (tab: HeaderTab) => onTabChange(activeTab === tab ? null : tab)

  return (
    <div className="flex items-center justify-between border-b border-default bg-surface-100 px-4 h-11 shrink-0">
      {/* Left: flow name */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
          {flowName}
        </span>
      </div>

      {/* Center: nav tabs */}
      <div className="flex items-center gap-1">
        {([
          { key: 'variables' as const, icon: Key, label: 'Variables & Secrets' },
          { key: 'monitoring' as const, icon: BarChart3, label: 'Monitoring' },
          { key: 'deploy' as const, icon: Rocket, label: 'Deploy' },
        ] as const).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors',
              activeTab === key
                ? 'bg-surface-300 text-foreground'
                : 'text-foreground-light hover:text-foreground hover:bg-surface-200'
            )}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSaveFlow}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-foreground-light hover:text-foreground hover:bg-surface-200 transition-colors"
        >
          <Save size={13} />
          Save
        </button>

        {deployVersion != null && (
          <span className="rounded-full bg-surface-300 px-2 py-0.5 text-[10px] text-foreground-muted">
            v{deployVersion}
          </span>
        )}

        {lastRunStatus && !isRunning && (
          <span className="flex items-center gap-1 text-[10px]">
            {lastRunStatus === 'success' ? (
              <CheckCircle size={12} className="text-brand-600" />
            ) : (
              <XCircle size={12} className="text-destructive-600" />
            )}
          </span>
        )}

        <button
          onClick={onRunFlow}
          disabled={isRunning}
          className="flex items-center gap-1.5 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 transition-colors disabled:opacity-60"
        >
          {isRunning ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          {isRunning ? 'Running...' : 'Run Flow'}
        </button>
      </div>
    </div>
  )
}
