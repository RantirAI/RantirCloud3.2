import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { generateBoxShadowCSS, generateFilterCSS, generateTransitionCSS, generateTransformCSS } from '@/types/effects';
import { AppComponent } from '@/types/appBuilder';
import { AppThemeToggle } from './AppThemeToggle';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useClassStore } from '@/stores/classStore';
import { useDesignTokenStore } from '@/stores/designTokenStore';
import { useVariableStore } from '@/stores/variableStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EnhancedDropZone } from './EnhancedDropZone';
// Drag is now handled by ElementHighlight overlay - this is a no-op component
const ComponentDragHandle = (_props: any) => null;
import { getDefaultPropsForComponent } from '@/lib/componentPropertyConfig';
import { Move, GripVertical, Loader2, Play, Music, Calendar as CalendarIcon, Home, User, ChevronDown, ChevronRight, FileText, Code, ExternalLink, Volume2, Mic, Camera, Database, Link2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import * as Iconsax from 'iconsax-react';
import { AdvancedChartRenderer } from './AdvancedChartRenderer';
import { ContextMenu } from './ContextMenu';
import { ModalEditor } from './ModalEditor';
import { ChartConfigurator } from './ChartConfigurator';
import { InteractiveDataTable } from './InteractiveDataTable';
import { ElementHighlight } from './ElementHighlight';
import { useDataBinding } from '@/hooks/useDataBinding';
import { StyleEngine } from './StyleEngine';
import { useResolvedCSSStyles, useResolvedStyles } from '@/hooks/useResolvedStyles';
import { usePageParameters } from '@/hooks/usePageParameters';
import { ComponentAction, ActionType } from '@/types/appBuilder';
import { FieldBindingDialog } from './FieldBindingDialog';
import { EnhancedFieldBindingDialog } from './EnhancedFieldBindingDialog';
import { AppSidebar } from './AppSidebar';
import { DynamicGrid } from './DynamicGrid';
import { DynamicSection } from './DynamicSection';
import { DataDisplay } from './DataDisplay';
import { toast } from 'sonner';
import { formatValue as formatValueUtil, replaceBindings as replaceBindingsUtil } from '@/lib/exportedCode/formatters';
import { useBreakpoint } from '@/contexts/BreakpointContext';
import { 
  INHERITABLE_CSS_PROPERTIES, 
  extractInheritableStyles, 
  mergeInheritedStyles,
  InheritedPropertySource 
} from '@/lib/parentStyleInheritance';
import { resolveDefaultFontFamily, resolveDefaultFontSize, resolveDefaultBorderRadius, resolveDefaultInputHeight, resolveDefaultInputPadding, resolveDefaultFormGap, resolveDefaultModalPadding } from '@/lib/designTokenResolver';
import { resolveAllDSStyles } from '@/lib/componentDSDefaults';

/**
 * Resolve a typography property with proper inheritance priority.
 * Priority: own value > class styles > INHERITED from parent > design token/default
 * 
 * This ensures parent container typography (color, fontSize, fontFamily, etc.)
 * flows down to child text/heading elements when they don't have their own value.
 */
function resolveTypographyProp(
  ownValue: any,
  classValue: any,
  inheritedValue: any,
  defaultValue?: any,
  formatAsPx?: boolean
): any {
  const normalizePx = (v: any) => {
    if (!formatAsPx) return v;
    if (v === undefined || v === null || v === '') return v;
    if (typeof v === 'number') return `${v}px`;
    if (typeof v === 'string') {
      const t = v.trim();
      if (/^-?\d+(\.\d+)?$/.test(t)) return `${t}px`;
    }
    return v;
  };

  // 1. Own value takes highest priority
  if (ownValue !== undefined && ownValue !== null && ownValue !== '') {
    return normalizePx(ownValue);
  }

  // 2. Class styles (from applied classes)
  if (classValue !== undefined && classValue !== null && classValue !== '') {
    return normalizePx(classValue);
  }

  // 3. Inherited from parent (Section, Div, Container, Page Body, etc.)
  if (inheritedValue !== undefined && inheritedValue !== null && inheritedValue !== '') {
    return normalizePx(inheritedValue);
  }

  // 4. Design token or hard default
  return defaultValue;
}

/**
 * Resolve fontFamily with design-token-aware priority.
 * Priority: own value > DESIGN TOKEN > class styles > inherited from parent
 * 
 * Design tokens represent the project-level font setting and should override
 * class defaults. Only an explicit per-component font override should beat the token.
 */
function resolveFontFamilyWithToken(
  ownValue: any,
  designTokenFont: string | undefined,
  classValue: any,
  inheritedValue: any,
): string | undefined {
  // 1. Own value (explicit per-component override) — highest priority
  if (ownValue !== undefined && ownValue !== null && ownValue !== '') {
    return ownValue;
  }

  // 2. Design token (project-level font setting)
  if (designTokenFont) {
    return designTokenFont;
  }

  // 3. Class styles
  if (classValue !== undefined && classValue !== null && classValue !== '') {
    return classValue;
  }

  // 4. Inherited from parent
  if (inheritedValue !== undefined && inheritedValue !== null && inheritedValue !== '') {
    return inheritedValue;
  }

  return undefined;
}

// Helper function to deep merge objects (for nested styles like border, borderRadius)
function deepMergeObjects(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
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
      // Recursively merge nested objects
      result[key] = deepMergeObjects(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue;
    }
  }
  return result;
}

// Coerce unknown values into safe text/HTML strings.
// This prevents runtime crashes when imported/converted content accidentally contains non-renderable objects
// (e.g. lucide-react objects with keys { meta, type }).
function coerceToText(value: unknown, fallback = ''): string {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  // Don’t stringify real React elements; just fall back.
  if (React.isValidElement(value)) return fallback;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

interface ComponentRendererProps {
  component: AppComponent;
  isPreview: boolean;
  parentId?: string;
  index?: number;
}

export function ComponentRenderer({ component, isPreview, parentId, index = 0 }: ComponentRendererProps) {
  // IMPORTANT: All hooks must be called before any conditional returns to satisfy React's Rules of Hooks
  const isInvalidComponent = !component || !component.props;

  const { 
    selectedComponent,
    selectedComponents,
    selectComponent, 
    showPropertiesPanel, 
    togglePropertiesPanel,
    executeComponentFlow,
    currentProject,
    currentPage,
    setCurrentPage,
    duplicateComponent, 
    deleteComponent,
    moveComponentUp,
    moveComponentDown,
    updateComponent,
    setHoveredComponent,
    viewport,
    customCanvasWidth,
  } = useAppBuilderStore();
  
  const { classes } = useClassStore();
  
  // Subscribe to design tokens for real-time color updates on canvas
  const { activeTokens } = useDesignTokenStore();
  
  // Get current breakpoint for breakpoint-aware style resolution
  const { currentBreakpoint } = useBreakpoint();
  
  // Subscribe to runtime variables for reactivity - this ensures re-render when variables change
  const {
    resolveBinding,
    appVariables,
    pageVariables,
    appVariableDefinitions,
    pageVariableDefinitions,
    loadAppVariables,
    loadPageVariables,
    currentProjectId: variableProjectId,
    currentPageId: variablePageId,
  } = useVariableStore();

  // Ensure variables are loaded in Preview mode too (Settings panel may be closed)
  useEffect(() => {
    if (!currentProject?.id) return;

    if (variableProjectId !== currentProject.id) {
      loadAppVariables(currentProject.id);
    }

    if (currentPage && variableProjectId === currentProject.id && variablePageId !== currentPage) {
      loadPageVariables(currentProject.id, currentPage);
    }
  }, [
    currentProject?.id,
    currentPage,
    variableProjectId,
    variablePageId,
    loadAppVariables,
    loadPageVariables,
  ]);

  const isSelected = (selectedComponent === component.id || selectedComponents.includes(component.id)) && !isPreview;
  const isPrimarySelected = selectedComponent === component.id && !isPreview;
  const isSecondarySelected = isSelected && !isPrimarySelected;
  // Component state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showTextFieldBindingDialog, setShowTextFieldBindingDialog] = useState(false);
  const [showHeadingFieldBindingDialog, setShowHeadingFieldBindingDialog] = useState(false);
  const [showEnhancedBindingDialog, setShowEnhancedBindingDialog] = useState(false);
  const [bindingDialogType, setBindingDialogType] = useState<'text' | 'heading' | 'image'>('text');
  const { allParams } = usePageParameters();

  // Evaluate visibility condition with operator support
  const evaluateVisibility = (): boolean => {
    const visibilityCondition = component.props?.visibilityCondition;
    const visibilityBinding = component.props?.visibilityBinding;
    
    // If no visibility condition or binding, check legacy props
    if (!visibilityCondition && !visibilityBinding) {
      // Check hidden prop
      if (component.props?.hidden === true) return false;
      // Check visible prop
      if (component.props?.visible === false) return false;
      return true;
    }
    
    // Resolve the binding to evaluate visibility condition
    try {
      const dataContext = component.props?._dataContext as Record<string, any> | undefined;
      const binding = visibilityCondition?.variableBinding || visibilityBinding;
      const resolved = resolveBinding(binding, dataContext);

      if (isPreview && binding && resolved === undefined) {
        console.debug('[Visibility] unresolved binding in preview', {
          componentId: component.id,
          binding,
          visibilityCondition,
          appVariablesKeys: Object.keys(appVariables || {}),
          pageVariablesKeys: Object.keys(pageVariables || {}),
        });
      }
      
      // If we have a full visibility condition, evaluate with operator
      if (visibilityCondition && visibilityCondition.operator) {
        const { operator, value } = visibilityCondition;
        
        switch (operator) {
          // Equality - with type coercion for boolean comparisons
          case 'equals':
            // Handle boolean type coercion
            if (typeof resolved === 'boolean' || typeof value === 'boolean') {
              const resolvedBool = resolved === true || resolved === 'true';
              const valueBool = value === true || value === 'true';
              return resolvedBool === valueBool;
            }
            return resolved === value;
          case 'notEquals':
            // Handle boolean type coercion
            if (typeof resolved === 'boolean' || typeof value === 'boolean') {
              const resolvedBool = resolved === true || resolved === 'true';
              const valueBool = value === true || value === 'true';
              return resolvedBool !== valueBool;
            }
            return resolved !== value;
          
          // Numeric comparisons
          case 'greaterThan':
            return Number(resolved) > Number(value);
          case 'lessThan':
            return Number(resolved) < Number(value);
          case 'greaterThanOrEqual':
            return Number(resolved) >= Number(value);
          case 'lessThanOrEqual':
            return Number(resolved) <= Number(value);
          
          // String operations
          case 'contains':
            return String(resolved).includes(String(value));
          case 'notContains':
            return !String(resolved).includes(String(value));
          case 'startsWith':
            return String(resolved).startsWith(String(value));
          case 'endsWith':
            return String(resolved).endsWith(String(value));
          
          // Empty checks
          case 'isEmpty':
            if (Array.isArray(resolved)) return resolved.length === 0;
            if (typeof resolved === 'object' && resolved !== null) return Object.keys(resolved).length === 0;
            return !resolved || resolved === '';
          case 'isNotEmpty':
            if (Array.isArray(resolved)) return resolved.length > 0;
            if (typeof resolved === 'object' && resolved !== null) return Object.keys(resolved).length > 0;
            return !!resolved && resolved !== '';
          
          // Array length checks
          case 'lengthEquals':
            return Array.isArray(resolved) && resolved.length === Number(value);
          case 'lengthGreaterThan':
            return Array.isArray(resolved) && resolved.length > Number(value);
          case 'lengthLessThan':
            return Array.isArray(resolved) && resolved.length < Number(value);
          
          // Object checks
          case 'hasKey':
            return typeof resolved === 'object' && resolved !== null && value in resolved;
          
          default:
            return Boolean(resolved);
        }
      }
      
      // Legacy: just check if binding is truthy
      return Boolean(resolved);
    } catch (error) {
      console.warn('Failed to evaluate visibility condition:', error);
      return true; // Show on error
    }
  };

  const shouldRender = evaluateVisibility();
  const hasVisibilityBinding = !!(component.props?.visibilityBinding || component.props?.visibilityCondition);
  const forceShowInCanvas = component.props?.forceShowInCanvas === true;
  
  // In design mode: show if forceShowInCanvas is enabled OR if no visibility binding
  // In preview mode: respect the actual visibility condition
  const shouldShowInCanvas = !isPreview && (forceShowInCanvas || !hasVisibilityBinding || shouldRender);
  const isHiddenByCondition = hasVisibilityBinding && !shouldRender;

  // Fetch bound data for components that have a dataSource/databaseConnection.
  // We only *render* bound values in preview mode, but fetching here keeps hook usage valid.
  const { data: boundData } = useDataBinding(component);

  // Set data context for child components if this component has data context
  useEffect(() => {
    if (component?.props?._parentConnection) {
      // Set the data context from parent connection
      console.log('ComponentRenderer - Setting data context:', component.props._parentConnection);
      (window as any).__currentDataContext = {
        tableName: component.props._parentConnection.tableName,
        fields: component.props._parentConnection.fields || []
      };
    } else {
      // Clean up context when not in data context
      delete (window as any).__currentDataContext;
    }
    
    return () => {
      // Clean up context when component unmounts
      if (component?.props?._parentConnection) {
        delete (window as any).__currentDataContext;
      }
    };
  }, [component?.props?._parentConnection]);

  // Merge default props with component props AND class styles
  const defaultProps = getDefaultPropsForComponent(component.type);
  const props = useMemo(() => {
    // First get class styles from applied classes
    const appliedClassesRaw = component.props?.appliedClasses;
    let appliedClasses: string[] = Array.isArray(appliedClassesRaw) ? appliedClassesRaw : [];
    
    // FALLBACK: If no appliedClasses but component has a semantic ID, check if a class with that name exists
    // This enables AI-generated CSS to apply even when appliedClasses wasn't explicitly set
    if (appliedClasses.length === 0 && component.id) {
      const matchingClass = classes.find(c => c.name === component.id);
      if (matchingClass) {
        appliedClasses = [component.id];
        console.log('[ComponentRenderer] Auto-applied class from component.id:', component.id);
      }
    }
    
    // Also check component.classNames as fallback
    if (appliedClasses.length === 0 && Array.isArray(component.classNames) && component.classNames.length > 0) {
      appliedClasses = component.classNames.filter(cn => classes.some(c => c.name === cn));
      if (appliedClasses.length > 0) {
        console.log('[ComponentRenderer] Auto-applied classes from component.classNames:', appliedClasses);
      }
    }
    
    let classStyles: Record<string, any> = {};
    
    // Debug: Log class merge process
    if (appliedClasses.length > 0) {
      console.log('[ComponentRenderer] Merging class styles:', {
        componentId: component.id,
        appliedClasses,
        availableClasses: classes.length,
        classNames: classes.map(c => c.name)
      });
    }
    
    // Deep merge styles from all applied classes in order
    for (const className of appliedClasses) {
      const classData = classes.find(c => c.name === className);
      if (classData?.styles) {
        // Debug: Log class data
        if (classData.styles.border) {
          console.log('[ComponentRenderer] Found border in class:', {
            className,
            border: classData.styles.border
          });
        }
        // Deep merge to properly handle nested objects like border, borderRadius
        classStyles = deepMergeObjects(classStyles, classData.styles);
      }
    }
    
    // Get locked props - these are user-edited and should override class styles
    const lockedProps = component.props?.__lockedProps || {};
    
    // Filter component props: for style properties, only include if they're locked (user-edited)
    // This ensures class updates propagate to components where the class was originally created
    // ALL style properties that should follow class unless explicitly locked
    // CRITICAL: Background-layer props MUST be included to prevent empty/deleted component props from overriding class backgrounds
    const stylePropertyKeys = [
      // Background properties - fill, gradient, image layers
      'backgroundColor', 'backgroundGradient', 'backgroundImage', 'backgroundLayerOrder',
      'backgroundSize', 'backgroundRepeat', 'backgroundPosition', 'backgroundAttachment', 'background',
      // Typography
      'color', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight',
      'textAlign', 'textDecoration', 'letterSpacing', 'textTransform',
      // Spacing
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'gap',
      // Sizing
      'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
      // Border
      'border', 'borderRadius', 'borderWidth', 'borderColor', 'borderStyle',
      // Layout
      'display', 'flexDirection', 'justifyContent', 'alignItems', 'flexWrap',
      'gridTemplateColumns', 'gridTemplateRows', 'gridAutoFlow', 'gridColumn', 'gridRow', 'gridGap',
      'position', 'top', 'right', 'bottom', 'left', 'zIndex',
      // Effects & Animations
      'opacity', 'boxShadow', 'boxShadows', 'overflow',
      'filter', 'filters', 'backdropFilter',        // blur, brightness, contrast effects
      'transform', 'transforms',                    // scale, rotate, translate
      'transition', 'transitions',                  // smooth animations
      'cursor',                                     // pointer, grab, etc.
      'pointerEvents',                              // none for decorative elements
    ];
    
    // Build filtered component props
    const filteredComponentProps: Record<string, any> = {};
    const componentPropsObj = component.props || {};
    
    // Check if this component has applied classes
    const hasAppliedClasses = appliedClasses.length > 0;
    
    // FIXED: Check if applied classes actually HAVE styles
    // If classes exist but are empty, we should still use inline props
    const hasClassesWithActualStyles = appliedClasses.some(className => {
      const classData = classes.find(c => c.name === className);
      return classData?.styles && Object.keys(classData.styles).length > 0;
    });
    
    // AI FALLBACK: Check if class is missing critical layout/background styles
    // This allows AI-generated components to render correctly even when assigned to incomplete classes
    const isAIGenerated = componentPropsObj._aiGenerated === true;
    const criticalLayoutKeys = [
      'display', 'gridTemplateColumns', 'gridTemplateRows', 'gridGap',
      'backgroundGradient', 'backgroundColor', 'background',
      'flexDirection', 'justifyContent', 'alignItems', 'gap',
      'width', 'height', 'minHeight', 'maxWidth', 'padding', 'margin'
    ];
    const classMissingCriticalStyles = (key: string) => {
      if (!criticalLayoutKeys.includes(key)) return false;
      // Check if any applied class has this critical property
      return !appliedClasses.some(className => {
        const classData = classes.find(c => c.name === className);
        if (!classData?.styles) return false;
        // Check nested layout/background objects too
        if (key === 'display' || key === 'gridTemplateColumns' || key === 'gridTemplateRows') {
          return classData.styles[key] || classData.styles.layout?.[key];
        }
        if (key === 'backgroundGradient' || key === 'backgroundColor') {
          return classData.styles[key] || classData.styles.background?.gradient || classData.styles.background?.color;
        }
        return classData.styles[key];
      });
    };
    
    for (const key of Object.keys(componentPropsObj)) {
      // Always include non-style properties and metadata
      if (!stylePropertyKeys.includes(key)) {
        filteredComponentProps[key] = componentPropsObj[key];
      } else {
        // For style properties:
        // 1. If NO classes applied → include all styles
        // 2. If classes ARE applied BUT are empty (no styles) → include inline styles as fallback
        // 3. If classes ARE applied WITH styles → only include if locked (user-edited override)
        // 4. AI FALLBACK: If class is missing critical layout styles, allow AI props to pass through
        if (!hasAppliedClasses || !hasClassesWithActualStyles || lockedProps[key] || (isAIGenerated && classMissingCriticalStyles(key))) {
          filteredComponentProps[key] = componentPropsObj[key];
        }
        // Otherwise, class styles will take precedence
      }
    }
    
    // Merge order: defaults → class styles → filtered component props
    // Only user-edited (locked) style props override class styles
    const baseProps = deepMergeObjects(
      deepMergeObjects(defaultProps, classStyles),
      filteredComponentProps
    );

    // Handle data binding context for child components in dynamic lists/grids
    // In preview mode with _dataContext, resolve {{field}} bindings to actual values
    const dataContext = component.props?._dataContext as Record<string, any> | undefined;
    
    // Apply formatters to values - using shared utility
    const applyFormatter = (value: any, formatter: string): string => {
      return formatValueUtil(value, formatter);
    };
    
    const resolveFromContext = (fieldRaw: string) => {
      if (!dataContext) return undefined;
      
      const field = String(fieldRaw).trim();
      if (!field) return undefined;

      // Direct hit
      const direct = dataContext?.[field];
      if (direct !== undefined && direct !== null) return direct;

      // Common fallback: case-insensitive match ("Name" vs "name")
      const lowered = field.toLowerCase();
      const directLower = dataContext?.[lowered];
      if (directLower !== undefined && directLower !== null) return directLower;

      const matchedKey = Object.keys(dataContext || {}).find(
        (k) => k.toLowerCase() === lowered
      );
      const matchedVal = matchedKey ? (dataContext as any)[matchedKey] : undefined;
      return matchedVal === undefined || matchedVal === null ? undefined : matchedVal;
    };

    // Resolve bindings with proper placeholders for design mode
    const replaceBindings = (input: string) => {
      // First handle literal \n characters (escaped newlines from AI)
      let processed = input.replace(/\\n/g, '\n');
      
      // In design mode, show clean [variableName] placeholders
      if (!isPreview) {
        return processed.replace(/\{\{([^}|]+)(?:\|([^}]+))?\}\}/g, (match, field) => {
          // Extract just the variable name for cleaner display
          const parts = field.split('.');
          const displayName = parts[parts.length - 1]; // e.g., "userName" from "page.userName"
          return `[${displayName}]`;
        });
      }
      
      // Preview mode - resolve actual values
      return processed.replace(/\{\{([^}|]+)(?:\|([^}]+))?\}\}/g, (match, field, formatter) => {
        // First try resolving from local data context (for dynamic lists)
        let resolved = resolveFromContext(field);
        
        // If not found in data context, try app/page variables via the variable store
        if (resolved === undefined) {
          resolved = resolveBinding(match, dataContext);
        }
        
        // If still undefined, provide sensible defaults
        if (resolved === undefined) {
          const parts = field.split('.');
          const varName = parts[parts.length - 1];
          // Return a sensible default based on variable name patterns
          if (varName.toLowerCase().includes('name')) return 'John Doe';
          if (varName.toLowerCase().includes('email')) return 'email@example.com';
          if (varName.toLowerCase().includes('title')) return 'Title';
          if (varName.toLowerCase().includes('description')) return 'Description text';
          return `[${varName}]`;
        }
        
        // Apply formatter if specified
        if (formatter) {
          return applyFormatter(resolved, formatter);
        }
        
        return String(resolved);
      });
    };
    
    // Always try to resolve bindings in preview mode (not just when dataContext exists)
    if (isPreview) {
      // Replace data bindings in text content
      if (baseProps.content && typeof baseProps.content === 'string') {
        baseProps.content = replaceBindings(baseProps.content);
      }

      if (baseProps.text && typeof baseProps.text === 'string') {
        baseProps.text = replaceBindings(baseProps.text);
      }

      if (baseProps.children && typeof baseProps.children === 'string') {
        baseProps.children = replaceBindings(baseProps.children);
      }

      // Handle image source binding
      if (baseProps.src && typeof baseProps.src === 'string') {
        baseProps.src = replaceBindings(baseProps.src);
      }
    }

    return baseProps;
  }, [defaultProps, component.props, classes, isPreview, activeTokens]);

  // Compute inheritable styles to pass to children
  // This enables parent-to-child style inheritance for typography, color, etc.
  // IMPORTANT: We use RAW component.props (not merged `props` with defaults),
  // so default values don't block inheritance. Only explicitly set values propagate.
  const inheritedStylesForChildren = useMemo(() => {
    const appliedClassesRaw = component.props?.appliedClasses;
    const appliedClasses: string[] = Array.isArray(appliedClassesRaw) ? appliedClassesRaw : [];
    
    // Get parent inherited styles from props
    const parentInheritedStyles = (component.props as any)?._inheritedStyles || {};
    const parentInheritedSources = (component.props as any)?._inheritedStyleSources || {};
    
    // CRITICAL: Use RAW component.props (not merged `props` with defaults)
    // This ensures only EXPLICITLY SET values on a parent propagate down.
    // If we used `props`, defaults like fontWeight=400 or color=#000000 would
    // incorrectly block inheritance from grandparent or design tokens.
    const rawProps = component.props || {};
    
    // Extract this component's own inheritable styles from RAW props
    const { styles: ownStyles, sources: ownSources } = extractInheritableStyles(
      rawProps,
      appliedClasses,
      classes,
      component.id
    );
    
    // Merge parent inherited with own styles (own takes precedence)
    return mergeInheritedStyles(parentInheritedStyles, parentInheritedSources, ownStyles, ownSources);
  }, [component.props, classes, component.id]);

  // Inherit dynamic data-binding context AND style inheritance down the tree
  const withInheritedDataContext = (child: AppComponent): AppComponent => {
    const inheritedDataContext = (component.props as any)?._dataContext;
    const inheritedRecordIndex = (component.props as any)?._recordIndex;
    const inheritedParentConnection = (component.props as any)?._parentConnection;

    const childProps: any = child?.props || {};

    // Always pass down inherited styles (even if no data context)
    return {
      ...child,
      props: {
        ...childProps,
        _dataContext: childProps._dataContext ?? inheritedDataContext,
        _recordIndex: childProps._recordIndex ?? inheritedRecordIndex,
        _parentConnection: childProps._parentConnection ?? inheritedParentConnection,
        // Pass inherited typography/color styles to children
        _inheritedStyles: inheritedStylesForChildren.styles,
        _inheritedStyleSources: inheritedStylesForChildren.sources,
      },
    };
  };

  const [editValue, setEditValue] = useState(props.children || props.text || '');

  // Handle locked state - prevent interaction if locked
  const isLocked = props.locked === true;

  // Only use dropzone functionality for container components, no drag from here
  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `drop-${component.id}`,
    data: {
      accepts: getAcceptedTypes(component.type),
      parentId: component.id,
      index: component.children?.length || 0
    },
    disabled: isPreview || !getAcceptedTypes(component.type).length
  });

  // NOTE: Do not early-return here.
  // This component intentionally calls all hooks unconditionally, then decides what to render later.
  // (Returning before all hook calls would violate React's Rules of Hooks.)
  if (isInvalidComponent) {
    console.warn('ComponentRenderer: Invalid component received', component);
  }

  // Handle visibility - moved to end to avoid hook violations

  const isGlobalHeaderInstance = props._isGlobalHeaderInstance === true;
  const isGlobalHeaderSource = props._isGlobalHeader === true;
  const globalHeaderSourcePageName = props._globalHeaderSourcePageName as string | undefined;
  const globalHeaderSourcePageId = props._globalHeaderSourcePage as string | undefined;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isPreview && !isLocked) {
      // If this is a global header instance (on a non-source page), navigate to source page
      if (isGlobalHeaderInstance && globalHeaderSourcePageId) {
        setCurrentPage(globalHeaderSourcePageId);
        setTimeout(() => selectComponent(component.id), 100);
        if (!showPropertiesPanel) {
          togglePropertiesPanel();
        }
        return;
      }
      // Support multi-select with Ctrl/Cmd key
      const addToSelection = e.ctrlKey || e.metaKey;
      selectComponent(component.id, addToSelection);
      // Auto-open properties panel when component is selected
      if (!showPropertiesPanel) {
        togglePropertiesPanel();
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLocked) {
      console.log('Context menu opened for:', component.id);
      selectComponent(component.id);
      
      // Get the element's position
      const element = e.currentTarget as HTMLElement;
      const rect = element.getBoundingClientRect();
      const canvasContainer = document.querySelector('[data-canvas-container]');
      
      if (canvasContainer) {
        const canvasRect = canvasContainer.getBoundingClientRect();
        const canvasScrollTop = canvasContainer.scrollTop || 0;
        const canvasScrollLeft = canvasContainer.scrollLeft || 0;
        
        // Position the context menu right below the element
        setContextMenu({ 
          x: rect.left - canvasRect.left + canvasScrollLeft,
          y: rect.bottom - canvasRect.top + canvasScrollTop + 5 // 5px gap below element
        });
      } else {
        // Fallback to mouse position if canvas not found
        setContextMenu({ x: e.clientX, y: e.clientY });
      }
    }
  };


  // Text editing handlers
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isPreview && (component.type === 'text' || component.type === 'heading') && !isLocked) {
      e.stopPropagation();
      setIsEditing(true);
      setEditValue(props.children || props.text || '');
    }
  };

  const handleEditSave = () => {
    const updates = component.type === 'heading' ? { children: editValue } : { text: editValue };
    updateComponent(component.id, { props: { ...props, ...updates } });
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditValue(props.children || props.text || '');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleEditCancel();
    }
  };

  // Hover handlers for design mode
  const handleMouseEnter = (e: React.MouseEvent) => {
    if (!isPreview) {
      e.stopPropagation();
      setHoveredComponent(component.id);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (!isPreview) {
      e.stopPropagation();
      setHoveredComponent(undefined);
    }
  };

  // Execute actions based on trigger
  const executeAction = async (action: ComponentAction, triggerType: string) => {
    if (action.trigger !== triggerType) return;

    try {
      switch (action.type) {
        case 'navigate':
          if (action.config.url) {
            if (action.config.target === '_blank') {
              window.open(action.config.url, '_blank');
            } else {
              window.location.href = action.config.url;
            }
          }
          break;

        case 'flow':
          if (action.config.flowData) {
            await executeFlow(action.config.flowData);
          }
          break;

        case 'navigateToPage':
          if (action.config.pageId && currentProject) {
            const targetPage = currentProject.pages.find(p => p.id === action.config.pageId);
            if (targetPage) {
              // Build URL with parameters
              let url = targetPage.route;
              const params = action.config.parameters || {};
              
              if (Object.keys(params).length > 0) {
                const searchParams = new URLSearchParams();
                Object.entries(params).forEach(([key, value]) => {
                  if (value !== undefined && value !== null) {
                    searchParams.append(key, String(value));
                  }
                });
                url += `?${searchParams.toString()}`;
              }
              
              // Navigate within the app
              setCurrentPage(action.config.pageId);
              // Update URL without page reload
              window.history.pushState({}, '', url);
            }
          }
          break;

        case 'showAlert':
          toast.info(action.config.message || 'Alert triggered');
          break;

        case 'executeCode':
          if (action.config.code) {
            // Create a safe execution context
            const context = {
              params: allParams,
              component: component,
              toast: toast,
              console: console
            };
            
            // Execute the code with context
            const func = new Function('context', `
              const { params, component, toast, console } = context;
              ${action.config.code}
            `);
            
            func(context);
          }
          break;

        case 'openModal':
          // Modal logic would go here
          toast.info('Modal functionality not yet implemented');
          break;

        case 'apiCall':
          if (action.config.url) {
            const response = await fetch(action.config.url, {
              method: action.config.method || 'GET',
              headers: action.config.headers || {},
              body: action.config.body ? JSON.stringify(action.config.body) : undefined
            });
            
            const data = await response.json();
            toast.success('API call successful');
            console.log('API Response:', data);
          }
          break;

        default:
          console.warn('Unknown action type:', action.type);
      }
    } catch (error) {
      console.error('Error executing action:', error);
      toast.error('Action execution failed: ' + error.message);
    }
  };

  // Handle component interactions in preview mode
  const handleComponentAction = async (triggerType: string, event?: React.MouseEvent) => {
    if (!isPreview) return;
    
    event?.preventDefault();
    event?.stopPropagation();

    // Check if component has action flows (new format - directly on component)
    if (component.actionFlows && component.actionFlows[triggerType]) {
      try {
        await executeFlow(component.actionFlows[triggerType]);
        return;
      } catch (error) {
        console.error('Error executing component flow:', error);
        toast.error('Action flow execution failed');
        return;
      }
    }

    const actions = component.props?.actions || [];
    
    // Execute all actions that match the trigger
    for (const action of actions) {
      // Skip flow actions as they're handled above via actionFlows
      if (action.type === 'flow' && action.trigger === triggerType) {
        // Execute flow from props.actions (legacy format)
        if (action.config?.flowData) {
          await executeFlow(action.config.flowData);
        }
        continue;
      }
      await executeAction(action, triggerType);
    }
  };

  // Execute a flow (sequence of connected actions)
  const executeFlow = async (flowData: any) => {
    const { nodes, edges } = flowData;
    
    // Find the start node
    const startNode = nodes.find((node: any) => node.data.isStart);
    if (!startNode) {
      throw new Error('No start node found in flow');
    }

    // Execute nodes starting from the start node
    await executeFlowNode(startNode.id, nodes, edges, {});
  };

  const executeFlowNode = async (nodeId: string, nodes: any[], edges: any[], context: any) => {
    const node = nodes.find((n: any) => n.id === nodeId);
    if (!node) return;
    
    // Skip start node, find its connected nodes
    if (node.data.isStart) {
      const outgoingEdges = edges.filter((edge: any) => edge.source === nodeId);
      for (const edge of outgoingEdges) {
        await executeFlowNode(edge.target, nodes, edges, context);
      }
      return;
    }

    const { type, config } = node.data;

    try {
      // Execute the node action
      switch (type) {
        case 'navigate':
        case 'openUrl':
        case 'redirect':
          if (config.url) {
            if (config.target === '_blank') {
              window.open(config.url, '_blank');
            } else {
              window.location.href = config.url;
            }
          }
          break;

        case 'navigateToPage':
          if (config.pageId) {
            // Navigate to page within app builder
            console.log('Navigating to page:', config.pageId);
            toast.info(`Navigating to page: ${config.pageId}`);
          }
          break;

        case 'showAlert':
          if (config.message) {
            toast[config.type || 'info'](config.message);
          }
          break;

        case 'showComponent':
          // Show component logic
          console.log('Showing component:', config.componentId);
          break;

        case 'hideComponent':
          // Hide component logic
          console.log('Hiding component:', config.componentId);
          break;

        case 'openModal':
          console.log('Opening modal:', config.modalId);
          toast.info(`Opening modal: ${config.modalId}`);
          break;

        case 'closeModal':
          console.log('Closing modal:', config.modalId);
          toast.info(`Closing modal: ${config.modalId}`);
          break;

        case 'apiCall':
          if (config.url) {
            try {
              const response = await fetch(config.url, {
                method: config.method || 'GET',
                headers: config.headers || {},
                body: config.method !== 'GET' ? JSON.stringify(config.body || {}) : undefined,
              });
              const data = await response.json();
              context.apiResponse = data;
              toast.success('API call successful');
            } catch (error) {
              console.error('API call failed:', error);
              toast.error('API call failed');
            }
          }
          break;

        case 'delay':
          await new Promise(resolve => setTimeout(resolve, config.duration || 1000));
          break;

        case 'setVariable': {
          const { scope = 'app', variableName, operation = 'set', value } = config;
          // Import dynamically to avoid circular dependencies
          const { useVariableStore } = await import('@/stores/variableStore');
          const variableStore = useVariableStore.getState();
          
          if (variableName) {
            // Parse value for booleans if string
            let parsedValue = value;
            if (value === 'true') parsedValue = true;
            else if (value === 'false') parsedValue = false;
            
            switch (operation) {
              case 'set':
                variableStore.setVariable(scope, variableName, parsedValue);
                console.log(`Set ${scope}.${variableName} = ${parsedValue}`);
                break;
              case 'increment':
                variableStore.incrementVariable(scope, variableName, Number(value) || 1);
                console.log(`Incremented ${scope}.${variableName} by ${value || 1}`);
                break;
              case 'decrement':
                variableStore.decrementVariable(scope, variableName, Number(value) || 1);
                console.log(`Decremented ${scope}.${variableName} by ${value || 1}`);
                break;
              case 'toggle':
                variableStore.toggleVariable(scope, variableName);
                console.log(`Toggled ${scope}.${variableName}`);
                break;
              case 'append':
                variableStore.appendToVariable(scope, variableName, value);
                console.log(`Appended to ${scope}.${variableName}:`, value);
                break;
              case 'remove':
                variableStore.removeFromVariable(scope, variableName, Number(value) || 0);
                console.log(`Removed index ${value} from ${scope}.${variableName}`);
                break;
            }
          }
          break;
        }

        case 'executeCode':
          if (config.code) {
            try {
              // Execute JavaScript code
              const func = new Function('context', config.code);
              func(context);
              console.log('Code executed successfully');
            } catch (error) {
              console.error('Code execution failed:', error);
              toast.error('Code execution failed');
            }
          }
          break;

        case 'condition':
          // Handle conditional branching
          const conditionResult = evaluateCondition(config, context);
          const conditionEdges = edges.filter((edge: any) => edge.source === nodeId);
          
          for (const edge of conditionEdges) {
            if ((conditionResult && edge.sourceHandle === 'true') || (!conditionResult && edge.sourceHandle === 'false')) {
              await executeFlowNode(edge.target, nodes, edges, context);
            }
          }
          return; // Don't continue to default execution

        case 'sendEmail':
          console.log('Sending email:', config.to, config.subject);
          toast.info(`Email sent to ${config.to}`);
          break;

        case 'webhook':
          if (config.webhookUrl) {
            try {
              await fetch(config.webhookUrl, {
                method: config.method || 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config.payload || {}),
              });
              toast.success('Webhook triggered successfully');
            } catch (error) {
              console.error('Webhook failed:', error);
              toast.error('Webhook failed');
            }
          }
          break;

        case 'copyToClipboard':
          if (config.text && navigator.clipboard) {
            try {
              await navigator.clipboard.writeText(config.text);
              toast.success('Copied to clipboard');
            } catch (error) {
              console.error('Copy failed:', error);
              toast.error('Failed to copy to clipboard');
            }
          }
          break;

        case 'calculate':
          if (config.expression && config.resultVariable) {
            try {
              // Simple expression evaluation (in production, use a safe evaluator)
              const result = eval(config.expression.replace(/\{\{(\w+)\}\}/g, (match, varName) => context[varName] || 0));
              context[config.resultVariable] = result;
              console.log(`Calculation result: ${config.resultVariable} = ${result}`);
            } catch (error) {
              console.error('Calculation failed:', error);
              toast.error('Calculation failed');
            }
          }
          break;

        case 'filterData':
          if (config.dataSource && config.filterExpression) {
            try {
              const data = context[config.dataSource] || [];
              const filterFunc = new Function('item', `return ${config.filterExpression}`);
              const filteredData = data.filter(filterFunc);
              context.filteredData = filteredData;
              console.log('Data filtered:', filteredData.length, 'items');
            } catch (error) {
              console.error('Data filtering failed:', error);
              toast.error('Data filtering failed');
            }
          }
          break;
      }

      // Continue to next nodes (for non-conditional nodes)
      if (type !== 'condition') {
        const outgoingEdges = edges.filter((edge: any) => edge.source === nodeId);
        for (const edge of outgoingEdges) {
          await executeFlowNode(edge.target, nodes, edges, context);
        }
      }
    } catch (error) {
      console.error(`Error executing flow node ${nodeId}:`, error);
      toast.error(`Flow execution failed at ${node.data.label}: ${error.message}`);
    }
  };

  const evaluateCondition = (config: any, context: any): boolean => {
    const { expression, operator, value } = config;
    let leftValue = expression;

    // Replace variables in expression
    if (expression.startsWith('{{') && expression.endsWith('}}')) {
      const varName = expression.slice(2, -2);
      leftValue = context[varName] || allParams[varName];
    }

    // Evaluate condition
    switch (operator) {
      case 'equals': return leftValue == value;
      case 'notEquals': return leftValue != value;
      case 'greaterThan': return Number(leftValue) > Number(value);
      case 'lessThan': return Number(leftValue) < Number(value);
      case 'contains': return String(leftValue).includes(String(value));
      default: return false;
    }
  };

  // Remove drag style and drag props since we're using separate drag handle
  const dragStyle = {};

  const getDragProps = () => {
    // No drag props on the component itself
    return {};
  };

  // Apply spacing styles from spacing controls
  const getSpacingStyles = (props: any) => {
    const styles: React.CSSProperties = {};
    
    // Handle the unified spacing control format
    if (props.spacingControl && typeof props.spacingControl === 'object') {
      const spacing = props.spacingControl;
      
      // Apply padding if defined
      if (spacing.padding) {
        const p = spacing.padding;
        const unit = p.unit || 'px';
        styles.paddingTop = p.top ? `${p.top}${unit}` : '0';
        styles.paddingRight = p.right ? `${p.right}${unit}` : '0';
        styles.paddingBottom = p.bottom ? `${p.bottom}${unit}` : '0';
        styles.paddingLeft = p.left ? `${p.left}${unit}` : '0';
      }
      
      // Apply margin if defined
      if (spacing.margin) {
        const m = spacing.margin;
        const unit = m.unit || 'px';
        styles.marginTop = m.top ? `${m.top}${unit}` : '0';
        styles.marginRight = m.right ? `${m.right}${unit}` : '0';
        styles.marginBottom = m.bottom ? `${m.bottom}${unit}` : '0';
        styles.marginLeft = m.left ? `${m.left}${unit}` : '0';
      }
    }
    
    // Handle legacy separate control format for backward compatibility
    if (props.paddingControl && typeof props.paddingControl === 'object') {
      const p = props.paddingControl;
      const unit = p.unit || 'px';
      styles.paddingTop = p.top ? `${p.top}${unit}` : '0';
      styles.paddingRight = p.right ? `${p.right}${unit}` : '0';
      styles.paddingBottom = p.bottom ? `${p.bottom}${unit}` : '0';
      styles.paddingLeft = p.left ? `${p.left}${unit}` : '0';
    }
    
    if (props.marginControl && typeof props.marginControl === 'object') {
      const m = props.marginControl;
      const unit = m.unit || 'px';
      styles.marginTop = m.top ? `${m.top}${unit}` : '0';
      styles.marginRight = m.right ? `${m.right}${unit}` : '0';
      styles.marginBottom = m.bottom ? `${m.bottom}${unit}` : '0';
      styles.marginLeft = m.left ? `${m.left}${unit}` : '0';
    }
    
    return styles;
  };

  // Layout style keys that should defer to class/breakpoint resolution when classes exist
  const LAYOUT_KEYS_DEFERRED_TO_CLASS = new Set([
    'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
    'gridTemplateColumns', 'gridTemplateRows', 'gridAutoFlow',
  ]);

  // Apply layout styles including display, flex, grid properties
  // IMPORTANT: When classes are applied, layout keys should NOT be applied inline
  // unless explicitly locked, so that breakpoint-resolved class styles take precedence.
  // EXCEPTION: AI-generated components should always apply their layout inline on first render.
  const getLayoutStyles = (inputProps: any) => {
    const styles: React.CSSProperties = {};
    
    // AI-generated components should always apply layout props inline
    // This ensures grids, flex layouts render correctly before class sync completes
    const isAIGenerated = inputProps?._aiGenerated === true;
    
    // Check if this component has applied classes with actual styles
    const appliedClassesRaw = inputProps?.appliedClasses;
    const appliedClasses: string[] = Array.isArray(appliedClassesRaw) ? appliedClassesRaw : [];
    const hasClassesWithStyles = appliedClasses.some(className => {
      const classData = classes.find(c => c.name === className);
      if (!classData) return false;
      const hasDesktop = classData.styles && Object.keys(classData.styles).length > 0;
      const hasMobile = (classData as any).mobileStyles && Object.keys((classData as any).mobileStyles).length > 0;
      const hasTablet = (classData as any).tabletStyles && Object.keys((classData as any).tabletStyles).length > 0;
      return hasDesktop || hasMobile || hasTablet;
    });
    
    // Locked props are explicit user overrides that should always apply
    const lockedProps = inputProps?.__lockedProps || {};
    
    // Critical layout keys that must ALWAYS apply for AI components to prevent broken grids
    const criticalLayoutKeys = [
      'display', 
      'flexDirection',
      'justifyContent', 
      'alignItems',
      'gap',
      'gridTemplateColumns', 
      'gridTemplateRows', 
      'gridAutoFlow'
    ];
    
    // Helper to check if a layout key should be applied inline
    const shouldApplyLayoutKey = (key: string): boolean => {
      // If no classes with styles → always apply inline props (including AI-generated)
      if (!hasClassesWithStyles) {
        // AI-generated components without classes: always apply critical layout keys inline
        if (isAIGenerated && criticalLayoutKeys.includes(key)) return true;
        return true;
      }
      // Once classes with styles exist, _aiGenerated is irrelevant.
      // Class-based breakpoint-resolved CSS takes full control over layout,
      // preventing desktop inline props from overriding tablet/mobile class styles.
      // If locked → user explicitly overrode this at component level
      if (lockedProps[key] === true) return true;
      // Otherwise, defer to class/breakpoint resolution (don't apply inline)
      return false;
    };
    
    // Display (optional – containers like row/column already set flex via classes)
    if (inputProps.display && shouldApplyLayoutKey('display')) {
      styles.display = inputProps.display;
    }

    // Flex properties – apply only when appropriate
    if (inputProps.flexDirection && shouldApplyLayoutKey('flexDirection')) {
      styles.flexDirection = inputProps.flexDirection as any;
    }
    if (inputProps.justifyContent && shouldApplyLayoutKey('justifyContent')) {
      styles.justifyContent = inputProps.justifyContent as any;
    }
    if (inputProps.alignItems && shouldApplyLayoutKey('alignItems')) {
      styles.alignItems = inputProps.alignItems as any;
    }
    if (inputProps.gap !== undefined && shouldApplyLayoutKey('gap')) {
      styles.gap = inputProps.gap;
    }

    // Grid properties – apply only when appropriate
    if (inputProps.gridTemplateColumns && shouldApplyLayoutKey('gridTemplateColumns')) {
      styles.gridTemplateColumns = inputProps.gridTemplateColumns;
    }
    if (inputProps.gridTemplateRows && shouldApplyLayoutKey('gridTemplateRows')) {
      styles.gridTemplateRows = inputProps.gridTemplateRows;
    }
    if (inputProps.gridAutoFlow && shouldApplyLayoutKey('gridAutoFlow')) {
      styles.gridAutoFlow = inputProps.gridAutoFlow as any;
    }

    // Text alignment for block elements (not deferred since it's not a layout key typically overridden at breakpoints)
    if (inputProps.textAlign && (inputProps.display === 'block' || inputProps.display === 'inline-block' || !inputProps.display)) {
      styles.textAlign = inputProps.textAlign as any;
    }
    
    // Width is handled by getDimensionStyles with proper class-deference checks.
    // Do NOT apply width here -- it would override responsive class overrides.
    
    return styles;
  };

  // Position styles for absolute/fixed/relative positioning (critical for gradient orbs)
  const getPositionStyles = (props: any): React.CSSProperties => {
    const styles: React.CSSProperties = {};
    
    if (props.position) styles.position = props.position as any;
    if (props.top !== undefined) styles.top = props.top;
    if (props.right !== undefined) styles.right = props.right;
    if (props.bottom !== undefined) styles.bottom = props.bottom;
    if (props.left !== undefined) styles.left = props.left;
    if (props.zIndex !== undefined) styles.zIndex = props.zIndex;
    if (props.pointerEvents !== undefined) styles.pointerEvents = props.pointerEvents as any;
    
    return styles;
  };

  // Border styles from new unified border property
  const getNewBorderStyles = (props: any): React.CSSProperties => {
    const styles: React.CSSProperties = {};
    const b = props?.border;
    if (!b) return styles;
    const unit = b.unit || 'px';
    const width = b.width ? `${b.width}${unit}` : undefined;
    const color = b.color as string | undefined;
    const style = b.style as string | undefined;
    const sides = b.sides || { top: false, right: false, bottom: false, left: false };
    if (style === 'none') {
      styles.borderStyle = 'none';
      styles.borderWidth = '0';
      return styles;
    }
    if (width) {
      styles.borderStyle = style || 'solid';
      styles.borderTopWidth = sides.top ? width : '0';
      styles.borderRightWidth = sides.right ? width : '0';
      styles.borderBottomWidth = sides.bottom ? width : '0';
      styles.borderLeftWidth = sides.left ? width : '0';
    }
    if (color) styles.borderColor = color;
    return styles;
  };

  // Border radius helper - used by ALL component types (section, container, div, etc.)
  const getBorderRadiusStyle = (props: any, componentType: string): string | undefined => {
    const br = props?.borderRadius;
    if (!br) return resolveDefaultBorderRadius(componentType, activeTokens);
    const tl = Number(br.topLeft) || 0;
    const tr = Number(br.topRight) || 0;
    const bl = Number(br.bottomLeft) || 0;
    const bR = Number(br.bottomRight) || 0;
    const isLocked = props?.__lockedProps?.borderRadius === true;
    // If all corners are 0 and not explicitly locked, use design token default
    if (tl === 0 && tr === 0 && bl === 0 && bR === 0 && !isLocked) {
      return resolveDefaultBorderRadius(componentType, activeTokens);
    }
    const unit = br.unit || 'px';
    return `${tl}${unit} ${tr}${unit} ${bR}${unit} ${bl}${unit}`;
  };

  // Apply dimension styles from layout controls  
  const getDimensionStyles = (props: any) => {
    const styles: React.CSSProperties = {};

    // Class-deference: if classes with styles exist, don't apply dimension props inline
    // This allows class-based breakpoint overrides (e.g. width: 100% on mobile) to take effect
    const appliedClassesRaw = props?.appliedClasses;
    const appliedClasses: string[] = Array.isArray(appliedClassesRaw) ? appliedClassesRaw : [];
    const hasClassDimensions = appliedClasses.some(className => {
      const classData = classes.find(c => c.name === className);
      if (!classData) return false;
      const s = classData.styles || {};
      const m = (classData as any).mobileStyles || {};
      const t = (classData as any).tabletStyles || {};
      const hasDeskDim = s.width || s.height || s.minWidth || s.maxWidth;
      const hasMobileDim = m.width || m.height || m.minWidth || m.maxWidth;
      const hasTabletDim = t.width || t.height || t.minWidth || t.maxWidth;
      return hasDeskDim || hasMobileDim || hasTabletDim;
    });
    const lockedProps = props?.__lockedProps || {};
    const shouldApplyDimKey = (key: string): boolean => {
      if (lockedProps[key] === true) return true;
      if (hasClassDimensions) return false;
      return true;
    };

    const resolveDim = (val: any): string | number | undefined => {
      if (val === undefined || val === null) return undefined;
      if (typeof val === 'number') return `${val}px`;
      if (typeof val === 'string') {
        return val === 'auto' ? undefined : val;
      }
      if (typeof val === 'object') {
        const { value, unit } = val || {};
        if (value === undefined || value === null || value === '') return undefined;
        if (value === 'auto' || unit === 'auto') return undefined;
        const u = unit || 'px';
        return `${value}${u}`;
      }
      return undefined;
    };
    
    const w = resolveDim(props.width);
    const h = resolveDim(props.height);
    const minW = resolveDim(props.minWidth);
    const minH = resolveDim(props.minHeight);
    const maxW = resolveDim(props.maxWidth);
    const maxH = resolveDim(props.maxHeight);

    // If width is a percentage and horizontal margins are set, prevent overflow by
    // subtracting margins from the width (more intuitive for the builder UI).
    const getHorizontalMarginsPx = (): { left: number; right: number } | null => {
      const fromControl = (m: any) => {
        if (!m || typeof m !== 'object') return null;
        const unit = m.unit || 'px';
        if (unit !== 'px') return null;
        return {
          left: Number(m.left || 0) || 0,
          right: Number(m.right || 0) || 0,
        };
      };

      // Prefer unified spacingControl.margin, fallback to legacy marginControl.
      if (props.spacingControl?.margin) return fromControl(props.spacingControl.margin);
      if (props.marginControl) return fromControl(props.marginControl);
      return null;
    };

    const margins = getHorizontalMarginsPx();
    const wStr = typeof w === 'string' ? w : undefined;
    const hStr = typeof h === 'string' ? h : undefined;
    
    // Detect relative sizing that could overflow the canvas
    const hasPercentWidth = !!wStr && /%$/.test(wStr);
    const hasVwWidth = !!wStr && /vw/i.test(wStr);
    const hasPercentHeight = !!hStr && /%$/.test(hStr);
    const hasVhHeight = !!hStr && /vh/i.test(hStr);
    
    // In design mode (not preview), clamp relative widths to never exceed canvas bounds
    // This ensures WYSIWYG experience - elements never overflow the canvas container
    const isDesignMode = !isPreview;
    const safeInset = 'var(--canvas-safe-inset, 1px)';

    if (w !== undefined && shouldApplyDimKey('width')) {
      if (isDesignMode && (hasPercentWidth || hasVwWidth)) {
        let widthExpr = wStr!;
        if (hasVwWidth) {
          widthExpr = `min(${wStr}, 100%)`;
        }
        if (margins && (margins.left > 0 || margins.right > 0)) {
          widthExpr = `calc(${widthExpr} - ${margins.left}px - ${margins.right}px)`;
        }
        const isFullBleed = wStr === '100%' || hasVwWidth || wStr === 'calc(100%)';
        if (isFullBleed) {
          widthExpr = `calc(${widthExpr} - (${safeInset} * 2))`;
        }
        styles.width = widthExpr;
        styles.maxWidth = `calc(100% - (${safeInset} * 2))`;
      } else if (hasPercentWidth && margins && (margins.left > 0 || margins.right > 0)) {
        styles.width = `calc(${wStr} - ${margins.left}px - ${margins.right}px)`;
        styles.maxWidth = styles.maxWidth ?? '100%';
      } else {
        styles.width = w;
      }
    }

    if (h !== undefined && shouldApplyDimKey('height')) {
      if (isDesignMode && (hasPercentHeight || hasVhHeight)) {
        let heightExpr = hStr!;
        if (hasVhHeight) {
          heightExpr = `min(${hStr}, 100%)`;
        }
        const isFullBleedHeight = hStr === '100%' || hasVhHeight || hStr === 'calc(100%)';
        if (isFullBleedHeight) {
          heightExpr = `calc(${heightExpr} - (${safeInset} * 2))`;
        }
        styles.height = heightExpr;
        styles.maxHeight = `calc(100% - (${safeInset} * 2))`;
      } else {
        styles.height = h;
      }
    }

    if (minW !== undefined && shouldApplyDimKey('minWidth')) styles.minWidth = minW;
    if (minH !== undefined && shouldApplyDimKey('minHeight')) styles.minHeight = minH;
    if (maxW !== undefined && !styles.maxWidth && shouldApplyDimKey('maxWidth')) styles.maxWidth = maxW;
    if (maxH !== undefined && !styles.maxHeight && shouldApplyDimKey('maxHeight')) styles.maxHeight = maxH;
    
    return styles;
  };

  // Apply effects styles from new layered effects properties
  const getEffectsStyles = (props: any): React.CSSProperties => {
    const styles: React.CSSProperties = {};

    // Box shadows from layered boxShadows array
    if (props.boxShadows && Array.isArray(props.boxShadows) && props.boxShadows.length > 0) {
      const css = generateBoxShadowCSS(props.boxShadows);
      if (css && css !== 'none') {
        styles.boxShadow = css;
      }
    }

    // Filters from layered filters array
    if (props.filters && Array.isArray(props.filters) && props.filters.length > 0) {
      const css = generateFilterCSS(props.filters);
      if (css && css !== 'none') {
        styles.filter = css;
      }
    }
    
    // Direct filter property (from AI-generated styles)
    if (props.filter && !styles.filter) {
      styles.filter = props.filter;
    }

    // Transitions from layered transitions array
    if (props.transitions && Array.isArray(props.transitions) && props.transitions.length > 0) {
      const css = generateTransitionCSS(props.transitions);
      if (css && css !== 'none') {
        styles.transition = css;
      }
    }
    
    // Direct transition property (from AI-generated styles)
    if (props.transition && !styles.transition) {
      styles.transition = props.transition;
    }

    // Transforms from grouped transforms object
    if (props.transforms && typeof props.transforms === 'object') {
      const css = generateTransformCSS(props.transforms);
      if (css && css !== 'none') {
        styles.transform = css;
      }
    }
    
    // Direct transform property
    if (props.transform && !styles.transform) {
      styles.transform = props.transform;
    }
    
    // Cursor property
    if (props.cursor) {
      styles.cursor = props.cursor;
    }

    return styles;
  };

  // Legacy spacing classes for backward compatibility
  const getSpacingClasses = (props: any) => {
    const classes = [];
    
    // Only apply legacy classes if new controls aren't being used
    if (!props.spacingControl && !props.paddingControl) {
      // Padding
      if (props.padding === 'none') classes.push('p-0');
      else if (props.padding === 'sm') classes.push('p-2');
      else if (props.padding === 'md') classes.push('p-4');
      else if (props.padding === 'lg') classes.push('p-6');
      else if (props.padding === 'xl') classes.push('p-8');
    }
    
    if (!props.spacingControl && !props.marginControl) {
      // Margin
      if (props.margin === 'none') classes.push('m-0');
      else if (props.margin === 'sm') classes.push('m-2');
      else if (props.margin === 'md') classes.push('m-4');
      else if (props.margin === 'lg') classes.push('m-6');
      else if (props.margin === 'xl') classes.push('m-8');
    }
    
    return classes.join(' ');
  };

  // Use the new class-reference style resolver
  // Supports both new format (classNames + styleOverrides) and legacy (props.appliedClasses)
  // IMPORTANT: Pass currentBreakpoint for breakpoint-aware resolution
  const appliedClassStyles = useResolvedCSSStyles({
    id: component.id,
    classNames: component.classNames,
    styleOverrides: component.styleOverrides,
    props: { ...props, appliedClasses: props.appliedClasses }
  }, { breakpoint: currentBreakpoint });

  // Support component.style (ComponentStyle) used by prebuilt components and other legacy generators
  const componentStyle = useMemo(() => {
    if (!component.style) {
      return { classes: [] as string[], inlineStyles: {} as React.CSSProperties };
    }
    return StyleEngine.generateStyles(component.style);
  }, [component.style]);
  
  
  // ==========================================
  // LAYERED BACKGROUND COMPUTATION (shared by all components)
  // ==========================================
  // This computes background styles that support fill + gradient + image layers
  // It's computed here so ALL component types can use it (not just section/container)
  
  // Helper function to get color value with opacity support
  // Now resolves against current design tokens for real-time updates
  const getColorValue = (colorProp: any) => {
    if (!colorProp) return undefined;
    
    // Extract raw color value
    let rawValue: string | undefined;
    let opacity = 100;
    
    // Handle TokenRefValue: { tokenRef: string, value: string }
    if (typeof colorProp === 'object' && 'tokenRef' in colorProp) {
      const token = activeTokens.get(colorProp.tokenRef);
      rawValue = token?.value || colorProp.value || '';
    } else if (typeof colorProp === 'string') {
      rawValue = colorProp;
    } else if (colorProp.type === 'solid' && colorProp.value) {
      // Handle nested token ref inside ColorAdvancedPicker value
      if (typeof colorProp.value === 'object' && 'tokenRef' in colorProp.value) {
        const token = activeTokens.get(colorProp.value.tokenRef);
        rawValue = token?.value || colorProp.value.value || '';
      } else {
        rawValue = colorProp.value;
      }
      opacity = colorProp.opacity || 100;
    }
    
    if (!rawValue) return undefined;
    
    // Resolve against current design tokens - if value matches a token, use current token value
    const normalizeColor = (v: string) => {
      const normalized = v.trim().toLowerCase();
      if (/^#[0-9a-f]{3}$/i.test(normalized)) {
        return `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
      }
      return normalized;
    };
    
    const normalizedValue = normalizeColor(rawValue);
    const colorTokens = Array.from(activeTokens.values()).filter(t => t.category === 'color');
    
    for (const token of colorTokens) {
      if (normalizeColor(token.value) === normalizedValue) {
        rawValue = token.value; // Use current token value
        break;
      }
    }
    
    // Apply opacity
    if (opacity < 100 && rawValue) {
      const hex = String(rawValue).replace('#', '');
      if (hex.length === 6) {
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
      }
    }
    
    return rawValue;
  };

  // Helper to detect "__deleted__" sentinel used by BackgroundEditor to clear layers
  const isDeletedValue = (v: any): boolean => 
    typeof v === 'string' && v.trim().toLowerCase() === '__deleted__';
  
  // Helper to check if a background layer value is actually set (non-empty and not deleted)
  const isValidBgLayer = (v: any): boolean => {
    if (!v) return false;
    if (isDeletedValue(v)) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (typeof v === 'object' && v.value) {
      return typeof v.value === 'string' && v.value.trim().length > 0 && !isDeletedValue(v.value);
    }
    return false;
  };

  // Helper to extract the actual value from a layer (string or object)
  const getBgLayerValue = (v: any): string => {
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && v.value) return v.value;
    return '';
  };

  // Helper to extract opacity from a layer (defaults to 100)
  const getBgLayerOpacity = (v: any): number => {
    if (typeof v === 'object' && typeof v.opacity === 'number') return v.opacity;
    return 100;
  };

  // Helper: backgroundColor ("fill") can be a string or a ColorAdvancedPicker object.
  const isValidFillColor = (v: any): boolean => {
    if (!v) return false;
    if (isDeletedValue(v)) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (typeof v === 'object') {
      if (v.type === 'solid') return typeof v.value === 'string' && v.value.trim().length > 0;
      return false;
    }
    return false;
  };

  // IMPORTANT: Background is also handled by class styles (appliedClassStyles).
  // We only let inline props override class background when background is "locked" on this component.
  const isBackgroundLocked = !!(props as any)?.__lockedProps?.backgroundColor;
  const isGradientLocked = !!(props as any)?.__lockedProps?.backgroundGradient;
  const isImageLocked = !!(props as any)?.__lockedProps?.backgroundImage;
  const isLayerOrderLocked = !!(props as any)?.__lockedProps?.backgroundLayerOrder;
  const isBgSizeLocked = !!(props as any)?.__lockedProps?.backgroundSize;

  // Class-driven background values (resolved to CSS strings by useResolvedCSSStyles)
  const classBackground = (appliedClassStyles as any)?.background as string | undefined;
  const classBackgroundColor = (appliedClassStyles as any)?.backgroundColor as string | undefined;
  
  // FIXED: Also check for layered background props from the RAW resolved styles (not CSS-filtered)
  // These are stored in classes but filtered out by NON_CSS_STYLE_KEYS for DOM
  // IMPORTANT: Pass currentBreakpoint for breakpoint-aware resolution
  const { styles: rawResolvedStyles } = useResolvedStyles({
    id: component.id,
    classNames: component.classNames,
    styleOverrides: component.styleOverrides,
    props: { ...props, appliedClasses: props.appliedClasses }
  }, { breakpoint: currentBreakpoint });
  
  const classBackgroundGradient = (rawResolvedStyles as any)?.backgroundGradient || (rawResolvedStyles as any)?.background?.gradient || (rawResolvedStyles as any)?.background?.backgroundGradient || (appliedClassStyles as any)?.backgroundGradient;
  const classBackgroundImage = (rawResolvedStyles as any)?.backgroundImage || (rawResolvedStyles as any)?.background?.image || (rawResolvedStyles as any)?.background?.backgroundImage || (appliedClassStyles as any)?.backgroundImage;
  const classBackgroundLayerOrder = (rawResolvedStyles as any)?.backgroundLayerOrder || (rawResolvedStyles as any)?.background?.layerOrder || (rawResolvedStyles as any)?.background?.backgroundLayerOrder || (appliedClassStyles as any)?.backgroundLayerOrder;
  const classBackgroundSize = (rawResolvedStyles as any)?.backgroundSize || (rawResolvedStyles as any)?.background?.size || (rawResolvedStyles as any)?.background?.backgroundSize || (appliedClassStyles as any)?.backgroundSize;

  // Compute layered background styles for ANY component type
  const computeLayeredBackgroundStyles = (): React.CSSProperties => {
    const bgColorRaw = (props as any).backgroundColor;
    const bgGradientRaw = (props as any).backgroundGradient;
    const bgImageRaw = (props as any).backgroundImage;

    // Resolve effective values: if not locked, prefer inline ONLY when it's meaningfully set;
    // otherwise fall back to class-driven value.
    const effectiveBgColor = isBackgroundLocked
      ? (isDeletedValue(bgColorRaw) ? classBackgroundColor : bgColorRaw)
      : (isDeletedValue(bgColorRaw) || !isValidFillColor(bgColorRaw) ? classBackgroundColor : bgColorRaw);

    const effectiveBgGradient = isGradientLocked
      ? bgGradientRaw
      : (isValidBgLayer(bgGradientRaw) ? bgGradientRaw : classBackgroundGradient);

    const effectiveBgImage = isImageLocked
      ? bgImageRaw
      : (isValidBgLayer(bgImageRaw) ? bgImageRaw : classBackgroundImage);

    const effectiveLayerOrder = isLayerOrderLocked
      ? ((props as any).backgroundLayerOrder || ['image', 'gradient', 'fill'])
      : ((props as any).backgroundLayerOrder ?? classBackgroundLayerOrder ?? ['image', 'gradient', 'fill']);

    const effectiveBackgroundSize = isBgSizeLocked
      ? ((props as any).backgroundSize || 'cover')
      : ((props as any).backgroundSize ?? classBackgroundSize ?? 'cover');

    const hasBgImage = isValidBgLayer(effectiveBgImage);
    const hasBgGradient = isValidBgLayer(effectiveBgGradient);

    // If no layered backgrounds, use simple background handling
    if (!hasBgImage && !hasBgGradient) {
      // Check for simple class background first
      if (!isBackgroundLocked) {
        if (classBackground && !isDeletedValue(classBackground)) return { background: classBackground };
        if (classBackgroundColor && !isDeletedValue(classBackgroundColor)) return { backgroundColor: classBackgroundColor };
        
        // If classes are attached, don't fall back to potentially stale inline values
        const hasAnyClasses =
          (Array.isArray(component.classNames) && component.classNames.length > 0) ||
          (Array.isArray((props as any).appliedClasses) && (props as any).appliedClasses.length > 0);
        if (hasAnyClasses) return {};
      }
      
      // Simple backgroundColor fallback
      if (effectiveBgColor && !isDeletedValue(effectiveBgColor)) {
        const colorValue = getColorValue(effectiveBgColor);
        if (colorValue) return { backgroundColor: colorValue };
      }
      
      return {};
    }

    // Build background layers array - CSS renders first item on top
    const backgroundLayers: string[] = [];
    const backgroundSizes: string[] = [];

    // Helper: Apply opacity to gradient by modifying color stops
    const applyOpacityToGradient = (gradient: string, opacity: number): string => {
      if (opacity >= 100) return gradient;
      const alpha = opacity / 100;
      
      // Replace hex colors with rgba
      let result = gradient.replace(
        /#([0-9a-fA-F]{6})\b/g,
        (match) => {
          const hex = match.replace('#', '');
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
      );
      
      // Replace rgb() with rgba()
      result = result.replace(
        /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g,
        (_, r, g, b) => `rgba(${r}, ${g}, ${b}, ${alpha})`
      );
      
      // Handle existing rgba() - multiply the alpha
      result = result.replace(
        /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/g,
        (_, r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${parseFloat(a) * alpha})`
      );
      
      return result;
    };

    // Helper: Convert color to rgba with opacity
    const colorToRgba = (color: string, opacity: number): string => {
      if (opacity >= 100) return color;
      const alpha = opacity / 100;
      
      if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      if (color.startsWith('rgb(')) {
        const match = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
        if (match) {
          return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
        }
      }
      if (color.startsWith('rgba(')) {
        const match = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
        if (match) {
          return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${parseFloat(match[4]) * alpha})`;
        }
      }
      if (color.startsWith('hsl(')) {
        return color.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
      }
      if (color.startsWith('hsla(')) {
        return color.replace(/,\s*([\d.]+)\s*\)$/, `, ${alpha})`);
      }
      return color;
    };

    // Arrays to track per-layer position and repeat (since we might have multiple image layers)
    const backgroundPositions: string[] = [];
    const backgroundRepeats: string[] = [];

    for (const layerType of effectiveLayerOrder) {
      if (layerType === 'image' && isValidBgLayer(effectiveBgImage)) {
        const imageUrl = getBgLayerValue(effectiveBgImage);
        const imageOpacity = getBgLayerOpacity(effectiveBgImage);
        
        // Extract image-specific positioning from the background image value object
        const imageObj = typeof effectiveBgImage === 'object' ? effectiveBgImage : {};
        const imageSize = (imageObj as any).size || effectiveBackgroundSize || 'cover';
        const imagePosition = ((imageObj as any).position || 'center').replace('-', ' ');
        const imageRepeat = (imageObj as any).repeat || 'no-repeat';
        
        if (imageOpacity < 100) {
          // For images, we can't make them truly transparent with CSS background alone
          // Use a transparent overlay so layers above can show through when they have opacity
          const overlayColor = `rgba(255,255,255,${1 - imageOpacity / 100})`;
          backgroundLayers.push(`linear-gradient(${overlayColor}, ${overlayColor}), url(${imageUrl})`);
          backgroundSizes.push(`cover, ${imageSize}`);
          backgroundPositions.push(`center, ${imagePosition}`);
          backgroundRepeats.push(`no-repeat, ${imageRepeat}`);
        } else {
          backgroundLayers.push(`url(${imageUrl})`);
          backgroundSizes.push(imageSize);
          backgroundPositions.push(imagePosition);
          backgroundRepeats.push(imageRepeat);
        }
      } else if (layerType === 'gradient' && isValidBgLayer(effectiveBgGradient)) {
        const gradientValue = getBgLayerValue(effectiveBgGradient);
        const gradientOpacity = getBgLayerOpacity(effectiveBgGradient);
        
        // Apply TRUE transparency to gradient color stops
        const transparentGradient = applyOpacityToGradient(gradientValue, gradientOpacity);
        backgroundLayers.push(transparentGradient);
        backgroundSizes.push('cover');
        backgroundPositions.push('center');
        backgroundRepeats.push('no-repeat');
      } else if (layerType === 'fill' && effectiveBgColor && !isDeletedValue(effectiveBgColor)) {
        // Handle fill layer in the layer order for proper stacking
        const colorValue = getColorValue(effectiveBgColor);
        const fillOpacity = getBgLayerOpacity(effectiveBgColor);
        if (colorValue) {
          const transparentColor = colorToRgba(colorValue, fillOpacity);
          backgroundLayers.push(`linear-gradient(${transparentColor}, ${transparentColor})`);
          backgroundSizes.push('cover');
          backgroundPositions.push('center');
          backgroundRepeats.push('no-repeat');
        }
      }
    }

    const styles: React.CSSProperties = {};

    if (backgroundLayers.length > 0) {
      styles.background = backgroundLayers.join(', ');
      styles.backgroundSize = backgroundSizes.join(', ');
      styles.backgroundPosition = backgroundPositions.join(', ');
      styles.backgroundRepeat = backgroundRepeats.join(', ');
    }

    // Only set backgroundColor if fill wasn't already handled in the layer loop
    const fillHandledInLoop = effectiveLayerOrder.includes('fill');
    if (!fillHandledInLoop && effectiveBgColor && !isDeletedValue(effectiveBgColor)) {
      const colorValue = getColorValue(effectiveBgColor);
      if (colorValue) styles.backgroundColor = colorValue;
    }

    return styles;
  };

  // Compute the layered background styles once (available to all component cases)
  const layeredBackgroundStyles = computeLayeredBackgroundStyles();
  
  // Strip background-like keys from appliedClassStyles since we handle them via layeredBackgroundStyles
  const appliedClassStylesWithoutBg = useMemo(() => {
    const result = { ...appliedClassStyles } as any;
    delete result.background;
    delete result.backgroundColor;
    delete result.backgroundImage;
    delete result.backgroundGradient;
    delete result.backgroundLayerOrder;
    return result as React.CSSProperties;
  }, [appliedClassStyles]);

  // Generate dynamic hover CSS for AI-generated hover states
  const hoverCSS = useMemo(() => {
    // Check both direct props AND stateStyles.hover for hover effects
    const stateHover = (props as any).stateStyles?.hover;
    const hoverTransform = props.hoverTransform || stateHover?.transform;
    const hoverShadow = props.hoverShadow || stateHover?.boxShadow;
    
    if (!hoverTransform && !hoverShadow) return null;
    
    // Create a unique class name based on component ID
    const hoverClassName = `hover-${component.id.replace(/[^a-zA-Z0-9]/g, '-')}`;
    
    const hoverRules: string[] = [];
    if (hoverTransform) hoverRules.push(`transform: ${hoverTransform}`);
    if (hoverShadow) hoverRules.push(`box-shadow: ${hoverShadow}`);
    
    const css = `.${hoverClassName}:hover { ${hoverRules.join('; ')} }`;
    
    return { className: hoverClassName, css };
  }, [component.id, props.hoverTransform, props.hoverShadow, (props as any).stateStyles?.hover]);
  
  // Inject hover CSS into the document head
  useEffect(() => {
    if (!hoverCSS) return;
    
    const styleId = `hover-style-${component.id}`;
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    
    styleEl.textContent = hoverCSS.css;
    
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, [hoverCSS, component.id]);

  const commonProps = {
    'data-component-id': component.id,
    style: { 
      ...dragStyle, 
      ...componentStyle.inlineStyles,
      ...getSpacingStyles(props), // Spacing
      ...getDimensionStyles(props), // Dimensions
      ...getLayoutStyles(props), // Layout (includes flex, grid, etc.)
      ...getPositionStyles(props), // Position (absolute/fixed for gradient orbs)
      ...getNewBorderStyles(props), // New unified border styles
      ...getEffectsStyles(props), // New layered effects (boxShadows, filters, transitions, transforms)
      ...appliedClassStylesWithoutBg, // Apply class styles (without background - handled separately)
      ...layeredBackgroundStyles, // Apply layered backgrounds LAST so they take priority
      // Border radius - applies to ALL component types (section, container, div, etc.)
      borderRadius: getBorderRadiusStyle(props, component.type),
      // AI visual properties - ensure glass-morphism and other effects render
      backdropFilter: props.backdropFilter,
      WebkitBackdropFilter: props.backdropFilter, // Safari support
      overflow: props.overflow,
      opacity: props.opacity !== undefined ? props.opacity : undefined,
    },
    className: cn(
      'relative transition-all duration-200',
      // 'group' class is required for the drag handle's group-hover:opacity-100 to work
      !isPreview && 'group',
      !isPreview && 'min-h-[40px]',
      !isPreview && !isLocked && 'cursor-pointer',
      !isPreview && isLocked && 'cursor-not-allowed opacity-75',
      isOver && !isPreview && 'bg-primary/10 border-2 border-dashed border-primary',
      props.hidden && 'opacity-50',
      // Visual indicator for components with visibility binding in design mode
      isHiddenByCondition && !isPreview && forceShowInCanvas && 'opacity-40 border-2 border-dashed border-purple-400',
      hasVisibilityBinding && !isPreview && 'ring-1 ring-purple-400/50 ring-offset-1',
      getSpacingClasses(props),
      ...componentStyle.classes,
      props.className,
      // Apply dynamic hover class if present
      hoverCSS?.className,
      // Apply component's semantic ID as CSS class for injected styles
      component.id,
      // Apply all classNames/appliedClasses for CSS targeting
      ...(component.classNames || []),
      ...((props.appliedClasses as string[]) || [])
    ),
    onClick: handleClick,
    onContextMenu: handleContextMenu,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    ref: dropRef,
    // No drag props here - only on the drag handle
  };

  const renderComponent = () => {
    // Helper function to get color value with opacity support
    const getColorValue = (colorProp: any) => {
      if (!colorProp) return undefined;
      if (typeof colorProp === 'string') return colorProp;
      if (colorProp.type === 'solid' && colorProp.value) {
        const opacity = colorProp.opacity || 100;
        if (opacity < 100) {
          // Convert hex to rgba if opacity is less than 100
          const hex = String(colorProp.value).replace('#', '');
          if (hex.length === 6) {
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
          }
          // Fallback: can't apply opacity safely
          return colorProp.value;
        }
        return colorProp.value;
      }
      return undefined;
    };

    // Helper to detect "__deleted__" sentinel used by BackgroundEditor to clear layers
    const isDeletedValue = (v: any): boolean => 
      typeof v === 'string' && v.trim().toLowerCase() === '__deleted__';
    
    // Helper to check if a background layer value is actually set (non-empty and not deleted)
    // Supports both string and object { value, opacity } format
    const isValidBgLayer = (v: any): boolean => {
      if (!v) return false;
      if (isDeletedValue(v)) return false;
      if (typeof v === 'string') return v.trim().length > 0;
      if (typeof v === 'object' && v.value) {
        return typeof v.value === 'string' && v.value.trim().length > 0 && !isDeletedValue(v.value);
      }
      return false;
    };

    // Helper to extract the actual value from a layer (string or object)
    const getBgLayerValue = (v: any): string => {
      if (typeof v === 'string') return v;
      if (typeof v === 'object' && v.value) return v.value;
      return '';
    };

    // Helper to extract opacity from a layer (defaults to 100)
    const getBgLayerOpacity = (v: any): number => {
      if (typeof v === 'object' && typeof v.opacity === 'number') return v.opacity;
      return 100;
    };

    // Helper: backgroundColor ("fill") can be a string or a ColorAdvancedPicker object.
    // Treat empty/partial objects as "not set" so class-driven values can show on canvas.
    const isValidFillColor = (v: any): boolean => {
      if (!v) return false;
      if (isDeletedValue(v)) return false;
      if (typeof v === 'string') return v.trim().length > 0;
      if (typeof v === 'object') {
        if (v.type === 'solid') return typeof v.value === 'string' && v.value.trim().length > 0;
        // Gradients aren't valid for backgroundColor; they live in backgroundGradient
        return false;
      }
      return false;
    };

    // Background helper: supports solid + gradient values produced by ColorAdvancedPicker
    const getBackgroundStyle = (backgroundProp: any): React.CSSProperties => {
      if (!backgroundProp) return {};
      // Treat "__deleted__" as "not set" - return empty styles
      if (isDeletedValue(backgroundProp)) return {};
      if (typeof backgroundProp === 'string') {
        return { backgroundColor: backgroundProp };
      }
      if (backgroundProp.type === 'gradient' && backgroundProp.value) {
        return { background: String(backgroundProp.value) };
      }
      const solid = getColorValue(backgroundProp);
      return solid ? { backgroundColor: solid } : {};
    };

    // IMPORTANT: Background is also handled by class styles (appliedClassStyles).
    // We only let inline props override class background when background is "locked" on this component.
    const isBackgroundLocked = !!(props as any)?.__lockedProps?.backgroundColor;
    const isGradientLocked = !!(props as any)?.__lockedProps?.backgroundGradient;
    const isImageLocked = !!(props as any)?.__lockedProps?.backgroundImage;
    const isLayerOrderLocked = !!(props as any)?.__lockedProps?.backgroundLayerOrder;
    const isBgSizeLocked = !!(props as any)?.__lockedProps?.backgroundSize;

    // Class-driven background values (resolved to CSS strings by useResolvedCSSStyles)
    const classBackground = (appliedClassStyles as any)?.background as string | undefined;
    const classBackgroundColor = ((appliedClassStyles as any)?.backgroundColor || (rawResolvedStyles as any)?.background?.color || (rawResolvedStyles as any)?.background?.backgroundColor) as string | undefined;
    const classBackgroundGradient = (rawResolvedStyles as any)?.backgroundGradient || (rawResolvedStyles as any)?.background?.gradient || (rawResolvedStyles as any)?.background?.backgroundGradient || (appliedClassStyles as any)?.backgroundGradient;
    const classBackgroundImage = (rawResolvedStyles as any)?.backgroundImage || (rawResolvedStyles as any)?.background?.image || (rawResolvedStyles as any)?.background?.backgroundImage || (appliedClassStyles as any)?.backgroundImage;
    const classBackgroundLayerOrder = (rawResolvedStyles as any)?.backgroundLayerOrder || (rawResolvedStyles as any)?.background?.layerOrder || (rawResolvedStyles as any)?.background?.backgroundLayerOrder || (appliedClassStyles as any)?.backgroundLayerOrder;
    const classBackgroundSize = (rawResolvedStyles as any)?.backgroundSize || (rawResolvedStyles as any)?.background?.size || (rawResolvedStyles as any)?.background?.backgroundSize || (appliedClassStyles as any)?.backgroundSize;

    // New unified background helper that handles all layers with proper ordering.
    // Supports fill + gradient + image, and makes these interchangeable in classes.
    const getLayeredBackgroundStyles = (): React.CSSProperties => {
      const bgColorRaw = (props as any).backgroundColor;
      const bgGradientRaw = (props as any).backgroundGradient;
      const bgImageRaw = (props as any).backgroundImage;

      // Resolve effective values: if not locked, prefer inline ONLY when it's meaningfully set;
      // otherwise fall back to class-driven value. This prevents empty/partial objects from
      // masking class backgrounds and making the fill "disappear" on canvas.
      const effectiveBgColor = isBackgroundLocked
        ? (isDeletedValue(bgColorRaw) ? classBackgroundColor : bgColorRaw)
        : (isDeletedValue(bgColorRaw) || !isValidFillColor(bgColorRaw) ? classBackgroundColor : bgColorRaw);

      const effectiveBgGradient = isGradientLocked
        ? bgGradientRaw
        : (isValidBgLayer(bgGradientRaw) ? bgGradientRaw : classBackgroundGradient);

      const effectiveBgImage = isImageLocked
        ? bgImageRaw
        : (isValidBgLayer(bgImageRaw) ? bgImageRaw : classBackgroundImage);

      const effectiveLayerOrder = isLayerOrderLocked
        ? ((props as any).backgroundLayerOrder || ['image', 'gradient', 'fill'])
        : ((props as any).backgroundLayerOrder ?? classBackgroundLayerOrder ?? ['image', 'gradient', 'fill']);

      // CRITICAL: Extract size, position, repeat from the backgroundImage object itself
      // This ensures sections/containers respect the image settings just like divs do
      const getImageSettings = (imgObj: any): { size: string; position: string; repeat: string } => {
        if (!imgObj || typeof imgObj !== 'object') {
          return { size: 'cover', position: 'center', repeat: 'no-repeat' };
        }
        return {
          size: imgObj.size || 'cover',
          position: (imgObj.position || 'center').replace('-', ' '), // Convert "top-left" to "top left"
          repeat: imgObj.repeat || 'no-repeat'
        };
      };
      
      const imageSettings = getImageSettings(effectiveBgImage);
      
      // Fallback to prop-level or class-level backgroundSize if not set in image object
      const effectiveBackgroundSize = imageSettings.size !== 'cover' 
        ? imageSettings.size 
        : (isBgSizeLocked
          ? ((props as any).backgroundSize || 'cover')
          : ((props as any).backgroundSize ?? classBackgroundSize ?? 'cover'));
      
      const effectiveBackgroundPosition = imageSettings.position;
      const effectiveBackgroundRepeat = imageSettings.repeat;

      // Build background layers array - CSS renders first item on top
      // Each layer can have opacity - we apply via rgba for colors and linear-gradient overlay for images
      // CRITICAL: Track per-layer sizes, positions, and repeats for proper rendering
      const backgroundLayers: string[] = [];
      const backgroundSizes: string[] = [];
      const backgroundPositions: string[] = [];
      const backgroundRepeats: string[] = [];

      // Helper: Apply opacity to gradient by modifying color stops
      const applyOpacityToGradient = (gradient: string, opacity: number): string => {
        if (opacity >= 100) return gradient;
        const alpha = opacity / 100;
        
        // Replace hex colors with rgba
        let result = gradient.replace(
          /#([0-9a-fA-F]{6})\b/g,
          (match) => {
            const hex = match.replace('#', '');
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
          }
        );
        
        // Replace rgb() with rgba()
        result = result.replace(
          /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g,
          (_, r, g, b) => `rgba(${r}, ${g}, ${b}, ${alpha})`
        );
        
        // Handle existing rgba() - multiply the alpha
        result = result.replace(
          /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/g,
          (_, r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${parseFloat(a) * alpha})`
        );
        
        return result;
      };

      // Helper: Convert color to rgba with opacity
      const colorToRgba = (color: string, opacity: number): string => {
        if (opacity >= 100) return color;
        const alpha = opacity / 100;
        
        if (color.startsWith('#')) {
          const hex = color.replace('#', '');
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        if (color.startsWith('rgb(')) {
          const match = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
          if (match) {
            return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
          }
        }
        if (color.startsWith('rgba(')) {
          const match = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
          if (match) {
            return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${parseFloat(match[4]) * alpha})`;
          }
        }
        if (color.startsWith('hsl(')) {
          return color.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
        }
        if (color.startsWith('hsla(')) {
          return color.replace(/,\s*([\d.]+)\s*\)$/, `, ${alpha})`);
        }
        return color;
      };

      for (const layerType of effectiveLayerOrder) {
        if (layerType === 'image' && isValidBgLayer(effectiveBgImage)) {
          const imageUrl = getBgLayerValue(effectiveBgImage);
          const imageOpacity = getBgLayerOpacity(effectiveBgImage);
          
          if (imageOpacity < 100) {
            // For images, use transparent overlay
            const overlayColor = `rgba(255,255,255,${1 - imageOpacity / 100})`;
            backgroundLayers.push(`linear-gradient(${overlayColor}, ${overlayColor}), url(${imageUrl})`);
            backgroundSizes.push(`cover, ${effectiveBackgroundSize}`);
            backgroundPositions.push(`center, ${effectiveBackgroundPosition}`);
            backgroundRepeats.push(`no-repeat, ${effectiveBackgroundRepeat}`);
          } else {
            backgroundLayers.push(`url(${imageUrl})`);
            backgroundSizes.push(effectiveBackgroundSize);
            backgroundPositions.push(effectiveBackgroundPosition);
            backgroundRepeats.push(effectiveBackgroundRepeat);
          }
        } else if (layerType === 'gradient' && isValidBgLayer(effectiveBgGradient)) {
          const gradientValue = getBgLayerValue(effectiveBgGradient);
          const gradientOpacity = getBgLayerOpacity(effectiveBgGradient);
          
          // Apply TRUE transparency to gradient color stops
          const transparentGradient = applyOpacityToGradient(gradientValue, gradientOpacity);
          backgroundLayers.push(transparentGradient);
          backgroundSizes.push('cover');
          backgroundPositions.push('center');
          backgroundRepeats.push('no-repeat');
        } else if (layerType === 'fill' && effectiveBgColor && !isDeletedValue(effectiveBgColor)) {
          // Handle fill layer in the layer order for proper stacking
          const colorValue = getColorValue(effectiveBgColor);
          const fillOpacity = getBgLayerOpacity(effectiveBgColor);
          if (colorValue) {
            const transparentColor = colorToRgba(colorValue, fillOpacity);
            backgroundLayers.push(`linear-gradient(${transparentColor}, ${transparentColor})`);
            backgroundSizes.push('cover');
            backgroundPositions.push('center');
            backgroundRepeats.push('no-repeat');
          }
        }
      }

      const styles: React.CSSProperties = {};

      // If we have image/gradient layers, combine them with per-layer settings
      if (backgroundLayers.length > 0) {
        styles.background = backgroundLayers.join(', ');
        styles.backgroundSize = backgroundSizes.join(', ');
        styles.backgroundPosition = backgroundPositions.join(', ');
        styles.backgroundRepeat = backgroundRepeats.join(', ');
      }

      // Only set backgroundColor if fill wasn't already handled in the layer loop
      const fillHandledInLoop = effectiveLayerOrder.includes('fill');
      if (!fillHandledInLoop && effectiveBgColor && !isDeletedValue(effectiveBgColor)) {
        const colorValue = getColorValue(effectiveBgColor);
        if (colorValue) styles.backgroundColor = colorValue;
      }

      return styles;
    };

    const getEffectiveBackgroundStyles = (): React.CSSProperties => {
      // Layered values can come from either inline props OR the applied class.
      const inlineBgImage = (props as any).backgroundImage;
      const inlineBgGradient = (props as any).backgroundGradient;

      const effectiveBgImage = isImageLocked
        ? inlineBgImage
        : (isValidBgLayer(inlineBgImage) ? inlineBgImage : classBackgroundImage);

      const effectiveBgGradient = isGradientLocked
        ? inlineBgGradient
        : (isValidBgLayer(inlineBgGradient) ? inlineBgGradient : classBackgroundGradient);

      const hasBgImage = isValidBgLayer(effectiveBgImage);
      const hasBgGradient = isValidBgLayer(effectiveBgGradient);

      if (hasBgImage || hasBgGradient) {
        return getLayeredBackgroundStyles();
      }

      // Fall back to simple background handling
      if (isBackgroundLocked) return getBackgroundStyle((props as any).backgroundColor);
      if (classBackground && !isDeletedValue(classBackground)) return { background: classBackground };
      if (classBackgroundColor && !isDeletedValue(classBackgroundColor)) return { backgroundColor: classBackgroundColor };

      // IMPORTANT: For AI-generated components, ALWAYS respect inline backgroundColor
      // even if classes are attached (AI sets proper backgrounds that should render)
      const isAIGenerated = (props as any)._aiGenerated === true;
      
      // If classes are attached (new or legacy), don't fall back to potentially stale inline values.
      const hasAnyClasses =
        (Array.isArray(component.classNames) && component.classNames.length > 0) ||
        (Array.isArray((props as any).appliedClasses) && (props as any).appliedClasses.length > 0);
      
      // Allow AI-generated components to use their inline backgroundColor
      if (hasAnyClasses && !isAIGenerated) return {};

      return getBackgroundStyle((props as any).backgroundColor);
    };

    switch (component.type) {
      case 'section':
      case 'container':

        // Container-specific styles (border is handled by getNewBorderStyles in commonProps.style)
        // Background is handled by getEffectiveBackgroundStyles which now supports layered backgrounds
        // Resolve DS-linked defaults for container/card (bg, shadow, radius)
        const containerDSStyles = resolveAllDSStyles(component.type, props, activeTokens);
        const containerStyles = {
          ...containerDSStyles,
          ...getEffectiveBackgroundStyles(),
          borderRadius: (() => {
            const br = props.borderRadius;
            if (!br) return resolveDefaultBorderRadius(component.type, activeTokens);
            const tl = Number(br.topLeft) || 0;
            const tr = Number(br.topRight) || 0;
            const bl = Number(br.bottomLeft) || 0;
            const bR = Number(br.bottomRight) || 0;
            const isLocked = props.__lockedProps?.borderRadius === true;
            if (tl === 0 && tr === 0 && bl === 0 && bR === 0 && !isLocked) {
              return resolveDefaultBorderRadius(component.type, activeTokens);
            }
            const unit = br.unit || 'px';
            return `${tl}${unit} ${tr}${unit} ${bR}${unit} ${bl}${unit}`;
          })(),
          // backgroundImage is now handled by getEffectiveBackgroundStyles for proper layering
          // Transform properties - use new layered transforms if available, otherwise fall back to legacy
          transform: props.transforms ? undefined : (() => {
            const parts = [
              props.translateX ? `translateX(${props.translateX}px)` : '',
              props.translateY ? `translateY(${props.translateY}px)` : '',
              props.rotate ? `rotate(${props.rotate}deg)` : '',
              props.rotateX ? `rotateX(${props.rotateX}deg)` : '',
              props.rotateY ? `rotateY(${props.rotateY}deg)` : '',
              props.rotateZ ? `rotateZ(${props.rotateZ}deg)` : '',
              props.scale && props.scale !== 100 ? `scale(${props.scale / 100})` : '',
              props.skewX ? `skewX(${props.skewX}deg)` : '',
              props.skewY ? `skewY(${props.skewY}deg)` : ''
            ].filter(Boolean);
            return parts.length > 0 ? parts.join(' ') : undefined;
          })(),
          // Position properties
          // In the builder canvas, "fixed" positioning escapes the canvas and appears "behind" it.
          // Clamp fixed → absolute in design mode for true WYSIWYG inside the canvas.
          // CRITICAL: Sections default to 'relative' for proper stacking context isolation
          position:
            !isPreview && props.position === 'fixed'
              ? 'absolute'
              : (props.position || (component.type === 'section' ? 'relative' : 'static')),
          // CRITICAL: Sections default to overflow:hidden to prevent content bleeding between sections
          overflow: props.overflow || (component.type === 'section' ? 'hidden' : undefined),
          top: props.top?.value && props.top.value !== 'auto' ? `${props.top.value}${props.top.unit}` : undefined,
          left: props.left?.value && props.left.value !== 'auto' ? `${props.left.value}${props.left.unit}` : undefined,
          right: props.right?.value && props.right.value !== 'auto' ? `${props.right.value}${props.right.unit}` : undefined,
          bottom: props.bottom?.value && props.bottom.value !== 'auto' ? `${props.bottom.value}${props.bottom.unit}` : undefined,
          zIndex: props.zIndex && props.zIndex !== 'auto' ? props.zIndex : undefined,
          // Filter - use new layered filters if available, then direct filter, then legacy blurAmount
          filter: (props.filters && props.filters.length > 0) ? undefined : (
            props.filter || (props.blurAmount ? `blur(${props.blurAmount}px)` : undefined)
          ),
          perspective: props.perspective && props.perspective !== 0 ? `${props.perspective}px` : undefined,
          // Box shadow - use new layered boxShadows if available, otherwise fall back to legacy
          boxShadow: (props.boxShadows && props.boxShadows.length > 0) ? undefined : (() => {
            if (props.shadowX !== undefined || props.shadowY !== undefined || props.shadowBlur !== undefined) {
              const x = props.shadowX || 0;
              const y = props.shadowY || 0;
              const blur = props.shadowBlur || 0;
              const spread = props.shadowSpread || 0;
              const color = props.shadowColor || 'rgba(0,0,0,0.1)';
              return `${x}px ${y}px ${blur}px ${spread}px ${color}`;
            }
            return undefined;
          })(),
        };


        const shadowClasses = {
          sm: 'shadow-sm',
          md: 'shadow-md', 
          lg: 'shadow-lg',
          xl: 'shadow-xl'
        };

        // Only apply preset shadow classes if custom shadow isn't defined
        const hasCustomShadow = props.shadowX !== undefined || props.shadowY !== undefined || props.shadowBlur !== undefined;

        // Use section or div based on component type
        const ContainerElement = component.type === 'section' ? 'section' : 'div';

        // Extract layout styles to apply to the inner drop zone (where children live)
        // BREAKPOINT-AWARE: Use appliedClassStyles (which is now breakpoint-resolved) as the source of truth
        // Only fall back to props for non-class scenarios or locked overrides
        const lockedProps = (props as any).__lockedProps || {};
        const hasClassesWithStyles = (
          (Array.isArray(component.classNames) && component.classNames.length > 0) ||
          (Array.isArray(props.appliedClasses) && props.appliedClasses.length > 0)
        );
        
        // Helper: Get layout value from resolved class styles, falling back to props only if locked or no classes
        const getLayoutValue = <T,>(key: string, propsValue: T): T | undefined => {
          if (lockedProps[key] === true) return propsValue; // Locked = use props
          if (hasClassesWithStyles) {
            // Class-first: use resolved class value (already breakpoint-aware)
            return (appliedClassStyles as any)[key] ?? undefined;
          }
          return propsValue; // No classes = use props
        };
        
        const innerLayoutStyles: React.CSSProperties = {
          display: getLayoutValue('display', props.display) || undefined,
          flexDirection: getLayoutValue('flexDirection', props.flexDirection) as React.CSSProperties['flexDirection'],
          justifyContent: getLayoutValue('justifyContent', props.justifyContent) as React.CSSProperties['justifyContent'],
          alignItems: getLayoutValue('alignItems', props.alignItems) as React.CSSProperties['alignItems'],
          gap: getLayoutValue('gap', props.gap),
          gridTemplateColumns: getLayoutValue('gridTemplateColumns', props.gridTemplateColumns),
          gridTemplateRows: getLayoutValue('gridTemplateRows', props.gridTemplateRows),
          gridAutoFlow: getLayoutValue('gridAutoFlow', props.gridAutoFlow) as React.CSSProperties['gridAutoFlow'],
          // CRITICAL: Ensure inner dropzone fills parent width for grid/flex layouts
          width: '100%',
        };

        // Outer container styles - everything except flex/grid layout
        const outerStyles = { ...commonProps.style };
        // Remove layout properties from outer - they go to inner dropzone
        delete outerStyles.display;
        delete outerStyles.flexDirection;
        delete outerStyles.justifyContent;
        delete outerStyles.alignItems;
        delete outerStyles.gap;
        delete outerStyles.gridTemplateColumns;
        delete outerStyles.gridTemplateRows;
        delete outerStyles.gridAutoFlow;

        // Background is handled by getEffectiveBackgroundStyles() so we strip any background-like
        // styles coming from commonProps/appliedClassStyles to avoid conflicts.
        delete (outerStyles as any).background;
        delete (outerStyles as any).backgroundColor;
        delete (outerStyles as any).backgroundImage;
        delete (outerStyles as any).backgroundGradient;
        delete (outerStyles as any).backgroundLayerOrder;

        // Check if this is a dynamic section (connected to database for repeating)
        // Accept tableId, tableProjectId OR tableName for dynamic detection
        const conn = props.databaseConnection;
        const hasValidConnection = !!(conn?.tableId || conn?.tableProjectId || conn?.tableName);
        const isDynamicSection = props.isDynamic === true && hasValidConnection;

        // If this is a dynamic section, use the DynamicSection component
        if (isDynamicSection) {
          return (
            <DynamicSection
              component={component}
              isPreview={isPreview}
              parentId={parentId}
              index={index}
              commonProps={{
                ...commonProps,
                className: cn(
                  commonProps.className,
                  !hasCustomShadow && props.boxShadow && props.boxShadow !== 'none' && shadowClasses[props.boxShadow as keyof typeof shadowClasses]
                )
              }}
              containerStyles={containerStyles}
              innerLayoutStyles={innerLayoutStyles}
              getAcceptedTypes={getAcceptedTypes}
              renderDragHandle={() => (
                <ComponentDragHandle
                  componentId={component.id}
                  component={component}
                  parentId={parentId}
                  index={index}
                  isSelected={isSelected}
                />
              )}
              getEffectsStyles={getEffectsStyles}
              getNewBorderStyles={getNewBorderStyles}
            />
          );
        }

        return (
          <ContainerElement
            {...commonProps} 
            style={{ 
              ...outerStyles, // Contains spacing, dimensions, effects, and base styles (without layout)
              ...containerStyles,   // Container-specific styles (background, transform, shadow - legacy fallback)
              ...getEffectsStyles(props), // New layered effects override legacy
              ...getNewBorderStyles(props), // Border styles applied last to take priority
            }}
            className={cn(
              commonProps.className,
              !hasCustomShadow && props.boxShadow && props.boxShadow !== 'none' && shadowClasses[props.boxShadow as keyof typeof shadowClasses]
            )}
            data-component-id={component.id}
          >
            {/* Add drag handle for non-preview mode */}
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            
            {/* Generate rows based on rows property */}
            {props.rows > 1 ? (
              <div className="space-y-4">
                {Array.from({ length: props.rows || 1 }).map((_, rowIndex) => (
                  <EnhancedDropZone
                    key={rowIndex}
                    id={`drop-${component.id}-row-${rowIndex}`}
                    accepts={getAcceptedTypes(component.type)}
                    parentId={component.id}
                    index={component.children?.length || 0}
                    style={innerLayoutStyles}
                    className={cn(
                      // Minimal styling for drop zones - no visible borders
                      !isPreview && !component.children?.filter((_, idx) => Math.floor(idx / Math.ceil(component.children!.length / (props.rows || 1))) === rowIndex).length
                        ? 'min-h-[100px]'
                        : 'min-h-[60px]'
                    )}
                  >
                    {Array.isArray(component.children) ? component.children
                      .filter((_, idx) => Math.floor(idx / Math.ceil(component.children!.length / (props.rows || 1))) === rowIndex)
                      .map((child, idx) => (
                        <ComponentRenderer
                          key={child.id}
                          component={withInheritedDataContext(child)}
                          isPreview={isPreview}
                          parentId={component.id}
                          index={idx}
                        />
                      )) : (
                        <>
                          {(() => {
                            console.log('Invalid children for component:', component.id, 'children:', component.children);
                            return null;
                          })()}
                          <div className="text-sm text-red-500 p-2">
                            Error: Invalid children data type: {typeof component.children}
                          </div>
                        </>
                      )}
                    {/* Empty drop zone - no text placeholder */}
                  </EnhancedDropZone>
                ))}
              </div>
            ) : (
              <EnhancedDropZone
                id={`drop-${component.id}`}
                accepts={getAcceptedTypes(component.type)}
                parentId={component.id}
                index={component.children?.length || 0}
                style={innerLayoutStyles}
                className={cn(
                  // Minimal styling for drop zones - no visible borders
                  !isPreview && !component.children?.length 
                    ? 'min-h-[100px]'
                    : 'min-h-[60px]'
                )}
              >
                {Array.isArray(component.children) ? component.children.map((child, idx) => (
                  <ComponentRenderer
                    key={child.id}
                    component={withInheritedDataContext(child)}
                    isPreview={isPreview}
                    parentId={component.id}
                    index={idx}
                  />
                )) : component.children ? (
                  <>
                    {(() => {
                      console.log('Invalid children for component:', component.id, 'children:', component.children);
                      return null;
                    })()}
                    <div className="text-sm text-red-500 p-2">
                      Error: Invalid children data type: {typeof component.children}
                    </div>
                  </>
                ) : null}
                {/* Empty drop zone - no text placeholder */}
              </EnhancedDropZone>
            )}
          </ContainerElement>
        );


      case 'row':
        // Only apply default flex if display is not explicitly set to something else
        const rowDisplay = props.display || 'flex';
        const isRowFlex = rowDisplay === 'flex' || rowDisplay === 'inline-flex';
        const isRowGrid = rowDisplay === 'grid' || rowDisplay === 'inline-grid';
        
        const rowClasses = cn(
          'min-h-[60px]',
          // Only apply default flex classes if display is flex AND not using inline styles
          !props.display && 'flex flex-row',
          // Legacy gap classes - only if gap is not a pixel value
          !props.gap?.includes('px') && props.gap === 'none' && 'gap-0',
          !props.gap?.includes('px') && props.gap === 'sm' && 'gap-2',
          !props.gap?.includes('px') && props.gap === 'md' && 'gap-4',
          !props.gap?.includes('px') && props.gap === 'lg' && 'gap-6',
          !props.gap?.includes('px') && props.gap === 'xl' && 'gap-8',
          // Legacy alignment classes - only if not using flex/grid properties from LayoutControl
          !props.alignItems && props.alignment === 'start' && 'items-start',
          !props.alignItems && props.alignment === 'center' && 'items-center',
          !props.alignItems && props.alignment === 'end' && 'items-end',
          !props.alignItems && props.alignment === 'stretch' && 'items-stretch',
          !props.justifyContent && props.justification === 'start' && 'justify-start',
          !props.justifyContent && props.justification === 'center' && 'justify-center',
          !props.justifyContent && props.justification === 'end' && 'justify-end',
          !props.justifyContent && props.justification === 'between' && 'justify-between',
          !props.justifyContent && props.justification === 'around' && 'justify-around',
          !props.justifyContent && props.justification === 'evenly' && 'justify-evenly'
        );
        
        return (
          <div {...commonProps}>
            {/* Add drag handle for non-preview mode */}
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            <EnhancedDropZone
              id={`drop-${component.id}`}
              accepts={getAcceptedTypes(component.type)}
              parentId={component.id}
              index={component.children?.length || 0}
              orientation="horizontal"
              style={getLayoutStyles(props)}
              className={rowClasses}
            >
              {Array.isArray(component.children) ? component.children.map((child, idx) => (
                <ComponentRenderer
                  key={child.id}
                  component={withInheritedDataContext(child)}
                  isPreview={isPreview}
                  parentId={component.id}
                  index={idx}
                />
              )) : component.children ? (
                <>
                  {(() => {
                    console.log('Invalid children for row component:', component.id, 'children:', component.children);
                    return null;
                  })()}
                  <div className="text-sm text-red-500 p-2">
                    Error: Invalid children data type: {typeof component.children}
                  </div>
                </>
              ) : null}
              {!component.children?.length && !isPreview && (
                <div className="text-center text-muted-foreground text-sm py-8 flex-1">
                  Drop components into this row
                </div>
              )}
            </EnhancedDropZone>
          </div>
        );

      case 'column':
        // Only apply default flex if display is not explicitly set to something else
        const colDisplay = props.display || 'flex';
        
        const colClasses = cn(
          'min-h-[60px]',
          // Only apply default flex classes if display is not set
          !props.display && 'flex flex-col',
          // Legacy gap classes - only if gap is not a pixel value
          !props.gap?.includes('px') && props.gap === 'none' && 'gap-0',
          !props.gap?.includes('px') && props.gap === 'sm' && 'gap-2',
          !props.gap?.includes('px') && props.gap === 'md' && 'gap-4',
          !props.gap?.includes('px') && props.gap === 'lg' && 'gap-6',
          !props.gap?.includes('px') && props.gap === 'xl' && 'gap-8',
          // Legacy alignment classes - only if not using flex/grid properties from LayoutControl
          !props.alignItems && props.alignment === 'start' && 'items-start',
          !props.alignItems && props.alignment === 'center' && 'items-center',
          !props.alignItems && props.alignment === 'end' && 'items-end',
          !props.alignItems && props.alignment === 'stretch' && 'items-stretch',
          !props.justifyContent && props.justification === 'start' && 'justify-start',
          !props.justifyContent && props.justification === 'center' && 'justify-center',
          !props.justifyContent && props.justification === 'end' && 'justify-end',
          !props.justifyContent && props.justification === 'between' && 'justify-between',
          !props.justifyContent && props.justification === 'around' && 'justify-around',
          !props.justifyContent && props.justification === 'evenly' && 'justify-evenly'
        );
        
        return (
          <div {...commonProps}>
            {/* Add drag handle for non-preview mode */}
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            <EnhancedDropZone
               id={`drop-${component.id}`}
               accepts={getAcceptedTypes(component.type)}
               parentId={component.id}
               index={component.children?.length || 0}
               orientation="vertical"
               style={getLayoutStyles(props)}
               className={colClasses}
             >
              {Array.isArray(component.children) ? component.children.map((child, idx) => (
                <ComponentRenderer
                  key={child.id}
                  component={withInheritedDataContext(child)}
                  isPreview={isPreview}
                  parentId={component.id}
                  index={idx}
                />
              )) : component.children ? (
                <>
                  {(() => {
                    console.log('Invalid children for column component:', component.id, 'children:', component.children);
                    return null;
                  })()}
                  <div className="text-sm text-red-500 p-2">
                    Error: Invalid children data type: {typeof component.children}
                  </div>
                </>
              ) : null}
              {!component.children?.length && !isPreview && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  Drop components into this column
                </div>
              )}
            </EnhancedDropZone>
          </div>
        );

      case 'grid':
        const gridClasses = cn(
          'grid min-h-[60px]',
          props.gridCols === 1 && 'grid-cols-1',
          props.gridCols === 2 && 'grid-cols-2',
          props.gridCols === 3 && 'grid-cols-3',
          props.gridCols === 4 && 'grid-cols-4',
          props.gridCols === 6 && 'grid-cols-6',
          props.gridCols === 12 && 'grid-cols-12',
          props.gridGap === 'none' && 'gap-0',
          props.gridGap === 'sm' && 'gap-2',
          props.gridGap === 'md' && 'gap-4',
          props.gridGap === 'lg' && 'gap-6',
          props.gridGap === 'xl' && 'gap-8'
        );
        
        return (
          <div {...commonProps}>
            {/* Add drag handle for non-preview mode */}
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            <EnhancedDropZone
               id={`drop-${component.id}`}
               accepts={getAcceptedTypes(component.type)}
               parentId={component.id}
               index={component.children?.length || 0}
               style={getLayoutStyles(props)}
               className={gridClasses}
             >
              {Array.isArray(component.children) ? component.children.map((child, idx) => (
                <ComponentRenderer
                  key={child.id}
                  component={withInheritedDataContext(child)}
                  isPreview={isPreview}
                  parentId={component.id}
                  index={idx}
                />
              )) : component.children ? (
                <>
                  {(() => {
                    console.log('Invalid children for grid component:', component.id, 'children:', component.children);
                    return null;
                  })()}
                  <div className="text-sm text-red-500 p-2">
                    Error: Invalid children data type: {typeof component.children}
                  </div>
                </>
              ) : null}
              {!component.children?.length && !isPreview && (
                <div className="text-center text-muted-foreground text-sm py-8 col-span-full">
                  Drop components here
                </div>
              )}
            </EnhancedDropZone>
          </div>
        );

      case 'text':
        const TextTag = (props.tag || 'p') as any;
        const isInDynamicList = !!(props._parentConnection && props._parentConnection.tableName);
        const availableFields = (() => {
          if (!isInDynamicList) return [];

          const raw = props._parentConnection?.fields ?? props._parentConnection?.schema;
          const fieldsArray = Array.isArray(raw)
            ? raw
            : (Array.isArray((raw as any)?.fields) ? (raw as any).fields : []);

          return fieldsArray.map((field: any) => ({
            id: field.id || field.name || 'unknown',
            name: field.name || field.id || 'unknown',
            type: field.type || 'text',
            description: field.description,
          }));
        })();
        
        console.log('Text component availableFields:', availableFields, 'parent connection:', props._parentConnection);

        const handleFieldBinding = (binding: string) => {
          updateComponent(component.id, {
            props: {
              ...component.props,
              content: binding || component.props.content || 'Sample text'
            }
          });
        };

        // Note: class styles are resolved via useResolvedCSSStyles().
        // For text components we avoid re-applying typography props here, otherwise
        // the component-level typography can override shared class styles and appear “out of sync”.
        // IMPORTANT: "own" typography must be read from the RAW component props (NOT merged defaults),
        // otherwise defaults like fontWeight=400 will incorrectly block parent inheritance.
        const ownProps = (component.props || {}) as any;
        const typography = ownProps.typography || {};
        const lockedPropsText = ownProps.__lockedProps || {};
        const appliedClassesText: string[] = Array.isArray(ownProps.appliedClasses) ? ownProps.appliedClasses : [];
        const hasClassesText = appliedClassesText.length > 0;

        // Helper: treat typography as "explicit" ONLY when it is locked on this component.
        // This prevents stored defaults (black/left/400) from blocking parent inheritance.
        const getExplicitTypographyValue = (key: string, ownValue: any, _classValue: any) => {
          if (lockedPropsText[key] === true || lockedPropsText.typography?.[key] === true) {
            return ownValue;
          }
          return undefined;
        };

        const ownColor = (typography.color ?? ownProps.color);

        // Get inherited styles from parent elements (Page Body, Section, etc.)
        const textInheritedStyles = ownProps._inheritedStyles || (props as any)._inheritedStyles || {};

        // IMPORTANT: class-derived typography should come ONLY from applied classes,
        // not from resolved styles that may include defaults.
        const classStyles = hasClassesText
          ? extractInheritableStyles({}, appliedClassesText, classes, component.id).styles
          : {};

        // Resolve effective font weight for both Tailwind class and inline style
        // Use explicit check: only pass own value if locked or class-defined
        const effectiveFontWeight = resolveTypographyProp(
          getExplicitTypographyValue('fontWeight', typography.fontWeight ?? ownProps.fontWeight, classStyles.fontWeight),
          classStyles.fontWeight,
          textInheritedStyles.fontWeight
        );

        // Resolve effective text alignment
        const effectiveTextAlign = resolveTypographyProp(
          getExplicitTypographyValue('textAlign', typography.textAlign ?? ownProps.textAlign, classStyles.textAlign),
          classStyles.textAlign,
          textInheritedStyles.textAlign
        );

        return (
          <>
            <TextTag 
              {...commonProps}
              className={cn(
                // Position relative for drag handle positioning
                'relative',
                // Avoid default browser margins on p/span/div
                'm-0',
                // Font weight classes - use resolved value
                effectiveFontWeight === 'light' || effectiveFontWeight === '300' ? 'font-light' : undefined,
                effectiveFontWeight === 'normal' || effectiveFontWeight === '400' ? 'font-normal' : undefined,
                effectiveFontWeight === 'medium' || effectiveFontWeight === '500' ? 'font-medium' : undefined,
                effectiveFontWeight === 'semibold' || effectiveFontWeight === '600' ? 'font-semibold' : undefined,
                effectiveFontWeight === 'bold' || effectiveFontWeight === '700' ? 'font-bold' : undefined,
                // Text alignment - use resolved value
                effectiveTextAlign === 'left' && 'text-left',
                effectiveTextAlign === 'center' && 'text-center',
                effectiveTextAlign === 'right' && 'text-right',
                effectiveTextAlign === 'justify' && 'text-justify',
                // Font style - with inheritance
                resolveTypographyProp(
                  getExplicitTypographyValue('fontStyle', typography.fontStyle ?? ownProps.fontStyle, classStyles.fontStyle),
                  classStyles.fontStyle,
                  textInheritedStyles.fontStyle
                ) === 'italic' && 'italic',
                // Text decoration - with inheritance
                resolveTypographyProp(
                  getExplicitTypographyValue('textDecoration', typography.textDecoration ?? ownProps.textDecoration, classStyles.textDecoration),
                  classStyles.textDecoration,
                  textInheritedStyles.textDecoration
                ) === 'underline' && 'underline',
                resolveTypographyProp(
                  getExplicitTypographyValue('textDecoration', typography.textDecoration ?? ownProps.textDecoration, classStyles.textDecoration),
                  classStyles.textDecoration,
                  textInheritedStyles.textDecoration
                ) === 'line-through' && 'line-through',
                // Keep all standard component classes (selection, drag, applied classes, etc.)
                commonProps.className
              )}
              style={{ 
                ...(commonProps.style as React.CSSProperties),
                // CRITICAL: Overflow protection to prevent text bleeding outside containers
                overflow: 'hidden',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                // Apply typography properties with PROPER inheritance priority:
                // Priority: own typography > class styles > INHERITED from parent > DESIGN TOKEN DEFAULT
                fontFamily: resolveFontFamilyWithToken(
                  getExplicitTypographyValue('fontFamily', typography.fontFamily ?? ownProps.fontFamily, classStyles.fontFamily),
                  resolveDefaultFontFamily('text', activeTokens, TextTag),
                  classStyles.fontFamily,
                  textInheritedStyles.fontFamily,
                ),
                fontSize: resolveTypographyProp(
                  getExplicitTypographyValue('fontSize', typography.fontSize ?? ownProps.fontSize, classStyles.fontSize),
                  classStyles.fontSize,
                  textInheritedStyles.fontSize,
                  resolveDefaultFontSize(activeTokens),
                  true // format as px if numeric
                ),
                lineHeight: resolveTypographyProp(
                  getExplicitTypographyValue('lineHeight', typography.lineHeight ?? ownProps.lineHeight, classStyles.lineHeight),
                  classStyles.lineHeight,
                  textInheritedStyles.lineHeight
                ),
                letterSpacing: resolveTypographyProp(
                  getExplicitTypographyValue('letterSpacing', typography.letterSpacing, classStyles.letterSpacing),
                  classStyles.letterSpacing,
                  textInheritedStyles.letterSpacing,
                  undefined,
                  true
                ),
                textTransform: resolveTypographyProp(
                  getExplicitTypographyValue('textTransform', typography.textTransform ?? ownProps.textTransform, classStyles.textTransform),
                  classStyles.textTransform,
                  textInheritedStyles.textTransform
                ),
                fontWeight: effectiveFontWeight,
                textAlign: effectiveTextAlign,
                // Color resolution with proper inheritance
                // Final fallback: DS token for 'foreground' color
                color: resolveTypographyProp(
                  getExplicitTypographyValue('color', getColorValue(ownColor), classStyles.color || classStyles.textColor),
                  classStyles.color || classStyles.textColor || classStyles.typography?.color,
                  textInheritedStyles.color,
                  (() => {
                    const dsRefs = ownProps._dsTokenRefs;
                    if (dsRefs?.color) {
                      const token = activeTokens.get(dsRefs.color);
                      if (token?.value) return token.value;
                    }
                    return undefined;
                  })()
                ),
              }}
              onDoubleClick={handleDoubleClick}
            >
              {/* Add drag handle for non-preview mode */}
              {!isPreview && (
                <ComponentDragHandle
                  componentId={component.id}
                  component={component}
                  parentId={parentId}
                  index={index}
                  isSelected={isSelected}
                  className="absolute -top-2 -left-2 z-10"
                />
              )}
              
              {/* Field binding button for text components in dynamic lists */}
              {!isPreview && isInDynamicList && isSelected && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute -top-2 -right-2 z-10 h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTextFieldBindingDialog(true);
                  }}
                  title="Bind to database field"
                >
                  <Link2 className="h-3 w-3" />
                </Button>
              )}

              {isEditing && !isPreview ? (
                <span
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const newValue = e.currentTarget.textContent || '';
                    setEditValue(newValue);
                    const updates = { text: newValue, content: newValue };
                    updateComponent(component.id, { props: { ...props, ...updates } });
                    setIsEditing(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      const newValue = e.currentTarget.textContent || '';
                      setEditValue(newValue);
                      const updates = { text: newValue, content: newValue };
                      updateComponent(component.id, { props: { ...props, ...updates } });
                      setIsEditing(false);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setIsEditing(false);
                      setEditValue(props.children || props.text || '');
                    }
                  }}
                  className="outline-none focus:ring-2 focus:ring-primary/50 rounded px-0.5 min-w-[1ch]"
                  style={{ display: 'inline-block' }}
                  ref={(el) => el && el.focus()}
                  dangerouslySetInnerHTML={{
                    __html: coerceToText(editValue || props.content || props.text || 'Sample text', 'Sample text'),
                  }}
                />
              ) : (
                <span
                  dangerouslySetInnerHTML={{
                    __html: (() => {
                      // Resolve bindings in preview mode.
                      let textContent = props.content || props.text || 'Sample text';

                      if (isPreview && typeof textContent === 'string') {
                        const ctx = (props._dataContext as Record<string, any> | undefined) ?? (boundData?.[0] as any);
                        if (ctx) {
                          textContent = replaceBindingsUtil(textContent, ctx);
                        }
                      }

                      return coerceToText(textContent, '');
                    })(),
                  }}
                />
              )}
            </TextTag>

            {/* Enhanced Field Binding Dialog */}
            {showTextFieldBindingDialog && (
              <EnhancedFieldBindingDialog
                open={showTextFieldBindingDialog}
                onOpenChange={setShowTextFieldBindingDialog}
                onSelectField={handleFieldBinding}
                fields={availableFields}
                currentBinding={props.content}
                tableName={props._parentConnection?.tableName}
                componentType="text"
              />
            )}
          </>
        );

      case 'heading':
        const HeadingTag = (`h${props.level || 1}`) as any;
        const isInDynamicListHeading = !!(props._parentConnection && props._parentConnection.tableName);
        const availableFieldsHeading = (() => {
          if (!isInDynamicListHeading) return [];

          const raw = props._parentConnection?.fields ?? props._parentConnection?.schema;
          const fieldsArray = Array.isArray(raw)
            ? raw
            : (Array.isArray((raw as any)?.fields) ? (raw as any).fields : []);

          return fieldsArray.map((field: any) => ({
            id: field.id || field.name || 'unknown',
            name: field.name || field.id || 'unknown',
            type: field.type || 'text',
            description: field.description,
          }));
        })();
        
        console.log('Heading component availableFieldsHeading:', availableFieldsHeading, 'parent connection:', props._parentConnection);

        const handleFieldBindingHeading = (binding: string) => {
          updateComponent(component.id, {
            props: {
              ...component.props,
              content: binding || component.props.content || 'Sample Heading'
            }
          });
        };

        // Get typography props for heading (same pattern as text element)
        // IMPORTANT: "own" typography must be read from the RAW component props (NOT merged defaults),
        // otherwise defaults like fontWeight=600/700 will incorrectly block parent inheritance.
        const headingOwnProps = (component.props || {}) as any;
        const headingTypography = headingOwnProps.typography || {};
        const headingLockedProps = headingOwnProps.__lockedProps || {};
        const headingAppliedClasses: string[] = Array.isArray(headingOwnProps.appliedClasses) ? headingOwnProps.appliedClasses : [];
        const headingHasClasses = headingAppliedClasses.length > 0;

        // Fallback typography defaults for headings when nothing else provides a value.
        // This ensures freshly-dragged headings render at the correct size even before
        // the user applies a preset or class.
        const headingTypographyDefaults: Record<string, any> = (() => {
          const level = props.level || headingOwnProps.level || 1;
          const map: Record<number, Record<string, string>> = {
            1: { fontSize: '36', fontWeight: '700', lineHeight: '1.2' },
            2: { fontSize: '30', fontWeight: '600', lineHeight: '1.2' },
            3: { fontSize: '24', fontWeight: '600', lineHeight: '1.3' },
            4: { fontSize: '20', fontWeight: '600', lineHeight: '1.3' },
            5: { fontSize: '18', fontWeight: '600', lineHeight: '1.4' },
            6: { fontSize: '16', fontWeight: '600', lineHeight: '1.4' },
          };
          return map[level] || map[1];
        })();

        // Helper: treat typography as "explicit" ONLY when it is locked on this component.
        // This prevents stored defaults (black/left/600) from blocking parent inheritance.
        const getExplicitHeadingTypographyValue = (key: string, ownValue: any, _classValue: any) => {
          if (headingLockedProps[key] === true || headingLockedProps.typography?.[key] === true) {
            return ownValue;
          }
          return undefined;
        };

        const headingOwnColor = (headingTypography.color ?? headingOwnProps.color);

        // Get inherited styles from parent elements (Page Body, Section, etc.)
        const headingInheritedStyles = headingOwnProps._inheritedStyles || (props as any)._inheritedStyles || {};

        // IMPORTANT: class-derived typography should come ONLY from applied classes
        const headingClassStyles = headingHasClasses
          ? extractInheritableStyles({}, headingAppliedClasses, classes, component.id).styles
          : {};

        // Resolve effective font weight for both Tailwind class and inline style
        const headingEffectiveFontWeight = resolveTypographyProp(
          getExplicitHeadingTypographyValue('fontWeight', headingTypography.fontWeight ?? headingOwnProps.fontWeight, headingClassStyles.fontWeight),
          headingClassStyles.fontWeight,
          headingInheritedStyles.fontWeight,
          headingTypographyDefaults.fontWeight
        );

        // Resolve effective text alignment
        const headingEffectiveTextAlign = resolveTypographyProp(
          getExplicitHeadingTypographyValue('textAlign', headingTypography.textAlign ?? headingOwnProps.textAlign, headingClassStyles.textAlign),
          headingClassStyles.textAlign,
          headingInheritedStyles.textAlign
        );

        return (
          <>
            <HeadingTag 
              {...commonProps}
              className={cn(
                // Position relative for drag handle positioning
                'relative',
                // Avoid default browser margins on heading tags
                'm-0',
                // Font weight classes - use resolved value
                headingEffectiveFontWeight === 'light' || headingEffectiveFontWeight === '300' ? 'font-light' : undefined,
                headingEffectiveFontWeight === 'normal' || headingEffectiveFontWeight === '400' ? 'font-normal' : undefined,
                headingEffectiveFontWeight === 'medium' || headingEffectiveFontWeight === '500' ? 'font-medium' : undefined,
                headingEffectiveFontWeight === 'semibold' || headingEffectiveFontWeight === '600' ? 'font-semibold' : undefined,
                headingEffectiveFontWeight === 'bold' || headingEffectiveFontWeight === '700' ? 'font-bold' : undefined,
                // Text alignment - use resolved value
                headingEffectiveTextAlign === 'left' && 'text-left',
                headingEffectiveTextAlign === 'center' && 'text-center',
                headingEffectiveTextAlign === 'right' && 'text-right',
                headingEffectiveTextAlign === 'justify' && 'text-justify',
                // Font style - with inheritance
                resolveTypographyProp(
                  getExplicitHeadingTypographyValue('fontStyle', headingTypography.fontStyle ?? headingOwnProps.fontStyle, headingClassStyles.fontStyle),
                  headingClassStyles.fontStyle,
                  headingInheritedStyles.fontStyle
                ) === 'italic' && 'italic',
                // Text decoration - with inheritance
                resolveTypographyProp(
                  getExplicitHeadingTypographyValue('textDecoration', headingTypography.textDecoration ?? headingOwnProps.textDecoration, headingClassStyles.textDecoration),
                  headingClassStyles.textDecoration,
                  headingInheritedStyles.textDecoration
                ) === 'underline' && 'underline',
                resolveTypographyProp(
                  getExplicitHeadingTypographyValue('textDecoration', headingTypography.textDecoration ?? headingOwnProps.textDecoration, headingClassStyles.textDecoration),
                  headingClassStyles.textDecoration,
                  headingInheritedStyles.textDecoration
                ) === 'line-through' && 'line-through',
                // Keep all standard component classes (selection, drag, applied classes, etc.)
                commonProps.className
              )}
              style={{ 
                ...(commonProps.style as React.CSSProperties),
                // CRITICAL: Overflow protection to prevent heading bleeding outside containers
                overflow: 'hidden',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                // Apply typography properties with PROPER inheritance priority:
                // Priority: own typography > class styles > INHERITED from parent > DESIGN TOKEN DEFAULT
                fontFamily: resolveFontFamilyWithToken(
                  getExplicitHeadingTypographyValue('fontFamily', headingTypography.fontFamily ?? headingOwnProps.fontFamily, headingClassStyles.fontFamily),
                  resolveDefaultFontFamily('heading', activeTokens),
                  headingClassStyles.fontFamily,
                  headingInheritedStyles.fontFamily,
                ),
                fontSize: resolveTypographyProp(
                  getExplicitHeadingTypographyValue('fontSize', headingTypography.fontSize ?? headingOwnProps.fontSize, headingClassStyles.fontSize),
                  headingClassStyles.fontSize,
                  headingInheritedStyles.fontSize,
                  headingTypographyDefaults.fontSize,
                  true // format as px if numeric
                ),
                lineHeight: resolveTypographyProp(
                  getExplicitHeadingTypographyValue('lineHeight', headingTypography.lineHeight ?? headingOwnProps.lineHeight, headingClassStyles.lineHeight),
                  headingClassStyles.lineHeight,
                  headingInheritedStyles.lineHeight,
                  headingTypographyDefaults.lineHeight
                ),
                letterSpacing: resolveTypographyProp(
                  getExplicitHeadingTypographyValue('letterSpacing', headingTypography.letterSpacing, headingClassStyles.letterSpacing),
                  headingClassStyles.letterSpacing,
                  headingInheritedStyles.letterSpacing,
                  undefined,
                  true
                ),
                textTransform: resolveTypographyProp(
                  getExplicitHeadingTypographyValue('textTransform', headingTypography.textTransform ?? headingOwnProps.textTransform, headingClassStyles.textTransform),
                  headingClassStyles.textTransform,
                  headingInheritedStyles.textTransform
                ),
                fontWeight: headingEffectiveFontWeight,
                textAlign: headingEffectiveTextAlign,
                // Color resolution with proper inheritance
                // Final fallback: DS token for 'foreground' color
                color: resolveTypographyProp(
                  getExplicitHeadingTypographyValue('color', getColorValue(headingOwnColor), headingClassStyles.color || headingClassStyles.textColor),
                  headingClassStyles.color || headingClassStyles.textColor || headingClassStyles.typography?.color,
                  headingInheritedStyles.color,
                  (() => {
                    const dsRefs = headingOwnProps._dsTokenRefs;
                    if (dsRefs?.color) {
                      const token = activeTokens.get(dsRefs.color);
                      if (token?.value) return token.value;
                    }
                    return undefined;
                  })()
                ),
              }}
              onDoubleClick={handleDoubleClick}
            >
              {/* Add drag handle for non-preview mode */}
              {!isPreview && (
                <ComponentDragHandle
                  componentId={component.id}
                  component={component}
                  parentId={parentId}
                  index={index}
                  isSelected={isSelected}
                  className="absolute -top-2 -left-2 z-10"
                />
              )}
              
              {/* Field binding button for heading components in dynamic lists */}
              {!isPreview && isInDynamicListHeading && isSelected && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute -top-2 -right-2 z-10 h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHeadingFieldBindingDialog(true);
                  }}
                  title="Bind to database field"
                >
                  <Link2 className="h-3 w-3" />
                </Button>
              )}

              {isEditing && !isPreview ? (
                <span
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const newValue = e.currentTarget.textContent || '';
                    setEditValue(newValue);
                    const updates = { children: newValue, content: newValue };
                    updateComponent(component.id, { props: { ...props, ...updates } });
                    setIsEditing(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      const newValue = e.currentTarget.textContent || '';
                      setEditValue(newValue);
                      const updates = { children: newValue, content: newValue };
                      updateComponent(component.id, { props: { ...props, ...updates } });
                      setIsEditing(false);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setIsEditing(false);
                      setEditValue(props.children || props.content || '');
                    }
                  }}
                  className="outline-none focus:ring-2 focus:ring-primary/50 rounded px-0.5 min-w-[1ch]"
                  style={{ display: 'inline-block' }}
                  ref={(el) => el && el.focus()}
                  dangerouslySetInnerHTML={{ __html: editValue || props.children || props.content || 'Sample Heading' }}
                />
              ) : (
                (() => {
                  // Resolve bindings in preview mode.
                  let headingContent = props.content || props.children || 'Sample Heading';

                  if (isPreview && typeof headingContent === 'string') {
                    const ctx = (props._dataContext as Record<string, any> | undefined) ?? (boundData?.[0] as any);
                    if (ctx) {
                      headingContent = replaceBindingsUtil(headingContent, ctx);
                    }
                  }

                  // Ensure we never try to render a raw object as a React child.
                  if (
                    typeof headingContent === 'string' ||
                    typeof headingContent === 'number' ||
                    React.isValidElement(headingContent)
                  ) {
                    return headingContent;
                  }

                  return coerceToText(headingContent, '');
                })()
              )}
            </HeadingTag>

            {/* Enhanced Field Binding Dialog for Heading */}
            {showHeadingFieldBindingDialog && isInDynamicListHeading && (
              <EnhancedFieldBindingDialog
                open={showHeadingFieldBindingDialog}
                onOpenChange={setShowHeadingFieldBindingDialog}
                onSelectField={handleFieldBindingHeading}
                fields={availableFieldsHeading}
                currentBinding={props.content}
                tableName={props._parentConnection?.tableName}
                componentType="heading"
              />
            )}
          </>
        );

      case 'icon':
        // Try Iconsax first, then fallback to Lucide
        const IconsaxComponent = props.iconName && (Iconsax as any)[props.iconName];
        const LucideIconComponent = props.iconName && (LucideIcons as any)[props.iconName];
        const IconComponent = IconsaxComponent || LucideIconComponent;
        
        const iconSizeMap: Record<string, number> = {
          xs: 12,
          sm: 16, 
          md: 24,
          lg: 32,
          xl: 48
        };
        
        // Get typography for icon (size comes from fontSize, color from color)
        const iconTypography = props.typography || {};
        const iconSize = iconTypography.fontSize 
          ? parseInt(iconTypography.fontSize, 10) 
          : (props.iconSize || iconSizeMap[props.size as keyof typeof iconSizeMap] || 24);
        const iconColor = getColorValue(iconTypography.color) || getColorValue(props.color) || 'currentColor';
        
        return (
          <div 
            {...commonProps}
            className={cn(
              'm-0',
              commonProps.className
            )}
            style={{ 
              ...(commonProps.style as React.CSSProperties),
              // Default to fit-content if no width set
              width: getDimensionStyles(props).width || 'fit-content',
            }}
          >
            {IconComponent ? (
              <IconComponent 
                size={iconSize}
                variant={props.iconVariant || 'Bold'}
                color={iconColor}
                className="transition-colors"
              />
            ) : (
              <Iconsax.Home2 
                size={iconSize}
                variant={props.iconVariant || 'Bold'}
                color={iconColor}
              />
            )}
          </div>
        );

      case 'button':
        // Compute button-specific inline styles from props
        const borderWidthVal = props.borderWidth?.value && props.borderWidth.value !== '0'
          ? `${props.borderWidth.value}${props.borderWidth.unit || 'px'}`
          : undefined;
        const borderRadiusVal = (() => {
          const br = props.borderRadius;
          if (!br) return undefined;
          const tl = Number(br.topLeft) || 0;
          const tr = Number(br.topRight) || 0;
          const bl = Number(br.bottomLeft) || 0;
          const bR = Number(br.bottomRight) || 0;
          // If all corners are 0 and user hasn't explicitly locked borderRadius, 
          // treat as "no value" so the design token can apply
          const isLockedRadius = props.__lockedProps?.borderRadius === true;
          if (tl === 0 && tr === 0 && bl === 0 && bR === 0 && !isLockedRadius) return undefined;
          const unit = br.unit || 'px';
          return `${tl}${unit} ${tr}${unit} ${bR}${unit} ${bl}${unit}`;
        })();
        const borderFromNewBtn = (() => {
          const b = props.border as any;
          if (!b) return {} as React.CSSProperties;
          const unit = b.unit || 'px';
          const width = b.width ? `${b.width}${unit}` : undefined;
          const style = b.style as string | undefined;
          
          // Resolve border color - handle TokenRefValue objects
          let color: string | undefined;
          if (b.color) {
            if (typeof b.color === 'object' && 'tokenRef' in b.color) {
              // It's a token reference - resolve using activeTokens
              const token = activeTokens.get(b.color.tokenRef);
              color = token?.value || b.color.value || '';
            } else if (typeof b.color === 'string') {
              color = b.color;
            }
          }
          
          const sides = b.sides || { top: true, right: true, bottom: true, left: true };
          const out: any = {};
          if (style === 'none') {
            out.borderStyle = 'none';
            out.borderWidth = '0';
          } else if (width) {
            out.borderStyle = style || 'solid';
            // For buttons we use uniform borders; if sides selected, apply per side
            out.borderTopWidth = sides.top ? width : '0';
            out.borderRightWidth = sides.right ? width : '0';
            out.borderBottomWidth = sides.bottom ? width : '0';
            out.borderLeftWidth = sides.left ? width : '0';
          }
          if (color) out.borderColor = color;
          return out as React.CSSProperties;
        })();
        // Only apply custom background if explicitly set (non-empty AND not 'transparent')
        // Our button defaults can include backgroundColor: 'transparent' from the property panel,
        // but the desired default in the canvas is the variant styling (blue bg, white text).
        // FIXED: Also check for gradients, images, and class-based backgrounds
        const hasAnyEffectiveBackground = (() => {
          const isTransparentString = (v: string) => {
            const s = v.trim().toLowerCase();
            return s === '' || s === 'transparent' || s === 'none' || s === 'rgba(0,0,0,0)' || s === 'rgb(0 0 0 / 0)';
          };

          const checkValue = (val: any): boolean => {
            if (!val) return false;
            if (typeof val === 'string') return !isTransparentString(val);
            if (typeof val === 'object' && (val as any).value) {
              const v = String((val as any).value);
              return !isTransparentString(v);
            }
            return false;
          };

          // Check inline props
          if (checkValue(props.backgroundColor)) return true;
          if (isValidBgLayer((props as any).backgroundGradient)) return true;
          if (isValidBgLayer((props as any).backgroundImage)) return true;

          // Check class-based backgrounds
          if (classBackgroundColor && !isDeletedValue(classBackgroundColor) && !isTransparentString(classBackgroundColor)) return true;
          if (classBackgroundGradient && !isDeletedValue(classBackgroundGradient)) return true;
          if (classBackgroundImage && !isDeletedValue(classBackgroundImage)) return true;
          if (classBackground && !isDeletedValue(classBackground) && !isTransparentString(classBackground)) return true;

          return false;
        })();
        const buttonBgStyles = hasAnyEffectiveBackground ? getEffectiveBackgroundStyles() : {};
        
        // Resolve DS-linked defaults for button (bg, color, padding, radius)
        const buttonDSStyles = resolveAllDSStyles(component.type, props, activeTokens);
        
        // Default border radius for buttons - resolve from design token, fallback to 0px
        const defaultBorderRadius = resolveDefaultBorderRadius('button', activeTokens) || buttonDSStyles.borderRadius || '0px';
        
        // Resolve text color: prioritize textColor, then color (from AI), then DS default
        const resolvedTextColor = props.textColor || (props as any).color;
        
        // DS-driven background: only apply if no explicit background was set
        const dsButtonBg = !hasAnyEffectiveBackground && buttonDSStyles.backgroundColor
          ? { backgroundColor: buttonDSStyles.backgroundColor } : {};
        // DS-driven text color: only apply if no explicit text color
        const dsButtonColor = !resolvedTextColor && buttonDSStyles.color
          ? { color: buttonDSStyles.color } : {};
        // DS-driven padding
        const dsButtonPadding: React.CSSProperties = {};
        if (!props.paddingLeft && buttonDSStyles.paddingLeft) dsButtonPadding.paddingLeft = buttonDSStyles.paddingLeft;
        if (!props.paddingRight && buttonDSStyles.paddingRight) dsButtonPadding.paddingRight = buttonDSStyles.paddingRight;
        
        const buttonStyles = {
          // DS defaults applied first (lowest priority)
          ...dsButtonBg,
          ...dsButtonColor,
          ...dsButtonPadding,
          // When user has any effective background, neutralize the variant's bg class
          // via inline style (which naturally beats class-based styles without !important)
          ...(hasAnyEffectiveBackground ? { backgroundColor: 'transparent' } : {}),
          // Explicit overrides (buttonBgStyles will re-set backgroundColor if it's a solid color)
          ...buttonBgStyles,
          ...(resolvedTextColor && { color: getColorValue(resolvedTextColor) }),
          ...(props.borderColor && { borderColor: getColorValue(props.borderColor) }),
          ...(borderWidthVal && { borderWidth: borderWidthVal }),
          ...(borderWidthVal && { borderStyle: props.borderStyle || 'solid' }),
          borderRadius: borderRadiusVal || defaultBorderRadius,
          ...borderFromNewBtn,
          // Ensure content stays centered regardless of external layout styles
          justifyContent: 'center',
          alignItems: 'center',
        } as React.CSSProperties;
        
        // Import brand icons for social login buttons - complete set
        const brandIconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
          'google': (iconProps) => (
            <svg className={iconProps.className} viewBox="0 0 24 24" width={iconProps.size || 18} height={iconProps.size || 18}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          ),
          'apple': (iconProps) => (
            <svg className={iconProps.className} viewBox="0 0 24 24" width={iconProps.size || 18} height={iconProps.size || 18} fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
          ),
          'github': (iconProps) => (
            <svg className={iconProps.className} viewBox="0 0 24 24" width={iconProps.size || 18} height={iconProps.size || 18} fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          ),
          'microsoft': (iconProps) => (
            <svg className={iconProps.className} viewBox="0 0 24 24" width={iconProps.size || 18} height={iconProps.size || 18}>
              <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
              <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
              <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
              <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
            </svg>
          ),
          'facebook': (iconProps) => (
            <svg className={iconProps.className} viewBox="0 0 24 24" width={iconProps.size || 18} height={iconProps.size || 18} fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          ),
          'twitter': (iconProps) => (
            <svg className={iconProps.className} viewBox="0 0 24 24" width={iconProps.size || 18} height={iconProps.size || 18} fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          ),
          'x': (iconProps) => (
            <svg className={iconProps.className} viewBox="0 0 24 24" width={iconProps.size || 18} height={iconProps.size || 18} fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          ),
          'linkedin': (iconProps) => (
            <svg className={iconProps.className} viewBox="0 0 24 24" width={iconProps.size || 18} height={iconProps.size || 18} fill="#0A66C2">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          ),
          'instagram': (iconProps) => (
            <svg className={iconProps.className} viewBox="0 0 24 24" width={iconProps.size || 18} height={iconProps.size || 18} fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
          ),
          'youtube': (iconProps) => (
            <svg className={iconProps.className} viewBox="0 0 24 24" width={iconProps.size || 18} height={iconProps.size || 18} fill="#FF0000">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          ),
          'dribbble': (iconProps) => (
            <svg className={iconProps.className} viewBox="0 0 24 24" width={iconProps.size || 18} height={iconProps.size || 18} fill="#EA4C89">
              <path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.814zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-1.81-1.61-4.19-2.586-6.795-2.586-.825 0-1.63.1-2.4.285zm10.335 3.483c-.218.29-1.935 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z"/>
            </svg>
          ),
          'behance': (iconProps) => (
            <svg className={iconProps.className} viewBox="0 0 24 24" width={iconProps.size || 18} height={iconProps.size || 18} fill="#1769FF">
              <path d="M6.938 4.503c.702 0 1.34.06 1.92.188.577.13 1.07.33 1.485.61.41.28.733.65.96 1.12.225.47.34 1.05.34 1.73 0 .74-.17 1.36-.507 1.86-.338.5-.837.9-1.502 1.22.906.26 1.576.72 2.022 1.37.448.66.665 1.45.665 2.36 0 .75-.13 1.39-.41 1.93-.28.55-.67 1-1.16 1.35-.48.348-1.05.6-1.67.767-.61.165-1.252.254-1.91.254H0V4.51h6.938v-.007zM6.545 9.66c.55 0 1.03-.13 1.43-.41.392-.28.59-.74.59-1.36 0-.36-.06-.65-.188-.89-.13-.24-.3-.43-.514-.57-.21-.14-.46-.24-.74-.3-.28-.06-.57-.08-.86-.08H2.97v3.61h3.575zm.194 5.81c.34 0 .65-.04.95-.12.3-.08.56-.2.785-.38.22-.18.395-.41.523-.7.13-.29.19-.64.19-1.06 0-.82-.22-1.42-.66-1.81-.44-.39-1.02-.58-1.74-.58H2.97v4.65h3.77zM15.89 6.14h5.29v1.48h-5.29V6.14zm5.02 3.85c.56 0 1.06.1 1.5.3.44.2.81.48 1.11.83.3.35.53.78.68 1.27.15.49.23 1.02.23 1.58v.65h-5.67c.02.69.23 1.22.62 1.6.39.37.89.56 1.49.56.46 0 .85-.12 1.17-.35.32-.24.55-.52.68-.84h1.68c-.1.38-.26.74-.47 1.08-.21.33-.47.63-.79.88-.32.25-.7.45-1.12.59-.43.14-.9.21-1.42.21-.67 0-1.27-.12-1.8-.36-.53-.24-1-.58-1.38-1.01-.38-.44-.68-.96-.89-1.57-.21-.61-.32-1.28-.32-2 0-.7.1-1.35.31-1.96.21-.6.51-1.13.9-1.58.39-.44.86-.79 1.41-1.04.55-.25 1.17-.38 1.86-.38l.02-.02zm1.96 3.3c-.04-.6-.23-1.1-.57-1.47-.34-.38-.84-.57-1.49-.57-.39 0-.72.07-1 .2-.27.14-.5.31-.68.53-.18.22-.32.47-.42.75-.1.28-.16.56-.18.85h4.34v-.29z"/>
            </svg>
          ),
          'discord': (iconProps) => (
            <svg className={iconProps.className} viewBox="0 0 24 24" width={iconProps.size || 18} height={iconProps.size || 18} fill="#5865F2">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          ),
        };
        
        // Check for brand icon (for social login buttons like Google, Apple)
        const BrandIconComponent = props.brandIcon && brandIconMap[props.brandIcon.toLowerCase()];
        
        const ButtonIcon = props.icon && LucideIcons[props.icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>;
        const iconPosition = props.iconPosition || 'left';
        
        // Apply width on the wrapper to ensure percentages stretch properly
        const widthStyle = (commonProps.style as any)?.width;
        const hasCustomWidth = !!widthStyle && widthStyle !== 'auto';
        const wrapperDisplayClass = hasCustomWidth || props.fullWidth ? 'block' : 'inline-block';
        
        // Check if user has explicitly set dimension properties
        const hasCustomHeight = props.height && 
          !(typeof props.height === 'object' && (props.height.value === 'auto' || props.height.unit === 'auto'));
        const hasCustomMinHeight = props.minHeight && 
          !(typeof props.minHeight === 'object' && props.minHeight.value === '0');
        const hasCustomMaxHeight = props.maxHeight && 
          !(typeof props.maxHeight === 'object' && (props.maxHeight.value === 'none' || props.maxHeight.unit === 'auto'));
        
        // Check if AI provided custom padding that should control height
        const hasCustomPadding = props.spacingControl?.padding && (
          (props.spacingControl.padding.top > 0) || 
          (props.spacingControl.padding.bottom > 0)
        );
        
        // If AI provided padding, we need to override the fixed height from size variants
        const shouldOverrideHeight = hasCustomHeight || hasCustomPadding;
        
        // Get dimension styles only if user has set them
        const buttonDimensionStyles = getDimensionStyles(props);
        const customDimensionStyles: React.CSSProperties = {};
        if (hasCustomHeight && buttonDimensionStyles.height) {
          customDimensionStyles.height = buttonDimensionStyles.height;
        }
        if (hasCustomMinHeight && buttonDimensionStyles.minHeight) {
          customDimensionStyles.minHeight = buttonDimensionStyles.minHeight;
        }
        if (hasCustomMaxHeight && buttonDimensionStyles.maxHeight) {
          customDimensionStyles.maxHeight = buttonDimensionStyles.maxHeight;
        }
        if (hasCustomWidth) {
          customDimensionStyles.width = widthStyle;
        }
        
        // Build padding styles from spacingControl if provided
        const paddingStyles: React.CSSProperties = hasCustomPadding ? {
          paddingTop: `${props.spacingControl.padding.top}px`,
          paddingBottom: `${props.spacingControl.padding.bottom}px`,
          paddingLeft: `${props.spacingControl.padding.left}px`,
          paddingRight: `${props.spacingControl.padding.right}px`,
        } : {};
        
        // Exclude background and color-related properties so the variant's styling isn't overridden
        // Also exclude height-related props - we'll add them back selectively via customDimensionStyles
        // Exclude flexDirection to prevent icon-above-text layout issues in buttons
        const { 
          height, minHeight, maxHeight, width,
          background, backgroundColor, backgroundImage, backgroundSize, backgroundPosition, backgroundRepeat,
          color: _ignoredColor, // Don't override text color from variant
          flexDirection: _ignoredFlexDir, // Don't override button's internal inline-flex layout
          // Strip ALL border-radius properties so buttonStyles.borderRadius (from design token) isn't overridden
          // by individual corner longhand properties from class styles
          borderRadius: _ignoredBR,
          borderTopLeftRadius: _ignoredBRTL,
          borderTopRightRadius: _ignoredBRTR,
          borderBottomLeftRadius: _ignoredBRBL,
          borderBottomRightRadius: _ignoredBRBR,
          ...buttonWrapperStyles 
        } = commonProps.style as any;
        
        return (
          <div 
            className={cn(wrapperDisplayClass, props.fullWidth && 'w-full', 'relative', ...componentStyle.classes)}
            style={{
              ...componentStyle.inlineStyles,
              // Prevent column direction inheritance from parent containers (CTA sections)
              display: props.fullWidth ? 'flex' : 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row', // FORCE row to prevent icon/text stacking issues
            } as React.CSSProperties}
            onClick={!isPreview ? handleClick : undefined}
            onContextMenu={!isPreview ? handleContextMenu : undefined}
            data-component-id={component.id}
          >
            {/* Add drag handle for non-preview mode */}
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            <Button 
              variant={props.variant || 'default'}
              size={props.size || 'sm'}
              disabled={props.disabled || false}
              className={cn(
                'relative transition-all duration-200',
                !isPreview && 'cursor-pointer',
                'justify-center items-center',
                (props.fullWidth || hasCustomWidth) && 'w-full',
                ButtonIcon && 'gap-2',
                // Override size class height if custom height OR custom padding is set
                shouldOverrideHeight && '!h-auto',
                // Strip variant background classes when user has set custom backgrounds (fill, gradient, image)
                // No longer use !bg-transparent here – it applies background-color:transparent !important
                // which overrides the inline backgroundColor set via buttonStyles.
                // Instead, the variant's bg class is neutralized via inline style below.
                // Strip variant shadow classes when user has set custom box shadows via Effects panel
                (props.boxShadows?.length > 0 || buttonWrapperStyles.boxShadow) && '!shadow-none'
              )}
              style={{ ...buttonWrapperStyles, ...buttonStyles, ...customDimensionStyles, ...paddingStyles }}
              onClick={isPreview ? (e) => handleComponentAction('onClick', e) : (e) => { e.stopPropagation(); handleClick(e); }}
            >
              {BrandIconComponent && iconPosition === 'left' && <BrandIconComponent className="flex-shrink-0" size={18} />}
              {!BrandIconComponent && ButtonIcon && iconPosition === 'left' && <ButtonIcon className="h-4 w-4 flex-shrink-0" />}
              {(() => {
                // Use nullish coalescing to allow empty strings
                const buttonText = props.content ?? props.text;
                const hasIcon = BrandIconComponent || ButtonIcon;
                
                // If text is explicitly empty string (icon-only button), show nothing
                if (buttonText === '') return null;
                
                // If has text content, show it
                if (buttonText) return buttonText;
                
                // If has icon but no text, show nothing (icon-only button)
                if (hasIcon) return null;
                
                // Fallback for design mode only (no icon, no text)
                return !isPreview ? 'Button' : '';
              })()}
              {BrandIconComponent && iconPosition === 'right' && <BrandIconComponent className="flex-shrink-0" size={18} />}
              {!BrandIconComponent && ButtonIcon && iconPosition === 'right' && <ButtonIcon className="h-4 w-4 flex-shrink-0" />}
            </Button>
          </div>
        );

      case 'input':
        return (
          <div 
            {...commonProps} 
            style={{ 
              ...commonProps.style,
              ...getDimensionStyles(props),
              ...getLayoutStyles(props)
            }}
            className={cn(commonProps.className, 'w-full max-w-sm space-y-2')}
          >
            {/* Add drag handle for non-preview mode */}
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            {props.label && (
              <Label>
                {props.label}
                {props.required && <span className="text-destructive ml-1">*</span>}
              </Label>
            )}
            <Input
              placeholder={props.placeholder || 'Enter text...'}
              type={props.inputType || 'text'}
              defaultValue={props.defaultValue || ''}
              required={props.required || false}
              disabled={props.disabled || false}
              className="w-full"
              style={{
                ...resolveAllDSStyles(component.type, props, activeTokens),
                height: resolveDefaultInputHeight(activeTokens),
                paddingLeft: resolveDefaultInputPadding(activeTokens),
                paddingRight: resolveDefaultInputPadding(activeTokens),
                borderRadius: resolveDefaultBorderRadius('input', activeTokens),
              }}
            />
          </div>
        );

      case 'textarea':
        return (
          <div 
            {...commonProps} 
            style={{ 
              ...commonProps.style,
              ...getDimensionStyles(props),
              ...getLayoutStyles(props)
            }}
            className={cn(commonProps.className, 'w-full max-w-sm space-y-2')}
          >
            {/* Add drag handle for non-preview mode */}
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            {props.label && (
              <Label>
                {props.label}
                {props.required && <span className="text-destructive ml-1">*</span>}
              </Label>
            )}
            <Textarea
              placeholder={props.placeholder || 'Enter text...'}
              rows={props.rows || 3}
              defaultValue={props.defaultValue || ''}
              required={props.required || false}
              disabled={props.disabled || false}
              className="w-full"
              style={{
                paddingLeft: resolveDefaultInputPadding(activeTokens),
                paddingRight: resolveDefaultInputPadding(activeTokens),
                borderRadius: resolveDefaultBorderRadius('textarea', activeTokens),
              }}
            />
          </div>
        );

      case 'checkbox':
        return (
          <div {...commonProps} className={cn(commonProps.className, 'inline-flex items-center space-x-2')}>
            {/* Add drag handle for non-preview mode */}
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            <Checkbox 
              checked={props.checked || false}
              disabled={props.disabled || false}
            />
            <Label>
              {props.label || 'Checkbox'}
              {props.required && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
        );

      case 'radio':
        const rawRadioOptions = typeof props.options === 'string' 
          ? props.options.split('\n').filter(Boolean) 
          : (props.options || ['Option 1', 'Option 2', 'Option 3']);

        // Normalize options to handle both string arrays and {label, value} objects
        const radioOptions = rawRadioOptions.map((opt: any) => {
          if (typeof opt === 'string') return { label: opt, value: opt };
          if (opt && typeof opt === 'object' && 'label' in opt && 'value' in opt) {
            return { label: String(opt.label), value: String(opt.value) };
          }
          return { label: String(opt), value: String(opt) };
        });

        const radioDefaultValue =
          props.defaultValue && typeof props.defaultValue === 'object' && 'value' in props.defaultValue
            ? String((props.defaultValue as any).value)
            : props.defaultValue;
        
        return (
          <div {...commonProps} className={cn(commonProps.className, 'inline-block')}>
            {/* Add drag handle for non-preview mode */}
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            <RadioGroup 
              disabled={props.disabled || false}
              defaultValue={radioDefaultValue}
              className={props.orientation === 'horizontal' ? 'flex flex-row space-x-4 space-y-0' : ''}
            >
              {radioOptions.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} />
                  <Label>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'select':
        // Normalize options to handle both string arrays and {label, value} objects
        const rawSelectOptions = typeof props.options === 'string' 
          ? props.options.split('\n').filter(Boolean) 
          : (props.options || ['Option 1', 'Option 2', 'Option 3']);
        
        // Convert to normalized format: always {label, value}
        const selectOptions = rawSelectOptions.map((opt: any) => {
          if (typeof opt === 'string') {
            return { label: opt, value: opt };
          }
          if (opt && typeof opt === 'object' && 'label' in opt && 'value' in opt) {
            return { label: String(opt.label), value: String(opt.value) };
          }
          // Fallback for unexpected formats
          return { label: String(opt), value: String(opt) };
        });
        
        return (
          <div 
            {...commonProps} 
            style={{ 
              ...commonProps.style,
              ...getDimensionStyles(props),
              ...getLayoutStyles(props)
            }}
            className={cn(commonProps.className, 'w-full max-w-sm space-y-2')}
          >
            {/* Add drag handle for non-preview mode */}
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            {props.label && (
              <Label>
                {props.label}
                {props.required && <span className="text-destructive ml-1">*</span>}
              </Label>
            )}
            <Select 
              disabled={props.disabled || false}
              defaultValue={props.defaultValue}
              required={props.required || false}
            >
              <SelectTrigger className="w-full" style={{
                height: resolveDefaultInputHeight(activeTokens),
                paddingLeft: resolveDefaultInputPadding(activeTokens),
                paddingRight: resolveDefaultInputPadding(activeTokens),
                borderRadius: resolveDefaultBorderRadius('select', activeTokens),
              }}>
                <SelectValue placeholder={props.placeholder || 'Select an option'} />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                {selectOptions.map((option, index) => (
                  <SelectItem key={index} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'switch':
        return (
          <div {...commonProps} className={cn(commonProps.className, 'inline-flex items-center space-x-2')}>
            <Switch 
              checked={props.checked || false}
              disabled={props.disabled || false}
              className={cn(
                props.size === 'sm' && 'scale-75',
                props.size === 'lg' && 'scale-125'
              )}
            />
            <Label>{props.label || 'Switch'}</Label>
          </div>
        );

      case 'theme-toggle':
        return (
          <div {...commonProps}>
            <AppThemeToggle
              style={props.style || 'button'}
              size={props.size || 'md'}
              showLabels={props.showLabels !== false}
              orientation={props.orientation || 'horizontal'}
              lightLabel={props.lightLabel || 'Light'}
              darkLabel={props.darkLabel || 'Dark'}
              systemLabel={props.systemLabel || 'Auto'}
            />
          </div>
        );

      case 'slider':
        return (
          <div {...commonProps} className={cn(commonProps.className, 'w-full max-w-sm space-y-2')}>
            <Slider
              value={[props.defaultValue || props.value || 50]}
              max={props.max || 100}
              min={props.min || 0}
              step={props.step || 1}
              disabled={props.disabled || false}
            />
            {props.showValue !== false && (
              <div className="text-sm text-center text-muted-foreground">
                {props.defaultValue || props.value || 50}
              </div>
            )}
          </div>
        );

      case 'image':
        const imageStyle: Record<string, any> = { objectFit: props.objectFit || 'cover' };
        
        // Apply width - handle both string ("220px") and object ({value, unit}) formats
        if (props.width) {
          if (typeof props.width === 'string') {
            // String format from AI generation: "100%", "220px", etc.
            imageStyle.width = props.width;
          } else if (props.width.unit !== 'auto') {
            // Object format from property panel: {value: 220, unit: 'px'}
            imageStyle.width = props.width.unit === 'px' ? `${props.width.value}px` : 
                              props.width.unit === '%' ? `${props.width.value}%` :
                              props.width.unit === 'rem' ? `${props.width.value}rem` : 
                              props.width.unit === 'em' ? `${props.width.value}em` : 
                              props.width.unit === 'vw' ? `${props.width.value}vw` : 
                              props.width.value;
          }
        }
        
        // Apply height - handle both string ("220px") and object ({value, unit}) formats
        if (props.height) {
          if (typeof props.height === 'string') {
            // String format from AI generation: "200px", "50%", etc.
            imageStyle.height = props.height;
          } else if (props.height.unit !== 'auto') {
            // Object format from property panel: {value: 200, unit: 'px'}
            imageStyle.height = props.height.unit === 'px' ? `${props.height.value}px` : 
                               props.height.unit === '%' ? `${props.height.value}%` :
                               props.height.unit === 'rem' ? `${props.height.value}rem` : 
                               props.height.unit === 'em' ? `${props.height.value}em` : 
                               props.height.unit === 'vh' ? `${props.height.value}vh` : 
                               props.height.value;
          }
        }
        
        // Apply border radius
        if (props.borderRadius) {
          imageStyle.borderRadius = `${props.borderRadius.topLeft || 0}${props.borderRadius.unit} ${props.borderRadius.topRight || 0}${props.borderRadius.unit} ${props.borderRadius.bottomRight || 0}${props.borderRadius.unit} ${props.borderRadius.bottomLeft || 0}${props.borderRadius.unit}`;
        }
        
        // Generate Unsplash fallback URL from imagePrompt or alt text when src is missing/empty
        const getUnsplashFallbackUrl = (prompt: string, width = 800, height = 600): string => {
          const fallbackImages: Record<string, string> = {
            business: 'photo-1497366216548-37526070297c',
            tech: 'photo-1518770660439-4636190af475',
            nature: 'photo-1506744038136-46273834b3fb',
            people: 'photo-1522202176988-66273c2fd55f',
            food: 'photo-1504674900247-0877df9cc836',
            architecture: 'photo-1487958449943-2429e8be8625',
            product: 'photo-1505740420928-5e560c06d30e',
            abstract: 'photo-1557672172-298e090bd0f1',
          };
          const p = prompt.toLowerCase();
          let photoId = fallbackImages.abstract;
          for (const [cat, id] of Object.entries(fallbackImages)) {
            if (p.includes(cat) || p.includes(cat.slice(0, 4))) { photoId = id; break; }
          }
          return `https://images.unsplash.com/${photoId}?w=${width}&h=${height}&fit=crop`;
        };
        
        // Determine the image source - use Unsplash fallback if src is empty but we have a prompt/alt
        let imageSrc = props.src;
        if (!imageSrc || imageSrc === '' || imageSrc === '/placeholder.svg') {
          const promptText = props.imagePrompt || props.alt;
          if (promptText && promptText.length > 2) {
            // Parse dimensions from style for better image sizing
            const imgWidth = typeof imageStyle.width === 'string' ? parseInt(imageStyle.width) || 800 : 800;
            const imgHeight = typeof imageStyle.height === 'string' ? parseInt(imageStyle.height) || 600 : 600;
            imageSrc = getUnsplashFallbackUrl(promptText, imgWidth, imgHeight);
          } else {
            imageSrc = '/placeholder.svg';
          }
        }
        
        return (
          <div {...commonProps} className={cn(commonProps.className, 'inline-block')} data-nav-role={props['data-nav-role'] || props._navRole || undefined}>
            <img
              src={imageSrc}
              alt={props.alt || 'Image'}
              style={imageStyle}
              loading={props.lazy !== false ? 'lazy' : 'eager'}
              className={cn(
                "max-w-full",
                // Handle both string ("220px") and object ({value, unit}) formats for auto detection
                (!props.width || (typeof props.width === 'object' && props.width.unit === 'auto')) && "h-auto",
                (!props.height || (typeof props.height === 'object' && props.height.unit === 'auto')) && "w-auto"
              )}
            />
          </div>
        );

      case 'video':
        const videoStyle: Record<string, any> = {};
        
        // Apply width - handle both string "100%" and object {value, unit} formats
        if (props.width) {
          if (typeof props.width === 'string') {
            videoStyle.width = props.width;
          } else if (props.width.unit !== 'auto') {
            videoStyle.width = props.width.unit === 'px' ? `${props.width.value}px` : 
                              props.width.unit === '%' ? `${props.width.value}%` :
                              props.width.unit === 'rem' ? `${props.width.value}rem` : 
                              props.width.unit === 'em' ? `${props.width.value}em` : 
                              props.width.unit === 'vw' ? `${props.width.value}vw` : 
                              props.width.value;
          }
        }
        
        // Apply height - handle both string "300px" and object {value, unit} formats
        if (props.height) {
          if (typeof props.height === 'string') {
            videoStyle.height = props.height;
          } else if (props.height.unit !== 'auto') {
            videoStyle.height = props.height.unit === 'px' ? `${props.height.value}px` : 
                               props.height.unit === '%' ? `${props.height.value}%` :
                               props.height.unit === 'rem' ? `${props.height.value}rem` : 
                               props.height.unit === 'em' ? `${props.height.value}em` : 
                               props.height.unit === 'vh' ? `${props.height.value}vh` : 
                               props.height.value;
          }
        }
        
        // Apply border radius
        if (props.borderRadius) {
          videoStyle.borderRadius = `${props.borderRadius.topLeft || 0}${props.borderRadius.unit} ${props.borderRadius.topRight || 0}${props.borderRadius.unit} ${props.borderRadius.bottomRight || 0}${props.borderRadius.unit} ${props.borderRadius.bottomLeft || 0}${props.borderRadius.unit}`;
        }
        
        return (
          <div {...commonProps} className={cn(commonProps.className, 'inline-block')}>
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            <video
              src={props.src || ''}
              poster={props.poster || ''}
              style={videoStyle}
              controls={props.controls !== false}
              autoPlay={props.autoplay === true}
              loop={props.loop === true}
              muted={props.muted === true}
              className={cn(
                "max-w-full bg-muted",
                (!props.width || props.width.unit === 'auto') && "w-full",
                (!props.height || props.height.unit === 'auto') && "h-auto"
              )}
            >
              {props.src && <source src={props.src} />}
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div {...commonProps}>
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            <audio
              src={props.src || ''}
              controls={props.controls !== false}
              autoPlay={props.autoplay === true}
              loop={props.loop === true}
              muted={props.muted === true}
              preload={props.preload || 'metadata'}
              className="w-full"
            >
              {props.src && <source src={props.src} />}
              Your browser does not support the audio tag.
            </audio>
          </div>
        );

      case 'alert':
        return (
          <div {...commonProps}>
            {/* Add drag handle for non-preview mode */}
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            <Alert variant={props.variant || 'default'} className="w-full">
              {props.title && (
                <h4 className="font-medium mb-1">{props.title}</h4>
              )}
              <AlertDescription>
                {props.description || 'This is an alert message'}
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'badge':
        return (
          <div {...commonProps} className={cn(commonProps.className, 'inline-block')}>
            {/* Add drag handle for non-preview mode */}
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            <Badge 
              variant={props.variant || 'default'}
              className={cn(
                props.size === 'sm' && 'text-xs px-2 py-0.5',
                props.size === 'lg' && 'text-sm px-3 py-1'
              )}
            >
              {props.content !== undefined ? props.content : (props.text ?? 'Badge')}
            </Badge>
          </div>
        );

      case 'progress':
        return (
          <div {...commonProps} className={cn(commonProps.className, 'w-full max-w-sm space-y-2')}>
            <Progress 
              value={props.value || 33}
              max={props.max || 100}
              className={cn('w-full', props.animated && 'transition-all duration-300')}
            />
            {props.showValue !== false && (
              <div className="text-sm text-center text-muted-foreground">
                {props.value || 33}%
              </div>
            )}
          </div>
        );

      case 'avatar':
        // Use explicit dimensions if provided, fallback to size classes
        const avatarStyle: React.CSSProperties = {
          ...(commonProps.style || {}),
          flexShrink: props.flexShrink === '0' ? 0 : undefined,
        };
        
        const hasExplicitSize = props.width || props.height;
        const avatarClasses = hasExplicitSize ? '' : cn(
          props.size === 'sm' && 'h-8 w-8',
          props.size === 'lg' && 'h-16 w-16',
          props.size === 'xl' && 'h-20 w-20',
          !props.size && 'h-10 w-10'
        );
        
        return (
          <div 
            {...commonProps} 
            style={avatarStyle}
            className={cn(commonProps.className)}
          >
            <Avatar 
              className={cn(avatarClasses)}
              style={hasExplicitSize ? { 
                width: props.width, 
                height: props.height,
                borderRadius: '9999px'
              } : undefined}
            >
              <AvatarImage src={props.src} style={{ objectFit: 'cover' }} />
              <AvatarFallback>{props.fallback || 'U'}</AvatarFallback>
            </Avatar>
          </div>
        );

      case 'label':
        return (
          <div {...commonProps} className={cn(commonProps.className, 'inline-block')}>
            <Label htmlFor={props.htmlFor}>
              {props.content !== undefined ? props.content : (props.text ?? 'Label')}
              {props.required && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
        );

      case 'sidebar':
        // Check if it's a topbar mode - render differently
        const navMode = component.props?.mode || 'sidebar';
        const isTopbarMode = navMode === 'topbar' || navMode === 'resizable-topbar';
        
        if (isTopbarMode) {
          // Topbar mode: render full width at top with fixed/sticky positioning
          return (
            <div 
              {...commonProps} 
              className={cn(
                commonProps.className,
                'w-full',
                component.props?.positionType === 'fixed' && 'fixed top-0 left-0 right-0 z-50',
                component.props?.positionType === 'sticky' && 'sticky top-0 z-50'
              )}
              style={{
                ...commonProps.style,
                width: '100%',
              }}
            >
              {!isPreview && (
                <ComponentDragHandle
                  componentId={component.id}
                  component={component}
                  parentId={parentId}
                  index={index}
                  isSelected={isSelected}
                />
              )}
              <AppSidebar component={component} isPreview={isPreview} />
            </div>
          );
        }
        
        // Sidebar mode: render inline
        return (
          <div {...commonProps} className={cn(commonProps.className)}>
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            <AppSidebar component={component} isPreview={isPreview} />
          </div>
        );


      case 'datatable':
        return (
          <div {...commonProps} className={cn(commonProps.className, 'w-full')}>
            <InteractiveDataTable component={component} isPreview={isPreview} />
          </div>
        );

      case 'chart':
        return (
          <div {...commonProps} className={cn(commonProps.className, 'w-full')}>
            <AdvancedChartRenderer component={component} isPreview={isPreview} />
          </div>
        );


      case 'data-display':
        return (
          <div {...commonProps} className={cn(commonProps.className, 'w-full')}>
            <DataDisplay component={component} />
          </div>
        );

      case 'dynamic-grid':
        return (
          <div {...commonProps}>
            <DynamicGrid component={component} isPreview={isPreview} />
          </div>
        );

      case 'blockquote':
        const blockquoteTypography = props.typography || {};
        const blockquoteBorderColor = props.borderColor || 'hsl(var(--primary))';
        const blockquoteBorderWidth = props.borderWidth || 4;
        return (
          <blockquote
            {...commonProps}
            className={cn(commonProps.className, 'pl-4')}
            style={{
              ...commonProps.style,
              ...getSpacingStyles(props),
              borderLeftWidth: `${blockquoteBorderWidth}px`,
              borderLeftStyle: 'solid',
              borderLeftColor: blockquoteBorderColor,
              fontFamily: blockquoteTypography.fontFamily || 'inherit',
              fontSize: blockquoteTypography.fontSize ? `${blockquoteTypography.fontSize}px` : undefined,
              fontWeight: blockquoteTypography.fontWeight || undefined,
              fontStyle: blockquoteTypography.fontStyle || 'italic',
              lineHeight: blockquoteTypography.lineHeight || undefined,
              letterSpacing: blockquoteTypography.letterSpacing ? `${blockquoteTypography.letterSpacing}px` : undefined,
              textAlign: blockquoteTypography.textAlign as any || undefined,
              textTransform: blockquoteTypography.textTransform as any || undefined,
              color: props.color || 'hsl(var(--muted-foreground))',
            }}
          >
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            <span>{props.content || props.children || 'Quote text here...'}</span>
            {props.citation && (
              <footer className="mt-2 text-sm opacity-70">— {props.citation}</footer>
            )}
          </blockquote>
        );

      case 'separator':
        // Get typography for separator color
        const separatorTypography = props.typography || {};
        const separatorColor = getColorValue(separatorTypography.color) || getColorValue(props.color) || 'hsl(var(--border))';
        const lineStyle = props.lineStyle || 'solid';
        
        return (
          <div 
            {...commonProps}
            className={cn(
              'w-full',
              commonProps.className
            )}
            style={{ 
              ...(commonProps.style as React.CSSProperties),
            }}
          >
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            <hr 
              style={{
                border: 'none',
                height: '1px',
                backgroundColor: lineStyle === 'solid' ? separatorColor : 'transparent',
                borderTop: lineStyle !== 'solid' ? `1px ${lineStyle} ${separatorColor}` : undefined,
                margin: 0,
                width: '100%',
              }}
            />
          </div>
        );

      case 'code':
        // Code: can behave as either inline code OR an embed (HTML-ish) block.
        // If the content looks like HTML, render it as an isolated embed so it actually shows on the canvas.
        {
          const codeTypography = props.typography || {};
          const rawCode = coerceToText(
            (props.content ?? (props as any).code ?? props.children ?? '') as any,
            'code'
          );
          const codeValue = typeof rawCode === 'string' ? rawCode : String(rawCode ?? '');
          const trimmed = codeValue.trim();

          const looksLikeHtml =
            trimmed.length > 0 &&
            (/^\s*<!doctype/i.test(trimmed) ||
              /^\s*<svg[\s>]/i.test(trimmed) ||
              /^\s*<iframe[\s>]/i.test(trimmed) ||
              /<\/?[a-z][\s\S]*>/i.test(trimmed));

          if (looksLikeHtml) {
            const srcDoc = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>html,body{margin:0;padding:0;width:100%;height:100%;}*{box-sizing:border-box;}</style></head><body>${trimmed}</body></html>`;

            return (
              <div
                {...commonProps}
                className={cn(commonProps.className, 'overflow-hidden')}
                style={{
                  ...commonProps.style,
                  ...getSpacingStyles(props),
                  ...getDimensionStyles(props),
                }}
              >
                {!isPreview && (
                  <ComponentDragHandle
                    componentId={component.id}
                    component={component}
                    parentId={parentId}
                    index={index}
                    isSelected={isSelected}
                  />
                )}
                <iframe
                  title={`Embedded content (${component.id})`}
                  srcDoc={srcDoc}
                  sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-pointer-lock allow-top-navigation-by-user-activation"
                  className="w-full h-full"
                  style={{
                    border: 0,
                    minHeight: '80px',
                    pointerEvents: isPreview ? 'auto' : 'none',
                  }}
                />
              </div>
            );
          }

          const inlineStyle: React.CSSProperties = {
            ...commonProps.style,
            ...getSpacingStyles(props),
            ...getDimensionStyles(props),
            fontFamily: codeTypography.fontFamily || resolveDefaultFontFamily('code', activeTokens) || 'ui-monospace, monospace',
            fontSize: codeTypography.fontSize ? `${codeTypography.fontSize}px` : '14px',
            fontWeight: codeTypography.fontWeight || undefined,
            lineHeight: codeTypography.lineHeight || undefined,
          };

          // Preserve legacy explicit backgroundColor prop, but don't override style-panel backgrounds by default.
          if (props.backgroundColor) inlineStyle.backgroundColor = props.backgroundColor;
          if (!inlineStyle.backgroundColor) inlineStyle.backgroundColor = 'hsl(var(--muted))';

          return (
            <code
              {...commonProps}
              className={cn(commonProps.className, 'px-1.5 py-0.5 rounded')}
              style={inlineStyle}
            >
              {!isPreview && (
                <ComponentDragHandle
                  componentId={component.id}
                  component={component}
                  parentId={parentId}
                  index={index}
                  isSelected={isSelected}
                />
              )}
              {coerceToText(
                (props.content ?? (props as any).code ?? props.children ?? 'const example = "code";') as any,
                'code'
              )}
            </code>
          );
        }

      case 'codeblock':
        // Codeblock: editable code block - shows editable textarea on canvas
        const codeblockTypography = props.typography || {};
        const rawCodeContent = props.content || props.children || 'function example() {\n  return "Hello World";\n}';
        const codeContent = coerceToText(rawCodeContent, '');
        const lines = codeContent.split('\n');
        
        // In design mode, show editable textarea
        if (!isPreview) {
          return (
            <div
              {...commonProps}
              className={cn(commonProps.className, 'rounded-lg overflow-hidden relative')}
              style={{
                ...commonProps.style,
                ...getSpacingStyles(props),
                ...getDimensionStyles(props),
                backgroundColor: props.backgroundColor || 'hsl(var(--muted))',
              }}
            >
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
              <textarea
                value={codeContent}
                onChange={(e) => {
                  // Update component content via store
                  updateComponent(component.id, { 
                    props: { ...props, content: e.target.value } 
                  });
                }}
                className="w-full h-full min-h-[120px] p-4 bg-transparent border-none outline-none resize-none"
                style={{
                  fontFamily: codeblockTypography.fontFamily || resolveDefaultFontFamily('code', activeTokens) || 'ui-monospace, monospace',
                  fontSize: codeblockTypography.fontSize ? `${codeblockTypography.fontSize}px` : '14px',
                  fontWeight: codeblockTypography.fontWeight || undefined,
                  lineHeight: codeblockTypography.lineHeight || '1.5',
                  color: 'inherit',
                }}
                spellCheck={false}
              />
            </div>
          );
        }
        
        // In preview mode, render the code block normally
        return (
          <pre
            {...commonProps}
            className={cn(commonProps.className, 'rounded-lg p-4 overflow-x-auto')}
            style={{
              ...commonProps.style,
              ...getSpacingStyles(props),
              ...getDimensionStyles(props),
              backgroundColor: props.backgroundColor || 'hsl(var(--muted))',
            }}
          >
            <code 
              style={{
                fontFamily: codeblockTypography.fontFamily || resolveDefaultFontFamily('code', activeTokens) || 'ui-monospace, monospace',
                fontSize: codeblockTypography.fontSize ? `${codeblockTypography.fontSize}px` : '14px',
                fontWeight: codeblockTypography.fontWeight || undefined,
                lineHeight: codeblockTypography.lineHeight || undefined,
              }}
            >
              {props.showLineNumbers ? (
                <div className="flex">
                  <div className="pr-4 text-muted-foreground select-none border-r border-border/50 mr-4">
                    {lines.map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <div className="flex-1">
                    {lines.map((line, i) => (
                      <div key={i}>{line || ' '}</div>
                    ))}
                  </div>
                </div>
              ) : (
                codeContent
              )}
            </code>
          </pre>
        );

      case 'link':
        const linkTypography = props.typography || {};
        const linkUnderline = props.underline || 'none';
        const linkTextDecoration = linkUnderline === 'always' ? 'underline' : 
                              linkUnderline === 'none' ? 'none' : undefined;
        
        // Handle link click - execute clickActions if available, otherwise use href
        const handleLinkClick = async (e: React.MouseEvent) => {
          if (!isPreview) {
            e.preventDefault();
            handleClick(e);
            return;
          }
          
          // Execute click actions if available
          const clickActions = props.clickActions || [];
          if (clickActions.length > 0) {
            e.preventDefault();
            handleComponentAction('onClick', e);
            return;
          }
          
          // Default: allow href navigation
          // If no href, prevent default
          if (!props.href) {
            e.preventDefault();
          }
        };
        
        return (
          <a
            data-component-id={component.id}
            data-nav-role={props['data-nav-role'] || undefined}
            data-active={props['data-active'] || undefined}
            href={isPreview ? (props.href || '#') : undefined}
            target={props.target || '_self'}
            rel={props.target === '_blank' ? 'noopener noreferrer' : undefined}
            className={cn(
              'relative transition-all duration-200 cursor-pointer',
              !isPreview && 'min-h-[20px]',
              isOver && !isPreview && 'bg-primary/10 border-2 border-dashed border-primary',
              linkUnderline === 'hover' && 'no-underline hover:underline',
              props.className
            )}
            style={{
              display: props.display || 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              ...componentStyle.inlineStyles,
              ...getSpacingStyles(props),
              ...getDimensionStyles(props),
              ...getLayoutStyles(props),
              ...getNewBorderStyles(props),
              ...getEffectsStyles(props),
              ...appliedClassStyles,
              ...getEffectiveBackgroundStyles(),
              fontFamily: linkTypography.fontFamily || props.fontFamily || (appliedClassStyles as any)?.fontFamily || 'inherit',
              fontSize: (linkTypography.fontSize || props.fontSize) ? `${linkTypography.fontSize || props.fontSize}px` : (appliedClassStyles as any)?.fontSize,
              fontWeight: linkTypography.fontWeight || props.fontWeight || (appliedClassStyles as any)?.fontWeight,
              fontStyle: linkTypography.fontStyle || props.fontStyle || (appliedClassStyles as any)?.fontStyle,
              lineHeight: linkTypography.lineHeight || props.lineHeight || (appliedClassStyles as any)?.lineHeight,
              letterSpacing: linkTypography.letterSpacing ? `${linkTypography.letterSpacing}px` : (appliedClassStyles as any)?.letterSpacing,
              textTransform: (linkTypography.textTransform || props.textTransform || (appliedClassStyles as any)?.textTransform) as any,
              textAlign: (linkTypography.textAlign || props.textAlign || (appliedClassStyles as any)?.textAlign) as any,
              // CRITICAL FIX: Detect dark footer context and apply light color for links
              color: (appliedClassStyles as any)?.color ?? linkTypography.color ?? props.color ?? (
                (component.id?.toLowerCase().includes('footer') || parentId?.toLowerCase().includes('footer'))
                  ? 'rgba(255,255,255,0.7)'
                  : 'hsl(var(--primary))'
              ),
              textDecoration: linkTextDecoration,
            }}
            onClick={handleLinkClick}
            onContextMenu={handleContextMenu}
            ref={dropRef}
          >
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            {(props.content ?? props.text ?? props.children) || 'Link text'}
            {props.showIcon && <ExternalLink className="h-3 w-3" />}
          </a>
        );

      // ===== NEW FORM COMPONENTS =====
      case 'form-wrapper':
        // Resolve DS-linked defaults for form-wrapper
        const formDSStyles = resolveAllDSStyles(component.type, props, activeTokens);
        return (
          <form
            {...commonProps}
            className={cn(commonProps.className, 'flex flex-col border border-border rounded-lg')}
            style={{
              ...commonProps.style,
              ...getSpacingStyles(props),
              ...getDimensionStyles(props),
              gap: resolveDefaultFormGap(activeTokens) || '16px',
              padding: resolveDefaultModalPadding(activeTokens) || '24px',
              backgroundColor: formDSStyles.backgroundColor || 'hsl(var(--card))',
              borderRadius: formDSStyles.borderRadius || resolveDefaultBorderRadius('card', activeTokens) || '12px',
            }}
            onSubmit={(e) => {
              e.preventDefault();
              if (isPreview) {
                handleComponentAction('onSubmit', e as any);
              }
            }}
            ref={dropRef}
          >
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            {/* Form type indicator */}
            {!isPreview && props.formType && props.formType !== 'custom' && (
              <div className="absolute -top-3 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded font-medium">
                {String(props.formType).charAt(0).toUpperCase() + String(props.formType).slice(1)} Form
              </div>
            )}
            {/* Render children or default form content */}
            {component.children && component.children.length > 0 ? (
              component.children.map((child, idx) => (
                <ComponentRenderer
                  key={child.id}
                  component={withInheritedDataContext(child)}
                  isPreview={isPreview}
                  parentId={component.id}
                  index={idx}
                />
              ))
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">Email</Label>
                  <Input 
                    placeholder="Enter your email" 
                    style={{
                      height: resolveDefaultInputHeight(activeTokens) || '36px',
                      borderRadius: resolveDefaultBorderRadius('input', activeTokens) || '6px',
                      paddingLeft: resolveDefaultInputPadding(activeTokens) || '12px',
                      paddingRight: resolveDefaultInputPadding(activeTokens) || '12px',
                    }}
                  />
                </div>
                <Button 
                  type="submit"
                  style={{
                    borderRadius: resolveDefaultBorderRadius('button', activeTokens) || '0px',
                  }}
                >
                  Submit
                </Button>
              </>
            )}
            {isOver && !isPreview && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg pointer-events-none" />
            )}
          </form>
        );

      case 'form-wizard':
        const wizardSteps = props.steps || ['Step 1', 'Step 2', 'Step 3'];
        const currentStep = props.currentStep || 0;
        return (
          <div
            {...commonProps}
            className={cn(commonProps.className, 'flex flex-col border border-border rounded-lg bg-card')}
            style={{
              ...commonProps.style,
              ...getSpacingStyles(props),
              ...getDimensionStyles(props),
              gap: resolveDefaultFormGap(activeTokens) || '24px',
              padding: resolveDefaultModalPadding(activeTokens) || '16px',
            }}
            ref={dropRef}
          >
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            {/* Step indicators */}
            <div className="flex items-center justify-between">
              {wizardSteps.map((step: string, idx: number) => (
                <div key={idx} className="flex items-center">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                    idx <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    {idx + 1}
                  </div>
                  {idx < wizardSteps.length - 1 && (
                    <div className={cn(
                      'h-0.5 w-12 mx-2',
                      idx < currentStep ? 'bg-primary' : 'bg-muted'
                    )} />
                  )}
                </div>
              ))}
            </div>
            {/* Step content */}
            <div className="min-h-[200px] p-4 border border-dashed border-border rounded-lg">
              {component.children && component.children.length > 0 ? (
                component.children.map((child, idx) => (
                  <ComponentRenderer
                    key={child.id}
                    component={withInheritedDataContext(child)}
                    isPreview={isPreview}
                    parentId={component.id}
                    index={idx}
                  />
                ))
              ) : (
                <p className="text-muted-foreground text-center">Drop form elements here for step {currentStep + 1}</p>
              )}
            </div>
            {/* Navigation */}
            <div className="flex justify-between">
              <Button variant="outline" disabled={currentStep === 0}>Previous</Button>
              <Button>{currentStep === wizardSteps.length - 1 ? 'Submit' : 'Next'}</Button>
            </div>
            {isOver && !isPreview && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg pointer-events-none" />
            )}
          </div>
        );

      case 'password-input':
        return (
          <div
            {...commonProps}
            className={cn(commonProps.className, 'flex flex-col gap-2')}
            style={{
              ...commonProps.style,
              ...getSpacingStyles(props),
              ...getDimensionStyles(props),
            }}
          >
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            {props.label && <Label>{props.label}</Label>}
            <div className="relative">
              <Input
                type="password"
                placeholder={props.placeholder || 'Enter password'}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <LucideIcons.Eye className="h-4 w-4" />
              </button>
            </div>
            {props.showStrength && (
              <div className="flex gap-1 h-1">
                <div className="flex-1 bg-red-500 rounded" />
                <div className="flex-1 bg-muted rounded" />
                <div className="flex-1 bg-muted rounded" />
                <div className="flex-1 bg-muted rounded" />
              </div>
            )}
          </div>
        );

      case 'radio-group':
        const rawRadioGroupOptions = props.options || ['Option 1', 'Option 2', 'Option 3'];

        // Normalize options to handle both string arrays and {label, value} objects
        const radioGroupOptions = (Array.isArray(rawRadioGroupOptions) ? rawRadioGroupOptions : [rawRadioGroupOptions]).map((opt: any) => {
          if (typeof opt === 'string') return { label: opt, value: opt };
          if (opt && typeof opt === 'object' && 'label' in opt && 'value' in opt) {
            return { label: String(opt.label), value: String(opt.value) };
          }
          return { label: String(opt), value: String(opt) };
        });

        const radioGroupDefaultValue =
          props.defaultValue && typeof props.defaultValue === 'object' && 'value' in props.defaultValue
            ? String((props.defaultValue as any).value)
            : props.defaultValue;
        return (
          <div
            {...commonProps}
            className={cn(commonProps.className, 'flex flex-col gap-2')}
            style={{
              ...commonProps.style,
              ...getSpacingStyles(props),
              ...getDimensionStyles(props),
            }}
            ref={dropRef}
          >
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            {props.label && <Label className="font-medium">{props.label}</Label>}
            <RadioGroup defaultValue={radioGroupDefaultValue} className={cn(props.orientation === 'horizontal' ? 'flex flex-row gap-4' : 'flex flex-col gap-2')}>
              {radioGroupOptions.map((option: { label: string; value: string }, idx: number) => (
                <div key={idx} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`${component.id}-${idx}`} />
                  <Label htmlFor={`${component.id}-${idx}`}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'checkbox-group':
        const rawCheckboxGroupOptions = props.options || ['Option 1', 'Option 2', 'Option 3'];

        // Normalize options to handle both string arrays and {label, value} objects
        const checkboxGroupOptions = (Array.isArray(rawCheckboxGroupOptions) ? rawCheckboxGroupOptions : [rawCheckboxGroupOptions]).map((opt: any) => {
          if (typeof opt === 'string') return { label: opt, value: opt };
          if (opt && typeof opt === 'object' && 'label' in opt && 'value' in opt) {
            return { label: String(opt.label), value: String(opt.value) };
          }
          return { label: String(opt), value: String(opt) };
        });
        return (
          <div
            {...commonProps}
            className={cn(commonProps.className, 'flex flex-col gap-2')}
            style={{
              ...commonProps.style,
              ...getSpacingStyles(props),
              ...getDimensionStyles(props),
            }}
            ref={dropRef}
          >
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            {props.label && <Label className="font-medium">{props.label}</Label>}
            <div className={cn(props.orientation === 'horizontal' ? 'flex flex-row gap-4' : 'flex flex-col gap-2')}>
              {checkboxGroupOptions.map((option: { label: string; value: string }, idx: number) => (
                <div key={idx} className="flex items-center space-x-2">
                  <Checkbox id={`${component.id}-${idx}`} />
                  <Label htmlFor={`${component.id}-${idx}`}>{option.label}</Label>
                </div>
              ))}
            </div>
          </div>
        );

      // ===== NEW NAVIGATION COMPONENTS =====
      case 'nav-horizontal':
      case 'nav-vertical': {
        const isHorizontalNav = component.type === 'nav-horizontal';
        
        // --- Nav container style props ---
        const navBgColor = props.navBgColor;
        const navBorderBottomEnabled = props.navBorderBottomEnabled === true;
        const navBorderBottomColor = props.navBorderBottomColor || '#e5e7eb';
        const navBorderBottomWidth = props.navBorderBottomWidth || 1;
        const navBoxShadow = props.navBoxShadow === true;
        const navGlassmorphism = props.navGlassmorphism === true;
        const navHeight = parseInt(props.navHeight) || undefined;
        const navPadding = parseInt(props.navPadding) || undefined;
        
        // Hamburger button style props
        const hamburgerIconColor = props.hamburgerIconColor || 'currentColor';
        const hamburgerIconSize = parseInt(props.hamburgerIconSize) || 24;
        const hamburgerHoverBg = props.hamburgerHoverBg || 'transparent';
        
        // Mobile menu style props
        const mobileMenuBgColor = props.mobileMenuBgColor;
        const mobileMenuAnimation = props.mobileMenuAnimation || 'slide-down';
        const mobileMenuPadding = parseInt(props.mobileMenuPadding) || 20;
        const mobileMenuLinkSpacing = parseInt(props.mobileMenuLinkSpacing) || 4;

        // Glassmorphism (horizontal only)
        const navHasGlassEffect = navGlassmorphism || props.glassEffect || props.backdropBlur;
        const navHasCustomBg = navBgColor || props.background || props.backgroundColor || commonProps.style?.background || commonProps.style?.backgroundColor;
        
        // Legacy links array
        const navLinks = Array.isArray(props.links) ? props.links : [];
        const hasNavChildren = component.children && component.children.length > 0;
        const hasConfiguredLinks = navLinks.length > 0;

        // --- Link style props ---
        const linkActiveStyle = props.linkActiveStyle || 'none';
        const linkActiveColor = props.linkActiveColor || '#3B82F6';
        const linkHoverStyle = props.linkHoverStyle || 'none';
        const linkHoverColor = props.linkHoverColor || '#3B82F6';
        const linkTransitionDuration = props.linkTransitionDuration || 200;
        const linkTransitionEasing = props.linkTransitionEasing || 'ease';
        const linkActiveFontWeight = props.linkActiveFontWeight || 'normal';
        const linkTextTransform = props.linkTextTransform || 'none';
        const linkGap = props.linkGap || (isHorizontalNav ? 16 : 8);

        // --- Link typography props (fall back to DS body font token) ---
        const dsBodyFontToken = activeTokens.get('font-body');
        const dsBodyFont = dsBodyFontToken?.value || '';
        const linkFontFamily = props.linkFontFamily || dsBodyFont || undefined;
        const linkFontSize = props.linkFontSize;
        const linkFontWeight = props.linkFontWeight;
        const linkLineHeight = props.linkLineHeight;
        const linkLetterSpacing = props.linkLetterSpacing;
        const linkColor = props.linkColor;
        const linkFontStyle = props.linkFontStyle;

        // --- Logo size & scroll-shrink props ---
        const logoSize = parseInt(props.logoSize) || 80;
        const scrollShrinkLogoSize = parseInt(props.scrollShrinkLogoSize) || Math.round(logoSize * 0.6);
        const scrollShrinkEnabled = props.scrollShrink === true;
        const scrollShrinkPadding = props.scrollShrinkPadding || '8px 24px';

        // --- Hamburger / responsive props ---
        const hamburgerEnabled = isHorizontalNav && props.hamburgerMenu !== false;
        const hamburgerBreakpoint = parseInt(props.mobileBreakpoint) || 768;
        const [navMenuState, setNavMenuState] = React.useState({ mobileOpen: false, verticalOpen: false });
        const mobileMenuOpen = navMenuState.mobileOpen;
        const setMobileMenuOpen = (open: boolean) => setNavMenuState(s => ({ ...s, mobileOpen: open }));
        const verticalMenuOpen = navMenuState.verticalOpen;
        const setVerticalMenuOpen = (open: boolean) => setNavMenuState(s => ({ ...s, verticalOpen: open }));
        const [openDropdownId, setOpenDropdownId] = React.useState<string | null>(null);
        const toggleDropdown = (id: string) => setOpenDropdownId(prev => prev === id ? null : id);

        // Close dropdown on click outside
        React.useEffect(() => {
          if (!openDropdownId) return;
          const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest(`[data-dropdown-id="${openDropdownId}"]`)) {
              setOpenDropdownId(null);
            }
          };
          document.addEventListener('mousedown', handler);
          return () => document.removeEventListener('mousedown', handler);
        }, [openDropdownId]);
        const menuPosition = props.menuPosition || 'left';
        
        // JS-driven mobile detection for builder (CSS media queries don't work with simulated viewports)
        const effectiveCanvasWidth = customCanvasWidth || (viewport === 'desktop' ? 1440 : viewport === 'tablet' ? 768 : 390);
        const isMobileView = hamburgerEnabled && effectiveCanvasWidth <= hamburgerBreakpoint;

        // Generate scoped CSS for link effects
        const navScopeId = `nav-${component.id}`;
        const buildNavLinkCSS = () => {
          const dur = `${linkTransitionDuration}ms`;
          const ease = linkTransitionEasing;
          let css = '';

          // Base link styles inside this nav — use !important to override inline display:inline-flex
          css += `[data-nav-scope="${navScopeId}"] [data-nav-role="link"] {
            position: relative !important;
            display: inline-block !important;
            text-decoration: none;
            padding-bottom: 4px;
            overflow: visible !important;
            transition: color ${dur} ${ease}, background ${dur} ${ease}, transform ${dur} ${ease};
            ${linkTextTransform !== 'none' ? `text-transform: ${linkTextTransform} !important;` : ''}
            ${linkFontFamily && linkFontFamily !== 'inherit' ? `font-family: ${linkFontFamily} !important;` : ''}
            ${linkFontSize ? `font-size: ${linkFontSize}px !important;` : ''}
            ${linkFontWeight ? `font-weight: ${linkFontWeight} !important;` : ''}
            ${linkLineHeight ? `line-height: ${linkLineHeight} !important;` : ''}
            ${linkLetterSpacing && linkLetterSpacing !== '0' ? `letter-spacing: ${linkLetterSpacing}px !important;` : ''}
            ${linkColor ? `color: ${linkColor} !important;` : ''}
            ${linkFontStyle && linkFontStyle !== 'normal' ? `font-style: ${linkFontStyle} !important;` : ''}
          }\n`;

          // Hover styles
          if (linkHoverStyle === 'underline-slide') {
            css += `[data-nav-scope="${navScopeId}"] [data-nav-role="link"]::after {
              content: '';
              position: absolute;
              bottom: -2px;
              left: 0;
              width: 100%;
              height: 2px;
              background: ${linkHoverColor};
              transform: scaleX(0);
              transform-origin: right;
              transition: transform ${dur} ${ease};
            }
            [data-nav-scope="${navScopeId}"] [data-nav-role="link"]:hover::after {
              transform: scaleX(1);
              transform-origin: left;
            }\n`;
          } else if (linkHoverStyle === 'background-fade') {
            css += `[data-nav-scope="${navScopeId}"] [data-nav-role="link"]:hover {
              background: ${linkHoverColor}18;
              border-radius: 6px;
              padding-inline: 8px;
            }\n`;
          } else if (linkHoverStyle === 'color-shift') {
            css += `[data-nav-scope="${navScopeId}"] [data-nav-role="link"]:hover {
              color: ${linkHoverColor} !important;
            }\n`;
          } else if (linkHoverStyle === 'scale') {
            css += `[data-nav-scope="${navScopeId}"] [data-nav-role="link"]:hover {
              transform: scale(1.05);
            }\n`;
          }

          // Active styles
          if (linkActiveStyle === 'underline') {
            css += `[data-nav-scope="${navScopeId}"] [data-nav-role="link"][data-active="true"] {
              font-weight: ${linkActiveFontWeight};
            }
            [data-nav-scope="${navScopeId}"] [data-nav-role="link"][data-active="true"]::after {
              content: '';
              position: absolute;
              bottom: -2px;
              left: 0;
              width: 100%;
              height: 2.5px;
              background: ${linkActiveColor};
              border-radius: 2px;
              transform: scaleX(1);
            }\n`;
          } else if (linkActiveStyle === 'background') {
            css += `[data-nav-scope="${navScopeId}"] [data-nav-role="link"][data-active="true"] {
              background: ${linkActiveColor}18;
              border-radius: 6px;
              padding-inline: 8px;
              font-weight: ${linkActiveFontWeight};
            }\n`;
          } else if (linkActiveStyle === 'pill') {
            css += `[data-nav-scope="${navScopeId}"] [data-nav-role="link"][data-active="true"] {
              background: ${linkActiveColor};
              color: #fff !important;
              border-radius: 999px;
              padding: 4px 14px;
              font-weight: ${linkActiveFontWeight};
            }\n`;
          } else if (linkActiveStyle === 'dot') {
            css += `[data-nav-scope="${navScopeId}"] [data-nav-role="link"][data-active="true"] {
              font-weight: ${linkActiveFontWeight};
            }
            [data-nav-scope="${navScopeId}"] [data-nav-role="link"][data-active="true"]::after {
              content: '';
              position: absolute;
              bottom: -6px;
              left: 50%;
              transform: translateX(-50%);
              width: 5px;
              height: 5px;
              background: ${linkActiveColor};
              border-radius: 50%;
            }\n`;
          } else {
            // Even with 'none' active style, still apply bold if set
            if (linkActiveFontWeight && linkActiveFontWeight !== 'normal') {
              css += `[data-nav-scope="${navScopeId}"] [data-nav-role="link"][data-active="true"] {
                font-weight: ${linkActiveFontWeight} !important;
              }\n`;
            }
          }

          // Logo sizing
          css += `[data-nav-scope="${navScopeId}"] [data-nav-role="logo"] {
            width: ${logoSize}px;
            height: ${logoSize}px;
            object-fit: contain;
            transition: width ${dur} ${ease}, height ${dur} ${ease};
          }\n`;

          // Scroll-shrink styles
          if (scrollShrinkEnabled && isHorizontalNav) {
            css += `[data-nav-scope="${navScopeId}"].nav-scrolled {
              padding: ${scrollShrinkPadding} !important;
              min-height: auto !important;
              transition: padding ${dur} ${ease}, min-height ${dur} ${ease};
            }
            [data-nav-scope="${navScopeId}"].nav-scrolled [data-nav-role="logo"] {
              width: ${scrollShrinkLogoSize}px !important;
              height: ${scrollShrinkLogoSize}px !important;
            }\n`;
          }

          // Responsive hamburger styles
          if (hamburgerEnabled) {
            if (isPreview) {
              // Preview/published mode: use real CSS media queries
              css += `
              @media (max-width: ${hamburgerBreakpoint}px) {
                [data-nav-scope="${navScopeId}"] .nav-links-desktop {
                  display: none !important;
                }
                [data-nav-scope="${navScopeId}"] .nav-hamburger-btn {
                  display: flex !important;
                }
              }
              @media (min-width: ${hamburgerBreakpoint + 1}px) {
                [data-nav-scope="${navScopeId}"] .nav-hamburger-btn {
                  display: none !important;
                }
                [data-nav-scope="${navScopeId}"] .nav-mobile-overlay {
                  display: none !important;
                }
              }
              `;
            }
            // Mobile overlay styles (used in both builder and preview)
            const mobileAnimName = mobileMenuAnimation === 'fade' ? 'navFadeIn' : mobileMenuAnimation === 'none' ? '' : 'navSlideIn';
            css += `
            [data-nav-scope="${navScopeId}"] .nav-mobile-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              z-index: 9999;
              background: ${mobileMenuBgColor || 'hsl(var(--background))'};
              display: flex;
              flex-direction: column;
              padding: ${mobileMenuPadding}px;
              ${mobileAnimName ? `animation: ${mobileAnimName} 200ms ease-out;` : ''}
            }
            @keyframes navSlideIn {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes navFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            [data-nav-scope="${navScopeId}"] .nav-mobile-overlay [data-nav-role="link"] {
              display: block !important;
              padding: 12px 0;
              font-size: 18px;
              border-bottom: 1px solid hsl(var(--border));
            }
            `;
          }

          return css;
        };

        // Determine active link by matching href to current page path
        const currentPagePath = (() => {
          if (!currentPage || !currentProject) return '/';
          const pages = currentProject.pages as any[];
          const pg = pages?.find((p: any) => p.id === currentPage);
          return pg?.path || '/';
        })();

        // Inject data-nav-role and data-active on children
        const wrapNavChild = (child: AppComponent) => {
          const role = child.props?._navRole;
          // Auto-detect role by component type if _navRole isn't set
          const isLink = role === 'link' || (!role && (child.type === 'link' || child.type === 'button'));
          const isLogo = role === 'logo' || (!role && child.type === 'image');
          const isDropdown = role === 'dropdown' || (!role && child.type === 'dropdown-menu');
          
          if (isLink) {
            const href = child.props?._navHref || child.props?.href || '#';
            const isActive = href === currentPagePath;
            return {
              ...child,
              props: { ...child.props, 'data-nav-role': 'link', 'data-active': isActive ? 'true' : 'false' },
            };
          }
          if (isLogo) {
            return {
              ...child,
              props: { ...child.props, 'data-nav-role': 'logo' },
            };
          }
          if (isDropdown) {
            return {
              ...child,
              props: { 
                ...child.props, 
                'data-nav-role': 'dropdown',
                _navRole: 'dropdown',
                _dropdownType: child.props?._dropdownType || 'standard',
                _megaColumns: child.props?._megaColumns || 3,
                _navLabel: child.props?._navLabel || child.props?.text || 'Menu',
              },
              children: (child.children || []).map(wrapNavChild),
            };
          }
          // For containers (divs/columns), recursively wrap their children
          if (child.children && child.children.length > 0) {
            return {
              ...child,
              children: child.children.map(wrapNavChild),
            };
          }
          return child;
        };

        // Render a nav dropdown (trigger + expandable panel)
        const renderNavDropdown = (child: AppComponent, childIndex: number) => {
          const label = child.props?._navLabel || 'Menu';
          const dropdownType = child.props?._dropdownType || 'standard';
          const megaColumns = child.props?._megaColumns || 3;
          const isOpen = openDropdownId === child.id;
          const subItems = child.children || [];

          return (
            <div
              key={child.id}
              data-dropdown-id={child.id}
              style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column' }}
            >
              {/* Trigger */}
              <button
                data-nav-role="link"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDropdown(child.id);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 2px',
                  font: 'inherit',
                  color: 'inherit',
                  fontSize: 'inherit',
                  fontWeight: 'inherit',
                  fontFamily: 'inherit',
                  lineHeight: 'inherit',
                  letterSpacing: 'inherit',
                  textTransform: 'inherit' as any,
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
                <ChevronDown
                  style={{
                    width: '14px',
                    height: '14px',
                    transition: 'transform 200ms ease',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    opacity: 0.6,
                  }}
                />
              </button>

              {/* Dropdown Panel */}
              {isOpen && (
                dropdownType === 'mega' ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      minWidth: '400px',
                      backgroundColor: 'hsl(var(--popover))',
                      color: 'hsl(var(--popover-foreground))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                      padding: '16px',
                      zIndex: 150,
                      display: 'grid',
                      gridTemplateColumns: `repeat(${megaColumns}, 1fr)`,
                      gap: '8px',
                      marginTop: '4px',
                    }}
                  >
                    {subItems.map((sub: AppComponent, si: number) => (
                      <ComponentRenderer key={sub.id} component={withInheritedDataContext(sub)} isPreview={isPreview} parentId={child.id} index={si} />
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '0',
                      minWidth: '180px',
                      backgroundColor: 'hsl(var(--popover))',
                      color: 'hsl(var(--popover-foreground))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                      padding: '4px',
                      zIndex: 150,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      marginTop: '4px',
                    }}
                  >
                    {subItems.map((sub: AppComponent, si: number) => (
                      <div
                        key={sub.id}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'background-color 150ms ease',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'hsl(var(--accent))'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                      >
                        <ComponentRenderer component={withInheritedDataContext(sub)} isPreview={isPreview} parentId={child.id} index={si} />
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          );
        };

        // Helper: render a nav child – use dropdown renderer for dropdown role, else normal ComponentRenderer
        const renderNavChildElement = (child: AppComponent, childIndex: number) => {
          if (child.props?._navRole === 'dropdown' || child.props?.['data-nav-role'] === 'dropdown') {
            return renderNavDropdown(child, childIndex);
          }
          return <ComponentRenderer key={child.id} component={withInheritedDataContext(child)} isPreview={isPreview} parentId={component.id} index={childIndex} />;
        };

        const navClassName = isHorizontalNav
          ? cn(
              commonProps.className,
              'relative flex items-center justify-between w-full',
              !navHasCustomBg && !navBgColor && 'bg-background/80 backdrop-blur-md',
              !navBorderBottomEnabled && 'border-b border-border/50',
              navHasGlassEffect && 'backdrop-blur-lg bg-background/60'
            )
          : cn(commonProps.className, 'relative flex flex-col w-full min-h-[60px] bg-card border-r border-border');

        const navStyle: React.CSSProperties = {
          ...commonProps.style,
          ...getSpacingStyles(props),
          ...getDimensionStyles(props),
          overflow: 'visible',
          ...(isHorizontalNav
            ? {
                width: '100%',
                justifyContent: props.justifyContent || commonProps.style?.justifyContent || 'space-between',
                alignItems: props.alignItems || commonProps.style?.alignItems || 'center',
                ...(navBgColor ? { backgroundColor: navBgColor } : {}),
                ...(navBorderBottomEnabled ? { borderBottom: `${navBorderBottomWidth}px solid ${navBorderBottomColor}` } : {}),
                ...(navBoxShadow ? { boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)' } : {}),
                ...(navHeight ? { minHeight: `${navHeight}px` } : { minHeight: '60px' }),
              }
            : {}),
        };

        // Scroll-shrink effect
        const navScrollRef = React.useCallback((el: HTMLElement | null) => {
          if (!el || !scrollShrinkEnabled || !isHorizontalNav) return;
          const handleScroll = () => {
            if (window.scrollY > 50) {
              el.classList.add('nav-scrolled');
            } else {
              el.classList.remove('nav-scrolled');
            }
          };
          // Use the iframe/window scroll
          const scrollTarget = el.closest('iframe')?.contentWindow || window;
          scrollTarget.addEventListener('scroll', handleScroll, { passive: true });
          handleScroll(); // initial check
          return () => scrollTarget.removeEventListener('scroll', handleScroll);
        }, [scrollShrinkEnabled, isHorizontalNav]);

        return (
          <nav
            {...commonProps}
            className={navClassName}
            style={{ ...navStyle, transition: scrollShrinkEnabled ? `padding ${linkTransitionDuration}ms ${linkTransitionEasing}` : undefined }}
            ref={(el) => {
              if (typeof dropRef === 'function') dropRef(el);
              navScrollRef(el);
            }}
            data-nav-scope={navScopeId}
          >
            <style>{buildNavLinkCSS()}</style>
            {!isPreview && (
              <ComponentDragHandle componentId={component.id} component={component} parentId={parentId} index={index} isSelected={isSelected} />
            )}
            {hasNavChildren ? (
              isHorizontalNav ? (
              (() => {
                const layoutTemplate = props._layoutTemplate;
                const wrappedChildren = component.children.map((child: AppComponent) => wrapNavChild(child));
                
                // Separate logo from link items for hamburger rendering
                const logoChild = wrappedChildren.find((c: AppComponent) => 
                  c.props?.['data-nav-role'] === 'logo' || c.props?._navRole === 'logo'
                );
                const linkChildren = wrappedChildren.filter((c: AppComponent) => c !== logoChild);

                // Build desktop links layout
                let desktopLinks: React.ReactNode;
                
                // Centered logo: 3-part flex layout
                if (layoutTemplate === 'logo-center' && logoChild) {
                  const logoIndex = wrappedChildren.indexOf(logoChild);
                  const leftItems = wrappedChildren.slice(0, logoIndex);
                  const rightItems = wrappedChildren.slice(logoIndex + 1);
                  desktopLinks = (
                    <div className="nav-links-desktop" data-nav-el="nav-container" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: `${linkGap}px` }}>
                      <div data-nav-el="link-div-left" style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'flex-end', gap: `${linkGap}px` }}>
                        {leftItems.map((child: AppComponent, i: number) => renderNavChildElement(child, i))}
                      </div>
                      <div data-nav-el="logo-container" style={{ flexShrink: 0 }}>
                        <ComponentRenderer key={logoChild.id} component={withInheritedDataContext(logoChild)} isPreview={isPreview} parentId={component.id} index={logoIndex} />
                      </div>
                      <div data-nav-el="link-div-right" style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'flex-start', gap: `${linkGap}px` }}>
                        {rightItems.map((child: AppComponent, i: number) => renderNavChildElement(child, logoIndex + 1 + i))}
                      </div>
                    </div>
                  );
                } else {
                  // Default layout: NavContainer > [LogoContainer, LinkDiv]
                  desktopLinks = (
                    <div className="nav-links-desktop" data-nav-el="nav-container" style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, gap: `${linkGap}px`, justifyContent: props.justifyContent || 'space-between', overflow: 'visible' }}>
                      {wrappedChildren.map((child: AppComponent, childIndex: number) => renderNavChildElement(child, childIndex))}
                    </div>
                  );
                }

                // Hamburger menu rendering helper
                const renderHamburgerMenu = () => (
                  <>
                    {/* Mobile top bar: logo + hamburger aligned on one row */}
                    <div
                      className="nav-hamburger-btn"
                      data-nav-el="mobile-header"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                      }}
                    >
                      {logoChild && (
                        <div data-nav-el="logo-container" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                          <ComponentRenderer key={`mobile-logo-${logoChild.id}`} component={withInheritedDataContext(logoChild)} isPreview={isPreview} parentId={component.id} index={0} />
                        </div>
                      )}
                      <button
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '8px', flexShrink: 0, color: hamburgerIconColor, borderRadius: '6px' }}
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        onMouseEnter={(e) => { if (hamburgerHoverBg !== 'transparent') (e.currentTarget as HTMLElement).style.backgroundColor = hamburgerHoverBg; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                        aria-label="Toggle menu"
                      >
                        <svg width={hamburgerIconSize} height={hamburgerIconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {mobileMenuOpen ? (
                            <>
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </>
                          ) : (
                            <>
                              <line x1="3" y1="6" x2="21" y2="6" />
                              <line x1="3" y1="12" x2="21" y2="12" />
                              <line x1="3" y1="18" x2="21" y2="18" />
                            </>
                          )}
                        </svg>
                      </button>
                    </div>
                    {/* Mobile menu overlay */}
                    {mobileMenuOpen && (
                      <div className="nav-mobile-overlay" data-nav-el="mobile-menu-wrapper" style={{
                        ...(mobileMenuBgColor ? { background: mobileMenuBgColor } : {}),
                        padding: `${mobileMenuPadding}px`,
                      }}>
                        <div data-nav-el="mobile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          {logoChild && (
                            <ComponentRenderer key={`overlay-logo-${logoChild.id}`} component={withInheritedDataContext(logoChild)} isPreview={isPreview} parentId={component.id} index={0} />
                          )}
                          <button
                            onClick={() => setMobileMenuOpen(false)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: hamburgerIconColor }}
                            aria-label="Close menu"
                          >
                            <svg width={hamburgerIconSize} height={hamburgerIconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                        <div data-nav-el="link-div" style={{ display: 'flex', flexDirection: 'column', gap: `${mobileMenuLinkSpacing}px` }}>
                          {linkChildren.map((child: AppComponent, i: number) => renderNavChildElement(child, i))}
                        </div>
                      </div>
                    )}
                  </>
                );

                // Conditional rendering: JS-driven in builder, CSS-driven in preview
                if (isMobileView && !isPreview) {
                  // Builder mobile/tablet view: show hamburger directly
                  return <>{renderHamburgerMenu()}</>;
                } else if (isPreview && hamburgerEnabled) {
                  // Preview/published: render both, CSS media queries toggle visibility
                  return (
                    <>
                      {desktopLinks}
                      <div className="nav-hamburger-btn" style={{ display: 'none' }}>
                        {renderHamburgerMenu()}
                      </div>
                    </>
                  );
                } else {
                  // Builder desktop view: just desktop links
                  return <>{desktopLinks}</>;
                }
              })()
              ) : (
                // Vertical nav rendering with sidebar panel overlay
                (() => {
                  const positionAlign = menuPosition === 'center' ? 'center' : menuPosition === 'right' ? 'flex-end' : 'flex-start';
                  const wrappedChildren = component.children.map((child: AppComponent) => wrapNavChild(child));
                  
                  const renderVerticalNavIcon = (child: AppComponent) => {
                    const iconName = child.props?._navIcon;
                    if (!iconName) return null;
                    const iconVariant = child.props?._navIconVariant || 'Bold';
                    const IconsaxComp = (Iconsax as any)[iconName];
                    if (IconsaxComp) return <IconsaxComp size={18} variant={iconVariant} />;
                    const LucideComp = (LucideIcons as any)[iconName];
                    if (LucideComp) return <LucideComp size={18} />;
                    return null;
                  };

                  // Panel appearance props
                  const panelBgColor = props.panelBgColor || '#ffffff';
                  const panelWidth = props.panelWidth || 280;
                  const panelOverlay = props.panelOverlay !== false;
                  const panelOverlayColor = props.panelOverlayColor || '#000000';
                  const panelOverlayOpacity = props.panelOverlayOpacity ?? 0.4;
                  const panelAnimation = props.panelAnimation || 'slide';
                  const panelAnimationDuration = props.panelAnimationDuration || 300;
                  const panelBorderEnabled = props.panelBorderEnabled === true;
                  const panelBorderColor = props.panelBorderColor || '#e5e7eb';
                  const panelShadow = props.panelShadow !== false;

                  // Position-aware: left/center → panel from left; right → panel from right
                  const panelSide = menuPosition === 'right' ? 'right' : 'left';
                  const closeBtnAlign = panelSide === 'right' ? 'flex-start' : 'flex-end';

                  // Animation styles
                  const getTransitionStyle = (isOpen: boolean): React.CSSProperties => {
                    const dur = `${panelAnimationDuration}ms`;
                    if (panelAnimation === 'slide') {
                      return {
                        transform: isOpen ? 'translateX(0)' : (panelSide === 'right' ? 'translateX(100%)' : 'translateX(-100%)'),
                        transition: `transform ${dur} ease-in-out`,
                      };
                    }
                    if (panelAnimation === 'fade') {
                      return {
                        opacity: isOpen ? 1 : 0,
                        transition: `opacity ${dur} ease-in-out`,
                      };
                    }
                    return {};
                  };

                   const panelStyle: React.CSSProperties = {
                    position: 'absolute',
                    top: 0,
                    [panelSide]: 0,
                    width: `${panelWidth}px`,
                    height: '100%',
                    backgroundColor: panelBgColor,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '20px',
                    zIndex: 1001,
                    overflowY: 'auto',
                    ...(panelBorderEnabled ? {
                      [panelSide === 'right' ? 'borderLeft' : 'borderRight']: `1px solid ${panelBorderColor}`,
                    } : {}),
                    ...(panelShadow ? {
                      boxShadow: panelSide === 'right'
                        ? '-4px 0 16px rgba(0,0,0,0.1)'
                        : '4px 0 16px rgba(0,0,0,0.1)',
                    } : {}),
                    ...getTransitionStyle(verticalMenuOpen),
                  };

                   const overlayStyle: React.CSSProperties = {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: panelOverlayColor,
                    opacity: verticalMenuOpen ? panelOverlayOpacity : 0,
                    transition: `opacity ${panelAnimationDuration}ms ease-in-out`,
                    zIndex: 1000,
                    pointerEvents: verticalMenuOpen ? 'auto' : 'none',
                  };

                  // Render the configurable hamburger icon
                  const renderHamburgerIcon = () => {
                    const menuIconName = props.menuIcon || '';
                    const menuIconSize = props.menuIconSize || 24;
                    const menuIconColor = props.menuIconColor || 'currentColor';
                    if (menuIconName) {
                      const IconsaxComp = (Iconsax as any)[menuIconName];
                      if (IconsaxComp) return <IconsaxComp size={menuIconSize} color={menuIconColor} variant={props.menuIconVariant || 'Linear'} />;
                      const LucideComp = (LucideIcons as any)[menuIconName];
                      if (LucideComp) return <LucideComp size={menuIconSize} color={menuIconColor} />;
                    }
                    // Default hamburger SVG
                    return (
                      <svg width={menuIconSize} height={menuIconSize} viewBox="0 0 24 24" fill="none" stroke={menuIconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                      </svg>
                    );
                  };

                  // Link item padding & radius
                  const linkPaddingV = props.panelLinkPaddingV || 10;
                  const linkPaddingH = props.panelLinkPaddingH || 12;
                  const linkRadius = props.panelLinkRadius || 8;

                  return (
                    <>
                      {/* Hamburger toggle bar — always visible when closed */}
                      {!verticalMenuOpen && (
                        <div style={{ display: 'flex', justifyContent: positionAlign, padding: '12px 16px', width: '100%' }}>
                          <button
                            onClick={() => setVerticalMenuOpen(true)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '8px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'background-color 0.2s ease',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.06)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                            aria-label="Open menu"
                          >
                            {renderHamburgerIcon()}
                          </button>
                        </div>
                      )}

                       {/* Overlay + Sidebar panel portaled to canvas container */}
                      {(() => {
                        const canvasEl = document.querySelector('[data-canvas-container]');
                        if (!canvasEl) return null;
                        return createPortal(
                          <>
                            {panelOverlay && (verticalMenuOpen || panelAnimation !== 'none') && (
                              <div
                                style={overlayStyle}
                                onClick={() => setVerticalMenuOpen(false)}
                              />
                            )}
                            {(verticalMenuOpen || panelAnimation !== 'none') && (
                              <div style={panelStyle}>
                                {/* Panel header: close button */}
                                <div style={{
                                  display: 'flex',
                                  justifyContent: closeBtnAlign,
                                  alignItems: 'center',
                                  paddingBottom: '12px',
                                  marginBottom: '8px',
                                  borderBottom: '1px solid rgba(0,0,0,0.08)',
                                }}>
                                  <button
                                    onClick={() => setVerticalMenuOpen(false)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '6px',
                                      borderRadius: '6px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'background-color 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.06)'; }}
                                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                                    aria-label="Close menu"
                                  >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <line x1="18" y1="6" x2="6" y2="18" />
                                      <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                  </button>
                                </div>
                                {/* Nav items with enhanced styling */}
                                <div data-nav-el="link-div" style={{ display: 'flex', flexDirection: 'column', gap: `${linkGap}px`, flex: 1 }}>
                                  {wrappedChildren.map((child: AppComponent, childIndex: number) => {
                                    const isLink = child.props?._navRole === 'link';
                                    const isDropdownItem = child.props?._navRole === 'dropdown';
                                    const navIcon = isLink ? renderVerticalNavIcon(child) : null;
                                    const isLogo = child.props?._navRole === 'logo' || child.props?._navRole === 'secondary-logo';

                                    if (isLogo) {
                                      return (
                                        <div key={child.id} data-nav-el="logo-container" style={{ padding: '4px 0', marginBottom: '8px' }}>
                                          <ComponentRenderer component={withInheritedDataContext(child)} isPreview={isPreview} parentId={component.id} index={childIndex} />
                                        </div>
                                      );
                                    }

                                    if (isDropdownItem) {
                                      const dropdownLabel = child.props?._navLabel || 'Menu';
                                      const isDropOpen = openDropdownId === child.id;
                                      const subItems = child.children || [];
                                      return (
                                        <div key={child.id} data-dropdown-id={child.id}>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); toggleDropdown(child.id); }}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              width: '100%',
                                              background: 'none',
                                              border: 'none',
                                              cursor: 'pointer',
                                              padding: `${linkPaddingV}px ${linkPaddingH}px`,
                                              borderRadius: `${linkRadius}px`,
                                              font: 'inherit',
                                              color: 'inherit',
                                              fontSize: 'inherit',
                                              fontWeight: 'inherit',
                                              transition: 'background-color 0.2s ease',
                                            }}
                                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.05)'; }}
                                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                                          >
                                            <span>{dropdownLabel}</span>
                                            <ChevronDown style={{ width: '14px', height: '14px', transition: 'transform 200ms ease', transform: isDropOpen ? 'rotate(180deg)' : 'rotate(0deg)', opacity: 0.5 }} />
                                          </button>
                                          {isDropOpen && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: `${linkPaddingH + 8}px`, marginTop: '2px' }}>
                                              {subItems.map((sub: AppComponent, si: number) => (
                                                <div
                                                  key={sub.id}
                                                  style={{ padding: `${linkPaddingV - 2}px ${linkPaddingH}px`, borderRadius: `${linkRadius}px`, cursor: 'pointer', transition: 'background-color 150ms ease' }}
                                                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.05)'; }}
                                                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                                                >
                                                  <ComponentRenderer component={withInheritedDataContext(sub)} isPreview={isPreview} parentId={child.id} index={si} />
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }

                                    return (
                                      <div
                                        key={child.id}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '10px',
                                          padding: `${linkPaddingV}px ${linkPaddingH}px`,
                                          borderRadius: `${linkRadius}px`,
                                          transition: 'background-color 0.2s ease',
                                          cursor: isLink ? 'pointer' : undefined,
                                        }}
                                        onMouseEnter={(e) => {
                                          if (isLink) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                          if (isLink) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                                        }}
                                      >
                                        {navIcon && (
                                          <span style={{ opacity: 0.7, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                            {navIcon}
                                          </span>
                                        )}
                                        <ComponentRenderer component={withInheritedDataContext(child)} isPreview={isPreview} parentId={component.id} index={childIndex} />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </>,
                          canvasEl
                        );
                      })()}
                    </>
                  );
                })()
              )
            ) : hasConfiguredLinks && isHorizontalNav ? (
              <div className="flex items-center" style={{ gap: `${linkGap}px` }}>
                {navLinks.map((link: { href?: string; text?: string; label?: string }, idx: number) => (
                  <a key={idx} href={link.href || '#'} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    {link.text || link.label || 'Link'}
                  </a>
                ))}
              </div>
            ) : (
              // Empty state: show hamburger for vertical nav, placeholder for horizontal
              !isPreview && (
                isHorizontalNav ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded-lg py-2 px-4">
                    Drop elements here (logo, links, buttons...)
                  </div>
                ) : (
                  (() => {
                    const positionAlign = menuPosition === 'center' ? 'center' : menuPosition === 'right' ? 'flex-end' : 'flex-start';
                    const panelBgColor = props.panelBgColor || '#ffffff';
                    const panelWidth = props.panelWidth || 280;
                    const panelOverlay = props.panelOverlay !== false;
                    const panelOverlayColor = props.panelOverlayColor || '#000000';
                    const panelOverlayOpacity = props.panelOverlayOpacity ?? 0.4;
                    const panelAnimation = props.panelAnimation || 'slide';
                    const panelAnimationDuration = props.panelAnimationDuration || 300;
                    const panelBorderEnabled = props.panelBorderEnabled === true;
                    const panelBorderColor = props.panelBorderColor || '#e5e7eb';
                    const panelShadow = props.panelShadow !== false;
                    const panelSide = menuPosition === 'right' ? 'right' : 'left';
                    const closeBtnAlign = panelSide === 'right' ? 'flex-start' : 'flex-end';

                    const getTransitionStyle = (isOpen: boolean): React.CSSProperties => {
                      const dur = `${panelAnimationDuration}ms`;
                      if (panelAnimation === 'slide') {
                        return {
                          transform: isOpen ? 'translateX(0)' : (panelSide === 'right' ? 'translateX(100%)' : 'translateX(-100%)'),
                          transition: `transform ${dur} ease-in-out`,
                        };
                      }
                      if (panelAnimation === 'fade') {
                        return { opacity: isOpen ? 1 : 0, transition: `opacity ${dur} ease-in-out` };
                      }
                      return {};
                    };

                    // Render the configurable hamburger icon (empty state)
                    const renderEmptyHamburgerIcon = () => {
                      const menuIconName = props.menuIcon || '';
                      const menuIconSize = props.menuIconSize || 24;
                      const menuIconColor = props.menuIconColor || 'currentColor';
                      if (menuIconName) {
                        const IconsaxComp = (Iconsax as any)[menuIconName];
                        if (IconsaxComp) return <IconsaxComp size={menuIconSize} color={menuIconColor} variant={props.menuIconVariant || 'Linear'} />;
                        const LucideComp = (LucideIcons as any)[menuIconName];
                        if (LucideComp) return <LucideComp size={menuIconSize} color={menuIconColor} />;
                      }
                      return (
                        <svg width={menuIconSize} height={menuIconSize} viewBox="0 0 24 24" fill="none" stroke={menuIconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="3" y1="6" x2="21" y2="6" />
                          <line x1="3" y1="12" x2="21" y2="12" />
                          <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                      );
                    };

                    return (
                      <>
                        {!verticalMenuOpen && (
                          <div style={{ display: 'flex', justifyContent: positionAlign, padding: '12px 16px', width: '100%' }}>
                            <button
                              onClick={() => setVerticalMenuOpen(true)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background-color 0.2s ease',
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.06)'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                              aria-label="Open menu"
                            >
                              {renderEmptyHamburgerIcon()}
                            </button>
                          </div>
                        )}
                        {(() => {
                          const canvasEl = document.querySelector('[data-canvas-container]');
                          if (!canvasEl) return null;
                          return createPortal(
                            <>
                              {panelOverlay && (verticalMenuOpen || panelAnimation !== 'none') && (
                                <div
                                  style={{
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                    backgroundColor: panelOverlayColor,
                                    opacity: verticalMenuOpen ? panelOverlayOpacity : 0,
                                    transition: `opacity ${panelAnimationDuration}ms ease-in-out`,
                                    zIndex: 1000,
                                    pointerEvents: verticalMenuOpen ? 'auto' : 'none',
                                  }}
                                  onClick={() => setVerticalMenuOpen(false)}
                                />
                              )}
                              {(verticalMenuOpen || panelAnimation !== 'none') && (
                                <div style={{
                                  position: 'absolute', top: 0, [panelSide]: 0,
                                  width: `${panelWidth}px`, height: '100%',
                                  backgroundColor: panelBgColor,
                                  display: 'flex', flexDirection: 'column', padding: '20px',
                                  zIndex: 1001, overflowY: 'auto',
                                  ...(panelBorderEnabled ? { [panelSide === 'right' ? 'borderLeft' : 'borderRight']: `1px solid ${panelBorderColor}` } : {}),
                                  ...(panelShadow ? { boxShadow: panelSide === 'right' ? '-4px 0 16px rgba(0,0,0,0.1)' : '4px 0 16px rgba(0,0,0,0.1)' } : {}),
                                  ...getTransitionStyle(verticalMenuOpen),
                                }}>
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: closeBtnAlign,
                                    alignItems: 'center',
                                    paddingBottom: '12px',
                                    marginBottom: '8px',
                                    borderBottom: '1px solid rgba(0,0,0,0.08)',
                                  }}>
                                    <button
                                      onClick={() => setVerticalMenuOpen(false)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '6px',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'background-color 0.2s ease',
                                      }}
                                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.06)'; }}
                                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                                      aria-label="Close menu"
                                    >
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                      </svg>
                                    </button>
                                  </div>
                                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded-lg py-4 px-4">
                                    Drop elements here (logo, links, buttons...)
                                  </div>
                                </div>
                              )}
                            </>,
                            canvasEl
                          );
                        })()}
                      </>
                    );
                  })()
                )
              )
            )}
            {isOver && !isPreview && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg pointer-events-none" />
            )}
          </nav>
        );
      }

      case 'accordion':
        // Check if we have children-based items (new architecture) or props.items (legacy)
        const hasAccordionChildren = component.children && component.children.length > 0 && 
          component.children.some(c => c.type === 'accordion-item');
        
        // Get items from children or legacy props
        const accordionItemsRaw = hasAccordionChildren 
          ? component.children!.filter(c => c.type === 'accordion-item').map(item => ({
              id: item.id,
              title: item.props?.title || item.children?.find(c => c.type === 'accordion-header')?.props?.content || 'Section',
              icon: item.props?.icon || '',
              content: item.children?.find(c => c.type === 'accordion-content')?.props?.content || 'Content...',
              headerComponent: item.children?.find(c => c.type === 'accordion-header'),
              contentComponent: item.children?.find(c => c.type === 'accordion-content'),
              itemComponent: item
            }))
          : (() => {
            try {
              if (Array.isArray(props.items)) return props.items;
              return typeof props.items === 'string' ? JSON.parse(props.items) : [{ id: 'item-1', title: 'Section 1', icon: '', content: 'Content for section 1' }];
            } catch { return [{ id: 'item-1', title: 'Section 1', icon: '', content: 'Content for section 1' }]; }
          })();
        
        // State for open items - using component state
        const [openAccordionItems, setOpenAccordionItems] = useState<string[]>(() => {
          const defaultVal = props.defaultValue || accordionItemsRaw[0]?.id;
          return defaultVal ? [defaultVal] : [];
        });
        
        const toggleAccordionItem = (itemId: string) => {
          if (props.type === 'multiple') {
            setOpenAccordionItems(prev => 
              prev.includes(itemId) 
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId]
            );
          } else {
            // Single mode
            setOpenAccordionItems(prev => {
              if (prev.includes(itemId)) {
                return props.collapsible !== false ? [] : prev;
              }
              return [itemId];
            });
          }
        };
        
        const getAccordionItemClasses = () => {
          const base = "overflow-hidden transition-all";
          switch (props.variant) {
            case 'boxed':
              return cn(base, "border rounded-lg shadow-sm bg-card");
            case 'flush':
              return cn(base, "border-b last:border-b-0");
            case 'separated':
              return cn(base, "border rounded-lg bg-card");
            case 'minimal':
              return cn(base, "border-b border-border/50");
            case 'elevated':
              return cn(base, "border rounded-lg shadow-md bg-card hover:shadow-lg");
            case 'outlined':
              return cn(base, "border-2 rounded-lg");
            case 'ghost':
              return cn(base, "rounded-lg hover:bg-muted/50");
            default:
              return cn(base, props.bordered !== false && "border rounded-lg");
          }
        };

        const getAccordionWrapperClasses = () => {
          const isHorizontal = props.orientation === 'horizontal';
          switch (props.variant) {
            case 'separated':
            case 'elevated':
              return isHorizontal ? 'flex flex-row gap-3' : 'space-y-3';
            case 'flush':
            case 'minimal':
              return isHorizontal ? 'flex flex-row' : '';
            case 'ghost':
              return isHorizontal ? 'flex flex-row gap-1' : 'space-y-1';
            default:
              return isHorizontal 
                ? `flex flex-row ${props.separated !== false ? 'gap-2' : ''}` 
                : (props.separated !== false ? 'space-y-2' : '');
          }
        };
        
        const isHorizontalAccordion = props.orientation === 'horizontal';

        // Helper to render accordion icon
        const renderAccordionIcon = (iconName: string) => {
          if (!iconName || !props.showIcons) return null;
          const IconComponent = (LucideIcons as any)[iconName] || (Iconsax as any)[iconName];
          if (!IconComponent) return null;
          return <IconComponent className="h-4 w-4 mr-2" />;
        };

        const animDuration = props.animationDuration || 200;
        const animEasing = props.easing || 'ease';
        
        // Direction-based layout (content position: left, right, or default below)
        const accordionContentDirection = props.direction || 'default';
        const isAccordionContentSide = accordionContentDirection === 'left' || accordionContentDirection === 'right';
        
        // Render accordion headers (triggers) list
        const renderAccordionHeaders = () => (
          <div className={cn(
            isAccordionContentSide ? 'flex flex-col shrink-0' : getAccordionWrapperClasses()
          )}>
            {accordionItemsRaw.map((item: any, idx: number) => {
              const isOpen = openAccordionItems.includes(item.id);
              const activeColorResolved = getColorValue(props.activeColor);
              const hasCustomColor = activeColorResolved && activeColorResolved !== '';
              
              const getActiveHeaderStyle = () => {
                if (!isOpen || !hasCustomColor) return {};
                return { backgroundColor: `${activeColorResolved}15`, color: activeColorResolved };
              };
              
              if (isAccordionContentSide) {
                // Side layout: just render the header buttons vertically
                return (
                  <button 
                    key={item.id || idx}
                    onClick={() => toggleAccordionItem(item.id)}
                    className={cn(
                      getAccordionItemClasses(),
                      "flex items-center font-medium hover:bg-muted/50 transition-colors text-left w-full justify-between p-4",
                      props.iconPosition === 'left' && "flex-row-reverse"
                    )}
                    style={{
                      ...getActiveHeaderStyle(),
                      ...(isOpen && hasCustomColor ? { borderColor: activeColorResolved } : {})
                    }}
                  >
                    <span className="flex items-center">
                      {renderAccordionIcon(item.icon)}
                      {item.title || `Section ${idx + 1}`}
                    </span>
                    <ChevronRight 
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform",
                        isOpen && "rotate-90"
                      )} 
                      style={{ 
                        transitionDuration: `${animDuration}ms`, 
                        transitionTimingFunction: animEasing,
                        ...(isOpen && hasCustomColor ? { color: activeColorResolved } : {})
                      }} 
                    />
                  </button>
                );
              }
              
              // Default layout: header + collapsible content together
              return (
                <div 
                  key={item.id || idx} 
                  className={cn(
                    getAccordionItemClasses(),
                    isHorizontalAccordion && "flex flex-row"
                  )}
                  style={isOpen && hasCustomColor ? { borderColor: activeColorResolved } : {}}
                >
                  <button 
                    onClick={() => toggleAccordionItem(item.id)}
                    className={cn(
                      "flex items-center font-medium hover:bg-muted/50 transition-colors text-left",
                      isHorizontalAccordion 
                        ? "flex-col justify-center p-4 min-w-[120px]" 
                        : "w-full justify-between p-4",
                      props.iconPosition === 'left' && !isHorizontalAccordion && "flex-row-reverse"
                    )}
                    style={getActiveHeaderStyle()}
                  >
                    <span className={cn("flex items-center", isHorizontalAccordion && "mb-2")}>
                      {renderAccordionIcon(item.icon)}
                      {item.title || `Section ${idx + 1}`}
                    </span>
                    {isHorizontalAccordion ? (
                      <ChevronRight 
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform",
                          isOpen && "rotate-90"
                        )} 
                        style={{ 
                          transitionDuration: `${animDuration}ms`, 
                          transitionTimingFunction: animEasing,
                          ...(isOpen && hasCustomColor ? { color: activeColorResolved } : {})
                        }} 
                      />
                    ) : (
                      <ChevronDown 
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform",
                          isOpen && "rotate-180"
                        )} 
                        style={{ 
                          transitionDuration: `${animDuration}ms`, 
                          transitionTimingFunction: animEasing,
                          ...(isOpen && hasCustomColor ? { color: activeColorResolved } : {})
                        }} 
                      />
                    )}
                  </button>
                  <div 
                    className={cn(
                      "overflow-hidden",
                      isHorizontalAccordion 
                        ? (isOpen ? "max-w-[500px] opacity-100" : "max-w-0 opacity-0")
                        : (isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0")
                    )}
                    style={{ 
                      transition: isHorizontalAccordion 
                        ? `max-width ${animDuration}ms ${animEasing}, opacity ${animDuration}ms ${animEasing}` 
                        : `max-height ${animDuration}ms ${animEasing}, opacity ${animDuration}ms ${animEasing}` 
                    }}
                  >
                    <div className={isHorizontalAccordion ? "p-4 min-w-[200px]" : "px-4 pb-4"}>
                      {hasAccordionChildren && item.contentComponent ? (
                        <ComponentRenderer
                          key={item.contentComponent.id}
                          component={withInheritedDataContext(item.contentComponent)}
                          isPreview={isPreview}
                          parentId={item.id}
                          index={1}
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">{item.content || 'Content here...'}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
        
        // Render side content panel (for left/right direction)
        const renderSideContent = () => {
          const openItem = accordionItemsRaw.find((item: any) => openAccordionItems.includes(item.id));
          
          return (
            <div 
              className="flex-1 p-4 border rounded-lg overflow-hidden"
              style={{ 
                transition: `opacity ${animDuration}ms ${animEasing}` 
              }}
            >
              {openItem ? (
                hasAccordionChildren && openItem.contentComponent ? (
                  <ComponentRenderer
                    key={openItem.contentComponent.id}
                    component={withInheritedDataContext(openItem.contentComponent)}
                    isPreview={isPreview}
                    parentId={openItem.id}
                    index={1}
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">{openItem.content || 'Content here...'}</span>
                )
              ) : (
                <span className="text-sm text-muted-foreground">Select a section to view content</span>
              )}
            </div>
          );
        };
        
        return (
          <div {...commonProps} className={cn(
            commonProps.className, 
            'w-full',
            isAccordionContentSide && 'flex gap-4',
            isAccordionContentSide && accordionContentDirection === 'left' && 'flex-row-reverse',
            isAccordionContentSide && accordionContentDirection === 'right' && 'flex-row'
          )}>
            {!isPreview && (
              <ComponentDragHandle componentId={component.id} component={component} parentId={parentId} index={index} isSelected={isSelected} />
            )}
            {isAccordionContentSide ? (
              <>
                {renderAccordionHeaders()}
                {renderSideContent()}
              </>
            ) : (
              renderAccordionHeaders()
            )}
          </div>
        );

      case 'accordion-item':
        // Accordion item - render its children (header + content)
        return (
          <div
            {...commonProps}
            ref={dropRef}
            className={cn(commonProps.className, 'relative')}
          >
            {!isPreview && (
              <ComponentDragHandle componentId={component.id} component={component} parentId={parentId} index={index} isSelected={isSelected} />
            )}
            {Array.isArray(component.children) && component.children.map((child, idx) => (
              <ComponentRenderer
                key={child.id}
                component={withInheritedDataContext(child)}
                isPreview={isPreview}
                parentId={component.id}
                index={idx}
              />
            ))}
            {isOver && !isPreview && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded pointer-events-none" />
            )}
          </div>
        );

      case 'accordion-header':
        // Accordion header - just show the title content
        return (
          <div {...commonProps} className={cn(commonProps.className, 'font-medium')}>
            {!isPreview && (
              <ComponentDragHandle componentId={component.id} component={component} parentId={parentId} index={index} isSelected={isSelected} />
            )}
            {props.content || 'Header'}
          </div>
        );

      case 'accordion-content':
        // Accordion content - this is a droppable area
        return (
          <div 
            {...commonProps} 
            className={cn(commonProps.className, 'relative min-h-[40px]')}
            ref={dropRef}
          >
            {!isPreview && (
              <ComponentDragHandle componentId={component.id} component={component} parentId={parentId} index={index} isSelected={isSelected} />
            )}
            {Array.isArray(component.children) && component.children.length > 0 ? (
              component.children.map((child, idx) => (
                <ComponentRenderer
                  key={child.id}
                  component={withInheritedDataContext(child)}
                  isPreview={isPreview}
                  parentId={component.id}
                  index={idx}
                />
              ))
            ) : (
              !isPreview && (
                <div className="text-xs text-muted-foreground text-center py-2 border border-dashed border-muted rounded">
                  Drop elements here
                </div>
              )
            )}
            {isOver && !isPreview && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded pointer-events-none" />
            )}
          </div>
        );

      case 'calendar':
        // Parse settings
        const calendarWeekStartsOn = parseInt(props.weekStartsOn || '0') as 0 | 1 | 2 | 3 | 4 | 5 | 6;
        const calendarDefaultMonth = props.defaultMonth ? new Date(props.defaultMonth + '-01') : undefined;
        const calendarMinDate = props.minDate ? new Date(props.minDate) : undefined;
        const calendarMaxDate = props.maxDate ? new Date(props.maxDate) : undefined;
        
        // State for selected date(s)
        const [calendarSelected, setCalendarSelected] = useState<Date | Date[] | undefined>();
        
        // Parse disabled dates
        const disabledCalendarDates = useMemo(() => {
          try {
            const dates = JSON.parse(props.disabledDates || '[]');
            return dates.map((d: string) => new Date(d));
          } catch { return []; }
        }, [props.disabledDates]);
        
        // Disable logic
        const isDateDisabled = (date: Date) => {
          if (calendarMinDate && date < calendarMinDate) return true;
          if (calendarMaxDate && date > calendarMaxDate) return true;
          return disabledCalendarDates.some((d: Date) => d.toDateString() === date.toDateString());
        };
        
        // Import Calendar dynamically to avoid SSR issues
        const CalendarComponent = React.lazy(() => import('@/components/ui/calendar').then(m => ({ default: m.Calendar })));
        
        return (
          <div {...commonProps} className={cn(commonProps.className, 'inline-block')}>
            {!isPreview && (
              <ComponentDragHandle componentId={component.id} component={component} parentId={parentId} index={index} isSelected={isSelected} />
            )}
            <React.Suspense fallback={<div className="p-4 border rounded-md">Loading calendar...</div>}>
              <CalendarComponent
                mode={props.mode === 'range' ? 'range' : props.mode === 'multiple' ? 'multiple' : 'single'}
                selected={calendarSelected as any}
                onSelect={setCalendarSelected as any}
                defaultMonth={calendarDefaultMonth}
                weekStartsOn={calendarWeekStartsOn}
                showOutsideDays={props.showOutsideDays !== false}
                fixedWeeks={props.fixedWeeks === true}
                numberOfMonths={props.numberOfMonths || 1}
                disabled={isDateDisabled}
                className="rounded-md border pointer-events-auto"
              />
            </React.Suspense>
          </div>
        );

      case 'datepicker':
        // State for the popover and selected date
        const [datePickerOpen, setDatePickerOpen] = useState(false);
        const [selectedDate, setSelectedDate] = useState<Date | undefined>();
        
        // Parse date constraints
        const dpMinDate = props.minDate ? new Date(props.minDate) : undefined;
        const dpMaxDate = props.maxDate ? new Date(props.maxDate) : undefined;
        
        // Disable logic
        const isDatePickerDateDisabled = (date: Date) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (props.disablePastDates && date < today) return true;
          if (props.disableFutureDates && date > today) return true;
          if (dpMinDate && date < dpMinDate) return true;
          if (dpMaxDate && date > dpMaxDate) return true;
          return false;
        };
        
        // Format date for display
        const formatDateDisplay = (date: Date | undefined) => {
          if (!date) return props.placeholder || 'Pick a date';
          try {
            const { format } = require('date-fns');
            return format(date, props.format || 'PPP');
          } catch {
            return date.toLocaleDateString();
          }
        };
        
        // Import components
        const PopoverComponent = React.lazy(() => import('@/components/ui/popover').then(m => ({ default: m.Popover })));
        const PopoverTriggerComponent = React.lazy(() => import('@/components/ui/popover').then(m => ({ default: m.PopoverTrigger })));
        const PopoverContentComponent = React.lazy(() => import('@/components/ui/popover').then(m => ({ default: m.PopoverContent })));
        const CalendarForPicker = React.lazy(() => import('@/components/ui/calendar').then(m => ({ default: m.Calendar })));
        
        return (
          <div {...commonProps} className={cn(commonProps.className, 'flex flex-col gap-2')}>
            {!isPreview && (
              <ComponentDragHandle componentId={component.id} component={component} parentId={parentId} index={index} isSelected={isSelected} />
            )}
            {props.label && <Label>{props.label}</Label>}
            <React.Suspense fallback={<Button variant="outline" disabled><CalendarIcon className="mr-2 h-4 w-4" />Loading...</Button>}>
              <PopoverComponent open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTriggerComponent asChild>
                  <Button 
                    variant="outline" 
                    disabled={props.disabled}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDateDisplay(selectedDate)}
                    {props.clearable && selectedDate && (
                      <span 
                        className="ml-auto hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(undefined);
                        }}
                      >
                        ×
                      </span>
                    )}
                  </Button>
                </PopoverTriggerComponent>
                <PopoverContentComponent className="w-auto p-0" align="start">
                  <CalendarForPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date: Date | undefined) => {
                      setSelectedDate(date);
                      if (props.closeOnSelect !== false && date) {
                        setDatePickerOpen(false);
                      }
                    }}
                    disabled={isDatePickerDateDisabled}
                    className="pointer-events-auto"
                    initialFocus
                  />
                  {props.showTodayButton && (
                    <div className="border-t p-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          setSelectedDate(new Date());
                          if (props.closeOnSelect !== false) {
                            setDatePickerOpen(false);
                          }
                        }}
                      >
                        Today
                      </Button>
                    </div>
                  )}
                </PopoverContentComponent>
              </PopoverComponent>
            </React.Suspense>
          </div>
        );

      case 'tabs':
        // Check if we have children-based items (new architecture) or props.items (legacy)
        const hasTabChildren = component.children && component.children.length > 0 && 
          component.children.some(c => c.type === 'tab-item');
        
        // Get items from children or legacy props
        const tabItemsRaw = hasTabChildren 
          ? component.children!.filter(c => c.type === 'tab-item').map(item => ({
              id: item.id,
              label: item.props?.label || item.children?.find(c => c.type === 'tab-trigger')?.props?.content || 'Tab',
              icon: item.props?.icon || '',
              badge: item.props?.badge || '',
              content: item.children?.find(c => c.type === 'tab-content')?.props?.content || 'Content...',
              triggerComponent: item.children?.find(c => c.type === 'tab-trigger'),
              contentComponent: item.children?.find(c => c.type === 'tab-content'),
              itemComponent: item
            }))
          : (() => {
            try {
              if (Array.isArray(props.items)) return props.items;
              return typeof props.items === 'string' ? JSON.parse(props.items) : [{ id: 'tab-1', label: 'Tab 1', icon: '', badge: '', content: 'Content 1' }];
            } catch { return [{ id: 'tab-1', label: 'Tab 1', icon: '', badge: '', content: 'Content 1' }]; }
          })();
        
        const [activeTabState, setActiveTabState] = useState(props.defaultValue || tabItemsRaw[0]?.id);
        
        // Helper to render icon
        const renderTabIcon = (iconName: string) => {
          if (!iconName || !props.showIcons) return null;
          const IconComponent = (LucideIcons as any)[iconName] || (Iconsax as any)[iconName];
          if (!IconComponent) return null;
          return <IconComponent className="h-4 w-4" />;
        };
        
        const getTabTriggerClasses = (tabId: string) => {
          const isActive = tabId === activeTabState;
          const baseClasses = "px-4 py-2 text-sm font-medium transition-all focus:outline-none";
          
          switch (props.variant) {
            case 'pills':
              return cn(
                baseClasses,
                "rounded-full",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              );
            case 'pills-outline':
              return cn(
                baseClasses,
                "rounded-full border-2",
                isActive 
                  ? "border-primary text-primary bg-primary/5" 
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              );
            case 'underline':
              return cn(
                baseClasses,
                isActive 
                  ? "border-b-2 border-primary text-primary" 
                  : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
              );
            case 'underline-bold':
              return cn(
                baseClasses,
                isActive 
                  ? "border-b-[3px] border-primary text-foreground font-semibold" 
                  : "text-muted-foreground hover:text-foreground border-b-[3px] border-transparent"
              );
            case 'boxed':
              return cn(
                baseClasses,
                "rounded-md border",
                isActive 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted border-border"
              );
            case 'segmented':
              return cn(
                baseClasses,
                "rounded-md",
                isActive 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              );
            case 'segmented-rounded':
              return cn(
                baseClasses,
                "rounded-xl",
                isActive 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              );
            case 'minimal':
              return cn(
                baseClasses,
                isActive 
                  ? "text-foreground font-semibold" 
                  : "text-muted-foreground hover:text-foreground"
              );
            case 'cards':
              return cn(
                baseClasses,
                "rounded-lg",
                isActive 
                  ? "bg-background shadow-md text-foreground border border-border" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              );
            default:
              return cn(
                baseClasses,
                "rounded-t-lg",
                isActive 
                  ? "bg-background border border-b-0 text-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              );
          }
        };
        
        const getTabsListClasses = () => {
          const baseListClasses = cn(
            "flex",
            props.orientation === 'vertical' ? "flex-col w-fit" : "flex-row",
            props.fullWidth && props.orientation !== 'vertical' && "w-full"
          );
          
          switch (props.variant) {
            case 'pills':
            case 'pills-outline':
              return cn(baseListClasses, "gap-1");
            case 'underline':
            case 'underline-bold':
              return cn(baseListClasses, "border-b");
            case 'boxed':
              return cn(baseListClasses, "gap-2 p-1 bg-muted/30 rounded-lg");
            case 'segmented':
              return cn(baseListClasses, "p-1 bg-muted rounded-lg gap-1");
            case 'segmented-rounded':
              return cn(baseListClasses, "p-1.5 bg-muted rounded-2xl gap-1");
            case 'cards':
              return cn(baseListClasses, "gap-2 p-1");
            case 'minimal':
              return cn(baseListClasses, "gap-4");
            default:
              return cn(baseListClasses, "border-b");
          }
        };
        
        const getContentClasses = () => {
          const baseContentClasses = "p-4";
          
          switch (props.variant) {
            case 'pills':
            case 'pills-outline':
            case 'segmented':
            case 'segmented-rounded':
            case 'boxed':
            case 'cards':
            case 'minimal':
              return cn(baseContentClasses, "mt-2");
            case 'underline':
            case 'underline-bold':
              return baseContentClasses;
            default:
              return cn(
                baseContentClasses,
                props.orientation === 'vertical' && "border-l ml-0",
                props.orientation !== 'vertical' && "border border-t-0 rounded-b-lg"
              );
          }
        };
        
        const animationStyle = {
          transition: `opacity ${props.animationDuration || 200}ms ${props.easing || 'ease'}`
        };
        
        // Determine layout based on direction
        const tabsContentDirection = props.direction || 'default';
        const isTabsContentSide = tabsContentDirection === 'left' || tabsContentDirection === 'right';
        
        const getWrapperClasses = () => {
          if (isTabsContentSide) {
            return cn(
              'flex',
              tabsContentDirection === 'left' ? 'flex-row-reverse' : 'flex-row',
              'gap-4'
            );
          }
          return '';
        };
        
        const getListWrapperClasses = () => {
          if (isTabsContentSide) {
            return cn(getTabsListClasses(), 'flex-col shrink-0');
          }
          return getTabsListClasses();
        };
        
        const getSideContentClasses = () => {
          if (isTabsContentSide) {
            return cn('flex-1 p-4 border rounded-lg');
          }
          return getContentClasses();
        };
        
        return (
          <div {...commonProps} className={cn(commonProps.className, 'w-full')}>
            {!isPreview && (
              <ComponentDragHandle componentId={component.id} component={component} parentId={parentId} index={index} isSelected={isSelected} />
            )}
            <div className={getWrapperClasses()}>
              <div className={getListWrapperClasses()}>
                {tabItemsRaw.map((tab: any) => {
                  const isActive = tab.id === activeTabState;
                  const activeColorResolved = getColorValue(props.activeColor);
                  const hasCustomColor = activeColorResolved && activeColorResolved !== '';
                  
                  // Build inline style for custom active color
                  const getActiveStyle = () => {
                    if (!isActive || !hasCustomColor) return {};
                    const variant = props.variant || 'default';
                    
                    // Apply color based on variant type
                    if (['pills', 'boxed'].includes(variant)) {
                      return { backgroundColor: activeColorResolved, borderColor: activeColorResolved, color: '#fff' };
                    } else if (['pills-outline'].includes(variant)) {
                      return { borderColor: activeColorResolved, color: activeColorResolved, backgroundColor: `${activeColorResolved}10` };
                    } else if (['underline', 'underline-bold'].includes(variant)) {
                      return { borderColor: activeColorResolved, color: activeColorResolved };
                    } else {
                      return { color: activeColorResolved };
                    }
                  };
                  
                  return (
                    <button 
                      key={tab.id} 
                      onClick={() => setActiveTabState(tab.id)}
                      className={cn(
                        getTabTriggerClasses(tab.id),
                        props.fullWidth && props.orientation !== 'vertical' && !isTabsContentSide && "flex-1",
                        isTabsContentSide && "w-full justify-start"
                      )}
                      style={getActiveStyle()}
                    >
                      <span className={cn(
                        "flex items-center gap-2",
                        props.iconPosition === 'top' && "flex-col gap-1"
                      )}>
                        {props.showIcons && props.iconPosition !== 'right' && renderTabIcon(tab.icon)}
                        <span>{tab.label}</span>
                        {props.showIcons && props.iconPosition === 'right' && renderTabIcon(tab.icon)}
                        {props.showBadges && tab.badge && (
                          <Badge 
                            variant={isActive ? "default" : "secondary"} 
                            className="text-[10px] px-1.5 py-0 h-4 min-w-[16px] ml-1"
                            style={isActive && hasCustomColor ? { backgroundColor: activeColorResolved } : {}}
                          >
                            {tab.badge}
                          </Badge>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className={getSideContentClasses()} style={animationStyle}>
                {props.destroyInactive 
                  ? (() => {
                      const activeTab = tabItemsRaw.find((t: any) => t.id === activeTabState);
                      if (hasTabChildren && activeTab?.contentComponent) {
                        // Render the tab-content component through ComponentRenderer for drop zone support
                        return (
                          <ComponentRenderer
                            key={activeTab.contentComponent.id}
                            component={withInheritedDataContext(activeTab.contentComponent)}
                            isPreview={isPreview}
                            parentId={activeTab.id}
                            index={1}
                          />
                        );
                      }
                      return <span className="text-sm text-muted-foreground">{activeTab?.content || 'Tab content'}</span>;
                    })()
                  : tabItemsRaw.map((t: any) => (
                      <div key={t.id} className={t.id === activeTabState ? 'block' : 'hidden'}>
                        {hasTabChildren && t.contentComponent ? (
                          // Render the tab-content component through ComponentRenderer for drop zone support
                          <ComponentRenderer
                            key={t.contentComponent.id}
                            component={withInheritedDataContext(t.contentComponent)}
                            isPreview={isPreview}
                            parentId={t.id}
                            index={1}
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">{t.content || 'Tab content'}</span>
                        )}
                      </div>
                    ))
                }
              </div>
            </div>
          </div>
        );

      case 'tab-item':
        // Tab item - render its children (trigger + content)
        return (
          <div
            {...commonProps}
            ref={dropRef}
            className={cn(commonProps.className, 'relative')}
          >
            {!isPreview && (
              <ComponentDragHandle componentId={component.id} component={component} parentId={parentId} index={index} isSelected={isSelected} />
            )}
            {Array.isArray(component.children) && component.children.map((child, idx) => (
              <ComponentRenderer
                key={child.id}
                component={withInheritedDataContext(child)}
                isPreview={isPreview}
                parentId={component.id}
                index={idx}
              />
            ))}
            {isOver && !isPreview && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded pointer-events-none" />
            )}
          </div>
        );

      case 'tab-trigger':
        // Tab trigger - just show the tab label
        return (
          <div {...commonProps} className={cn(commonProps.className, 'font-medium')}>
            {!isPreview && (
              <ComponentDragHandle componentId={component.id} component={component} parentId={parentId} index={index} isSelected={isSelected} />
            )}
            {props.content || 'Tab'}
          </div>
        );

      case 'tab-content':
        // Tab content - this is a droppable area
        return (
          <div 
            {...commonProps} 
            className={cn(commonProps.className, 'relative min-h-[40px]')}
            ref={dropRef}
          >
            {!isPreview && (
              <ComponentDragHandle componentId={component.id} component={component} parentId={parentId} index={index} isSelected={isSelected} />
            )}
            {Array.isArray(component.children) && component.children.length > 0 ? (
              component.children.map((child, idx) => (
                <ComponentRenderer
                  key={child.id}
                  component={withInheritedDataContext(child)}
                  isPreview={isPreview}
                  parentId={component.id}
                  index={idx}
                />
              ))
            ) : (
              !isPreview && (
                <div className="text-xs text-muted-foreground text-center py-2 border border-dashed border-muted rounded">
                  Drop elements here
                </div>
              )
            )}
            {isOver && !isPreview && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded pointer-events-none" />
            )}
          </div>
        );

      // ============================================
      // CAROUSEL / SLIDER COMPONENT
      // ============================================
      case 'carousel':
        // Check if we have children-based slides (new architecture) or props.items (legacy)
        const hasCarouselChildren = component.children && component.children.length > 0 && 
          component.children.some(c => c.type === 'carousel-slide');
        
        // Get slides from children or legacy props
        const carouselSlidesRaw = hasCarouselChildren 
          ? component.children!.filter(c => c.type === 'carousel-slide').map(slide => ({
              id: slide.id,
              label: slide.props?.label || 'Slide',
              content: slide.children?.find(c => c.type === 'carousel-slide-content')?.props?.content || 'Content...',
              contentComponent: slide.children?.find(c => c.type === 'carousel-slide-content'),
              slideComponent: slide
            }))
          : (() => {
            try {
              if (Array.isArray(props.items)) return props.items;
              return typeof props.items === 'string' ? JSON.parse(props.items) : [{ id: 'slide-1', label: 'Slide 1', content: 'Content 1' }];
            } catch { return [{ id: 'slide-1', label: 'Slide 1', content: 'Content 1' }]; }
          })();
        
        const [activeSlideIndex, setActiveSlideIndex] = useState(0);
        const [isAnimating, setIsAnimating] = useState(false);
        
        // Autoplay effect
        useEffect(() => {
          if (props.autoplay && carouselSlidesRaw.length > 1 && !isAnimating) {
            const interval = setInterval(() => {
              setActiveSlideIndex(prev => (prev + 1) % carouselSlidesRaw.length);
            }, props.autoplayDelay || 3000);
            return () => clearInterval(interval);
          }
        }, [props.autoplay, props.autoplayDelay, carouselSlidesRaw.length, isAnimating]);
        
        const goToSlide = (index: number) => {
          if (isAnimating) return;
          setIsAnimating(true);
          const normalizedIndex = props.loop 
            ? ((index % carouselSlidesRaw.length) + carouselSlidesRaw.length) % carouselSlidesRaw.length
            : Math.max(0, Math.min(index, carouselSlidesRaw.length - 1));
          setActiveSlideIndex(normalizedIndex);
          setTimeout(() => setIsAnimating(false), props.animationDuration || 300);
        };
        
        const nextSlide = () => goToSlide(activeSlideIndex + 1);
        const prevSlide = () => goToSlide(activeSlideIndex - 1);
        
        const isVertical = props.orientation === 'vertical';
        const slidesToShow = props.slidesToShow || 1;
        const gapPx = props.gap || 16;
        
        const getArrowClasses = () => {
          const base = 'absolute z-10 p-2 transition-all';
          switch (props.arrowStyle) {
            case 'circle':
              return cn(base, 'rounded-full bg-background/90 shadow-lg hover:bg-background border');
            case 'square':
              return cn(base, 'rounded-md bg-background/90 shadow-lg hover:bg-background border');
            case 'ghost':
              return cn(base, 'rounded-full hover:bg-background/50');
            case 'minimal':
              return cn(base, 'opacity-60 hover:opacity-100');
            default:
              return cn(base, 'rounded-full bg-background/90 shadow-lg hover:bg-background border');
          }
        };
        
        const renderArrows = () => {
          if (!props.showArrows) return null;
          
          const arrowPosition = props.arrowPosition || 'inside';
          const LeftArrow = isVertical ? LucideIcons.ChevronUp : LucideIcons.ChevronLeft;
          const RightArrow = isVertical ? LucideIcons.ChevronDown : LucideIcons.ChevronRight;
          
          const positionStyles = arrowPosition === 'outside' 
            ? (isVertical 
                ? { prev: 'top-0 left-1/2 -translate-x-1/2 -translate-y-[calc(100%+8px)]', next: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-[calc(100%+8px)]' }
                : { prev: 'left-0 top-1/2 -translate-y-1/2 -translate-x-[calc(100%+8px)]', next: 'right-0 top-1/2 -translate-y-1/2 translate-x-[calc(100%+8px)]' }
              )
            : arrowPosition === 'bottom'
              ? { prev: 'bottom-4 left-1/2 -translate-x-[calc(50%+30px)]', next: 'bottom-4 left-1/2 translate-x-[calc(50%-6px)]' }
              : (isVertical
                  ? { prev: 'top-2 left-1/2 -translate-x-1/2', next: 'bottom-2 left-1/2 -translate-x-1/2' }
                  : { prev: 'left-2 top-1/2 -translate-y-1/2', next: 'right-2 top-1/2 -translate-y-1/2' }
                );
          
          return (
            <>
              <button
                onClick={prevSlide}
                className={cn(getArrowClasses(), positionStyles.prev)}
                disabled={!props.loop && activeSlideIndex === 0}
              >
                <LeftArrow className="h-5 w-5" />
              </button>
              <button
                onClick={nextSlide}
                className={cn(getArrowClasses(), positionStyles.next)}
                disabled={!props.loop && activeSlideIndex >= carouselSlidesRaw.length - slidesToShow}
              >
                <RightArrow className="h-5 w-5" />
              </button>
            </>
          );
        };
        
        const renderDots = () => {
          if (!props.showDots) return null;
          
          const dotPosition = props.dotPosition || 'bottom';
          const positionClasses = {
            bottom: 'bottom-2 left-1/2 -translate-x-1/2 flex-row',
            top: 'top-2 left-1/2 -translate-x-1/2 flex-row',
            left: 'left-2 top-1/2 -translate-y-1/2 flex-col',
            right: 'right-2 top-1/2 -translate-y-1/2 flex-col'
          };
          
          return (
            <div className={cn('absolute z-10 flex gap-2', positionClasses[dotPosition])}>
              {carouselSlidesRaw.map((slide: any, idx: number) => {
                const isActive = idx === activeSlideIndex;
                
                if (props.dotStyle === 'lines') {
                  return (
                    <button
                      key={slide.id || idx}
                      onClick={() => goToSlide(idx)}
                      className={cn(
                        'transition-all',
                        isVertical ? 'w-1 h-6' : 'h-1 w-6',
                        isActive ? 'bg-primary' : 'bg-primary/30 hover:bg-primary/50'
                      )}
                    />
                  );
                }
                
                if (props.dotStyle === 'numbers') {
                  return (
                    <button
                      key={slide.id || idx}
                      onClick={() => goToSlide(idx)}
                      className={cn(
                        'w-6 h-6 rounded-full text-xs font-medium transition-all',
                        isActive 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-background/80 text-foreground hover:bg-background'
                      )}
                    >
                      {idx + 1}
                    </button>
                  );
                }
                
                // Default dots
                return (
                  <button
                    key={slide.id || idx}
                    onClick={() => goToSlide(idx)}
                    className={cn(
                      'rounded-full transition-all',
                      isActive ? 'bg-primary w-3 h-3' : 'bg-primary/30 w-2 h-2 hover:bg-primary/50'
                    )}
                  />
                );
              })}
            </div>
          );
        };
        
        const carouselAnimDuration = props.animationDuration || 300;
        const carouselEasing = props.easing || 'ease-out';
        
        return (
          <div
            {...commonProps}
            ref={dropRef}
            className={cn(commonProps.className, 'relative overflow-hidden')}
            style={{
              ...commonProps.style,
              ...getSpacingStyles(props),
              ...getDimensionStyles(props),
            }}
          >
            {!isPreview && (
              <ComponentDragHandle componentId={component.id} component={component} parentId={parentId} index={index} isSelected={isSelected} />
            )}
            
            {/* Slides container */}
            <div 
              className="relative"
              style={{
                display: 'flex',
                flexDirection: isVertical ? 'column' : 'row',
                gap: `${gapPx}px`,
                transform: isVertical 
                  ? `translateY(calc(-${activeSlideIndex * (100 / slidesToShow)}% - ${activeSlideIndex * gapPx}px))`
                  : `translateX(calc(-${activeSlideIndex * (100 / slidesToShow)}% - ${activeSlideIndex * gapPx}px))`,
                transition: `transform ${carouselAnimDuration}ms ${carouselEasing}`,
              }}
            >
              {carouselSlidesRaw.map((slide: any, idx: number) => (
                <div
                  key={slide.id || idx}
                  className="flex-shrink-0"
                  style={{
                    width: isVertical ? '100%' : `calc(${100 / slidesToShow}% - ${gapPx * (slidesToShow - 1) / slidesToShow}px)`,
                    height: isVertical ? `calc(${100 / slidesToShow}% - ${gapPx * (slidesToShow - 1) / slidesToShow}px)` : 'auto',
                  }}
                >
                  {hasCarouselChildren && slide.contentComponent ? (
                    <ComponentRenderer
                      key={slide.contentComponent.id}
                      component={withInheritedDataContext(slide.contentComponent)}
                      isPreview={isPreview}
                      parentId={slide.id}
                      index={0}
                    />
                  ) : (
                    <div className="w-full h-full min-h-[200px] flex items-center justify-center bg-muted rounded-lg">
                      <span className="text-muted-foreground">{slide.content || slide.label || `Slide ${idx + 1}`}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Navigation arrows */}
            {renderArrows()}
            
            {/* Dots indicator */}
            {renderDots()}
            
            {isOver && !isPreview && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded pointer-events-none" />
            )}
          </div>
        );

      case 'carousel-slide':
        // Carousel slide - render its children (the content component)
        return (
          <div
            {...commonProps}
            ref={dropRef}
            className={cn(commonProps.className, 'relative')}
          >
            {!isPreview && (
              <ComponentDragHandle componentId={component.id} component={component} parentId={parentId} index={index} isSelected={isSelected} />
            )}
            {Array.isArray(component.children) && component.children.map((child, idx) => (
              <ComponentRenderer
                key={child.id}
                component={withInheritedDataContext(child)}
                isPreview={isPreview}
                parentId={component.id}
                index={idx}
              />
            ))}
            {isOver && !isPreview && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded pointer-events-none" />
            )}
          </div>
        );

      case 'carousel-slide-content':
        // Carousel slide content - this is a droppable area where users can add components
        return (
          <div 
            {...commonProps} 
            className={cn(commonProps.className, 'relative min-h-[100px]')}
            ref={dropRef}
            style={{
              ...commonProps.style,
              ...getSpacingStyles(props),
              ...getDimensionStyles(props),
            }}
          >
            {!isPreview && (
              <ComponentDragHandle componentId={component.id} component={component} parentId={parentId} index={index} isSelected={isSelected} />
            )}
            {Array.isArray(component.children) && component.children.length > 0 ? (
              component.children.map((child, idx) => (
                <ComponentRenderer
                  key={child.id}
                  component={withInheritedDataContext(child)}
                  isPreview={isPreview}
                  parentId={component.id}
                  index={idx}
                />
              ))
            ) : (
              !isPreview && (
                <div className="text-xs text-muted-foreground text-center py-8 border border-dashed border-muted rounded bg-muted/30">
                  Drop elements here to design your slide
                </div>
              )
            )}
            {isOver && !isPreview && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded pointer-events-none" />
            )}
          </div>
        );

      case 'div':
        // Handle div elements with proper layout - used for nav containers, wrappers, etc.
        // Detect navigation containers that require horizontal flex layout
        const isNavContainer = component.id && (
          component.id.includes('nav-container') || 
          component.id.includes('nav-inner') ||
          component.id.includes('nav-icons') ||
          component.id.includes('nav-actions') ||
          component.id.includes('nav-cta') ||
          component.id.includes('nav-right') ||
          component.id.includes('nav-links') ||
          component.id.includes('nav-logo') ||
          component.id.includes('nav-menu')
        );

        // Resolve a DimensionControl value (object { value, unit }) into a CSS string.
        // NOTE: DimensionControl always emits objects; applying those objects directly to React styles
        // results in invalid CSS (and the width/maxWidth visually "does nothing").
        const resolveExplicitDim = (val: any): string | undefined => {
          if (val === undefined || val === null) return undefined;
          if (typeof val === 'number') return `${val}px`;
          if (typeof val === 'string') {
            const trimmed = val.trim();
            if (!trimmed || trimmed === 'auto') return undefined;
            return trimmed;
          }
          if (typeof val === 'object') {
            const value = (val as any).value;
            const unit = (val as any).unit;
            if (value === undefined || value === null || value === '') return undefined;
            if (value === 'auto' || unit === 'auto') {
              // Allow keyword sizing (fit-content, min-content, max-content)
              if (typeof value === 'string' && ['fit-content', 'min-content', 'max-content'].includes(value)) {
                return value;
              }
              return undefined;
            }
            return `${value}${unit || 'px'}`;
          }
          return undefined;
        };

        const explicitMaxWidth = resolveExplicitDim(props.maxWidth);
        
        // For nav containers, force horizontal flex layout to prevent initial render breakage
        // These defaults ensure navbar displays correctly even before class styles load
        const navContainerStyles: React.CSSProperties = isNavContainer ? {
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          // Do NOT add flexShrink: 0 here - it prevents proper sizing
          // For main nav-container, just set flex layout defaults
          ...(component.id?.includes('nav-container') && {
            justifyContent: 'space-between',
            // Do NOT force width: 100% - let parent constraints apply
            // maxWidth only works when width is NOT forced to 100%
            maxWidth: explicitMaxWidth || (appliedClassStyles as any)?.maxWidth || '1200px',
            margin: '0 auto',
          }),
          // For nav-links containers, use larger gap
          ...(component.id?.includes('nav-links') && {
            gap: appliedClassStyles?.gap || 32,
          }),
          // For nav-icons/actions containers, use gap for proper spacing
          ...((component.id?.includes('nav-icons') || component.id?.includes('nav-actions') || component.id?.includes('nav-right')) && {
            gap: appliedClassStyles?.gap || 16,
          }),
        } : {};

        // Helper to normalize gap values for CSS (adds 'px' if missing units)
        const normalizeGap = (gap: any): string | undefined => {
          if (!gap) return undefined;
          if (typeof gap === 'number') return `${gap}px`;
          if (typeof gap === 'string') {
            // Already has unit (px, rem, em, etc.)
            if (/[a-z%]/i.test(gap)) return gap;
            // Pure number string - append px
            if (/^\d+(\.\d+)?$/.test(gap.trim())) {
              return `${gap.trim()}px`;
            }
            return gap;
          }
          return undefined;
        };

        // Extract layout styles for the inner drop zone
        // CRITICAL: Include grid properties for proper CSS Grid rendering
        const divInnerLayoutStyles: React.CSSProperties = {
          display: props.display || undefined,
          flexDirection: props.flexDirection as React.CSSProperties['flexDirection'],
          justifyContent: props.justifyContent as React.CSSProperties['justifyContent'],
          alignItems: props.alignItems as React.CSSProperties['alignItems'],
          gap: normalizeGap(props.gap),
          // Grid properties - CRITICAL for product grids, feature cards, etc.
          gridTemplateColumns: props.gridTemplateColumns,
          gridTemplateRows: props.gridTemplateRows,
          gridAutoFlow: props.gridAutoFlow as React.CSSProperties['gridAutoFlow'],
          // CRITICAL: Ensure inner dropzone fills parent width for grid/flex layouts
          width: '100%',
        };

        return (
          <div 
            {...commonProps}
            style={{
              ...commonProps.style,
              // For nav containers, apply flex layout defaults (NOT width)
              ...(isNavContainer && {
                display: navContainerStyles.display || commonProps.style?.display,
                flexDirection: navContainerStyles.flexDirection || commonProps.style?.flexDirection,
                alignItems: navContainerStyles.alignItems || commonProps.style?.alignItems,
                gap: normalizeGap(navContainerStyles.gap) || commonProps.style?.gap,
              }),
              // For main nav-container, apply centering (maxWidth + margin) but NOT width
              ...(component.id?.includes('nav-container') && {
                justifyContent: 'space-between',
                maxWidth: navContainerStyles.maxWidth,
                margin: navContainerStyles.margin,
              }),
              // Allow explicit props to override
              ...(props.display && { display: props.display }),
              ...(props.flexDirection && { flexDirection: props.flexDirection }),
              ...(props.justifyContent && { justifyContent: props.justifyContent }),
              ...(props.alignItems && { alignItems: props.alignItems }),
              ...(props.gap && { gap: normalizeGap(props.gap) }),
              // IMPORTANT: Do not apply width directly from props when it's a DimensionControl object.
              // commonProps.style already includes getDimensionStyles(props), which converts it to a valid CSS string.
              // Grid layout support on outer div for proper CSS Grid rendering
              // CRITICAL FIX: Also apply grid when AI-generated component has gridTemplateColumns
              ...((props.display === 'grid' || ((props as any)._aiGenerated && props.gridTemplateColumns)) && {
                display: 'grid',
                gridTemplateColumns: props.gridTemplateColumns,
                gridTemplateRows: props.gridTemplateRows,
                gridAutoFlow: props.gridAutoFlow,
                gap: normalizeGap(props.gap),
              }),
            }}
          >
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            <EnhancedDropZone
              id={`drop-${component.id}`}
              accepts={getAcceptedTypes(component.type)}
              parentId={component.id}
              index={component.children?.length || 0}
              style={{
                ...divInnerLayoutStyles,
                // Ensure gap is applied for flex and grid containers
                ...(divInnerLayoutStyles.display === 'flex' && { gap: normalizeGap(props.gap) || '16px' }),
                ...(divInnerLayoutStyles.display === 'grid' && { gap: normalizeGap(props.gap) || '24px' }),
              }}
              className={cn(
                !isPreview && !component.children?.length 
                  ? 'min-h-[60px]'
                  : 'min-h-[40px]',
                // Force flex on nav containers
                isNavContainer && 'flex items-center'
              )}
            >
              {Array.isArray(component.children) && component.children.length > 0 ? (
                component.children.map((child, idx) => (
                  <ComponentRenderer
                    key={child.id}
                    component={withInheritedDataContext(child)}
                    isPreview={isPreview}
                    parentId={component.id}
                    index={idx}
                  />
                ))
              ) : null}
            </EnhancedDropZone>
          </div>
        );

      default:
        // For unknown component types, render as a container without placeholder text
        // This prevents ugly "div component" labels on the canvas
        return (
          <div {...commonProps} ref={dropRef}>
            {!isPreview && (
              <ComponentDragHandle
                componentId={component.id}
                component={component}
                parentId={parentId}
                index={index}
                isSelected={isSelected}
              />
            )}
            {Array.isArray(component.children) && component.children.length > 0 ? (
              component.children.map((child, idx) => (
                <ComponentRenderer
                  key={child.id}
                  component={withInheritedDataContext(child)}
                  isPreview={isPreview}
                  parentId={component.id}
                  index={idx}
                />
              ))
            ) : null}
          </div>
        );
    }
  };

  const globalHeaderBadge = !isPreview && (isGlobalHeaderSource || isGlobalHeaderInstance) ? (
    <div className="absolute top-2 left-2 z-50 pointer-events-none opacity-0 group-hover/global-header:opacity-100 transition-opacity duration-150">
      <div className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold shadow-sm border",
        isGlobalHeaderInstance
          ? "bg-amber-500/90 text-white border-amber-600/50"
          : "bg-primary/90 text-primary-foreground border-primary/50"
      )}>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        {isGlobalHeaderInstance
          ? `Global Header · Edit on ${globalHeaderSourcePageName || 'Source'}`
          : 'Global Header'}
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Handle visibility - in design mode: show if forceShowInCanvas or no binding, in preview: respect condition */}
      {(isPreview ? shouldRender : shouldShowInCanvas) ? (
        <div className={cn("relative", !isPreview && (isGlobalHeaderSource || isGlobalHeaderInstance) && "group/global-header")}>
          {globalHeaderBadge}
          {renderComponent()}
        </div>
      ) : null}
      {contextMenu && !isPreview && (
        <ContextMenu
          component={component}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
function getAcceptedTypes(componentType: string): string[] {
  const containerTypes = [
    'div', 'section', 'container', 'row', 'column', 'grid', 'card', 'form-wrapper', 'form-wizard', 
    'radio-group', 'checkbox-group', 'nav-horizontal', 'nav-vertical',
    // Accordion/tabs items and content areas can accept children
    'accordion-item', 'accordion-content',
    'tab-item', 'tab-content',
    // Carousel slides can accept children
    'carousel-slide', 'carousel-slide-content'
  ];
  const allTypes = [
    'div', 'section', 'container', 'row', 'column', 'grid', 'text', 'heading', 'button', 'input', 'textarea', 
    'select', 'checkbox', 'radio', 'image', 'card', 'table', 'datatable', 'form', 'list', 
    'data-display', 'navigation', 'header', 'footer', 'sidebar', 'modal', 'tabs', 'accordion', 'chart', 
    'calendar', 'datepicker', 'fileupload', 'avatar', 'badge', 'alert', 'progress',
    'skeleton', 'separator', 'spacer', 'template', 'switch', 'slider', 'label', 'icon',
    // Typography components
    'blockquote', 'code', 'codeblock', 'link',
    // New form components
    'form-wrapper', 'form-wizard', 'password-input', 'radio-group', 'checkbox-group',
    // New navigation components  
    'nav-horizontal', 'nav-vertical'
  ];

  if (containerTypes.includes(componentType)) {
    return allTypes;
  }
  return [];
}
