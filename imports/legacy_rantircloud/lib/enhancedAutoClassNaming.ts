/**
 * Enhanced Auto-Class Naming System
 * Supports configurable sequential numbering with advanced options
 * AND semantic naming from component IDs
 */

import { StyleClass } from '@/types/classes';
import {
  ClassNamingConfig,
  DEFAULT_NAMING_CONFIG,
  getSeparatorChar,
  padNumber,
  parseClassName,
  findAvailableNumbers,
  isSemanticComponentId,
  generateSemanticClassName,
} from '@/types/class-naming';

const NAMING_CONFIG_KEY = 'class-naming-config';

/**
 * Get the current naming configuration (from localStorage)
 */
export function getNamingConfig(projectId?: string): ClassNamingConfig {
  try {
    const key = projectId ? `${NAMING_CONFIG_KEY}-${projectId}` : NAMING_CONFIG_KEY;
    const stored = localStorage.getItem(key);
    if (stored) {
      return { ...DEFAULT_NAMING_CONFIG, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('[NamingConfig] Failed to load config:', error);
  }
  return DEFAULT_NAMING_CONFIG;
}

/**
 * Save naming configuration
 */
export function saveNamingConfig(config: ClassNamingConfig, projectId?: string): void {
  try {
    const key = projectId ? `${NAMING_CONFIG_KEY}-${projectId}` : NAMING_CONFIG_KEY;
    localStorage.setItem(key, JSON.stringify(config));
    console.log('[NamingConfig] Saved configuration:', config);
  } catch (error) {
    console.error('[NamingConfig] Failed to save config:', error);
  }
}

/**
 * Get effective config for a component type (with overrides)
 */
function getEffectiveConfig(
  baseType: string,
  config: ClassNamingConfig
): ClassNamingConfig {
  const override = config.typeOverrides?.[baseType];
  if (override) {
    return { ...config, ...override };
  }
  return config;
}

/**
 * Generate a unique auto-class name with advanced numbering
 * Now supports semantic naming from component IDs
 */
export function generateEnhancedClassName(
  baseType: string,
  existingClasses: StyleClass[],
  componentName?: string,
  projectId?: string,
  componentId?: string  // NEW: Pass component ID for semantic naming
): string {
  const config = getNamingConfig(projectId);
  const effectiveConfig = getEffectiveConfig(baseType, config);
  const existingNames = existingClasses.map(c => c.name);
  
  // NEW: If we have a semantic component ID, use it as the class name
  if (componentId && isSemanticComponentId(componentId)) {
    const semanticName = generateSemanticClassName(componentId, baseType, existingNames);
    console.log('[AutoClass] Using semantic class name from component ID:', {
      componentId,
      generatedName: semanticName,
    });
    return semanticName;
  }
  
  // FALLBACK: Generate based on type with configured numbering for consistency
  // Normalize the base type name - use lowercase for component types
  const baseName = baseType.toLowerCase();
  const sep = getSeparatorChar(effectiveConfig.separator);
  
  // No numbering mode - just use base name with uniqueness check
  if (effectiveConfig.numberingMode === 'none') {
    const existingNamesSet = new Set(existingNames);
    if (!existingNamesSet.has(baseName)) {
      return baseName;
    }
    // If base name exists, fall back to sequential
    return generateSequentialName(baseName, existingClasses, effectiveConfig);
  }
  
  // Sequential numbering mode
  return generateSequentialName(baseName, existingClasses, effectiveConfig);
}

/**
 * Generate a sequential name with the configured rules
 */
function generateSequentialName(
  baseName: string,
  existingClasses: StyleClass[],
  config: ClassNamingConfig
): string {
  const sep = getSeparatorChar(config.separator);
  const existingNames = new Set(existingClasses.map(c => c.name));
  
  // Extract existing numbers for this base name
  const existingNumbers = new Set<number>();
  existingClasses.forEach(cls => {
    const parsed = parseClassName(cls.name, config.separator);
    if (parsed.base === baseName && parsed.number !== null) {
      existingNumbers.add(parsed.number);
    }
  });
  
  // Find the next available number
  let nextNumber: number;
  
  if (config.reuseDeletedNumbers) {
    // Find gaps in the sequence
    const available = findAvailableNumbers(
      existingNumbers,
      config.startIndex,
      config.maxNumber
    );
    
    if (available.length === 0) {
      throw new Error(
        `No available class numbers for "${baseName}" (reached max: ${config.maxNumber})`
      );
    }
    
    nextNumber = available[0];
  } else {
    // Just find the next number after the highest
    let highest = config.startIndex - 1;
    existingNumbers.forEach(num => {
      if (num > highest) highest = num;
    });
    
    nextNumber = highest + 1;
    
    if (nextNumber > config.maxNumber) {
      throw new Error(
        `No available class numbers for "${baseName}" (reached max: ${config.maxNumber})`
      );
    }
  }
  
  // Format with padding
  const formattedNumber = padNumber(nextNumber, config.padding);
  const candidateName = `${baseName}${sep}${formattedNumber}`;
  
  // Final uniqueness check
  if (existingNames.has(candidateName)) {
    // This shouldn't happen, but just in case, find next available
    let attempt = nextNumber + 1;
    while (attempt <= config.maxNumber) {
      const attemptName = `${baseName}${sep}${padNumber(attempt, config.padding)}`;
      if (!existingNames.has(attemptName)) {
        console.log('[AutoClass] Generated unique name:', {
          baseType: baseName,
          number: attempt,
          finalName: attemptName,
        });
        return attemptName;
      }
      attempt++;
    }
    throw new Error(`Could not generate unique class name for "${baseName}"`);
  }
  
  console.log('[AutoClass] Generated unique name:', {
    baseType: baseName,
    number: nextNumber,
    finalName: candidateName,
    config: {
      padding: config.padding,
      separator: config.separator,
      reuseDeleted: config.reuseDeletedNumbers,
    },
  });
  
  return candidateName;
}

/**
 * Validate configuration values
 */
export function validateNamingConfig(config: Partial<ClassNamingConfig>): string[] {
  const errors: string[] = [];
  
  if (config.startIndex !== undefined) {
    if (config.startIndex < 0) {
      errors.push('Start index must be non-negative');
    }
    if (config.startIndex > 1000000) {
      errors.push('Start index cannot exceed 1,000,000');
    }
  }
  
  if (config.maxNumber !== undefined) {
    if (config.maxNumber < 1) {
      errors.push('Max number must be at least 1');
    }
    if (config.maxNumber > 1000000) {
      errors.push('Max number cannot exceed 1,000,000');
    }
  }
  
  if (config.padding !== undefined) {
    if (config.padding < 0) {
      errors.push('Padding must be non-negative');
    }
    if (config.padding > 10) {
      errors.push('Padding cannot exceed 10');
    }
  }
  
  if (
    config.startIndex !== undefined &&
    config.maxNumber !== undefined &&
    config.startIndex > config.maxNumber
  ) {
    errors.push('Start index cannot be greater than max number');
  }
  
  return errors;
}
