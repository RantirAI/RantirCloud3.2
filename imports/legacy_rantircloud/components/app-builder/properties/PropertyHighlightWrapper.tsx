import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getPropertyIndicator, getIndicatorDotClass } from '@/lib/propertyIndicators';
import { cn } from '@/lib/utils';
import { isPropertyDSLinked, getDSTokenRefForProperty } from '@/lib/componentDSDefaults';

interface PropertyHighlightWrapperProps {
  propertyName: string;
  componentProps?: Record<string, any>;
  componentType?: string;
  /** The breakpoint where this property is actually defined (from useBreakpointStyles.getPropertySource) */
  breakpointSource?: 'desktop' | 'tablet' | 'mobile' | null;
  /** The currently active breakpoint in the editor */
  currentBreakpoint?: 'desktop' | 'tablet' | 'mobile';
  children: React.ReactNode;
}

export function PropertyHighlightWrapper({
  propertyName,
  componentProps,
  componentType,
  breakpointSource,
  currentBreakpoint,
  children
}: PropertyHighlightWrapperProps) {
  const propertySources = componentProps?._propertySource || {};
  const activeClassName = componentProps?.activeClass || 
    (componentProps?.appliedClasses?.[componentProps.appliedClasses.length - 1]);
  
  // Check for parent-inherited styles
  const parentInheritedSources = componentProps?._inheritedStyleSources || {};
  const parentInheritedStyles = componentProps?._inheritedStyles || {};
  
  // Check for Design System linkage (teal indicator)
  const dsTokenRefs = componentProps?._dsTokenRefs;
  const isDSLinked = isPropertyDSLinked(dsTokenRefs, propertyName);
  
  // Get the actual property value
  const propertyValue = componentProps?.[propertyName];
  
  // Check if this property has an inherited value from a parent element
  const parentSource = parentInheritedSources[propertyName];
  const hasParentValue =
    !!parentSource && parentInheritedStyles[propertyName] !== undefined && parentInheritedStyles[propertyName] !== null;

  // Breakpoint source awareness: show indicator when a property is overridden at current breakpoint
  // or inherited from a parent breakpoint
  const isNonDesktop = currentBreakpoint && currentBreakpoint !== 'desktop';
  const isOverriddenAtCurrentBreakpoint = isNonDesktop && breakpointSource === currentBreakpoint;
  const isInheritedFromParentBreakpoint = isNonDesktop && breakpointSource && breakpointSource !== currentBreakpoint;

  // Show breakpoint override indicator (blue dot for override, dimmed for inherited)
  if (isOverriddenAtCurrentBreakpoint) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              </div>
              {children}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-blue-600 border-blue-700 text-white text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-300" />
              <p className="font-medium">Overridden at {currentBreakpoint}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isInheritedFromParentBreakpoint) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
              </div>
              {children}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
              <p>Inherited from {breakpointSource}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // If DS-linked, show teal indicator (regardless of whether there's an explicit value or not)
  // The indicator shows when linked, and hides only when detached
  if (isDSLinked) {
    const hasExplicitOverride = propertyValue !== undefined && propertyValue !== null && propertyValue !== '';
    const tokenRefName = dsTokenRefs?.[propertyName];
    const normalizedType = componentType || '';
    const tokenDef = getDSTokenRefForProperty(normalizedType, propertyName);
    const label = tokenDef?.label || tokenRefName || 'DS';
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              </div>
              {children}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-teal-600 border-teal-700 text-white text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-teal-300" />
                <p className="font-medium">
                  {hasExplicitOverride ? 'Design System (overridden)' : 'Linked to Design System'}
                </p>
              </div>
              <p className="text-teal-200 text-[10px]">Token: {label}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Get applied classes for validation
  const appliedClasses: string[] = componentProps?.appliedClasses || [];
  
  const indicator = getPropertyIndicator(
    propertyName,
    activeClassName,
    propertySources,
    propertyValue,
    false,
    undefined,
    hasParentValue ? parentSource?.parentClassName : undefined,
    appliedClasses
  );

  // Only show indicator for class-based properties (blue or yellow) or parent-inherited
  if (indicator.color === 'gray' || indicator.color === 'green') {
    return <>{children}</>;
  }

  const dotClass = getIndicatorDotClass(indicator.color);
  const bgColor = indicator.color === 'blue' 
    ? 'bg-blue-500 border-blue-600' 
    : indicator.color === 'teal'
    ? 'bg-teal-500 border-teal-600'
    : 'bg-yellow-500 border-yellow-600';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            {/* Show yellow/blue dot indicator for parent-inherited or class-based properties */}
            <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 z-10">
              <div className={cn("w-1.5 h-1.5 rounded-full", dotClass)} />
            </div>
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className={cn("text-xs text-white", bgColor)}>
          <div className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", dotClass)} />
            <p>{indicator.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
