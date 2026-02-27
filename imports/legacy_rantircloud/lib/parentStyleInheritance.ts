/**
 * Parent-to-Child Style Inheritance System
 * 
 * Implements CSS-like inheritance where parent elements (Page Body, Section, Div, Container)
 * pass inheritable CSS properties (typography, color) down to their child components.
 * 
 * Following CSS specification, these properties naturally inherit:
 * - Typography: color, fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, textAlign, textTransform, fontStyle, textDecoration
 * - Text behavior: whiteSpace, wordSpacing, direction
 */

import { StyleClass } from '@/types/classes';

/**
 * CSS properties that inherit from parent to child per CSS specification
 */
export const INHERITABLE_CSS_PROPERTIES = new Set([
  // Typography
  'color',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textTransform',
  'fontStyle',
  'textDecoration',
  // Text behavior
  'whiteSpace',
  'wordSpacing',
  'direction',
]);

/**
 * Normalize a color value to a simple string
 * Handles complex color objects from ColorAdvancedPicker: { type: 'solid', value: string, opacity?: number }
 * and TokenColorValue: { tokenRef: string, value: string }
 */
function normalizeColorValue(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  
  // Handle ColorAdvancedPicker format: { type: 'solid' | 'gradient', value: string, opacity?: number }
  if (typeof value === 'object' && 'value' in value) {
    const innerValue = value.value;
    // Handle nested TokenColorValue
    if (typeof innerValue === 'object' && innerValue !== null && 'value' in innerValue) {
      return innerValue.value || null;
    }
    return typeof innerValue === 'string' ? innerValue : null;
  }
  
  return null;
}

/**
 * Source information for an inherited property
 */
export interface InheritedPropertySource {
  parentClassName: string;
  parentComponentId: string;
  depth: number; // How many levels up (1 = direct parent)
}

/**
 * Result of resolving inherited styles
 */
export interface InheritedStylesResult {
  styles: Record<string, any>;
  sources: Record<string, InheritedPropertySource>;
}

/**
 * Extract inheritable properties from a component's resolved styles
 * @param componentProps - The resolved props of a component
 * @param appliedClasses - Array of class names applied to the component
 * @param classes - All available style classes
 * @param componentId - The component's ID
 */
export function extractInheritableStyles(
  componentProps: Record<string, any>,
  appliedClasses: string[],
  classes: StyleClass[],
  componentId: string
): InheritedStylesResult {
  const styles: Record<string, any> = {};
  const sources: Record<string, InheritedPropertySource> = {};
  
  // First, get the primary class name (first in the stack) for source tracking
  const primaryClassName = appliedClasses.length > 0 ? appliedClasses[0] : null;
  
  // Helper to extract and normalize a value
  const extractValue = (prop: string, rawValue: any): any => {
    if (rawValue === undefined || rawValue === null || rawValue === '') return null;
    // For color, normalize complex color objects to string
    if (prop === 'color') {
      return normalizeColorValue(rawValue);
    }
    return rawValue;
  };
  
  // Extract values from class styles first (respect CSS cascade: later classes override earlier)
  for (let i = appliedClasses.length - 1; i >= 0; i--) {
    const className = appliedClasses[i];
    const classData = classes.find(c => c.name === className);
    if (!classData?.styles) continue;

    for (const prop of INHERITABLE_CSS_PROPERTIES) {
      // Skip if we already have a value
      if (styles[prop] !== undefined) continue;

      // Check direct property at class level
      let directValue = extractValue(prop, classData.styles[prop]);
      
      // For 'color', also check 'textColor' as a fallback
      if (directValue === null && prop === 'color') {
        directValue = extractValue('color', classData.styles.textColor);
      }
      
      if (directValue !== null) {
        styles[prop] = directValue;
        sources[prop] = {
          parentClassName: className,
          parentComponentId: componentId,
          depth: 0,
        };
        continue;
      }

      // Check typography object for typography properties
      if (classData.styles.typography && typeof classData.styles.typography === 'object') {
        let typoValue = extractValue(prop, (classData.styles.typography as Record<string, any>)[prop]);
        
        // For 'color', also check 'textColor' in typography as a fallback
        if (typoValue === null && prop === 'color') {
          typoValue = extractValue('color', (classData.styles.typography as Record<string, any>).textColor);
        }
        
        if (typoValue !== null) {
          styles[prop] = typoValue;
          sources[prop] = {
            parentClassName: className,
            parentComponentId: componentId,
            depth: 0,
          };
        }
      }
    }
  }
  
  // Then check component props directly (for inline/direct values)
  // This captures properties set directly on the component like Page Body props
  for (const prop of INHERITABLE_CSS_PROPERTIES) {
    // Skip if we already have a value from class
    if (styles[prop] !== undefined) continue;
    
    // Check direct property on componentProps (for Page Body / direct inline styles)
    let directValue = extractValue(prop, componentProps?.[prop]);
    
    // For 'color', also check 'textColor' as a fallback
    if (directValue === null && prop === 'color') {
      directValue = extractValue('color', componentProps?.textColor);
    }
    
    if (directValue !== null) {
      styles[prop] = directValue;
      sources[prop] = {
        parentClassName: primaryClassName || 'inline',
        parentComponentId: componentId,
        depth: 0,
      };
      continue;
    }
    
    // Check typography object in component props
    if (componentProps?.typography && typeof componentProps.typography === 'object') {
      let typoValue = extractValue(prop, componentProps.typography[prop]);
      
      // For 'color', also check 'textColor' in typography as a fallback
      if (typoValue === null && prop === 'color') {
        typoValue = extractValue('color', componentProps.typography.textColor);
      }
      
      if (typoValue !== null) {
        styles[prop] = typoValue;
        sources[prop] = {
          parentClassName: primaryClassName || 'inline',
          parentComponentId: componentId,
          depth: 0,
        };
      }
    }
  }
  
  return { styles, sources };
}

/**
 * Merge parent inherited styles with current component's own styles
 * Parent styles are used only for properties not defined on the current component
 * 
 * @param parentInheritedStyles - Styles inherited from parent
 * @param parentSources - Source information for parent styles
 * @param ownStyles - Current component's own inheritable styles
 * @param ownSources - Source information for current component's styles
 */
export function mergeInheritedStyles(
  parentInheritedStyles: Record<string, any> | undefined,
  parentSources: Record<string, InheritedPropertySource> | undefined,
  ownStyles: Record<string, any>,
  ownSources: Record<string, InheritedPropertySource>
): InheritedStylesResult {
  const mergedStyles: Record<string, any> = {};
  const mergedSources: Record<string, InheritedPropertySource> = {};
  
  // Start with parent inherited styles (lower priority)
  if (parentInheritedStyles) {
    for (const prop of Object.keys(parentInheritedStyles)) {
      mergedStyles[prop] = parentInheritedStyles[prop];
      if (parentSources?.[prop]) {
        mergedSources[prop] = {
          ...parentSources[prop],
          depth: parentSources[prop].depth + 1, // Increment depth as we go down
        };
      }
    }
  }
  
  // Override with own styles (higher priority)
  for (const prop of Object.keys(ownStyles)) {
    mergedStyles[prop] = ownStyles[prop];
    mergedSources[prop] = ownSources[prop];
  }
  
  return { styles: mergedStyles, sources: mergedSources };
}

/**
 * Check if a property value is considered "set" (not empty/default)
 */
export function isPropertySet(value: any): boolean {
  if (value === undefined || value === null || value === '') return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

/**
 * Get inheritable style properties to pass down to children
 * This is called by parent components to prepare context for children
 */
export function getInheritableStylesForChildren(
  componentProps: Record<string, any>,
  inheritedStyles: Record<string, any>,
  inheritedSources: Record<string, InheritedPropertySource>,
  appliedClasses: string[],
  classes: StyleClass[],
  componentId: string
): InheritedStylesResult {
  // First extract this component's own inheritable styles
  const { styles: ownStyles, sources: ownSources } = extractInheritableStyles(
    componentProps,
    appliedClasses,
    classes,
    componentId
  );
  
  // Merge with parent inherited styles
  return mergeInheritedStyles(inheritedStyles, inheritedSources, ownStyles, ownSources);
}

/**
 * Resolve final property value considering parent inheritance
 * Returns the value and whether it came from a parent
 */
export function resolveInheritedProperty(
  propertyName: string,
  ownValue: any,
  inheritedStyles: Record<string, any> | undefined,
  inheritedSources: Record<string, InheritedPropertySource> | undefined
): { value: any; isFromParent: boolean; source?: InheritedPropertySource } {
  // If own value is set, use it
  if (isPropertySet(ownValue)) {
    return { value: ownValue, isFromParent: false };
  }
  
  // Check inherited styles
  if (inheritedStyles && isPropertySet(inheritedStyles[propertyName])) {
    return {
      value: inheritedStyles[propertyName],
      isFromParent: true,
      source: inheritedSources?.[propertyName],
    };
  }
  
  return { value: ownValue, isFromParent: false };
}
