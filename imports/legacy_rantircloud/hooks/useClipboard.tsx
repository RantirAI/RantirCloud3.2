import { useState, useCallback } from 'react';
import { AppComponent } from '@/types/appBuilder';
import { toast } from 'sonner';

interface ClipboardData {
  components: AppComponent[];
  timestamp: number;
  operation: 'copy' | 'cut';
}

interface ClipboardHook {
  hasClipboardData: boolean;
  copyComponents: (components: AppComponent[]) => void;
  cutComponents: (components: AppComponent[]) => void;
  pasteComponents: () => AppComponent[] | null;
  clearClipboard: () => void;
  getClipboardInfo: () => { count: number; operation: 'copy' | 'cut' | null; };
}

export function useClipboard(): ClipboardHook {
  const [clipboardData, setClipboardData] = useState<ClipboardData | null>(null);

  const generateNewIds = (components: AppComponent[]): AppComponent[] => {
    return components.map(component => {
      const newId = `${component.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        ...component,
        id: newId,
        children: component.children ? generateNewIds(component.children) : undefined
      };
    });
  };

  const copyComponents = useCallback((components: AppComponent[]) => {
    if (!components.length) {
      toast.error('No components to copy');
      return;
    }

    // Deep clone components to avoid references
    const clonedComponents = JSON.parse(JSON.stringify(components));
    
    setClipboardData({
      components: clonedComponents,
      timestamp: Date.now(),
      operation: 'copy'
    });
    
    toast.success(`Copied ${components.length} component${components.length === 1 ? '' : 's'}`);
  }, []);

  const cutComponents = useCallback((components: AppComponent[]) => {
    if (!components.length) {
      toast.error('No components to cut');
      return;
    }

    // Deep clone components to avoid references
    const clonedComponents = JSON.parse(JSON.stringify(components));
    
    setClipboardData({
      components: clonedComponents,
      timestamp: Date.now(),
      operation: 'cut'
    });
    
    toast.success(`Cut ${components.length} component${components.length === 1 ? '' : 's'}`);
  }, []);

  const pasteComponents = useCallback((): AppComponent[] | null => {
    if (!clipboardData) {
      toast.error('Nothing to paste');
      return null;
    }

    // Check if clipboard data is not too old (5 minutes)
    const isExpired = Date.now() - clipboardData.timestamp > 5 * 60 * 1000;
    if (isExpired) {
      toast.error('Clipboard data has expired');
      setClipboardData(null);
      return null;
    }

    // Generate new IDs for pasted components to avoid duplicates
    const pastedComponents = generateNewIds(clipboardData.components);
    
    toast.success(`Pasted ${pastedComponents.length} component${pastedComponents.length === 1 ? '' : 's'}`);
    
    // Clear clipboard if it was a cut operation
    if (clipboardData.operation === 'cut') {
      setClipboardData(null);
    }
    
    return pastedComponents;
  }, [clipboardData]);

  const clearClipboard = useCallback(() => {
    setClipboardData(null);
    toast.info('Clipboard cleared');
  }, []);

  const getClipboardInfo = useCallback(() => {
    if (!clipboardData) {
      return { count: 0, operation: null };
    }
    
    return {
      count: clipboardData.components.length,
      operation: clipboardData.operation
    };
  }, [clipboardData]);

  return {
    hasClipboardData: !!clipboardData,
    copyComponents,
    cutComponents,
    pasteComponents,
    clearClipboard,
    getClipboardInfo
  };
}