import { create } from 'zustand';
import { Node, Edge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import { nodeRegistry } from './node-registry';
import { FlowNode } from '@/types/flowTypes';
import { flowMonitoringService } from '@/services/flowMonitoringService';
import { flowService } from '@/services/flowService';
import { applyDagreLayout } from '@/lib/dagre-layout';
import { treeLayoutManager } from '@/lib/tree-layout';
import { activityService } from '@/services/activityService';
import { useFlowHistoryStore } from '@/stores/flowHistoryStore';

// Helper to find if a node is part of a conditional branch (traces back through edges)
// Now supports multi-branch handles (not just 'true'/'false')
function findBranchAncestry(
  nodeId: string, 
  edges: Edge[], 
  nodes: FlowNode[]
): { conditionalNodeId: string; branchType: string } | null {
  const visited = new Set<string>();
  
  const traverse = (currentNodeId: string): { conditionalNodeId: string; branchType: string } | null => {
    if (visited.has(currentNodeId)) return null;
    visited.add(currentNodeId);
    
    // Find incoming edge to this node
    const incomingEdge = edges.find(e => e.target === currentNodeId);
    if (!incomingEdge) return null;
    
    const sourceNode = nodes.find(n => n.id === incomingEdge.source);
    if (!sourceNode) return null;
    
    // Check if source is a conditional node with ANY valid branch handle (including multi-branch)
    const isCondition = sourceNode.type === 'conditional' || sourceNode.data?.type === 'condition';
    if (isCondition && incomingEdge.sourceHandle != null) {
      return {
        conditionalNodeId: sourceNode.id,
        branchType: incomingEdge.sourceHandle
      };
    }
    
    // Recurse up the tree
    return traverse(incomingEdge.source);
  };
  
  return traverse(nodeId);
}
interface DebugLog {
  nodeId: string;
  nodeName: string;
  type: 'info' | 'error' | 'output' | 'warning';
  message: string;
  timestamp: number;
  data?: any;
}

interface FlowState {
  nodes: FlowNode[];
  edges: Edge[];
  runningEdges: string[];
  debugLogs: DebugLog[];
  flowStartTime: number | null;
  flowEndTime: number | null;
  isFlowRunning: boolean;
  isSingleNodeTesting: boolean;
  errorNodes: string[];
  currentSelectedNodeId: string | null;
  currentSourceNodeId: string | null;
  currentSourceHandle: string | null;
  isAddNodeDialogOpen: boolean;
  isIntegrationDialogOpen: boolean;
  isNodePropertiesOpen: boolean;
  shouldSaveImmediately: boolean;
  flowProjectId: string | null;
  isDragInProgress: boolean; // Add global drag state
  isDragModeEnabled: boolean; // Add draggable mode toggle
  lastViewport: { x: number; y: number; zoom: number } | null;
  userHasAdjustedViewport: boolean;
  
  
  // Actions
  addNode: (node: FlowNode) => void;
  updateNode: (id: string, data: any) => void;
  removeNode: (id: string) => void;
  toggleNodeEnabled: (id: string) => void;
  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: any) => void;
  simulateFlow: (flowProjectId?: string) => Promise<void>;
  setRunningEdges: (edges: string[]) => void;
  addDebugLog: (log: Omit<DebugLog, 'timestamp'>) => void;
  clearDebugLogs: () => void;
  setErrorNodes: (nodes: string[]) => void;
  setIsSingleNodeTesting: (isTesting: boolean) => void;
  setCurrentSelectedNodeId: (nodeId: string | null) => void;
  setCurrentSourceNodeId: (nodeId: string | null) => void;
  setCurrentSourceHandle: (handleId: string | null) => void;
  setIsAddNodeDialogOpen: (isOpen: boolean) => void;
  setIsIntegrationDialogOpen: (isOpen: boolean) => void;
  setIsNodePropertiesOpen: (isOpen: boolean) => void;
  setShouldSaveImmediately: (should: boolean) => void;
  setFlowProjectId: (id: string | null) => void;
  resetFlowState: () => void;
  setIsDragInProgress: (isDragging: boolean) => void; // Add drag state setter
  setIsDragModeEnabled: (enabled: boolean) => void; // Add drag mode setter
  setLastViewport: (viewport: { x: number; y: number; zoom: number } | null) => void;
  setUserHasAdjustedViewport: (adjusted: boolean) => void;
  
  
  // Layout
  autoLayout: (direction?: 'TB' | 'LR') => void;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasValidPosition(node: FlowNode): boolean {
  return !!node.position && isFiniteNumber(node.position.x) && isFiniteNumber(node.position.y);
}

// Extend the execution context to include methods for loops
interface FlowExecutionContext {
  nodeId: string;
  flowId: string;
  envVars?: Record<string, string>;
  executionId?: string;
  variables: Record<string, any>;
  
  // Added for loop node support
  getChildNodes?: (nodeId: string) => FlowNode[];
  executeNode?: (node: FlowNode, context: FlowExecutionContext) => Promise<any>;
}

// Helper function to traverse nested object paths
function getNestedValue(obj: any, path: string[]): any {
  let current = obj;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    // Handle array index access like items[0]
    const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, propName, index] = arrayMatch;
      current = current[propName];
      if (current === null || current === undefined) return undefined;
      current = current[parseInt(index, 10)];
    } else {
      current = current[key];
    }
  }
  return current;
}

// Helper function to resolve variable bindings in inputs
const resolveVariableBindings = (inputs: Record<string, any>, context: FlowExecutionContext, flowProjectId: string) => {
  const resolvedInputs = { ...inputs };
  
  // Get flow variables
  let flowVariables: any[] = [];
  try {
    const storageKey = `flow-variables-${flowProjectId}`;
    const storedVariables = localStorage.getItem(storageKey);
    if (storedVariables) {
      flowVariables = JSON.parse(storedVariables);
    }
  } catch (error) {
    console.error('Error loading flow variables:', error);
  }
  
  // Get environment variables
  const envVars = context.envVars || {};
  
  // Resolve each input value
  Object.keys(resolvedInputs).forEach(key => {
    let value = resolvedInputs[key];
    
    if (typeof value === 'string') {
      // Handle flow variables: {{VARIABLE_NAME}}
      if (value.startsWith('{{') && value.endsWith('}}') && !value.includes('.') && !value.startsWith('{{env.')) {
        const varName = value.substring(2, value.length - 2);
        const flowVariable = flowVariables.find(v => v.name === varName);
        
        if (flowVariable) {
          resolvedInputs[key] = flowVariable.value;
          console.log(`Resolved flow variable ${varName}:`, flowVariable.value);
        } else {
          console.warn(`Flow variable "${varName}" not found`);
        }
      }
      // Handle environment variables: {{env.VARIABLE_NAME}}
      else if (value.startsWith('{{env.') && value.endsWith('}}')) {
        const envVarName = value.substring(6, value.length - 2);
        // Case-insensitive lookup for env vars
        const matchedKey = Object.keys(envVars).find(k => k.toLowerCase() === envVarName.toLowerCase());
        if (matchedKey && envVars[matchedKey]) {
          resolvedInputs[key] = envVars[matchedKey];
          console.log(`Resolved environment variable ${envVarName} (matched as ${matchedKey})`);
        } else {
          console.warn(`Environment variable "${envVarName}" not found`);
        }
      }
      // Handle node output variables: {{nodeId.outputField}} or {{nodeId.field.nested.path}}
      else if (value.startsWith('{{') && value.endsWith('}}') && value.includes('.')) {
        const varPath = value.substring(2, value.length - 2);
        const parts = varPath.split('.');
        
        if (parts.length >= 2) {
          const [nodeId, firstProperty, ...restPath] = parts;
          const baseKey = `${nodeId}.${firstProperty}`;
          
          // First try direct lookup for exact path (backwards compatibility)
          if (context.variables[varPath] !== undefined) {
            resolvedInputs[key] = context.variables[varPath];
            console.log(`Resolved node output variable (direct) ${varPath}:`, context.variables[varPath]);
          }
          // Then try nested resolution from base key
          else if (context.variables[baseKey] !== undefined) {
            const baseValue = context.variables[baseKey];
            if (restPath.length > 0) {
              const nestedValue = getNestedValue(baseValue, restPath);
              if (nestedValue !== undefined) {
                resolvedInputs[key] = nestedValue;
                console.log(`Resolved nested variable ${varPath}:`, nestedValue);
              } else {
                console.warn(`Nested path "${restPath.join('.')}" not found in "${baseKey}"`);
              }
            } else {
              resolvedInputs[key] = baseValue;
              console.log(`Resolved node output variable ${baseKey}:`, baseValue);
            }
          } else {
            console.warn(`Node output variable "${varPath}" not found (tried base: "${baseKey}")`);
          }
        }
      }
    }
  });
  
  // Final pass: replace any remaining unresolved {{...}} bindings with empty strings
  Object.keys(resolvedInputs).forEach(key => {
    const value = resolvedInputs[key];
    if (typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
      resolvedInputs[key] = value.replace(/\{\{[^}]+\}\}/g, '');
    }
  });
  
  return resolvedInputs;
};

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  runningEdges: [],
  debugLogs: [],
  flowStartTime: null,
  flowEndTime: null,
  isFlowRunning: false,
  isSingleNodeTesting: false,
  errorNodes: [],
  currentSelectedNodeId: null,
  currentSourceNodeId: null,
  currentSourceHandle: null,
  isAddNodeDialogOpen: false,
  isIntegrationDialogOpen: false,
  isNodePropertiesOpen: false,
  shouldSaveImmediately: false,
  flowProjectId: null,
  isDragInProgress: false, // Initialize drag state
  isDragModeEnabled: false, // Initialize drag mode as disabled
  lastViewport: null,
  userHasAdjustedViewport: false,
  
  
  setRunningEdges: (edges) => set({ runningEdges: edges }),
  
  addDebugLog: (log) => set((state) => ({
    debugLogs: [...state.debugLogs, { ...log, timestamp: Date.now() }]
  })),
  
  clearDebugLogs: () => set({ 
    debugLogs: [],
    flowStartTime: null,
    flowEndTime: null,
    errorNodes: [],
  }),
  
  setErrorNodes: (nodes) => set({ errorNodes: nodes }),
  setIsSingleNodeTesting: (isTesting) => set({ isSingleNodeTesting: isTesting }),
  setCurrentSourceHandle: (handleId) => set({ currentSourceHandle: handleId }),
  
  addNode: (node) => {
    set((state) => {
      // Respect explicit position when provided; only fallback-position when missing/invalid.
      const newNode = { ...node };

      if (!hasValidPosition(newNode)) {
        if (state.nodes.length === 0) {
          // First node goes at the center top
          newNode.position = { x: 400, y: 100 };
        } else {
          // Subsequent nodes go directly below previous ones
          const lastNode = state.nodes[state.nodes.length - 1];
          newNode.position = { x: 400, y: lastNode.position.y + 150 }; // Standard spacing
        }
      }
      
      // Log activity
      const flowProjectId = state.flowProjectId;
      if (flowProjectId) {
        activityService.logActivity({
          type: 'flow_updated',
          description: `Added ${newNode.data.label || newNode.data.type} node`,
          resourceType: 'flow',
          resourceId: flowProjectId,
          metadata: { 
            nodeType: newNode.data.type,
            nodeLabel: newNode.data.label,
            action: 'node_added'
          }
        });
      }
      
      return { 
        nodes: [...state.nodes, newNode],
        shouldSaveImmediately: true
      };
    });
  },
  
  updateNode: (id, data) =>
    set((state) => {
      const node = state.nodes.find(n => n.id === id);
      
      // Log activity if we have a flow project ID
      const flowProjectId = state.flowProjectId;
      if (flowProjectId && node) {
        activityService.logActivity({
          type: 'flow_updated',
          description: `Updated ${node.data.label || node.data.type} node`,
          resourceType: 'flow',
          resourceId: flowProjectId,
          metadata: { 
            nodeType: node.data.type,
            nodeLabel: node.data.label,
            action: 'node_updated'
          }
        });
      }
      
      return {
        nodes: state.nodes.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, ...data } } : node
        ),
      };
    }),
    
  removeNode: (id) =>
    set((state) => {
      const nodeToRemove = state.nodes.find(node => node.id === id);
      if (!nodeToRemove) return state;

      // Log activity before removal
      const flowProjectId = state.flowProjectId;
      if (flowProjectId) {
        activityService.logActivity({
          type: 'flow_updated',
          description: `Removed ${nodeToRemove.data.label || nodeToRemove.data.type} node`,
          resourceType: 'flow',
          resourceId: flowProjectId,
          metadata: { 
            nodeType: nodeToRemove.data.type,
            nodeLabel: nodeToRemove.data.label,
            action: 'node_removed'
          }
        });
      }

      // Simply remove the node and its edges - DO NOT reposition other nodes
      // This preserves conditional branch layouts and tree structure
      const remainingNodes = state.nodes.filter((node) => node.id !== id);
      const remainingEdges = state.edges.filter((edge) => 
        edge.source !== id && edge.target !== id
      );

      return {
        nodes: remainingNodes,
        edges: remainingEdges,
        currentSelectedNodeId: state.currentSelectedNodeId === id ? null : state.currentSelectedNodeId,
        shouldSaveImmediately: true
      };
    }),
    
  toggleNodeEnabled: (id) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: { ...node.data, disabled: !node.data.disabled },
            }
          : node
      ),
    })),
    
  setNodes: (nodes) => {
    if (get().isFlowRunning) {
      console.warn('[FlowStore] setNodes blocked during execution');
      return;
    }

    // Validate and fix nodes before setting them
    const validatedNodes = nodes.map((node: FlowNode, index: number) => {
      // Ensure all nodes have proper structure
      if (!node.data) {
        console.warn('Node missing data:', node.id);
        return {
          ...node,
          type: 'custom',
          data: {
            type: 'http-request',
            label: node.id || 'Unknown Node',
            inputs: { url: '', method: 'GET', headers: '{}', body: '' }
          }
        };
      }
      
      // Normalize node.type to valid React Flow types
      let nodeType = node.type;
      const dataType = node.data.type;
      
      // Map invalid types to valid ones
      if (dataType === 'condition') {
        nodeType = 'conditional';
      } else if (dataType === 'for-each-loop') {
        nodeType = 'for-each-loop';
      } else if (!nodeType || nodeType === 'base' || nodeType === 'default' || !['custom', 'conditional', 'loop', 'for-each-loop'].includes(nodeType)) {
        // If type is missing, 'base', 'default', or a plugin name like 'http-request', map to 'custom'
        nodeType = 'custom';
      }
      
      // Ensure data.type exists
      if (!node.data.type) {
        console.warn('Node missing data.type:', node.id);
        node.data.type = 'http-request';
      }
      
      // Ensure data.label exists
      if (!node.data.label) {
        node.data.label = node.data.type || 'Unknown Node';
      }
      
      // Ensure data.inputs exists with defaults for http-request
      if (!node.data.inputs) {
        node.data.inputs = node.data.type === 'http-request' 
          ? { url: '', method: 'GET', headers: '{}', body: '' }
          : {};
      }
      
      // Set first node flag if missing
      if (node.data.isFirstNode === undefined && index === 0) {
        node.data.isFirstNode = true;
      }
      
      return {
        ...node,
        type: nodeType
      };
    });
    
    set({ nodes: validatedNodes });
  },
  
  setEdges: (edges) => {
    if (get().isFlowRunning) {
      console.warn('[FlowStore] setEdges blocked during execution');
      return;
    }
    set((state) => ({ 
      edges: typeof edges === 'function' ? edges(state.edges) : edges 
    }));
  },
  setFlowProjectId: (id) => {
    const currentId = get().flowProjectId;
    if (currentId !== id) {
      console.log("Flow project ID changed from", currentId, "to", id);
      // Only reset if we're actually switching between different flows, 
      // not on initial load (null -> id)
      if (currentId !== null) {
        console.log("Switching flows - resetting flow state and history");
        get().resetFlowState();
        // Clear the history store when switching flows
        useFlowHistoryStore.getState().clearHistory();
      }
      set({ 
        flowProjectId: id,
        lastViewport: null,
        userHasAdjustedViewport: false,
      });
    }
  },

  resetFlowState: () => {
    // Clear history store first to prevent stale states from contaminating new flows
    useFlowHistoryStore.getState().clearHistory();
    
    set({
      nodes: [],
      edges: [],
      runningEdges: [],
      debugLogs: [],
      flowStartTime: null,
      flowEndTime: null,
      isFlowRunning: false,
      errorNodes: [],
      currentSelectedNodeId: null,
      currentSourceNodeId: null,
      currentSourceHandle: null,
      isAddNodeDialogOpen: false,
      isIntegrationDialogOpen: false,
      isNodePropertiesOpen: false,
      shouldSaveImmediately: false,
      isDragInProgress: false, // Reset drag state
      isDragModeEnabled: false, // Reset drag mode
      lastViewport: null,
      userHasAdjustedViewport: false,
    });
  },
  
  setLastViewport: (viewport) => set({ lastViewport: viewport }),
  setUserHasAdjustedViewport: (adjusted) => set({ userHasAdjustedViewport: adjusted }),
  
onNodesChange: (changes) => {
  const hasStructuralChanges = changes.some((change: any) => 
    change.type === 'add' || change.type === 'remove'
  );

  set((state) => {
    const updatedNodes = applyNodeChanges(changes, state.nodes) as FlowNode[];
    return {
      nodes: updatedNodes,
      shouldSaveImmediately: hasStructuralChanges
    };
  });
},
  
onEdgesChange: (changes) => {
  const hasStructuralChanges = changes.some((change: any) => 
    change.type === 'add' || change.type === 'remove'
  );

  set((state) => {
    const updatedEdges = applyEdgeChanges(changes, state.edges);
    return {
      edges: updatedEdges,
      shouldSaveImmediately: hasStructuralChanges
    };
  });
},
  
onConnect: (connection) => {
  set((state) => {
    const sourceNode = state.nodes.find(n => n.id === connection.source);
    const targetNode = state.nodes.find(n => n.id === connection.target);
    const isConditionNode = sourceNode?.type === 'conditional' || sourceNode?.data?.type === 'condition';
    const isDirectConditionalBranch = isConditionNode && connection.sourceHandle != null;

    // NEW: Check if source node is INSIDE an existing conditional branch
    const branchAncestry = !isDirectConditionalBranch 
      ? findBranchAncestry(connection.source, state.edges, state.nodes)
      : null;
    
    const isInsideBranch = isDirectConditionalBranch || branchAncestry !== null;

    if (!isConditionNode) {
      const sourceNodeHasEdge = state.edges.some(edge => 
        edge.source === connection.source && 
        (connection.sourceHandle === undefined || edge.sourceHandle === connection.sourceHandle)
      );
      if (sourceNodeHasEdge) {
        return state;
      }
    } else {
      const handleHasConnection = state.edges.some(edge => 
        edge.source === connection.source && 
        edge.sourceHandle === connection.sourceHandle
      );
      if (handleHasConnection) {
        return state;
      }
    }

    // Use 'step' edge type for conditional branches (orthogonal routing), 'straight' otherwise
    const edgeType = isDirectConditionalBranch ? 'step' : 'straight';

    const newEdge = {
      id: connection.sourceHandle 
        ? `${connection.source}-${connection.sourceHandle}-${connection.target}`
        : `${connection.source}-${connection.target}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: edgeType,
      animated: false,
      style: { 
        stroke: connection.sourceHandle === 'true' ? '#10b981' :
               connection.sourceHandle === 'false' ? '#ef4444' :
               isInsideBranch ? (branchAncestry?.branchType === 'true' ? '#10b981' : '#ef4444') :
               'hsl(var(--primary))',
        strokeWidth: 2,
        strokeLinecap: 'round',
      },
      data: {
        sourceHandle: connection.sourceHandle,
        branchAncestry: branchAncestry, // Store branch info for future reference
      },
    } as Edge;

    const newEdges = [...state.edges, newEdge];

    // AUTO-REPOSITION: If connecting from a conditional node, reposition target to align with branch center
    let repositionedNodes = state.nodes;
    if (isDirectConditionalBranch && sourceNode && targetNode) {
      const verticalSpacing = 350; // Match tree-layout.ts verticalSpacing
      
      // Use tree layout manager which now handles multi-condition properly
      // This uses index-based positioning that matches the visual SVG in ConditionalNode.tsx
      const targetPosition = treeLayoutManager.calculateNextNodePosition(
        connection.source,
        connection.sourceHandle!,
        state.nodes,
        newEdges
      );
      
      const targetY = sourceNode.position.y + verticalSpacing;
      
      // Update target node position to align directly below its branch
      repositionedNodes = state.nodes.map(n => 
        n.id === connection.target 
          ? { ...n, position: { x: targetPosition.x, y: targetY } }
          : n
      );
    }

    // If inside ANY branch (direct or inherited), skip Dagre to preserve vertical columns
    if (isInsideBranch) {
      const branchInfo = isDirectConditionalBranch 
        ? { conditionalNodeId: connection.source, branchType: connection.sourceHandle as string }
        : branchAncestry!;

      let updatedNodes = repositionedNodes;
      
      // Only apply branch layout if NOT a direct conditional connection (already repositioned above)
      if (!isDirectConditionalBranch) {
        try {
          const branchPositions = treeLayoutManager.calculateBranchLayout(
            branchInfo.conditionalNodeId, 
            branchInfo.branchType, 
            repositionedNodes as any, 
            newEdges as any
          );
          if (branchPositions && Object.keys(branchPositions).length > 0) {
            updatedNodes = repositionedNodes.map(node => branchPositions[node.id]
              ? { ...node, position: branchPositions[node.id] }
              : node
            );
          }
        } catch (e) {
          console.warn('Branch layout failed, skipping:', e);
        }
      }

      // Run collision detection and expansion
      // For binary branches: full expansion logic
      // For multi-condition branches: only push OUTSIDE neighbors (their internal children stay locked)
      updatedNodes = treeLayoutManager.expandBranchesToPreventOverlap(
        updatedNodes,
        newEdges,
        connection.target
      );

      // Return WITHOUT running Dagre - keep nodes in their branch columns
      return {
        edges: newEdges,
        nodes: updatedNodes.map(node => 
          node.id === connection.source 
            ? { ...node, data: { ...node.data, selectedOutputHandle: undefined }}
            : node
        ),
        shouldSaveImmediately: true
      };
    }

    // Only apply Dagre for nodes OUTSIDE any conditional branch
    const dagreNodes = applyDagreLayout(state.nodes as any, newEdges as any, {
      rankdir: 'TB',
      nodesep: 80,
      ranksep: 140,
    });

    return {
      edges: newEdges,
      nodes: dagreNodes.map(node => 
        node.id === connection.source 
          ? { ...node, data: { ...node.data, selectedOutputHandle: undefined }}
          : node
      ),
      shouldSaveImmediately: true
    };
  });
},
  
  autoLayout: (direction = 'TB') => {
    set((state) => ({
      nodes: applyDagreLayout(state.nodes, state.edges as any, {
        rankdir: direction,
        nodesep: 80,
        ranksep: 140,
      })
    }));
  },
  
  
  simulateFlow: async (providedFlowProjectId?: string) => {
    const { nodes, edges, setRunningEdges, addDebugLog, clearDebugLogs, setErrorNodes, flowProjectId } = get();
    const firstNode = nodes.find(node => node.data.isFirstNode);
    
    // Use provided flowProjectId or fallback to stored one or a default
    const currentFlowProjectId = providedFlowProjectId || flowProjectId || 'current-flow';
    
    if (!firstNode) {
      addDebugLog({
        nodeId: 'system',
        nodeName: 'System',
        type: 'error',
        message: 'No starting node found in the flow',
      });
      return;
    }

    // Save flow before running (if we have nodes)
    if (currentFlowProjectId && currentFlowProjectId !== 'current-flow' && nodes.length > 0) {
      try {
        console.log("Saving flow before execution...");
        const serviceNodes = nodes.map(node => ({
          id: node.id,
          type: node.type || 'custom',
          position: node.position,
          data: node.data
        }));
        await flowService.saveFlowData(currentFlowProjectId, { nodes: serviceNodes, edges });
        console.log("Pre-execution save completed");
      } catch (e) {
        console.error("Pre-execution save failed:", e);
        // Continue with execution even if save fails
      }
    }

    clearDebugLogs();
    const startTime = Date.now();
    
    const { v4: uuidv4 } = await import('uuid');
    const executionId = uuidv4();

    // Create a real flow_executions record so monitoring logs FK is satisfied
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: flowDataRecord } = await supabase
        .from('flow_data')
        .select('id')
        .eq('flow_project_id', currentFlowProjectId)
        .order('version', { ascending: false })
        .limit(1)
        .single();
      
      if (flowDataRecord) {
        await supabase.from('flow_executions').insert({
          id: executionId,
          flow_data_id: flowDataRecord.id,
          status: 'running',
          started_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error('Error creating flow execution record:', e);
    }
    
    set({ 
      flowStartTime: startTime,
      isFlowRunning: true,
      errorNodes: [],
    });

    setRunningEdges([]);
    let errorCount = 0;

    // Load environment variables for variable resolution
    const envVars: Record<string, string> = {};
    try {
      const envVarsString = localStorage.getItem('flow-env-vars');
      if (envVarsString) {
        const parsedEnvVars = JSON.parse(envVarsString);
        Object.assign(envVars, parsedEnvVars);
      }
    } catch (error) {
      console.error('Error loading environment variables:', error);
    }

    // Auto-inject required Supabase variables if not present
    if (!envVars.SUPABASE_URL) {
      envVars.SUPABASE_URL = 'https://appdmmjexevclmpyvtss.supabase.co';
    }
    if (!envVars.SUPABASE_ANON_KEY) {
      envVars.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ';
    }

    // Load vault secrets (encrypted in DB, decrypted by RPC)
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: vaultSecrets, error: vaultError } = await supabase
        .rpc('get_all_flow_secrets', { p_flow_project_id: currentFlowProjectId });
      
      if (!vaultError && vaultSecrets && typeof vaultSecrets === 'object') {
        Object.assign(envVars, vaultSecrets as Record<string, string>);
        console.log('Loaded vault secrets:', Object.keys(vaultSecrets as Record<string, string>));
      } else if (vaultError) {
        console.error('Failed to load vault secrets:', vaultError);
      }
    } catch (error) {
      console.error('Error loading vault secrets:', error);
    }

    // Load flow variables for logging
    let flowVariables: any[] = [];
    try {
      const storageKey = `flow-variables-${currentFlowProjectId}`;
      const storedVariables = localStorage.getItem(storageKey);
      if (storedVariables) {
        flowVariables = JSON.parse(storedVariables);
      }
    } catch (error) {
      console.error('Error loading flow variables:', error);
    }

    // Log available variables at start
    addDebugLog({
      nodeId: 'system',
      nodeName: 'System',
      type: 'info',
      message: `Flow started with ${flowVariables.length} flow variables and ${Object.keys(envVars).length} environment variables`,
      data: { 
        flowVariables: flowVariables.map(v => ({ name: v.name, isSecret: v.isSecret })),
        environmentVariables: Object.keys(envVars)
      }
    });

    try {
      await flowMonitoringService.logFlowMessage(currentFlowProjectId, executionId, {
        level: 'info',
        message: 'Flow simulation started'
      });
    } catch (error) {
      console.error('Error logging flow start:', error);
    }

    const getChildNodes = (nodeId: string): FlowNode[] => {
      return nodes.filter(n => n.data.parentLoopId === nodeId);
    };

    const executeNodeWithLoop = async (node: FlowNode, context: FlowExecutionContext, plugin: any) => {
      const loopConfig = node.data.loopConfig;
      
      if (!loopConfig?.enabled || !loopConfig.sourceNodeId || !loopConfig.sourceField) {
        return await plugin.execute?.(node.data.inputs || {}, context);
      }

      const loopDataKey = `${loopConfig.sourceNodeId}.${loopConfig.sourceField}`;
      const loopData = context.variables[loopDataKey];
      
      addDebugLog({
        nodeId: node.id,
        nodeName: node.data.label as string,
        type: 'info',
        message: `Attempting to loop through data from: ${loopDataKey}`,
        data: { loopDataType: typeof loopData, isArray: Array.isArray(loopData) }
      });

      if (!Array.isArray(loopData)) {
        const errorMsg = loopData === undefined 
          ? `No data found at ${loopDataKey}. Make sure the source node has executed and produced output.`
          : `Loop source data is not an array (found: ${typeof loopData}). Array data is required for looping.`;
        
        addDebugLog({
          nodeId: node.id,
          nodeName: node.data.label as string,
          type: 'error',
          message: errorMsg,
        });
        throw new Error(errorMsg);
      }

      const arrayLength = loopData.length;
      const maxIterations = Math.min(arrayLength, loopConfig.maxIterations || 1000);
      
      addDebugLog({
        nodeId: node.id,
        nodeName: node.data.label as string,
        type: 'info',
        message: `Starting ${loopConfig.loopType} loop: ${maxIterations} iterations (array length: ${arrayLength})`,
        data: { 
          arrayLength, 
          maxIterations, 
          loopType: loopConfig.loopType,
          batchSize: loopConfig.batchSize 
        }
      });

      let results: any[] = [];

      if (loopConfig.loopType === 'sync') {
        for (let i = 0; i < maxIterations; i++) {
          const currentItem = loopData[i];
          
          addDebugLog({
            nodeId: node.id,
            nodeName: node.data.label as string,
            type: 'info',
            message: `Processing item ${i + 1}/${maxIterations}`,
            data: { currentItem, index: i }
          });
          
          const loopContext = {
            ...context,
            variables: {
              ...context.variables,
              [`${node.id}._loop.current`]: currentItem,
              [`${node.id}._loop.index`]: i,
              [`${node.id}._loop.total`]: maxIterations,
              [`${node.id}._loop.isFirst`]: i === 0,
              [`${node.id}._loop.isLast`]: i === maxIterations - 1,
              [`${node.id}._loop.arrayLength`]: arrayLength,
            }
          };

          try {
            const result = await plugin.execute?.(node.data.inputs || {}, loopContext);
            results.push(result);
            
            addDebugLog({
              nodeId: node.id,
              nodeName: node.data.label as string,
              type: 'info',
              message: `Item ${i + 1}/${maxIterations} completed successfully`,
              data: { result }
            });

            if (loopConfig.delayMs && loopConfig.delayMs > 0 && i < maxIterations - 1) {
              addDebugLog({
                nodeId: node.id,
                nodeName: node.data.label as string,
                type: 'info',
                message: `Waiting ${loopConfig.delayMs}ms before next iteration`,
              });
              await new Promise(resolve => setTimeout(resolve, loopConfig.delayMs));
            }
          } catch (error: any) {
            addDebugLog({
              nodeId: node.id,
              nodeName: node.data.label as string,
              type: 'error',
              message: `Item ${i + 1}/${maxIterations} failed: ${error.message}`,
              data: { currentItem, error: error.message }
            });
            results.push({ error: error.message, item: currentItem, index: i });
          }
        }
      } else {
        const batchSize = loopConfig.batchSize || 5;
        
        for (let i = 0; i < maxIterations; i += batchSize) {
          const batchEnd = Math.min(i + batchSize, maxIterations);
          const batch = loopData.slice(i, batchEnd);
          
          addDebugLog({
            nodeId: node.id,
            nodeName: node.data.label as string,
            type: 'info',
            message: `Processing async batch ${Math.floor(i / batchSize) + 1}: items ${i + 1}-${batchEnd}`,
            data: { batchSize: batch.length, batch }
          });
          
          const batchPromises = batch.map(async (item, batchIndex) => {
            const globalIndex = i + batchIndex;
            
            const loopContext = {
              ...context,
              variables: {
                ...context.variables,
                [`${node.id}._loop.current`]: item,
                [`${node.id}._loop.index`]: globalIndex,
                [`${node.id}._loop.total`]: maxIterations,
                [`${node.id}._loop.isFirst`]: globalIndex === 0,
                [`${node.id}._loop.isLast`]: globalIndex === maxIterations - 1,
                [`${node.id}._loop.arrayLength`]: arrayLength,
              }
            };

            try {
              const result = await plugin.execute?.(node.data.inputs || {}, loopContext);
              return { index: globalIndex, result, item };
            } catch (error: any) {
              return { index: globalIndex, error: error.message, item };
            }
          });

          const batchResults = await Promise.all(batchPromises);
          
          batchResults.forEach(({ index, result, error, item }) => {
            if (error) {
              addDebugLog({
                nodeId: node.id,
                nodeName: node.data.label as string,
                type: 'error',
                message: `Async item ${index + 1}/${maxIterations} failed: ${error}`,
                data: { item, error }
              });
              results.push({ error, item, index });
            } else {
              results.push(result);
            }
          });

          addDebugLog({
            nodeId: node.id,
            nodeName: node.data.label as string,
            type: 'info',
            message: `Async batch ${Math.floor(i / batchSize) + 1} completed (${batchResults.length} items)`,
            data: { batchResults: batchResults.length }
          });
        }
      }

      const successfulResults = results.filter(r => !r.error);
      const failedResults = results.filter(r => r.error);

      addDebugLog({
        nodeId: node.id,
        nodeName: node.data.label as string,
        type: 'info',
        message: `Loop completed: ${successfulResults.length} successful, ${failedResults.length} failed`,
        data: { 
          totalProcessed: results.length,
          successful: successfulResults.length,
          failed: failedResults.length
        }
      });

      return {
        _loop: {
          results,
          count: results.length,
          successful: successfulResults.length,
          failed: failedResults.length,
          arrayLength,
          processedItems: maxIterations,
          successfulResults,
          failedResults,
        },
        ...(successfulResults.length > 0 ? successfulResults[successfulResults.length - 1] : {})
      };
    };

    const processNode = async (nodeId: string, context: FlowExecutionContext = { 
      nodeId: nodeId, 
      flowId: currentFlowProjectId, 
      variables: {},
      executionId: executionId,
      envVars,
      getChildNodes,
      executeNode: async (node, ctx) => await processNode(node.id, ctx),
    }) => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      if (node.data.disabled) {
        const outgoingEdges = edges.filter(e => e.source === nodeId);
        await Promise.all(outgoingEdges.map(async edge => {
          setRunningEdges([edge.id]);
          await processNode(edge.target, context);
        }));
        return;
      }

      const nodeType = (node.data.type || node.type) as string;
      const plugin = nodeRegistry.getPlugin(nodeType);
      if (!plugin) return;

      try {
        addDebugLog({
          nodeId: node.id,
          nodeName: node.data.label as string,
          type: 'info',
          message: `Executing ${node.data.label}`,
        });

        try {
          await flowMonitoringService.logFlowMessage(currentFlowProjectId, executionId, {
            node_id: node.id,
            level: 'info',
            message: `Executing node: ${node.data.label}`
          });
        } catch (error) {
          console.error('Error logging node execution start:', error);
        }

        // Resolve variable bindings in inputs
        const rawInputs = { ...node.data.inputs };
        const resolvedInputs = resolveVariableBindings(rawInputs, context, currentFlowProjectId);
        
        // Log variable resolution if any variables were resolved
        const hasVariableBindings = Object.keys(rawInputs).some(key => {
          const value = rawInputs[key];
          return typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}');
        });
        
        if (hasVariableBindings) {
          const resolvedCount = Object.keys(rawInputs).filter(key => {
            const rawValue = rawInputs[key];
            const resolvedValue = resolvedInputs[key];
            return rawValue !== resolvedValue;
          }).length;
          
          addDebugLog({
            nodeId: node.id,
            nodeName: node.data.label as string,
            type: 'info',
            message: `Variable bindings resolved: ${resolvedCount} variables replaced`,
            data: { rawInputs, resolvedInputs }
          });
        }
        
        // Validate required inputs AFTER variable resolution
        const allInputs = [...(plugin.inputs || [])];
        if (plugin.getDynamicInputs) {
          const dynamicInputs = plugin.getDynamicInputs(resolvedInputs);
          allInputs.push(...dynamicInputs);
        }
        
        // Apply default values for inputs that are missing but have defaults
        const inputs = { ...resolvedInputs };
        allInputs.forEach(input => {
          if ((inputs[input.name] === null || inputs[input.name] === undefined || inputs[input.name] === '') && input.default !== undefined) {
            inputs[input.name] = input.default;
          }
        });
        
        // Helper function to check if value is actually missing (not just a variable binding)
        const isValueMissing = (value: any) => {
          return value === null || value === undefined || value === '';
        };
        
        // Filter inputs based on conditional visibility (showWhen)
        const visibleInputs = allInputs.filter(input => {
          if (!input.showWhen) return true;
          const conditionFieldValue = inputs[input.showWhen.field];
          return input.showWhen.values.includes(conditionFieldValue);
        });
        
        const missingRequired = visibleInputs
          .filter(input => input.required)
          .filter(input => isValueMissing(inputs[input.name]));
        
        if (missingRequired.length > 0) {
          const missingDetails = missingRequired.map(i => ({
            field: i.name,
            rawValue: node.data.inputs?.[i.name],
            resolvedValue: inputs[i.name]
          }));
          
          const missingFields = missingRequired.map(i => i.name).join(', ');
          const errorMsg = `Missing required fields: ${missingFields}`;
          
          // Return a proper failure result so "Continue on Error" logic can be triggered
          // This ensures validation errors are treated the same as runtime errors
          return {
            success: false,
            error: errorMsg,
            debugInfo: { missingDetails }
          };
        }
        const payloadMappings = node.data.payloadMappings || [];
        
        if (payloadMappings.length > 0) {
          addDebugLog({
            nodeId: node.id,
            nodeName: node.data.label as string,
            type: 'info',
            message: `Processing ${payloadMappings.length} payload mappings`,
          });
          
          for (const mapping of payloadMappings) {
            try {
              const sourceValue = context.variables[`${mapping.sourceNodeId}.${mapping.sourceOutputField}`];
              
              if (sourceValue !== undefined) {
                if (mapping.transformExpression) {
                  try {
                    const transformFn = new Function('data', `return ${mapping.transformExpression}`);
                    inputs[mapping.targetField] = transformFn(sourceValue);
                  } catch (transformError: any) {
                    addDebugLog({
                      nodeId: node.id,
                      nodeName: node.data.label as string,
                      type: 'error',
                      message: `Error in transformation: ${transformError.message}`,
                    });
                    inputs[mapping.targetField] = sourceValue;
                  }
                } else {
                  inputs[mapping.targetField] = sourceValue;
                }
                
                addDebugLog({
                  nodeId: node.id,
                  nodeName: node.data.label as string,
                  type: 'info',
                  message: `Mapped ${mapping.sourceOutputField} -> ${mapping.targetField}`,
                  data: {
                    source: sourceValue,
                    target: inputs[mapping.targetField]
                  }
                });
              } else {
                addDebugLog({
                  nodeId: node.id,
                  nodeName: node.data.label as string,
                  type: 'warning',
                  message: `Source value not found for mapping: ${mapping.sourceNodeId}.${mapping.sourceOutputField}`,
                });
              }
            } catch (mappingError: any) {
              addDebugLog({
                nodeId: node.id,
                nodeName: node.data.label as string,
                type: 'error',
                message: `Error applying mapping: ${mappingError.message}`,
              });
            }
          }
        }

        const result = await executeNodeWithLoop(node, context, plugin);

        // Track if we should stop execution (node failed without "Continue on Error")
        let shouldStopExecution = false;
        
        if (result) {
          // Check if the result contains an error
          if (result.success === false && result.error) {
            const shouldContinue = node.data?.errorBehavior === 'continue';
            
            set(state => ({ errorNodes: [...state.errorNodes, node.id] }));
            
            addDebugLog({
              nodeId: node.id,
              nodeName: node.data.label as string,
              type: 'error',
              message: result.error,
              data: result.debugInfo ? { debugInfo: result.debugInfo } : undefined,
            });

            try {
              await flowMonitoringService.logFlowMessage(currentFlowProjectId, executionId, {
                node_id: node.id,
                level: 'error',
                message: `Node execution failed: ${result.error}`
              });
            } catch (logError) {
              console.error('Error logging node execution failure:', logError);
            }
            
            // If "Continue on Error" is enabled, inject _failedNode into context
            // so downstream condition nodes can check {{nodeId._failedNode}}
            if (shouldContinue) {
              context.variables[`${node.id}._failedNode`] = true;
              context.variables[`${node.id}.error`] = result.error;
              context.variables[`${node.id}.success`] = false;
              
              addDebugLog({
                nodeId: node.id,
                nodeName: node.data.label as string,
                type: 'warning',
                message: 'Node failed but "Continue on Error" is enabled - flow will continue',
              });
            } else {
              // Stop execution - don't process downstream nodes
              shouldStopExecution = true;
              addDebugLog({
                nodeId: node.id,
                nodeName: node.data.label as string,
                type: 'error',
                message: '⛔ Flow stopped - node failed without "Continue on Error" enabled',
              });
              return result;
            }
          }
          
          // Store all result outputs in context
          Object.entries(result).forEach(([key, value]) => {
            context.variables[`${node.id}.${key}`] = value;
          });
          
          // Always inject success status for every node (if not already failed)
          if (context.variables[`${node.id}.success`] === undefined) {
            context.variables[`${node.id}.success`] = true;
          }

          // Handle Logger node debugger destination
          if (nodeType === 'logger' && result?._logEntry) {
            const logEntry = result._logEntry;
            const destination = logEntry.destination || 'dashboard';
            
            // If destination includes debugger, add a prominent debug log
            if (destination === 'debugger' || destination === 'both') {
              const logType = logEntry.level === 'error' ? 'error' : 
                              logEntry.level === 'warning' ? 'warning' : 'info';
              addDebugLog({
                nodeId: node.id,
                nodeName: node.data.label as string,
                type: logType,
                message: `📋 LOG: ${logEntry.message}`,
                data: logEntry.metadata,
              });
            }
          }

          // Handle Logger node output specially to show clean data
          const isLoggerWithDebugger = nodeType === 'logger' && 
            result?._logEntry && 
            (result._logEntry.destination === 'debugger' || result._logEntry.destination === 'both');

          // Handle disabled Logger case
          const isLoggerDisabled = nodeType === 'logger' && result?.logged === false;

          if (isLoggerDisabled) {
            // Show a clean "skipped" message instead of raw passthrough
            addDebugLog({
              nodeId: node.id,
              nodeName: node.data.label as string,
              type: 'info',
              message: '⏭️ Logger skipped (disabled)',
              data: null,
            });
          } else if (isLoggerWithDebugger) {
            // Skip generic log - the custom 📋 LOG message was already added above
          } else if (nodeType === 'logger') {
            // For dashboard-only Logger, show clean output without passthrough/_logEntry
            const cleanResult = { ...result };
            delete cleanResult.passthrough;
            delete cleanResult._logEntry;
            addDebugLog({
              nodeId: node.id,
              nodeName: node.data.label as string,
              type: 'output',
              message: 'Execution completed',
              data: cleanResult,
            });
          } else {
            // Normal node - show full output
            addDebugLog({
              nodeId: node.id,
              nodeName: node.data.label as string,
              type: 'output',
              message: 'Execution completed',
              data: result,
            });
          }

          try {
            await flowMonitoringService.logFlowMessage(currentFlowProjectId, executionId, {
              node_id: node.id,
              level: 'info',
              message: `Node execution completed successfully`
            });
          } catch (error) {
            console.error('Error logging node execution success:', error);
          }
        }

        const outgoingEdges = edges.filter(e => e.source === nodeId);
        
        // Handle for-each-loop node - special branching execution with multiple loop variables
        if (nodeType === 'for-each-loop') {
          const inputs = node.data.inputs || {};
          const loopVariables = inputs.loopVariables || [];
          const maxIterations = inputs.maxIterations || 500;
          const linkedVariableId = inputs.linkedVariableId as string | undefined;
          const delayMs = inputs.delayMs || 0;
          const trimWhitespace = inputs.trimWhitespace !== false;
          
          // Support legacy single-variable format (migration)
          if (loopVariables.length === 0 && inputs.sourceNodeId && inputs.sourceField) {
            loopVariables.push({
              id: 'legacy-1',
              variableName: inputs.variableName || 'item',
              sourceNodeId: inputs.sourceNodeId,
              sourceField: inputs.sourceField
            });
          }
          
          if (loopVariables.length === 0) {
            addDebugLog({
              nodeId: node.id,
              nodeName: node.data.label as string,
              type: 'error',
              message: 'No loop variables configured. Add at least one data source.',
            });
            return;
          }
          
          // Get all arrays from configured variables
          const arrays: { name: string; data: any[] }[] = [];
          
          for (const loopVar of loopVariables) {
            if (!loopVar.sourceNodeId || !loopVar.sourceField) continue;
            
            const dataKey = `${loopVar.sourceNodeId}.${loopVar.sourceField}`;
            let arrayData = context.variables[dataKey];
            
            if (!arrayData) {
              addDebugLog({
                nodeId: node.id,
                nodeName: node.data.label as string,
                type: 'warning',
                message: `No data found at ${dataKey} for variable "${loopVar.variableName}"`,
              });
              continue;
            }
            
            // Handle non-array data (comma-separated strings)
            if (!Array.isArray(arrayData)) {
              if (typeof arrayData === 'string') {
                arrayData = arrayData.split(',').map(s => trimWhitespace ? s.trim() : s);
              } else {
                addDebugLog({
                  nodeId: node.id,
                  nodeName: node.data.label as string,
                  type: 'warning',
                  message: `Data for "${loopVar.variableName}" is not an array (found: ${typeof arrayData})`,
                });
                continue;
              }
            }
            
            arrays.push({ name: loopVar.variableName, data: arrayData });
          }
          
          if (arrays.length === 0) {
            addDebugLog({
              nodeId: node.id,
              nodeName: node.data.label as string,
              type: 'error',
              message: 'No valid array data found for any configured loop variables.',
            });
            return;
          }
          
          // Determine iteration count
          // If linkedVariableId is set, use that variable's array length directly
          // Otherwise use the longest array, capped by maxIterations
          let iterationCount: number;
          if (linkedVariableId) {
            const linkedVar = loopVariables.find((lv: { id: string }) => lv.id === linkedVariableId);
            const linkedArray = linkedVar 
              ? arrays.find(a => a.name === linkedVar.variableName)
              : null;
            iterationCount = linkedArray ? linkedArray.data.length : Math.max(...arrays.map(a => a.data.length));
          } else {
            iterationCount = Math.min(
              maxIterations,
              Math.max(...arrays.map(a => a.data.length))
            );
          }
          
          // Find EACH and AFTER branch edges
          const eachEdge = outgoingEdges.find(e => e.sourceHandle === 'each');
          const afterEdge = outgoingEdges.find(e => e.sourceHandle === 'after');
          
          addDebugLog({
            nodeId: node.id,
            nodeName: node.data.label as string,
            type: 'info',
            message: `Starting loop: ${iterationCount} iterations across ${arrays.length} variable(s)`,
            data: { 
              variables: arrays.map(a => ({ name: a.name, length: a.data.length })),
              maxIterations 
            }
          });
          
          const results: any[] = [];
          const loopCounterStart = inputs.loopCounterStart ?? 1;
          const errorHandling = inputs.errorHandling || 'continue';
          
          // Execute EACH branch for every iteration
          for (let i = 0; i < iterationCount; i++) {
            // Create loop context with ALL loop variables for this iteration
            const loopContext: FlowExecutionContext = {
              ...context,
              variables: { ...context.variables }
            };
            
            // Set all loop variables for this iteration
            for (const { name, data } of arrays) {
              const currentValue = data[i] ?? null;
              loopContext.variables[name] = currentValue;
              loopContext.variables[`${name}Index`] = i;
              
              // Also set node-scoped versions
              loopContext.variables[`${node.id}.${name}`] = currentValue;
            }
            
            // Set general loop context
            loopContext.variables[`${node.id}.currentIndex`] = i;
            loopContext.variables[`${node.id}.totalItems`] = iterationCount;
            loopContext.variables[`${node.id}.isFirst`] = i === 0;
            loopContext.variables[`${node.id}.isLast`] = i === iterationCount - 1;
            
            // Set loop_iteration (human-friendly counter)
            loopContext.variables['loop_iteration'] = loopCounterStart + i;
            loopContext.variables[`${node.id}.loop_iteration`] = loopCounterStart + i;
            
            // Set loop context helpers
            loopContext.variables['loop.isFirst'] = i === 0;
            loopContext.variables['loop.isLast'] = i === iterationCount - 1;
            loopContext.variables['loop.total'] = iterationCount;
            
            addDebugLog({
              nodeId: node.id,
              nodeName: node.data.label as string,
              type: 'info',
              message: `Processing iteration ${i + 1}/${iterationCount} (loop_iteration: ${loopCounterStart + i})`,
              data: Object.fromEntries(arrays.map(a => [a.name, a.data[i]]))
            });
            
            // Execute EACH branch chain
            if (eachEdge) {
              try {
                setRunningEdges([eachEdge.id]);
                const iterResult = await processNode(eachEdge.target, loopContext);
                results.push(iterResult);
              } catch (error: any) {
                addDebugLog({
                  nodeId: node.id,
                  nodeName: node.data.label as string,
                  type: 'error',
                  message: `Iteration ${i + 1} failed: ${error.message}`,
                  data: { index: i, error: error.message }
                });
                results.push({ error: error.message, index: i });
                
                // Handle error based on errorHandling setting
                if (errorHandling === 'stop') {
                  addDebugLog({
                    nodeId: node.id,
                    nodeName: node.data.label as string,
                    type: 'warning',
                    message: `Stopping loop due to error (errorHandling: stop)`,
                  });
                  break;
                }
              }
            }
            
            // Delay between iterations
            if (delayMs > 0 && i < iterationCount - 1) {
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          }
          
          // Store aggregated results in context
          context.variables[`${node.id}.results`] = results;
          context.variables[`${node.id}.totalProcessed`] = results.length;
          
          addDebugLog({
            nodeId: node.id,
            nodeName: node.data.label as string,
            type: 'output',
            message: `Loop completed: ${results.length} iterations processed`,
            data: { totalProcessed: results.length, results }
          });
          
          // Execute AFTER branch once
          if (afterEdge) {
            setRunningEdges([afterEdge.id]);
            await processNode(afterEdge.target, context);
          }
          
          return; // Don't continue to standard outgoing edges
        }
        
        // Handle condition node (binary true/false or multi-condition routing)
        if (nodeType === 'condition') {
          const isMultiCondition = node.data.inputs?.multipleConditions === true;
          const returnType = node.data.inputs?.returnType || 'boolean';
          
          if (isMultiCondition && (returnType === 'string' || returnType === 'integer')) {
            // Multi-condition with string/integer return: route by matchedCase or returnValue
            const matchedCase = result?.matchedCase || 'else';
            const matchingEdge = outgoingEdges.find(edge => 
              edge.sourceHandle === matchedCase || edge.sourceHandle === result?.returnValue
            );
            
            if (matchingEdge) {
              setRunningEdges([matchingEdge.id]);
              await processNode(matchingEdge.target, { ...context });
            }
          } else {
            // Simple mode or boolean multi-condition: route by true/false
            const isTrue = result?.result === true;
            const matchingEdges = outgoingEdges.filter(edge => 
              (isTrue && edge.sourceHandle === 'true') || (!isTrue && edge.sourceHandle === 'false')
            );

            await Promise.all(matchingEdges.map(async edge => {
              setRunningEdges([edge.id]);
              await processNode(edge.target, { ...context });
            }));
          }
        }
        else {
          await Promise.all(outgoingEdges.map(async edge => {
            setRunningEdges([edge.id]);
            await processNode(edge.target, context);
          }));
        }
        
        return result;
      } catch (error: any) {
        errorCount++;
        set(state => ({ errorNodes: [...state.errorNodes, node.id] }));
        
        addDebugLog({
          nodeId: node.id,
          nodeName: node.data.label as string,
          type: 'error',
          message: error.message || 'Unknown error',
        });

        try {
          await flowMonitoringService.logFlowMessage(currentFlowProjectId, executionId, {
            node_id: node.id,
            level: 'error',
            message: `Node execution failed: ${error.message || 'Unknown error'}`
          });
        } catch (logError) {
          console.error('Error logging node execution failure:', logError);
        }
        
        // Check if "Continue on Error" is enabled for this node
        const shouldContinueOnError = node.data?.errorBehavior === 'continue';
        
        if (shouldContinueOnError) {
          // Inject error info into context so downstream nodes can check
          context.variables[`${node.id}._failedNode`] = true;
          context.variables[`${node.id}.error`] = error.message || 'Unknown error';
          context.variables[`${node.id}.success`] = false;
          
          addDebugLog({
            nodeId: node.id,
            nodeName: node.data.label as string,
            type: 'warning',
            message: 'Node failed but "Continue on Error" is enabled - continuing to downstream nodes',
          });
          
          // Process downstream nodes
          const outgoingEdges = edges.filter(e => e.source === nodeId);
          await Promise.all(outgoingEdges.map(async edge => {
            setRunningEdges([edge.id]);
            await processNode(edge.target, context);
          }));
        }
        // If not shouldContinueOnError, just return (stop this branch)
      }
    };

    try {
      await processNode(firstNode.id);
      
      try {
        await flowMonitoringService.logFlowMessage(currentFlowProjectId, executionId, {
          level: 'info',
          message: 'Flow simulation completed successfully'
        });
      } catch (error) {
        console.error('Error logging flow completion:', error);
      }
    } catch (error: any) {
      errorCount++;
      addDebugLog({
        nodeId: 'system',
        nodeName: 'System',
        type: 'error',
        message: `Flow execution failed: ${error.message}`,
      });
      
      try {
        await flowMonitoringService.logFlowMessage(currentFlowProjectId, executionId, {
          level: 'error',
          message: `Flow simulation failed: ${error.message}`
        });
      } catch (logError) {
        console.error('Error logging flow failure:', logError);
      }
    } finally {
      const endTime = Date.now();
      const executionTimeMs = endTime - startTime;
      
      // Update the flow_executions record with final status
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        await supabase.from('flow_executions').update({
          status: errorCount > 0 ? 'failed' : 'completed',
          completed_at: new Date().toISOString(),
          execution_time_ms: executionTimeMs,
          error_message: errorCount > 0 ? `${errorCount} error(s) during execution` : null,
        }).eq('id', executionId);
      } catch (e) {
        console.error('Error updating flow execution record:', e);
      }

      try {
        await flowMonitoringService.logFlowExecution(currentFlowProjectId, executionId, {
          node_count: nodes.length,
          edge_count: edges.length,
          execution_time_ms: executionTimeMs,
          status: errorCount > 0 ? 'failed' : 'completed',
          error_count: errorCount
        });
      } catch (error) {
        console.error('Error logging flow execution metrics:', error);
      }
      
      set({ 
        flowEndTime: endTime,
        isFlowRunning: false,
      });
      setRunningEdges([]);
    }
  },
  
  // UI state management
  setCurrentSelectedNodeId: (nodeId) => set({ currentSelectedNodeId: nodeId }),
  setCurrentSourceNodeId: (nodeId) => set({ currentSourceNodeId: nodeId }),
  setIsAddNodeDialogOpen: (isOpen) => set({ isAddNodeDialogOpen: isOpen }),
  setIsIntegrationDialogOpen: (isOpen) => set({ isIntegrationDialogOpen: isOpen }),
  setIsNodePropertiesOpen: (isOpen) => set({ isNodePropertiesOpen: isOpen }),
  setShouldSaveImmediately: (should) => set({ shouldSaveImmediately: should }),
  setIsDragInProgress: (isDragging) => set({ isDragInProgress: isDragging }),
  setIsDragModeEnabled: (enabled) => set({ isDragModeEnabled: enabled }),
}));
