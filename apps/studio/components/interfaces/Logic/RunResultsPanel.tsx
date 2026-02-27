import { useState } from 'react'
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronRight, X } from 'lucide-react'
import { cn } from 'ui'
import type { FlowRunResult, NodeRunResult } from 'lib/logic/FlowExecutor'

interface RunResultsPanelProps {
  result: FlowRunResult | null
  onClose: () => void
}

export function RunResultsPanel({ result, onClose }: RunResultsPanelProps) {
  if (!result) return null

  const duration =
    new Date(result.finishedAt).getTime() - new Date(result.startedAt).getTime()

  return (
    <div className="flex flex-col h-full border-l border-default bg-surface-100 w-[360px]">
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <div className="flex items-center gap-2">
          {result.status === 'success' ? (
            <CheckCircle size={16} className="text-brand-600" />
          ) : (
            <XCircle size={16} className="text-destructive-600" />
          )}
          <span className="text-sm font-medium text-foreground">
            Run {result.status === 'success' ? 'Completed' : 'Failed'}
          </span>
          <span className="text-xs text-foreground-muted">{duration}ms</span>
        </div>
        <button onClick={onClose} className="rounded p-1 hover:bg-surface-200">
          <X size={14} className="text-foreground-light" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {result.nodeResults.map((nr, i) => (
          <NodeResultRow key={nr.nodeId} result={nr} index={i} />
        ))}
        {result.error && (
          <div className="px-4 py-3 bg-destructive-200/20 text-xs text-destructive-600">
            {result.error}
          </div>
        )}
      </div>
    </div>
  )
}

function NodeResultRow({ result: nr, index }: { result: NodeRunResult; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const duration =
    new Date(nr.finishedAt).getTime() - new Date(nr.startedAt).getTime()

  return (
    <div className="border-b border-default">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-surface-200 transition-colors"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="text-xs text-foreground-muted w-5">{index + 1}</span>
        {nr.status === 'success' ? (
          <CheckCircle size={12} className="text-brand-600 shrink-0" />
        ) : (
          <XCircle size={12} className="text-destructive-600 shrink-0" />
        )}
        <span className="text-xs font-medium text-foreground truncate flex-1">
          {nr.nodeType}
        </span>
        <span className="text-[10px] text-foreground-muted shrink-0">{duration}ms</span>
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-foreground-muted">
              Function
            </span>
            <pre className="text-xs text-foreground bg-surface-200 rounded p-2 mt-0.5 overflow-auto max-h-20">
              {nr.functionName}
            </pre>
          </div>
          {nr.output && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-foreground-muted">
                Output
              </span>
              <pre className="text-xs text-foreground bg-surface-200 rounded p-2 mt-0.5 overflow-auto max-h-40">
                {JSON.stringify(nr.output, null, 2)}
              </pre>
            </div>
          )}
          {nr.error && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-destructive-600">
                Error
              </span>
              <pre className="text-xs text-destructive-600 bg-destructive-200/20 rounded p-2 mt-0.5 overflow-auto max-h-20">
                {nr.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
