import { useEffect, useState, useCallback } from 'react';
import { useUserComponentStore } from '@/stores/userComponentStore';
import { UserComponent } from '@/types/userComponent';
import { AppComponent } from '@/types/appBuilder';

/**
 * Hook for live component resolution - fetches and subscribes to UserComponent definitions
 * Returns resolved component tree with prop values applied
 */
export function useUserComponent(userComponentId: string | undefined) {
  const { components, loadComponents } = useUserComponentStore();
  const [resolvedComponent, setResolvedComponent] = useState<UserComponent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userComponentId) {
      setResolvedComponent(null);
      return;
    }

    // Find component in store
    const component = components.find(c => c.id === userComponentId);
    if (component) {
      setResolvedComponent(component);
      setError(null);
    } else {
      setError(`Component ${userComponentId} not found`);
    }
  }, [userComponentId, components]);

  return {
    component: resolvedComponent,
    isLoading,
    error,
  };
}

/**
 * Resolves a component instance with prop values applied to the definition
 */
export function resolveComponentWithProps(
  definition: AppComponent,
  propValues: Record<string, any>,
  propBindings: Array<{ propId: string; targetId: string; property: string }>
): AppComponent {
  // Deep clone the definition
  const resolved = JSON.parse(JSON.stringify(definition)) as AppComponent;
  
  // Apply prop values to bound properties
  propBindings.forEach(binding => {
    const value = propValues[binding.propId];
    if (value !== undefined) {
      applyValueToComponent(resolved, binding.targetId, binding.property, value);
    }
  });
  
  return resolved;
}

/**
 * Recursively applies a value to a component property
 */
function applyValueToComponent(
  component: AppComponent,
  targetId: string,
  property: string,
  value: any
): boolean {
  if (component.id === targetId) {
    // Handle nested property paths like "style.backgroundColor"
    const parts = property.split('.');
    let target: any = component;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]]) {
        target[parts[i]] = {};
      }
      target = target[parts[i]];
    }
    
    target[parts[parts.length - 1]] = value;
    return true;
  }
  
  // Recursively search children
  if (component.children) {
    for (const child of component.children) {
      if (applyValueToComponent(child, targetId, property, value)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Hook to get all user components for the current project
 */
export function useUserComponents(projectId: string | undefined) {
  const { components, isLoading, error, loadComponents } = useUserComponentStore();
  
  useEffect(() => {
    if (projectId) {
      loadComponents(projectId);
    }
  }, [projectId, loadComponents]);
  
  return {
    components,
    isLoading,
    error,
  };
}
