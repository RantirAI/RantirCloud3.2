/**
 * Canvas CSS Generator - Generates breakpoint-resolved CSS for the editor canvas
 * 
 * Unlike generateCSS() which uses real @media queries (for production/exports),
 * this generator outputs flat CSS rules resolved to the currently selected
 * breakpoint in the builder. This ensures that switching the builder viewport
 * truly switches which styles apply, independent of the actual iframe width.
 */

import { StyleClass } from '@/types/classes';
import { Breakpoint, resolveBreakpointStyles } from '@/lib/breakpoints';

/**
 * Convert a style object to an array of CSS rule strings
 */
function styleObjectToCSS(styles: Record<string, any>, useImportant: boolean = false): string[] {
  const rules: string[] = [];
  
  if (!styles) return rules;
  
  // First, flatten any nested structures
  const flatStyles = flattenStyles(styles);
  
  // CSS property mapping from camelCase to kebab-case
  const cssPropertyMap: Record<string, string> = {
    // Layout
    display: 'display',
    flexDirection: 'flex-direction',
    justifyContent: 'justify-content',
    alignItems: 'align-items',
    alignSelf: 'align-self',
    flexWrap: 'flex-wrap',
    flexGrow: 'flex-grow',
    flexShrink: 'flex-shrink',
    flexBasis: 'flex-basis',
    gap: 'gap',
    rowGap: 'row-gap',
    columnGap: 'column-gap',
    gridTemplateColumns: 'grid-template-columns',
    gridTemplateRows: 'grid-template-rows',
    gridColumn: 'grid-column',
    gridRow: 'grid-row',
    
    // Spacing
    padding: 'padding',
    paddingTop: 'padding-top',
    paddingRight: 'padding-right',
    paddingBottom: 'padding-bottom',
    paddingLeft: 'padding-left',
    margin: 'margin',
    marginTop: 'margin-top',
    marginRight: 'margin-right',
    marginBottom: 'margin-bottom',
    marginLeft: 'margin-left',
    
    // Sizing
    width: 'width',
    height: 'height',
    minWidth: 'min-width',
    maxWidth: 'max-width',
    minHeight: 'min-height',
    maxHeight: 'max-height',
    
    // Typography
    fontSize: 'font-size',
    fontWeight: 'font-weight',
    fontFamily: 'font-family',
    fontStyle: 'font-style',
    lineHeight: 'line-height',
    letterSpacing: 'letter-spacing',
    textAlign: 'text-align',
    textDecoration: 'text-decoration',
    textTransform: 'text-transform',
    color: 'color',
    whiteSpace: 'white-space',
    wordBreak: 'word-break',
    
    // Background
    backgroundColor: 'background-color',
    backgroundImage: 'background-image',
    backgroundSize: 'background-size',
    backgroundPosition: 'background-position',
    backgroundRepeat: 'background-repeat',
    background: 'background',
    
    // Border
    border: 'border',
    borderWidth: 'border-width',
    borderStyle: 'border-style',
    borderColor: 'border-color',
    borderRadius: 'border-radius',
    borderTop: 'border-top',
    borderRight: 'border-right',
    borderBottom: 'border-bottom',
    borderLeft: 'border-left',
    borderTopLeftRadius: 'border-top-left-radius',
    borderTopRightRadius: 'border-top-right-radius',
    borderBottomLeftRadius: 'border-bottom-left-radius',
    borderBottomRightRadius: 'border-bottom-right-radius',
    
    // Effects
    boxShadow: 'box-shadow',
    opacity: 'opacity',
    overflow: 'overflow',
    overflowX: 'overflow-x',
    overflowY: 'overflow-y',
    filter: 'filter',
    backdropFilter: 'backdrop-filter',
    
    // Position
    position: 'position',
    top: 'top',
    right: 'right',
    bottom: 'bottom',
    left: 'left',
    zIndex: 'z-index',
    
    // Transforms & Transitions
    transform: 'transform',
    transformOrigin: 'transform-origin',
    transition: 'transition',
    
    // Other
    cursor: 'cursor',
    visibility: 'visibility',
    objectFit: 'object-fit',
    objectPosition: 'object-position',
    aspectRatio: 'aspect-ratio',
    listStyle: 'list-style',
    listStyleType: 'list-style-type',
    outline: 'outline',
    outlineColor: 'outline-color',
    outlineWidth: 'outline-width',
    outlineStyle: 'outline-style',
    outlineOffset: 'outline-offset',
  };
  
  Object.entries(flatStyles).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    
    const cssProperty = cssPropertyMap[key];
    if (cssProperty) {
      const cssValue = formatCSSValue(key, value);
      if (cssValue && cssValue.trim() !== '') {
        rules.push(`${cssProperty}: ${cssValue}${useImportant ? ' !important' : ''};`);
      }
    }
  });
  
  return rules;
}

/**
 * Flatten nested style structures into flat CSS properties
 */
function flattenStyles(styles: Record<string, any>): Record<string, any> {
  const flattened: Record<string, any> = {};
  
  if (!styles) return flattened;
  
  Object.entries(styles).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    
    // Handle nested typography object
    if (key === 'typography' && typeof value === 'object') {
      Object.assign(flattened, value);
      return;
    }
    
    // Handle nested background object
    if (key === 'background' && typeof value === 'object') {
      if (value.color) flattened.backgroundColor = value.color;
      if (value.gradient) flattened.backgroundImage = value.gradient;
      if (value.image) flattened.backgroundImage = value.image;
      if (value.size) flattened.backgroundSize = value.size;
      if (value.position) flattened.backgroundPosition = value.position;
      if (value.repeat) flattened.backgroundRepeat = value.repeat;
      return;
    }
    
    // Handle nested spacing object
    if (key === 'spacing' && typeof value === 'object') {
      if (value.padding !== undefined) {
        if (typeof value.padding === 'object') {
          Object.entries(value.padding).forEach(([side, val]) => {
            flattened[`padding${side.charAt(0).toUpperCase() + side.slice(1)}`] = val;
          });
        } else {
          flattened.padding = value.padding;
        }
      }
      if (value.margin !== undefined) {
        if (typeof value.margin === 'object') {
          Object.entries(value.margin).forEach(([side, val]) => {
            flattened[`margin${side.charAt(0).toUpperCase() + side.slice(1)}`] = val;
          });
        } else {
          flattened.margin = value.margin;
        }
      }
      if (value.gap !== undefined) flattened.gap = value.gap;
      return;
    }
    
    // Handle nested sizing object
    if (key === 'sizing' && typeof value === 'object') {
      Object.assign(flattened, value);
      return;
    }
    
    // Handle nested layout object
    if (key === 'layout' && typeof value === 'object') {
      Object.assign(flattened, value);
      return;
    }
    
    // Handle nested border object
    if (key === 'border' && typeof value === 'object') {
      if (value.width) flattened.borderWidth = value.width;
      if (value.style) flattened.borderStyle = value.style;
      if (value.color) flattened.borderColor = value.color;
      if (value.radius) flattened.borderRadius = value.radius;
      return;
    }
    
    // Handle nested effects object
    if (key === 'effects' && typeof value === 'object') {
      if (value.boxShadow) flattened.boxShadow = value.boxShadow;
      if (value.opacity !== undefined) flattened.opacity = value.opacity;
      if (value.cursor) flattened.cursor = value.cursor;
      if (value.filter) flattened.filter = value.filter;
      return;
    }
    
    // Handle nested position object
    if (key === 'position' && typeof value === 'object') {
      Object.assign(flattened, value);
      return;
    }
    
    // For flat properties, add directly
    flattened[key] = value;
  });
  
  return flattened;
}

/**
 * Format a CSS value for output
 */
function formatCSSValue(property: string, value: any): string {
  if (value === null || value === undefined || value === '') return '';
  
  // Handle {value, unit} object format
  if (typeof value === 'object' && value !== null) {
    if ('value' in value && 'unit' in value) {
      const numValue = value.value;
      const unit = value.unit || '';
      
      if (numValue === undefined || numValue === null || numValue === '') return '';
      
      // Handle keyword values
      if (typeof numValue === 'string') {
        const keywords = ['auto', 'none', 'inherit', 'initial', 'unset', 'fit-content', 'max-content', 'min-content'];
        if (keywords.includes(numValue)) {
          return numValue;
        }
        // Already has a unit
        if (/\d+(%|px|em|rem|vh|vw|vmin|vmax|ch|ex)$/.test(numValue)) {
          return numValue;
        }
      }
      
      // Skip unit if it's a keyword
      if (unit === 'auto' || unit === 'none' || unit === 'inherit' || unit === 'initial' || unit === 'unset') {
        return String(numValue);
      }
      
      return `${numValue}${unit}`;
    }
    
    if ('value' in value) {
      return formatCSSValue(property, value.value);
    }
    
    // Skip other objects to prevent [object Object]
    return '';
  }
  
  // Add px to numeric values that need it
  const needsPixels = [
    'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
    'gap', 'rowGap', 'columnGap', 'borderRadius', 'borderWidth', 'fontSize', 
    'letterSpacing', 'top', 'right', 'bottom', 'left',
    'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
  ];
  
  if (typeof value === 'number') {
    if (needsPixels.includes(property)) {
      return `${value}px`;
    }
    return String(value);
  }
  
  return String(value);
}

/**
 * Resolve state styles for a specific breakpoint
 * Merges: desktop stateStyles → tablet stateStyles (if tablet/mobile) → mobile stateStyles (if mobile)
 */
function resolveStateStylesForBreakpoint(
  stateStyles?: Record<string, Record<string, any>>,
  tabletStateStyles?: Record<string, Record<string, any>>,
  mobileStateStyles?: Record<string, Record<string, any>>,
  breakpoint: Breakpoint = 'desktop'
): Record<string, Record<string, any>> {
  const result: Record<string, Record<string, any>> = {};
  
  // Start with desktop state styles
  if (stateStyles) {
    Object.entries(stateStyles).forEach(([state, styles]) => {
      result[state] = { ...styles };
    });
  }
  
  // Merge tablet if applicable
  if (breakpoint === 'tablet' || breakpoint === 'mobile') {
    if (tabletStateStyles) {
      Object.entries(tabletStateStyles).forEach(([state, styles]) => {
        result[state] = { ...(result[state] || {}), ...styles };
      });
    }
  }
  
  // Merge mobile if applicable
  if (breakpoint === 'mobile') {
    if (mobileStateStyles) {
      Object.entries(mobileStateStyles).forEach(([state, styles]) => {
        result[state] = { ...(result[state] || {}), ...styles };
      });
    }
  }
  
  return result;
}

/**
 * Generate CSS for the canvas, resolved to a specific breakpoint.
 * 
 * This outputs flat CSS rules (no @media queries) where each class's styles
 * are the merged result of desktop → tablet → mobile based on the target breakpoint.
 * 
 * This ensures that when the builder is set to "Desktop", only desktop styles apply,
 * regardless of the actual iframe/window width.
 */
export function generateCanvasCSS(classes: StyleClass[], breakpoint: Breakpoint): string {
  const cssRules: string[] = [
    '/* Canvas styles - resolved for ' + breakpoint + ' breakpoint */',
    '',
    '.page-container {',
    '  width: 100%;',
    '  min-height: 100vh;',
    '}',
    '',
  ];
  
  // Only process classes that are actually applied to components
  const activeClasses = classes.filter(cls => cls.appliedTo.length > 0);
  
  activeClasses.forEach(styleClass => {
    const selector = `.${styleClass.name}`;
    
    // Resolve base styles for the target breakpoint
    const resolvedStyles = resolveBreakpointStyles(
      styleClass.styles || {},
      styleClass.tabletStyles,
      styleClass.mobileStyles,
      breakpoint
    );
    
    const baseCSS = styleObjectToCSS(resolvedStyles);
    if (baseCSS.length > 0) {
      cssRules.push(`${selector} {`);
      baseCSS.forEach(rule => cssRules.push(`  ${rule}`));
      cssRules.push('}');
      cssRules.push('');
    }
    
    // Resolve state styles for the target breakpoint
    const resolvedStateStyles = resolveStateStylesForBreakpoint(
      styleClass.stateStyles,
      styleClass.tabletStateStyles,
      styleClass.mobileStateStyles,
      breakpoint
    );
    
    Object.entries(resolvedStateStyles).forEach(([state, styles]) => {
      if (state === 'none' || !styles || Object.keys(styles).length === 0) return;
      
      const stateSelector = state === 'hover' ? `${selector}:hover` :
                           state === 'focused' ? `${selector}:focus-visible` :
                           state === 'focus-visible' ? `${selector}:focus-visible` :
                           state === 'focus-within' ? `${selector}:focus-within` :
                           state === 'pressed' ? `${selector}:active` :
                           null;
      
      if (!stateSelector) return;
      
      const stateCSS = styleObjectToCSS(styles, true);
      if (stateCSS.length > 0) {
        cssRules.push(`${stateSelector} {`);
        stateCSS.forEach(rule => cssRules.push(`  ${rule}`));
        cssRules.push('}');
        cssRules.push('');
      }
    });
  });
  
  return cssRules.join('\n');
}
