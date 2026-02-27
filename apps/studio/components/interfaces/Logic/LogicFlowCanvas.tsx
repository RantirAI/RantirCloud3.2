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
import { legacyNodeRegistry } from './legacyNodes/registry'

const nodeTypes = { custom: FlowBaseNode }

function LogicFlowCanvasInner() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [installDrawerOpen, setInstallDrawerOpen] = useState(false)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

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
        data: {
          type,
          label: plugin?.name || name,
          config: {},
        },
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

  return (
    <div className="flex h-full w-full">
      {/* Left: Node Palette */}
      <NodePalette
        onAddNode={addNodeToCanvas}
        onOpenInstallDrawer={() => setInstallDrawerOpen(true)}
      />

      {/* Center: React Flow Canvas */}
      <div className="flex-1 h-full" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
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
          <MiniMap
            nodeStrokeWidth={3}
            className="!bg-surface-200 !border-default"
          />
        </ReactFlow>
      </div>

      {/* Right: Inspector */}
      {selectedNode && (
        <NodeInspector
          node={selectedNode}
          onClose={() => setSelectedNodeId(null)}
          onUpdateNodeData={updateNodeData}
        />
      )}

      {/* Install drawer */}
      <IntegrationInstallDrawer
        open={installDrawerOpen}
        onClose={() => setInstallDrawerOpen(false)}
      />
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
