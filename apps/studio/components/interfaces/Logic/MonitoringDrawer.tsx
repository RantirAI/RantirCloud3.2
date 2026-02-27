import { useState, useEffect } from 'react'
import { X, BarChart3, CheckCircle, XCircle, ChevronDown, ChevronRight, Clock } from 'lucide-react'
import type { FlowRunResult, NodeRunResult } from 'lib/logic/FlowExecutor'

const RUNS_KEY = 'rantir-flow-runs'

export function saveFlowRun(projectId: string, run: FlowRunResult) {
  const key = `${RUNS_KEY}-${projectId}`
  const runs: FlowRunResult[] = JSON.parse(localStorage.getItem(key) || '[]')
  runs.unshift(run)
  if (runs.length > 50) runs.length = 50
  localStorage.setItem(key, JSON.stringify(runs))
}

export function getFlowRuns(projectId: string): FlowRunResult[] {
  return JSON.parse(localStorage.getItem(`${RUNS_KEY}-${projectId}`) || '[]')
}

interface MonitoringDrawerProps {
  open: boolean
  onClose: () => void
  projectId?: string
}

export function MonitoringDrawer({ open, onClose, projectId }: MonitoringDrawerProps) {
  const [runs, setRuns] = useState<FlowRunResult[]>([])
  const [selectedRun, setSelectedRun] = useState<FlowRunResult | null>(null)

  useEffect(() => {
    if (open && projectId) setRuns(getFlowRuns(projectId))
  }, [open, projectId])

  if (!open) return null

  return (
    <div className="flex flex-col h-full border-l border-default bg-surface-100 w-[360px]">
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-foreground-light" />
          <span className="text-sm font-medium text-foreground">Monitoring</span>
          <span className="text-xs text-foreground-muted">({runs.length} runs)</span>
        </div>
        <button onClick={onClose} className="rounded p-1 hover:bg-surface-200">
          <X size={14} className="text-foreground-light" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedRun ? (
          <div>
            <button
              onClick={() => setSelectedRun(null)}
              className="w-full px-4 py-2 text-xs text-brand-600 hover:bg-surface-200 text-left"
            >
              &larr; Back to runs
            </button>
            {selectedRun.nodeResults.map((nr, i) => {
              const dur = new Date(nr.finishedAt).getTime() - new Date(nr.startedAt).getTime()
              return (
                <div key={nr.nodeId} className="border-b border-default px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground-muted w-4">{i + 1}</span>
                    {nr.status === 'success' ? (
                      <CheckCircle size={12} className="text-brand-600" />
                    ) : (
                      <XCircle size={12} className="text-destructive-600" />
                    )}
                    <span className="text-xs font-medium text-foreground flex-1">{nr.nodeType}</span>
                    <span className="text-[10px] text-foreground-muted">{dur}ms</span>
                  </div>
                  {nr.error && (
                    <pre className="text-[10px] text-destructive-600 mt-1 bg-destructive-200/20 rounded p-1 overflow-auto max-h-16">
                      {nr.error}
                    </pre>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          runs.map((run) => {
            const dur = new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
            return (
              <button
                key={run.runId}
                onClick={() => setSelectedRun(run)}
                className="flex items-center gap-2 w-full px-4 py-3 border-b border-default hover:bg-surface-200 transition-colors text-left"
              >
                {run.status === 'success' ? (
                  <CheckCircle size={14} className="text-brand-600 shrink-0" />
                ) : (
                  <XCircle size={14} className="text-destructive-600 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground">
                    {run.nodeResults.length} nodes &middot; {dur}ms
                  </div>
                  <div className="text-[10px] text-foreground-muted">
                    {new Date(run.startedAt).toLocaleString()}
                  </div>
                </div>
                <span className="text-xs text-foreground-muted">{run.runId.slice(0, 8)}</span>
              </button>
            )
          })
        )}
        {runs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-foreground-muted">
            <Clock size={24} className="mb-2 opacity-40" />
            <span className="text-xs">No runs yet</span>
          </div>
        )}
      </div>
    </div>
  )
}
