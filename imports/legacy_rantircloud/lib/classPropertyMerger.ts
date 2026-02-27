import { ComponentPropertySources } from '@/types/classes';
import { LockedProperties, isPropertyLocked } from './propertyLockTracker';

/**
 * Deep merge styles with property-level granularity
 * Respects locked properties (user-edited) and class priority
 * 
 * Priority Order:
 * 1. Locked properties (user-edited) - NEVER overridden
 * 2. Primary class properties - Can override secondary classes
 * 3. Secondary class properties - Only fill unset SUB-PROPERTIES (deep merge)
 * 4. Base/default properties
 * 
 * @param base - Base object to merge into
 * @param incoming - Incoming object to merge from
 * @param lockedProps - Properties that are locked (user-edited)
 * @param currentPath - Current property path (for nested tracking)
 * @param canOverride - Whether incoming can override base properties
 */
function deepMergeStyles(
  base: Record<string, any>,
  incoming: Record<string, any>,
  lockedProps: LockedProperties = {},
  currentPath: string = '',
  canOverride: boolean = false
): Record<string, any> {
  const result = { ...base };

  for (const key in incoming) {
    // Skip internal metadata properties
    if (key.startsWith('_') || key.startsWith('on')) continue;

    const propertyPath = currentPath ? `${currentPath}.${key}` : key;
    const incomingValue = incoming[key];
    const baseValue = base[key];

    // CRITICAL: Check if this EXACT property path is locked
    if (isPropertyLocked(lockedProps, propertyPath)) {
      console.log(`[deepMergeStyles] ⊘ Skipping locked property "${propertyPath}"`);
      continue;
    }

    // Handle nested objects (like spacingControl, layoutControl, typography, etc.)
    if (
      incomingValue !== null &&
      typeof incomingValue === 'object' &&
      !Array.isArray(incomingValue) &&
      !(incomingValue instanceof Date)
    ) {
      // DEEP SUB-PROPERTY MERGING: Always merge nested objects recursively
      // This allows secondary classes to fill individual sub-properties
      if (baseValue && typeof baseValue === 'object' && !Array.isArray(baseValue)) {
        result[key] = deepMergeStyles(
          baseValue,
          incomingValue,
          lockedProps,
          propertyPath,
          canOverride
        );
      } else {
        // Base doesn't have this object - create it with incoming values (respecting locks)
        result[key] = deepMergeStyles(
          {},
          incomingValue,
          lockedProps,
          propertyPath,
          canOverride
        );
      }
    } else {
      // Primitive value handling
      if (baseValue === undefined) {
        // Property not set in base - ALWAYS apply (secondary can fill missing props)
        result[key] = incomingValue;
      } else if (canOverride) {
        // Primary class CAN override existing primitives
        result[key] = incomingValue;
      }
      // else: Secondary class CANNOT override existing primitive values
    }
  }

  return result;
}

/**
 * Smart merge class properties with component properties
 * Implements Webflow-style cascade logic with deep property merging
 * 
 * Cascade Rules:
 * 1. Locked (manual) properties are NEVER overwritten by any class
 * 2. PRIMARY class → can override all properties (except locked)
 * 3. SECONDARY class → only fills unset properties, recursive deep merge
 * 4. Nested objects (spacingControl, etc.) merge at sub-property level
 * 
 * @param componentProps - Current component properties
 * @param classStyles - Styles from the class being applied
 * @param classId - ID of the class being applied
 * @param className - Name of the class being applied
 * @param currentPropertySources - Current property source tracking
 * @param isPrimaryClass - Whether this class is the active/primary class (can override)
 * @param lockedProps - Properties locked by user edits
 */
export function mergeClassProperties(
  componentProps: Record<string, any>,
  classStyles: Record<string, any>,
  classId: string,
  className: string,
  currentPropertySources?: ComponentPropertySources,
  isPrimaryClass: boolean = false,
  lockedProps?: LockedProperties
): { 
  mergedProps: Record<string, any>;
  propertySources: ComponentPropertySources;
} {
  console.log('[mergeClassProperties] Starting merge', {
    className,
    classId,
    isPrimaryClass,
    classStyleKeys: Object.keys(classStyles),
    lockedProps,
    existingProps: Object.keys(componentProps)
  });

  // Perform deep merge
  const mergedProps = deepMergeStyles(
    componentProps,
    classStyles,
    lockedProps || {},
    '',
    isPrimaryClass // Primary class can override, secondary cannot
  );

  // Update property sources for tracking at NESTED PATH level
  const propertySources: ComponentPropertySources = { ...(currentPropertySources || {}) };
  
  // Track sources for all applied properties using DOT-NOTATION paths
  const updatePropertySources = (
    classObj: Record<string, any>,
    path: string = ''
  ) => {
    for (const key in classObj) {
      if (key.startsWith('_') || key.startsWith('on')) continue;
      
      const propertyPath = path ? `${path}.${key}` : key;
      const value = classObj[key];
      
      // Check if property was actually applied (not locked)
      if (isPropertyLocked(lockedProps || {}, propertyPath)) {
        continue;
      }
      
      // If it's an object, recurse to track nested paths
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        updatePropertySources(value, propertyPath);
      } else {
        // Track source for this SPECIFIC nested path
        const existingSource = propertySources[propertyPath];
        
        // Update source if:
        // 1. No existing source (first time set), OR
        // 2. This is primary class (can override anything), OR
        // 3. Existing source is from same class (updating same class)
        if (
          !existingSource ||
          isPrimaryClass ||
          existingSource.classId === classId
        ) {
          propertySources[propertyPath] = {
            source: 'class',
            classId,
            className
          };
        }
      }
    }
  };
  
  updatePropertySources(classStyles);

  console.log('[mergeClassProperties] Merge complete', {
    mergedPropKeys: Object.keys(mergedProps),
    propertySources
  });

  return { mergedProps, propertySources };
}

/**
 * Remove class properties from component with deep property tracking
 * Handles nested properties and removes them correctly
 */
export function removeClassProperties(
  componentProps: Record<string, any>,
  classStyles: Record<string, any>,
  classId: string,
  currentPropertySources?: ComponentPropertySources
): {
  mergedProps: Record<string, any>;
  propertySources: ComponentPropertySources;
} {
  const mergedProps = { ...componentProps };
  const propertySources: ComponentPropertySources = { ...(currentPropertySources || {}) };

  console.log('[removeClassProperties] Before removal', { 
    classId, 
    classStyles, 
    currentPropertySources,
    mergedPropsKeys: Object.keys(mergedProps) 
  });

  // Remove properties that came from this specific class
  // This includes both direct and nested properties
  const keysToRemove: string[] = [];
  
  // Helper to remove nested properties recursively
  const removeNestedProps = (obj: any, styleObj: any, path: string = '') => {
    for (const key in styleObj) {
      if (key.startsWith('_')) continue;
      
      const propertyPath = path ? `${path}.${key}` : key;
      const source = propertySources[propertyPath];
      
      // Check if this property came from the class being removed
      if (source?.classId === classId) {
        keysToRemove.push(propertyPath);
        
        // For nested paths, navigate and delete
        if (path) {
          const parts = path.split('.');
          let current = obj;
          for (let i = 0; i < parts.length - 1; i++) {
            current = current?.[parts[i]];
            if (!current) break;
          }
          if (current && parts.length > 0) {
            const lastPart = parts[parts.length - 1];
            if (current[lastPart] && typeof current[lastPart] === 'object') {
              delete current[lastPart][key];
            }
          }
        } else {
          // Direct property
          if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            // For nested objects, remove the child property
            delete obj[key][Object.keys(styleObj[key])[0]];
          } else {
            delete obj[key];
          }
        }
        
        delete propertySources[propertyPath];
      }
      
      // Recurse for nested objects
      const value = styleObj[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (obj[key] && typeof obj[key] === 'object') {
          removeNestedProps(obj[key], value, propertyPath);
        }
      }
    }
  };
  
  removeNestedProps(mergedProps, classStyles);

  console.log('[removeClassProperties] After removal', { 
    keysRemoved: keysToRemove,
    mergedPropsKeys: Object.keys(mergedProps),
    remainingSources: propertySources 
  });

  return { mergedProps, propertySources };
}

/**
 * Get property names that are controlled by classes
 */
export function getClassControlledProperties(propertySources?: ComponentPropertySources): string[] {
  if (!propertySources) return [];
  
  return Object.keys(propertySources).filter(key => 
    propertySources[key].source === 'class'
  );
}

/**
 * Check if a property is controlled by a class
 */
export function isPropertyFromClass(
  propertyName: string,
  propertySources?: ComponentPropertySources
): boolean {
  return propertySources?.[propertyName]?.source === 'class';
}
