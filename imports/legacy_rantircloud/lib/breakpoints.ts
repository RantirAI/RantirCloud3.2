/**
 * Breakpoint System - Central configuration for responsive design
 * 
 * Desktop-first inheritance model:
 * - Desktop: Base styles (no media query)
 * - Tablet: Overrides desktop at max-width: 991px
 * - Mobile: Overrides tablet at max-width: 767px
 */

export const BREAKPOINTS = {
  desktop: { 
    min: 992, 
    max: Infinity, 
    label: 'Desktop',
    icon: '🖥️',
    width: 1440
  },
  tablet: { 
    min: 768, 
    max: 991, 
    label: 'Tablet',
    icon: '📱',
    width: 768
  },
  mobile: { 
    min: 0, 
    max: 767, 
    label: 'Mobile',
    icon: '📲',
    width: 390
  }
} as const;

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

/**
 * Media query strings for CSS generation
 */
export const MEDIA_QUERIES = {
  tablet: '@media (max-width: 991px)',
  mobile: '@media (max-width: 767px)'
} as const;

/**
 * Get the media query string for a breakpoint
 */
export function getMediaQuery(breakpoint: Breakpoint): string | null {
  if (breakpoint === 'desktop') return null;
  return MEDIA_QUERIES[breakpoint];
}

/**
 * Determine which breakpoint applies for a given width
 */
export function getBreakpointForWidth(width: number): Breakpoint {
  if (width <= BREAKPOINTS.mobile.max) return 'mobile';
  if (width <= BREAKPOINTS.tablet.max) return 'tablet';
  return 'desktop';
}

/**
 * Get the canonical width for a breakpoint (for canvas preview)
 */
export function getBreakpointWidth(breakpoint: Breakpoint): number {
  return BREAKPOINTS[breakpoint].width;
}

/**
 * Check if a breakpoint is smaller than another
 */
export function isBreakpointSmaller(a: Breakpoint, b: Breakpoint): boolean {
  const order: Record<Breakpoint, number> = { desktop: 2, tablet: 1, mobile: 0 };
  return order[a] < order[b];
}

/**
 * Get all breakpoints that inherit from a given breakpoint
 * (smaller breakpoints inherit from larger ones)
 */
export function getInheritingBreakpoints(breakpoint: Breakpoint): Breakpoint[] {
  switch (breakpoint) {
    case 'desktop':
      return ['tablet', 'mobile'];
    case 'tablet':
      return ['mobile'];
    case 'mobile':
      return [];
  }
}

/**
 * Get the breakpoint that this breakpoint inherits from
 * (null for desktop since it's the base)
 */
export function getParentBreakpoint(breakpoint: Breakpoint): Breakpoint | null {
  switch (breakpoint) {
    case 'mobile':
      return 'tablet';
    case 'tablet':
      return 'desktop';
    case 'desktop':
      return null;
  }
}

/**
 * Resolve styles for a specific breakpoint by merging with parent breakpoints
 * Desktop-first: desktop → tablet → mobile
 */
export function resolveBreakpointStyles(
  desktopStyles: Record<string, any>,
  tabletStyles?: Record<string, any>,
  mobileStyles?: Record<string, any>,
  targetBreakpoint: Breakpoint = 'desktop'
): Record<string, any> {
  // Desktop: just return desktop styles
  if (targetBreakpoint === 'desktop') {
    return { ...desktopStyles };
  }

  // Tablet: merge desktop + tablet overrides
  if (targetBreakpoint === 'tablet') {
    return {
      ...desktopStyles,
      ...(tabletStyles || {})
    };
  }

  // Mobile: merge desktop + tablet + mobile overrides
  return {
    ...desktopStyles,
    ...(tabletStyles || {}),
    ...(mobileStyles || {})
  };
}

/**
 * Get the source breakpoint for a property value
 * (which breakpoint actually defines the property)
 */
export function getPropertySourceBreakpoint(
  propertyKey: string,
  targetBreakpoint: Breakpoint,
  desktopStyles: Record<string, any>,
  tabletStyles?: Record<string, any>,
  mobileStyles?: Record<string, any>
): Breakpoint | null {
  // Check from most specific to least specific
  if (targetBreakpoint === 'mobile') {
    if (mobileStyles?.[propertyKey] !== undefined) return 'mobile';
    if (tabletStyles?.[propertyKey] !== undefined) return 'tablet';
    if (desktopStyles?.[propertyKey] !== undefined) return 'desktop';
    return null;
  }

  if (targetBreakpoint === 'tablet') {
    if (tabletStyles?.[propertyKey] !== undefined) return 'tablet';
    if (desktopStyles?.[propertyKey] !== undefined) return 'desktop';
    return null;
  }

  // Desktop
  if (desktopStyles?.[propertyKey] !== undefined) return 'desktop';
  return null;
}

/**
 * Check if a property has an override at a specific breakpoint
 */
export function hasBreakpointOverride(
  propertyKey: string,
  breakpoint: Breakpoint,
  tabletStyles?: Record<string, any>,
  mobileStyles?: Record<string, any>
): boolean {
  if (breakpoint === 'tablet') {
    return tabletStyles?.[propertyKey] !== undefined;
  }
  if (breakpoint === 'mobile') {
    return mobileStyles?.[propertyKey] !== undefined;
  }
  return false;
}

/**
 * Check if a class has any overrides at a breakpoint (for UI indicators)
 */
export function hasBreakpointOverrides(
  breakpoint: Breakpoint,
  tabletStyles?: Record<string, any>,
  mobileStyles?: Record<string, any>
): boolean {
  if (breakpoint === 'tablet') {
    return !!tabletStyles && Object.keys(tabletStyles).length > 0;
  }
  if (breakpoint === 'mobile') {
    return !!mobileStyles && Object.keys(mobileStyles).length > 0;
  }
  return false;
}
