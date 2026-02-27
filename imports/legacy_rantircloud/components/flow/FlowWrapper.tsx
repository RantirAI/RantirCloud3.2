
import { useState, useCallback, useEffect, useRef } from "react";
import { flowService } from "@/services/flowService";
import { FlowBuilderHeader } from "@/components/FlowBuilderHeader";
import { IntegrationsDialog } from "@/components/IntegrationsDialog";
import { toast } from "sonner";
import { FlowContent } from "./FlowContent";
import { useFlowStore } from "@/lib/flow-store";
import { useFlowAutosave } from "@/hooks/useFlowAutosave";
import { FlowNode } from "@/types/flowTypes";
import { nodeRegistry } from "@/lib/node-registry";
import { useReactFlow } from '@xyflow/react';
import { FlowDeploySidebar } from "./FlowDeploySidebar";
import { useFlowHistoryStore } from "@/stores/flowHistoryStore";

interface FlowWrapperProps {
  flowProjectId?: string;
  projectName: string;
  flowData: any;
  onProjectNameChange?: (newName: string) => void;
}

export function FlowWrapper({ 
  flowProjectId, 
  projectName, 
  flowData,
  onProjectNameChange
}: FlowWrapperProps) {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [isAutosaving, setIsAutosaving] = useState<boolean>(false);
  const [isIntegrationsDialogOpen, setIsIntegrationsDialogOpen] = useState(false);
  const [showEmulator, setShowEmulator] = useState(false);
  const [showDeploySidebar, setShowDeploySidebar] = useState(false);
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
  const flowContainerRef = useRef<HTMLDivElement | null>(null);
  const justCompletedExecutionRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  
  // Get state and actions from our store
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setIsIntegrationDialogOpen,
    currentSelectedNodeId,
    shouldSaveImmediately,
    setShouldSaveImmediately,
    setFlowProjectId,
    clearDebugLogs,
    setCurrentSelectedNodeId,
    isFlowRunning,
    flowEndTime,
  } = useFlowStore();

  // Set flow project ID when it changes
  useEffect(() => {
    if (flowProjectId) {
      // Set the current flow project ID in the store
      setFlowProjectId(flowProjectId);
      
      // Reset the load-once flag so new flow data can be loaded
      hasLoadedOnceRef.current = false;
      setIsInitialDataLoaded(false);
      
      // Clear any existing debug state but not the flow data
      clearDebugLogs();
      setCurrentSelectedNodeId(null);
      
      console.log("Flow project changed to:", flowProjectId);
    }
  }, [flowProjectId, setFlowProjectId, clearDebugLogs, setCurrentSelectedNodeId]);

  // Debug mount/unmount to detect unexpected remounts during execution
  useEffect(() => {
    console.log('[FlowWrapper] mounted');
    return () => {
      console.log('[FlowWrapper] unmounted');
    };
  }, []);

  // Listen for flow refresh requests from integrations dialog
  useEffect(() => {
    const handleFlowRefresh = (event: CustomEvent) => {
      console.log("Flow refresh requested:", event.detail);
      // The FlowBuilder component already handles the complete refresh
      // including node installations and flow data, so we don't need to
      // duplicate that logic here. Just log that we received the event.
    };

    window.addEventListener('flowRefreshRequested', handleFlowRefresh as EventListener);
    
    return () => {
      window.removeEventListener('flowRefreshRequested', handleFlowRefresh as EventListener);
    };
  }, []);

  // Handle immediate save when shouldSaveImmediately flag is set
  useEffect(() => {
    // Check if undo/redo is in progress - skip saving if so
    const { isUndoRedoInProgress } = useFlowHistoryStore.getState();
    
    // Only save if we have initial data loaded AND there are nodes to save AND not during undo/redo
    if (shouldSaveImmediately && flowProjectId && isInitialDataLoaded && nodes.length > 0 && !isUndoRedoInProgress) {
      const saveImmediately = async () => {
        try {
          setIsAutosaving(true);
          const serviceNodes = nodes.map(node => ({
            ...node,
            type: node.type || 'custom'
          }));
          console.log("Immediate save triggered:", { nodesCount: nodes.length, edgesCount: edges.length });
          await flowService.saveFlowData(flowProjectId, { 
            nodes: serviceNodes, 
            edges 
          });
          setLastSavedTime(new Date());
          console.log("Immediate save completed");
        } catch (error) {
          console.error("Error in immediate save:", error);
        } finally {
          setIsAutosaving(false);
          setShouldSaveImmediately(false); // Reset the flag
        }
      };

      saveImmediately();
    } else if (shouldSaveImmediately) {
      // Reset flag without saving if conditions not met
      setShouldSaveImmediately(false);
    }
  }, [shouldSaveImmediately, flowProjectId, nodes, edges, setShouldSaveImmediately, isInitialDataLoaded]);

  // Handle save flow data
  const handleSaveFlow = useCallback(async () => {
    if (!flowProjectId) {
      toast.error("No flow project ID available");
      return;
    }

    if (nodes.length === 0) {
      toast.warning("No nodes to save");
      return;
    }

    try {
      setIsSaving(true);
      console.log("Manual save triggered:", { flowProjectId, nodesCount: nodes.length, edgesCount: edges.length });
      
      // Convert FlowNode from flowTypes to the service format
      const serviceNodes = nodes.map(node => ({
        id: node.id,
        type: node.type || 'custom',
        position: node.position,
        data: node.data
      }));
      
      const result = await flowService.saveFlowData(flowProjectId, { 
        nodes: serviceNodes, 
        edges 
      });
      
      console.log("Manual save completed:", result);
      setLastSavedTime(new Date());
      toast.success(`Flow saved successfully (Version ${result?.version || 'unknown'})`);
    } catch (error) {
      console.error("Error saving flow:", error);
      toast.error(`Failed to save flow: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  }, [flowProjectId, nodes, edges]);

  // Setup autosave for debounced saves (property changes, etc.)
  useFlowAutosave({
    nodes, 
    edges, 
    flowProjectId, 
    onSaving: () => setIsAutosaving(true), 
    onSaved: () => {
      setIsAutosaving(false);
      setLastSavedTime(new Date());
    },
    disabled: isFlowRunning || !isInitialDataLoaded,
  });
  
  // Helper to compute structural signature
  const getStructuralSignature = useCallback((nodes: any[], edges: any[]) => {
    const nodeIds = nodes.map(n => n.id).sort().join(',');
    const edgeIds = edges.map(e => `${e.source}-${e.target}`).sort().join(',');
    return `n:${nodeIds}|e:${edgeIds}`;
  }, []);

  // Clear the "just completed" flag after flow finishes - MUST be before data loading effect
  useEffect(() => {
    if (!isFlowRunning && flowEndTime) {
      justCompletedExecutionRef.current = true;
      
      // Clear the flag after a longer delay to prevent race conditions
      const timer = setTimeout(() => {
        justCompletedExecutionRef.current = false;
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isFlowRunning, flowEndTime]);

  // Initial load of flow data - only load ONCE when first receiving data
  // This prevents the canvas from being overwritten after autosave updates flowData prop
  useEffect(() => {
    // Already loaded once - don't reload on subsequent flowData changes
    // This is critical: the parent may update flowData after autosave, but we should NOT
    // overwrite the user's current work with what was just saved
    if (hasLoadedOnceRef.current) {
      console.log("Skipping flow data reload - already loaded once this session");
      return;
    }
    
    // Check at runtime to avoid dependency on isFlowRunning
    const flowStore = useFlowStore.getState();
    
    // Don't reload canvas data while flow is executing OR just after execution
    if (flowStore.isFlowRunning || justCompletedExecutionRef.current) {
      console.log("Skipping canvas reload - flow is running or just completed");
      return;
    }
    
    if (flowData?.nodes && flowData?.edges) {
      // Clear stale history before loading new flow data to prevent old states from persisting
      useFlowHistoryStore.getState().clearHistory();
      
      if (flowData.nodes.length > 0) {
        console.log("Initial load of existing flow data:", { nodeCount: flowData.nodes.length, edgeCount: flowData.edges.length });
        
        const processedNodes = flowData.nodes.map((node: any, index: number) => {
          // Normalize node.type to valid React Flow types
          let nodeType = node.type;
          const dataType = node.data?.type || node.type;
          
          // Map invalid types to valid ones
          if (dataType === 'condition') {
            nodeType = 'conditional';
          } else if (!nodeType || nodeType === 'base' || nodeType === 'default' || !['custom', 'conditional', 'loop'].includes(nodeType)) {
            // If type is missing, 'base', 'default', or a plugin name like 'http-request', map to 'custom'
            nodeType = 'custom';
          }
          
          // Ensure default inputs for http-request nodes
          const defaultInputs = dataType === 'http-request' 
            ? { url: '', method: 'GET', headers: '{}', body: '' }
            : {};
          
          return {
            ...node,
            type: nodeType,
            data: {
              ...node.data,
              label: node.data?.label || 'Unnamed Node',
              inputs: { ...defaultInputs, ...(node.data?.inputs || {}) },
              type: dataType || 'http-request',
              isFirstNode: node.data?.isFirstNode ?? (index === 0),
            }
          };
        }) as FlowNode[];
        
        console.log("Setting initial canvas state");
        setNodes(processedNodes);
        setEdges(flowData.edges);
        hasLoadedOnceRef.current = true;
        setIsInitialDataLoaded(true);
      } else {
        console.log("Starting with an empty canvas (database has empty flow)");
        setNodes([]);
        setEdges([]);
        hasLoadedOnceRef.current = true;
        setIsInitialDataLoaded(true);
      }
    } else if (flowData === null) {
      // Explicitly null means no data exists (new flow)
      console.log("No flow data in database, starting fresh");
      useFlowHistoryStore.getState().clearHistory();
      setNodes([]);
      setEdges([]);
      hasLoadedOnceRef.current = true;
      setIsInitialDataLoaded(true);
    }
    // If flowData is undefined, we're still loading - don't set anything yet
  }, [flowData, flowProjectId]); // Removed getStructuralSignature and nodes/edges from dependencies

  // Normalize any condition nodes to use the dedicated 'conditional' React Flow component
  useEffect(() => {
    if (isFlowRunning) return;
    if (!nodes || nodes.length === 0) return;
    const needsNormalization = nodes.some(n => n?.data?.type === 'condition' && n.type !== 'conditional');
    if (needsNormalization) {
      const normalized = nodes.map(n => n?.data?.type === 'condition' ? { ...n, type: 'conditional' } : n) as FlowNode[];
      setNodes(normalized);
    }
  }, [nodes, setNodes, isFlowRunning]);
  // Function to get the center position of the viewport
  const getCenterPosition = (event: React.DragEvent) => {
    if (!flowContainerRef.current) {
      return { x: 250, y: 250 };
    }
    
    const reactFlowBounds = flowContainerRef.current.getBoundingClientRect();
    const centerX = reactFlowBounds.width / 2;
    const centerY = reactFlowBounds.height / 2;
    
    return { x: centerX, y: centerY };
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      
      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType) return;

      const plugin = nodeRegistry.getPlugin(nodeType);
      if (!plugin) return;

      // Find the last node in the chain to connect to
      let lastNode: FlowNode | null = null;
      if (nodes.length > 0) {
        // Find the node with no outgoing edges (the end of the chain)
        lastNode = nodes.find(node => 
          !edges.some(edge => edge.source === node.id)
        ) || nodes[nodes.length - 1]; // fallback to last node
      }

      const position = getCenterPosition(event);

      // Determine the React Flow node type based on the plugin type
      const getNodeType = (pluginType: string) => {
        if (pluginType === 'condition') return 'conditional';
        if (pluginType === 'for-each-loop') return 'for-each-loop';
        return 'custom';
      };

      const newNodeId = `node-${Date.now()}`;
      const newNode: FlowNode = {
        id: newNodeId,
        type: getNodeType(nodeType),
        position: {
          x: position.x, 
          y: lastNode ? lastNode.position.y + 150 : position.y 
        },
        data: {
          label: plugin.name,
          type: nodeType,
          category: plugin.category,
          inputs: {},
          color: plugin.color,
          isFirstNode: nodes.length === 0,
        }
      };

      addNode(newNode);
      
      // Auto-connect to the last node if exists
      if (lastNode) {
        onConnect({
          source: lastNode.id,
          target: newNodeId,
        });
      }
    },
    [addNode, nodes, edges, onConnect]
  );

  const handleOpenIntegrationDialog = () => {
    setIsIntegrationsDialogOpen(true);
  };

  const handleNameChange = async (newName: string) => {
    if (flowProjectId && onProjectNameChange) {
      onProjectNameChange(newName);
    }
  };

  // Check if there are any AI agent nodes
  const hasAiAgentNodes = nodes.some(node => node.data?.type === 'ai-agent');

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <FlowBuilderHeader 
        projectName={projectName}
        flowProjectId={flowProjectId}
        isSaving={isSaving}
        isAutosaving={isAutosaving}
        lastSavedTime={lastSavedTime}
        flowData={flowData}
        onSave={handleSaveFlow}
        onExport={() => {}}
        onOpenIntegrationDialog={handleOpenIntegrationDialog}
        onNameChange={handleNameChange}
        hasAiAgentNodes={hasAiAgentNodes}
        showEmulator={showEmulator}
        onToggleEmulator={() => setShowEmulator(!showEmulator)}
        onOpenDeploySidebar={() => setShowDeploySidebar(prev => !prev)}
      />
      <div className="flex-1 flex min-h-0 overflow-hidden" ref={flowContainerRef}>
        <div className="flex-1 relative min-h-0 overflow-hidden">
          <FlowContent 
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            showEmulator={showEmulator}
            onOpenEmbedConfig={() => setShowDeploySidebar(true)}
          />
        </div>

        {/* Deploy Sidebar */}
        {flowProjectId && (
          <FlowDeploySidebar
            flowProjectId={flowProjectId}
            flowName={projectName}
            isOpen={showDeploySidebar}
            onClose={() => setShowDeploySidebar(false)}
          />
        )}
      </div>
      
      <IntegrationsDialog 
        isOpen={isIntegrationsDialogOpen}
        onClose={() => {
          setIsIntegrationsDialogOpen(false);
          // Don't trigger flowRefreshRequested on dialog close
          // The individual install/uninstall actions already trigger the refresh
        }}
      />
    </div>
  );
}
