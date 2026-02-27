/**
 * useClassStack - Manages class stack for a component
 * Handles active class tracking, inheritance, and property sources
 */

import { useMemo, useCallback } from 'react';
import { useClassStore } from '@/stores/classStore';
import { 
  mergeInheritedStyles, 
  getPropertySourcesFromStack,
  getPropertyStatus
} from '@/lib/autoClassSystem';
import { ComponentPropertySources } from '@/types/classes';

interface UseClassStackResult {
  classStack: string[];
  activeClass: string | null;
  mergedStyles: Record<string, any>;
  propertySources: ComponentPropertySources;
  getPropertyStatus: (propertyName: string) => 'active' | 'inherited' | 'manual' | 'none';
  getPropertyClassLevel: (propertyName: string) => number | undefined;
  isPropertyActive: (propertyName: string) => boolean;
  isPropertyInherited: (propertyName: string) => boolean;
  isPropertyManual: (propertyName: string) => boolean;
  setActiveClass: (className: string) => void;
  addClassToStack: (className: string) => void;
  removeClassFromStack: (className: string) => void;
}

export function useClassStack(
  componentId: string,
  componentProps?: Record<string, any>
): UseClassStackResult {
  const { classes } = useClassStore();
  
  // Get class stack from component props with explicit active class support
  const classStack = useMemo(() => {
    // New format: classStack array of objects with type/editable
    if (componentProps?.classStack && Array.isArray(componentProps.classStack)) {
      return componentProps.classStack.map((item: any) => {
        if (typeof item === 'string') {
          // Legacy format - convert to new format
          return item;
        }
        return item.name;
      });
    }
    
    // Legacy format: appliedClasses array
    const appliedClasses = componentProps?.appliedClasses || [];
    const autoClass = componentProps?._autoClass;
    
    // Auto-class is always at the end (most specific)
    const stack = [...appliedClasses];
    if (autoClass && !stack.includes(autoClass)) {
      stack.push(autoClass);
    }
    
    return stack;
  }, [componentProps?.classStack, componentProps?.appliedClasses, componentProps?._autoClass]);
  
  // Active class is explicitly set or defaults to the last in the stack
  const activeClass = useMemo(() => {
    // Check for explicit activeClass property (new system)
    if (componentProps?.activeClass) {
      return componentProps.activeClass;
    }
    
    // Fall back to last in stack (legacy behavior)
    return classStack.length > 0 ? classStack[classStack.length - 1] : null;
  }, [classStack, componentProps?.activeClass]);
  
  // Merge all styles from class stack
  const mergedStyles = useMemo(() => {
    return mergeInheritedStyles(classStack, classes);
  }, [classStack, classes]);
  
  // Get property sources from class stack
  const propertySources = useMemo(() => {
    const sources = getPropertySourcesFromStack(classStack, classes);
    
    // Merge with manual property sources
    const manualSources = componentProps?._propertySource || {};
    return { ...sources, ...manualSources };
  }, [classStack, classes, componentProps?._propertySource]);
  
  // Check property status
  const checkPropertyStatus = useCallback((propertyName: string) => {
    return getPropertyStatus(propertyName, activeClass, propertySources);
  }, [activeClass, propertySources]);
  
  // Get class level for a property (1-indexed position in stack)
  const getPropertyClassLevel = useCallback((propertyName: string): number | undefined => {
    const source = propertySources[propertyName];
    if (!source || source.source !== 'class' || !source.className) {
      return undefined;
    }
    
    const classIndex = classStack.indexOf(source.className);
    return classIndex >= 0 ? classIndex + 1 : undefined;
  }, [propertySources, classStack]);
  
  const isPropertyActive = useCallback((propertyName: string) => {
    return checkPropertyStatus(propertyName) === 'active';
  }, [checkPropertyStatus]);
  
  const isPropertyInherited = useCallback((propertyName: string) => {
    return checkPropertyStatus(propertyName) === 'inherited';
  }, [checkPropertyStatus]);
  
  const isPropertyManual = useCallback((propertyName: string) => {
    return checkPropertyStatus(propertyName) === 'manual';
  }, [checkPropertyStatus]);
  
  // Set active class (move to end of stack)
  const setActiveClass = useCallback((className: string) => {
    // Implementation would be in the component update logic
    console.log('Setting active class:', className);
  }, []);
  
  // Add class to stack
  const addClassToStack = useCallback((className: string) => {
    // Implementation would be in the component update logic
    console.log('Adding class to stack:', className);
  }, []);
  
  // Remove class from stack
  const removeClassFromStack = useCallback((className: string) => {
    // Implementation would be in the component update logic
    console.log('Removing class from stack:', className);
  }, []);
  
  return {
    classStack,
    activeClass,
    mergedStyles,
    propertySources,
    getPropertyStatus: checkPropertyStatus,
    getPropertyClassLevel,
    isPropertyActive,
    isPropertyInherited,
    isPropertyManual,
    setActiveClass,
    addClassToStack,
    removeClassFromStack
  };
}
