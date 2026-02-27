/**
 * JSX to Components Parser - Converts React JSX code back to AppComponent structure
 * Uses only @babel/parser (browser-compatible) with manual AST traversal
 */

import { parse } from '@babel/parser';
import { AppComponent, ComponentType } from '@/types/appBuilder';
import { v4 as uuidv4 } from 'uuid';

// Map HTML elements to component types
const ELEMENT_TO_COMPONENT_MAP: Record<string, ComponentType> = {
  'section': 'section',
  'div': 'container',
  'p': 'text',
  'span': 'text',
  'h1': 'heading',
  'h2': 'heading',
  'h3': 'heading',
  'h4': 'heading',
  'h5': 'heading',
  'h6': 'heading',
  'button': 'button',
  'input': 'input',
  'textarea': 'textarea',
  'select': 'select',
  'form': 'form',
  'img': 'image',
  'a': 'link',
  'nav': 'navigation',
  'header': 'section', // header maps to section (header is not a Rantir component type)
  'footer': 'footer',
  'aside': 'sidebar',
  'ul': 'list',
  'ol': 'list',
  'li': 'text',
  'table': 'table',
  'video': 'video',
  'audio': 'audio',
  'label': 'label',
  'hr': 'separator',
  'progress': 'progress',
  'dialog': 'modal',
  'blockquote': 'blockquote',
  'code': 'code',
  'pre': 'codeblock',
};

/**
 * Check if a string is a UUID (system-generated ID)
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export interface ParseResult {
  success: boolean;
  components: AppComponent[];
  errors: ParseError[];
}

export interface ParseError {
  line: number;
  column: number;
  message: string;
}

/**
 * Get the value of an AST node
 */
function getNodeValue(node: any): any {
  if (!node) return undefined;
  
  switch (node.type) {
    case 'StringLiteral':
      return node.value;
    case 'NumericLiteral':
      return node.value;
    case 'BooleanLiteral':
      return node.value;
    case 'JSXExpressionContainer':
      return getNodeValue(node.expression);
    case 'TemplateLiteral':
      return node.quasis?.map((q: any) => q.value.raw).join('') || '';
    default:
      return null;
  }
}

/**
 * Get element name from JSX opening element
 */
function getJSXElementName(element: any): string | null {
  const name = element.openingElement?.name;
  if (name?.type === 'JSXIdentifier') {
    return name.name;
  }
  return null;
}

/**
 * Get class names from JSX element
 */
function getClassNames(element: any): string[] {
  const classNames: string[] = [];
  
  element.openingElement?.attributes?.forEach((attr: any) => {
    if (attr.type === 'JSXAttribute' && 
        attr.name?.type === 'JSXIdentifier' && 
        attr.name.name === 'className') {
      const value = getNodeValue(attr.value);
      if (typeof value === 'string') {
        classNames.push(...value.split(' ').filter(Boolean));
      }
    }
  });
  
  return classNames;
}

/**
 * Extract text content from JSX element children
 */
function extractTextContent(element: any): string | null {
  const textParts: string[] = [];
  
  element.children?.forEach((child: any) => {
    if (child.type === 'JSXText') {
      const text = child.value?.trim();
      if (text) {
        textParts.push(text);
      }
    }
    if (child.type === 'JSXExpressionContainer') {
      if (child.expression?.type === 'StringLiteral') {
        textParts.push(child.expression.value);
      }
    }
  });
  
  return textParts.length > 0 ? textParts.join(' ') : null;
}

/**
 * Convert a JSX element to AppComponent
 */
function jsxElementToComponent(element: any): AppComponent | null {
  if (element.type !== 'JSXElement') return null;
  
  const elementName = getJSXElementName(element);
  if (!elementName) return null;

  // Determine component type
  let componentType: ComponentType = ELEMENT_TO_COMPONENT_MAP[elementName] || 'container';
  
  // Special handling for headings
  const headingMatch = elementName.match(/^h([1-6])$/);
  if (headingMatch) {
    componentType = 'heading';
  }

  // Extract props from JSX attributes
  const props: Record<string, any> = {};
  const classNames: string[] = [];
  let preservedId: string | null = null;
  
  element.openingElement?.attributes?.forEach((attr: any) => {
    if (attr.type === 'JSXAttribute' && attr.name?.type === 'JSXIdentifier') {
      const name = attr.name.name;
      const value = getNodeValue(attr.value);
      
      if (name === 'className') {
        if (typeof value === 'string') {
          const classList = value.split(' ').filter(Boolean);
          
          // Check if first class is a UUID (system-generated ID) - preserve it
          if (classList.length > 0 && isUUID(classList[0])) {
            preservedId = classList[0];
            // Rest are user-defined semantic classes
            classNames.push(...classList.slice(1));
          } else {
            // All are user-defined semantic classes
            classNames.push(...classList);
          }
        }
      } else if (name === 'id') {
        props.id = value;
      } else if (name === 'src') {
        props.src = value;
      } else if (name === 'href') {
        props.href = value;
      } else if (name === 'alt') {
        props.alt = value;
      } else if (name === 'placeholder') {
        props.placeholder = value;
      } else if (name === 'type') {
        props.type = value;
      } else if (name === 'name') {
        props.name = value;
      } else if (name === 'value' || name === 'defaultValue') {
        props.value = value;
      } else if (name === 'disabled') {
        props.disabled = value === true || value === 'true' || value === null;
      } else if (name === 'required') {
        props.required = value === true || value === 'true' || value === null;
      } else if (name === 'target') {
        props.target = value;
      } else if (name === 'rows') {
        props.rows = typeof value === 'string' ? parseInt(value, 10) : value;
      }
    }
  });

  // Handle heading level
  if (headingMatch) {
    props.level = parseInt(headingMatch[1], 10);
  }

  // Extract text content
  const textContent = extractTextContent(element);
  if (textContent) {
    props.content = textContent;
  }

  // Process children
  const children: AppComponent[] = [];
  element.children?.forEach((child: any) => {
    if (child.type === 'JSXElement') {
      const childComponent = jsxElementToComponent(child);
      if (childComponent) {
        children.push(childComponent);
      }
    }
  });

  return {
    id: preservedId || uuidv4(),
    type: componentType,
    props,
    style: {},
    classNames,
    children: children.length > 0 ? children : undefined,
  };
}

/**
 * Find JSX elements in return statements via manual traversal
 */
function findReturnedJSX(node: any): any | null {
  if (!node || typeof node !== 'object') return null;
  
  if (node.type === 'ReturnStatement' && node.argument) {
    const arg = node.argument;
    if (arg.type === 'JSXElement' || arg.type === 'JSXFragment') {
      return arg;
    }
    // Handle parenthesized expressions
    if (arg.type === 'ParenthesizedExpression') {
      const inner = arg.expression;
      if (inner?.type === 'JSXElement' || inner?.type === 'JSXFragment') {
        return inner;
      }
    }
  }
  
  // Traverse children
  for (const key in node) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'range') continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        const result = findReturnedJSX(item);
        if (result) return result;
      }
    } else if (value && typeof value === 'object') {
      const result = findReturnedJSX(value);
      if (result) return result;
    }
  }
  
  return null;
}

/**
 * Parse JSX code and convert to AppComponent array
 */
export function parseJSXToComponents(code: string): ParseResult {
  const errors: ParseError[] = [];
  const components: AppComponent[] = [];

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      errorRecovery: true,
    });

    // Collect syntax errors from parser
    if ((ast as any).errors && (ast as any).errors.length > 0) {
      (ast as any).errors.forEach((err: any) => {
        errors.push({
          line: err.loc?.line || 0,
          column: err.loc?.column || 0,
          message: err.message || 'Syntax error',
        });
      });
    }

    // Find the returned JSX
    const returnedJSX = findReturnedJSX(ast);

    if (returnedJSX) {
      if (returnedJSX.type === 'JSXElement') {
        // Check if it's a wrapper div (page-container)
        const elementName = getJSXElementName(returnedJSX);
        const classNames = getClassNames(returnedJSX);
        
        if (elementName === 'div' && classNames.includes('page-container')) {
          // Extract children as top-level components
          returnedJSX.children?.forEach((child: any) => {
            if (child.type === 'JSXElement') {
              const component = jsxElementToComponent(child);
              if (component) {
                components.push(component);
              }
            }
          });
        } else {
          // Single root component
          const component = jsxElementToComponent(returnedJSX);
          if (component) {
            components.push(component);
          }
        }
      } else if (returnedJSX.type === 'JSXFragment') {
        // Fragment - extract all children
        returnedJSX.children?.forEach((child: any) => {
          if (child.type === 'JSXElement') {
            const component = jsxElementToComponent(child);
            if (component) {
              components.push(component);
            }
          }
        });
      }
    }

    return {
      success: errors.length === 0,
      components,
      errors,
    };
  } catch (error: any) {
    return {
      success: false,
      components: [],
      errors: [{
        line: error.loc?.line || 0,
        column: error.loc?.column || 0,
        message: error.message || 'Failed to parse JSX',
      }],
    };
  }
}

/**
 * Validate JSX code without full parsing
 */
export function validateJSX(code: string): { valid: boolean; errors: ParseError[] } {
  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      errorRecovery: true,
    });

    const errors: ParseError[] = [];
    if ((ast as any).errors && (ast as any).errors.length > 0) {
      (ast as any).errors.forEach((err: any) => {
        errors.push({
          line: err.loc?.line || 0,
          column: err.loc?.column || 0,
          message: err.message || 'Syntax error',
        });
      });
    }

    return { valid: errors.length === 0, errors };
  } catch (error: any) {
    return {
      valid: false,
      errors: [{
        line: error.loc?.line || 0,
        column: error.loc?.column || 0,
        message: error.message || 'Failed to parse JSX',
      }],
    };
  }
}
