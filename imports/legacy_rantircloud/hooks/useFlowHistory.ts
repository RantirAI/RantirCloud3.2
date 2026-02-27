import { useCallback, useEffect, useRef } from 'react';
import { useFlowStore } from '@/lib/flow-store';
import { useFlowHistoryStore } from '@/stores/flowHistoryStore';
import debounce from 'lodash/debounce';

export function useFlowHistory() {
  const { nodes, edges, setNodes, setEdges } = useFlowStore();
  const { 
    pushState, 
    undo: undoHistory, 
    redo: redoHistory,
    canUndo,
    canRedo,
    isUndoRedoInProgress,
    setUndoRedoInProgress,
    initializeHistory,
    isInitialized,
  } = useFlowHistoryStore();
  
  const lastCapturedRef = useRef<string>('');
  
  // Debounced state capture
  const debouncedCapture = useRef(
    debounce((nodes: any[], edges: any[]) => {
      if (useFlowHistoryStore.getState().isUndoRedoInProgress) return;
      
      // Create a signature to avoid duplicate captures
      const signature = JSON.stringify({ 
        nodeIds: nodes.map(n => n.id).sort(),
        edgeIds: edges.map(e => `${e.source}-${e.target}`).sort(),
        nodeData: nodes.map(n => ({ id: n.id, data: n.data })),
      });
      
      if (signature === lastCapturedRef.current) return;
      lastCapturedRef.current = signature;
      
      pushState(nodes, edges);
    }, 500)
  ).current;
  
  // Capture state when nodes/edges change
  const captureState = useCallback(() => {
    if (isUndoRedoInProgress) return;
    if (nodes.length === 0) return;
    
    debouncedCapture(nodes, edges);
  }, [nodes, edges, isUndoRedoInProgress, debouncedCapture]);
  
  // Initialize history when first loading nodes
  useEffect(() => {
    if (!isInitialized && nodes.length > 0) {
      initializeHistory(nodes, edges);
    }
  }, [nodes, edges, isInitialized, initializeHistory]);
  
  // Capture changes
  useEffect(() => {
    if (isInitialized && !isUndoRedoInProgress && nodes.length > 0) {
      captureState();
    }
  }, [nodes, edges, isInitialized, isUndoRedoInProgress, captureState]);
  
  // Undo handler
  const handleUndo = useCallback(() => {
    const prevState = undoHistory();
    if (prevState) {
      setUndoRedoInProgress(true);
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      
      // Reset flag after state settles
      setTimeout(() => {
        setUndoRedoInProgress(false);
        // Update the last captured signature to prevent re-capturing the restored state
        lastCapturedRef.current = JSON.stringify({
          nodeIds: prevState.nodes.map(n => n.id).sort(),
          edgeIds: prevState.edges.map(e => `${e.source}-${e.target}`).sort(),
          nodeData: prevState.nodes.map(n => ({ id: n.id, data: n.data })),
        });
      }, 300);
    }
  }, [undoHistory, setNodes, setEdges, setUndoRedoInProgress]);
  
  // Redo handler  
  const handleRedo = useCallback(() => {
    const nextState = redoHistory();
    if (nextState) {
      setUndoRedoInProgress(true);
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      
      setTimeout(() => {
        setUndoRedoInProgress(false);
        lastCapturedRef.current = JSON.stringify({
          nodeIds: nextState.nodes.map(n => n.id).sort(),
          edgeIds: nextState.edges.map(e => `${e.source}-${e.target}`).sort(),
          nodeData: nextState.nodes.map(n => ({ id: n.id, data: n.data })),
        });
      }, 300);
    }
  }, [redoHistory, setNodes, setEdges, setUndoRedoInProgress]);
  
  return {
    captureState,
    handleUndo,
    handleRedo,
    canUndo: canUndo(),
    canRedo: canRedo(),
    isUndoRedoInProgress,
  };
}
