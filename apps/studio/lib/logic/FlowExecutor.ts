/**
 * FlowExecutor — Runs a Logic flow graph by invoking Supabase Edge Functions.
 *
 * Edge function convention (from imports/supabase/functions):
 *   - Request: POST JSON body with { action, apiKey?, ...params }
 *   - Response: JSON with operation-specific shape
 *   - Secrets come in body (apiKey field), resolved via {{env.SECRET_NAME}} pattern
 *   - Function name = node-type + "-proxy" or "-action" (see function-manifest.json)
 *
 * Execution model:
 *   - DAG only (no loops for prototype)
 *   - Topological sort by edges
 *   - Each node's output is stored in context and passed to downstream nodes
 */

import functionManifest from './function-manifest.json'

export interface FlowNode {
  id: string
  type: string
  data: Record<string, any>
  position: { x: number; y: number }
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

export interface FlowRunInput {
  nodes: FlowNode[]
  edges: FlowEdge[]
  variables?: Record<string, any>
  secrets?: Record<string, string>
  projectId?: string
}

export interface NodeRunResult {
  nodeId: string
  nodeType: string
  functionName: string
  status: 'success' | 'error' | 'skipped'
  startedAt: string
  finishedAt: string
  input: Record<string, any>
  output: Record<string, any> | null
  error: string | null
}

export interface FlowRunResult {
  runId: string
  status: 'success' | 'error'
  startedAt: string
  finishedAt: string
  nodeResults: NodeRunResult[]
  error?: string
}

const fnMap = functionManifest as Record<string, string>

export function getFunctionName(nodeType: string): string {
  return fnMap[nodeType] || `${nodeType}-proxy`
}

function topologicalSort(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()

  for (const n of nodes) {
    inDegree.set(n.id, 0)
    adj.set(n.id, [])
  }
  for (const e of edges) {
    adj.get(e.source)?.push(e.target)
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1)
  }

  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const sorted: FlowNode[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    const node = nodeMap.get(id)
    if (node) sorted.push(node)
    for (const child of adj.get(id) || []) {
      inDegree.set(child, (inDegree.get(child) || 0) - 1)
      if (inDegree.get(child) === 0) queue.push(child)
    }
  }
  return sorted
}

function resolveSecrets(
  value: any,
  secrets: Record<string, string>
): any {
  if (typeof value === 'string') {
    const match = value.match(/^\{\{env\.(.+?)\}\}$/)
    if (match) return secrets[match[1]] ?? value
    return value
  }
  if (Array.isArray(value)) return value.map((v) => resolveSecrets(v, secrets))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, resolveSecrets(v, secrets)])
    )
  }
  return value
}

export async function executeFlow(
  input: FlowRunInput,
  supabaseUrl: string,
  supabaseKey: string
): Promise<FlowRunResult> {
  const runId = crypto.randomUUID()
  const startedAt = new Date().toISOString()
  const nodeResults: NodeRunResult[] = []
  const outputContext = new Map<string, Record<string, any>>()

  const sorted = topologicalSort(input.nodes, input.edges)

  let flowStatus: 'success' | 'error' = 'success'
  let flowError: string | undefined

  for (const node of sorted) {
    const nodeType = (node.data?.type as string) || node.type || 'unknown'
    const functionName = getFunctionName(nodeType)
    const nodeStart = new Date().toISOString()

    const upstreamEdges = input.edges.filter((e) => e.target === node.id)
    const upstreamOutputs: Record<string, any> = {}
    for (const e of upstreamEdges) {
      const out = outputContext.get(e.source)
      if (out) upstreamOutputs[e.source] = out
    }

    const config = resolveSecrets(node.data?.config || {}, input.secrets || {})

    const payload = {
      ...config,
      action: config.action || nodeType,
      nodeId: node.id,
      nodeType,
      flowProjectId: input.projectId,
      upstreamOutputs,
      variables: input.variables || {},
    }

    let result: NodeRunResult

    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify(payload),
      })

      const body = await resp.json().catch(() => ({ raw: await resp.text() }))

      if (!resp.ok) {
        result = {
          nodeId: node.id,
          nodeType,
          functionName,
          status: 'error',
          startedAt: nodeStart,
          finishedAt: new Date().toISOString(),
          input: payload,
          output: body,
          error: body?.error || body?.message || `HTTP ${resp.status}`,
        }
        flowStatus = 'error'
        flowError = `Node ${node.id} (${nodeType}) failed: ${result.error}`
        nodeResults.push(result)
        break
      }

      outputContext.set(node.id, body)
      result = {
        nodeId: node.id,
        nodeType,
        functionName,
        status: 'success',
        startedAt: nodeStart,
        finishedAt: new Date().toISOString(),
        input: payload,
        output: body,
        error: null,
      }
    } catch (err: any) {
      result = {
        nodeId: node.id,
        nodeType,
        functionName,
        status: 'error',
        startedAt: nodeStart,
        finishedAt: new Date().toISOString(),
        input: payload,
        output: null,
        error: err.message || String(err),
      }
      flowStatus = 'error'
      flowError = `Node ${node.id} (${nodeType}) threw: ${result.error}`
      nodeResults.push(result)
      break
    }

    nodeResults.push(result)
  }

  return {
    runId,
    status: flowStatus,
    startedAt,
    finishedAt: new Date().toISOString(),
    nodeResults,
    error: flowError,
  }
}
