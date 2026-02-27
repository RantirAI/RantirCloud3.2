/**
 * Property Diff Tracker
 * Detects which properties have been edited by comparing against default values
 * Prevents saving default/untouched properties to classes
 */

import { getDefaultPropsForComponent } from './componentPropertyConfig';
import { ComponentType } from '@/types/appBuilder';

/**
 * Deep comparison helper
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    
    return true;
  }
  
  return false;
}

/**
 * Check if a value is considered "empty" or default
 */
function isEmptyValue(value: any): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return Object.keys(value).length === 0 || Object.values(value).every(isEmptyValue);
  }
  return false;
}

/**
 * Extract only properties that differ from component defaults
 * Recursively compares nested objects
 * CRITICAL: Excludes ALL metadata properties to prevent saving defaults
 */
export function extractEditedProperties(
  currentProps: Record<string, any>,
  componentType: ComponentType,
  existingEditedProps?: Record<string, any>
): Record<string, any> {
  const defaultProps = getDefaultPropsForComponent(componentType);
  const editedProps: Record<string, any> = {};
  
  // SPECIFIC LOGGING FOR BACKGROUND COLOR
  console.log('[extractEditedProperties] Background color check:', {
    componentType,
    currentBackgroundColor: currentProps.backgroundColor,
    defaultBackgroundColor: defaultProps.backgroundColor
  });
  
  // Metadata keys to always exclude (non-style properties)
  const metadataKeys = [
    '_propertySource', '_autoClass', '__lockedProps', '__editedProps',
    'appliedClasses', 'activeClass', 'componentName', 'children',
    'onClick', 'onChange', 'onSubmit', 'className', 'id'
  ];
  
  // CONTENT PROPERTIES - These are per-component, NEVER shared through classes
  // Each component instance keeps its own text, links, etc. even with the same class
  const contentPropertyKeys = [
    'text', 'content', 'href', 'link', 'url', 'src', 'alt', 'title', 'label', 'placeholder', 'value',
    'description', 'tag', 'icon', 'iconName', 'options', 'items', 'data',
    'clickActions', 'actions', 'actionFlows', 'onHover', 'onFocus', 'onBlur',
    'name', 'validation', 'errorMessage', 'successMessage',
    'dataSource', 'dataBinding', 'fieldBinding', 'dataField', '_dataContext', '_parentConnection'
  ];
  
  // STYLE PROPERTIES - These are style-related keys (used for nested object recursion)
  const stylePropertyKeys = [
    'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
    'spacingControl', 'typography', 'backgroundColor', 'backgroundImage',
    'backgroundSize', 'backgroundPosition', 'backgroundRepeat', 'backgroundAttachment',
    'backgroundGradient', 'backgroundLayerOrder', // Layered background properties
    'borderRadius', 'border', 'borderWidth', 'borderColor', 'borderStyle',
    'boxShadow', 'boxShadows', 'opacity', 'display', 'flexDirection', 'justifyContent',
    'alignItems', 'gap', 'flexWrap', 'flexGrow', 'flexShrink', 'flexBasis',
    'gridTemplateColumns', 'gridTemplateRows', 'gridGap',
    'position', 'top', 'right', 'bottom', 'left', 'zIndex',
    'overflow', 'overflowX', 'overflowY', 'cursor', 'transform', 'transforms',
    'color', 'fontSize', 'fontWeight', 'fontFamily', 'textAlign',
    'lineHeight', 'letterSpacing', 'textDecoration', 'textTransform',
    'filter', 'filters', 'backdropFilter', 'transition', 'transitions'
  ];
  
  // Properties that should be saved as COMPLETE objects (not partial nested diffs)
  // If ANY sub-property changes, save the ENTIRE object to ensure class values are complete
  // CRITICAL: backgroundColor can be an object { type: 'solid', value, opacity } - treat atomically
  // CRITICAL: backgroundImage can be an object { value, opacity, size, position, repeat } - treat atomically
  const atomicObjectProperties = [
    'border', 'borderRadius', 'spacingControl', 
    'backgroundColor', 'backgroundGradient', 'backgroundImage',
    'backgroundLayerOrder' // Array of layer order
  ];
  
  // Helper to check if a key is a style property (for nested object recursion only)
  const isStyleProperty = (key: string): boolean => {
    return stylePropertyKeys.includes(key);
  };
  
  // Helper to check if ANY property in an object differs from defaults
  const hasAnyDifference = (current: any, defaults: any): boolean => {
    if (current === defaults) return false;
    if (current === null || defaults === null) return current !== defaults;
    if (typeof current !== 'object' || typeof defaults !== 'object') return current !== defaults;
    
    for (const key in current) {
      if (hasAnyDifference(current[key], defaults?.[key])) return true;
    }
    return false;
  };
  
  // Helper to recursively extract edited nested properties
  const extractNested = (
    current: Record<string, any>,
    defaults: Record<string, any>,
    path: string = ''
  ): Record<string, any> => {
    const result: Record<string, any> = {};
    
    for (const key in current) {
      // Skip ALL metadata, functional properties, AND content properties
      // Content properties (text, link, etc.) should NEVER be saved to classes
      if (key.startsWith('_') || key.startsWith('on') || metadataKeys.includes(key) || contentPropertyKeys.includes(key)) {
        continue;
      }
      
      const currentValue = current[key];
      const defaultValue = defaults?.[key];
      const fullPath = path ? `${path}.${key}` : key;
      
      // If it's a nested object, recurse
      if (
        currentValue !== null &&
        typeof currentValue === 'object' &&
        !Array.isArray(currentValue) &&
        !(currentValue instanceof Date)
      ) {
        // ATOMIC OBJECT HANDLING: For border, borderRadius, spacingControl -
        // save the COMPLETE object if ANY sub-property changed
        // This ensures classes have complete, usable values
        if (atomicObjectProperties.includes(key)) {
          const hasDiff = hasAnyDifference(currentValue, defaultValue);
          
          // DEBUG: Log atomic object extraction (border, backgroundColor, backgroundImage, etc.)
          if (key === 'border' || key === 'backgroundColor' || key === 'backgroundGradient' || key === 'backgroundImage') {
            console.log(`[extractEditedProperties] ${key.toUpperCase()} atomic check:`, {
              key,
              currentValue,
              defaultValue,
              hasAnyDifference: hasDiff
            });
          }
          
          if (hasDiff) {
            result[key] = currentValue; // Save ENTIRE object
            console.log(`[extractEditedProperties] Including atomic object "${key}":`, currentValue);
          }
        } else {
          const nestedEdited = extractNested(
            currentValue,
            defaultValue || {},
            fullPath
          );
          
          // Only include if there are edited nested properties
          if (Object.keys(nestedEdited).length > 0) {
            result[key] = nestedEdited;
          }
        }
      } else {
        // It's a primitive value - check if it should be included
        // CRITICAL FIX: Only include if DIFFERENT from default (not just non-empty)
        const isDifferent = !deepEqual(currentValue, defaultValue);
        const isNotEmpty = !isEmptyValue(currentValue);
        const isNewProperty = defaultValue === undefined;
        
        // SPECIFIC LOGGING FOR BACKGROUND COLOR
        if (key === 'backgroundColor') {
          console.log('[extractEditedProperties] backgroundColor check:', {
            currentValue,
            defaultValue,
            isDifferent,
            isNotEmpty,
            isNewProperty,
            willInclude: isNotEmpty && (isDifferent || isNewProperty)
          });
        }
        
        // Only include properties that are DIFFERENT from defaults or NEW
        if (isNotEmpty && (isDifferent || isNewProperty)) {
          result[key] = currentValue;
        }
      }
    }
    
    return result;
  };
  
  const extracted = extractNested(currentProps, defaultProps);
  console.log('[extractEditedProperties] Extracted:', {
    componentType,
    inputKeys: Object.keys(currentProps).filter(k => !k.startsWith('_')),
    outputKeys: Object.keys(extracted),
    backgroundColor: extracted.backgroundColor,
    extracted
  });
  
  return extracted;
}

/**
 * Get nested value from object using dot notation path
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  
  return current;
}

/**
 * Track edited property paths for a component
 * Updates the __editedProps metadata
 */
export function trackEditedProperties(
  componentProps: Record<string, any>,
  componentType: ComponentType
): Set<string> {
  const defaultProps = getDefaultPropsForComponent(componentType);
  const editedPaths = new Set<string>();
  
  const trackNested = (
    current: Record<string, any>,
    defaults: Record<string, any>,
    path: string = ''
  ) => {
    for (const key in current) {
      // Skip internal metadata properties
      if (key.startsWith('_') || key === 'children' || key === 'appliedClasses' || 
          key === 'activeClass' || key === 'componentName') {
        continue;
      }
      
      const currentValue = current[key];
      const defaultValue = defaults?.[key];
      const fullPath = path ? `${path}.${key}` : key;
      
      if (
        currentValue !== null &&
        typeof currentValue === 'object' &&
        !Array.isArray(currentValue) &&
        !(currentValue instanceof Date)
      ) {
        trackNested(currentValue, defaultValue || {}, fullPath);
      } else {
        // Check if different from default
        if (!deepEqual(currentValue, defaultValue) && !isEmptyValue(currentValue)) {
          editedPaths.add(fullPath);
        }
      }
    }
  };
  
  trackNested(componentProps, defaultProps);
  return editedPaths;
}

/**
 * Check if a specific property has been edited
 */
export function isPropertyEdited(
  propertyPath: string,
  componentProps: Record<string, any>,
  componentType: ComponentType
): boolean {
  const defaultProps = getDefaultPropsForComponent(componentType);
  
  const currentValue = getNestedValue(componentProps, propertyPath);
  const defaultValue = getNestedValue(defaultProps, propertyPath);
  
  return !deepEqual(currentValue, defaultValue) && !isEmptyValue(currentValue);
}

/**
 * Merge only edited properties into existing class styles
 */
export function mergeEditedPropertiesIntoClass(
  existingClassStyles: Record<string, any>,
  newEditedProps: Record<string, any>
): Record<string, any> {
  console.log('[mergeEditedPropertiesIntoClass] Merging:', {
    existingKeys: Object.keys(existingClassStyles),
    newKeys: Object.keys(newEditedProps),
    existingBackgroundColor: existingClassStyles.backgroundColor,
    newBackgroundColor: newEditedProps.backgroundColor,
    existingBorder: existingClassStyles.border,
    newBorder: newEditedProps.border
  });
  
  const merged: Record<string, any> = { ...existingClassStyles };
  
  const deepMerge = (target: Record<string, any>, source: Record<string, any>) => {
    for (const key in source) {
      const sourceValue = source[key];
      
      if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        !(sourceValue instanceof Date)
      ) {
        // Nested object - merge recursively
        if (target[key] && typeof target[key] === 'object') {
          deepMerge(target[key], sourceValue);
        } else {
          target[key] = { ...sourceValue };
        }
      } else {
        // Primitive value - update it
        target[key] = sourceValue;
      }
    }
  };
  
  deepMerge(merged, newEditedProps);
  
  console.log('[mergeEditedPropertiesIntoClass] Result:', {
    mergedKeys: Object.keys(merged),
    backgroundColor: merged.backgroundColor,
    border: merged.border
  });
  
  return merged;
}

/**
 * Filter properties to only include those that are locked (user-edited)
 * Used when updating secondary classes to prevent inheriting primary class values
 */
export function filterByLockedProps(
  props: Record<string, any>,
  lockedProps: Record<string, any>
): Record<string, any> {
  if (!props || typeof props !== 'object') return {};
  if (!lockedProps || Object.keys(lockedProps).length === 0) return {};
  
  const result: Record<string, any> = {};
  
  for (const key of Object.keys(props)) {
    const propValue = props[key];
    const lockValue = lockedProps[key];
    
    // If this key exists in lockedProps
    if (lockValue !== undefined) {
      // If lockValue is true, include the property directly
      if (lockValue === true) {
        result[key] = propValue;
      }
      // If lockValue is an object and propValue is also an object, recurse
      else if (
        typeof lockValue === 'object' &&
        lockValue !== null &&
        typeof propValue === 'object' &&
        propValue !== null &&
        !Array.isArray(propValue)
      ) {
        const nestedResult = filterByLockedProps(propValue, lockValue);
        if (Object.keys(nestedResult).length > 0) {
          result[key] = nestedResult;
        }
      }
    }
  }
  
  return result;
}

/**
 * CRITICAL: Extract ONLY properties that were EXPLICITLY EDITED by the user
 * Used when creating a SECONDARY class - only stores USER EDITS, not inherited values
 * 
 * The key insight: __lockedProps tracks what the USER explicitly edited.
 * Only those properties should be included in a secondary class.
 */
export function extractDeltaFromClassContext(
  currentProps: Record<string, any>,
  componentType: ComponentType,
  existingClassStyles: Record<string, any>
): Record<string, any> {
  const defaultProps = getDefaultPropsForComponent(componentType);
  
  // Get locked props - these are the ONLY properties the user explicitly edited
  const lockedProps = currentProps.__lockedProps || {};
  
  // Metadata keys to always exclude
  const metadataKeys = [
    '_propertySource', '_autoClass', '__lockedProps', '__editedProps',
    'appliedClasses', 'activeClass', 'componentName', 'children',
    'onClick', 'onChange', 'onSubmit', 'className', 'id',
    'tag', 'content', 'href', 'target', 'src', 'alt', 'dataSource', 'formConfig', 'name'
  ];
  
  // Check if a property path is locked (user edited it)
  const isLocked = (lockObj: any, path: string[]): boolean => {
    let current = lockObj;
    for (const part of path) {
      if (current === undefined || current === null) return false;
      current = current[part];
    }
    return current === true;
  };
  
  // Recursively extract ONLY properties that are LOCKED (user-edited)
  const extractLocked = (
    current: Record<string, any>,
    locks: Record<string, any>,
    defaults: Record<string, any>,
    classStyles: Record<string, any>,
    pathParts: string[] = []
  ): Record<string, any> => {
    const result: Record<string, any> = {};
    
    for (const key in current) {
      // Skip metadata and functional properties
      if (key.startsWith('_') || key.startsWith('on') || metadataKeys.includes(key)) {
        continue;
      }
      
      const currentValue = current[key];
      const lockValue = locks?.[key];
      const defaultValue = defaults?.[key];
      const classValue = classStyles?.[key];
      const fullPath = [...pathParts, key];
      
      // If it's a nested object, recurse
      if (
        currentValue !== null &&
        typeof currentValue === 'object' &&
        !Array.isArray(currentValue) &&
        !(currentValue instanceof Date)
      ) {
        const nestedResult = extractLocked(
          currentValue,
          lockValue || {},
          defaultValue || {},
          classValue || {},
          fullPath
        );
        
        if (Object.keys(nestedResult).length > 0) {
          result[key] = nestedResult;
        }
      } else {
        // It's a primitive - ONLY include if it's LOCKED (user-edited)
        const isUserEdited = isLocked(lockedProps, fullPath);
        const isNotEmpty = !isEmptyValue(currentValue);
        
        if (isUserEdited && isNotEmpty) {
          result[key] = currentValue;
          console.log(`[extractDeltaFromClassContext] Including LOCKED property: ${fullPath.join('.')}`, {
            current: currentValue,
            wasUserEdited: true
          });
        }
      }
    }
    
    return result;
  };
  
  const delta = extractLocked(currentProps, lockedProps, defaultProps, existingClassStyles);
  
  console.log('[extractDeltaFromClassContext] Delta extracted (LOCKED props only):', {
    componentType,
    lockedPropsKeys: Object.keys(lockedProps),
    existingClassStyleKeys: Object.keys(existingClassStyles),
    deltaKeys: Object.keys(delta),
    delta
  });
  
  return delta;
}
