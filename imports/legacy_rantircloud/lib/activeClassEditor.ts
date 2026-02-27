/**
 * Active Class Editor
 * Ensures that property edits only apply to the explicitly active class
 * Handles override creation when editing inherited properties
 */

import { ComponentPropertySources, StyleClass } from '@/types/classes';

/**
 * Apply a property edit to the active class
 * If the property is inherited, create an override in the active class
 */
export function applyPropertyToActiveClass(
  propertyName: string,
  propertyValue: any,
  activeClassName: string | null,
  currentProps: Record<string, any>,
  propertySources: ComponentPropertySources,
  classes: StyleClass[]
): {
  updatedProps: Record<string, any>;
  updatedSources: ComponentPropertySources;
  classUpdates?: { classId: string; className: string; styles: Record<string, any> };
} {
  if (!activeClassName) {
    // No active class - treat as manual property
    return {
      updatedProps: {
        ...currentProps,
        [propertyName]: propertyValue
      },
      updatedSources: {
        ...propertySources,
        [propertyName]: {
          source: 'manual'
        }
      }
    };
  }

  // Find the active class
  const activeClass = classes.find(cls => cls.name === activeClassName);
  if (!activeClass) {
    console.warn('[activeClassEditor] Active class not found:', activeClassName);
    return {
      updatedProps: currentProps,
      updatedSources: propertySources
    };
  }

  // Check current property source
  const currentSource = propertySources[propertyName];
  
  if (currentSource?.source === 'class' && currentSource.className !== activeClassName) {
    // Property is inherited - create override in active class
    console.log('[activeClassEditor] Creating override for inherited property:', {
      propertyName,
      inheritedFrom: currentSource.className,
      activeClass: activeClassName,
      newValue: propertyValue
    });
  }

  // Property should be set in active class
  // Return class update instruction
  return {
    updatedProps: {
      ...currentProps,
      [propertyName]: propertyValue
    },
    updatedSources: {
      ...propertySources,
      [propertyName]: {
        source: 'class',
        classId: activeClass.id,
        className: activeClass.name
      }
    },
    classUpdates: {
      classId: activeClass.id,
      className: activeClass.name,
      styles: {
        ...activeClass.styles,
        [propertyName]: propertyValue
      }
    }
  };
}

/**
 * Check if a property can be edited (only if from active class or manual)
 */
export function canEditProperty(
  propertyName: string,
  activeClassName: string | null,
  propertySources: ComponentPropertySources
): {
  canEdit: boolean;
  reason?: string;
  requiresOverride?: boolean;
} {
  const source = propertySources[propertyName];
  
  if (!source || source.source === 'manual') {
    return { canEdit: true };
  }
  
  if (source.source === 'class') {
    if (source.className === activeClassName) {
      return { canEdit: true };
    }
    
    // Property is from a different class - requires override
    return {
      canEdit: true,
      requiresOverride: true,
      reason: `This property is inherited from "${source.className}". Editing it will create an override in "${activeClassName}".`
    };
  }
  
  return { canEdit: false, reason: 'Unknown property source' };
}

/**
 * Delete a property from the active class
 * If property is inherited, it will show the inherited value again
 */
export function deletePropertyFromActiveClass(
  propertyName: string,
  activeClassName: string | null,
  currentProps: Record<string, any>,
  propertySources: ComponentPropertySources,
  classes: StyleClass[]
): {
  updatedProps: Record<string, any>;
  updatedSources: ComponentPropertySources;
  classUpdates?: { classId: string; className: string; styles: Record<string, any> };
  inheritedValue?: any;
} {
  if (!activeClassName) {
    // No active class - just remove the property
    const { [propertyName]: removed, ...rest } = currentProps;
    const { [propertyName]: removedSource, ...restSources } = propertySources;
    
    return {
      updatedProps: rest,
      updatedSources: restSources
    };
  }

  const activeClass = classes.find(cls => cls.name === activeClassName);
  if (!activeClass) {
    console.warn('[activeClassEditor] Active class not found:', activeClassName);
    return {
      updatedProps: currentProps,
      updatedSources: propertySources
    };
  }

  // Remove from active class styles
  const { [propertyName]: removed, ...remainingStyles } = activeClass.styles;
  
  // Check if property exists in other classes in the stack
  const source = propertySources[propertyName];
  let inheritedValue: any = undefined;
  
  if (source?.source === 'class') {
    // Find inherited value from other classes
    // This would require access to the full class stack
    // For now, just remove it
  }

  const { [propertyName]: removedProp, ...restProps } = currentProps;
  const { [propertyName]: removedSource, ...restSources } = propertySources;

  return {
    updatedProps: inheritedValue !== undefined ? { ...restProps, [propertyName]: inheritedValue } : restProps,
    updatedSources: restSources,
    classUpdates: {
      classId: activeClass.id,
      className: activeClass.name,
      styles: remainingStyles
    },
    inheritedValue
  };
}

/**
 * Batch update multiple properties to active class
 */
export function batchUpdateActiveClass(
  propertyUpdates: Record<string, any>,
  activeClassName: string | null,
  currentProps: Record<string, any>,
  propertySources: ComponentPropertySources,
  classes: StyleClass[]
): {
  updatedProps: Record<string, any>;
  updatedSources: ComponentPropertySources;
  classUpdates?: { classId: string; className: string; styles: Record<string, any> };
} {
  if (!activeClassName) {
    return {
      updatedProps: { ...currentProps, ...propertyUpdates },
      updatedSources: {
        ...propertySources,
        ...Object.keys(propertyUpdates).reduce((acc, key) => {
          acc[key] = { source: 'manual' };
          return acc;
        }, {} as ComponentPropertySources)
      }
    };
  }

  const activeClass = classes.find(cls => cls.name === activeClassName);
  if (!activeClass) {
    return {
      updatedProps: currentProps,
      updatedSources: propertySources
    };
  }

  const newSources: ComponentPropertySources = { ...propertySources };
  Object.keys(propertyUpdates).forEach(key => {
    newSources[key] = {
      source: 'class',
      classId: activeClass.id,
      className: activeClass.name
    };
  });

  return {
    updatedProps: {
      ...currentProps,
      ...propertyUpdates
    },
    updatedSources: newSources,
    classUpdates: {
      classId: activeClass.id,
      className: activeClass.name,
      styles: {
        ...activeClass.styles,
        ...propertyUpdates
      }
    }
  };
}
