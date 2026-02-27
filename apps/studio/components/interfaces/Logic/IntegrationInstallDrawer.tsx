import { useState, useMemo, useEffect } from 'react'
import { X, Search, Download, Check, Package, ExternalLink, Loader2 } from 'lucide-react'
import { cn } from 'ui'
import { legacyNodeRegistry } from './legacyNodes/registry'
import { isCoreNode } from './legacyNodes/types'

const INSTALL_STORAGE_KEY = 'rantir-installed-nodes'

function getInstalledNodeTypes(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(INSTALL_STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function setInstalledNodeTypes(types: string[]) {
  localStorage.setItem(INSTALL_STORAGE_KEY, JSON.stringify(types))
}

export function useInstalledNodes() {
  const [installed, setInstalled] = useState<string[]>([])

  useEffect(() => {
    setInstalled(getInstalledNodeTypes())
  }, [])

  const install = (type: string) => {
    const next = [...new Set([...installed, type])]
    setInstalledNodeTypes(next)
    setInstalled(next)
  }

  const uninstall = (type: string) => {
    const next = installed.filter((t) => t !== type)
    setInstalledNodeTypes(next)
    setInstalled(next)
  }

  return { installed, install, uninstall }
}

interface IntegrationInstallDrawerProps {
  open: boolean
  onClose: () => void
  dbIntegrations?: Array<{ integration_id: string; name: string; icon?: string; description?: string }>
}

export function IntegrationInstallDrawer({
  open,
  onClose,
  dbIntegrations = [],
}: IntegrationInstallDrawerProps) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'available' | 'installed'>('available')
  const { installed, install, uninstall } = useInstalledNodes()

  const optionalNodes = useMemo(() => legacyNodeRegistry.getOptionalPlugins(), [])

  const dbMap = useMemo(() => {
    const map = new Map<string, (typeof dbIntegrations)[0]>()
    dbIntegrations.forEach((i) => map.set(i.integration_id, i))
    return map
  }, [dbIntegrations])

  const filtered = useMemo(() => {
    let list = tab === 'installed'
      ? optionalNodes.filter((p) => installed.includes(p.type))
      : optionalNodes

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [optionalNodes, search, tab, installed])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-[420px] bg-surface-100 border-l border-default flex flex-col h-full shadow-xl animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-default px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Integrations</h2>
            <p className="text-xs text-foreground-muted mt-0.5">
              {optionalNodes.length} available &middot; {installed.length} installed
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1.5 hover:bg-surface-200 transition-colors">
            <X size={16} className="text-foreground-light" />
          </button>
        </div>

        {/* Search + Tabs */}
        <div className="px-5 pt-3 pb-2 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-foreground-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search integrations..."
              className="w-full rounded-md border border-default bg-surface-200 pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setTab('available')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs transition-colors',
                tab === 'available' ? 'bg-brand-500 text-white' : 'text-foreground-light hover:bg-surface-200'
              )}
            >
              Available ({optionalNodes.length})
            </button>
            <button
              onClick={() => setTab('installed')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs transition-colors',
                tab === 'installed' ? 'bg-brand-500 text-white' : 'text-foreground-light hover:bg-surface-200'
              )}
            >
              Installed ({installed.length})
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {filtered.map((plugin) => {
            const isInstalled = installed.includes(plugin.type)
            const dbEntry = dbMap.get(plugin.type)
            return (
              <div
                key={plugin.type}
                className="flex items-center gap-3 rounded-lg border border-default bg-surface-100 p-3 mb-2 hover:bg-surface-200 transition-colors"
              >
                {dbEntry?.icon ? (
                  <img src={dbEntry.icon} alt="" className="h-8 w-8 rounded-md object-contain" />
                ) : (
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${plugin.color || '#6B7280'}20` }}
                  >
                    <Package size={14} style={{ color: plugin.color || '#6B7280' }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">
                    {dbEntry?.name || plugin.name}
                  </div>
                  <div className="text-[10px] text-foreground-muted truncate">
                    {(dbEntry?.description || plugin.description || '').slice(0, 80)}
                  </div>
                </div>
                <button
                  onClick={() => (isInstalled ? uninstall(plugin.type) : install(plugin.type))}
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors shrink-0',
                    isInstalled
                      ? 'bg-green-500/10 text-green-600 hover:bg-red-500/10 hover:text-red-600'
                      : 'bg-brand-500 text-white hover:bg-brand-600'
                  )}
                >
                  {isInstalled ? (
                    <>
                      <Check size={12} /> Installed
                    </>
                  ) : (
                    <>
                      <Download size={12} /> Install
                    </>
                  )}
                </button>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-foreground-muted">
              <Package size={28} className="mb-2 opacity-40" />
              <span className="text-xs">No integrations found</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
