import { useEffect, useRef } from "react";
import { Edge, Node } from "@xyflow/react";
import { flowService } from "@/services/flowService";
import { useFlowHistoryStore } from "@/stores/flowHistoryStore";

interface UseFlowAutosaveProps {
  nodes: Node[];
  edges: Edge[];
  flowProjectId?: string;
  debounceTime?: number;
  onSaving?: () => void;
  onSaved?: () => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
}

export function useFlowAutosave({
  nodes,
  edges,
  flowProjectId,
  debounceTime = 3000,
  onSaving,
  onSaved,
  onError,
  disabled = false,
}: UseFlowAutosaveProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousStructureRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const prevCountsRef = useRef<{ nodes: number; edges: number }>({ nodes: 0, edges: 0 });

  // Helper function to get structural signature of the flow
  const getStructuralSignature = (nodes: Node[], edges: Edge[]) => {
    const nodeIds = nodes.map(n => n.id).sort();
    const edgeIds = edges.map(e => `${e.source}-${e.target}`).sort();
    return JSON.stringify({ nodeIds, edgeIds });
  };

  // Helper function to save flow data
  const saveFlowData = async () => {
    if (!flowProjectId) return;
    
    // GUARD: Don't save empty flows - this prevents accidental overwrites
    if (nodes.length === 0) {
      console.log("Skipping autosave - no nodes to save (preventing empty overwrite)");
      return;
    }

    try {
      onSaving?.();
      
      const flowNodes = nodes.map(node => ({
        id: node.id,
        type: node.type || 'custom',
        position: node.position,
        data: node.data
      }));

      console.log("Autosaving flow data:", { nodeCount: flowNodes.length, edgeCount: edges.length });
      await flowService.saveFlowData(flowProjectId, { 
        nodes: flowNodes, 
        edges 
      });
      
      console.log("Flow data saved successfully");
      onSaved?.();
    } catch (error) {
      console.error("Error saving flow data:", error);
      onError?.(error as Error);
    }
  };

useEffect(() => {
  // Check if undo/redo is in progress
  const { isUndoRedoInProgress } = useFlowHistoryStore.getState();
  
  // Respect disabled flag or undo/redo in progress: clear any pending timeout and skip saving
  if (disabled || isUndoRedoInProgress) {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    return;
  }
  // Don't autosave if no project ID
  if (!flowProjectId) return;
  
  // Initial load handled after computing structure

  // Get current structural signature
  const currentStructure = getStructuralSignature(nodes, edges);
  const prevCounts = prevCountsRef.current;
  const nodesAdded = nodes.length > prevCounts.nodes;
  const edgesAdded = edges.length > prevCounts.edges;

  // Initialize on first run (skip saving on load)
  if (isInitialLoadRef.current) {
    previousStructureRef.current = currentStructure;
    prevCountsRef.current = { nodes: nodes.length, edges: edges.length };
    isInitialLoadRef.current = false;
    return;
  }
  
  // Check if this is a structural change (nodes/edges added/removed)
  const isStructuralChange = previousStructureRef.current !== null && 
                            previousStructureRef.current !== currentStructure;

  // Update the previous references
  previousStructureRef.current = currentStructure;
  prevCountsRef.current = { nodes: nodes.length, edges: edges.length };

  // Clear any existing timeout
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
  }

  if (isStructuralChange || nodesAdded || edgesAdded) {
    // Save immediately for structural changes or when nodes/edges were added
    console.log("Structural change detected (added/removed), saving immediately");
    saveFlowData();
  }
  // No debounced saves - only save on structural changes

  // Mark that initial load is complete
  if (isInitialLoadRef.current) {
    isInitialLoadRef.current = false;
  }

  // Cleanup on unmount
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}, [nodes, edges, flowProjectId, debounceTime, onSaving, onSaved, onError, disabled]);

  useEffect(() => {
    if (disabled) return;
    const flushPending = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        // Fire and forget
        saveFlowData();
      }
    };

    const handleBeforeUnload = () => flushPending();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushPending();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flowProjectId, disabled]);
}

