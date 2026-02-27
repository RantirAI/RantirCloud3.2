/**
 * Hook to resolve component styles from class references + overrides
 * 
 * This provides a clean interface for the renderer to get computed styles
 * without the component needing to store all style properties inline.
 * 
 * Subscribes to design tokens for real-time updates when ANY token changes
 * (colors, typography, spacing, radius, shadows, etc.)
 */

import { useMemo } from 'react';
import { useClassStore } from '@/stores/classStore';
import { useDesignTokenStore } from '@/stores/designTokenStore';
import { 
  resolveComponentStyles, 
  extractStyleProps,
  STYLE_PROPERTIES,
  NON_CSS_STYLE_KEYS,
  ResolvedStyles 
} from '@/lib/styleResolver';
import { 
  generateBoxShadowCSS,
  generateFilterCSS,
  generateTransitionCSS,
  generateTransformCSS,
} from '@/types/effects';
import { PseudoState } from '@/types/classes';
import { Breakpoint } from '@/lib/breakpoints';
import { resolveStylesAgainstTokens } from '@/lib/designTokenResolver';

interface UseResolvedStylesOptions {
  state?: PseudoState;
  /** Current viewport breakpoint for breakpoint-aware resolution */
  breakpoint?: Breakpoint;
}

/**
 * Resolve styles for a component using the new class-reference system
 * Falls back to legacy props if classNames not present.
 * 
 * Now supports breakpoint-aware resolution for proper canvas rendering.
 */
export function useResolvedStyles(
  component: {
    id: string;
    classNames?: string[];
    styleOverrides?: Record<string, any>;
    props?: Record<string, any>;
  },
  options: UseResolvedStylesOptions = {}
): ResolvedStyles {
  const { classes } = useClassStore();
  const { state = 'none', breakpoint = 'desktop' } = options;

  return useMemo(() => {
    // New format: use classNames + styleOverrides
    if (component.classNames && component.classNames.length > 0) {
      return resolveComponentStyles(
        component.classNames,
        component.styleOverrides || {},
        classes,
        state,
        breakpoint
      );
    }

    // Legacy format: use props.appliedClasses + inline props
    const props = component.props || {};
    const appliedClasses: string[] = props.appliedClasses || [];
    
    if (appliedClasses.length > 0) {
      // Resolve from classes first - now with breakpoint awareness
      const { styles: classStyles, sources } = resolveComponentStyles(
        appliedClasses,
        {},
        classes,
        state,
        breakpoint
      );

      // Merge with inline props (only locked props are true overrides)
      const inlineStyles = extractStyleProps(props);
      const mergedStyles = { ...classStyles };
      const mergedSources = { ...sources };

      // Get locked props - these are TRUE overrides explicitly set by user
      const lockedProps = props.__lockedProps || {};

      // Check which inline props are true overrides
      for (const [key, value] of Object.entries(inlineStyles)) {
        if (value !== undefined && value !== null) {
          const classValue = classStyles[key];
          const isLocked = lockedProps[key] === true;
          
          if (isLocked) {
            // User explicitly overrode this - use inline value
            mergedStyles[key] = value;
            mergedSources[key] = { source: 'override' };
          } else if (classValue === undefined) {
            // Class doesn't have this property - use inline as default
            mergedStyles[key] = value;
            mergedSources[key] = { source: 'default' };
          }
          // If class HAS the value and property is NOT locked,
          // class value wins (already in mergedStyles from classStyles)
        }
      }

      return { styles: mergedStyles, sources: mergedSources };
    }

    // No classes - use inline props only
    const inlineStyles = extractStyleProps(props);
    const sources: ResolvedStyles['sources'] = {};
    
    for (const key of Object.keys(inlineStyles)) {
      sources[key] = { source: 'default' };
    }

    return { styles: inlineStyles, sources };
  }, [component.classNames, component.styleOverrides, component.props, classes, state, breakpoint]);
}

/**
 * Convert resolved styles to React CSSProperties
 * Subscribes to design tokens to update colors in real-time
 */
export function useResolvedCSSStyles(
  component: {
    id: string;
    classNames?: string[];
    styleOverrides?: Record<string, any>;
    props?: Record<string, any>;
  },
  options: UseResolvedStylesOptions = {}
): React.CSSProperties {
  const { styles } = useResolvedStyles(component, options);
  // Subscribe to activeTokens for real-time color updates
  const { activeTokens } = useDesignTokenStore();
  
  return useMemo(() => {
    // Resolve ALL token-controlled values (colors, typography, spacing, radius, shadows)
    const tokenResolvedStyles = resolveStylesAgainstTokens(styles, activeTokens);
    
    const cssStyles: React.CSSProperties = {};
    
    for (const [key, value] of Object.entries(tokenResolvedStyles)) {
      // Skip non-CSS style keys (these are used for internal computation, not DOM styles)
      // This prevents React warnings like "Unsupported style property backgroundGradient"
      if (NON_CSS_STYLE_KEYS.has(key)) {
        continue;
      }
      
      // Convert style values to CSS-compatible format
      if (value !== undefined && value !== null) {
        const cssValue = convertToCSSValue(key, value);
        if (cssValue !== undefined) {
          (cssStyles as any)[key] = cssValue;
        }
      }
    }

    // --------------------------------------------------------------
    // Effects: compute array/object-based effects into actual CSS
    // (boxShadows -> boxShadow, filters -> filter, transitions -> transition, transforms -> transform)
    // --------------------------------------------------------------
    const s = tokenResolvedStyles as any;

    // Box shadows
    if (cssStyles.boxShadow === undefined && Array.isArray(s.boxShadows) && s.boxShadows.length > 0) {
      const css = generateBoxShadowCSS(s.boxShadows);
      if (css && css !== 'none') cssStyles.boxShadow = css;
    }

    // Filters
    if (cssStyles.filter === undefined && Array.isArray(s.filters) && s.filters.length > 0) {
      const css = generateFilterCSS(s.filters);
      if (css && css !== 'none') cssStyles.filter = css;
    }

    // Transitions
    if (cssStyles.transition === undefined && Array.isArray(s.transitions) && s.transitions.length > 0) {
      const css = generateTransitionCSS(s.transitions);
      if (css && css !== 'none') cssStyles.transition = css;
    }

    // Transforms
    if (cssStyles.transform === undefined && s.transforms && typeof s.transforms === 'object') {
      const css = generateTransformCSS(s.transforms);
      if (css && css !== 'none') cssStyles.transform = css;
    }
    
    return cssStyles;
  }, [styles, activeTokens]);
}

/**
 * Convert a style property value to CSS-compatible format
 */
function convertToCSSValue(key: string, value: any): any {
  // Handle TokenColorValue: { tokenRef: string, value: string }
  if (value && typeof value === 'object' && 'tokenRef' in value && 'value' in value) {
    // Return the resolved value from the token reference
    return typeof value.value === 'string' ? value.value : String(value.value || '');
  }

  // Support ColorAdvancedPicker values: { type: 'solid' | 'gradient', value: string, opacity?: number }
  if (value && typeof value === 'object' && 'type' in value && 'value' in value) {
    if (value.type === 'solid') {
      // Handle nested token refs inside color values
      let hex = value.value;
      if (typeof hex === 'object' && 'tokenRef' in hex) {
        hex = hex.value || '';
      }
      hex = String(hex || '');
      
      const opacity = typeof value.opacity === 'number' ? value.opacity : 100;
      if (opacity >= 100) return hex;

      // Convert #RRGGBB -> rgba(r,g,b,a)
      const clean = hex.replace('#', '');
      if (clean.length === 6) {
        const r = parseInt(clean.slice(0, 2), 16);
        const g = parseInt(clean.slice(2, 4), 16);
        const b = parseInt(clean.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
      }

      return hex;
    }

    // Gradient can't be represented as backgroundColor; let specialized renderers handle it.
    if (value.type === 'gradient') {
      if (key === 'background' || key === 'backgroundImage') return String(value.value);
      return undefined;
    }
  }

  // Handle complex unit objects (e.g., { unit: 'px', value: '100' })
  // CRITICAL: This handles dimension objects from DimensionControl
  if (typeof value === 'object' && value !== null) {
    if ('unit' in value && 'value' in value) {
      const dimValue = value.value;
      const dimUnit = value.unit;
      
      // Handle 'auto' unit - only return 'auto' if value is empty/auto/none
      if (dimUnit === 'auto') {
        // If there's no numeric value, it's truly 'auto'
        if (dimValue === '' || dimValue === 'auto' || dimValue === 'none' || dimValue === null || dimValue === undefined) {
          return undefined; // 'auto' is CSS default, no need to set explicitly
        }
        // Special CSS keywords like fit-content, min-content, max-content
        if (typeof dimValue === 'string' && ['fit-content', 'min-content', 'max-content'].includes(dimValue)) {
          return dimValue;
        }
      }
      
      // Handle 'auto' value explicitly
      if (dimValue === 'auto') return undefined;
      
      // Empty/null/undefined value - skip
      if (dimValue === '' || dimValue === null || dimValue === undefined) return undefined;
      
      // Valid dimension: combine value + unit
      return `${dimValue}${dimUnit || 'px'}`;
    }
    // Skip other complex objects that aren't valid CSS
    return undefined;
  }

  // Return primitives as-is
  return value;
}

/**
 * Deep equality check
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}
