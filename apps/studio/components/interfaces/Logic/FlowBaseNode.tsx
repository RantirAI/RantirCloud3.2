import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Workflow } from 'lucide-react'
import { cn } from 'ui'
import { legacyNodeRegistry } from './legacyNodes/registry'
import type { NodeCategory } from './legacyNodes/types'

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  trigger: '#10B981',
  action: '#8B5CF6',
  transformer: '#F59E0B',
  condition: '#3B82F6',
}

const CATEGORY_LABELS: Record<NodeCategory, string> = {
  trigger: 'trigger',
  action: 'action',
  transformer: 'transformer',
  condition: 'condition',
}

function FlowBaseNodeInner({ id, data, selected }: NodeProps) {
  const nodeType = (data?.type as string) || 'unknown'
  const plugin = legacyNodeRegistry.getPlugin(nodeType)
  const label = (data?.label as string) || plugin?.name || nodeType
  const category = (plugin?.category || 'action') as NodeCategory
  const color = plugin?.color || CATEGORY_COLORS[category] || '#6B7280'

  return (
    <div className="relative">
      {/* Category badge */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white whitespace-nowrap"
          style={{ backgroundColor: color }}
        >
          {CATEGORY_LABELS[category]}
        </span>
      </div>

      {/* Input handle */}
      {category !== 'trigger' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-foreground-muted !border-2 !border-surface-100"
        />
      )}

      {/* Node card */}
      <div
        className={cn(
          'rounded-lg border-2 bg-surface-100 px-4 py-3 shadow-sm transition-all min-w-[180px] max-w-[220px]',
          selected ? 'border-brand-500 shadow-md' : 'border-default hover:border-foreground-muted'
        )}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: `${color}20` }}
          >
            <Workflow size={16} style={{ color }} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-foreground truncate">{label}</div>
            <div className="text-[10px] text-foreground-muted truncate">{nodeType}</div>
          </div>
        </div>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-foreground-muted !border-2 !border-surface-100"
      />
    </div>
  )
}

export const FlowBaseNode = memo(FlowBaseNodeInner)
