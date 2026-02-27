import { useState, useCallback, useRef } from 'react';
import { AppComponent } from '@/types/appBuilder';

interface HistoryState {
  components: AppComponent[];
  selectedComponent?: string;
  timestamp: number;
}

interface EditorHistoryHook {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => HistoryState | null;
  redo: () => HistoryState | null;
  saveState: (components: AppComponent[], selectedComponent?: string) => void;
  clearHistory: () => void;
  getHistoryLength: () => number;
}

export function useEditorHistory(maxHistorySize: number = 50): EditorHistoryHook {
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const isUndoRedoRef = useRef(false);

  const saveState = useCallback((components: AppComponent[], selectedComponent?: string) => {
    // Don't save state during undo/redo operations
    if (isUndoRedoRef.current) {
      console.log('Skipping save during undo/redo operation');
      return;
    }

    const newState: HistoryState = {
      components: JSON.parse(JSON.stringify(components)), // Deep clone
      selectedComponent,
      timestamp: Date.now()
    };

    console.log('Saving state to history:', newState);

    setHistory(prev => {
      // Remove any redo history when saving a new state
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(newState);
      
      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        setCurrentIndex(prev => Math.max(0, prev - 1));
      } else {
        setCurrentIndex(newHistory.length - 1);
      }
      
      return newHistory;
    });
  }, [currentIndex, maxHistorySize]);

  const undo = useCallback((): HistoryState | null => {
    if (currentIndex <= 0) return null;

    console.log('Undo called, current index:', currentIndex);
    isUndoRedoRef.current = true;
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    
    // Reset flag after a longer delay to ensure state updates complete
    setTimeout(() => {
      isUndoRedoRef.current = false;
      console.log('Undo flag reset');
    }, 200);

    return history[newIndex];
  }, [currentIndex, history]);

  const redo = useCallback((): HistoryState | null => {
    if (currentIndex >= history.length - 1) return null;

    console.log('Redo called, current index:', currentIndex);
    isUndoRedoRef.current = true;
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    
    // Reset flag after a longer delay to ensure state updates complete
    setTimeout(() => {
      isUndoRedoRef.current = false;
      console.log('Redo flag reset');
    }, 200);

    return history[newIndex];
  }, [currentIndex, history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  const getHistoryLength = useCallback(() => history.length, [history.length]);

  return {
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    undo,
    redo,
    saveState,
    clearHistory,
    getHistoryLength
  };
}