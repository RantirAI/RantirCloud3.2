import { useState, useCallback } from 'react';

interface MultiSelectHook {
  selectedComponents: string[];
  isSelected: (componentId: string) => boolean;
  selectComponent: (componentId: string, addToSelection?: boolean) => void;
  selectMultiple: (componentIds: string[]) => void;
  deselectAll: () => void;
  toggleSelection: (componentId: string) => void;
  getSelectedCount: () => number;
}

export function useMultiSelect(): MultiSelectHook {
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);

  const isSelected = useCallback((componentId: string): boolean => {
    return selectedComponents.includes(componentId);
  }, [selectedComponents]);

  const selectComponent = useCallback((componentId: string, addToSelection: boolean = false) => {
    setSelectedComponents(prev => {
      if (addToSelection) {
        // Add to selection if not already selected
        return prev.includes(componentId) ? prev : [...prev, componentId];
      } else {
        // Replace selection
        return [componentId];
      }
    });
  }, []);

  const selectMultiple = useCallback((componentIds: string[]) => {
    setSelectedComponents(componentIds);
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedComponents([]);
  }, []);

  const toggleSelection = useCallback((componentId: string) => {
    setSelectedComponents(prev => 
      prev.includes(componentId) 
        ? prev.filter(id => id !== componentId)
        : [...prev, componentId]
    );
  }, []);

  const getSelectedCount = useCallback(() => selectedComponents.length, [selectedComponents.length]);

  return {
    selectedComponents,
    isSelected,
    selectComponent,
    selectMultiple,
    deselectAll,
    toggleSelection,
    getSelectedCount
  };
}