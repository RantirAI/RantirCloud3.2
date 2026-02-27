/**
 * Node plugin type system — mirrors the legacy Rantir Cloud types.
 * Source: imports/legacy_rantircloud/types/node-plugin.ts
 */

export type NodeInputType =
  | 'text'
  | 'select'
  | 'number'
  | 'code'
  | 'variable'
  | 'textarea'
  | 'boolean'
  | 'databaseSelector'
  | 'tableSelector'
  | 'webflowFieldMapping'
  | 'webflowSelect'
  | 'clicdataSelect'
  | 'loopVariables'
  | 'queryParamsEditor'
  | 'hidden'

export interface NodeInputOption {
  label: string
  value: string
  description?: string
}

export interface NodeInput {
  name: string
  label: string
  type: NodeInputType
  required?: boolean
  default?: any
  options?: NodeInputOption[]
  description?: string
  placeholder?: string
  language?: 'javascript' | 'json'
  isApiKey?: boolean
  dependsOnApiKey?: boolean
  showWhen?: { field: string; values: any[] }
}

export interface NodeOutput {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
}

export type NodeCategory = 'trigger' | 'action' | 'condition' | 'transformer'

export interface NodePlugin {
  type: string
  name: string
  description: string
  category: NodeCategory
  icon?: any
  color?: string
  inputs?: NodeInput[]
  outputs?: NodeOutput[]
  getDynamicInputs?: (currentInputs: Record<string, any>) => NodeInput[]
  getDynamicOutputs?: (currentInputs: Record<string, any>) => NodeOutput[]
  execute?: (inputs: Record<string, any>, context: any) => Promise<Record<string, any>>
}

export const CORE_NODE_TYPES = new Set([
  'http-request',
  'api-request',
  'condition',
  'loop',
  'for-each-loop',
  'delay',
  'wait',
  'code',
  'javascript',
  'data-filter',
  'data-transformer',
  'json-parser',
  'text-processing',
  'calculator',
  'set-variable',
  'ai-agent',
  'ai-mapper',
  'data-table',
  'webhook',
  'webhook-trigger',
  'scheduler',
  'split',
  'merge',
  'end',
  'response',
  'logger',
  'resend',
])

export function isCoreNode(nodeType: string): boolean {
  return CORE_NODE_TYPES.has(nodeType)
}
