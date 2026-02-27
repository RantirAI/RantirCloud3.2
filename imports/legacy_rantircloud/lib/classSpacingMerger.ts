/**
 * Class Spacing Merger - Handles non-destructive merging of spacing styles
 * from multiple classes (primary and secondary)
 */

import { StyleClass } from '@/types/classes';

interface SpacingValues {
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  left?: string | number;
  unit?: string;
}

/**
 * Extract spacing values from a class's styles
 * Handles both individual properties (marginTop, paddingLeft) and nested objects
 */
export function extractSpacingFromClass(
  classStyles: Record<string, any>,
  spacingType: 'margin' | 'padding'
): SpacingValues {
  const result: SpacingValues = {};
  const sides = ['top', 'right', 'bottom', 'left'] as const;
  
  // Check for individual side properties (e.g., marginTop, paddingRight)
  sides.forEach(side => {
    const propertyName = `${spacingType}${side.charAt(0).toUpperCase() + side.slice(1)}`;
    if (classStyles[propertyName] !== undefined) {
      result[side] = classStyles[propertyName];
    }
  });
  
  // Check for nested spacing object
  if (classStyles[spacingType] && typeof classStyles[spacingType] === 'object') {
    const nested = classStyles[spacingType];
    sides.forEach(side => {
      if (nested[side] !== undefined) {
        result[side] = nested[side];
      }
    });
    if (nested.unit) {
      result.unit = nested.unit;
    }
  }
  
  return result;
}

/**
 * Merge spacing values from multiple classes in a non-destructive way
 * Later classes override earlier ones, but only for properties they define
 * 
 * @param classStack - Array of class names in order (base to specific)
 * @param classes - All available style classes
 * @param spacingType - 'margin' or 'padding'
 * @returns Merged spacing values with source tracking
 */
export function mergeClassSpacing(
  classStack: string[],
  classes: StyleClass[],
  spacingType: 'margin' | 'padding'
): {
  values: SpacingValues;
  sources: Record<string, string>; // Maps side to class name that defined it
} {
  const merged: SpacingValues = {};
  const sources: Record<string, string> = {};
  const sides = ['top', 'right', 'bottom', 'left'] as const;
  
  // Process each class in order (base to specific)
  for (const className of classStack) {
    const cls = classes.find(c => c.name === className);
    if (!cls || !cls.styles) continue;
    
    const spacing = extractSpacingFromClass(cls.styles, spacingType);
    
    // Merge each side
    sides.forEach(side => {
      if (spacing[side] !== undefined && spacing[side] !== '' && spacing[side] !== '0') {
        merged[side] = spacing[side];
        sources[side] = className;
      }
    });
    
    // Merge unit if present
    if (spacing.unit) {
      merged.unit = spacing.unit;
    }
  }
  
  return { values: merged, sources };
}

/**
 * Update spacing property in a class without affecting other properties
 * 
 * @param classStyles - Current class styles
 * @param spacingType - 'margin' or 'padding'
 * @param side - 'top', 'right', 'bottom', or 'left'
 * @param value - New value for the spacing property
 * @returns Updated class styles
 */
export function updateClassSpacing(
  classStyles: Record<string, any>,
  spacingType: 'margin' | 'padding',
  side: 'top' | 'right' | 'bottom' | 'left',
  value: string | number
): Record<string, any> {
  const propertyName = `${spacingType}${side.charAt(0).toUpperCase() + side.slice(1)}`;
  
  return {
    ...classStyles,
    [propertyName]: value
  };
}

/**
 * Get the source class for a specific spacing property
 * 
 * @param classStack - Array of class names in order
 * @param classes - All available style classes
 * @param spacingType - 'margin' or 'padding'
 * @param side - 'top', 'right', 'bottom', or 'left'
 * @returns Name of the class that defines this property, or null
 */
export function getSpacingPropertySource(
  classStack: string[],
  classes: StyleClass[],
  spacingType: 'margin' | 'padding',
  side: 'top' | 'right' | 'bottom' | 'left'
): string | null {
  // Search from end to beginning to find the most specific class
  for (let i = classStack.length - 1; i >= 0; i--) {
    const className = classStack[i];
    const cls = classes.find(c => c.name === className);
    if (!cls || !cls.styles) continue;
    
    const spacing = extractSpacingFromClass(cls.styles, spacingType);
    if (spacing[side] !== undefined && spacing[side] !== '' && spacing[side] !== '0') {
      return className;
    }
  }
  
  return null;
}

/**
 * Check if a spacing property is defined in a specific class
 */
export function hasSpacingProperty(
  classStyles: Record<string, any>,
  spacingType: 'margin' | 'padding',
  side: 'top' | 'right' | 'bottom' | 'left'
): boolean {
  const propertyName = `${spacingType}${side.charAt(0).toUpperCase() + side.slice(1)}`;
  
  // Check individual property
  if (classStyles[propertyName] !== undefined) {
    return true;
  }
  
  // Check nested object
  if (classStyles[spacingType] && typeof classStyles[spacingType] === 'object') {
    return classStyles[spacingType][side] !== undefined;
  }
  
  return false;
}
