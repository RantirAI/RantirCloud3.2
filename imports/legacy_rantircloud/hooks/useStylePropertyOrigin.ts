/**
 * Hook for detecting the origin of style properties in the class inheritance system
 * 
 * COLOR LOGIC (Webflow-style):
 * - PURPLE: Property is controlled by a design token/theme variable
 * - BLUE: Property was LOCALLY EDITED on THIS component (in __lockedProps)
 * - YELLOW: Property comes from ANY applied class (not locally edited yet) OR from parent inheritance
 * - GRAY: Default/unset value (no class defines it, no local edit)
 */

import { useMemo } from 'react';
import { useClassStore } from '@/stores/classStore';
import { useDesignTokenStore } from '@/stores/designTokenStore';
import { getDefaultPropsForComponent } from '@/lib/componentPropertyConfig';
import { InheritedPropertySource, INHERITABLE_CSS_PROPERTIES } from '@/lib/parentStyleInheritance';
import { useBreakpoint } from '@/contexts/BreakpointContext';
import { Breakpoint, getPropertySourceBreakpoint } from '@/lib/breakpoints';

export type PropertyOrigin = 'token' | 'active' | 'inherited' | 'parent' | 'breakpoint' | 'breakpoint-inherited' | 'none';

export interface PropertyOriginInfo {
  origin: PropertyOrigin;
  className?: string;
  tokenName?: string;
  color: string;
  tooltip: string;
}

/**
 * Deep equality check for comparing values
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

/**
 * Check if an object has any non-default values (recursively)
 */
function hasNonDefaultValues(classObj: any, defaultObj: any): boolean {
  if (classObj === null || classObj === undefined) return false;
  
  // If primitive, check if different from default
  if (typeof classObj !== 'object' || Array.isArray(classObj)) {
    const isEmpty = classObj === '' || classObj === null || classObj === undefined;
    if (isEmpty) return false;
    return !deepEqual(classObj, defaultObj);
  }
  
  // For objects, recursively check all properties
  for (const key of Object.keys(classObj)) {
    const classValue = classObj[key];
    const defaultValue = defaultObj?.[key];
    
    if (hasNonDefaultValues(classValue, defaultValue)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get the origin of a style property and its visual styling
 */
export function useStylePropertyOrigin(componentProps?: Record<string, any>, componentType?: string, componentId?: string) {
  const { classes } = useClassStore();
  const { getTokenIndicator } = useDesignTokenStore();
  const { currentBreakpoint } = useBreakpoint();

  // Get parent inherited styles and sources from component props
  const parentInheritedStyles = componentProps?._inheritedStyles as Record<string, any> | undefined;
  const parentInheritedSources = componentProps?._inheritedStyleSources as Record<string, InheritedPropertySource> | undefined;

  // Get default props for comparison using passed component type
  const defaultProps = useMemo(() => {
    if (!componentType) return {};
    return getDefaultPropsForComponent(componentType as any);
  }, [componentType]);

  // Get class stack (applied classes)
  const classStack = useMemo(() => {
    if (componentProps?.classStack && Array.isArray(componentProps.classStack)) {
      return componentProps.classStack.map((item: any) => {
        if (typeof item === 'string') return item;
        return item.name;
      });
    }
    return componentProps?.appliedClasses || [];
  }, [componentProps?.classStack, componentProps?.appliedClasses]);

  // PRIMARY class = first in the stack (base class)
  const primaryClassName = classStack.length > 0 ? classStack[0] : null;
  
  // ACTIVE class = the one being edited (from activeClass prop, defaults to last in stack)
  const activeClassName = componentProps?.activeClass || 
    (classStack.length > 0 ? classStack[classStack.length - 1] : null);
  
  // INHERITED classes = all classes that are NOT the active class
  const inheritedClassNames = useMemo(() => {
    return classStack.filter((name: string) => name !== activeClassName);
  }, [classStack, activeClassName]);
  
  // Check if this component is the ORIGINAL OWNER of the active class
  // Original owner = first component in the class's appliedTo array
  const isOriginalOwner = useMemo(() => {
    if (!activeClassName || !componentId) return false;
    
    const activeClass = classes.find(c => c.name === activeClassName);
    return activeClass?.appliedTo?.[0] === componentId;
  }, [activeClassName, componentId, classes]);
  
  // Key: If only 1 class applied, treat as "single class mode" - all properties show BLUE
  const isSingleClassMode = classStack.length === 1;

  // Check if there are secondary classes (more than one class in stack)
  const hasSecondaryClasses = classStack.length > 1;

  /**
   * Check if a property exists in a class's styles AND has non-default values
   * Supports both direct properties (marginTop) and nested (spacingControl.margin.top)
   */
  const hasPropertyInClass = (className: string, propertyPath: string): boolean => {
    const cls = classes.find(c => c.name === className);
    if (!cls || !cls.styles) return false;

    // Map properties to their possible storage locations
    const propertyPathMap: Record<string, string[]> = {
      // Spacing properties
      'margin': ['margin', 'spacingControl.margin'],
      'marginTop': ['marginTop', 'spacingControl.margin.top'],
      'marginRight': ['marginRight', 'spacingControl.margin.right'],
      'marginBottom': ['marginBottom', 'spacingControl.margin.bottom'],
      'marginLeft': ['marginLeft', 'spacingControl.margin.left'],
      'padding': ['padding', 'spacingControl.padding'],
      'paddingTop': ['paddingTop', 'spacingControl.padding.top'],
      'paddingRight': ['paddingRight', 'spacingControl.padding.right'],
      'paddingBottom': ['paddingBottom', 'spacingControl.padding.bottom'],
      'paddingLeft': ['paddingLeft', 'spacingControl.padding.left'],
      // Border properties
      'border': ['border'],
      'borderWidth': ['border.width', 'borderWidth'],
      'borderStyle': ['border.style', 'borderStyle'],
      'borderColor': ['border.color', 'borderColor'],
      'borderRadius': ['borderRadius'],
      'borderRadiusTopLeft': ['borderRadius.topLeft'],
      'borderRadiusTopRight': ['borderRadius.topRight'],
      'borderRadiusBottomRight': ['borderRadius.bottomRight'],
      'borderRadiusBottomLeft': ['borderRadius.bottomLeft'],
      // Effects properties
      'boxShadows': ['boxShadows'],
      'filters': ['filters'],
      'transitions': ['transitions'],
      'transforms': ['transforms'],
      // Typography properties - check both direct and nested typography object
      'fontFamily': ['fontFamily', 'typography.fontFamily'],
      'fontSize': ['fontSize', 'typography.fontSize'],
      'fontWeight': ['fontWeight', 'typography.fontWeight'],
      'lineHeight': ['lineHeight', 'typography.lineHeight'],
      'letterSpacing': ['letterSpacing', 'typography.letterSpacing'],
      'textAlign': ['textAlign', 'typography.textAlign'],
      'textTransform': ['textTransform', 'typography.textTransform'],
      'fontStyle': ['fontStyle', 'typography.fontStyle'],
      'textDecoration': ['textDecoration', 'typography.textDecoration'],
      'color': ['color', 'textColor', 'typography.color', 'typography.textColor'],
    };

    // Get all possible paths to check
    const pathsToCheck = propertyPathMap[propertyPath] || [propertyPath];

    for (const path of pathsToCheck) {
      const parts = path.split('.');
      let classValue: any = cls.styles;
      let defaultValue: any = defaultProps;
      
      for (const part of parts) {
        if (classValue === undefined || classValue === null) {
          classValue = undefined;
          break;
        }
        classValue = classValue[part];
        defaultValue = defaultValue?.[part];
      }
      
      // If value is empty, try next path
      if (classValue === undefined || classValue === null || classValue === '') {
        continue;
      }
      
      // For objects, check if ANY nested value differs from default
      if (typeof classValue === 'object' && !Array.isArray(classValue)) {
        if (hasNonDefaultValues(classValue, defaultValue)) {
          return true;
        }
        continue;
      }
      
      // For primitives, check if different from default
      if (!deepEqual(classValue, defaultValue)) {
        return true;
      }
    }
    
    return false;
  };

  // Get locked properties (locally edited on THIS component)
  const lockedProps = useMemo(() => {
    const props = componentProps?.__lockedProps || {};
    // Debug: Log locked props when they change
    if (Object.keys(props).length > 0) {
      console.log('[useStylePropertyOrigin] Locked props:', props);
    }
    return props;
  }, [componentProps?.__lockedProps]);

  /**
   * Check if a property is locked (locally edited on this component)
   * Supports both dot notation (margin.top) and camelCase (marginTop)
   */
  const isPropertyLocked = (propertyPath: string): boolean => {
    const parts = propertyPath.split('.');
    
    // Check the full dot-notation path first
    let current: any = lockedProps;
    for (const part of parts) {
      if (current === undefined || current === null) break;
      current = current[part];
    }
    if (current === true) return true;
    
    // Also check if the top-level property is locked (e.g., 'margin' for 'margin.top')
    if (parts.length > 1) {
      const topLevel = lockedProps[parts[0]];
      if (topLevel === true) return true;
      
      // Check camelCase version (e.g., 'margin.top' -> 'marginTop')
      const camelCase = parts[0] + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
      if (lockedProps[camelCase] === true) return true;
    }
    
    // Check if the camelCase version is locked directly (e.g., 'marginTop')
    if (lockedProps[propertyPath] === true) return true;
    
    return false;
  };

  /**
   * Get the origin info for a property
   * 
   * COLOR RULES (Webflow-style):
   * - PURPLE (#a855f7): Property is controlled by a design token
   * - BLUE (#1677ff): Property was LOCALLY EDITED on THIS component (in __lockedProps) OR overridden at current breakpoint
   * - YELLOW (#d9a800): Property comes from ANY applied class (not locally edited) OR inherited from parent breakpoint
   * - GRAY (#999999): Default/unset value
   */
  const getPropertyOrigin = (propertyPath: string, value?: any): PropertyOriginInfo => {
    // Check if value is default (undefined, null, empty, or '0')
    const isDefaultValue = value === undefined || value === null || value === '' || value === '0';

    // BREAKPOINT CHECK: If we're on tablet/mobile, check if property has breakpoint-specific override
    if (currentBreakpoint !== 'desktop' && activeClassName) {
      const classData = classes.find(c => c.name === activeClassName);
      if (classData) {
        const breakpointStyles = currentBreakpoint === 'tablet' 
          ? classData.tabletStyles 
          : classData.mobileStyles;
        
        // Check if this property is overridden at the current breakpoint
        if (breakpointStyles?.[propertyPath] !== undefined) {
          return {
            origin: 'breakpoint',
            className: activeClassName,
            color: '#1677ff', // Blue - overridden at this breakpoint
            tooltip: `Overridden at ${currentBreakpoint}`
          };
        }
        
        // Check if inherited from a larger breakpoint
        const sourceBreakpoint = getPropertySourceBreakpoint(
          propertyPath,
          currentBreakpoint,
          classData.styles || {},
          classData.tabletStyles,
          classData.mobileStyles
        );
        
        if (sourceBreakpoint && sourceBreakpoint !== currentBreakpoint && !isDefaultValue) {
          return {
            origin: 'breakpoint-inherited',
            className: activeClassName,
            color: '#d9a800', // Yellow - inherited from parent breakpoint
            tooltip: `From .${activeClassName} (${sourceBreakpoint})`
          };
        }
      }
    }

    // If value is default/unset, check if it's inherited from parent FIRST
    // This allows parent-inherited values to show even when the component itself has no value
    if (isDefaultValue) {
      // Check if this property is inherited from a parent element
      if (parentInheritedSources?.[propertyPath] && parentInheritedStyles?.[propertyPath] !== undefined) {
        const source = parentInheritedSources[propertyPath];
        return {
          origin: 'parent',
          className: source.parentClassName,
          color: '#d9a800', // Yellow - inherited from parent
          tooltip: `From .${source.parentClassName} (parent)`
        };
      }
      
      return {
        origin: 'none',
        color: '#999999',
        tooltip: 'Default value'
      };
    }
    
    // Check if controlled by a design token FIRST (highest priority indicator)
    const tokenInfo = getTokenIndicator(propertyPath, String(value));
    if (tokenInfo.isTokenControlled && tokenInfo.tokenName) {
      return {
        origin: 'token',
        tokenName: tokenInfo.tokenName,
        color: '#a855f7', // Purple - token controlled
        tooltip: `Token: ${tokenInfo.tokenName}`
      };
    }
    
    // Check if value matches the component's default
    const parts = propertyPath.split('.');
    let defaultValue: any = defaultProps;
    for (const part of parts) {
      defaultValue = defaultValue?.[part];
    }
    
    if (deepEqual(value, defaultValue)) {
      // Even if it matches default, check if the VALUE came from parent inheritance
      if (parentInheritedSources?.[propertyPath] && parentInheritedStyles?.[propertyPath] !== undefined) {
        const source = parentInheritedSources[propertyPath];
        return {
          origin: 'parent',
          className: source.parentClassName,
          color: '#d9a800', // Yellow - inherited from parent
          tooltip: `From .${source.parentClassName} (parent)`
        };
      }
      
      return {
        origin: 'none',
        color: '#999999',
        tooltip: 'Default value'
      };
    }

    // BLUE: Property was LOCALLY EDITED on this component (in __lockedProps)
    if (isPropertyLocked(propertyPath)) {
      return {
        origin: 'active',
        className: activeClassName || undefined,
        color: '#1677ff', // Blue - locally edited property
        tooltip: activeClassName ? `Edited in .${activeClassName}` : 'Locally edited'
      };
    }

    // Check if ANY of this component's applied classes define this property
    const hasPropertyInAnyAppliedClass = (): { found: boolean; className?: string } => {
      // Check active class first
      if (activeClassName && hasPropertyInClass(activeClassName, propertyPath)) {
        return { found: true, className: activeClassName };
      }
      // Then check other classes
      for (const className of inheritedClassNames) {
        if (hasPropertyInClass(className, propertyPath)) {
          return { found: true, className };
        }
      }
      return { found: false };
    };

    const classPropertyInfo = hasPropertyInAnyAppliedClass();

    // CRITICAL: Only show override if the component's class ACTUALLY defines this property
    // If classPropertyInfo.found is false, this component's classes don't define this property
    // so it cannot "override" anything - it should just inherit from parent
    
    if (classPropertyInfo.found) {
      // Component's class DOES define this property
      
      // BLUE: Single class mode - only 1 class applied, show all properties as BLUE
      if (isSingleClassMode && activeClassName && classPropertyInfo.className === activeClassName) {
        // Check if there's parent inheritance - if so, this is an override
        if (parentInheritedSources?.[propertyPath] && parentInheritedStyles?.[propertyPath] !== undefined) {
          return {
            origin: 'active',
            className: activeClassName,
            color: '#1677ff', // Blue - overriding parent
            tooltip: `Overrides parent with .${activeClassName}`
          };
        }
        return {
          origin: 'active',
          className: activeClassName,
          color: '#1677ff', // Blue - single class mode
          tooltip: `From .${activeClassName}`
        };
      }

      // BLUE: This component is the ORIGINAL OWNER of the active class
      if (isOriginalOwner && activeClassName && classPropertyInfo.className === activeClassName) {
        // Check if there's parent inheritance - if so, this is an override
        if (parentInheritedSources?.[propertyPath] && parentInheritedStyles?.[propertyPath] !== undefined) {
          return {
            origin: 'active',
            className: activeClassName,
            color: '#1677ff', // Blue - overriding parent
            tooltip: `Overrides parent with .${activeClassName}`
          };
        }
        return {
          origin: 'active',
          className: activeClassName,
          color: '#1677ff', // Blue - original owner of the class
          tooltip: `From .${activeClassName} (owner)`
        };
      }

      // BLUE: If this property is overriding parent inheritance (class explicitly defines it)
      if (parentInheritedSources?.[propertyPath] && parentInheritedStyles?.[propertyPath] !== undefined) {
        return {
          origin: 'active',
          className: classPropertyInfo.className,
          color: '#1677ff', // Blue - overriding parent
          tooltip: `Overrides parent with .${classPropertyInfo.className}`
        };
      }

      // YELLOW: Property comes from a class on THIS component (not overriding parent)
      return {
        origin: 'inherited',
        className: classPropertyInfo.className,
        color: '#d9a800', // Yellow - from class (not locally edited yet)
        tooltip: `From .${classPropertyInfo.className}`
      };
    }
    
    // Component's classes DO NOT define this property - cannot override parent

    // Component's classes DO NOT define this property
    // Check if property is inherited from a PARENT element's class
    if (parentInheritedSources?.[propertyPath] && parentInheritedStyles?.[propertyPath] !== undefined) {
      const source = parentInheritedSources[propertyPath];
      // YELLOW - inheriting from parent (component has no override)
      return {
        origin: 'parent',
        className: source.parentClassName,
        color: '#d9a800',
        tooltip: `From .${source.parentClassName} (parent)`
      };
    }

    // No class defines this property - gray
    return {
      origin: 'none',
      color: '#999999',
      tooltip: 'Manual property'
    };
  };

  /**
   * Check if any property in a list has a specific origin type
   * 'active' = locally edited on this component (in __lockedProps) OR original owner of class
   * 'inherited' = comes from any applied class (not original owner)
   * 'parent' = inherited from a parent element in the component tree
   */
  const hasOriginType = (propertyPaths: string[], originType: PropertyOrigin): boolean => {
    return propertyPaths.some(path => {
      // Check if property is LOCALLY EDITED (locked) OR belongs to active class being edited
      if (originType === 'active') {
        if (isPropertyLocked(path)) {
          return true;
        }
        // If the ACTIVE class has this property, show blue (user is editing this class)
        // This applies whether original owner or not - if active class has it, it's "active"
        if (activeClassName && hasPropertyInClass(activeClassName, path)) {
          return true;
        }
      }
      
      // Check if property comes from INHERITED classes (NOT the active class)
      if (originType === 'inherited') {
        // Skip active class - those are 'active' not 'inherited'
        // Only check inherited (non-active) classes
        for (const className of inheritedClassNames) {
          if (className === activeClassName) continue; // Skip active class
          if (hasPropertyInClass(className, path)) {
            if (!isPropertyLocked(path)) {
              return true;
            }
          }
        }
      }
      
      // Check if property is inherited from a PARENT element
      if (originType === 'parent') {
        if (parentInheritedSources?.[path] && parentInheritedStyles?.[path] !== undefined) {
          // Only count as parent-inherited if we don't have our own value
          if (!isPropertyLocked(path) && !hasPropertyInClass(activeClassName || '', path)) {
            return true;
          }
        }
      }
      
      // Fallback to checking component value
      const value = getNestedValue(componentProps, path);
      const origin = getPropertyOrigin(path, value);
      return origin.origin === originType;
    });
  };

  /**
   * Get section colors based on properties
   * BLUE dot = section has properties from active class (or single class mode)
   * YELLOW dot = section has properties from non-active classes OR parent inheritance
   */
  const getSectionColors = (propertyPaths: string[]): { labelColor: string; dotColor?: string } => {
    // SINGLE CLASS MODE: Only 1 class applied → show BLUE for any edited values
    if (isSingleClassMode && activeClassName) {
      const hasEditedValueInClass = propertyPaths.some(path => {
        return hasPropertyInClass(activeClassName, path);
      });
      
      if (hasEditedValueInClass) {
        return { 
          labelColor: "text-[#1677ff]", 
          dotColor: "bg-[#1677ff]" 
        };
      }
      
      // Check for parent-inherited properties even in single class mode
      const hasParentInherited = hasOriginType(propertyPaths, 'parent');
      if (hasParentInherited) {
        return { 
          labelColor: "text-[#d9a800]", 
          dotColor: "bg-[#d9a800]" 
        };
      }
      
      return { labelColor: "text-muted-foreground" };
    }

    // MULTI-CLASS MODE: Show BLUE for active class, YELLOW for inherited or parent
    const hasActive = hasOriginType(propertyPaths, 'active');
    const hasInherited = hasOriginType(propertyPaths, 'inherited');
    const hasParent = hasOriginType(propertyPaths, 'parent');

    if (hasActive) {
      return { 
        labelColor: "text-[#1677ff]", 
        dotColor: "bg-[#1677ff]" 
      };
    } else if (hasInherited || hasParent) {
      return { 
        labelColor: "text-[#d9a800]", 
        dotColor: "bg-[#d9a800]" 
      };
    }
    return { labelColor: "text-muted-foreground" };
  };

  return {
    getPropertyOrigin,
    hasOriginType,
    getSectionColors,
    isPropertyLocked,
    primaryClassName,
    activeClassName,
    inheritedClassNames,
    classStack,
    hasSecondaryClasses
  };
}

/**
 * Helper to get nested value from object
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Helper to create inline style object for property coloring
 */
export function getPropertyColorStyle(origin: PropertyOriginInfo): React.CSSProperties {
  return {
    color: origin.color
  };
}

/**
 * Helper to get CSS class for property coloring
 */
export function getPropertyColorClass(origin: PropertyOriginInfo): string {
  switch (origin.origin) {
    case 'active':
      return 'text-[#1677ff]';
    case 'inherited':
      return 'text-[#d9a800]';
    default:
      return 'text-muted-foreground';
  }
}
