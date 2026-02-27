/**
 * Breakpoint Context - Provides current editing breakpoint throughout the app
 * 
 * This context wraps the app builder and provides:
 * - Current viewport/breakpoint from the store
 * - Helper functions for breakpoint-aware operations
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { 
  Breakpoint, 
  getBreakpointWidth, 
  isBreakpointSmaller,
  getParentBreakpoint,
  BREAKPOINTS 
} from '@/lib/breakpoints';

interface BreakpointContextValue {
  /** Current viewport/breakpoint being edited */
  currentBreakpoint: Breakpoint;
  
  /** Whether we're editing at a non-desktop breakpoint */
  isResponsiveMode: boolean;
  
  /** Check if a breakpoint is the current one */
  isCurrentBreakpoint: (breakpoint: Breakpoint) => boolean;
  
  /** Check if a breakpoint is smaller than current */
  isSmallerBreakpoint: (breakpoint: Breakpoint) => boolean;
  
  /** Get the parent breakpoint (what current inherits from) */
  parentBreakpoint: Breakpoint | null;
  
  /** Get canonical width for the current breakpoint */
  breakpointWidth: number;
  
  /** Get breakpoint info */
  breakpointInfo: typeof BREAKPOINTS[Breakpoint];
}

const BreakpointContext = createContext<BreakpointContextValue | null>(null);

export function BreakpointProvider({ children }: { children: React.ReactNode }) {
  const viewport = useAppBuilderStore(state => state.viewport);
  
  const value = useMemo<BreakpointContextValue>(() => {
    const currentBreakpoint = viewport as Breakpoint;
    
    return {
      currentBreakpoint,
      isResponsiveMode: currentBreakpoint !== 'desktop',
      isCurrentBreakpoint: (bp) => bp === currentBreakpoint,
      isSmallerBreakpoint: (bp) => isBreakpointSmaller(bp, currentBreakpoint),
      parentBreakpoint: getParentBreakpoint(currentBreakpoint),
      breakpointWidth: getBreakpointWidth(currentBreakpoint),
      breakpointInfo: BREAKPOINTS[currentBreakpoint],
    };
  }, [viewport]);
  
  return (
    <BreakpointContext.Provider value={value}>
      {children}
    </BreakpointContext.Provider>
  );
}

export function useBreakpoint() {
  const context = useContext(BreakpointContext);
  
  // If not in context, return default desktop state
  // This allows the hook to be used outside the provider during initial load
  if (!context) {
    return {
      currentBreakpoint: 'desktop' as Breakpoint,
      isResponsiveMode: false,
      isCurrentBreakpoint: (bp: Breakpoint) => bp === 'desktop',
      isSmallerBreakpoint: () => false,
      parentBreakpoint: null,
      breakpointWidth: 1440,
      breakpointInfo: BREAKPOINTS.desktop,
    };
  }
  
  return context;
}

/**
 * Hook to get the style key for the current breakpoint
 * Returns 'styles', 'tabletStyles', or 'mobileStyles'
 */
export function useBreakpointStyleKey(): 'styles' | 'tabletStyles' | 'mobileStyles' {
  const { currentBreakpoint } = useBreakpoint();
  
  switch (currentBreakpoint) {
    case 'tablet':
      return 'tabletStyles';
    case 'mobile':
      return 'mobileStyles';
    default:
      return 'styles';
  }
}

/**
 * Hook to get the state style key for the current breakpoint
 * Returns 'stateStyles', 'tabletStateStyles', or 'mobileStateStyles'
 */
export function useBreakpointStateStyleKey(): 'stateStyles' | 'tabletStateStyles' | 'mobileStateStyles' {
  const { currentBreakpoint } = useBreakpoint();
  
  switch (currentBreakpoint) {
    case 'tablet':
      return 'tabletStateStyles';
    case 'mobile':
      return 'mobileStateStyles';
    default:
      return 'stateStyles';
  }
}
