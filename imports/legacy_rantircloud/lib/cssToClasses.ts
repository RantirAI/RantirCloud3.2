/**
 * CSS to Classes Parser - Converts CSS code back to StyleClass updates
 * 
 * IMPORTANT: This parser produces FLAT style objects (e.g., { fontSize: "16px" })
 * which are merged directly into class.styles. The class store and CSS generator
 * both support flat properties at the root level of styles.
 */

export interface CSSParseResult {
  success: boolean;
  classUpdates: Map<string, Record<string, any>>;
  errors: CSSParseError[];
}

export interface CSSParseError {
  line: number;
  message: string;
}

/**
 * Check if a sizing value is a CSS default that should not be saved
 */
function isSizingDefault(key: string, value: any): boolean {
  const sizingDefaults: Record<string, (val: any) => boolean> = {
    width: (val) => val === 'auto' || val === '' || val === '100%',
    height: (val) => val === 'auto' || val === '',
    minWidth: (val) => val === '0' || val === '0px' || val === 0,
    minHeight: (val) => val === '0' || val === '0px' || val === 0 || val === '100px',
    maxWidth: (val) => val === 'none' || val === 'auto' || val === '' || val === '1100px',
    maxHeight: (val) => val === 'none' || val === 'auto' || val === '',
  };
  
  return sizingDefaults[key] ? sizingDefaults[key](value) : false;
}

/**
 * Parse CSS text and extract class updates
 * IMPORTANT: Filters out CSS default sizing values to keep classes clean
 */
export function parseCSSToClasses(cssText: string): CSSParseResult {
  const classUpdates = new Map<string, Record<string, any>>();
  const errors: CSSParseError[] = [];
  
  // Match CSS class rules: .className { ... }
  const ruleRegex = /\.([a-zA-Z0-9_-]+)\s*\{([^}]*)\}/g;
  let match;
  
  while ((match = ruleRegex.exec(cssText)) !== null) {
    const className = match[1];
    const declarations = match[2];
    
    const styles: Record<string, any> = {};
    
    // Parse declarations
    declarations.split(';').forEach(decl => {
      const trimmed = decl.trim();
      if (!trimmed) return;
      
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) return;
      
      const property = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();
      
      // Convert CSS property to JS property
      const jsProperty = cssPropertyToJS(property);
      if (jsProperty && value) {
        const parsedValue = parseCSSValue(value);
        
        // Skip sizing values that are CSS defaults - don't save these
        if (isSizingDefault(jsProperty, parsedValue)) {
          console.log('[CSSToClasses] Skipping default sizing value:', { property: jsProperty, value: parsedValue });
          return;
        }
        
        styles[jsProperty] = parsedValue;
      }
    });
    
    if (Object.keys(styles).length > 0) {
      classUpdates.set(className, styles);
    }
  }
  
  return {
    success: errors.length === 0,
    classUpdates,
    errors
  };
}

/**
 * Convert kebab-case CSS property to camelCase JS property
 */
function cssPropertyToJS(cssProp: string): string {
  return cssProp.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Parse CSS value (handle units, colors, etc.)
 */
function parseCSSValue(value: string): any {
  // Remove quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  
  // Try to parse as number with unit
  const numMatch = value.match(/^(-?\d+(?:\.\d+)?)(px|em|rem|%|vh|vw|vmin|vmax)?$/);
  if (numMatch) {
    const num = parseFloat(numMatch[1]);
    const unit = numMatch[2] || '';
    // Return as string for CSS compatibility
    return unit ? `${num}${unit}` : num;
  }
  
  return value;
}
