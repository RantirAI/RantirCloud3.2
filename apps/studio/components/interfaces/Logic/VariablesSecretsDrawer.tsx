import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Eye, EyeOff, Key, Variable } from 'lucide-react'
import { cn } from 'ui'

const VAR_KEY = 'rantir-flow-variables'
const SEC_KEY = 'rantir-flow-secrets'

function loadJson(key: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}')
  } catch {
    return {}
  }
}

interface VariablesSecretsDrawerProps {
  open: boolean
  onClose: () => void
  projectId?: string
}

export function VariablesSecretsDrawer({ open, onClose, projectId }: VariablesSecretsDrawerProps) {
  const [tab, setTab] = useState<'variables' | 'secrets'>('variables')
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [secrets, setSecrets] = useState<Record<string, string>>({})
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setVariables(loadJson(`${VAR_KEY}-${projectId || 'default'}`))
    setSecrets(loadJson(`${SEC_KEY}-${projectId || 'default'}`))
  }, [projectId, open])

  const save = () => {
    localStorage.setItem(`${VAR_KEY}-${projectId || 'default'}`, JSON.stringify(variables))
    localStorage.setItem(`${SEC_KEY}-${projectId || 'default'}`, JSON.stringify(secrets))
  }

  const addEntry = () => {
    if (!newKey.trim()) return
    if (tab === 'variables') setVariables({ ...variables, [newKey]: newValue })
    else setSecrets({ ...secrets, [newKey]: newValue })
    setNewKey('')
    setNewValue('')
  }

  const removeEntry = (key: string) => {
    if (tab === 'variables') {
      const next = { ...variables }
      delete next[key]
      setVariables(next)
    } else {
      const next = { ...secrets }
      delete next[key]
      setSecrets(next)
    }
  }

  const entries = tab === 'variables' ? variables : secrets

  if (!open) return null

  return (
    <div className="flex flex-col h-full border-l border-default bg-surface-100 w-[360px]">
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <div className="flex items-center gap-2">
          <Key size={14} className="text-foreground-light" />
          <span className="text-sm font-medium text-foreground">Variables & Secrets</span>
        </div>
        <button onClick={onClose} className="rounded p-1 hover:bg-surface-200">
          <X size={14} className="text-foreground-light" />
        </button>
      </div>

      <div className="flex border-b border-default">
        {(['variables', 'secrets'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2 text-xs font-medium transition-colors',
              tab === t
                ? 'text-foreground border-b-2 border-brand-500'
                : 'text-foreground-light hover:text-foreground'
            )}
          >
            {t === 'variables' ? 'Variables' : 'Secrets'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {Object.entries(entries).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2 rounded-md border border-default bg-surface-200 p-2">
            <span className="text-xs font-mono font-medium text-foreground min-w-[80px] truncate">
              {key}
            </span>
            <span className="text-xs text-foreground-muted flex-1 truncate font-mono">
              {tab === 'secrets' && !showSecrets[key]
                ? '••••••••'
                : String(value).slice(0, 60)}
            </span>
            {tab === 'secrets' && (
              <button
                onClick={() => setShowSecrets({ ...showSecrets, [key]: !showSecrets[key] })}
                className="p-0.5"
              >
                {showSecrets[key] ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            )}
            <button onClick={() => removeEntry(key)} className="p-0.5 text-foreground-muted hover:text-destructive-600">
              <Trash2 size={12} />
            </button>
          </div>
        ))}

        <div className="flex gap-2 pt-2">
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Key"
            className="flex-1 rounded-md border border-default bg-surface-200 px-2 py-1.5 text-xs"
          />
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Value"
            className="flex-1 rounded-md border border-default bg-surface-200 px-2 py-1.5 text-xs"
          />
          <button
            onClick={addEntry}
            className="rounded-md bg-brand-500 px-2 py-1.5 text-xs text-white hover:bg-brand-600"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      <div className="border-t border-default px-4 py-3">
        <button
          onClick={() => { save(); onClose() }}
          className="w-full rounded-md bg-brand-500 py-2 text-xs font-medium text-white hover:bg-brand-600"
        >
          Save
        </button>
        {tab === 'secrets' && (
          <p className="text-[10px] text-foreground-muted mt-1 text-center">
            Prototype: secrets stored in localStorage. Use vault in production.
          </p>
        )}
      </div>
    </div>
  )
}

export function getFlowVariables(projectId?: string): Record<string, any> {
  return loadJson(`${VAR_KEY}-${projectId || 'default'}`)
}

export function getFlowSecrets(projectId?: string): Record<string, string> {
  return loadJson(`${SEC_KEY}-${projectId || 'default'}`)
}
