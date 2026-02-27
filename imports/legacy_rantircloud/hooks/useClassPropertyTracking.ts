import { useMemo } from 'react';
import { ComponentPropertySources } from '@/types/classes';
import { isPropertyFromClass } from '@/lib/classPropertyMerger';

export function useClassPropertyTracking(
  componentProps?: Record<string, any>
) {
  const propertySources = useMemo<ComponentPropertySources>(() => {
    return (componentProps?._propertySource as ComponentPropertySources) || {};
  }, [componentProps?._propertySource]);

  const isFromClass = (propertyName: string): boolean => {
    return isPropertyFromClass(propertyName, propertySources);
  };

  const getPropertySource = (propertyName: string) => {
    return propertySources[propertyName];
  };

  const getClassControlledProps = (): string[] => {
    const applied = new Set<string>((componentProps?.appliedClasses as string[]) || []);
    const autoClassName = componentProps?._autoClass as string | undefined;
    return Object.keys(propertySources).filter(key => {
      const src = propertySources[key];
      if (!src || src.source !== 'class') return false;
      if (autoClassName && src.className === autoClassName) return false; // own auto-class
      if (applied.size > 0 && !applied.has(src.className || '')) return false; // ignore stale classes
      return true;
    });
  };

  const isFromExternalClass = (propertyName: string): boolean => {
    const source = propertySources[propertyName];
    if (!source || source.source !== 'class') return false;
    
    // Get the active class - the one currently being edited
    const appliedClasses: string[] = (componentProps?.appliedClasses as string[]) || [];
    const activeClassName = componentProps?.activeClass as string | undefined || 
      (appliedClasses.length > 0 ? appliedClasses[appliedClasses.length - 1] : null);
    
    // If the property is from the ACTIVE class, it's NOT external (should be blue)
    if (activeClassName && source.className === activeClassName) {
      return false; // It's from active class, not external
    }

    // Only highlight if the class is currently attached to the component
    if (appliedClasses.length > 0 && !appliedClasses.includes(source.className || '')) {
      return false; // stale source from a class that is no longer attached
    }
    
    return true; // It's from an external/inherited class (should be yellow)
  };

  return {
    propertySources,
    isFromClass,
    isFromExternalClass,
    getPropertySource,
    getClassControlledProps
  };
}
