/**
 * Property Indicator Logic
 * Determines the correct visual indicator (color) for each property
 * based on its source and active class state
 */

import { ComponentPropertySources } from '@/types/classes';

export type PropertyIndicatorColor = 'blue' | 'yellow' | 'green' | 'gray' | 'purple' | 'teal';

export interface PropertyIndicatorInfo {
  color: PropertyIndicatorColor;
  label: string;
  description: string;
}

/**
 * Get the indicator color and info for a property
 * @param propertyName - The name of the property to check
 * @param activeClassName - The currently active/primary class name (null if none)
 * @param propertySources - Map of property names to their source info
 * @param propertyValue - The current value of the property (to check if set)
 * @param isTokenControlled - Whether this property is controlled by a design token
 * @param tokenName - The name of the token controlling this property
 * @param parentClassName - If set, indicates this property is inherited from a parent element
 * @returns PropertyIndicatorInfo with color, label, and description
 */
export function getPropertyIndicator(
  propertyName: string,
  activeClassName: string | null,
  propertySources?: ComponentPropertySources,
  propertyValue?: any,
  isTokenControlled?: boolean,
  tokenName?: string,
  parentClassName?: string,
  appliedClasses?: string[]
): PropertyIndicatorInfo {
  // If no value set, it's gray (default/unset) - no indicator
  const isUnset = propertyValue === undefined || propertyValue === null || propertyValue === '';
  
  // Check if property is from a valid applied class
  const source = propertySources?.[propertyName];
  const sourceClassApplied = source?.className ? appliedClasses?.includes(source.className) : false;
  
  // Check if component has ANY applied classes at all
  const hasAnyAppliedClasses = appliedClasses && appliedClasses.length > 0;
  
  // If property has a parent source (inherited from parent container's class)
  if (parentClassName) {
    // CRITICAL: Only show "Override" if:
    // 1. The component HAS at least one applied class
    // 2. AND that class explicitly defines this property (sourceClassApplied)
    // 3. AND the source is marked as 'class'
    if (hasAnyAppliedClasses && sourceClassApplied && source?.source === 'class') {
      return {
        color: 'blue',
        label: 'Override',
        description: `Overrides parent with .${source.className}`
      };
    }
    
    // Component has no class OR class doesn't define this property
    // Show yellow = inheriting from parent (cannot override without a class)
    return {
      color: 'yellow',
      label: 'Inherited',
      description: `From .${parentClassName} (parent)`
    };
  }

  // If no value set, it's gray (default/unset)
  if (isUnset) {
    return {
      color: 'gray',
      label: 'Default',
      description: 'Property is unset or using default value'
    };
  }

  // If controlled by a design token, show purple
  if (isTokenControlled && tokenName) {
    return {
      color: 'purple',
      label: 'Token',
      description: `Controlled by token "${tokenName}"`
    };
  }

  // If we already checked source above, reuse it here
  if (!source || !source.className) {
    // No source info or no class name = no indicator (green, hidden)
    return {
      color: 'green',
      label: 'Manual',
      description: 'Manually set on this component'
    };
  }

  // Already verified sourceClassApplied above
  if (!sourceClassApplied) {
    // Source class is no longer applied - treat as manual/no indicator
    return {
      color: 'green',
      label: 'Manual',
      description: 'Value without active class'
    };
  }

  if (source.source === 'class') {
    // From a class - check if it's the active/primary class
    if (activeClassName && source.className === activeClassName) {
      // From active class = blue
      return {
        color: 'blue',
        label: 'Active Class',
        description: `From active class "${source.className}"`
      };
    } else {
      // From secondary class = yellow
      return {
        color: 'yellow',
        label: 'Secondary',
        description: `From class "${source.className}"`
      };
    }
  }

  if (source.source === 'manual') {
    return {
      color: 'green',
      label: 'Manual',
      description: 'Manually set on this component'
    };
  }

  // Fallback - no indicator
  return {
    color: 'gray',
    label: 'Default',
    description: 'Property source unknown'
  };
}

/**
 * Get CSS class for indicator dot
 */
export function getIndicatorDotClass(color: PropertyIndicatorColor): string {
  switch (color) {
    case 'blue':
      return 'bg-blue-500';
    case 'yellow':
      return 'bg-yellow-500';
    case 'green':
      return 'bg-green-500';
    case 'purple':
      return 'bg-purple-500';
    case 'teal':
      return 'bg-teal-500';
    case 'gray':
    default:
      return 'bg-gray-400';
  }
}

/**
 * Get CSS class for indicator text
 */
export function getIndicatorTextClass(color: PropertyIndicatorColor): string {
  switch (color) {
    case 'blue':
      return 'text-blue-600 dark:text-blue-400';
    case 'yellow':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'green':
      return 'text-green-600 dark:text-green-400';
    case 'purple':
      return 'text-purple-600 dark:text-purple-400';
    case 'teal':
      return 'text-teal-600 dark:text-teal-400';
    case 'gray':
    default:
      return 'text-gray-500 dark:text-gray-400';
  }
}
