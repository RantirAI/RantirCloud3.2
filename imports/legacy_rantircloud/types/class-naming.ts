/**
 * Configuration for auto-class naming system
 */

export type NumberingMode = 'none' | 'sequential';
export type SeparatorType = 'space' | 'dash' | 'underscore';

export interface ClassNamingConfig {
  // Numbering behavior
  numberingMode: NumberingMode;
  startIndex: number; // Start from 0, 1, or any number
  maxNumber: number; // Ceiling (default 1,000,000)
  
  // Formatting
  padding: number; // 0 = no padding, 3 = "001", 4 = "0001"
  separator: SeparatorType; // ' ' | '-' | '_'
  
  // Reuse behavior
  reuseDeletedNumbers: boolean; // Fill gaps when classes are deleted
  
  // Per-type configuration (optional overrides)
  typeOverrides?: {
    [componentType: string]: Partial<ClassNamingConfig>;
  };
}

export const DEFAULT_NAMING_CONFIG: ClassNamingConfig = {
  numberingMode: 'sequential',
  startIndex: 1,
  maxNumber: 1000000,
  padding: 0,
  separator: 'dash', // Use dash for component-type-1 format
  reuseDeletedNumbers: true, // Fill gaps when classes are renamed/deleted
};

/**
 * Get the separator character from type
 */
export function getSeparatorChar(separator: SeparatorType): string {
  switch (separator) {
    case 'space': return ' ';
    case 'dash': return '-';
    case 'underscore': return '_';
  }
}

/**
 * Pad a number with zeros
 */
export function padNumber(num: number, padding: number): string {
  if (padding === 0) return num.toString();
  return num.toString().padStart(padding, '0');
}

/**
 * Parse a class name to extract its base and number
 */
export function parseClassName(
  className: string, 
  separator: SeparatorType
): { base: string; number: number | null } {
  const sep = getSeparatorChar(separator);
  const parts = className.split(sep);
  
  if (parts.length < 2) {
    return { base: className, number: null };
  }
  
  const lastPart = parts[parts.length - 1];
  const number = parseInt(lastPart, 10);
  
  if (isNaN(number)) {
    return { base: className, number: null };
  }
  
  const base = parts.slice(0, -1).join(sep);
  return { base, number };
}

/**
 * Find available numbers in a range (for reuse)
 */
export function findAvailableNumbers(
  existingNumbers: Set<number>,
  startIndex: number,
  maxNumber: number
): number[] {
  const available: number[] = [];
  
  for (let i = startIndex; i <= maxNumber; i++) {
    if (!existingNumbers.has(i)) {
      available.push(i);
    }
  }
  
  return available;
}

/**
 * Check if a component ID is semantic (meaningful) vs generic (random/timestamped)
 * Semantic IDs like "hero-section", "nav-container" are preferred for class names
 */
export function isSemanticComponentId(id: string): boolean {
  if (!id) return false;
  
  // Generic patterns to reject
  const genericPatterns = [
    /^div-\d+$/,           // div-1, div-123
    /^section-\d+$/,       // section-1, section-2
    /^heading-\d+$/,       // heading-66
    /^text-\d+$/,          // text-145
    /^button-\d+$/,        // button-59
    /^container-\d+$/,     // container-123
    /^component-\d+$/,     // component-456
    /-\d{10,}$/,           // ends with timestamp like -1737123456789
    /-[a-z0-9]{8,}$/,      // ends with random hash like -x8f9k2abc
  ];
  
  for (const pattern of genericPatterns) {
    if (pattern.test(id)) return false;
  }
  
  // If it contains meaningful words, consider it semantic
  const meaningfulWords = ['nav', 'hero', 'about', 'skills', 'projects', 'testimonial', 
    'contact', 'footer', 'header', 'content', 'grid', 'row', 'card', 'title', 
    'description', 'link', 'button', 'cta', 'social', 'avatar', 'logo', 'brand',
    'section', 'container', 'wrapper', 'badge', 'icon', 'image', 'thumbnail'];
  
  const hasSemanticWord = meaningfulWords.some(word => id.toLowerCase().includes(word));
  return hasSemanticWord;
}

/**
 * Generate a semantic class name from a component ID
 * If the ID is already semantic, use it directly as the class name
 * Otherwise, fall back to type-based naming
 */
export function generateSemanticClassName(
  componentId: string,
  componentType: string,
  existingClassNames: string[]
): string {
  // If component ID is semantic, use it as the class name
  if (isSemanticComponentId(componentId)) {
    // Check if this name already exists
    if (!existingClassNames.includes(componentId)) {
      return componentId;
    }
    // If it exists, append a number
    let counter = 2;
    while (existingClassNames.includes(`${componentId}-${counter}`)) {
      counter++;
    }
    return `${componentId}-${counter}`;
  }
  
  // Fall back to type-based naming (section-1, heading-2, etc.)
  const baseName = componentType.toLowerCase();
  let counter = 1;
  let candidateName = `${baseName}-${counter}`;
  
  while (existingClassNames.includes(candidateName)) {
    counter++;
    candidateName = `${baseName}-${counter}`;
  }
  
  return candidateName;
}
