/**
 * React ZIP Project Converter
 * Converts React project ZIP files to Webtir AppComponents
 */

import JSZip from 'jszip';
import * as parser from '@babel/parser';
import { AppComponent, ComponentType, ComponentStyle } from '@/types/appBuilder';
import { StyleClass } from '@/types/classes';
import { v4 as uuid } from 'uuid';
import { parseCSSToClasses } from './htmlConverter';
import { INHERITABLE_CSS_PROPERTIES } from '@/lib/parentStyleInheritance';

export interface ReactZipConversionResult {
  components: AppComponent[];
  styleClasses: StyleClass[];
  bodyStyles: Record<string, any>;
  assets: ReactAsset[];
  warnings: string[];
  projectStructure: ProjectFile[];
}

export interface ReactAsset {
  path: string;
  type: 'image' | 'font' | 'other';
  data?: Blob;
}

export interface ProjectFile {
  path: string;
  type: 'component' | 'style' | 'asset' | 'config' | 'other';
  processed: boolean;
}

// JSX element to component type mapping
const JSX_TAG_MAP: Record<string, ComponentType> = {
  'div': 'div',
  'section': 'section',
  'header': 'header',
  'footer': 'footer',
  'nav': 'navigation',
  'aside': 'sidebar',
  'main': 'container',
  'article': 'container',
  'p': 'text',
  'span': 'text',
  'h1': 'heading',
  'h2': 'heading',
  'h3': 'heading',
  'h4': 'heading',
  'h5': 'heading',
  'h6': 'heading',
  'a': 'link',
  'button': 'button',
  'img': 'image',
  'video': 'video',
  'form': 'form',
  'input': 'input',
  'textarea': 'textarea',
  'select': 'select',
  'label': 'label',
  'ul': 'list',
  'ol': 'list',
  'li': 'div',
  'hr': 'divider',
  'pre': 'codeblock',
  'code': 'code',
};

// Common React component patterns to detect
const COMPONENT_PATTERNS: Record<string, ComponentType> = {
  'Button': 'button',
  'Link': 'link',
  'Image': 'image',
  'Img': 'image',
  'Text': 'text',
  'Heading': 'heading',
  'Card': 'card',
  'Modal': 'modal',
  'Dialog': 'dialog',
  'Input': 'input',
  'Form': 'form',
  'Nav': 'navigation',
  'Navbar': 'navigation',
  'Header': 'header',
  'Footer': 'footer',
  'Sidebar': 'sidebar',
  'Container': 'container',
  'Grid': 'grid',
  'Flex': 'div',
  'Box': 'div',
  'Section': 'section',
  'Avatar': 'avatar',
  'Badge': 'badge',
  'Alert': 'alert',
  'Tabs': 'tabs',
  'Tab': 'tab-item',
  'Accordion': 'accordion',
};

/**
 * Container component types that should propagate inheritable styles to children
 */
const CONTAINER_COMPONENT_TYPES = new Set<ComponentType>([
  'div', 'section', 'container', 'header', 'footer', 'sidebar', 'navigation', 'card', 'grid'
]);

/**
 * Extract inheritable properties (typography, color) from a styles object
 */
function extractInheritablePropsFromStyle(styles: Record<string, any>): Record<string, any> {
  const inheritable: Record<string, any> = {};
  for (const [key, value] of Object.entries(styles)) {
    if (INHERITABLE_CSS_PROPERTIES.has(key) && value !== undefined && value !== null && value !== '') {
      inheritable[key] = value;
    }
  }
  return inheritable;
}

/**
 * Extract style objects defined as const variables (e.g., const customStyles = { ... })
 */
function extractStyleObjects(ast: any): Record<string, Record<string, any>> {
  const styleObjects: Record<string, Record<string, any>> = {};
  
  const traverse = (node: any) => {
    if (!node || typeof node !== 'object') return;
    
    // Look for variable declarations
    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations || []) {
        if (decl.type === 'VariableDeclarator' && 
            decl.id?.type === 'Identifier' &&
            decl.init?.type === 'ObjectExpression') {
          const varName = decl.id.name;
          // Check if this looks like a styles object
          if (varName.toLowerCase().includes('style') || 
              varName.toLowerCase().includes('css') ||
              varName.endsWith('Styles')) {
            const parsed = parseObjectExpression(decl.init);
            if (Object.keys(parsed).length > 0) {
              styleObjects[varName] = parsed;
            }
          }
        }
      }
    }
    
    // Recursively traverse
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'range') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(traverse);
      } else if (child && typeof child === 'object') {
        traverse(child);
      }
    }
  };
  
  traverse(ast);
  return styleObjects;
}

/**
 * Parse JSX content and convert to AppComponents
 * Prioritizes finding the default export or App component as root
 */
function parseJSXContent(jsxCode: string, warnings: string[]): AppComponent[] {
  try {
    const ast = parser.parse(jsxCode, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      errorRecovery: true
    });
    
    // Extract style objects from the file first
    const styleObjects = extractStyleObjects(ast);
    if (Object.keys(styleObjects).length > 0) {
      warnings.push(`Extracted style objects: ${Object.keys(styleObjects).join(', ')}`);
    }
    
    const components: AppComponent[] = [];
    
    // Find the default export or main App component first
    let defaultExportName: string | null = null;
    let mainComponentNode: any = null;
    
    // First pass: find default export
    const findDefaultExport = (node: any): void => {
      if (!node || typeof node !== 'object') return;
      
      // export default App
      if (node.type === 'ExportDefaultDeclaration') {
        if (node.declaration?.type === 'Identifier') {
          defaultExportName = node.declaration.name;
        } else if (node.declaration?.type === 'FunctionDeclaration') {
          mainComponentNode = node.declaration;
        } else if (node.declaration?.type === 'ArrowFunctionExpression') {
          mainComponentNode = node.declaration;
        }
        return;
      }
      
      // Traverse
      for (const key in node) {
        if (key === 'loc' || key === 'start' || key === 'end' || key === 'range') continue;
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach(findDefaultExport);
        } else if (child && typeof child === 'object') {
          findDefaultExport(child);
        }
      }
    };
    
    findDefaultExport(ast.program);
    
    // Second pass: find the named component if we have defaultExportName
    const findNamedComponent = (node: any, name: string): any | null => {
      if (!node || typeof node !== 'object') return null;
      
      // const App = () => ...
      if (node.type === 'VariableDeclaration') {
        for (const decl of node.declarations || []) {
          if (decl.type === 'VariableDeclarator' && 
              decl.id?.type === 'Identifier' && 
              decl.id.name === name) {
            return decl.init;
          }
        }
      }
      
      // function App() { ... }
      if (node.type === 'FunctionDeclaration' && node.id?.name === name) {
        return node;
      }
      
      // Traverse
      for (const key in node) {
        if (key === 'loc' || key === 'start' || key === 'end' || key === 'range') continue;
        const child = node[key];
        if (Array.isArray(child)) {
          for (const item of child) {
            const result = findNamedComponent(item, name);
            if (result) return result;
          }
        } else if (child && typeof child === 'object') {
          const result = findNamedComponent(child, name);
          if (result) return result;
        }
      }
      
      return null;
    };
    
    if (defaultExportName && !mainComponentNode) {
      mainComponentNode = findNamedComponent(ast.program, defaultExportName);
    }
    
    // If we found a main component, extract only from its return statement
    if (mainComponentNode) {
      const jsxFromNode = findJSXInFunctionBody(mainComponentNode, styleObjects, warnings);
      if (jsxFromNode.length > 0) {
        return jsxFromNode;
      }
    }
    
    // Fallback: Look for any App, HomePage, or Main component
    const fallbackNames = ['App', 'HomePage', 'Home', 'Main', 'Root', 'Page'];
    for (const name of fallbackNames) {
      const compNode = findNamedComponent(ast.program, name);
      if (compNode) {
        const jsxFromNode = findJSXInFunctionBody(compNode, styleObjects, warnings);
        if (jsxFromNode.length > 0) {
          return jsxFromNode;
        }
      }
    }
    
    // Last resort: find all top-level JSX returns
    const findAllJSXReturns = (node: any, depth = 0): AppComponent[] => {
      if (!node) return [];
      const results: AppComponent[] = [];
      
      if (node.type === 'JSXElement') {
        const component = convertJSXNode(node, warnings, depth, styleObjects);
        if (component) {
          results.push(component);
        }
        return results; // Don't traverse into JSX children here, convertJSXNode handles that
      }
      
      if (node.type === 'ReturnStatement' && node.argument?.type === 'JSXElement') {
        const component = convertJSXNode(node.argument, warnings, depth, styleObjects);
        if (component) {
          results.push(component);
        }
        return results;
      }
      
      // Traverse into function bodies
      if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionDeclaration' || 
          node.type === 'FunctionExpression') {
        return findAllJSXReturns(node.body, depth);
      }
      
      if (node.type === 'BlockStatement') {
        for (const stmt of node.body || []) {
          results.push(...findAllJSXReturns(stmt, depth));
        }
        return results;
      }
      
      // Only traverse into declarations at top level
      if (node.type === 'Program' || node.type === 'ExportDefaultDeclaration' || 
          node.type === 'ExportNamedDeclaration') {
        for (const key of ['body', 'declaration', 'declarations']) {
          const child = node[key];
          if (Array.isArray(child)) {
            child.forEach((c: any) => results.push(...findAllJSXReturns(c, depth)));
          } else if (child) {
            results.push(...findAllJSXReturns(child, depth));
          }
        }
      }
      
      if (node.type === 'VariableDeclaration') {
        for (const decl of node.declarations || []) {
          if (decl.init) {
            results.push(...findAllJSXReturns(decl.init, depth));
          }
        }
      }
      
      return results;
    };
    
    // Only use this fallback if we didn't find a main component
    warnings.push('No default export found, extracting first JSX element');
    const allJsx = findAllJSXReturns(ast.program);
    return allJsx.length > 0 ? [allJsx[0]] : [];
    
  } catch (error) {
    warnings.push(`JSX parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  }
}

/**
 * Find JSX elements in a function body (return statement)
 */
function findJSXInFunctionBody(node: any, styleObjects: Record<string, Record<string, any>>, warnings: string[]): AppComponent[] {
  if (!node) return [];
  
  // Arrow function with direct JSX return
  if (node.type === 'JSXElement') {
    const component = convertJSXNode(node, warnings, 0, styleObjects);
    return component ? [component] : [];
  }
  
  // Arrow function with expression body
  if (node.type === 'ArrowFunctionExpression') {
    if (node.body?.type === 'JSXElement') {
      const component = convertJSXNode(node.body, warnings, 0, styleObjects);
      return component ? [component] : [];
    }
    return findJSXInFunctionBody(node.body, styleObjects, warnings);
  }
  
  // Block statement - find return
  if (node.type === 'BlockStatement') {
    for (const stmt of node.body || []) {
      if (stmt.type === 'ReturnStatement' && stmt.argument) {
        if (stmt.argument.type === 'JSXElement') {
          const component = convertJSXNode(stmt.argument, warnings, 0, styleObjects);
          return component ? [component] : [];
        }
        if (stmt.argument.type === 'JSXFragment') {
          // Handle fragment - extract children
          const children: AppComponent[] = [];
          for (const child of stmt.argument.children || []) {
            if (child.type === 'JSXElement') {
              const component = convertJSXNode(child, warnings, 0, styleObjects);
              if (component) children.push(component);
            }
          }
          return children;
        }
      }
    }
  }
  
  // Function declaration
  if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
    return findJSXInFunctionBody(node.body, styleObjects, warnings);
  }
  
  return [];
}

/**
 * Convert a JSX AST node to AppComponent
 */
function convertJSXNode(
  node: any, 
  warnings: string[], 
  depth = 0, 
  styleObjects: Record<string, Record<string, any>> = {}
): AppComponent | null {
  if (!node || node.type !== 'JSXElement') return null;
  
  const openingElement = node.openingElement;
  if (!openingElement) return null;
  
  // Get tag name
  let tagName = '';
  if (openingElement.name.type === 'JSXIdentifier') {
    tagName = openingElement.name.name;
  } else if (openingElement.name.type === 'JSXMemberExpression') {
    // Handle things like React.Fragment, etc.
    tagName = openingElement.name.property?.name || 'div';
  }
  
  // Skip fragments
  if (tagName === 'Fragment' || tagName === '') return null;
  
  // Determine component type
  let componentType: ComponentType = 'div';
  
  // Check if it's a standard HTML tag
  if (JSX_TAG_MAP[tagName.toLowerCase()]) {
    componentType = JSX_TAG_MAP[tagName.toLowerCase()];
  } 
  // Check if it's a known component pattern
  else if (COMPONENT_PATTERNS[tagName]) {
    componentType = COMPONENT_PATTERNS[tagName];
  }
  
  const component: AppComponent = {
    id: uuid(),
    type: componentType,
    props: {},
    style: {},
    classNames: [],
    children: []
  };
  
  // Process attributes
  const attributes = openingElement.attributes || [];
  for (const attr of attributes) {
    if (attr.type === 'JSXAttribute') {
      const attrName = attr.name?.name || '';
      const attrValue = getAttributeValue(attr.value);
      
      switch (attrName) {
        case 'className':
        case 'class':
          if (typeof attrValue === 'string') {
            component.classNames = attrValue.split(/\s+/).filter((c: string) => c.trim());
          }
          break;
          
        case 'style':
          if (typeof attrValue === 'object' && attrValue !== null) {
            // Check for spread reference like __spread__: "customStyles.heroGradient"
            const spreadRef = attrValue['__spread__'];
            if (spreadRef && typeof spreadRef === 'string') {
              const [objName, propName] = spreadRef.split('.');
              if (styleObjects[objName]?.[propName]) {
                // Merge spread styles with inline styles
                const spreadStyles = styleObjects[objName][propName];
                const { __spread__, ...inlineStyles } = attrValue;
                component.style = convertInlineStyleToComponentStyle({ ...spreadStyles, ...inlineStyles });
              } else {
                const { __spread__, ...inlineStyles } = attrValue;
                component.style = convertInlineStyleToComponentStyle(inlineStyles);
              }
            } else {
              component.style = convertInlineStyleToComponentStyle(attrValue);
            }
          } else if (typeof attrValue === 'string' && attrValue.startsWith('{')) {
            // Try to resolve style object reference like {customStyles.heroGradient}
            const match = attrValue.match(/^\{([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\}$/);
            if (match) {
              const [, objName, propName] = match;
              if (styleObjects[objName]?.[propName]) {
                component.style = convertInlineStyleToComponentStyle(styleObjects[objName][propName]);
              }
            }
          }
          break;
          
        case 'src':
          component.props.src = attrValue;
          break;
          
        case 'href':
          component.props.href = attrValue;
          break;
          
        case 'alt':
          component.props.alt = attrValue;
          break;
          
        case 'placeholder':
          component.props.placeholder = attrValue;
          break;
          
        case 'type':
          component.props.type = attrValue;
          break;
          
        case 'children':
          if (typeof attrValue === 'string') {
            component.props.content = attrValue;
          }
          break;
          
        case 'onClick':
        case 'onSubmit':
        case 'onChange':
          // Action handlers - note but don't convert
          break;
          
        default:
          // Store other props
          if (attrValue !== undefined && attrValue !== null) {
            component.props[attrName] = attrValue;
          }
      }
    }
  }
  
  // Handle heading levels
  if (componentType === 'heading') {
    const level = parseInt(tagName.slice(1));
    if (!isNaN(level)) {
      component.props.level = level;
    }
  }
  
  // For container types, apply inheritable typography styles directly to props
  // This enables CSS inheritance to cascade to children
  if (CONTAINER_COMPONENT_TYPES.has(componentType) && component.style && Object.keys(component.style).length > 0) {
    const inheritableStyles = extractInheritablePropsFromStyle(component.style);
    if (Object.keys(inheritableStyles).length > 0) {
      // Apply inheritable styles to props so they can cascade to children
      Object.assign(component.props, inheritableStyles);
    }
  }
  
  // Process children
  const children = node.children || [];
  for (const child of children) {
    if (child.type === 'JSXElement') {
      const childComponent = convertJSXNode(child, warnings, depth + 1, styleObjects);
      if (childComponent) {
        component.children!.push(childComponent);
      }
    } else if (child.type === 'JSXText') {
      const text = child.value?.trim();
      if (text) {
        if (component.children!.length === 0 && !component.props.content) {
          component.props.content = text;
        } else {
          component.children!.push({
            id: uuid(),
            type: 'text',
            props: { content: text },
            style: {},
            classNames: []
          });
        }
      }
    } else if (child.type === 'JSXExpressionContainer') {
      // Handle expressions like {title} or {children}
      const expr = child.expression;
      if (expr && expr.type === 'Identifier') {
        if (expr.name === 'children') {
          // This is a slot for children
          component.props._hasChildrenSlot = true;
        } else {
          // Dynamic value reference
          if (!component.props.content) {
            component.props.content = `{${expr.name}}`;
          }
        }
      } else if (expr && expr.type === 'StringLiteral') {
        if (!component.props.content) {
          component.props.content = expr.value;
        }
      }
    }
  }
  
  // Clean up empty children
  if (component.children && component.children.length === 0) {
    delete component.children;
  }
  
  return component;
}

/**
 * Get value from JSX attribute value node
 */
function getAttributeValue(value: any): any {
  if (!value) return true; // Boolean attribute
  
  if (value.type === 'StringLiteral') {
    return value.value;
  }
  
  if (value.type === 'JSXExpressionContainer') {
    const expr = value.expression;
    
    if (expr.type === 'StringLiteral') {
      return expr.value;
    }
    
    if (expr.type === 'NumericLiteral') {
      return expr.value;
    }
    
    if (expr.type === 'BooleanLiteral') {
      return expr.value;
    }
    
    if (expr.type === 'ObjectExpression') {
      return parseObjectExpression(expr);
    }
    
    if (expr.type === 'TemplateLiteral') {
      // Join template parts
      return expr.quasis?.map((q: any) => q.value?.cooked || '').join('');
    }
    
    if (expr.type === 'Identifier') {
      return `{${expr.name}}`;
    }
  }
  
  return undefined;
}

/**
 * Parse ObjectExpression to plain object (for style prop)
 * Handles nested objects and spread elements
 */
function parseObjectExpression(expr: any): Record<string, any> {
  const result: Record<string, any> = {};
  
  if (expr.properties) {
    for (const prop of expr.properties) {
      if (prop.type === 'ObjectProperty') {
        let key = '';
        if (prop.key.type === 'Identifier') {
          key = prop.key.name;
        } else if (prop.key.type === 'StringLiteral') {
          key = prop.key.value;
        }
        
        let value: any;
        if (prop.value.type === 'StringLiteral') {
          value = prop.value.value;
        } else if (prop.value.type === 'NumericLiteral') {
          value = prop.value.value;
        } else if (prop.value.type === 'BooleanLiteral') {
          value = prop.value.value;
        } else if (prop.value.type === 'ObjectExpression') {
          // Recursively parse nested objects
          value = parseObjectExpression(prop.value);
        } else if (prop.value.type === 'UnaryExpression' && prop.value.operator === '-') {
          // Handle negative numbers like -10
          if (prop.value.argument?.type === 'NumericLiteral') {
            value = -prop.value.argument.value;
          }
        }
        
        if (key && value !== undefined) {
          result[key] = value;
        }
      } else if (prop.type === 'SpreadElement') {
        // Handle spread syntax like ...customStyles.frameworkSectionBg
        // Just mark it for now - the calling code will resolve it
        if (prop.argument?.type === 'MemberExpression') {
          const objName = prop.argument.object?.name;
          const propName = prop.argument.property?.name;
          if (objName && propName) {
            result['__spread__'] = `${objName}.${propName}`;
          }
        }
      }
    }
  }
  
  return result;
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
 * Convert inline style object to FLAT ComponentStyle
 * IMPORTANT: Returns flat camelCase properties (e.g., { display: 'flex', gap: '24px' })
 * which is what the class store and CSS generator expect.
 * IMPORTANT: Filters out CSS default sizing values (auto, 0px, none) to keep classes clean
 */
function convertInlineStyleToComponentStyle(styleObj: Record<string, any>): Record<string, any> {
  const flatStyle: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(styleObj)) {
    if (value === undefined || value === null) continue;
    
    // Skip sizing values that are CSS defaults - don't import these
    if (isSizingDefault(key, value)) {
      console.log('[ReactConverter] Skipping default sizing value:', { key, value });
      continue;
    }
    
    // Normalize value: numbers with no unit get 'px' for dimensional properties
    let normalizedValue = value;
    if (typeof value === 'number') {
      const dimensionalProps = ['width', 'height', 'maxWidth', 'minWidth', 'maxHeight', 'minHeight',
        'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
        'gap', 'rowGap', 'columnGap', 'fontSize', 'lineHeight', 'letterSpacing',
        'borderRadius', 'borderWidth', 'top', 'right', 'bottom', 'left'];
      if (dimensionalProps.includes(key)) {
        normalizedValue = `${value}px`;
      }
    }
    
    flatStyle[key] = normalizedValue;
  }
  
  return flatStyle;
}

/**
 * Process CSS files from ZIP
 */
async function processStyleFiles(zip: JSZip, warnings: string[]): Promise<StyleClass[]> {
  const allClasses: StyleClass[] = [];
  const cssFiles: string[] = [];
  
  // Find all CSS files
  zip.forEach((path, file) => {
    if (!file.dir && (path.endsWith('.css') || path.endsWith('.scss'))) {
      cssFiles.push(path);
    }
  });
  
  // Process each CSS file
  for (const cssPath of cssFiles) {
    try {
      const cssContent = await zip.file(cssPath)?.async('text');
      if (cssContent) {
        const { classes } = parseCSSToClasses(cssContent);
        allClasses.push(...classes);
      }
    } catch (error) {
      warnings.push(`Failed to process ${cssPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Deduplicate classes by name
  const uniqueClasses = new Map<string, StyleClass>();
  for (const cls of allClasses) {
    if (!uniqueClasses.has(cls.name)) {
      uniqueClasses.set(cls.name, cls);
    } else {
      // Merge styles
      const existing = uniqueClasses.get(cls.name)!;
      existing.styles = { ...existing.styles, ...cls.styles };
    }
  }
  
  return Array.from(uniqueClasses.values());
}

/**
 * Process component files from ZIP
 */
async function processComponentFiles(zip: JSZip, warnings: string[]): Promise<AppComponent[]> {
  const allComponents: AppComponent[] = [];
  const componentFiles: string[] = [];
  
  // Priority order for files
  const priorityPatterns = [
    /App\.(tsx|jsx)$/,
    /src\/pages\/.*\.(tsx|jsx)$/,
    /src\/components\/.*\.(tsx|jsx)$/,
    /.*\.(tsx|jsx)$/
  ];
  
  // Collect all component files
  zip.forEach((path, file) => {
    if (!file.dir && (path.endsWith('.tsx') || path.endsWith('.jsx'))) {
      // Skip test files and config files
      if (!path.includes('.test.') && !path.includes('.spec.') && 
          !path.includes('config') && !path.includes('node_modules')) {
        componentFiles.push(path);
      }
    }
  });
  
  // Sort by priority
  componentFiles.sort((a, b) => {
    const getPriority = (path: string) => {
      for (let i = 0; i < priorityPatterns.length; i++) {
        if (priorityPatterns[i].test(path)) return i;
      }
      return priorityPatterns.length;
    };
    return getPriority(a) - getPriority(b);
  });
  
  // Process files (limit to avoid overwhelming)
  const filesToProcess = componentFiles.slice(0, 20);
  
  for (const filePath of filesToProcess) {
    try {
      const content = await zip.file(filePath)?.async('text');
      if (content) {
        const components = parseJSXContent(content, warnings);
        allComponents.push(...components);
      }
    } catch (error) {
      warnings.push(`Failed to process ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return allComponents;
}

/**
 * Collect asset files from ZIP
 */
async function collectAssets(zip: JSZip): Promise<{ assets: ReactAsset[]; projectStructure: ProjectFile[] }> {
  const assets: ReactAsset[] = [];
  const projectStructure: ProjectFile[] = [];
  
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'];
  const fontExtensions = ['.woff', '.woff2', '.ttf', '.otf', '.eot'];
  
  zip.forEach((path, file) => {
    if (file.dir) return;
    
    const ext = path.toLowerCase().slice(path.lastIndexOf('.'));
    
    if (imageExtensions.includes(ext)) {
      assets.push({ path, type: 'image' });
      projectStructure.push({ path, type: 'asset', processed: false });
    } else if (fontExtensions.includes(ext)) {
      assets.push({ path, type: 'font' });
      projectStructure.push({ path, type: 'asset', processed: false });
    } else if (path.endsWith('.tsx') || path.endsWith('.jsx')) {
      projectStructure.push({ path, type: 'component', processed: true });
    } else if (path.endsWith('.css') || path.endsWith('.scss')) {
      projectStructure.push({ path, type: 'style', processed: true });
    } else if (path.includes('config') || path.includes('package.json')) {
      projectStructure.push({ path, type: 'config', processed: false });
    } else {
      projectStructure.push({ path, type: 'other', processed: false });
    }
  });
  
  return { assets, projectStructure };
}

/**
 * Main React ZIP converter function
 */
export async function convertReactZipToComponents(zipFile: File | ArrayBuffer): Promise<ReactZipConversionResult> {
  const warnings: string[] = [];
  
  try {
    // Load ZIP file
    const zip = await JSZip.loadAsync(zipFile);
    
    // Process styles first
    const styleClasses = await processStyleFiles(zip, warnings);
    
    // Process components
    const components = await processComponentFiles(zip, warnings);
    
    // Collect assets and project structure
    const { assets, projectStructure } = await collectAssets(zip);
    
    // Add summary warnings
    if (components.length === 0) {
      warnings.push('No React components found in the ZIP file');
    }
    
    if (styleClasses.length > 0) {
      warnings.push(`Extracted ${styleClasses.length} CSS classes`);
    }
    
    return {
      components,
      styleClasses,
      bodyStyles: {},
      assets,
      warnings,
      projectStructure
    };
    
  } catch (error) {
    return {
      components: [],
      styleClasses: [],
      bodyStyles: {},
      assets: [],
      warnings: [`Failed to process ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`],
      projectStructure: []
    };
  }
}

/**
 * Get conversion stats
 */
export function getReactZipConversionStats(result: ReactZipConversionResult): {
  totalComponents: number;
  totalStyles: number;
  totalAssets: number;
  warningCount: number;
} {
  const countComponents = (comps: AppComponent[]): number => {
    return comps.reduce((acc, c) => acc + 1 + (c.children ? countComponents(c.children) : 0), 0);
  };
  
  return {
    totalComponents: countComponents(result.components),
    totalStyles: result.styleClasses.length,
    totalAssets: result.assets.length,
    warningCount: result.warnings.filter(w => !w.startsWith('Extracted')).length
  };
}

/**
 * Convert a single React file (JSX/TSX/JS) to components
 * This is a simplified version for single file imports
 */
export function convertReactFileToComponents(content: string): ReactZipConversionResult {
  const warnings: string[] = [];
  const styleClasses: StyleClass[] = [];
  const processedComponentIds = new Set<string>();
  
  try {
    // Parse the JSX content directly
    const components = parseJSXContent(content, warnings);
    
    // Extract any embedded CSS if present (template literals)
    const styleBlockMatch = content.match(/const\s+\w*[Ss]tyles?\w*\s*=\s*`([^`]+)`/);
    if (styleBlockMatch) {
      const { classes } = parseCSSToClasses(styleBlockMatch[1]);
      styleClasses.push(...classes);
    }
    
    // Create classes from inline styles on components, avoiding duplicates
    const classNameCounter = new Map<string, number>();
    
    const createClassesFromComponents = (comps: AppComponent[], prefix = 'react'): void => {
      comps.forEach((comp) => {
        // Skip already processed
        if (processedComponentIds.has(comp.id)) return;
        processedComponentIds.add(comp.id);
        
        if (comp.style && Object.keys(comp.style).length > 0) {
          // Generate unique class name based on component type
          const count = classNameCounter.get(comp.type) || 0;
          classNameCounter.set(comp.type, count + 1);
          const className = `${prefix}-${comp.type}${count > 0 ? `-${count + 1}` : ''}`;
          
          // Only add if not already in classNames
          if (!comp.classNames.includes(className)) {
            comp.classNames.push(className);
          }
          
          // Create style class with flat styles
          styleClasses.push({
            id: uuid(),
            name: className,
            styles: comp.style, // Already flat from convertInlineStyleToComponentStyle
            stateStyles: { none: {}, hover: {}, pressed: {}, focused: {}, 'focus-visible': {}, 'focus-within': {} },
            appliedTo: [comp.id],
            inheritsFrom: [],
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
        
        if (comp.children) {
          createClassesFromComponents(comp.children, prefix);
        }
      });
    };
    
    createClassesFromComponents(components);
    
    // Deduplicate style classes by content hash
    const uniqueClasses = new Map<string, StyleClass>();
    const styleHashToClass = new Map<string, string>();
    
    for (const cls of styleClasses) {
      const styleHash = JSON.stringify(cls.styles);
      
      if (styleHashToClass.has(styleHash)) {
        // Reuse existing class - update component references
        const existingClassName = styleHashToClass.get(styleHash)!;
        const existingClass = uniqueClasses.get(existingClassName);
        if (existingClass) {
          existingClass.appliedTo.push(...cls.appliedTo);
        }
      } else {
        // New unique style
        styleHashToClass.set(styleHash, cls.name);
        uniqueClasses.set(cls.name, cls);
      }
    }
    
    if (components.length > 0) {
      warnings.push(`Extracted ${components.length} component(s) from React file`);
    }
    
    if (uniqueClasses.size > 0) {
      warnings.push(`Created ${uniqueClasses.size} unique style class(es)`);
    }
    
    return {
      components,
      styleClasses: Array.from(uniqueClasses.values()),
      bodyStyles: {},
      assets: [],
      warnings,
      projectStructure: []
    };
    
  } catch (error) {
    return {
      components: [],
      styleClasses: [],
      bodyStyles: {},
      assets: [],
      warnings: [`Failed to parse React file: ${error instanceof Error ? error.message : 'Unknown error'}`],
      projectStructure: []
    };
  }
}
