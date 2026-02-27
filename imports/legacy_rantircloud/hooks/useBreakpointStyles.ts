/**
 * Hook to resolve styles for a class at a specific breakpoint
 * 
 * Desktop-first inheritance:
 * - Desktop: base styles only
 * - Tablet: desktop + tablet overrides
 * - Mobile: desktop + tablet + mobile overrides
 */

import { useMemo } from 'react';
import { useClassStore } from '@/stores/classStore';
import { useBreakpoint } from '@/contexts/BreakpointContext';
import { 
  Breakpoint, 
  resolveBreakpointStyles, 
  getPropertySourceBreakpoint,
  hasBreakpointOverrides
} from '@/lib/breakpoints';
import { StyleClass } from '@/types/classes';

export interface BreakpointStylesResult {
  /** Resolved styles for the current breakpoint (merged with parent breakpoints) */
  resolvedStyles: Record<string, any>;
  
  /** The class object */
  styleClass: StyleClass | null;
  
  /** Check if a property has an override at the current breakpoint */
  hasOverrideAtBreakpoint: (propertyKey: string) => boolean;
  
  /** Get the source breakpoint for a property (where it's actually defined) */
  getPropertySource: (propertyKey: string) => Breakpoint | null;
  
  /** Whether this class has any tablet overrides */
  hasTabletOverrides: boolean;
  
  /** Whether this class has any mobile overrides */
  hasMobileOverrides: boolean;
}

/**
 * Resolve styles for a class at the current viewport breakpoint
 */
export function useBreakpointStyles(className: string | null): BreakpointStylesResult {
  const { classes } = useClassStore();
  const { currentBreakpoint } = useBreakpoint();
  
  return useMemo(() => {
    const styleClass = className ? classes.find(c => c.name === className) : null;
    
    if (!styleClass) {
      return {
        resolvedStyles: {},
        styleClass: null,
        hasOverrideAtBreakpoint: () => false,
        getPropertySource: () => null,
        hasTabletOverrides: false,
        hasMobileOverrides: false,
      };
    }
    
    const resolvedStyles = resolveBreakpointStyles(
      styleClass.styles || {},
      styleClass.tabletStyles,
      styleClass.mobileStyles,
      currentBreakpoint
    );
    
    const hasOverrideAtBreakpoint = (propertyKey: string): boolean => {
      if (currentBreakpoint === 'tablet') {
        return styleClass.tabletStyles?.[propertyKey] !== undefined;
      }
      if (currentBreakpoint === 'mobile') {
        return styleClass.mobileStyles?.[propertyKey] !== undefined;
      }
      // Desktop doesn't have "overrides" - it's the base
      return styleClass.styles?.[propertyKey] !== undefined;
    };
    
    const getPropertySource = (propertyKey: string): Breakpoint | null => {
      return getPropertySourceBreakpoint(
        propertyKey,
        currentBreakpoint,
        styleClass.styles || {},
        styleClass.tabletStyles,
        styleClass.mobileStyles
      );
    };
    
    return {
      resolvedStyles,
      styleClass,
      hasOverrideAtBreakpoint,
      getPropertySource,
      hasTabletOverrides: hasBreakpointOverrides('tablet', styleClass.tabletStyles),
      hasMobileOverrides: hasBreakpointOverrides('mobile', undefined, styleClass.mobileStyles),
    };
  }, [className, classes, currentBreakpoint]);
}

/**
 * Resolve state styles (hover, focus, etc.) for a class at the current breakpoint
 */
export function useBreakpointStateStyles(
  className: string | null,
  state: 'hover' | 'focused' | 'pressed' | 'focus-visible' | 'focus-within'
): Record<string, any> {
  const { classes } = useClassStore();
  const { currentBreakpoint } = useBreakpoint();
  
  return useMemo(() => {
    const styleClass = className ? classes.find(c => c.name === className) : null;
    if (!styleClass) return {};
    
    // Get base state styles
    const baseStateStyles = styleClass.stateStyles?.[state] || {};
    
    if (currentBreakpoint === 'desktop') {
      return baseStateStyles;
    }
    
    if (currentBreakpoint === 'tablet') {
      const tabletStateStyles = styleClass.tabletStateStyles?.[state] || {};
      return { ...baseStateStyles, ...tabletStateStyles };
    }
    
    // Mobile: merge desktop + tablet + mobile
    const tabletStateStyles = styleClass.tabletStateStyles?.[state] || {};
    const mobileStateStyles = styleClass.mobileStateStyles?.[state] || {};
    return { ...baseStateStyles, ...tabletStateStyles, ...mobileStateStyles };
  }, [className, classes, currentBreakpoint, state]);
}

/**
 * Get which properties have breakpoint-specific overrides for a class
 * Returns an object mapping property keys to their override breakpoints
 */
export function useBreakpointOverrideMap(className: string | null): Record<string, Breakpoint[]> {
  const { classes } = useClassStore();
  
  return useMemo(() => {
    const styleClass = className ? classes.find(c => c.name === className) : null;
    if (!styleClass) return {};
    
    const overrideMap: Record<string, Breakpoint[]> = {};
    
    // Check all properties in tablet and mobile styles
    const tabletStyles = styleClass.tabletStyles || {};
    const mobileStyles = styleClass.mobileStyles || {};
    
    // Collect all unique property keys
    const allKeys = new Set([
      ...Object.keys(tabletStyles),
      ...Object.keys(mobileStyles)
    ]);
    
    allKeys.forEach(key => {
      const breakpoints: Breakpoint[] = [];
      if (tabletStyles[key] !== undefined) breakpoints.push('tablet');
      if (mobileStyles[key] !== undefined) breakpoints.push('mobile');
      if (breakpoints.length > 0) {
        overrideMap[key] = breakpoints;
      }
    });
    
    return overrideMap;
  }, [className, classes]);
}

/**
 * Check if a specific section has breakpoint overrides
 * Returns { hasTabletOverride, hasMobileOverride } for the given section properties
 */
export function useSectionBreakpointOverrides(
  className: string | null,
  sectionProperties: string[]
): { hasTabletOverride: boolean; hasMobileOverride: boolean } {
  const { classes } = useClassStore();
  
  return useMemo(() => {
    const styleClass = className ? classes.find(c => c.name === className) : null;
    if (!styleClass) return { hasTabletOverride: false, hasMobileOverride: false };
    
    const tabletStyles = styleClass.tabletStyles || {};
    const mobileStyles = styleClass.mobileStyles || {};
    
    const hasTabletOverride = sectionProperties.some(prop => tabletStyles[prop] !== undefined);
    const hasMobileOverride = sectionProperties.some(prop => mobileStyles[prop] !== undefined);
    
    return { hasTabletOverride, hasMobileOverride };
  }, [className, classes, sectionProperties]);
}
