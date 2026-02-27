/**
 * AI Component Sanitizer
 * 
 * Sanitizes raw AI-generated component trees to ensure they are valid objects
 * that can be safely processed without runtime crashes. This prevents the
 * "Cannot create property 'props' on string" error.
 */

import { v4 as uuidv4 } from 'uuid';

// Text-like component types that can have their children merged into props
const TEXT_LIKE_TYPES = new Set(['heading', 'text', 'label', 'paragraph', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const BUTTON_TYPES = new Set(['button', 'link']);

/**
 * Generate a unique ID for synthetic components.
 * Uses component type as prefix for better semantic normalization downstream.
 */
function generateSanitizedId(prefix: string = 'element'): string {
  // Use semantic prefix to help class name normalization
  // Avoid 'sanitized' as prefix since it has no semantic meaning
  const semanticPrefix = prefix === 'sanitized' ? 'element' : prefix;
  return `${semanticPrefix}-${uuidv4().slice(0, 8)}`;
}

/**
 * Check if a value is a plain object (not null, array, or primitive)
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Create a minimal text component from a primitive value
 */
function createTextComponent(value: unknown): Record<string, unknown> {
  return {
    id: generateSanitizedId('text'),
    type: 'text',
    props: { content: String(value ?? '') },
    style: {},
    children: []
  };
}

/**
 * Create a minimal div component as fallback for invalid nodes
 */
function createFallbackComponent(originalValue?: unknown): Record<string, unknown> {
  const comp: Record<string, unknown> = {
    id: generateSanitizedId('fallback'),
    type: 'div',
    props: { _sanitized: true },
    style: {},
    children: []
  };
  
  if (originalValue !== undefined && originalValue !== null) {
    (comp.props as Record<string, unknown>)._originalValue = String(originalValue);
  }
  
  return comp;
}

/**
 * Sanitize a raw component node to ensure it's a valid object structure.
 * 
 * Handles these cases:
 * 1. Primitive values (strings, numbers, booleans) -> Convert to text component
 * 2. Null/undefined -> Return null (to be filtered out)
 * 3. Objects without type -> Coerce to 'div'
 * 4. Objects with non-object props -> Convert props to object
 * 5. Objects with non-array children -> Convert to array
 * 6. Recursively sanitize children
 */
export function sanitizeRawNode(node: unknown, parentType?: string): Record<string, unknown> | null {
  // Case 1: null/undefined -> drop
  if (node === null || node === undefined) {
    return null;
  }

  // Case 2: Primitive (string, number, boolean) -> create text component or merge into parent
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
    const stringValue = String(node);
    
    // If empty string, drop it
    if (stringValue.trim() === '') {
      return null;
    }
    
    // For text-like or button parents, this primitive will be handled by parent
    // Here we just convert to a text component
    console.warn(`[Sanitizer] Converting primitive child to text component: "${stringValue.slice(0, 50)}..."`);
    return createTextComponent(stringValue);
  }

  // Case 3: Arrays (shouldn't be at node level, but handle gracefully)
  if (Array.isArray(node)) {
    // Take first valid item if it's an array
    if (node.length > 0) {
      return sanitizeRawNode(node[0], parentType);
    }
    return null;
  }

  // Case 4: Not a plain object (Date, RegExp, etc.) -> fallback
  if (!isPlainObject(node)) {
    console.warn('[Sanitizer] Dropping non-object node:', typeof node);
    return null;
  }

  // Now we have an object - work with it
  const obj = node as Record<string, unknown>;

  // Case 5: Missing type -> coerce to 'div'
  if (!obj.type || typeof obj.type !== 'string') {
    obj.type = 'div';
    console.warn('[Sanitizer] Node missing type, coerced to div:', obj.id || 'unknown');
  }

  // Ensure we have an ID
  if (!obj.id || typeof obj.id !== 'string') {
    obj.id = generateSanitizedId(obj.type as string);
  }

  // Case 6: props is not an object
  if (!isPlainObject(obj.props)) {
    const oldProps = obj.props;
    obj.props = {};
    
    // If props was a string, try to use it as content
    if (typeof oldProps === 'string') {
      const nodeType = obj.type as string;
      if (TEXT_LIKE_TYPES.has(nodeType)) {
        (obj.props as Record<string, unknown>).content = oldProps;
      } else if (BUTTON_TYPES.has(nodeType)) {
        (obj.props as Record<string, unknown>).text = oldProps;
      } else {
        (obj.props as Record<string, unknown>)._originalProps = oldProps;
      }
      console.warn(`[Sanitizer] Converted string props to object for ${obj.id}`);
    }
  }

  // Ensure style is an object
  if (!isPlainObject(obj.style)) {
    obj.style = {};
  }

  // Case 7: children handling
  const nodeType = obj.type as string;
  
  if (obj.children !== undefined) {
    // If children is not an array, handle it
    if (!Array.isArray(obj.children)) {
      const childValue = obj.children;
      
      // If it's a primitive and parent is text-like or button, move to props
      if (typeof childValue === 'string' || typeof childValue === 'number') {
        if (TEXT_LIKE_TYPES.has(nodeType)) {
          const props = obj.props as Record<string, unknown>;
          if (!props.content) {
            props.content = String(childValue);
          }
          obj.children = [];
          console.warn(`[Sanitizer] Moved primitive child to props.content for ${obj.id}`);
        } else if (BUTTON_TYPES.has(nodeType)) {
          const props = obj.props as Record<string, unknown>;
          if (!props.text) {
            props.text = String(childValue);
          }
          obj.children = [];
          console.warn(`[Sanitizer] Moved primitive child to props.text for ${obj.id}`);
        } else {
          // Wrap in array as text component
          obj.children = [createTextComponent(childValue)];
          console.warn(`[Sanitizer] Wrapped primitive child in array as text for ${obj.id}`);
        }
      } else if (isPlainObject(childValue)) {
        // Single object child -> wrap in array
        obj.children = [childValue];
      } else {
        // Unknown type -> empty array
        obj.children = [];
      }
    }
    
    // Now children is an array - sanitize each child
    const sanitizedChildren: Array<Record<string, unknown>> = [];
    
    for (const child of obj.children as unknown[]) {
      // Handle primitive children
      if (typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean') {
        const stringValue = String(child).trim();
        
        if (stringValue === '') continue;
        
        // For text-like parents, merge first primitive into props.content
        if (TEXT_LIKE_TYPES.has(nodeType)) {
          const props = obj.props as Record<string, unknown>;
          if (!props.content) {
            props.content = stringValue;
            console.warn(`[Sanitizer] Merged primitive child into props.content for ${obj.id}`);
            continue;
          }
        } else if (BUTTON_TYPES.has(nodeType)) {
          const props = obj.props as Record<string, unknown>;
          if (!props.text) {
            props.text = stringValue;
            console.warn(`[Sanitizer] Merged primitive child into props.text for ${obj.id}`);
            continue;
          }
        }
        
        // Otherwise convert to text component
        sanitizedChildren.push(createTextComponent(stringValue));
        continue;
      }
      
      // Recursively sanitize object children
      const sanitizedChild = sanitizeRawNode(child, nodeType);
      if (sanitizedChild) {
        sanitizedChildren.push(sanitizedChild);
      }
    }
    
    obj.children = sanitizedChildren;
  } else {
    // No children defined -> initialize as empty array
    obj.children = [];
  }

  return obj;
}

/**
 * Sanitize an array of children, filtering out invalid nodes
 */
export function sanitizeRawChildrenArray(
  children: unknown,
  parentType: string
): Array<Record<string, unknown>> {
  if (!Array.isArray(children)) {
    // Handle non-array
    if (children === null || children === undefined) {
      return [];
    }
    
    // Single primitive -> convert appropriately
    if (typeof children === 'string' || typeof children === 'number' || typeof children === 'boolean') {
      const strValue = String(children).trim();
      if (!strValue) return [];
      
      // Note: This function returns an array, so we can't merge into parent props here
      // The parent should call sanitizeRawNode which handles this case
      return [createTextComponent(strValue)];
    }
    
    // Single object -> wrap and sanitize
    if (isPlainObject(children)) {
      const sanitized = sanitizeRawNode(children, parentType);
      return sanitized ? [sanitized] : [];
    }
    
    return [];
  }
  
  // It's an array - sanitize each item
  const result: Array<Record<string, unknown>> = [];
  
  for (const child of children) {
    const sanitized = sanitizeRawNode(child, parentType);
    if (sanitized) {
      result.push(sanitized);
    }
  }
  
  return result;
}

/**
 * Deep sanitize an entire component tree (recursively).
 * This is the main entry point for sanitizing AI output.
 */
export function sanitizeAIComponentTree(node: unknown): Record<string, unknown> | null {
  return sanitizeRawNode(node);
}

/**
 * Sanitize an array of "steps" (AI build response format)
 * Each step typically has { type: 'component', data: {...} }
 */
export function sanitizeAIBuildSteps(steps: unknown[]): unknown[] {
  if (!Array.isArray(steps)) {
    console.warn('[Sanitizer] Steps is not an array');
    return [];
  }
  
  return steps.filter((step: unknown) => {
    if (!isPlainObject(step)) {
      console.warn('[Sanitizer] Dropping non-object step');
      return false;
    }
    
    const stepObj = step as Record<string, unknown>;
    
    // Keep non-component steps as-is
    if (stepObj.type !== 'component') {
      return true;
    }
    
    // For component steps, sanitize the data
    if (!isPlainObject(stepObj.data)) {
      // If data is a primitive, drop the step
      if (stepObj.data !== null && stepObj.data !== undefined) {
        console.warn(`[Sanitizer] Dropping component step with invalid data type: ${typeof stepObj.data}`);
      }
      return false;
    }
    
    // Deep sanitize the component data
    const sanitizedData = sanitizeRawNode(stepObj.data);
    if (!sanitizedData) {
      console.warn('[Sanitizer] Dropping component step that sanitized to null');
      return false;
    }
    
    // Update the step with sanitized data
    stepObj.data = sanitizedData;
    return true;
  });
}
