/**
 * Style Resolver - Resolves component styles from class references + overrides
 * 
 * This replaces the old approach where ALL style properties were stored inline.
 * Now components only store:
 * - classNames: string[] (references to style classes)
 * - styleOverrides: {} (only properties that differ from class defaults)
 */

import { StyleClass, PseudoState } from '@/types/classes';
import { Breakpoint, resolveBreakpointStyles } from '@/lib/breakpoints';

// Properties that are content/behavior, NOT styles
// Note: 'typography' is a container object that holds typography settings
// Its CONTENTS (fontSize, fontFamily, etc.) are style properties
export const CONTENT_PROPERTIES = new Set([
  'id', 'type', 'children', 'content', 'text', 'src', 'href', 'alt',
  'placeholder', 'value', 'name', 'label', 'title', 'description',
  'icon', 'iconName', 'iconSize', 'options', 'items', 'data',
  'disabled', 'required', 'readonly', 'checked', 'selected',
  'min', 'max', 'step', 'rows', 'cols', 'maxLength',
  'autoFocus', 'autoComplete', 'pattern', 'accept',
  'target', 'rel', 'download', 'type', 'level', 'tag',
  // Class system metadata
  'classNames', 'styleOverrides', 'appliedClasses', 'activeClass',
  '_propertySource', '_autoClass', '__lockedProps', '__editedProps', '_dataContext',
  '_parentConnection', 'componentName', 'hidden', 'locked',
  // Data binding
  'dataSource', 'dataBinding', 'fieldBinding', 'dataField',
  // Actions
  'actions', 'actionFlows', 'onClick', 'onHover', 'onFocus', 'onBlur',
  // Form specific
  'validation', 'errorMessage', 'successMessage',
  // Typography container (contents are handled specially by extractStyleProps)
  'typography'
]);

// Style properties that should be stored in classes
export const STYLE_PROPERTIES = new Set([
  // Layout
  'display', 'flexDirection', 'justifyContent', 'alignItems', 'alignSelf',
  'flexWrap', 'flexGrow', 'flexShrink', 'order', 'gap',
  'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow',
  
  // Sizing
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  
  // Spacing
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'spacingControl', // Unified spacing control object
  
  // Position
  'position', 'top', 'right', 'bottom', 'left', 'zIndex',
  
  // Typography
  'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing',
  'textAlign', 'textDecoration', 'textTransform', 'color', 'whiteSpace',
  
  // Background - includes layered background properties
  'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition',
  'backgroundRepeat', 'background', 'backgroundAttachment',
  'backgroundGradient', // Gradient layer (non-CSS, used for layered background computation)
  'backgroundLayerOrder', // Layer ordering (non-CSS, used for layered background computation)
  
  // Border
  'border', 'borderWidth', 'borderStyle', 'borderColor', 'borderRadius',
  'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
  
  // Shadow
  'boxShadow', 'shadowX', 'shadowY', 'shadowBlur', 'shadowSpread', 'shadowColor',
  'boxShadows', // New layered box shadows array
  
  // Transform
  'transform', 'rotate', 'scale', 'skewX', 'skewY', 'rotateX', 'rotateY', 'rotateZ',
  'translateX', 'translateY',
  'transforms', // New grouped transforms object
  
  // Other visual
  'opacity', 'overflow', 'overflowX', 'overflowY', 'visibility', 'cursor',
  'filter', 'backdropFilter', 'mixBlendMode',
  'filters', // New layered filters array
  
  // Animation
  'transition', 'animation', 'animationDuration', 'animationDelay',
  'transitions' // New layered transitions array
]);

// Non-CSS style keys that should be resolved but NOT applied directly to DOM style
// These are used internally for computing final CSS values (e.g., layered backgrounds)
export const NON_CSS_STYLE_KEYS = new Set([
  'backgroundGradient',
  'backgroundLayerOrder',
  'boxShadows', // Computed into boxShadow
  'filters', // Computed into filter
  'transitions', // Computed into transition
  'transforms', // Computed into transform
  'spacingControl', // Computed into padding/margin
]);

export interface ResolvedStyles {
  styles: Record<string, any>;
  sources: Record<string, { classId?: string; className?: string; source: 'class' | 'override' | 'default' }>;
}

/**
 * Resolve styles for a component from its class references and overrides.
 * Now supports breakpoint-aware resolution for canvas rendering.
 */
export function resolveComponentStyles(
  classNames: string[],
  styleOverrides: Record<string, any>,
  allClasses: StyleClass[],
  state: PseudoState = 'none',
  breakpoint: Breakpoint = 'desktop'
): ResolvedStyles {
  const styles: Record<string, any> = {};
  const sources: Record<string, { classId?: string; className?: string; source: 'class' | 'override' | 'default' }> = {};

  const normalizeStyleValue = (key: string, value: any) => {
    if (value === undefined || value === null) return value;

    // Typography numeric values coming from controls are often stored as numbers/strings without units.
    // CSS requires units for fontSize/letterSpacing.
    if (key === 'fontSize' || key === 'letterSpacing') {
      if (typeof value === 'number') return `${value}px`;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (/^\d+(\.\d+)?$/.test(trimmed)) return `${trimmed}px`;
      }
    }

    return value;
  };

  const applyStyle = (key: string, value: any, source: { classId?: string; className?: string; source: 'class' | 'override' | 'default' }) => {
    if (!STYLE_PROPERTIES.has(key)) return;
    const normalized = normalizeStyleValue(key, value);
    if (normalized === undefined || normalized === null) return;
    styles[key] = normalized;
    sources[key] = source;
  };

  // Apply classes in order (later classes override earlier ones)
  for (const className of classNames) {
    const styleClass = allClasses.find(cls => cls.name === className);
    if (!styleClass) continue;

    // Resolve base styles for the target breakpoint (desktop → tablet → mobile inheritance)
    const resolvedBaseStyles = resolveBreakpointStyles(
      styleClass.styles || {},
      styleClass.tabletStyles,
      styleClass.mobileStyles,
      breakpoint
    );

    // For pseudo-states, also merge state overrides with breakpoint awareness
    let rawClassStyles = resolvedBaseStyles;
    if (state !== 'none') {
      // Merge state styles with breakpoint inheritance:
      // desktop stateStyles → tablet stateStyles (if tablet/mobile) → mobile stateStyles (if mobile)
      const desktopStateStyles = styleClass.stateStyles?.[state] || {};
      const tabletStateStyles = (styleClass as any).tabletStateStyles?.[state] || {};
      const mobileStateStyles = (styleClass as any).mobileStateStyles?.[state] || {};
      
      const resolvedStateStyles = resolveBreakpointStyles(
        desktopStateStyles,
        tabletStateStyles,
        mobileStateStyles,
        breakpoint
      );
      
      rawClassStyles = { ...resolvedBaseStyles, ...resolvedStateStyles };
    }

    // Support legacy/nested typography in class styles (common for text components)
    const typography = (rawClassStyles as any)?.typography;
    if (typography && typeof typography === 'object') {
      for (const [key, value] of Object.entries(typography as Record<string, any>)) {
        applyStyle(String(key), value, { classId: styleClass.id, className: styleClass.name, source: 'class' });
      }
    }

    // Merge top-level class styles
    for (const [key, value] of Object.entries(rawClassStyles)) {
      if (key === 'typography') continue;
      applyStyle(key, value, { classId: styleClass.id, className: styleClass.name, source: 'class' });
    }
  }

  // Apply overrides (highest priority)
  for (const [key, value] of Object.entries(styleOverrides)) {
    applyStyle(key, value, { source: 'override' });
  }

  return { styles, sources };
}

/**
 * Extract only content/behavior properties from component props
 */
export function extractContentProps(props: Record<string, any>): Record<string, any> {
  const contentProps: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(props)) {
    if (CONTENT_PROPERTIES.has(key) || key.startsWith('data-') || key.startsWith('aria-')) {
      contentProps[key] = value;
    }
  }
  
  return contentProps;
}

/**
 * Extract only style properties from component props
 */
export function extractStyleProps(props: Record<string, any>): Record<string, any> {
  const styleProps: Record<string, any> = {};

  const normalizeStyleValue = (key: string, value: any) => {
    if (value === undefined || value === null) return value;
    if (key === 'fontSize' || key === 'letterSpacing') {
      if (typeof value === 'number') return `${value}px`;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (/^\d+(\.\d+)?$/.test(trimmed)) return `${trimmed}px`;
      }
    }
    return value;
  };

  const setIfStyleProp = (key: string, value: any) => {
    if (!STYLE_PROPERTIES.has(key)) return;
    const normalized = normalizeStyleValue(key, value);
    if (normalized === undefined || normalized === null) return;
    styleProps[key] = normalized;
  };

  // 1) Top-level style props (preferred)
  for (const [key, value] of Object.entries(props)) {
    setIfStyleProp(key, value);
  }

  // 2) Nested typography support (legacy/new UI stores typography as an object)
  const typography = props.typography;
  if (typography && typeof typography === 'object') {
    for (const [key, value] of Object.entries(typography as Record<string, any>)) {
      // Don't override explicit top-level props
      if (styleProps[key] !== undefined) continue;
      setIfStyleProp(String(key), value);
    }
  }

  return styleProps;
}

/**
 * Calculate which properties are overrides (differ from class defaults)
 */
export function calculateStyleOverrides(
  currentProps: Record<string, any>,
  classNames: string[],
  allClasses: StyleClass[]
): Record<string, any> {
  const overrides: Record<string, any> = {};
  
  // Get merged class styles
  const { styles: classStyles } = resolveComponentStyles(classNames, {}, allClasses);
  
  // Find properties that differ from class styles
  for (const [key, value] of Object.entries(currentProps)) {
    if (!STYLE_PROPERTIES.has(key)) continue;
    if (value === undefined || value === null) continue;
    
    const classValue = classStyles[key];
    
    // If property doesn't exist in classes, or differs, it's an override
    if (classValue === undefined || !deepEqual(value, classValue)) {
      overrides[key] = value;
    }
  }
  
  return overrides;
}

/**
 * Deep equality check for style values
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

/**
 * Convert legacy component (all inline props) to new format (classNames + overrides)
 */
export function migrateComponentToNewFormat(
  component: {
    id: string;
    type: string;
    props: Record<string, any>;
    children?: any[];
  },
  allClasses: StyleClass[]
): {
  id: string;
  type: string;
  classNames: string[];
  styleOverrides: Record<string, any>;
  contentProps: Record<string, any>;
  children?: any[];
} {
  const { props } = component;
  
  // Get applied class names
  const classNames: string[] = props.appliedClasses || [];
  
  // Extract content properties
  const contentProps = extractContentProps(props);
  
  // Calculate what's truly an override vs what comes from classes
  const styleOverrides = calculateStyleOverrides(props, classNames, allClasses);
  
  return {
    id: component.id,
    type: component.type,
    classNames,
    styleOverrides,
    contentProps,
    children: component.children
  };
}
