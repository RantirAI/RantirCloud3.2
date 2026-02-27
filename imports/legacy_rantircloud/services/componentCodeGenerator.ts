import { AppComponent } from '@/types/appBuilder';
import { ComponentProp } from '@/types/userComponent';

/**
 * Service for generating React component code from AppComponent definitions
 */

interface GeneratedComponent {
  code: string;
  fileName: string;
  folderPath: string;
  imports: string[];
}

/**
 * Convert a component name to a valid React component name (PascalCase)
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert a category name to a valid folder name (kebab-case)
 */
function toKebabCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .join('-');
}

/**
 * Map AppComponent type to React element
 */
function mapComponentType(type: string): string {
  const typeMap: Record<string, string> = {
    container: 'div',
    text: 'p',
    heading: 'h2',
    button: 'button',
    image: 'img',
    link: 'a',
    input: 'input',
    textarea: 'textarea',
    form: 'form',
    section: 'section',
    header: 'header',
    footer: 'footer',
    nav: 'nav',
    article: 'article',
    aside: 'aside',
    main: 'main',
    span: 'span',
    label: 'label',
    video: 'video',
    audio: 'audio',
    icon: 'span',
  };
  return typeMap[type] || 'div';
}

/**
 * Generate className string from component props and styles
 */
function generateClassName(component: AppComponent): string {
  const classes: string[] = [];
  
  // Add applied classes
  const appliedClasses = component.props?.appliedClasses;
  if (Array.isArray(appliedClasses)) {
    classes.push(...appliedClasses.filter(c => typeof c === 'string'));
  }
  
  // Add flex/grid classes based on display
  const display = component.props?.display;
  if (display === 'flex') {
    classes.push('flex');
    if (component.props?.flexDirection === 'column') classes.push('flex-col');
    if (component.props?.flexDirection === 'row') classes.push('flex-row');
    if (component.props?.justifyContent) classes.push(`justify-${component.props.justifyContent}`);
    if (component.props?.alignItems) classes.push(`items-${component.props.alignItems}`);
  } else if (display === 'grid') {
    classes.push('grid');
  }
  
  // Add gap
  if (component.props?.gap) {
    const gapValue = typeof component.props.gap === 'object' 
      ? component.props.gap.value 
      : component.props.gap;
    if (gapValue) {
      // Convert px to tailwind gap classes
      const gapClass = Math.round(Number(gapValue) / 4);
      classes.push(`gap-${gapClass}`);
    }
  }
  
  return classes.join(' ');
}

/**
 * Generate inline styles from component
 */
function generateStyles(component: AppComponent): Record<string, string> {
  const styles: Record<string, string> = {};
  const props = component.props || {};
  
  // Background color
  if (props.backgroundColor) {
    styles.backgroundColor = props.backgroundColor;
  }
  
  // Text color
  if (props.color) {
    styles.color = props.color;
  }
  
  // Padding
  if (props.spacingControl?.padding) {
    const p = props.spacingControl.padding;
    if (p.mode === 'individual') {
      styles.paddingTop = `${p.top}${p.unit || 'px'}`;
      styles.paddingRight = `${p.right}${p.unit || 'px'}`;
      styles.paddingBottom = `${p.bottom}${p.unit || 'px'}`;
      styles.paddingLeft = `${p.left}${p.unit || 'px'}`;
    }
  }
  
  // Margin
  if (props.spacingControl?.margin) {
    const m = props.spacingControl.margin;
    if (m.mode === 'individual') {
      styles.marginTop = `${m.top}${m.unit || 'px'}`;
      styles.marginRight = `${m.right}${m.unit || 'px'}`;
      styles.marginBottom = `${m.bottom}${m.unit || 'px'}`;
      styles.marginLeft = `${m.left}${m.unit || 'px'}`;
    }
  }
  
  // Border radius
  if (props.borderRadius) {
    const br = props.borderRadius;
    if (typeof br === 'object' && br.value !== undefined) {
      styles.borderRadius = `${br.value}${br.unit || 'px'}`;
    } else if (typeof br === 'number') {
      styles.borderRadius = `${br}px`;
    }
  }
  
  // Width and height
  if (props.width) {
    const w = props.width;
    if (typeof w === 'object' && w.value !== undefined) {
      styles.width = `${w.value}${w.unit || 'px'}`;
    } else if (typeof w === 'string') {
      styles.width = w;
    }
  }
  
  if (props.height) {
    const h = props.height;
    if (typeof h === 'object' && h.value !== undefined) {
      styles.height = `${h.value}${h.unit || 'px'}`;
    } else if (typeof h === 'string') {
      styles.height = h;
    }
  }
  
  return styles;
}

/**
 * Generate style object string for JSX
 */
function styleObjectToString(styles: Record<string, string>): string {
  if (Object.keys(styles).length === 0) return '';
  
  const styleEntries = Object.entries(styles)
    .map(([key, value]) => `${key}: '${value}'`)
    .join(', ');
  
  return `{{ ${styleEntries} }}`;
}

/**
 * Generate JSX for a component and its children
 */
function generateJSX(
  component: AppComponent, 
  props: ComponentProp[], 
  indent: string = '    '
): string {
  const element = mapComponentType(component.type);
  const className = generateClassName(component);
  const styles = generateStyles(component);
  
  // Build attributes
  const attrs: string[] = [];
  
  if (className) {
    attrs.push(`className="${className}"`);
  }
  
  const styleStr = styleObjectToString(styles);
  if (styleStr) {
    attrs.push(`style={${styleStr}}`);
  }
  
  // Add specific props based on component type
  if (component.type === 'image' && component.props?.src) {
    // Check if this is bound to a prop
    const boundProp = props.find(p => 
      p.bindings.some(b => b.componentId === component.id && b.property === 'src')
    );
    if (boundProp) {
      attrs.push(`src={${boundProp.name}}`);
    } else {
      attrs.push(`src="${component.props.src}"`);
    }
    if (component.props?.alt) {
      attrs.push(`alt="${component.props.alt}"`);
    }
  }
  
  if (component.type === 'link' && component.props?.href) {
    attrs.push(`href="${component.props.href}"`);
  }
  
  if (component.type === 'button') {
    attrs.push('type="button"');
  }
  
  // Get content
  let content = '';
  if (component.props?.content) {
    // Check if bound to a prop
    const boundProp = props.find(p => 
      p.bindings.some(b => b.componentId === component.id && b.property === 'content')
    );
    if (boundProp) {
      content = `{${boundProp.name}}`;
    } else {
      content = component.props.content;
    }
  }
  
  // Generate children
  const childrenJSX = component.children?.map(child => 
    generateJSX(child, props, indent + '  ')
  ).join('\n') || '';
  
  // Build the JSX
  const attrsStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
  
  if (!content && !childrenJSX) {
    // Self-closing tag
    return `${indent}<${element}${attrsStr} />`;
  }
  
  if (content && !childrenJSX) {
    return `${indent}<${element}${attrsStr}>${content}</${element}>`;
  }
  
  return `${indent}<${element}${attrsStr}>
${childrenJSX}${content ? `\n${indent}  ${content}` : ''}
${indent}</${element}>`;
}

/**
 * Generate prop types interface
 */
function generatePropsInterface(componentName: string, props: ComponentProp[]): string {
  if (props.length === 0) return '';
  
  const propTypes = props.map(prop => {
    let tsType = 'string';
    switch (prop.type) {
      case 'number':
        tsType = 'number';
        break;
      case 'boolean':
        tsType = 'boolean';
        break;
      case 'color':
      case 'image':
      case 'string':
      case 'icon':
        tsType = 'string';
        break;
      case 'select':
        if (prop.options && prop.options.length > 0) {
          tsType = prop.options.map(o => `'${o.value}'`).join(' | ');
        }
        break;
      case 'json':
        tsType = 'Record<string, any>';
        break;
      case 'action':
        tsType = '() => void';
        break;
      default:
        tsType = 'string';
    }
    
    const optional = !prop.required ? '?' : '';
    const description = prop.description ? `  /** ${prop.description} */\n` : '';
    
    return `${description}  ${prop.name}${optional}: ${tsType};`;
  }).join('\n');
  
  return `interface ${componentName}Props {
${propTypes}
}`;
}

/**
 * Generate default props
 */
function generateDefaultProps(props: ComponentProp[]): string {
  const defaults = props
    .filter(p => p.defaultValue !== undefined)
    .map(p => {
      const value = typeof p.defaultValue === 'string' 
        ? `'${p.defaultValue}'` 
        : p.defaultValue;
      return `  ${p.name} = ${value}`;
    });
  
  if (defaults.length === 0) return '';
  return defaults.join(',\n');
}

/**
 * Generate full React component code
 */
export function generateComponentCode(
  name: string,
  category: string,
  definition: AppComponent,
  props: ComponentProp[] = [],
  description?: string
): GeneratedComponent {
  const componentName = toPascalCase(name);
  const folderName = category && category !== 'Uncategorized' 
    ? toKebabCase(category) 
    : '';
  const fileName = `${componentName}.tsx`;
  const folderPath = folderName 
    ? `src/components/user/${folderName}` 
    : 'src/components/user';
  
  // Generate imports
  const imports = ["import React from 'react';"];
  
  // Generate props interface
  const propsInterface = generatePropsInterface(componentName, props);
  
  // Generate default props destructuring
  const defaultProps = generateDefaultProps(props);
  const propsDestructure = props.length > 0 
    ? `{ ${props.map(p => {
        const def = p.defaultValue !== undefined 
          ? ` = ${typeof p.defaultValue === 'string' ? `'${p.defaultValue}'` : p.defaultValue}` 
          : '';
        return `${p.name}${def}`;
      }).join(', ')} }: ${componentName}Props`
    : '';
  
  // Generate JSX
  const jsx = generateJSX(definition, props);
  
  // Build the component code
  const code = `${imports.join('\n')}

${propsInterface ? propsInterface + '\n\n' : ''}${description ? `/**\n * ${description}\n */\n` : ''}export function ${componentName}(${propsDestructure}) {
  return (
${jsx}
  );
}

export default ${componentName};
`;
  
  return {
    code,
    fileName,
    folderPath,
    imports
  };
}

/**
 * Generate an index.ts file for exporting all components in a category
 */
export function generateCategoryIndex(
  category: string,
  components: Array<{ name: string }>
): string {
  const exports = components.map(c => {
    const componentName = toPascalCase(c.name);
    return `export { ${componentName} } from './${componentName}';`;
  }).join('\n');
  
  return exports;
}

/**
 * Generate import statement for using a component
 */
export function generateImportStatement(
  componentName: string,
  category: string
): string {
  const pascalName = toPascalCase(componentName);
  const folderName = category && category !== 'Uncategorized' 
    ? toKebabCase(category) 
    : '';
  
  const importPath = folderName 
    ? `@/components/user/${folderName}/${pascalName}` 
    : `@/components/user/${pascalName}`;
  
  return `import { ${pascalName} } from '${importPath}';`;
}

export const componentCodeGenerator = {
  generateComponentCode,
  generateCategoryIndex,
  generateImportStatement,
  toPascalCase,
  toKebabCase
};
