import React, { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/compact/Select";
import { Move, Anchor, AlertCircle, Info, RotateCcw, Smartphone, Tablet } from "lucide-react";

// Deep merge styles helper for class inheritance
function deepMergeStyles(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target };
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = target[key];
    
    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMergeStyles(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue;
    }
  }
  return result;
}
import { BoxShadowsEditor, FiltersEditor, TransitionsEditor, TransformsEditor } from './effects';
import { defaultTransformValues, generateTransformCSS } from '@/types/effects';
import { useAppBuilderStore } from "@/stores/appBuilderStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getCategorizedProperties, PropertyField, getDefaultPropsForComponent } from "@/lib/componentPropertyConfig";
import { AdvancedPropertyFieldRenderer } from "./AdvancedPropertyFieldRenderer";
import { ClassStateSelector } from "../ClassStateSelector";
import { SidebarProperties } from "./SidebarProperties";
import { NavHorizontalProperties } from "./NavHorizontalProperties";
import { NavVerticalProperties } from "./NavVerticalProperties";
import { useComponentStateStore } from "@/stores/componentStateStore";
import { TypographyControl } from "./TypographyControl";
import { LayoutControl } from "./LayoutControl";
import { PropertyHighlightWrapper } from "./PropertyHighlightWrapper";
import { useClassStore } from "@/stores/classStore";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { useStylePropertyOrigin } from "@/hooks/useStylePropertyOrigin";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BackgroundEditor } from "./BackgroundEditor";
import { PositionControl } from "./PositionControl";
import { useBreakpoint, useBreakpointStyleKey } from "@/contexts/BreakpointContext";
import { useBreakpointStyles, useSectionBreakpointOverrides } from "@/hooks/useBreakpointStyles";
import { Breakpoint, resolveBreakpointStyles } from "@/lib/breakpoints";
import { setIsApplyingClass } from '@/lib/autoClassState';
import { useParentInheritedStyles } from '@/hooks/useParentInheritedStyles';

interface StylesTabProps {
  component: any;
}

interface SectionHeaderProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  labelColor?: string;
  dotColor?: string;
  onReset?: () => void;
  hasEditedProperties?: boolean;
  onAuto?: () => void;
  showAutoButton?: boolean;
  hasTabletOverride?: boolean;
  hasMobileOverride?: boolean;
  currentBreakpoint?: Breakpoint;
}

function SectionHeader({
  title,
  isOpen,
  onToggle,
  labelColor = "text-muted-foreground",
  dotColor,
  onReset,
  hasEditedProperties,
  onAuto,
  showAutoButton,
  hasTabletOverride,
  hasMobileOverride,
  currentBreakpoint,
}: SectionHeaderProps) {
  return (
    <CollapsibleTrigger asChild>
      <div className="flex items-center justify-between w-full py-2 px-2 hover:bg-muted/50 cursor-pointer border-b border-border/50">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
          <span className={`font-medium text-xs ${labelColor}`}>{title}</span>
          {dotColor && <span className={`h-2 w-2 rounded-full ${dotColor}`}></span>}
          {/* Breakpoint override indicators */}
          {hasTabletOverride && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Tablet className="h-3 w-3 text-blue-500" />
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Has tablet override</p>
              </TooltipContent>
            </Tooltip>
          )}
          {hasMobileOverride && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Smartphone className="h-3 w-3 text-blue-500" />
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Has mobile override</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Show current breakpoint badge when not on desktop */}
          {currentBreakpoint && currentBreakpoint !== 'desktop' && (
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-500 rounded font-medium">
              {currentBreakpoint}
            </span>
          )}
          {showAutoButton && onAuto && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAuto();
                  }}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  Auto
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">Set all spacing to auto</p>
              </TooltipContent>
            </Tooltip>
          )}
          {hasEditedProperties && onReset && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReset();
                  }}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">Reset {title.toLowerCase()} to default</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </CollapsibleTrigger>
  );
}

/**
 * Breakpoint-aware Layout Control wrapper
 * Routes layout changes to the appropriate breakpoint styles
 */
function LayoutControlWithBreakpoint({ 
  component, 
  resolvedProps, 
  selectedComponent, 
  updateComponent 
}: { 
  component: any; 
  resolvedProps: Record<string, any>; 
  selectedComponent: string | null;
  updateComponent: (id: string, updates: any) => void;
}) {
  const { currentBreakpoint } = useBreakpoint();
  const { classes, updateClassBreakpoint, removeClassBreakpointProperty } = useClassStore();
  
  // Get the primary class name for breakpoint-aware updates
  const primaryClassName = component.props?.appliedClasses?.[0] || null;
  
  // Get breakpoint-specific styles for the primary class
  const { resolvedStyles, hasOverrideAtBreakpoint } = useBreakpointStyles(primaryClassName);
  
  // Revert handler for removing breakpoint overrides
  const handleRevertBreakpointProperty = (property: string) => {
    if (currentBreakpoint === 'desktop' || !primaryClassName) return;
    const classToUpdate = classes.find(c => c.name === primaryClassName);
    if (!classToUpdate) return;
    removeClassBreakpointProperty(classToUpdate.id, currentBreakpoint as 'tablet' | 'mobile', property);
  };
  
  // Merge breakpoint styles with resolved props for display
  const displayValues = {
    display: resolvedStyles?.display || resolvedProps?.display || component.props?.display || "block",
    flexDirection: resolvedStyles?.flexDirection ?? resolvedProps?.flexDirection ?? component.props?.flexDirection,
    justifyContent: resolvedStyles?.justifyContent ?? resolvedProps?.justifyContent ?? component.props?.justifyContent,
    alignItems: resolvedStyles?.alignItems ?? resolvedProps?.alignItems ?? component.props?.alignItems,
    gap: resolvedStyles?.gap ?? resolvedProps?.gap ?? component.props?.gap,
    gridTemplateColumns: resolvedStyles?.gridTemplateColumns ?? resolvedProps?.gridTemplateColumns ?? component.props?.gridTemplateColumns,
    gridTemplateRows: resolvedStyles?.gridTemplateRows ?? resolvedProps?.gridTemplateRows ?? component.props?.gridTemplateRows,
    gridAutoFlow: resolvedStyles?.gridAutoFlow ?? resolvedProps?.gridAutoFlow ?? component.props?.gridAutoFlow,
    textAlign: resolvedStyles?.textAlign ?? resolvedProps?.textAlign ?? component.props?.textAlign,
    width: resolvedStyles?.width ?? resolvedProps?.width ?? component.props?.width,
  };
  
  const handleLayoutChange = (layout: Record<string, any>) => {
    // If editing at desktop, update component props (which updates the class's base styles)
    if (currentBreakpoint === 'desktop') {
      updateComponent(selectedComponent!, {
        props: {
          ...component.props,
          ...layout,
        },
      });
    } else {
      // For tablet/mobile breakpoints:
      // 1. Update the class's breakpoint-specific styles (if a class exists)
      // 2. DO NOT write the style values into component.props (that would leak to desktop)
      
      if (primaryClassName) {
        const classToUpdate = classes.find(c => c.name === primaryClassName);
        if (classToUpdate) {
          // Update the class's breakpoint styles (persisted and generates correct @media CSS)
          updateClassBreakpoint(classToUpdate.id, currentBreakpoint, layout);
          
          // Clean up any leaked inline overrides from component.props
          const cleanedProps = { ...component.props };
          const cleanedLockedProps = { ...(cleanedProps.__lockedProps || {}) };
          const cleanedPropertySource = { ...(cleanedProps._propertySource || {}) };
          const cleanedEditedProps = { ...(cleanedProps.__editedProps || {}) };
          
          Object.keys(layout).forEach(key => {
            // Remove the inline prop entirely so it can never override other breakpoints
            // (critical for AI-generated components where layout keys may render even when not locked)
            delete (cleanedProps as any)[key];
            // Remove from locked props so class styles take precedence
            delete cleanedLockedProps[key];
            // Remove from edited props metadata (prevents the auto-class pipeline from re-diffing it later)
            delete cleanedEditedProps[key];
            // Mark as class-sourced
            cleanedPropertySource[key] = {
              source: 'class',
              className: primaryClassName,
            };
          });

          // IMPORTANT: This update is a metadata/cleanup update only.
          // It must NOT trigger the auto-class pipeline (which can accidentally merge old inline props
          // into the base/desktop class styles).
          setIsApplyingClass(true);
          try {
            updateComponent(selectedComponent!, {
              props: {
                ...cleanedProps,
                __lockedProps: cleanedLockedProps,
                __editedProps: cleanedEditedProps,
                _propertySource: cleanedPropertySource,
              },
            });
          } finally {
            setIsApplyingClass(false);
          }
          return;
        }
      }
      
      // Fallback: No class applied - allow editing via component props
      // The user should add a class for proper responsive support
      console.warn(`Breakpoint editing without a class. Consider adding a class for proper responsive styles.`);
      updateComponent(selectedComponent!, {
        props: {
          ...component.props,
          ...layout,
        },
      });
    }
  };
  
  return (
    <LayoutControl
      value={displayValues}
      onChange={handleLayoutChange}
      currentBreakpoint={currentBreakpoint}
      hasBreakpointOverride={hasOverrideAtBreakpoint}
      onRevertBreakpointProperty={handleRevertBreakpointProperty}
    />
  );
}

export function StylesTab({ component }: StylesTabProps) {
  const { selectedComponent, updateComponent } = useAppBuilderStore();
  const { activeEditingState, setActiveEditingState } = useComponentStateStore();
  const { classes, editingClassName, updateClassBreakpoint, updateClass, updateClassBreakpointState } = useClassStore();
  const { getSectionColors, getPropertyOrigin } = useStylePropertyOrigin(component.props, component.type, component.id);
  const { currentBreakpoint } = useBreakpoint();
  
  // Compute parent-inherited styles for this component (for yellow/blue indicators)
  const parentInheritedStyles = useParentInheritedStyles(component.id);

  // Get class stack and property sources
  const classStack = component.props?.appliedClasses || [];
  const activeClass =
    component.props?.activeClass || (classStack.length > 0 ? classStack[classStack.length - 1] : null);
  const inheritedClasses = classStack.filter((cls: string) => cls !== activeClass);
  const propertySources = component.props?._propertySource || {};
  
  // Primary class for breakpoint updates
  const primaryClassName = component.props?.appliedClasses?.[0] || null;
  
  // Get breakpoint styles for the primary class
  const { resolvedStyles: breakpointStyles, hasOverrideAtBreakpoint } = useBreakpointStyles(primaryClassName);

  // Compute class-resolved props (merges styles from all applied classes)
  // This ensures BackgroundEditor and other editors show the correct class values
  const resolvedProps = useMemo(() => {
    const appliedClasses: string[] = component.props?.appliedClasses || [];
    let classStyles: Record<string, any> = {};
    
    // Deep merge breakpoint-resolved styles from all applied classes in order
    // Desktop-first: Desktop base -> Tablet overrides -> Mobile overrides
    for (const className of appliedClasses) {
      const classData = classes.find(c => c.name === className);
      if (classData) {
        const stylesAtBreakpoint = resolveBreakpointStyles(
          classData.styles || {},
          classData.tabletStyles,
          classData.mobileStyles,
          currentBreakpoint
        );
        classStyles = deepMergeStyles(classStyles, stylesAtBreakpoint);
      }
    }
    
    // Overlay state-specific styles when editing a non-base state
    if (activeEditingState !== 'normal') {
      const stateKey = activeEditingState;
      for (const className of appliedClasses) {
        const classData = classes.find(c => c.name === className);
        if (classData) {
          // Resolve state styles for current breakpoint
          const desktopState = classData.stateStyles?.[stateKey] || {};
          let resolvedState = { ...desktopState };
          
          if ((currentBreakpoint === 'tablet' || currentBreakpoint === 'mobile') && classData.tabletStateStyles?.[stateKey]) {
            resolvedState = deepMergeStyles(resolvedState, classData.tabletStateStyles[stateKey]);
          }
          if (currentBreakpoint === 'mobile' && classData.mobileStateStyles?.[stateKey]) {
            resolvedState = deepMergeStyles(resolvedState, classData.mobileStateStyles[stateKey]);
          }
          
          if (Object.keys(resolvedState).length > 0) {
            classStyles = deepMergeStyles(classStyles, resolvedState);
          }
        }
      }
    }
    
    // Get locked props - these are user-edited and should override class styles
    const lockedProps = component.props?.__lockedProps || {};
    
    // Style properties that should come from class unless locked
    const stylePropertyKeys = [
      'backgroundColor', 'backgroundGradient', 'backgroundImage', 'backgroundLayerOrder',
      'color', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'textAlign',
      'border', 'borderRadius', 'opacity', 'boxShadow', 'boxShadows', 'filters', 
      'transitions', 'transforms', 'typography',
      // Sizing and positioning properties
      'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'top', 'right', 'bottom', 'left', 'zIndex', 'position',
      'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
      'gridTemplateColumns', 'gridTemplateRows', 'gridAutoFlow'
    ];
    
    // Start with class styles as base
    const result: Record<string, any> = { ...classStyles };
    
    // Collect which properties have state overrides (so locked props don't mask them)
    const stateOverriddenKeys = new Set<string>();
    if (activeEditingState !== 'normal') {
      const stateKey = activeEditingState;
      for (const className of appliedClasses) {
        const classData = classes.find(c => c.name === className);
        if (classData) {
          const desktopState = classData.stateStyles?.[stateKey] || {};
          Object.keys(desktopState).forEach(k => stateOverriddenKeys.add(k));
          if ((currentBreakpoint === 'tablet' || currentBreakpoint === 'mobile') && classData.tabletStateStyles?.[stateKey]) {
            Object.keys(classData.tabletStateStyles[stateKey]).forEach(k => stateOverriddenKeys.add(k));
          }
          if (currentBreakpoint === 'mobile' && classData.mobileStateStyles?.[stateKey]) {
            Object.keys(classData.mobileStateStyles[stateKey]).forEach(k => stateOverriddenKeys.add(k));
          }
        }
      }
    }
    
    // Override with component props where appropriate
    for (const key of Object.keys(component.props || {})) {
      if (!stylePropertyKeys.includes(key)) {
        // Non-style properties: always from component.props
        result[key] = component.props[key];
      } else if (stateOverriddenKeys.has(key)) {
        // State-overridden properties: class+state merged value wins (already in result)
        // Do NOT let locked/component props mask state edits
      } else if (lockedProps[key]) {
        // Locked style properties: from component.props (only in base state)
        result[key] = component.props[key];
      }
      // Else: class styles already in result
    }
    
    return result;
  }, [component.props, classes, currentBreakpoint, activeEditingState]);

  // Create enhanced component with parent inherited styles for PropertyHighlightWrapper
  const componentWithInheritedStyles = useMemo(() => ({
    ...component,
    props: {
      ...component.props,
      _inheritedStyles: parentInheritedStyles.styles,
      _inheritedStyleSources: parentInheritedStyles.sources,
    }
  }), [component, parentInheritedStyles]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    typography: true,
    layout: true,
    spacing: true,
    size: true,
    position: true,
    backgrounds: true,
    borders: true,
    effects: true,
    transform: true,
    content: true,
    styling: true,
    behavior: false,
    custom: true,
  });

  const categorizedProperties = getCategorizedProperties(component.type);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Helper to check if a value exists at a nested property path
  const getNestedValue = (obj: any, path: string): any => {
    if (!obj) return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  };

  const hasAnyNestedProperty = (obj: any, propertyName: string): boolean => {
    if (!obj) return false;
    
    // Check direct property
    if (obj[propertyName] !== undefined) return true;
    
    // Check nested properties recursively
    const checkNested = (current: any, path: string = ''): boolean => {
      if (!current || typeof current !== 'object') return false;
      
      for (const [key, value] of Object.entries(current)) {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (fullPath.startsWith(propertyName)) {
          if (value !== undefined && value !== null && value !== '') {
            return true;
          }
        }
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          if (checkNested(value, fullPath)) return true;
        }
      }
      return false;
    };
    
    return checkNested(obj);
  };

  // Check if editing is locked or if viewing a secondary class
  const editingClass = editingClassName ? classes.find(cls => cls.name === editingClassName) : null;
  
  // Determine PRIMARY class (first in appliedClasses stack) - already declared above as primaryClassName
  const appliedClasses = component?.props?.appliedClasses || [];
  
  // Check if the ACTIVE class (being edited) is the primary or a secondary
  const isEditingPrimaryClass = activeClass && activeClass === primaryClassName;
  const isEditingSecondaryClass = activeClass && activeClass !== primaryClassName && appliedClasses.includes(activeClass);
  
  // Check if there are secondary classes (any class besides the primary)
  const hasSecondaryClasses = appliedClasses.length > 1;
  
  // Primary class is locked ONLY when user tries to EDIT IT and secondary classes exist
  const isPrimaryLocked = isEditingPrimaryClass && hasSecondaryClasses;
  
  // Editing is ALLOWED when:
  // - Editing a secondary class (edits go to that secondary class, not primary)
  // - Editing primary class with NO secondary classes
  // Editing is BLOCKED when:
  // - Editing primary class AND secondary classes exist
  const isEditingLocked = isPrimaryLocked;

  /**
   * Route property changes to class stateStyles when editing a non-base state.
   * This writes to the class's pseudo-class rule (e.g., .class:hover) instead of base styles.
   */
  const handleStatePropertyChange = (propertyName: string, value: any) => {
    // Find the active class to write state styles to
    const targetClassName = activeClass || primaryClassName;
    if (!targetClassName) {
      toast.error('No class applied. Add a class to edit state styles.');
      return;
    }
    
    const classToUpdate = classes.find(c => c.name === targetClassName);
    if (!classToUpdate) return;
    
    const stateKey = activeEditingState as string;
    
    // Handle typography object — expand into individual keys for state styles
    if (propertyName === 'typography' && value && typeof value === 'object') {
      const t = value as Record<string, any>;
      const stateUpdate: Record<string, any> = { typography: t };
      if (t.fontFamily !== undefined) stateUpdate.fontFamily = t.fontFamily;
      if (t.fontSize !== undefined) stateUpdate.fontSize = t.fontSize;
      if (t.fontWeight !== undefined) stateUpdate.fontWeight = t.fontWeight;
      if (t.lineHeight !== undefined) stateUpdate.lineHeight = t.lineHeight;
      if (t.letterSpacing !== undefined) stateUpdate.letterSpacing = t.letterSpacing;
      if (t.textAlign !== undefined) stateUpdate.textAlign = t.textAlign;
      if (t.textDecoration !== undefined) stateUpdate.textDecoration = t.textDecoration;
      if (t.textTransform !== undefined) stateUpdate.textTransform = t.textTransform;
      if (t.fontStyle !== undefined) stateUpdate.fontStyle = t.fontStyle;
      if (t.color !== undefined) stateUpdate.color = t.color;
      
      updateClassBreakpointState(classToUpdate.id, currentBreakpoint, stateKey as any, stateUpdate);
      return;
    }
    
    // Standard property — write directly to state styles
    updateClassBreakpointState(classToUpdate.id, currentBreakpoint, stateKey as any, { [propertyName]: value });
  };

  const handlePropertyChange = (propertyName: string, value: any) => {
    // STATE ROUTING GATE: When editing a non-base state, route to class stateStyles
    if (activeEditingState !== 'normal') {
      handleStatePropertyChange(propertyName, value);
      return;
    }
    
    // Prevent editing ONLY if trying to edit the PRIMARY class when secondary classes exist
    if (isPrimaryLocked && primaryClassName) {
      toast.error(`Cannot modify .${primaryClassName} - ${appliedClasses.length - 1} dependent class${appliedClasses.length > 2 ? 'es' : ''} exist. Remove dependent classes first.`);
      return;
    }
    
    console.log(`Updating property ${propertyName} to:`, value);
    
    // Special handling for heading level changes - update typography defaults
    if (component.type === 'heading' && propertyName === 'level') {
      const headingTypographyDefaults: Record<number, any> = {
        1: { fontFamily: 'Inter, sans-serif', fontSize: '64', fontWeight: '700', lineHeight: '1.1', textAlign: 'left', color: '#000000', fontStyle: 'normal', textDecoration: 'none', letterSpacing: '0', textTransform: 'none' },
        2: { fontFamily: 'Inter, sans-serif', fontSize: '48', fontWeight: '700', lineHeight: '1.15', textAlign: 'left', color: '#000000', fontStyle: 'normal', textDecoration: 'none', letterSpacing: '0', textTransform: 'none' },
        3: { fontFamily: 'Inter, sans-serif', fontSize: '40', fontWeight: '600', lineHeight: '1.2', textAlign: 'left', color: '#000000', fontStyle: 'normal', textDecoration: 'none', letterSpacing: '0', textTransform: 'none' },
        4: { fontFamily: 'Inter, sans-serif', fontSize: '32', fontWeight: '600', lineHeight: '1.25', textAlign: 'left', color: '#000000', fontStyle: 'normal', textDecoration: 'none', letterSpacing: '0', textTransform: 'none' },
        5: { fontFamily: 'Inter, sans-serif', fontSize: '24', fontWeight: '600', lineHeight: '1.3', textAlign: 'left', color: '#000000', fontStyle: 'normal', textDecoration: 'none', letterSpacing: '0', textTransform: 'none' },
        6: { fontFamily: 'Inter, sans-serif', fontSize: '18', fontWeight: '600', lineHeight: '1.4', textAlign: 'left', color: '#000000', fontStyle: 'normal', textDecoration: 'none', letterSpacing: '0', textTransform: 'none' },
      };
      
      const newTypography = headingTypographyDefaults[value] || headingTypographyDefaults[1];
      const newFontSize = parseInt(newTypography.fontSize);
      
      updateComponent(selectedComponent!, {
        props: {
          ...component.props,
          level: value,
          typography: newTypography,
          fontSize: newFontSize,
        },
      });
      return;
    }
    
    // TypographyControl returns a typography object. For inheritance + class-first CSS export,
    // also mirror key typography fields as top-level props so the existing class-diff
    // pipeline can detect and persist them.
    if (propertyName === 'typography' && value && typeof value === 'object') {
      const t = value as Record<string, any>;
      
      // At non-desktop breakpoints, route typography changes through class breakpoint styles
      if (currentBreakpoint !== 'desktop' && primaryClassName) {
        const classToUpdate = classes.find(c => c.name === primaryClassName);
        if (classToUpdate) {
          // Build typography-related breakpoint style updates
          const breakpointUpdates: Record<string, any> = {};
          if (t.fontFamily !== undefined) breakpointUpdates.fontFamily = t.fontFamily;
          if (t.fontSize !== undefined) breakpointUpdates.fontSize = t.fontSize;
          if (t.fontWeight !== undefined) breakpointUpdates.fontWeight = t.fontWeight;
          if (t.lineHeight !== undefined) breakpointUpdates.lineHeight = t.lineHeight;
          if (t.letterSpacing !== undefined) breakpointUpdates.letterSpacing = t.letterSpacing;
          if (t.textAlign !== undefined) breakpointUpdates.textAlign = t.textAlign;
          if (t.textDecoration !== undefined) breakpointUpdates.textDecoration = t.textDecoration;
          if (t.textTransform !== undefined) breakpointUpdates.textTransform = t.textTransform;
          if (t.fontStyle !== undefined) breakpointUpdates.fontStyle = t.fontStyle;
          if (t.color !== undefined) breakpointUpdates.color = t.color;
          breakpointUpdates.typography = t;
          
          updateClassBreakpoint(classToUpdate.id, currentBreakpoint, breakpointUpdates);
          
          // Clean up leaked inline props
          const cleanedProps = { ...component.props };
          const cleanedLockedProps = { ...(cleanedProps.__lockedProps || {}) };
          const cleanedPropertySource = { ...(cleanedProps._propertySource || {}) };
          const cleanedEditedProps = { ...(cleanedProps.__editedProps || {}) };
          
          const typographyKeys = ['typography', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 
            'letterSpacing', 'textAlign', 'textDecoration', 'textTransform', 'fontStyle', 'color'];
          typographyKeys.forEach(key => {
            delete (cleanedProps as any)[key];
            delete cleanedLockedProps[key];
            delete cleanedEditedProps[key];
            cleanedPropertySource[key] = { source: 'class', className: primaryClassName };
          });
          
          setIsApplyingClass(true);
          try {
            updateComponent(selectedComponent!, {
              props: {
                ...cleanedProps,
                __lockedProps: cleanedLockedProps,
                __editedProps: cleanedEditedProps,
                _propertySource: cleanedPropertySource,
              },
            });
          } finally {
            setIsApplyingClass(false);
          }
          return;
        }
      }
      
      updateComponent(selectedComponent!, {
        props: {
          ...component.props,
          typography: t,
          // Mirror common typography keys at the top-level
          fontFamily: t.fontFamily ?? component.props?.fontFamily,
          fontSize: t.fontSize ?? component.props?.fontSize,
          fontWeight: t.fontWeight ?? component.props?.fontWeight,
          lineHeight: t.lineHeight ?? component.props?.lineHeight,
          letterSpacing: t.letterSpacing ?? component.props?.letterSpacing,
          textAlign: t.textAlign ?? component.props?.textAlign,
          textDecoration: t.textDecoration ?? component.props?.textDecoration,
          textTransform: t.textTransform ?? component.props?.textTransform,
          fontStyle: t.fontStyle ?? component.props?.fontStyle,
          color: t.color ?? component.props?.color,
        },
      });
      return;
    }

    updateComponent(selectedComponent!, {
      props: {
        ...component.props,
        [propertyName]: value,
      },
    });
  };

  /**
   * Breakpoint-aware property change handler
   * Routes property changes to the correct breakpoint styles
   */
  const handleBreakpointAwarePropertyChange = (propertyName: string, value: any) => {
    // STATE ROUTING GATE: When editing a non-base state, route to class stateStyles
    if (activeEditingState !== 'normal') {
      handleStatePropertyChange(propertyName, value);
      return;
    }
    
    // Prevent editing if primary is locked
    if (isPrimaryLocked && primaryClassName) {
      toast.error(`Cannot modify .${primaryClassName} - dependent classes exist.`);
      return;
    }
    
    // If at desktop, use the normal property change
    if (currentBreakpoint === 'desktop') {
      handlePropertyChange(propertyName, value);
      return;
    }
    
    // For tablet/mobile breakpoints:
    // 1. Update the class's breakpoint-specific styles (if a class exists)
    // 2. DO NOT write the style value into component.props (that would leak to desktop)
    
    if (primaryClassName) {
      const classToUpdate = classes.find(c => c.name === primaryClassName);
      if (classToUpdate) {
        // Update the class's breakpoint styles (this is persisted and generates correct @media CSS)
        updateClassBreakpoint(classToUpdate.id, currentBreakpoint, { [propertyName]: value });
        
        // Clean up any leaked inline overrides from component.props
        // This ensures desktop values aren't masked by old props
        const cleanedProps = { ...component.props };
        const cleanedLockedProps = { ...(cleanedProps.__lockedProps || {}) };
        const cleanedPropertySource = { ...(cleanedProps._propertySource || {}) };
        const cleanedEditedProps = { ...(cleanedProps.__editedProps || {}) };
        
        // Remove the inline prop entirely so it can never override other breakpoints
        delete (cleanedProps as any)[propertyName];
        // Remove from locked props so class styles take precedence
        delete cleanedLockedProps[propertyName];
        // Remove from edited props metadata
        delete cleanedEditedProps[propertyName];
        // Mark as class-sourced to prevent re-locking
        cleanedPropertySource[propertyName] = {
          source: 'class',
          className: primaryClassName,
        };
        
        // Update component to clean up leaked props (but don't write the new style value!)
        setIsApplyingClass(true);
        try {
          updateComponent(selectedComponent!, {
            props: {
              ...cleanedProps,
              __lockedProps: cleanedLockedProps,
              __editedProps: cleanedEditedProps,
              _propertySource: cleanedPropertySource,
            },
          });
        } finally {
          setIsApplyingClass(false);
        }
        return;
      }
    }
    
    // Fallback: No class applied - still allow editing via component props
    // This is less ideal but prevents the UI from being completely broken
    // In this case, the user should be prompted to create/apply a class for proper breakpoint support
    console.warn(`Breakpoint editing without a class applied. Consider adding a class for proper responsive styles.`);
    handlePropertyChange(propertyName, value);
  };

  const renderPropertySection = (categoryName: string, properties: PropertyField[]) => {
    // Filter out data and interactions properties from the properties tab
    const filteredProperties = properties.filter(
      (prop) => prop.category !== "data" && prop.category !== "interactions",
    );

    if (filteredProperties.length === 0) return null;

    // Get colors for this section using the new hook
    const propertyNames = filteredProperties.map((p) => p.name);
    const colors = getSectionColors(propertyNames);

    return (
      <Collapsible
        key={categoryName}
        open={openSections[categoryName]}
        onOpenChange={() => toggleSection(categoryName)}
      >
        <SectionHeader
          title={categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}
          isOpen={openSections[categoryName]}
          onToggle={() => toggleSection(categoryName)}
          {...colors}
        />
        <CollapsibleContent>
          <div className="p-1.5 bg-card">
            <div className="grid grid-cols-2 gap-1.5">
              {filteredProperties.map((property) => {
                const isFullWidth = [
                  "spacing",
                  "interactions",
                  "variable-binding",
                  "database-binding",
                  "border-radius",
                  "items-editor",
                ].includes(property.type);
                return (
                  <div key={property.name} className={isFullWidth ? "col-span-2" : "col-span-1"}>
                    <AdvancedPropertyFieldRenderer
                      field={property}
                      value={component.props?.[property.name]}
                      onChange={(value) => handlePropertyChange(property.name, value)}
                      component={componentWithInheritedStyles}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  // Helper function to filter properties by specific names
  const getPropertiesForSection = (sectionType: string, properties: PropertyField[]) => {
    switch (sectionType) {
      case "layout":
        return properties.filter((prop) =>
          [
            "display",
            "gap",
            "alignment",
            "justification",
            "gridCols",
            "gridGap",
            "flexDirection",
            "justifyContent",
            "alignItems",
            "gridTemplateColumns",
            "gridTemplateRows",
            "gridAutoFlow",
            "textAlign",
            "width",
          ].includes(prop.name),
        );
      case "spacing":
        return properties.filter((prop) => prop.name === "spacingControl" || prop.type === "spacing");
      case "size":
        return properties.filter((prop) =>
          ["width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight"].includes(prop.name),
        );
      case "position":
        return properties.filter((prop) =>
          ["position", "top", "right", "bottom", "left", "zIndex"].includes(prop.name),
        );
      case "backgrounds":
        return properties.filter((prop) =>
          ["backgroundColor", "backgroundGradient", "backgroundImage"].includes(prop.name),
        );
      case "borders":
        return properties.filter((prop) => ["border", "borderRadius"].includes(prop.name));
      case "effects":
        return properties.filter((prop) =>
          [
            "boxShadow",
            "shadowX",
            "shadowY",
            "shadowBlur",
            "shadowSpread",
            "shadowColor",
            "blurAmount",
            "translateX",
            "translateY",
            "skewX",
            "skewY",
            "rotate",
            "scale",
            "rotateX",
            "rotateY",
            "rotateZ",
            "perspective",
            "opacity",
            "filter",
          ].includes(prop.name),
        );
      case "typography":
        return properties.filter((prop) =>
          [
            "typography",
            "fontSize",
            "fontWeight",
            "textAlign",
            "color",
            "textDecoration",
            "lineHeight",
            "letterSpacing",
          ].includes(prop.name),
        );
      case "custom":
        return properties.filter((prop) => prop.name === "classes");
      default:
        return properties;
    }
  };

  // Get property names for a section (used for reset)
  const getSectionPropertyNames = (sectionName: string): string[] => {
    switch (sectionName) {
      case "layout":
        return ["display", "gap", "alignment", "justification", "gridCols", "gridGap", 
                "flexDirection", "justifyContent", "alignItems", "gridTemplateColumns", 
                "gridTemplateRows", "gridAutoFlow", "textAlign"];
      case "spacing":
        return ["spacingControl", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
                "marginTop", "marginRight", "marginBottom", "marginLeft"];
      case "size":
        return ["width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight"];
      case "position":
        return ["position", "top", "right", "bottom", "left", "zIndex"];
      case "backgrounds":
        return ["backgroundColor", "backgroundGradient", "backgroundImage"];
      case "borders":
        return ["border", "borderRadius"];
      case "effects":
        return ["boxShadows", "filters", "transitions", "boxShadow", "shadowX", "shadowY", 
                "shadowBlur", "shadowSpread", "shadowColor", "blurAmount", "opacity", "filter"];
      case "transform":
        return ["transforms", "translateX", "translateY", "skewX", "skewY", "rotate", "scale",
                "rotateX", "rotateY", "rotateZ", "perspective"];
      case "typography":
        return ["typography", "fontSize", "fontWeight", "textAlign", "color", "textDecoration",
                "lineHeight", "letterSpacing"];
      case "custom":
        return ["classes"];
      default:
        return [];
    }
  };

  // Check if a section has any edited properties (in class or component)
  const sectionHasEditedProperties = (sectionName: string): boolean => {
    const propertyNames = getSectionPropertyNames(sectionName);
    const defaultProps = getDefaultPropsForComponent(component.type);
    
    // Check active class styles first
    if (activeClass) {
      const activeClassObj = classes.find(cls => cls.name === activeClass);
      if (activeClassObj?.styles) {
        const hasClassProperty = propertyNames.some(propName => {
          const classValue = activeClassObj.styles[propName];
          return classValue !== undefined && classValue !== null;
        });
        if (hasClassProperty) return true;
      }
    }
    
    // Also check component props
    return propertyNames.some(propName => {
      const currentValue = component.props?.[propName];
      const defaultValue = defaultProps[propName];
      
      // Check if value exists and differs from default
      if (currentValue === undefined || currentValue === null) return false;
      if (defaultValue === undefined) return currentValue !== undefined && currentValue !== null;
      
      // Deep compare for objects
      if (typeof currentValue === 'object' && typeof defaultValue === 'object') {
        return JSON.stringify(currentValue) !== JSON.stringify(defaultValue);
      }
      
      return currentValue !== defaultValue;
    });
  };

  // Handle resetting a section's properties to defaults
  const handleResetSection = (sectionName: string) => {
    if (isPrimaryLocked && primaryClassName) {
      toast.error(`Cannot modify .${primaryClassName} - ${appliedClasses.length - 1} dependent class${appliedClasses.length > 2 ? 'es' : ''} exist.`);
      return;
    }

    const propertyNames = getSectionPropertyNames(sectionName);
    const defaultProps = getDefaultPropsForComponent(component.type);
    
    // BREAKPOINT RESET: If we're at tablet/mobile, only clear the breakpoint overrides
    if (currentBreakpoint !== 'desktop' && primaryClassName) {
      const classToUpdate = classes.find(c => c.name === primaryClassName);
      if (classToUpdate) {
        const breakpointKey = currentBreakpoint === 'tablet' ? 'tabletStyles' : 'mobileStyles';
        const currentBreakpointStyles = classToUpdate[breakpointKey as keyof typeof classToUpdate] as Record<string, any> || {};
        
        // Create new styles without the section properties
        const updatedStyles = { ...currentBreakpointStyles };
        propertyNames.forEach(propName => {
          delete updatedStyles[propName];
        });
        
        // Update class with cleared breakpoint styles
        updateClass(classToUpdate.id, { [breakpointKey]: updatedStyles });
        
        // Also clean up any leaked inline overrides from component.props
        // This ensures the component re-inherits from desktop/tablet properly
        const cleanedProps = { ...component.props };
        const cleanedLockedProps = { ...(cleanedProps.__lockedProps || {}) };
        const cleanedPropertySource = { ...(cleanedProps._propertySource || {}) };
        const cleanedEditedProps = { ...(cleanedProps.__editedProps || {}) };
        
        propertyNames.forEach(propName => {
          // Remove the inline prop entirely so it can never override other breakpoints
          delete (cleanedProps as any)[propName];
          // Remove from locked props so class styles take precedence
          delete cleanedLockedProps[propName];
          // Remove from edited props metadata
          delete cleanedEditedProps[propName];
          // Mark as class-sourced
          cleanedPropertySource[propName] = {
            source: 'class',
            className: primaryClassName,
          };
        });

        setIsApplyingClass(true);
        try {
          updateComponent(selectedComponent!, {
            props: {
              ...cleanedProps,
              __lockedProps: cleanedLockedProps,
              __editedProps: cleanedEditedProps,
              _propertySource: cleanedPropertySource,
            },
          });
        } finally {
          setIsApplyingClass(false);
        }
        
        // Update component props to show inherited values
        const inheritedValue = currentBreakpoint === 'tablet' ? 'desktop' : 'tablet';
        toast.success(`${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)} reset to ${inheritedValue} values`);
        return;
      }
    }
    
    // If we have an active class, reset properties in the class styles
    if (activeClass) {
      const activeClassObj = classes.find(cls => cls.name === activeClass);
      if (activeClassObj) {
        const { currentProject, currentPage } = useAppBuilderStore.getState();
        
        // Create new styles without the section properties
        const updatedStyles = { ...activeClassObj.styles };
        propertyNames.forEach(propName => {
          delete updatedStyles[propName];
        });
        
        // Update the class definition first
        updateClass(activeClassObj.id, { styles: updatedStyles });
        
        // Check if we're editing a SECONDARY class
        if (isEditingSecondaryClass && primaryClassName) {
          // SECONDARY CLASS RESET: Cascade back to primary class values
          const primaryClassObj = classes.find(cls => cls.name === primaryClassName);
          
          const pageData = currentProject?.pages.find(p => p.id === currentPage);
          if (pageData) {
            const cascadeComponentProps = (components: any[]): void => {
              for (const comp of components) {
                const compAppliedClasses = comp.props?.appliedClasses || [];
                const usesThisClass = compAppliedClasses.includes(activeClass);
                
                if (usesThisClass) {
                  const rebuiltProps = { ...comp.props };
                  const rebuiltSources = { ...(rebuiltProps._propertySource || {}) };
                  // CRITICAL: Also clear __lockedProps for reset properties so indicator shows correct color
                  const rebuiltLockedProps = { ...(rebuiltProps.__lockedProps || {}) };
                  
                  // SPECIAL: For typography on text/heading, UNSET to allow parent inheritance
                  const inheritableTypographyKeys = ['typography', 'fontSize', 'fontWeight', 'textAlign', 'color', 
                    'textDecoration', 'lineHeight', 'letterSpacing', 'fontFamily', 'fontStyle', 'textTransform'];
                  const isTextLikeComponent = comp.type === 'text' || comp.type === 'heading';
                  const isTypographyReset = sectionName === 'typography';
                  
                  propertyNames.forEach(propName => {
                    // Clear the lock on this property - it's no longer locally edited
                    delete rebuiltLockedProps[propName];
                    
                    // For text/heading typography reset: UNSET the property to allow parent inheritance
                    if (isTextLikeComponent && isTypographyReset && inheritableTypographyKeys.includes(propName)) {
                      delete rebuiltProps[propName];
                      delete rebuiltSources[propName];
                      return; // Skip the rest - allow inheritance
                    }
                    
                    // Check if PRIMARY class has this property
                    const primaryValue = primaryClassObj?.styles?.[propName];
                    
                    if (primaryValue !== undefined && primaryValue !== null) {
                      // Primary has it → restore primary value (YELLOW indicator)
                      rebuiltProps[propName] = primaryValue;
                      rebuiltSources[propName] = {
                        source: 'class',
                        classId: primaryClassObj.id,
                        className: primaryClassName
                      };
                    } else {
                      // Primary doesn't have it → reset to component default (GREY indicator)
                      const defaultValue = defaultProps[propName];
                      if (defaultValue !== undefined) {
                        rebuiltProps[propName] = defaultValue;
                      } else {
                        delete rebuiltProps[propName];
                      }
                      // Remove from property sources - no class owns it
                      delete rebuiltSources[propName];
                    }
                  });
                  
                  rebuiltProps._propertySource = rebuiltSources;
                  rebuiltProps.__lockedProps = rebuiltLockedProps;
                  updateComponent(comp.id, { props: rebuiltProps });
                }
                
                if (comp.children) {
                  cascadeComponentProps(comp.children);
                }
              }
            };
            cascadeComponentProps(pageData.components);
          }
          
          toast.success(`${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)} reset - inherited from .${primaryClassName}`);
          return;
        }
        
        // PRIMARY CLASS RESET: Remove properties from all components using this class
        const pageData = currentProject?.pages.find(p => p.id === currentPage);
        if (pageData) {
          const cleanComponentProps = (components: any[]): void => {
            for (const comp of components) {
              const compAppliedClasses = comp.props?.appliedClasses || [];
              const compAutoClass = comp.props?._autoClass;
              const usesThisClass = compAppliedClasses.includes(activeClass) || compAutoClass === activeClass;
              
              if (usesThisClass) {
                const cleanedProps = { ...comp.props };
                const cleanedSources = { ...(cleanedProps._propertySource || {}) };
                // Also clear __lockedProps for primary class reset
                const cleanedLockedProps = { ...(cleanedProps.__lockedProps || {}) };
                
                // Remove the reset properties from component props and reset to defaults
                // SPECIAL: For typography on text/heading, UNSET rather than default to allow inheritance
                const inheritableTypographyKeys = ['typography', 'fontSize', 'fontWeight', 'textAlign', 'color', 
                  'textDecoration', 'lineHeight', 'letterSpacing', 'fontFamily', 'fontStyle', 'textTransform'];
                const isTextLikeComponent = comp.type === 'text' || comp.type === 'heading';
                const isTypographyReset = sectionName === 'typography';
                
                propertyNames.forEach(propName => {
                  delete cleanedLockedProps[propName];
                  
                  // For text/heading typography reset: UNSET the property to allow parent inheritance
                  if (isTextLikeComponent && isTypographyReset && inheritableTypographyKeys.includes(propName)) {
                    delete cleanedProps[propName];
                  } else {
                    // Other properties: restore to default
                    const defaultValue = defaultProps[propName];
                    if (defaultValue !== undefined) {
                      cleanedProps[propName] = defaultValue;
                    } else {
                      delete cleanedProps[propName];
                    }
                  }
                  delete cleanedSources[propName];
                });
                
                cleanedProps._propertySource = cleanedSources;
                cleanedProps.__lockedProps = cleanedLockedProps;
                updateComponent(comp.id, { props: cleanedProps });
              }
              
              if (comp.children) {
                cleanComponentProps(comp.children);
              }
            }
          };
          cleanComponentProps(pageData.components);
        }
        
        toast.success(`${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)} reset on .${activeClass} (all instances updated)`);
        return;
      }
    }
    
    // Fallback: Reset each property in the section to its default value
    propertyNames.forEach(propName => {
      const defaultValue = defaultProps[propName];
      handlePropertyChange(propName, defaultValue);
    });
    
    toast.success(`${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)} reset to defaults`);
  };

  // Components that should not show certain sections
  // NOTE: Core content elements (text/heading/code/etc.) should have the full Styles panel.
  const hiddenSectionsForComponents: Record<string, string[]> = {
    
    // Form components (use variants, not custom backgrounds/borders)
    slider: ['backgrounds', 'borders'],
    switch: ['backgrounds', 'borders'],
    checkbox: ['backgrounds', 'borders'],
    'radio-group': ['backgrounds', 'borders'],
    radio: ['backgrounds', 'borders'],
    progress: ['backgrounds', 'borders'],
    
    // Display components (use presets/variants)
    audio: ['backgrounds', 'borders'],
    avatar: ['backgrounds', 'borders'],
    badge: ['backgrounds', 'borders'],
    label: ['backgrounds', 'borders'],
    alert: ['backgrounds', 'borders'],
    
    // Data components (have own structure)
    'data-table': ['backgrounds', 'borders'],
    datatable: ['backgrounds', 'borders'],
    chart: ['backgrounds', 'borders'],
    list: ['backgrounds', 'borders'],
    'data-display': ['backgrounds', 'borders'],
    'dynamic-list': ['backgrounds', 'borders'],
    'pro-dynamic-list': ['backgrounds', 'borders'],
    'dynamic-grid': ['backgrounds', 'borders'],
    
    // Auth components (compound components)
    'login-form': ['backgrounds', 'borders'],
    'register-form': ['backgrounds', 'borders'],
    'user-profile': ['backgrounds', 'borders'],
    'auth-status': ['backgrounds', 'borders'],
    
    // Other
    'theme-toggle': ['backgrounds', 'borders'],
  };

  // Handle setting all spacing values to auto
  const handleSetSpacingAuto = () => {
    if (isPrimaryLocked && primaryClassName) {
      toast.error(`Cannot modify .${primaryClassName} - dependent classes exist.`);
      return;
    }

    const autoValue = {
      margin: { top: 'auto', right: 'auto', bottom: 'auto', left: 'auto', unit: 'auto' as const },
      padding: { top: 'auto', right: 'auto', bottom: 'auto', left: 'auto', unit: 'auto' as const }
    };

    handlePropertyChange('spacingControl', autoValue);
    toast.success('All spacing set to auto');
  };

  const renderCustomSection = (sectionName: string, title: string, allProperties: PropertyField[], sectionDotColor?: string) => {
    // Skip section entirely for certain component types
    const hiddenSections = hiddenSectionsForComponents[component.type] || [];
    if (hiddenSections.includes(sectionName)) {
      return null;
    }

    const sectionProperties = getPropertiesForSection(sectionName, allProperties);
    
    // For spacing section, check actual stored property names (not spacingControl)
    // Classes store individual properties like paddingTop, marginLeft, etc.
    let propertyNamesToCheck = sectionProperties.map((p) => p.name);
    if (sectionName === "spacing") {
      propertyNamesToCheck = [
        "spacingControl",
        "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
        "marginTop", "marginRight", "marginBottom", "marginLeft",
        "spacingControl.padding.top", "spacingControl.padding.right", 
        "spacingControl.padding.bottom", "spacingControl.padding.left",
        "spacingControl.margin.top", "spacingControl.margin.right",
        "spacingControl.margin.bottom", "spacingControl.margin.left"
      ];
    }
    const colors = getSectionColors(propertyNamesToCheck);
    const hasEdited = sectionHasEditedProperties(sectionName);
    const isSpacingSection = sectionName === "spacing";
    
    // Get breakpoint overrides for this section
    const sectionBreakpointOverrides = (() => {
      if (!primaryClassName) return { hasTabletOverride: false, hasMobileOverride: false };
      const styleClass = classes.find(c => c.name === primaryClassName);
      if (!styleClass) return { hasTabletOverride: false, hasMobileOverride: false };
      
      const tabletStyles = styleClass.tabletStyles || {};
      const mobileStyles = styleClass.mobileStyles || {};
      
      const hasTabletOverride = propertyNamesToCheck.some(prop => tabletStyles[prop] !== undefined);
      const hasMobileOverride = propertyNamesToCheck.some(prop => mobileStyles[prop] !== undefined);
      
      return { hasTabletOverride, hasMobileOverride };
    })();

    if (sectionProperties.length === 0) {
      // Show placeholder for empty sections
      return (
        <Collapsible key={sectionName} open={openSections[sectionName]} onOpenChange={() => toggleSection(sectionName)}>
          <SectionHeader
            title={title}
            isOpen={openSections[sectionName]}
            onToggle={() => toggleSection(sectionName)}
            hasTabletOverride={sectionBreakpointOverrides.hasTabletOverride}
            hasMobileOverride={sectionBreakpointOverrides.hasMobileOverride}
            currentBreakpoint={currentBreakpoint}
            {...colors}
          />
          <CollapsibleContent>
            <div className="p-1.5 bg-card">
              <div className="text-xs text-muted-foreground text-center py-3">Coming soon</div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Collapsible key={sectionName} open={openSections[sectionName]} onOpenChange={() => toggleSection(sectionName)}>
        <SectionHeader
          title={title}
          isOpen={openSections[sectionName]}
          onToggle={() => toggleSection(sectionName)}
          onReset={() => handleResetSection(sectionName)}
          hasEditedProperties={hasEdited}
          dotColor={sectionDotColor}
          showAutoButton={isSpacingSection}
          onAuto={isSpacingSection ? handleSetSpacingAuto : undefined}
          hasTabletOverride={sectionBreakpointOverrides.hasTabletOverride}
          hasMobileOverride={sectionBreakpointOverrides.hasMobileOverride}
          currentBreakpoint={currentBreakpoint}
          {...colors}
        />
        <CollapsibleContent>
          <div className="p-1.5 bg-card">
            <div className="grid grid-cols-2 gap-1.5">
              {sectionProperties.map((property) => {
                const isFullWidth = [
                  "spacing",
                  "interactions",
                  "variable-binding",
                  "database-binding",
                  "border-radius",
                  "items-editor",
                  "border",
                  "class-selector",
                ].includes(property.type);
                return (
                  <div key={property.name} className={isFullWidth ? "col-span-2" : "col-span-1"}>
                    <AdvancedPropertyFieldRenderer
                      field={property}
                      value={resolvedProps?.[property.name] ?? component.props?.[property.name]}
                      onChange={(value) => handleBreakpointAwarePropertyChange(property.name, value)}
                      component={componentWithInheritedStyles}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className={cn(
      "h-full max-h-[calc(100vh-12rem)] overflow-y-auto relative",
      isEditingLocked && "pointer-events-none"
    )}>
      {/* Cannot modify warning - shown when primary is locked due to secondary classes */}
      {isPrimaryLocked && primaryClassName && (
        <div className="sticky top-0 z-10 flex items-start gap-2 p-3 bg-amber-500/10 border-b border-amber-500/30 pointer-events-auto">
          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-xs">
            <p className="font-medium text-amber-600 dark:text-amber-400">Cannot modify</p>
            <p className="text-muted-foreground">
              .{primaryClassName} - {appliedClasses.length - 1} dependent class{appliedClasses.length > 2 ? 'es' : ''} exist{appliedClasses.length === 2 ? 's' : ''}. Remove dependent classes first to edit.
            </p>
          </div>
        </div>
      )}
      
      {/* Secondary class editing info */}
      {isEditingSecondaryClass && activeClass && (
        <div className="sticky top-0 z-10 flex items-start gap-2 p-3 bg-blue-500/10 border-b border-blue-500/30">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-xs">
            <p className="font-medium text-blue-600 dark:text-blue-400">Editing secondary class</p>
            <p className="text-muted-foreground">
              Changes to .{activeClass} won't affect the primary class .{primaryClassName}
            </p>
          </div>
        </div>
      )}
      <div className="divide-y">
        {/* Custom Component Properties */}
        {component.type === "sidebar" ? (
          <SidebarProperties
            component={component}
            onUpdate={(updates) => updateComponent(selectedComponent!, updates)}
          />
        ) : component.type === "nav-vertical" ? (
          <>
            <div className="p-3 bg-card border-b pointer-events-auto">
              <ClassStateSelector componentId={component.id} />
            </div>
            <NavVerticalProperties
              component={component}
              onUpdate={(updates) => updateComponent(selectedComponent!, updates)}
            />
          </>
        ) : (
          <>
            {/* Combined Class and State Selector - ALWAYS interactive */}
            <div className="p-3 bg-card border-b pointer-events-auto">
              <ClassStateSelector componentId={component.id} />
            </div>

            {/* Collect all properties for easier filtering - deduplicate by name */}
            {(() => {
              const rawProperties = [
                ...categorizedProperties.layout,
                ...categorizedProperties.styling,
                ...categorizedProperties.content,
                ...categorizedProperties.behavior,
              ];
              // Deduplicate by property name to prevent rendering multiple identical editors
              const seenNames = new Set<string>();
              const allProperties = rawProperties.filter(prop => {
                if (seenNames.has(prop.name)) return false;
                seenNames.add(prop.name);
                return true;
              });

              return (
                <>
                  {/* 1. Layout */}
                  {(() => {
                    const layoutProps = [
                      "display",
                      "flexDirection",
                      "justifyContent",
                      "alignItems",
                      "gap",
                      "gridTemplateColumns",
                      "gridTemplateRows",
                      "gridAutoFlow",
                      "textAlign",
                      "width",
                    ];
                    const colors = getSectionColors(layoutProps);
                    const hasEdited = sectionHasEditedProperties("layout");
                    
                    // Get breakpoint overrides for layout section
                    const layoutBreakpointOverrides = (() => {
                      if (!primaryClassName) return { hasTabletOverride: false, hasMobileOverride: false };
                      const styleClass = classes.find(c => c.name === primaryClassName);
                      if (!styleClass) return { hasTabletOverride: false, hasMobileOverride: false };
                      
                      const tabletStyles = styleClass.tabletStyles || {};
                      const mobileStyles = styleClass.mobileStyles || {};
                      
                      const hasTabletOverride = layoutProps.some(prop => tabletStyles[prop] !== undefined);
                      const hasMobileOverride = layoutProps.some(prop => mobileStyles[prop] !== undefined);
                      
                      return { hasTabletOverride, hasMobileOverride };
                    })();

                    return (
                      <Collapsible open={openSections.layout} onOpenChange={() => toggleSection("layout")}>
                        <SectionHeader
                          title="Layout"
                          isOpen={openSections.layout}
                          onToggle={() => toggleSection("layout")}
                          onReset={() => handleResetSection("layout")}
                          hasEditedProperties={hasEdited}
                          hasTabletOverride={layoutBreakpointOverrides.hasTabletOverride}
                          hasMobileOverride={layoutBreakpointOverrides.hasMobileOverride}
                          currentBreakpoint={currentBreakpoint}
                          {...colors}
                        />
                        <CollapsibleContent>
                          <div
                            className="bg-card pointer-events-auto"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <LayoutControlWithBreakpoint 
                              component={component}
                              resolvedProps={resolvedProps}
                              selectedComponent={selectedComponent}
                              updateComponent={updateComponent}
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })()}

                  {/* 2. Spacing - show DS dot for buttons */}
                  {renderCustomSection("spacing", "Spacing", allProperties, 
                    component.type === 'button' ? 'bg-teal-500' : undefined)}

                  {/* 3. Size */}
                  {renderCustomSection("size", "Size", allProperties)}

                  {/* 4. Position */}
                  {(() => {
                    const positionProps = ["position", "top", "right", "bottom", "left", "zIndex"];
                    const colors = getSectionColors(positionProps);
                    const hasEdited = sectionHasEditedProperties("position");
                    
                    // Get breakpoint overrides for position section
                    const positionBreakpointOverrides = (() => {
                      if (!primaryClassName) return { hasTabletOverride: false, hasMobileOverride: false };
                      const styleClass = classes.find(c => c.name === primaryClassName);
                      if (!styleClass) return { hasTabletOverride: false, hasMobileOverride: false };
                      
                      const tabletStyles = styleClass.tabletStyles || {};
                      const mobileStyles = styleClass.mobileStyles || {};
                      
                      const hasTabletOverride = positionProps.some(prop => tabletStyles[prop] !== undefined);
                      const hasMobileOverride = positionProps.some(prop => mobileStyles[prop] !== undefined);
                      
                      return { hasTabletOverride, hasMobileOverride };
                    })();

                    return (
                      <Collapsible open={openSections.position} onOpenChange={() => toggleSection("position")}>
                        <SectionHeader
                          title="Position"
                          isOpen={openSections.position}
                          onToggle={() => toggleSection("position")}
                          onReset={() => handleResetSection("position")}
                          hasEditedProperties={hasEdited}
                          hasTabletOverride={positionBreakpointOverrides.hasTabletOverride}
                          hasMobileOverride={positionBreakpointOverrides.hasMobileOverride}
                          currentBreakpoint={currentBreakpoint}
                          {...colors}
                        />
                        <CollapsibleContent>
                          <div className="p-2 bg-card">
                            <PositionControl
                              value={{
                                position: component.props?.position,
                                top: component.props?.top,
                                right: component.props?.right,
                                bottom: component.props?.bottom,
                                left: component.props?.left,
                                zIndex: component.props?.zIndex,
                              }}
                              onChange={(updates) => {
                                Object.entries(updates).forEach(([key, val]) => {
                                  handleBreakpointAwarePropertyChange(key, val);
                                });
                              }}
                              componentProps={component.props}
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })()}

                  {/* 5. Typography - For text elements AND container elements (to enable CSS inheritance to children) */}
                  {(component.type === "text" || component.type === "heading" || component.type === "paragraph" || component.type === "link" || component.type === "button" || component.type === "icon" || component.type === "separator" || component.type === "section" || component.type === "container" || component.type === "div" || component.type === "row" || component.type === "column" || component.type === "grid" || component.type === "card") &&
                    (() => {
                      const typographyProps = [
                        "typography",
                        "fontSize",
                        "fontWeight",
                        "textAlign",
                        "color",
                        "textDecoration",
                        "lineHeight",
                        "letterSpacing",
                      ];
                      const colors = getSectionColors(typographyProps);
                      const hasEdited = sectionHasEditedProperties("typography");
                      
                      // Get breakpoint overrides for typography section
                      const typographyBreakpointOverrides = (() => {
                        if (!primaryClassName) return { hasTabletOverride: false, hasMobileOverride: false };
                        const styleClass = classes.find(c => c.name === primaryClassName);
                        if (!styleClass) return { hasTabletOverride: false, hasMobileOverride: false };
                        
                        const tabletStyles = styleClass.tabletStyles || {};
                        const mobileStyles = styleClass.mobileStyles || {};
                        
                        const hasTabletOverride = typographyProps.some(prop => tabletStyles[prop] !== undefined);
                        const hasMobileOverride = typographyProps.some(prop => mobileStyles[prop] !== undefined);
                        
                        return { hasTabletOverride, hasMobileOverride };
                      })();

                      return (
                        <Collapsible
                          open={openSections.typography !== false}
                          onOpenChange={() => toggleSection("typography")}
                        >
                          <SectionHeader
                            title="Typography"
                            isOpen={openSections.typography !== false}
                            onToggle={() => toggleSection("typography")}
                            onReset={() => handleResetSection("typography")}
                            hasEditedProperties={hasEdited}
                            dotColor={(component.type === 'heading' || component.type === 'text') ? 'bg-teal-500' : undefined}
                            hasTabletOverride={typographyBreakpointOverrides.hasTabletOverride}
                            hasMobileOverride={typographyBreakpointOverrides.hasMobileOverride}
                            currentBreakpoint={currentBreakpoint}
                            {...colors}
                          />
                           <CollapsibleContent>
                            <div className="p-2 bg-card">
                              <TypographyControl
                                label="Typography"
                                value={component.props?.typography || {
                                  fontFamily: 'Inter, sans-serif',
                                  fontSize: component.props?.fontSize?.toString() || '16',
                                  fontWeight: '400',
                                  lineHeight: '1.5',
                                  textAlign: component.props?.textAlign || 'left',
                                  color: component.props?.color || '#000000',
                                  fontStyle: 'normal',
                                  textDecoration: 'none',
                                  letterSpacing: '0',
                                  textTransform: 'none'
                                }}
                                onChange={(value) => handleBreakpointAwarePropertyChange("typography", value)}
                                componentProps={{ 
                                  ...component.props, 
                                  _componentType: component.type,
                                  // Inject computed parent inherited styles for yellow/blue indicators
                                  _inheritedStyles: parentInheritedStyles.styles,
                                  _inheritedStyleSources: parentInheritedStyles.sources,
                                }}
                              />
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })()}

                  {/* 6. Backgrounds */}
                  {(() => {
                    const hiddenSections = hiddenSectionsForComponents[component.type] || [];
                    if (hiddenSections.includes('backgrounds')) return null;
                    
                    const backgroundProps = ['backgroundColor', 'backgroundGradient', 'backgroundImage'];
                    const colors = getSectionColors(backgroundProps);
                    const hasEdited = sectionHasEditedProperties('backgrounds');
                    
                    // Get breakpoint overrides for backgrounds section
                    const backgroundBreakpointOverrides = (() => {
                      if (!primaryClassName) return { hasTabletOverride: false, hasMobileOverride: false };
                      const styleClass = classes.find(c => c.name === primaryClassName);
                      if (!styleClass) return { hasTabletOverride: false, hasMobileOverride: false };
                      
                      const tabletStyles = styleClass.tabletStyles || {};
                      const mobileStyles = styleClass.mobileStyles || {};
                      
                      const hasTabletOverride = backgroundProps.some(prop => tabletStyles[prop] !== undefined);
                      const hasMobileOverride = backgroundProps.some(prop => mobileStyles[prop] !== undefined);
                      
                      return { hasTabletOverride, hasMobileOverride };
                    })();

                    return (
                      <Collapsible open={openSections.backgrounds} onOpenChange={() => toggleSection("backgrounds")}>
                        <SectionHeader
                          title="Backgrounds"
                          isOpen={openSections.backgrounds}
                          onToggle={() => toggleSection("backgrounds")}
                          onReset={() => handleResetSection("backgrounds")}
                          hasEditedProperties={hasEdited}
                          hasTabletOverride={backgroundBreakpointOverrides.hasTabletOverride}
                          hasMobileOverride={backgroundBreakpointOverrides.hasMobileOverride}
                          currentBreakpoint={currentBreakpoint}
                          {...colors}
                        />
                        <CollapsibleContent>
                          <div className="p-2 bg-card">
                            <BackgroundEditor
                              backgroundColor={resolvedProps.backgroundColor || 'transparent'}
                              backgroundGradient={resolvedProps.backgroundGradient || ''}
                              backgroundImage={resolvedProps.backgroundImage || ''}
                              backgroundLayerOrder={resolvedProps.backgroundLayerOrder}
                              onBackgroundColorChange={(value) => handleBreakpointAwarePropertyChange("backgroundColor", value)}
                              onBackgroundGradientChange={(value) => handleBreakpointAwarePropertyChange("backgroundGradient", value)}
                              onBackgroundImageChange={(value) => handleBreakpointAwarePropertyChange("backgroundImage", value)}
                              onLayerOrderChange={(order) => handleBreakpointAwarePropertyChange("backgroundLayerOrder", order)}
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })()}

                  {/* 7. Borders - show DS dot for buttons */}
                  {renderCustomSection("borders", "Borders", allProperties,
                    component.type === 'button' ? 'bg-teal-500' : undefined)}

                  {/* 8. Effects */}
                  {(() => {
                    const hiddenSections = hiddenSectionsForComponents[component.type] || [];
                    if (hiddenSections.includes('effects')) return null;
                    
                    const effectsProps = ['boxShadows', 'filters', 'transitions'];
                    const colors = getSectionColors(effectsProps);

                    // Get property origins for each effect property
                    const getEffectStatus = (propName: string): { status: 'active' | 'inherited' | 'manual' | 'none'; sourceInfo: { className?: string } } => {
                      // IMPORTANT: use the SAME resolved value we render in the editor,
                      // otherwise class-driven effects show up as "none" (and never yellow).
                      const value = (resolvedProps as any)?.[propName] ?? component.props?.[propName];
                      const origin = getPropertyOrigin(propName, value);
                      
                      let status: 'active' | 'inherited' | 'manual' | 'none' = 'none';
                      if (origin.origin === 'active') {
                        status = 'active';
                      } else if (origin.origin === 'inherited' || origin.origin === 'parent') {
                        status = 'inherited';
                      } else if (value && (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0)) {
                        status = 'manual';
                      }
                      
                      return { status, sourceInfo: { className: origin.className } };
                    };

                    const boxShadowsStatus = getEffectStatus('boxShadows');
                    const filtersStatus = getEffectStatus('filters');
                    const transitionsStatus = getEffectStatus('transitions');

                    const hasEffectsEdits = sectionHasEditedProperties('effects');
                    
                    // Get breakpoint overrides for effects section
                    const effectsBreakpointOverrides = (() => {
                      if (!primaryClassName) return { hasTabletOverride: false, hasMobileOverride: false };
                      const styleClass = classes.find(c => c.name === primaryClassName);
                      if (!styleClass) return { hasTabletOverride: false, hasMobileOverride: false };
                      
                      const tabletStyles = styleClass.tabletStyles || {};
                      const mobileStyles = styleClass.mobileStyles || {};
                      
                      const hasTabletOverride = effectsProps.some(prop => tabletStyles[prop] !== undefined);
                      const hasMobileOverride = effectsProps.some(prop => mobileStyles[prop] !== undefined);
                      
                      return { hasTabletOverride, hasMobileOverride };
                    })();

                    return (
                      <Collapsible open={openSections.effects} onOpenChange={() => toggleSection("effects")}>
                        <SectionHeader
                          title="Effects"
                          isOpen={openSections.effects}
                          onToggle={() => toggleSection("effects")}
                          onReset={() => handleResetSection("effects")}
                          hasEditedProperties={hasEffectsEdits}
                          hasTabletOverride={effectsBreakpointOverrides.hasTabletOverride}
                          hasMobileOverride={effectsBreakpointOverrides.hasMobileOverride}
                          currentBreakpoint={currentBreakpoint}
                          {...colors}
                        />
                        <CollapsibleContent>
                          <div className="bg-card divide-y divide-border/50 p-3 space-y-4">
                            <BoxShadowsEditor
                              label="Box Shadows"
                              value={resolvedProps?.boxShadows || component.props?.boxShadows || []}
                              onChange={(value) => handleBreakpointAwarePropertyChange("boxShadows", value)}
                              status={boxShadowsStatus.status}
                              sourceInfo={boxShadowsStatus.sourceInfo}
                            />
                            <FiltersEditor
                              label="Filters"
                              value={resolvedProps?.filters || component.props?.filters || []}
                              onChange={(value) => handleBreakpointAwarePropertyChange("filters", value)}
                              status={filtersStatus.status}
                              sourceInfo={filtersStatus.sourceInfo}
                            />
                            <TransitionsEditor
                              label="Transitions"
                              value={resolvedProps?.transitions || component.props?.transitions || []}
                              onChange={(value) => handleBreakpointAwarePropertyChange("transitions", value)}
                              status={transitionsStatus.status}
                              sourceInfo={transitionsStatus.sourceInfo}
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })()}

                  {/* 9. Transform */}
                  {(() => {
                    const hiddenSections = hiddenSectionsForComponents[component.type] || [];
                    if (hiddenSections.includes('effects')) return null;
                    
                    const transformProps = ['transforms'];
                    const colors = getSectionColors(transformProps);

                    const getEffectStatus = (propName: string): { status: 'active' | 'inherited' | 'manual' | 'none'; sourceInfo: { className?: string } } => {
                      const value = (resolvedProps as any)?.[propName] ?? component.props?.[propName];
                      const origin = getPropertyOrigin(propName, value);
                      
                      let status: 'active' | 'inherited' | 'manual' | 'none' = 'none';
                      if (origin.origin === 'active') {
                        status = 'active';
                      } else if (origin.origin === 'inherited' || origin.origin === 'parent') {
                        status = 'inherited';
                      } else if (propName === 'transforms' && value && typeof value === 'object') {
                        const css = generateTransformCSS(value);
                        if (css && css !== 'none') status = 'manual';
                      }
                      
                      return { status, sourceInfo: { className: origin.className } };
                    };

                    const hasTransformEdits = sectionHasEditedProperties('transform');
                    const transformsStatus = getEffectStatus('transforms');
                    
                    // Get breakpoint overrides for transform section
                    const transformBreakpointOverrides = (() => {
                      if (!primaryClassName) return { hasTabletOverride: false, hasMobileOverride: false };
                      const styleClass = classes.find(c => c.name === primaryClassName);
                      if (!styleClass) return { hasTabletOverride: false, hasMobileOverride: false };
                      
                      const tabletStyles = styleClass.tabletStyles || {};
                      const mobileStyles = styleClass.mobileStyles || {};
                      
                      const hasTabletOverride = transformProps.some(prop => tabletStyles[prop] !== undefined);
                      const hasMobileOverride = transformProps.some(prop => mobileStyles[prop] !== undefined);
                      
                      return { hasTabletOverride, hasMobileOverride };
                    })();

                    return (
                      <Collapsible open={openSections.transform} onOpenChange={() => toggleSection("transform")}>
                        <SectionHeader
                          title="Transform"
                          isOpen={openSections.transform}
                          onToggle={() => toggleSection("transform")}
                          onReset={() => handleResetSection("transform")}
                          hasEditedProperties={hasTransformEdits}
                          hasTabletOverride={transformBreakpointOverrides.hasTabletOverride}
                          hasMobileOverride={transformBreakpointOverrides.hasMobileOverride}
                          currentBreakpoint={currentBreakpoint}
                          {...colors}
                        />
                        <CollapsibleContent>
                          <div className="bg-card p-1.5">
                            <TransformsEditor
                              label=""
                              value={resolvedProps?.transforms || component.props?.transforms || defaultTransformValues}
                              onChange={(value) => handleBreakpointAwarePropertyChange("transforms", value)}
                              status={transformsStatus.status}
                              sourceInfo={transformsStatus.sourceInfo}
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })()}

                  {/* Custom Properties */}
                  {renderCustomSection("custom", "Custom Properties", allProperties)}
                </>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
