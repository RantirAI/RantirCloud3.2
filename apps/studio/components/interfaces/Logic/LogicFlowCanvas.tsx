import { useCallback, useState, useRef, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { FlowBaseNode } from './FlowBaseNode'
import { NodePalette } from './NodePalette'
import { NodeInspector } from './NodeInspector'
import { IntegrationInstallDrawer } from './IntegrationInstallDrawer'
import { FlowEditorHeader, type HeaderTab } from './FlowEditorHeader'
import { RunResultsPanel } from './RunResultsPanel'
import { VariablesSecretsDrawer, getFlowVariables, getFlowSecrets } from './VariablesSecretsDrawer'
import { MonitoringDrawer, saveFlowRun } from './MonitoringDrawer'
import { legacyNodeRegistry } from './legacyNodes/registry'
import type { FlowRunResult } from 'lib/logic/FlowExecutor'

const nodeTypes = { custom: FlowBaseNode }

function LogicFlowCanvasInner() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [installDrawerOpen, setInstallDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<HeaderTab>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [lastRun, setLastRun] = useState<FlowRunResult | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, 'success' | 'error'>>({})
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

  const projectId = typeof window !== 'undefined'
    ? window.location.pathname.split('/')[2] || 'default'
    : 'default'

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  )

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  )
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  )
  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge({ ...connection, type: 'smoothstep' }, eds)),
    []
  )
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id)
    setActiveTab(null)
    setShowResults(false)
  }, [])
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  const addNodeToCanvas = useCallback(
    (type: string, name: string, position?: { x: number; y: number }) => {
      const plugin = legacyNodeRegistry.getPlugin(type)
      const pos = position || { x: 250 + Math.random() * 200, y: 100 + nodes.length * 120 }
      const newNode: Node = {
        id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        type: 'custom',
        position: pos,
        data: { type, label: plugin?.name || name, config: {} },
      }
      setNodes((nds) => [...nds, newNode])
      setSelectedNodeId(newNode.id)
    },
    [nodes.length]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) return
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const plugin = legacyNodeRegistry.getPlugin(type)
      addNodeToCanvas(type, plugin?.name || type, position)
    },
    [screenToFlowPosition, addNodeToCanvas]
  )

  const updateNodeData = useCallback((nodeId: string, data: Record<string, any>) => {
    setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data } : n)))
  }, [])

  const handleRunFlow = useCallback(async () => {
    if (nodes.length === 0) return
    setIsRunning(true)
    setNodeStatuses({})
    setShowResults(false)
    setSelectedNodeId(null)
    setActiveTab(null)

    try {
      const variables = getFlowVariables(projectId)
      const secrets = getFlowSecrets(projectId)

      const resp = await fetch('/api/logic/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges, variables, secrets, projectId }),
      })

      const result: FlowRunResult = await resp.json()
      setLastRun(result)
      setShowResults(true)

      const statuses: Record<string, 'success' | 'error'> = {}
      for (const nr of result.nodeResults) {
        statuses[nr.nodeId] = nr.status === 'success' ? 'success' : 'error'
      }
      setNodeStatuses(statuses)

      saveFlowRun(projectId, result)
    } catch (err: any) {
      setLastRun({
        runId: 'error',
        status: 'error',
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        nodeResults: [],
        error: err.message,
      })
      setShowResults(true)
    } finally {
      setIsRunning(false)
    }
  }, [nodes, edges, projectId])

  const handleSave = useCallback(() => {
    const key = `rantir-flow-data-${projectId}`
    localStorage.setItem(key, JSON.stringify({ nodes, edges }))
  }, [nodes, edges, projectId])

  const handleTabChange = useCallback((tab: HeaderTab) => {
    setActiveTab(tab)
    setSelectedNodeId(null)
    setShowResults(false)
  }, [])

  // Apply execution status as node class
  const styledNodes = useMemo(
    () =>
      nodes.map((n) => {
        const status = nodeStatuses[n.id]
        return status ? { ...n, data: { ...n.data, _runStatus: status } } : n
      }),
    [nodes, nodeStatuses]
  )

  const rightPanel = (() => {
    if (showResults && lastRun) {
      return <RunResultsPanel result={lastRun} onClose={() => setShowResults(false)} />
    }
    if (activeTab === 'variables') {
      return (
        <VariablesSecretsDrawer
          open
          onClose={() => setActiveTab(null)}
          projectId={projectId}
        />
      )
    }
    if (activeTab === 'monitoring') {
      return (
        <MonitoringDrawer
          open
          onClose={() => setActiveTab(null)}
          projectId={projectId}
        />
      )
    }
    if (activeTab === 'deploy') {
      return <DeployPanel projectId={projectId} onClose={() => setActiveTab(null)} />
    }
    if (selectedNode) {
      return (
        <NodeInspector
          node={selectedNode}
          onClose={() => setSelectedNodeId(null)}
          onUpdateNodeData={updateNodeData}
        />
      )
    }
    return null
  })()

  return (
    <div className="flex flex-col h-full w-full">
      <FlowEditorHeader
        flowName={`Flow — ${projectId}`}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onRunFlow={handleRunFlow}
        onSaveFlow={handleSave}
        isRunning={isRunning}
        lastRunStatus={lastRun?.status ?? null}
      />

      <div className="flex flex-1 overflow-hidden">
        <NodePalette
          onAddNode={addNodeToCanvas}
          onOpenInstallDrawer={() => setInstallDrawerOpen(true)}
        />

        <div className="flex-1 h-full" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={styledNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls />
            <MiniMap className="!bg-surface-200 !border-default" />
          </ReactFlow>
        </div>

        {rightPanel}
      </div>

      <IntegrationInstallDrawer
        open={installDrawerOpen}
        onClose={() => setInstallDrawerOpen(false)}
      />
    </div>
  )
}

function DeployPanel({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const slug = projectId.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const endpoint = `${baseUrl}/api/logic/flows/${slug}`

  return (
    <div className="flex flex-col h-full border-l border-default bg-surface-100 w-[360px]">
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <span className="text-sm font-medium text-foreground">Deploy</span>
        <button onClick={onClose} className="rounded p-1 hover:bg-surface-200">
          <span className="text-foreground-light text-xs">×</span>
        </button>
      </div>
      <div className="px-4 py-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">API Endpoint</label>
          <div className="rounded-md border border-default bg-surface-200 px-3 py-2 text-xs font-mono text-foreground break-all">
            {endpoint}
          </div>
          <p className="text-[10px] text-foreground-muted mt-1">
            POST flow data to this endpoint to execute remotely.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Slug</label>
          <input
            readOnly
            value={slug}
            className="w-full rounded-md border border-default bg-surface-200 px-3 py-2 text-xs font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">cURL Example</label>
          <pre className="rounded-md border border-default bg-surface-200 px-3 py-2 text-[10px] font-mono text-foreground overflow-auto max-h-32 whitespace-pre-wrap">
{`curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '{"nodes": [...], "edges": [...]}'`}
          </pre>
        </div>
      </div>
    </div>
  )
}

export function LogicFlowCanvas() {
  return (
    <ReactFlowProvider>
      <LogicFlowCanvasInner />
    </ReactFlowProvider>
  )
}
