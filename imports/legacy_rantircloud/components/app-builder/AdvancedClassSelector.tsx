import { useState, useRef, useMemo, useEffect } from 'react';
import { useClassStore } from '@/stores/classStore';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { ClassSelector } from './ClassSelector';

interface AdvancedClassSelectorProps {
  componentId: string;
  componentType?: string;
}

export function AdvancedClassSelector({ componentId, componentType = 'Element' }: AdvancedClassSelectorProps) {
  const { updateComponent, currentProject, currentPage } = useAppBuilderStore();
  const { applyClassToComponent, removeClassFromComponent, cleanupDuplicateClasses } = useClassStore();
  
  // Cleanup duplicates on mount
  useEffect(() => {
    cleanupDuplicateClasses(componentId);
  }, [componentId, cleanupDuplicateClasses]);
  
  // Find the component to get its applied classes
  const component = useMemo(() => {
    if (!currentProject || !currentPage) return null;
    const page = currentProject.pages.find(p => p.id === currentPage);
    if (!page) return null;
    
    const findComponent = (components: any[]): any => {
      for (const comp of components) {
        if (comp.id === componentId) return comp;
        if (comp.children) {
          const found = findComponent(comp.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findComponent(page.components);
  }, [currentProject, currentPage, componentId]);

  const appliedClasses = useMemo(() => {
    return component?.props?.appliedClasses || [];
  }, [component?.props?.appliedClasses]);

  const handleClassToggle = async (classId: string, className: string, isApplied: boolean) => {
    if (isApplied) {
      await applyClassToComponent(classId, componentId);
      // No extra updateComponent: applyClassToComponent now updates props (including appliedClasses)
    } else {
      await removeClassFromComponent(classId, componentId);
      // No extra updateComponent: removal updates appliedClasses internally
    }
  };

  return (
    <div className="space-y-3">
      <ClassSelector
        componentId={componentId}
        currentClassName={appliedClasses[0]} // Pass the first applied class if any
      />
    </div>
  );
}