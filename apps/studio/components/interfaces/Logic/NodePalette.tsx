import { useState, useMemo } from 'react'
import {
  Search,
  Workflow,
  Zap,
  GitBranch,
  Repeat,
  Radio,
  GripVertical,
  Package,
  Download,
} from 'lucide-react'
import { cn } from 'ui'
import type { NodeCategory, NodePlugin } from './legacyNodes/types'
import { isCoreNode } from './legacyNodes/types'
import { legacyNodeRegistry } from './legacyNodes/registry'

const CATEGORY_TABS: { key: string; label: string; icon: typeof Zap }[] = [
  { key: 'all', label: 'All', icon: Package },
  { key: 'trigger', label: 'Trigger', icon: Radio },
  { key: 'action', label: 'Action', icon: Zap },
  { key: 'transformer', label: 'Transform', icon: Repeat },
  { key: 'condition', label: 'Condition', icon: GitBranch },
]

const CATEGORY_COLORS: Record<string, string> = {
  trigger: '#10B981',
  action: '#8B5CF6',
  transformer: '#F59E0B',
  condition: '#3B82F6',
}

interface NodePaletteProps {
  onAddNode: (type: string, name: string) => void
  installedTypes?: string[]
  onOpenInstallDrawer?: () => void
}

export function NodePalette({ onAddNode, installedTypes, onOpenInstallDrawer }: NodePaletteProps) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const allPlugins = useMemo(() => legacyNodeRegistry.getAllPlugins(), [])

  const filtered = useMemo(() => {
    let list = allPlugins
    if (activeCategory !== 'all') {
      list = list.filter((p) => p.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => {
      const aCore = isCoreNode(a.type) ? 0 : 1
      const bCore = isCoreNode(b.type) ? 0 : 1
      if (aCore !== bCore) return aCore - bCore
      return a.name.localeCompare(b.name)
    })
  }, [allPlugins, activeCategory, search])

  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('application/reactflow', type)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="flex flex-col h-full border-r border-default bg-surface-100 w-[260px]">
      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-foreground-light">
            Add Nodes
          </h3>
          <span className="text-xs text-foreground-muted">{filtered.length}</span>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-foreground-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="w-full rounded-md border border-default bg-surface-200 pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-0.5 px-3 pb-2 overflow-x-auto">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveCategory(tab.key)}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-xs whitespace-nowrap transition-colors',
              activeCategory === tab.key
                ? 'bg-brand-500 text-white'
                : 'text-foreground-light hover:bg-surface-200'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Install button */}
      {onOpenInstallDrawer && (
        <div className="px-3 pb-2">
          <button
            onClick={onOpenInstallDrawer}
            className="flex items-center gap-2 w-full rounded-md border border-dashed border-default px-3 py-2 text-xs text-foreground-light hover:bg-surface-200 transition-colors"
          >
            <Download size={12} />
            Browse integrations to install
          </button>
        </div>
      )}

      {/* Node list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {filtered.map((plugin) => (
          <button
            key={plugin.type}
            draggable
            onDragStart={(e) => handleDragStart(e, plugin.type)}
            onClick={() => onAddNode(plugin.type, plugin.name)}
            className="group flex items-center gap-2.5 w-full rounded-md px-2.5 py-2 text-left hover:bg-surface-200 transition-colors mb-0.5"
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
              style={{
                backgroundColor: `${plugin.color || '#6B7280'}20`,
              }}
            >
              <Workflow
                size={14}
                style={{ color: plugin.color || '#6B7280' }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-foreground truncate">
                  {plugin.name}
                </span>
                {isCoreNode(plugin.type) && (
                  <span className="shrink-0 rounded bg-brand-400/10 px-1 py-px text-[10px] text-brand-600">
                    core
                  </span>
                )}
              </div>
              <span className="text-[10px] text-foreground-muted truncate block">
                {plugin.type}
              </span>
            </div>
            <GripVertical
              size={12}
              className="shrink-0 text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-foreground-muted">
            <Package size={24} className="mb-2 opacity-50" />
            <span className="text-xs">No nodes found</span>
          </div>
        )}
      </div>
    </div>
  )
}
