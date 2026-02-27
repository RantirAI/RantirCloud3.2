
import React, { useEffect, useRef, useCallback } from "react";
import { 
  ReactFlow, 
  SelectionMode,
  ConnectionLineType,
  Background,
  Controls,
  BackgroundVariant,
  NodeTypes,
  EdgeTypes,
  OnError,
  useReactFlow
  } from "@xyflow/react";
  import '@xyflow/react/dist/style.css';
  import './FlowBuilderStyles.css';
  import { BaseNode } from './nodes/BaseNode';
  import { ConditionalNode } from './nodes/ConditionalNode';
  import { LoopNode } from './nodes/LoopNode';
  import { ForEachLoopNode } from './nodes/ForEachLoopNode';
  import { StraightEdge } from './edges/StraightEdge';
  import { StepEdge } from './edges/StepEdge';
  import { FlowNode } from '@/types/flowTypes';
  import { useFlowStore } from '@/lib/flow-store';

// Define custom node types
const defaultNodeTypes: NodeTypes = {
  custom: BaseNode,
  conditional: ConditionalNode, // Dedicated conditional node type
  condition: ConditionalNode,   // Also map for backwards compatibility
  loop: LoopNode,
  'for-each-loop': ForEachLoopNode, // New branching loop node
};

// Define edge types - straight for normal, step for conditional branches
const defaultEdgeTypes: EdgeTypes = {
  straight: StraightEdge,
  step: StepEdge,
  smoothstep: StepEdge // Alias for compatibility
};

interface FlowCanvasProps {
  nodes: FlowNode[];
  edges: any[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (params: any) => void;
  onNodeClick?: (event: React.MouseEvent, node: FlowNode) => void;
  onPaneClick?: () => void;
  onEdgeClick?: (event: React.MouseEvent, edge: any) => void;
  onNodeDragStart?: (event: React.MouseEvent, node: FlowNode) => void;
  onNodeDragStop?: (event: React.MouseEvent, node: FlowNode) => void;
  onSelectionChange?: (elements: { nodes: FlowNode[], edges: any[] }) => void;
  onNodeDoubleClick?: (event: React.MouseEvent, node: FlowNode) => void;
  connectionLineType?: ConnectionLineType;
  snapToGrid?: boolean;
  snapGrid?: [number, number];
  deleteKeyCode?: string;
  multiSelectionKeyCode?: string;
  selectionOnDrag?: boolean;
  panOnDrag?: boolean;
  selectionMode?: SelectionMode;
  fitView?: boolean;
  fitViewOptions?: any;
  children?: React.ReactNode;
  elementsSelectable?: boolean;
  onError?: OnError;
  nodeTypes?: NodeTypes;
  edgeTypes?: EdgeTypes;
  onDragOver?: React.DragEventHandler;
  onDrop?: React.DragEventHandler;
}

// Inner component that has access to ReactFlow context
function FlowCanvasInner({ 
  nodes, 
  edges, 
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onEdgeClick,
  onNodeDragStart,
  onNodeDragStop,
  onSelectionChange,
  onNodeDoubleClick,
  connectionLineType = ConnectionLineType.SmoothStep,
  snapToGrid = false,
  snapGrid = [1, 1],
  edgeTypes: customEdgeTypes,
  deleteKeyCode = 'Delete',
  multiSelectionKeyCode = 'Control',
  selectionOnDrag = false,
  panOnDrag = true,
  selectionMode = SelectionMode.Full,
  fitView = true,
  fitViewOptions = { padding: 0.2 },
  children,
  nodeTypes: customNodeTypes,
  elementsSelectable = true,
  onError,
  onDragOver,
  onDrop
}: FlowCanvasProps) {
  const { fitView: reactFlowFitView, getViewport, setViewport } = useReactFlow();
  const { 
    isFlowRunning, 
    isSingleNodeTesting, 
    flowProjectId,
    flowEndTime,
    userHasAdjustedViewport,
    setUserHasAdjustedViewport,
    setLastViewport,
  } = useFlowStore();
  
  const hasFitViewOnce = useRef(false);

  // Restore saved viewport on mount
  useEffect(() => {
    if (!flowProjectId) return;
    
    const savedViewportKey = `flow-viewport-${flowProjectId}`;
    const savedViewport = localStorage.getItem(savedViewportKey);
    
    if (savedViewport) {
      try {
        const vp = JSON.parse(savedViewport);
        setViewport(vp, { duration: 0 });
        hasFitViewOnce.current = true;
        console.debug('[FlowCanvas] Restored saved viewport:', vp);
      } catch (e) {
        console.warn('[FlowCanvas] Failed to restore viewport:', e);
      }
    }
  }, [flowProjectId, setViewport]);

  // Initial fit view only once, if no saved viewport and user hasn't adjusted
  useEffect(() => {
    if (hasFitViewOnce.current) return;
    if (isFlowRunning || isSingleNodeTesting) return;
    if (userHasAdjustedViewport) return;
    if (nodes.length === 0) return;
    
    const savedViewportKey = `flow-viewport-${flowProjectId}`;
    const savedViewport = localStorage.getItem(savedViewportKey);
    
    if (!savedViewport) {
      const timer = setTimeout(() => {
        reactFlowFitView({ padding: 0.3, duration: 0 });
        hasFitViewOnce.current = true;
        console.debug('[FlowCanvas] Initial fit view completed');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, reactFlowFitView, isFlowRunning, isSingleNodeTesting, userHasAdjustedViewport, flowProjectId]);

  return (
    <>
      <Controls className="rounded-md overflow-hidden shadow-sm border border-border bg-background" />
      <Background gap={16} size={1.5} color="hsl(var(--muted-foreground) / 0.2)" variant={BackgroundVariant.Dots} />
      {children}
    </>
  );
}

export default function FlowCanvas(props: FlowCanvasProps) {
  const { 
    isFlowRunning, 
    flowEndTime, 
    flowProjectId,
    userHasAdjustedViewport,
    setUserHasAdjustedViewport,
    setLastViewport,
  } = useFlowStore();
  const { getViewport, setViewport } = useReactFlow();
  const viewportRef = useRef<{ x: number; y: number; zoom: number } | null>(null);

  // Track user viewport adjustments
  const handleMove = useCallback(() => {
    if (!userHasAdjustedViewport) {
      setUserHasAdjustedViewport(true);
      console.debug('[FlowCanvas] User adjusted viewport');
    }
  }, [userHasAdjustedViewport, setUserHasAdjustedViewport]);

  const handleMoveEnd = useCallback(() => {
    if (!flowProjectId) return;
    
    const vp = getViewport();
    setLastViewport(vp);
    
    const savedViewportKey = `flow-viewport-${flowProjectId}`;
    localStorage.setItem(savedViewportKey, JSON.stringify(vp));
    console.debug('[FlowCanvas] Saved viewport:', vp);
  }, [flowProjectId, getViewport, setLastViewport]);

  // Lock and restore viewport while flow is running
  useEffect(() => {
    if (isFlowRunning) {
      try {
        const vp = getViewport();
        viewportRef.current = vp;
        console.debug('[FlowCanvas] viewport locked', vp);
        setViewport(vp, { duration: 0 });
      } catch (e) {
        console.warn('[FlowCanvas] lockViewport error', e);
      }

      const handleResize = () => {
        requestAnimationFrame(() => {
          if (isFlowRunning && viewportRef.current) {
            setViewport(viewportRef.current, { duration: 0 });
            console.debug('[FlowCanvas] re-applied viewport', { reason: 'resize', viewport: viewportRef.current });
          }
        });
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    } else {
      // Cool-down guard: prevent auto-fit right after flow ends
      if (flowEndTime && Date.now() - flowEndTime < 1000) {
        console.debug('[FlowCanvas] Skipping viewport reset - cool-down period active');
      }
      viewportRef.current = null;
    }
  }, [isFlowRunning, flowEndTime, getViewport, setViewport]);

  // Defensive re-apply if structure changes during run
  useEffect(() => {
    if (isFlowRunning && viewportRef.current) {
      setViewport(viewportRef.current, { duration: 0 });
      console.debug('[FlowCanvas] re-applied viewport', { reason: 'nodes-length-change', viewport: viewportRef.current });
    }
  }, [isFlowRunning, props.nodes.length, setViewport]);

  useEffect(() => {
    if (isFlowRunning && viewportRef.current) {
      setViewport(viewportRef.current, { duration: 0 });
      console.debug('[FlowCanvas] re-applied viewport', { reason: 'edges-length-change', viewport: viewportRef.current });
    }
  }, [isFlowRunning, props.edges.length, setViewport]);

  return (
    <ReactFlow
      nodes={props.nodes}
      edges={props.edges}
      onNodesChange={props.onNodesChange}
      onEdgesChange={props.onEdgesChange}
      onConnect={props.onConnect}
      onNodeClick={props.onNodeClick}
      onPaneClick={props.onPaneClick}
      onEdgeClick={props.onEdgeClick}
      onNodeDragStart={props.onNodeDragStart}
      onNodeDragStop={props.onNodeDragStop}
      onSelectionChange={props.onSelectionChange}
      onNodeDoubleClick={props.onNodeDoubleClick}
      nodeTypes={props.nodeTypes || defaultNodeTypes}
      edgeTypes={props.edgeTypes || defaultEdgeTypes}
      connectionLineType={props.connectionLineType || ConnectionLineType.SmoothStep}
      snapToGrid={props.snapToGrid || false}
      snapGrid={props.snapGrid || [1, 1]}
      deleteKeyCode={props.deleteKeyCode || 'Delete'}
      multiSelectionKeyCode={props.multiSelectionKeyCode || 'Control'}
      selectionOnDrag={props.selectionOnDrag || false}
      panOnDrag={(props.panOnDrag !== false) && !isFlowRunning}
      zoomOnScroll={!isFlowRunning}
      zoomOnPinch={!isFlowRunning}
      zoomOnDoubleClick={!isFlowRunning}
      selectionMode={props.selectionMode || SelectionMode.Full}
      fitView={false}
      fitViewOptions={props.fitViewOptions || { padding: 0.2 }}
      elementsSelectable={props.elementsSelectable !== false}
      onError={props.onError}
      onDragOver={props.onDragOver}
      onDrop={props.onDrop}
      className="h-full w-full"
      nodesDraggable={false}
      nodesConnectable={true}
      nodesFocusable={true}
      edgesFocusable={false}
      onMove={handleMove}
      onMoveEnd={handleMoveEnd}
      defaultEdgeOptions={{
        type: 'straight',
        animated: false,
        style: {
          strokeWidth: 0.75, // Thin but visible
          stroke: 'hsl(var(--muted-foreground) / 0.4)', // Darker and more visible
          strokeLinecap: 'round',
          strokeDasharray: '0',
        },
      }}
    >
      <FlowCanvasInner {...props} />
    </ReactFlow>
  );
}