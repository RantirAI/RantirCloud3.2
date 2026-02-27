/**
 * Property Lock Tracker
 * Tracks which properties have been manually edited by the user
 * These "locked" properties prevent class inheritance from overriding them
 */

export interface LockedProperties {
  [key: string]: boolean | LockedProperties; // Can be nested
}

/**
 * Mark a property as locked (user-edited)
 */
export function lockProperty(
  lockedProps: LockedProperties | undefined,
  propertyPath: string
): LockedProperties {
  const locked = { ...(lockedProps || {}) };
  const parts = propertyPath.split('.');
  
  if (parts.length === 1) {
    // Simple property
    locked[parts[0]] = true;
  } else {
    // Nested property
    const [first, ...rest] = parts;
    const nested = locked[first] as LockedProperties || {};
    locked[first] = lockProperty(
      typeof nested === 'object' ? nested : {},
      rest.join('.')
    );
  }
  
  return locked;
}

/**
 * Unlock a property (allow class inheritance again)
 */
export function unlockProperty(
  lockedProps: LockedProperties | undefined,
  propertyPath: string
): LockedProperties {
  if (!lockedProps) return {};
  
  const locked = { ...lockedProps };
  const parts = propertyPath.split('.');
  
  if (parts.length === 1) {
    delete locked[parts[0]];
  } else {
    const [first, ...rest] = parts;
    const nested = locked[first];
    if (typeof nested === 'object') {
      locked[first] = unlockProperty(nested, rest.join('.'));
      // Clean up empty objects
      if (Object.keys(locked[first] as object).length === 0) {
        delete locked[first];
      }
    }
  }
  
  return locked;
}

/**
 * Check if a property is locked
 */
export function isPropertyLocked(
  lockedProps: LockedProperties | undefined,
  propertyPath: string
): boolean {
  if (!lockedProps) return false;
  
  const parts = propertyPath.split('.');
  let current: any = lockedProps;
  
  for (const part of parts) {
    if (!current || typeof current !== 'object') return false;
    current = current[part];
    if (current === true) return true;
    if (current === undefined) return false;
  }
  
  return current === true;
}

/**
 * Get all locked property paths (flattened)
 */
export function getLockedPropertyPaths(
  lockedProps: LockedProperties | undefined,
  prefix = ''
): string[] {
  if (!lockedProps) return [];
  
  const paths: string[] = [];
  
  for (const [key, value] of Object.entries(lockedProps)) {
    const path = prefix ? `${prefix}.${key}` : key;
    
    if (value === true) {
      paths.push(path);
    } else if (typeof value === 'object') {
      paths.push(...getLockedPropertyPaths(value, path));
    }
  }
  
  return paths;
}

/**
 * Merge locked properties (used when applying classes)
 */
export function mergeLockedProperties(
  existing: LockedProperties | undefined,
  additional: LockedProperties | undefined
): LockedProperties {
  if (!existing && !additional) return {};
  if (!existing) return { ...additional };
  if (!additional) return { ...existing };
  
  const merged: LockedProperties = { ...existing };
  
  for (const [key, value] of Object.entries(additional)) {
    if (value === true) {
      merged[key] = true;
    } else if (typeof value === 'object') {
      const existingValue = merged[key];
      merged[key] = mergeLockedProperties(
        typeof existingValue === 'object' ? existingValue : {},
        value
      );
    }
  }
  
  return merged;
}
