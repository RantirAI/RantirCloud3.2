/**
 * AutoClass System - Automatic CSS Class Management
 * Handles automatic class creation, reusability, inheritance tracking, and deduplication
 */

import { StyleClass, ComponentPropertySources } from '@/types/classes';

// Class Registry - Central storage for all class definitions
export interface ClassRegistry {
  [className: string]: {
    id: string;
    styles: Record<string, any>;
    stateStyles?: Record<string, Record<string, any>>;
    appliedTo: string[];
    inheritsFrom: string[];
    isAutoClass: boolean;
  };
}

// Style Hash Registry for deduplication
const styleHashRegistry = new Map<string, string>();

/**
 * Simple hash function for browser environment
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

/**
 * Generate a hash for a style object to detect duplicates
 */
export function generateStyleHash(styles: Record<string, any>): string {
  // Normalize and sort keys for consistent hashing
  const normalized = Object.keys(styles)
    .filter(key => !key.startsWith('_')) // Exclude metadata
    .sort()
    .reduce((acc, key) => {
      acc[key] = styles[key];
      return acc;
    }, {} as Record<string, any>);
  
  const styleString = JSON.stringify(normalized);
  return simpleHash(styleString);
}

/**
 * Check if a style set already exists and return the class
 * IMPROVED: Uses style hash for faster deduplication
 */
export function findExistingClassByStyles(
  styles: Record<string, any>,
  classes: StyleClass[]
): StyleClass | null {
  // Generate hash for the input styles
  const hash = generateStyleHash(styles);
  
  // Fast path: Check hash registry first
  if (styleHashRegistry.has(hash)) {
    const className = styleHashRegistry.get(hash)!;
    const existingClass = classes.find(c => c.name === className);
    if (existingClass) {
      console.log('[AutoClass] Found existing class via hash:', existingClass.name);
      return existingClass;
    }
  }
  
  // Slow path: Compare all classes manually
  for (const cls of classes) {
    // Only consider auto-classes for reuse
    if (!cls.isAutoClass) continue;
    
    const clsHash = generateStyleHash(cls.styles);
    if (clsHash === hash) {
      console.log('[AutoClass] Found existing class via manual comparison:', cls.name);
      styleHashRegistry.set(hash, cls.name);
      return cls;
    }
  }
  
  console.log('[AutoClass] No existing class found for styles hash:', hash);
  return null;
}

/**
 * Register a new style hash
 */
export function registerStyleHash(styles: Record<string, any>, className: string): void {
  const hash = generateStyleHash(styles);
  styleHashRegistry.set(hash, className);
}

/**
 * Generate a unique auto-class name
 * If componentId is semantic (e.g., "hero-section"), use it as the class name
 * Otherwise, generate based on component type
 * 
 * This function now delegates to the enhanced naming system
 * which supports semantic naming from component IDs
 */
export function generateAutoClassName(
  baseType: string, 
  existingClasses: StyleClass[],
  componentName?: string,
  projectId?: string,
  componentId?: string  // NEW: Pass component ID for semantic naming
): string {
  // Import dynamically to avoid circular dependencies
  try {
    const { generateEnhancedClassName } = require('./enhancedAutoClassNaming');
    return generateEnhancedClassName(baseType, existingClasses, componentName, projectId, componentId);
  } catch (error) {
    // Fallback to kebab-case naming if enhanced system fails
    console.warn('[AutoClass] Enhanced naming failed, using fallback:', error);
    
    // Check if componentId is semantic and use it directly
    if (componentId && isSemanticId(componentId)) {
      const existingNames = new Set(existingClasses.map(c => c.name));
      if (!existingNames.has(componentId)) {
        return componentId;
      }
    }
    
    // Always use lowercase with hyphens (kebab-case) for CSS compatibility
    const baseName = baseType.toLowerCase();
    const existingNames = new Set(existingClasses.map(c => c.name));
    
    let number = 1;
    let candidateName = `${baseName}-${number}`;
    
    while (existingNames.has(candidateName)) {
      number++;
      candidateName = `${baseName}-${number}`;
    }
    
    return candidateName;
  }
}

/**
 * Check if an ID is semantic (meaningful) vs generic (random/timestamped)
 */
function isSemanticId(id: string): boolean {
  if (!id) return false;
  
  // Generic patterns to reject
  const genericPatterns = [
    /^div-\d+$/,
    /^section-\d+$/,
    /^heading-\d+$/,
    /^text-\d+$/,
    /^button-\d+$/,
    /^container-\d+$/,
    /-\d{10,}$/,
    /-[a-z0-9]{8,}$/,
  ];
  
  for (const pattern of genericPatterns) {
    if (pattern.test(id)) return false;
  }
  
  // If it contains meaningful words, consider it semantic
  const meaningfulWords = ['nav', 'hero', 'about', 'skills', 'projects', 'testimonial', 
    'contact', 'footer', 'header', 'content', 'grid', 'row', 'card', 'title', 
    'description', 'link', 'button', 'cta', 'social', 'avatar', 'logo', 'brand',
    'section', 'container', 'wrapper', 'badge', 'icon', 'image', 'thumbnail'];
  
  return meaningfulWords.some(word => id.toLowerCase().includes(word));
}

/**
 * Deep merge helper for nested style objects
 */
function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target };
  
  for (const key in source) {
    if (key.startsWith('_')) continue; // Skip internal properties
    
    const sourceValue = source[key];
    const targetValue = target[key];
    
    // Handle nested objects
    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      !(sourceValue instanceof Date)
    ) {
      if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
        // Both are objects - merge recursively
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        // Target doesn't have this object - copy it
        result[key] = deepMerge({}, sourceValue);
      }
    } else {
      // Primitive value - apply it
      result[key] = sourceValue;
    }
  }
  
  return result;
}

/**
 * Merge class styles following inheritance chain with deep merging
 */
export function mergeInheritedStyles(
  classStack: string[],
  classes: StyleClass[]
): Record<string, any> {
  let merged: Record<string, any> = {};
  
  // Apply styles in order (base to specific) with deep merge
  for (const className of classStack) {
    const cls = classes.find(c => c.name === className);
    if (cls) {
      merged = deepMerge(merged, cls.styles);
    }
  }
  
  return merged;
}

/**
 * Get property sources from class stack with nested property tracking
 */
export function getPropertySourcesFromStack(
  classStack: string[],
  classes: StyleClass[]
): ComponentPropertySources {
  const sources: ComponentPropertySources = {};
  
  // Helper to recursively track nested properties
  const trackProperties = (obj: Record<string, any>, cls: StyleClass, path: string = '') => {
    for (const key in obj) {
      if (key.startsWith('_')) continue; // Skip internal properties
      
      const propertyPath = path ? `${path}.${key}` : key;
      const value = obj[key];
      
      // If it's a nested object, recurse
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !(value instanceof Date)
      ) {
        trackProperties(value, cls, propertyPath);
      } else {
        // Track this property
        sources[propertyPath] = {
          source: 'class',
          classId: cls.id,
          className: cls.name
        };
      }
    }
  };
  
  // Track which class defined each property (later classes override earlier ones)
  for (const className of classStack) {
    const cls = classes.find(c => c.name === className);
    if (cls && cls.styles) {
      trackProperties(cls.styles, cls);
    }
  }
  
  return sources;
}

/**
 * Determine if a property is active (from active class) or inherited
 * Now explicitly checks against the activeClassName parameter
 */
export function getPropertyStatus(
  propertyName: string,
  activeClassName: string | null,
  propertySources: ComponentPropertySources
): 'active' | 'inherited' | 'manual' | 'none' {
  const source = propertySources[propertyName];
  
  if (!source) return 'none';
  
  if (source.source === 'manual') return 'manual';
  
  if (source.source === 'class') {
    // Explicit comparison: property is active only if it comes from the explicitly active class
    if (activeClassName && source.className === activeClassName) {
      return 'active';
    }
    return 'inherited';
  }
  
  return 'none';
}

/**
 * Extract style properties from component props (excluding functional props)
 */
export function extractStyleProperties(props: Record<string, any>): Record<string, any> {
  const excludedProps = [
    'children', 'text', 'content', 'onClick', 'onChange', 'onSubmit', 
    'href', 'src', 'alt', 'placeholder', 'value', 'appliedClasses', 
    '_propertySource', '_autoClass', 'className'
  ];
  
  const styleProps: Record<string, any> = {};
  
  Object.keys(props).forEach(key => {
    if (!excludedProps.includes(key) && 
        !key.startsWith('on') && 
        !key.startsWith('_')) {
      styleProps[key] = props[key];
    }
  });
  
  return styleProps;
}

/**
 * Check if component needs auto-class update
 */
export function shouldUpdateAutoClass(
  componentProps: Record<string, any>,
  changedProps: Record<string, any>
): boolean {
  const styleChanges = extractStyleProperties(changedProps);
  
  // Check if any changed property is not from a class
  const propertySources = componentProps._propertySource || {};
  
  return Object.keys(styleChanges).some(key => {
    const source = propertySources[key];
    return !source || source.source !== 'class';
  });
}

/**
 * Create override for inherited property
 */
export function createPropertyOverride(
  propertyName: string,
  newValue: any,
  activeClass: StyleClass,
  inheritedValue: any
): StyleClass {
  if (newValue === inheritedValue) {
    // Remove override if value matches inherited
    const { [propertyName]: removed, ...rest } = activeClass.styles;
    return {
      ...activeClass,
      styles: rest
    };
  }
  
  // Add override
  return {
    ...activeClass,
    styles: {
      ...activeClass.styles,
      [propertyName]: newValue
    }
  };
}

/**
 * Export class definitions as CSS string
 */
export function exportClassesToCSS(classes: StyleClass[]): string {
  let css = '';
  
  // Sort by creation date to maintain order
  const sortedClasses = [...classes].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  for (const cls of sortedClasses) {
    const className = cls.name.replace(/\s+/g, '-').toLowerCase();
    
    // Base class
    css += `.${className} {\n`;
    Object.entries(cls.styles).forEach(([prop, value]) => {
      const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
      css += `  ${cssProp}: ${value};\n`;
    });
    css += `}\n\n`;
    
    // State classes (hover, focus, etc.)
    if (cls.stateStyles) {
      Object.entries(cls.stateStyles).forEach(([state, styles]) => {
        if (state !== 'none' && Object.keys(styles).length > 0) {
          const pseudo = state === 'focused' ? 'focus-visible' : state === 'pressed' ? 'active' : state;
          css += `.${className}:${pseudo} {\n`;
          Object.entries(styles).forEach(([prop, value]) => {
            const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
            css += `  ${cssProp}: ${value};\n`;
          });
          css += `}\n\n`;
        }
      });
    }
  }
  
  return css;
}

/**
 * Validate class name
 */
export function isValidClassName(name: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9\s-_]*$/.test(name);
}

/**
 * Sanitize class name for CSS
 */
export function sanitizeClassName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .toLowerCase();
}
