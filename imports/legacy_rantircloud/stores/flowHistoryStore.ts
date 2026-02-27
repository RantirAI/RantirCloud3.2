import { create } from 'zustand';
import { Edge } from '@xyflow/react';
import { FlowNode } from '@/types/flowTypes';
import { v4 as uuidv4 } from 'uuid';

interface FlowHistoryState {
  id: string;
  nodes: FlowNode[];
  edges: Edge[];
  timestamp: number;
}

interface FlowHistoryStore {
  // State
  history: FlowHistoryState[];
  currentIndex: number;
  isUndoRedoInProgress: boolean;
  maxHistorySize: number;
  isInitialized: boolean;
  
  // Actions
  pushState: (nodes: FlowNode[], edges: Edge[]) => void;
  undo: () => FlowHistoryState | null;
  redo: () => FlowHistoryState | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  setUndoRedoInProgress: (inProgress: boolean) => void;
  initializeHistory: (nodes: FlowNode[], edges: Edge[]) => void;
}

// Deep clone function to prevent reference issues
const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// Compare two states to check if they're meaningfully different
const areStatesDifferent = (
  state1: { nodes: FlowNode[]; edges: Edge[] },
  state2: { nodes: FlowNode[]; edges: Edge[] }
): boolean => {
  // Quick check on lengths
  if (state1.nodes.length !== state2.nodes.length) return true;
  if (state1.edges.length !== state2.edges.length) return true;
  
  // Check node IDs and positions
  const nodeSignature1 = state1.nodes.map(n => `${n.id}:${n.position.x}:${n.position.y}`).sort().join('|');
  const nodeSignature2 = state2.nodes.map(n => `${n.id}:${n.position.x}:${n.position.y}`).sort().join('|');
  if (nodeSignature1 !== nodeSignature2) return true;
  
  // Check edge connections
  const edgeSignature1 = state1.edges.map(e => `${e.source}-${e.target}`).sort().join('|');
  const edgeSignature2 = state2.edges.map(e => `${e.source}-${e.target}`).sort().join('|');
  if (edgeSignature1 !== edgeSignature2) return true;
  
  // Check node data (inputs, labels, etc.)
  for (const node1 of state1.nodes) {
    const node2 = state2.nodes.find(n => n.id === node1.id);
    if (!node2) return true;
    
    const data1 = JSON.stringify(node1.data);
    const data2 = JSON.stringify(node2.data);
    if (data1 !== data2) return true;
  }
  
  return false;
};

export const useFlowHistoryStore = create<FlowHistoryStore>((set, get) => ({
  history: [],
  currentIndex: -1,
  isUndoRedoInProgress: false,
  maxHistorySize: 50,
  isInitialized: false,

  initializeHistory: (nodes: FlowNode[], edges: Edge[]) => {
    const { isInitialized } = get();
    if (isInitialized) return;
    
    // Only initialize if there are nodes
    if (nodes.length === 0) return;
    
    const initialState: FlowHistoryState = {
      id: uuidv4(),
      nodes: deepClone(nodes),
      edges: deepClone(edges),
      timestamp: Date.now(),
    };
    
    set({
      history: [initialState],
      currentIndex: 0,
      isInitialized: true,
    });
    
    console.log('[FlowHistory] Initialized with', nodes.length, 'nodes');
  },

  pushState: (nodes: FlowNode[], edges: Edge[]) => {
    const { history, currentIndex, maxHistorySize, isUndoRedoInProgress, isInitialized } = get();
    
    // Don't push if undo/redo is in progress
    if (isUndoRedoInProgress) return;
    
    // Don't push empty states
    if (nodes.length === 0) return;
    
    // Initialize if needed
    if (!isInitialized) {
      get().initializeHistory(nodes, edges);
      return;
    }
    
    // Check if the new state is different from the current one
    const currentState = history[currentIndex];
    if (currentState && !areStatesDifferent({ nodes, edges }, { nodes: currentState.nodes, edges: currentState.edges })) {
      return; // No meaningful change
    }
    
    const newState: FlowHistoryState = {
      id: uuidv4(),
      nodes: deepClone(nodes),
      edges: deepClone(edges),
      timestamp: Date.now(),
    };
    
    // Truncate any redo history (states after currentIndex)
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(newState);
    
    // Limit history size
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    }
    
    set({
      history: newHistory,
      currentIndex: newHistory.length - 1,
    });
    
    console.log('[FlowHistory] State pushed, history size:', newHistory.length);
  },

  undo: () => {
    const { history, currentIndex } = get();
    
    if (currentIndex <= 0) {
      console.log('[FlowHistory] Nothing to undo');
      return null;
    }
    
    const newIndex = currentIndex - 1;
    const prevState = history[newIndex];
    
    set({ currentIndex: newIndex });
    
    console.log('[FlowHistory] Undo to index', newIndex);
    return prevState;
  },

  redo: () => {
    const { history, currentIndex } = get();
    
    if (currentIndex >= history.length - 1) {
      console.log('[FlowHistory] Nothing to redo');
      return null;
    }
    
    const newIndex = currentIndex + 1;
    const nextState = history[newIndex];
    
    set({ currentIndex: newIndex });
    
    console.log('[FlowHistory] Redo to index', newIndex);
    return nextState;
  },

  canUndo: () => {
    const { currentIndex } = get();
    return currentIndex > 0;
  },

  canRedo: () => {
    const { history, currentIndex } = get();
    return currentIndex < history.length - 1;
  },

  clearHistory: () => {
    set({
      history: [],
      currentIndex: -1,
      isInitialized: false,
    });
    console.log('[FlowHistory] History cleared');
  },

  setUndoRedoInProgress: (inProgress: boolean) => {
    set({ isUndoRedoInProgress: inProgress });
  },
}));
