import { useState, useEffect } from 'react'
import { X, Settings2, Code, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from 'ui'
import type { Node } from '@xyflow/react'
import { legacyNodeRegistry } from './legacyNodes/registry'
import type { NodeInput } from './legacyNodes/types'

interface NodeInspectorProps {
  node: Node | null
  onClose: () => void
  onUpdateNodeData: (nodeId: string, data: Record<string, any>) => void
}

export function NodeInspector({ node, onClose, onUpdateNodeData }: NodeInspectorProps) {
  if (!node) return null

  const nodeType = (node.data?.type as string) || 'unknown'
  const plugin = legacyNodeRegistry.getPlugin(nodeType)
  const hasSchema = plugin?.inputs && plugin.inputs.length > 0

  return (
    <div className="flex flex-col h-full border-l border-default bg-surface-100 w-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Settings2 size={14} className="text-foreground-light shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {plugin?.name || nodeType}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 hover:bg-surface-200 transition-colors"
        >
          <X size={14} className="text-foreground-light" />
        </button>
      </div>

      {/* Description */}
      {plugin?.description && (
        <div className="px-4 py-2 border-b border-default">
          <p className="text-xs text-foreground-muted">{plugin.description}</p>
        </div>
      )}

      {/* Config */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {hasSchema ? (
          <SchemaFields
            inputs={plugin!.inputs!}
            values={(node.data?.config as Record<string, any>) || {}}
            onChange={(values) => onUpdateNodeData(node.id, { ...node.data, config: values })}
          />
        ) : (
          <JsonEditor
            value={(node.data?.config as Record<string, any>) || {}}
            onChange={(values) => onUpdateNodeData(node.id, { ...node.data, config: values })}
          />
        )}
      </div>

      {/* Node meta */}
      <div className="border-t border-default px-4 py-2">
        <div className="flex items-center justify-between text-[10px] text-foreground-muted">
          <span>Type: {nodeType}</span>
          <span>ID: {node.id.slice(0, 12)}</span>
        </div>
      </div>
    </div>
  )
}

function SchemaFields({
  inputs,
  values,
  onChange,
}: {
  inputs: NodeInput[]
  values: Record<string, any>
  onChange: (v: Record<string, any>) => void
}) {
  const update = (name: string, value: any) => {
    onChange({ ...values, [name]: value })
  }

  return (
    <div className="space-y-3">
      {inputs
        .filter((inp) => {
          if (!inp.showWhen) return true
          return inp.showWhen.values.includes(values[inp.showWhen.field])
        })
        .map((input) => (
          <div key={input.name}>
            <label className="block text-xs font-medium text-foreground mb-1">
              {input.label}
              {input.required && <span className="text-destructive-600 ml-0.5">*</span>}
            </label>
            {input.description && (
              <p className="text-[10px] text-foreground-muted mb-1">{input.description}</p>
            )}
            {renderInputField(input, values[input.name] ?? input.default ?? '', (v) =>
              update(input.name, v)
            )}
          </div>
        ))}
    </div>
  )
}

function renderInputField(
  input: NodeInput,
  value: any,
  onChange: (v: any) => void
) {
  const baseClass =
    'w-full rounded-md border border-default bg-surface-200 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500'

  switch (input.type) {
    case 'select':
      return (
        <select value={value || ''} onChange={(e) => onChange(e.target.value)} className={baseClass}>
          <option value="">Select...</option>
          {input.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )
    case 'boolean':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded border-default"
          />
          <span className="text-xs text-foreground-light">{value ? 'Enabled' : 'Disabled'}</span>
        </label>
      )
    case 'number':
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
          placeholder={input.placeholder}
          className={baseClass}
        />
      )
    case 'textarea':
    case 'code':
      return (
        <textarea
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={input.placeholder}
          rows={4}
          className={cn(baseClass, 'font-mono resize-y')}
        />
      )
    default:
      return (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={input.placeholder}
          className={baseClass}
        />
      )
  }
}

function JsonEditor({
  value,
  onChange,
}: {
  value: Record<string, any>
  onChange: (v: Record<string, any>) => void
}) {
  const [text, setText] = useState(JSON.stringify(value, null, 2))
  const [error, setError] = useState('')

  useEffect(() => {
    setText(JSON.stringify(value, null, 2))
  }, [value])

  const handleBlur = () => {
    try {
      const parsed = JSON.parse(text)
      onChange(parsed)
      setError('')
    } catch {
      setError('Invalid JSON')
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Code size={12} className="text-foreground-muted" />
        <span className="text-xs font-medium text-foreground">Configuration (JSON)</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        rows={12}
        className="w-full rounded-md border border-default bg-surface-200 px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500 resize-y"
      />
      {error && <p className="text-[10px] text-destructive-600 mt-1">{error}</p>}
    </div>
  )
}
