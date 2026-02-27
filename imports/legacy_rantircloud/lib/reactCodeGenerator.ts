/**
 * React Code Generator - Converts AppComponent tree to clean React/JSX code
 * Outputs modern Tailwind CSS + shadcn/ui components
 */

import { AppComponent, ComponentType, AppPage } from '@/types/appBuilder';
import { StyleClass } from '@/types/classes';
import { UserComponent } from '@/types/userComponent';
import { componentCodeGenerator } from '@/services/componentCodeGenerator';
import { DesignSystemConfig, generateDesignSystemCSS } from '@/types/designSystem';
import { stylesToTailwindClasses } from '@/lib/stylesToTailwind';

export interface GeneratedFile {
  name: string;
  path: string;
  content: string;
  language: 'tsx' | 'css' | 'ts' | 'json' | 'html' | 'js';
}

export interface GeneratedProject {
  files: GeneratedFile[];
  entryPoint: string;
}

// === SHADCN/UI COMPONENT MAPPING ===
// Maps our component types to shadcn/ui component names (PascalCase)
const SHADCN_COMPONENT_MAP: Partial<Record<ComponentType, { element: string; import: string; importPath: string }>> = {
  'button': { element: 'Button', import: 'Button', importPath: '@/components/ui/button' },
  'input': { element: 'Input', import: 'Input', importPath: '@/components/ui/input' },
  'textarea': { element: 'Textarea', import: 'Textarea', importPath: '@/components/ui/textarea' },
  'card': { element: 'Card', import: 'Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter', importPath: '@/components/ui/card' },
  'badge': { element: 'Badge', import: 'Badge', importPath: '@/components/ui/badge' },
  'separator': { element: 'Separator', import: 'Separator', importPath: '@/components/ui/separator' },
  'divider': { element: 'Separator', import: 'Separator', importPath: '@/components/ui/separator' },
  'avatar': { element: 'Avatar', import: 'Avatar, AvatarImage, AvatarFallback', importPath: '@/components/ui/avatar' },
  'checkbox': { element: 'Checkbox', import: 'Checkbox', importPath: '@/components/ui/checkbox' },
  'switch': { element: 'Switch', import: 'Switch', importPath: '@/components/ui/switch' },
  'slider': { element: 'Slider', import: 'Slider', importPath: '@/components/ui/slider' },
  'progress': { element: 'Progress', import: 'Progress', importPath: '@/components/ui/progress' },
  'label': { element: 'Label', import: 'Label', importPath: '@/components/ui/label' },
  'skeleton': { element: 'Skeleton', import: 'Skeleton', importPath: '@/components/ui/skeleton' },
  'scroll-area': { element: 'ScrollArea', import: 'ScrollArea', importPath: '@/components/ui/scroll-area' },
  'toggle': { element: 'Toggle', import: 'Toggle', importPath: '@/components/ui/toggle' },
  'alert': { element: 'Alert', import: 'Alert, AlertDescription, AlertTitle', importPath: '@/components/ui/alert' },
};

// Map component types to HTML elements (fallback when not a shadcn component)
const COMPONENT_ELEMENT_MAP: Record<ComponentType, string> = {
  'div': 'div',
  'section': 'section',
  'container': 'div',
  'row': 'div',
  'column': 'div',
  'grid': 'div',
  'text': 'p',
  'heading': 'h1',
  'button': 'Button',
  'icon': 'span',
  'input': 'Input',
  'password-input': 'Input',
  'textarea': 'Textarea',
  'select': 'select',
  'checkbox': 'Checkbox',
  'radio': 'input',
  'radio-group': 'div',
  'checkbox-group': 'div',
  'image': 'img',
  'card': 'Card',
  'table': 'table',
  'datatable': 'div',
  'form': 'form',
  'form-wrapper': 'form',
  'form-wizard': 'div',
  'list': 'ul',
  'data-display': 'div',
  'nav-horizontal': 'nav',
  'nav-vertical': 'nav',
  'navigation': 'nav',
  'header': 'header',
  'footer': 'footer',
  'sidebar': 'aside',
  'modal': 'dialog',
  'tabs': 'div',
  'tab-item': 'div',
  'tab-trigger': 'button',
  'tab-content': 'div',
  'accordion': 'div',
  'accordion-item': 'div',
  'accordion-header': 'button',
  'accordion-content': 'div',
  'chart': 'div',
  'calendar': 'div',
  'datepicker': 'Input',
  'fileupload': 'Input',
  'avatar': 'Avatar',
  'badge': 'Badge',
  'alert': 'Alert',
  'progress': 'Progress',
  'skeleton': 'Skeleton',
  'separator': 'Separator',
  'spacer': 'div',
  'switch': 'Switch',
  'slider': 'Slider',
  'label': 'Label',
  'combobox': 'select',
  'input-otp': 'Input',
  'video': 'video',
  'audio': 'audio',
  'keyboard': 'div',
  'breadcrumb': 'nav',
  'pagination': 'nav',
  'command': 'div',
  'menubar': 'div',
  'navigation-menu': 'nav',
  'toast': 'div',
  'alert-dialog': 'dialog',
  'sonner': 'div',
  'dialog': 'dialog',
  'sheet': 'div',
  'popover': 'div',
  'tooltip': 'div',
  'hover-card': 'div',
  'context-menu': 'div',
  'dropdown-menu': 'div',
  'drawer': 'div',
  'collapsible': 'div',
  'carousel': 'div',
  'carousel-slide': 'div',
  'carousel-slide-content': 'div',
  'toggle': 'Toggle',
  'toggle-group': 'div',
  'scroll-area': 'ScrollArea',
  'theme-toggle': 'button',
  'divider': 'Separator',
  'loading': 'div',
  'spinner': 'div',
  'blockquote': 'blockquote',
  'code': 'code',
  'codeblock': 'pre',
  'link': 'a',
  'aspect-ratio': 'div',
  'resizable': 'div',
  'login-form': 'form',
  'register-form': 'form',
  'user-profile': 'div',
  'auth-status': 'div',
  'dynamic-list': 'div',
  'pro-dynamic-list': 'div',
  'dynamic-grid': 'div',
  'user-component': 'div',
};

// Get semantic element based on heading level or explicit tag prop
function getHeadingElement(props: Record<string, any>): string {
  if (props.tag && /^h[1-6]$/.test(props.tag)) {
    return props.tag;
  }
  const level = props.level || props.headingLevel || 1;
  return `h${Math.min(Math.max(level, 1), 6)}`;
}

// Get semantic element for text components
function getTextElement(props: Record<string, any>): string {
  if (props.tag) {
    if (props.tag === 'p') return 'p';
    if (/^h[1-6]$/.test(props.tag)) return props.tag;
  }
  return 'p';
}

/**
 * Detect data bindings in component tree to determine if we need data fetching
 */
function detectDataBindingsInComponent(component: AppComponent): { tableId: string | null; bindings: string[] } {
  const bindings: string[] = [];
  const props = component.props || {};
  
  const tableId = props.databaseConnection?.tableProjectId || props.databaseConnection?.tableId || null;
  
  const textContent = props.content || props.text || props.children || '';
  if (typeof textContent === 'string') {
    const matches = textContent.match(/\{\{([^}]+)\}\}/g);
    if (matches) {
      matches.forEach(m => bindings.push(m));
    }
  }
  
  if (component.children) {
    component.children.forEach(child => {
      const childResult = detectDataBindingsInComponent(child);
      bindings.push(...childResult.bindings);
    });
  }
  
  return { tableId, bindings };
}

// Track shadcn imports used in current generation
let usedShadcnImports: Map<string, string> = new Map();

/**
 * Collect all styles for a component from props, style object, styleOverrides, and class styles
 */
function collectComponentStyles(component: AppComponent, classes: StyleClass[]): Record<string, any> {
  const props = component.props || {};
  const style = component.style || {};
  const styleOverrides = component.styleOverrides || {};
  const allStyles: Record<string, any> = {};

  // From class styles
  const userClasses = component.classNames || props.appliedClasses || [];
  if (userClasses.length > 0) {
    userClasses.forEach((className: string) => {
      const styleClass = classes.find(c => c.name === className);
      if (styleClass?.styles) {
        Object.assign(allStyles, styleClass.styles);
      }
    });
  }

  // From props
  const styleProps = [
    'backgroundColor', 'color', 'textColor', 'fontSize', 'fontWeight', 'fontFamily',
    'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
    'display', 'flexDirection', 'justifyContent', 'alignItems', 'flexWrap', 'gap',
    'borderRadius', 'borderWidth', 'borderColor', 'borderStyle',
    'boxShadow', 'opacity', 'overflow', 'position', 'top', 'right', 'bottom', 'left',
    'textAlign', 'lineHeight', 'letterSpacing', 'textDecoration', 'textTransform',
    'backgroundImage', 'backgroundGradient', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
    'zIndex', 'cursor', 'transform', 'transition'
  ];

  styleProps.forEach(prop => {
    if (props[prop] !== undefined && props[prop] !== null && props[prop] !== '') {
      allStyles[prop] = props[prop];
    }
  });

  // From nested style object
  if (style.typography) Object.assign(allStyles, style.typography);
  if (style.background) {
    if (style.background.color) allStyles.backgroundColor = style.background.color;
    if (style.background.gradient) allStyles.backgroundImage = style.background.gradient;
  }
  if (style.spacing?.padding) {
    if (typeof style.spacing.padding === 'number') {
      allStyles.padding = style.spacing.padding;
    } else if (typeof style.spacing.padding === 'object') {
      Object.entries(style.spacing.padding).forEach(([side, val]) => {
        allStyles[`padding${side.charAt(0).toUpperCase() + side.slice(1)}`] = val;
      });
    }
  }
  if (style.spacing?.margin) {
    if (typeof style.spacing.margin === 'number') {
      allStyles.margin = style.spacing.margin;
    } else if (typeof style.spacing.margin === 'object') {
      Object.entries(style.spacing.margin).forEach(([side, val]) => {
        allStyles[`margin${side.charAt(0).toUpperCase() + side.slice(1)}`] = val;
      });
    }
  }
  if ((style.spacing as any)?.gap !== undefined) allStyles.gap = (style.spacing as any).gap;
  if (style.sizing) Object.assign(allStyles, style.sizing);
  if (style.layout) Object.assign(allStyles, style.layout);
  if (style.border) {
    if (style.border.width) allStyles.borderWidth = style.border.width;
    if (style.border.style) allStyles.borderStyle = style.border.style;
    if (style.border.color) allStyles.borderColor = style.border.color;
    if (style.border.radius) allStyles.borderRadius = style.border.radius;
  }
  if ((style as any).effects) {
    if ((style as any).effects.boxShadow) allStyles.boxShadow = (style as any).effects.boxShadow;
    if ((style as any).effects.opacity !== undefined) allStyles.opacity = (style as any).effects.opacity;
  }

  // Style overrides (highest priority)
  Object.assign(allStyles, styleOverrides);

  return allStyles;
}

/**
 * Generate React code from an array of components
 */
export function generateReactCode(
  components: AppComponent[],
  classes: StyleClass[],
  pageName: string = 'Page',
  needsDataLayer: boolean = false
): string {
  const componentName = sanitizeComponentName(pageName);
  
  // Reset import tracker
  usedShadcnImports = new Map();
  
  // Detect if this page has data bindings
  let pageHasBindings = false;
  let tableId: string | null = null;
  
  components.forEach(c => {
    const result = detectDataBindingsInComponent(c);
    if (result.bindings.length > 0) pageHasBindings = true;
    if (result.tableId) tableId = result.tableId;
  });
  
  const jsxContent = components.map(c => componentToJSX(c, classes, 2)).join('\n');
  
  // Build imports
  const importLines: string[] = [];
  importLines.push(`import React from 'react';`);
  
  // Add shadcn/ui imports
  usedShadcnImports.forEach((importStr, importPath) => {
    importLines.push(`import { ${importStr} } from '${importPath}';`);
  });
  
  // Add cn utility if we have classes
  importLines.push(`import { cn } from '@/lib/utils';`);
  
  // Add data layer imports if needed
  if (needsDataLayer && pageHasBindings && tableId) {
    importLines.push(`import { useTableData } from '../hooks/useTableData';`);
    importLines.push(`import { formatValue } from '../lib/formatters';`);
  }
  
  // Build component body
  let hookCode = '';
  if (needsDataLayer && pageHasBindings && tableId) {
    hookCode = `
  const { data, loading, error } = useTableData({ tableId: '${tableId}' });
  const record = data?.[0] || {};
`;
  }
  
  return `${importLines.join('\n')}

export function ${componentName}() {${hookCode}
  return (
    <div className="w-full min-h-screen">
${jsxContent}
    </div>
  );
}

export default ${componentName};
`;
}

/**
 * Convert a single component to JSX string with Tailwind classes
 */
function componentToJSX(
  component: AppComponent,
  classes: StyleClass[],
  indent: number = 0
): string {
  const indentStr = '  '.repeat(indent);
  const type = component.type;
  const props = component.props || {};
  
  // Check for shadcn component
  const shadcnInfo = SHADCN_COMPONENT_MAP[type];
  
  // Get element name
  let elementName = COMPONENT_ELEMENT_MAP[type] || 'div';
  if (type === 'heading') {
    elementName = getHeadingElement(props);
  } else if (type === 'text') {
    elementName = getTextElement(props);
  }
  
  // Track shadcn imports
  if (shadcnInfo) {
    elementName = shadcnInfo.element;
    usedShadcnImports.set(shadcnInfo.importPath, shadcnInfo.import);
  }
  
  // Build Tailwind className from all collected styles
  const allStyles = collectComponentStyles(component, classes);
  const tailwindClasses = stylesToTailwindClasses(allStyles);
  
  // Add default layout classes for common container types
  const defaultClasses = getDefaultTailwindClasses(type, props);
  const combinedClasses = [defaultClasses, tailwindClasses].filter(Boolean).join(' ');
  
  const classNameAttr = combinedClasses 
    ? ` className="${combinedClasses}"` 
    : '';
  
  // Build other attributes
  const attrs = buildAttributes(component, type);
  
  // Get content/children
  const content = getComponentContent(component, props);
  const hasChildren = component.children && component.children.length > 0;
  
  // Self-closing tags
  const selfClosingElements = ['input', 'Input', 'img', 'hr', 'br', 'Separator', 'Checkbox', 'Switch', 'Slider', 'Progress', 'Skeleton'];
  const selfClosing = selfClosingElements.includes(elementName);
  
  if (selfClosing) {
    return `${indentStr}<${elementName}${classNameAttr}${attrs} />`;
  }
  
  if (hasChildren) {
    const childrenJSX = component.children!
      .map(child => componentToJSX(child, classes, indent + 1))
      .join('\n');
    return `${indentStr}<${elementName}${classNameAttr}${attrs}>
${childrenJSX}
${indentStr}</${elementName}>`;
  }
  
  if (content) {
    if (content.includes('\n')) {
      return `${indentStr}<${elementName}${classNameAttr}${attrs}>
${indentStr}  ${content}
${indentStr}</${elementName}>`;
    }
    return `${indentStr}<${elementName}${classNameAttr}${attrs}>${content}</${elementName}>`;
  }
  
  return `${indentStr}<${elementName}${classNameAttr}${attrs} />`;
}

/**
 * Get default Tailwind classes for common component types
 */
function getDefaultTailwindClasses(type: ComponentType, _props: Record<string, any>): string {
  switch (type) {
    case 'container':
      return 'w-full max-w-7xl mx-auto px-4';
    case 'row':
      return 'flex flex-row';
    case 'column':
      return 'flex flex-col';
    case 'grid':
      return 'grid';
    case 'section':
      return 'w-full';
    case 'nav-horizontal':
    case 'navigation':
      return 'flex items-center justify-between w-full';
    case 'header':
      return 'w-full';
    case 'footer':
      return 'w-full';
    case 'sidebar':
      return 'flex flex-col';
    case 'spacer':
      return 'flex-shrink-0';
    case 'card':
      return ''; // shadcn Card has its own styles
    case 'button':
      return ''; // shadcn Button has its own styles
    case 'link':
      return 'text-primary hover:underline';
    case 'blockquote':
      return 'border-l-4 border-muted pl-4 italic';
    case 'code':
      return 'font-mono bg-muted px-1.5 py-0.5 rounded text-sm';
    case 'codeblock':
      return 'font-mono bg-muted p-4 rounded-lg text-sm overflow-x-auto';
    case 'list':
      return 'list-disc list-inside space-y-1';
    default:
      return '';
  }
}

/**
 * Build HTML attributes from component props
 */
function buildAttributes(component: AppComponent, type: ComponentType): string {
  const props = component.props || {};
  const attrs: string[] = [];
  
  if (props.id) attrs.push(`id="${props.id}"`);
  
  switch (type) {
    case 'input':
    case 'password-input':
    case 'checkbox':
    case 'radio':
      if (props.type) attrs.push(`type="${props.type}"`);
      if (props.placeholder) attrs.push(`placeholder="${escapeAttr(props.placeholder)}"`);
      if (props.name) attrs.push(`name="${props.name}"`);
      if (props.value) attrs.push(`defaultValue="${escapeAttr(props.value)}"`);
      if (props.disabled) attrs.push('disabled');
      if (props.required) attrs.push('required');
      break;
      
    case 'textarea':
      if (props.placeholder) attrs.push(`placeholder="${escapeAttr(props.placeholder)}"`);
      if (props.rows) attrs.push(`rows={${props.rows}}`);
      break;
      
    case 'image':
      if (props.src) attrs.push(`src="${props.src}"`);
      if (props.alt) attrs.push(`alt="${escapeAttr(props.alt || '')}"`);
      break;
      
    case 'link':
      if (props.href) attrs.push(`href="${props.href}"`);
      if (props.target) attrs.push(`target="${props.target}"`);
      break;
      
    case 'video':
    case 'audio':
      if (props.src) attrs.push(`src="${props.src}"`);
      if (props.controls !== false) attrs.push('controls');
      if (props.autoPlay) attrs.push('autoPlay');
      if (props.loop) attrs.push('loop');
      break;
      
    case 'button':
      if (props.variant) attrs.push(`variant="${props.variant}"`);
      if (props.size) attrs.push(`size="${props.size}"`);
      if (props.disabled) attrs.push('disabled');
      break;
      
    case 'form':
    case 'form-wrapper':
    case 'login-form':
    case 'register-form':
      if (props.action) attrs.push(`action="${props.action}"`);
      if (props.method) attrs.push(`method="${props.method}"`);
      break;

    case 'progress':
      if (props.value !== undefined) attrs.push(`value={${props.value}}`);
      break;
  }
  
  // Handle onClick and other events
  if (component.actions && component.actions.length > 0) {
    const clickAction = component.actions.find(a => a.trigger === 'click');
    if (clickAction) {
      attrs.push(`onClick={() => { /* ${clickAction.type} action */ }}`);
    }
  }
  
  return attrs.length > 0 ? ' ' + attrs.join(' ') : '';
}

/**
 * Get text content for a component
 */
function getComponentContent(component: AppComponent, props: Record<string, any>): string {
  if (props.content) return escapeJSX(String(props.content));
  if (props.text) return escapeJSX(String(props.text));
  if (props.label && ['button', 'label'].includes(component.type)) {
    return escapeJSX(String(props.label));
  }
  
  if (component.type === 'select' && props.options) {
    const options = Array.isArray(props.options) ? props.options : [];
    return options.map((opt: any) => {
      const value = typeof opt === 'object' ? opt.value : opt;
      const label = typeof opt === 'object' ? opt.label : opt;
      return `<option value="${value}">${label}</option>`;
    }).join('\n          ');
  }
  
  return '';
}

/**
 * Escape special characters for JSX content
 */
function escapeJSX(str: string): string {
  const bindingPattern = /\{\{([^}]+)\}\}/g;
  const hasBindings = bindingPattern.test(str);
  
  if (hasBindings) {
    return convertBindingsToJSX(str);
  }
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Convert {{fieldName|formatter}} bindings to JSX expressions
 */
function convertBindingsToJSX(str: string): string {
  return str.replace(/\{\{([^}]+)\}\}/g, (match, bindingExpr) => {
    const parts = bindingExpr.trim().split('|');
    const fieldName = parts[0].trim();
    const formatter = parts[1]?.trim();
    
    if (formatter) {
      return `{formatValue(record.${fieldName}, '${formatter}')}`;
    }
    return `{record.${fieldName} ?? ''}`;
  });
}

/**
 * Escape special characters for HTML attributes
 */
function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sanitize a string to be a valid React component name
 */
function sanitizeComponentName(name: string): string {
  const sanitized = name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  
  if (!/^[A-Z]/.test(sanitized)) {
    return 'Page' + sanitized;
  }
  
  return sanitized || 'Page';
}

/**
 * Analyze components to detect required dependencies
 */
function analyzeComponentDependencies(pages: AppPage[]): Record<string, string> {
  const dependencies: Record<string, string> = {};
  
  const componentDependencyMap: Record<string, Record<string, string>> = {
    'chart': { 'recharts': '^2.12.7' },
    'calendar': { 'react-day-picker': '^8.10.1', 'date-fns': '^3.6.0' },
    'datepicker': { 'react-day-picker': '^8.10.1', 'date-fns': '^3.6.0' },
    'carousel': { 'embla-carousel-react': '^8.3.0' },
    'toast': { 'sonner': '^1.5.0' },
    'sonner': { 'sonner': '^1.5.0' },
    'dialog': { '@radix-ui/react-dialog': '^1.1.2' },
    'alert-dialog': { '@radix-ui/react-alert-dialog': '^1.1.1' },
    'dropdown-menu': { '@radix-ui/react-dropdown-menu': '^2.1.1' },
    'popover': { '@radix-ui/react-popover': '^1.1.1' },
    'tooltip': { '@radix-ui/react-tooltip': '^1.1.4' },
    'tabs': { '@radix-ui/react-tabs': '^1.1.0' },
    'accordion': { '@radix-ui/react-accordion': '^1.2.0' },
    'select': { '@radix-ui/react-select': '^2.1.1' },
    'checkbox': { '@radix-ui/react-checkbox': '^1.1.1' },
    'switch': { '@radix-ui/react-switch': '^1.1.0' },
    'slider': { '@radix-ui/react-slider': '^1.2.0' },
    'progress': { '@radix-ui/react-progress': '^1.1.0' },
    'avatar': { '@radix-ui/react-avatar': '^1.1.0' },
    'scroll-area': { '@radix-ui/react-scroll-area': '^1.1.0' },
    'separator': { '@radix-ui/react-separator': '^1.1.0' },
    'collapsible': { '@radix-ui/react-collapsible': '^1.1.0' },
    'context-menu': { '@radix-ui/react-context-menu': '^2.2.1' },
    'hover-card': { '@radix-ui/react-hover-card': '^1.1.1' },
    'menubar': { '@radix-ui/react-menubar': '^1.1.1' },
    'navigation-menu': { '@radix-ui/react-navigation-menu': '^1.2.0' },
    'radio': { '@radix-ui/react-radio-group': '^1.2.0' },
    'toggle': { '@radix-ui/react-toggle': '^1.1.0' },
    'toggle-group': { '@radix-ui/react-toggle-group': '^1.1.0' },
    'input-otp': { 'input-otp': '^1.2.4' },
    'drawer': { 'vaul': '^0.9.3' },
    'sheet': { 'vaul': '^0.9.3' },
    'datatable': { '@tanstack/react-table': '^8.21.3' },
    'table': { '@tanstack/react-table': '^8.21.3' },
    'form': { 'react-hook-form': '^7.53.0', '@hookform/resolvers': '^3.9.0', 'zod': '^3.23.8' },
    'login-form': { 'react-hook-form': '^7.53.0', '@hookform/resolvers': '^3.9.0', 'zod': '^3.23.8' },
    'register-form': { 'react-hook-form': '^7.53.0', '@hookform/resolvers': '^3.9.0', 'zod': '^3.23.8' },
  };
  
  const checkComponent = (component: AppComponent) => {
    const typeDeps = componentDependencyMap[component.type];
    if (typeDeps) {
      Object.assign(dependencies, typeDeps);
    }
    if (component.children) {
      component.children.forEach(checkComponent);
    }
  };
  
  pages.forEach(page => {
    page.components.forEach(checkComponent);
  });
  
  return dependencies;
}

/**
 * Check if any components have database connections
 */
function hasDataBindings(pages: AppPage[]): boolean {
  const checkComponent = (component: AppComponent): boolean => {
    if (component.props?.databaseConnection?.tableId || 
        component.props?.databaseConnection?.tableProjectId ||
        component.props?.isDynamic) {
      return true;
    }
    if (component.children) {
      return component.children.some(checkComponent);
    }
    return false;
  };
  
  return pages.some(page => page.components.some(checkComponent));
}

/**
 * Generate a full project with multiple files
 */
export function generateProject(
  pages: AppPage[],
  classes: StyleClass[],
  userComponents: UserComponent[] = [],
  designSystemConfig?: DesignSystemConfig
): GeneratedProject {
  const files: GeneratedFile[] = [];
  
  const additionalDeps = analyzeComponentDependencies(pages);
  const needsDataLayer = hasDataBindings(pages);
  
  // Generate package.json with detected dependencies
  files.push({
    name: 'package.json',
    path: 'package.json',
    content: generatePackageJson(additionalDeps),
    language: 'json',
  });
  
  // Generate .env.example if data bindings are present
  if (needsDataLayer) {
    files.push({
      name: '.env.example',
      path: '.env.example',
      content: generateEnvExample(),
      language: 'ts',
    });
    
    files.push({
      name: 'formatters.ts',
      path: 'src/lib/formatters.ts',
      content: generateFormattersFile(),
      language: 'ts',
    });
    
    files.push({
      name: 'dataService.ts',
      path: 'src/lib/dataService.ts',
      content: generateDataServiceFile(),
      language: 'ts',
    });
    
    files.push({
      name: 'useTableData.ts',
      path: 'src/hooks/useTableData.ts',
      content: generateUseTableDataFile(),
      language: 'ts',
    });
  }
  
  // Generate cn() utility
  files.push({
    name: 'utils.ts',
    path: 'src/lib/utils.ts',
    content: generateUtilsFile(),
    language: 'ts',
  });
  
  // Generate index.html
  files.push({
    name: 'index.html',
    path: 'index.html',
    content: generateIndexHtml(),
    language: 'html',
  });
  
  // Generate vite.config.ts
  files.push({
    name: 'vite.config.ts',
    path: 'vite.config.ts',
    content: generateViteConfig(),
    language: 'ts',
  });
  
  // Generate tailwind.config.ts with design tokens
  files.push({
    name: 'tailwind.config.ts',
    path: 'tailwind.config.ts',
    content: generateTailwindConfig(designSystemConfig),
    language: 'ts',
  });
  
  // Generate postcss.config.js
  files.push({
    name: 'postcss.config.js',
    path: 'postcss.config.js',
    content: generatePostCSSConfig(),
    language: 'js',
  });
  
  // Generate tsconfig.json
  files.push({
    name: 'tsconfig.json',
    path: 'tsconfig.json',
    content: generateTSConfig(),
    language: 'json',
  });
  
  files.push({
    name: 'tsconfig.node.json',
    path: 'tsconfig.node.json',
    content: generateTSNodeConfig(),
    language: 'json',
  });
  
  // Generate main.tsx
  files.push({
    name: 'main.tsx',
    path: 'src/main.tsx',
    content: generateMainTsx(),
    language: 'tsx',
  });
  
  // Generate index.css with Tailwind directives and CSS variables
  files.push({
    name: 'index.css',
    path: 'src/index.css',
    content: generateIndexCSS(designSystemConfig),
    language: 'css',
  });
  
  // Generate minimal styles.css for truly custom/complex styles only
  const designSystemCSS = designSystemConfig ? generateDesignSystemCSS(designSystemConfig) : '';
  const classCSS = generateCSS(classes, pages);
  const cssContent = [designSystemCSS, classCSS].filter(Boolean).join('\n\n');
  if (cssContent.trim()) {
    files.push({
      name: 'styles.css',
      path: 'src/styles.css',
      content: cssContent,
      language: 'css',
    });
  }
  
  // Generate shadcn/ui component files
  const shadcnComponents = collectUsedShadcnComponents(pages);
  shadcnComponents.forEach(comp => {
    files.push({
      name: `${comp.fileName}.tsx`,
      path: `src/components/ui/${comp.fileName}.tsx`,
      content: comp.code,
      language: 'tsx',
    });
  });
  
  // Generate user components organized by category
  if (userComponents.length > 0) {
    const componentsByCategory = userComponents.reduce((acc, comp) => {
      const category = comp.category || 'Uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(comp);
      return acc;
    }, {} as Record<string, UserComponent[]>);
    
    userComponents.forEach(comp => {
      const generated = componentCodeGenerator.generateComponentCode(
        comp.name,
        comp.category || 'Uncategorized',
        comp.definition,
        comp.props || [],
        comp.description
      );
      
      files.push({
        name: generated.fileName,
        path: `${generated.folderPath}/${generated.fileName}`,
        content: generated.code,
        language: 'tsx',
      });
    });
    
    Object.entries(componentsByCategory).forEach(([category, components]) => {
      const folderName = category !== 'Uncategorized' 
        ? componentCodeGenerator.toKebabCase(category)
        : '';
      const folderPath = folderName 
        ? `src/components/user/${folderName}`
        : 'src/components/user';
      
      const indexContent = componentCodeGenerator.generateCategoryIndex(category, components);
      
      files.push({
        name: 'index.ts',
        path: `${folderPath}/index.ts`,
        content: indexContent,
        language: 'ts',
      });
    });
    
    const mainIndexExports = Object.keys(componentsByCategory).map(category => {
      const folderName = category !== 'Uncategorized' 
        ? componentCodeGenerator.toKebabCase(category)
        : '';
      
      if (folderName) {
        return `export * from './${folderName}';`;
      } else {
        return componentsByCategory[category]
          .map(c => `export { ${componentCodeGenerator.toPascalCase(c.name)} } from './${componentCodeGenerator.toPascalCase(c.name)}';`)
          .join('\n');
      }
    }).join('\n');
    
    files.push({
      name: 'index.ts',
      path: 'src/components/user/index.ts',
      content: mainIndexExports,
      language: 'ts',
    });
  }
  
  // Generate page components
  pages.forEach(page => {
    const componentName = sanitizeComponentName(page.name);
    const pageCode = generateReactCode(page.components, classes, page.name, needsDataLayer);
    files.push({
      name: `${componentName}.tsx`,
      path: `src/pages/${componentName}.tsx`,
      content: pageCode,
      language: 'tsx',
    });
  });
  
  // Generate App.tsx
  const appCode = generateAppComponent(pages);
  files.push({
    name: 'App.tsx',
    path: 'src/App.tsx',
    content: appCode,
    language: 'tsx',
  });
  
  return {
    files,
    entryPoint: 'src/App.tsx',
  };
}

/**
 * Collect which shadcn/ui components are used across all pages
 */
function collectUsedShadcnComponents(pages: AppPage[]): Array<{ fileName: string; code: string }> {
  const usedTypes = new Set<ComponentType>();
  
  const checkComponent = (component: AppComponent) => {
    if (SHADCN_COMPONENT_MAP[component.type]) {
      usedTypes.add(component.type);
    }
    if (component.children) {
      component.children.forEach(checkComponent);
    }
  };
  
  pages.forEach(page => page.components.forEach(checkComponent));
  
  const components: Array<{ fileName: string; code: string }> = [];
  
  // Always include button and utils
  components.push({
    fileName: 'button',
    code: `import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }`,
  });
  
  if (usedTypes.has('input') || usedTypes.has('password-input') || usedTypes.has('datepicker') || usedTypes.has('fileupload') || usedTypes.has('input-otp')) {
    components.push({
      fileName: 'input',
      code: `import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }`,
    });
  }
  
  if (usedTypes.has('textarea')) {
    components.push({
      fileName: 'textarea',
      code: `import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }`,
    });
  }
  
  if (usedTypes.has('card')) {
    components.push({
      fileName: 'card',
      code: `import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-xl border bg-card text-card-foreground shadow", className)} {...props} />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
)
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }`,
    });
  }
  
  if (usedTypes.has('badge')) {
    components.push({
      fileName: 'badge',
      code: `import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }`,
    });
  }
  
  if (usedTypes.has('separator') || usedTypes.has('divider')) {
    components.push({
      fileName: 'separator',
      code: `import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"
import { cn } from "@/lib/utils"

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className
    )}
    {...props}
  />
))
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }`,
    });
  }
  
  if (usedTypes.has('label')) {
    components.push({
      fileName: 'label',
      code: `import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }`,
    });
  }
  
  if (usedTypes.has('skeleton')) {
    components.push({
      fileName: 'skeleton',
      code: `import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-primary/10", className)} {...props} />
}

export { Skeleton }`,
    });
  }
  
  return components;
}

/**
 * Generate package.json with dynamic dependencies
 */
function generatePackageJson(additionalDeps: Record<string, string> = {}): string {
  const baseDependencies: Record<string, string> = {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.22.0",
    "lucide-react": "^0.462.0",
    "iconsax-react": "^0.0.8",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.2",
    "class-variance-authority": "^0.7.1",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-label": "^2.1.0",
    "tailwindcss-animate": "^1.0.7",
  };
  
  const allDependencies = { ...baseDependencies, ...additionalDeps };
  
  const sortedDependencies = Object.keys(allDependencies)
    .sort()
    .reduce((acc, key) => {
      acc[key] = allDependencies[key];
      return acc;
    }, {} as Record<string, string>);
  
  return JSON.stringify({
    name: "react-app",
    private: true,
    version: "0.0.0",
    type: "module",
    scripts: {
      dev: "vite",
      build: "tsc && vite build",
      preview: "vite preview"
    },
    dependencies: sortedDependencies,
    devDependencies: {
      "@types/react": "^18.3.3",
      "@types/react-dom": "^18.3.0",
      "@vitejs/plugin-react": "^4.3.1",
      "autoprefixer": "^10.4.19",
      "postcss": "^8.4.38",
      "tailwindcss": "^3.4.4",
      "typescript": "^5.5.3",
      "vite": "^5.4.2"
    }
  }, null, 2);
}

/**
 * Generate index.html
 */
function generateIndexHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
}

/**
 * Generate vite.config.ts
 */
function generateViteConfig(): string {
  return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})`;
}

/**
 * Generate tailwind.config.ts with design system tokens
 */
function generateTailwindConfig(designSystem?: DesignSystemConfig): string {
  const customColors: Record<string, string> = {};
  const customFonts: string[] = [];
  
  if (designSystem) {
    // Extract colors from design system
    if (designSystem.colors) {
      Object.entries(designSystem.colors).forEach(([name, value]) => {
        if (typeof value === 'string') {
          customColors[name] = value;
        }
      });
    }
    // Extract fonts
    if ((designSystem as any).fonts) {
      Object.values((designSystem as any).fonts).forEach((font: any) => {
        if (typeof font === 'string') customFonts.push(font);
      });
    }
  }
  
  const colorsConfig = Object.keys(customColors).length > 0
    ? `
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },`
    : `
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },`;

  return `import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {${colorsConfig}
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;`;
}

/**
 * Generate postcss.config.js
 */
function generatePostCSSConfig(): string {
  return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
}

/**
 * Generate tsconfig.json
 */
function generateTSConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: "ES2020",
      useDefineForClassFields: true,
      lib: ["ES2020", "DOM", "DOM.Iterable"],
      module: "ESNext",
      skipLibCheck: true,
      moduleResolution: "bundler",
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: "react-jsx",
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
      baseUrl: ".",
      paths: {
        "@/*": ["./src/*"]
      }
    },
    include: ["src"],
    references: [{ path: "./tsconfig.node.json" }]
  }, null, 2);
}

/**
 * Generate tsconfig.node.json
 */
function generateTSNodeConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      composite: true,
      skipLibCheck: true,
      module: "ESNext",
      moduleResolution: "bundler",
      allowSyntheticDefaultImports: true,
      strict: true
    },
    include: ["vite.config.ts"]
  }, null, 2);
}

/**
 * Generate src/lib/utils.ts with cn() utility
 */
function generateUtilsFile(): string {
  return `import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}`;
}

/**
 * Generate main.tsx entry point
 */
function generateMainTsx(): string {
  return `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;
}

/**
 * Generate index.css with Tailwind directives and CSS variables
 */
function generateIndexCSS(_designSystem?: DesignSystemConfig): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}`;
}

/**
 * Generate App.tsx with routing
 */
function generateAppComponent(pages: AppPage[]): string {
  const imports = pages.map(page => {
    const componentName = sanitizeComponentName(page.name);
    return `import { ${componentName} } from './pages/${componentName}';`;
  }).join('\n');
  
  const routes = pages.map(page => {
    const componentName = sanitizeComponentName(page.name);
    const route = page.route || `/${page.name.toLowerCase().replace(/\s+/g, '-')}`;
    return `        <Route path="${route}" element={<${componentName} />} />`;
  }).join('\n');
  
  const firstPage = pages[0];
  const defaultComponent = firstPage ? sanitizeComponentName(firstPage.name) : 'Home';
  
  return `import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
${imports}

function App() {
  return (
    <BrowserRouter>
      <Routes>
${routes}
        <Route path="*" element={<${defaultComponent} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
`;
}

/**
 * Generate CSS from StyleClass objects and component styles
 * This is now a minimal fallback for truly complex styles that can't map to Tailwind
 */
export function generateCSS(classes: StyleClass[], pages: AppPage[] = []): string {
  const cssRules: string[] = [
    '/* Generated styles - complex/custom styles that extend Tailwind */',
    '',
  ];
  
  const tabletRules: string[] = [];
  const mobileRules: string[] = [];
  
  // Only generate CSS for state styles (hover, focus, etc.) since Tailwind handles base styles
  const activeClasses = classes.filter(cls => cls.appliedTo.length > 0);
  
  activeClasses.forEach(styleClass => {
    const selector = `.${styleClass.name}`;
    
    // Desktop state styles (hover, focus, etc.)
    if (styleClass.stateStyles) {
      Object.entries(styleClass.stateStyles).forEach(([state, styles]) => {
        if (state === 'none' || !styles || Object.keys(styles).length === 0) return;
        
        const stateSelector = state === 'hover' ? `${selector}:hover` :
                             state === 'focused' ? `${selector}:focus-visible` :
                             state === 'focus-visible' ? `${selector}:focus-visible` :
                             state === 'focus-within' ? `${selector}:focus-within` :
                             state === 'pressed' ? `${selector}:active` :
                             null;
        
        const stateCSS = styleObjectToCSS(styles);
        if (stateCSS.length > 0) {
          cssRules.push(`${stateSelector} {`);
          stateCSS.forEach(rule => cssRules.push(`  ${rule}`));
          cssRules.push('}');
          cssRules.push('');
        }
      });
    }
    
    // Tablet overrides
    if (styleClass.tabletStyles && Object.keys(styleClass.tabletStyles).length > 0) {
      const tabletCSS = styleObjectToCSS(styleClass.tabletStyles);
      if (tabletCSS.length > 0) {
        tabletRules.push(`  ${selector} {`);
        tabletCSS.forEach(rule => tabletRules.push(`    ${rule}`));
        tabletRules.push('  }');
      }
    }
    
    // Tablet state styles
    if (styleClass.tabletStateStyles) {
      Object.entries(styleClass.tabletStateStyles).forEach(([state, styles]) => {
        if (state === 'none' || !styles || Object.keys(styles).length === 0) return;
        
        const stateSelector = state === 'hover' ? `${selector}:hover` :
                             state === 'focused' ? `${selector}:focus-visible` :
                             state === 'focus-visible' ? `${selector}:focus-visible` :
                             state === 'focus-within' ? `${selector}:focus-within` :
                             state === 'pressed' ? `${selector}:active` :
                             null;
        
        const stateCSS = styleObjectToCSS(styles);
        if (stateCSS.length > 0) {
          tabletRules.push(`  ${stateSelector} {`);
          stateCSS.forEach(rule => tabletRules.push(`    ${rule}`));
          tabletRules.push('  }');
        }
      });
    }
    
    // Mobile overrides
    if (styleClass.mobileStyles && Object.keys(styleClass.mobileStyles).length > 0) {
      const mobileCSS = styleObjectToCSS(styleClass.mobileStyles);
      if (mobileCSS.length > 0) {
        mobileRules.push(`  ${selector} {`);
        mobileCSS.forEach(rule => mobileRules.push(`    ${rule}`));
        mobileRules.push('  }');
      }
    }
    
    // Mobile state styles
    if (styleClass.mobileStateStyles) {
      Object.entries(styleClass.mobileStateStyles).forEach(([state, styles]) => {
        if (state === 'none' || !styles || Object.keys(styles).length === 0) return;
        
        const stateSelector = state === 'hover' ? `${selector}:hover` :
                             state === 'focused' ? `${selector}:focus-visible` :
                             state === 'focus-visible' ? `${selector}:focus-visible` :
                             state === 'focus-within' ? `${selector}:focus-within` :
                             state === 'pressed' ? `${selector}:active` :
                             null;
        
        const stateCSS = styleObjectToCSS(styles);
        if (stateCSS.length > 0) {
          mobileRules.push(`  ${stateSelector} {`);
          stateCSS.forEach(rule => mobileRules.push(`    ${rule}`));
          mobileRules.push('  }');
        }
      });
    }
  });
  
  // Add tablet media query block
  if (tabletRules.length > 0) {
    cssRules.push('');
    cssRules.push('/* Tablet breakpoint (max-width: 991px) */');
    cssRules.push('@media (max-width: 991px) {');
    cssRules.push(...tabletRules);
    cssRules.push('}');
  }
  
  // Add mobile media query block
  if (mobileRules.length > 0) {
    cssRules.push('');
    cssRules.push('/* Mobile breakpoint (max-width: 767px) */');
    cssRules.push('@media (max-width: 767px) {');
    cssRules.push(...mobileRules);
    cssRules.push('}');
  }
  
  return cssRules.join('\n');
}

/**
 * Flatten nested style structures into flat CSS properties
 */
function flattenStyles(styles: Record<string, any>): Record<string, any> {
  const flattened: Record<string, any> = {};
  if (!styles) return flattened;
  
  Object.entries(styles).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    
    if (key === 'typography' && typeof value === 'object') {
      Object.assign(flattened, value);
    } else if (key === 'background' && typeof value === 'object') {
      if (value.color) flattened.backgroundColor = value.color;
      if (value.gradient) flattened.backgroundImage = value.gradient;
      if (value.image) flattened.backgroundImage = value.image;
      if (value.size) flattened.backgroundSize = value.size;
      if (value.position) flattened.backgroundPosition = value.position;
      if (value.repeat) flattened.backgroundRepeat = value.repeat;
    } else if (key === 'spacing' && typeof value === 'object') {
      if (value.padding !== undefined) {
        if (typeof value.padding === 'object') {
          Object.entries(value.padding).forEach(([side, val]) => {
            flattened[`padding${side.charAt(0).toUpperCase() + side.slice(1)}`] = val;
          });
        } else {
          flattened.padding = value.padding;
        }
      }
      if (value.margin !== undefined) {
        if (typeof value.margin === 'object') {
          Object.entries(value.margin).forEach(([side, val]) => {
            flattened[`margin${side.charAt(0).toUpperCase() + side.slice(1)}`] = val;
          });
        } else {
          flattened.margin = value.margin;
        }
      }
      if (value.gap !== undefined) flattened.gap = value.gap;
    } else if (key === 'sizing' && typeof value === 'object') {
      Object.assign(flattened, value);
    } else if (key === 'layout' && typeof value === 'object') {
      Object.assign(flattened, value);
    } else if (key === 'border' && typeof value === 'object') {
      if (value.width) flattened.borderWidth = value.width;
      if (value.style) flattened.borderStyle = value.style;
      if (value.color) flattened.borderColor = value.color;
      if (value.radius) flattened.borderRadius = value.radius;
    } else if (key === 'effects' && typeof value === 'object') {
      if (value.boxShadow) flattened.boxShadow = value.boxShadow;
      if (value.opacity !== undefined) flattened.opacity = value.opacity;
      if (value.cursor) flattened.cursor = value.cursor;
    } else if (key === 'position' && typeof value === 'object') {
      Object.assign(flattened, value);
    } else {
      flattened[key] = value;
    }
  });
  
  return flattened;
}

/**
 * Convert a style object to CSS rules (for fallback styles.css)
 */
function styleObjectToCSS(styles: Record<string, any>): string[] {
  const rules: string[] = [];
  if (!styles) return rules;
  
  const flatStyles = flattenStyles(styles);
  
  const cssPropertyMap: Record<string, string> = {
    display: 'display', flexDirection: 'flex-direction', justifyContent: 'justify-content',
    alignItems: 'align-items', flexWrap: 'flex-wrap', gap: 'gap',
    gridTemplateColumns: 'grid-template-columns', gridTemplateRows: 'grid-template-rows',
    padding: 'padding', paddingTop: 'padding-top', paddingRight: 'padding-right',
    paddingBottom: 'padding-bottom', paddingLeft: 'padding-left',
    margin: 'margin', marginTop: 'margin-top', marginRight: 'margin-right',
    marginBottom: 'margin-bottom', marginLeft: 'margin-left',
    width: 'width', height: 'height', minWidth: 'min-width', maxWidth: 'max-width',
    minHeight: 'min-height', maxHeight: 'max-height',
    fontSize: 'font-size', fontWeight: 'font-weight', fontFamily: 'font-family',
    lineHeight: 'line-height', letterSpacing: 'letter-spacing',
    textAlign: 'text-align', textDecoration: 'text-decoration', textTransform: 'text-transform',
    color: 'color', backgroundColor: 'background-color', backgroundImage: 'background-image',
    backgroundSize: 'background-size', backgroundPosition: 'background-position',
    backgroundRepeat: 'background-repeat',
    border: 'border', borderWidth: 'border-width', borderStyle: 'border-style',
    borderColor: 'border-color', borderRadius: 'border-radius',
    borderTop: 'border-top', borderRight: 'border-right',
    borderBottom: 'border-bottom', borderLeft: 'border-left',
    boxShadow: 'box-shadow', opacity: 'opacity', overflow: 'overflow',
    overflowX: 'overflow-x', overflowY: 'overflow-y',
    position: 'position', top: 'top', right: 'right', bottom: 'bottom', left: 'left',
    zIndex: 'z-index', transform: 'transform', transition: 'transition', cursor: 'cursor',
  };
  
  Object.entries(flatStyles).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    
    const cssProperty = cssPropertyMap[key];
    if (cssProperty) {
      const cssValue = formatCSSValue(key, value);
      if (cssValue && cssValue.trim() !== '') {
        rules.push(`${cssProperty}: ${cssValue};`);
      }
    }
  });
  
  return rules;
}

/**
 * Format a value for CSS output
 */
function formatCSSValue(property: string, value: any): string {
  if (value === null || value === undefined || value === '') return '';
  
  if (typeof value === 'object' && value !== null) {
    if ('value' in value && 'unit' in value) {
      const numValue = value.value;
      const unit = value.unit || '';
      if (numValue === undefined || numValue === null || numValue === '') return '';
      if (typeof numValue === 'string') {
        const keywords = ['auto', 'none', 'inherit', 'initial', 'unset', 'fit-content', 'max-content', 'min-content'];
        if (keywords.includes(numValue)) return numValue;
        if (/\d+(%|px|em|rem|vh|vw|vmin|vmax|ch|ex)$/.test(numValue)) return numValue;
      }
      if (unit === 'auto' || unit === 'none' || unit === 'inherit' || unit === 'initial' || unit === 'unset') {
        return String(numValue);
      }
      return `${numValue}${unit}`;
    }
    if ('value' in value) return formatCSSValue(property, value.value);
    return '';
  }
  
  const needsPixels = [
    'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
    'gap', 'borderRadius', 'borderWidth', 'fontSize', 'letterSpacing',
    'top', 'right', 'bottom', 'left',
  ];
  
  if (typeof value === 'number') {
    if (needsPixels.includes(property)) return `${value}px`;
    return String(value);
  }
  
  return String(value);
}

// === HELPER FILE GENERATORS ===

function generateEnvExample(): string {
  return `# Database API Configuration
# Get your API key from the Rantir dashboard

# Required: Your read-only API key for fetching data
VITE_API_KEY=your_api_key_here

# Optional: Override the default API base URL
# VITE_API_BASE_URL=https://appdmmjexevclmpyvtss.supabase.co/functions/v1/database-api
`;
}

function generateFormattersFile(): string {
  return `/**
 * Formatter utilities for data display
 */

const numberFormatCache = new Map<string, Intl.NumberFormat>();
const dateFormatCache = new Map<string, Intl.DateTimeFormat>();

function getNumberFormatter(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = \`\${locale}:\${JSON.stringify(options)}\`;
  if (!numberFormatCache.has(key)) {
    numberFormatCache.set(key, new Intl.NumberFormat(locale, options));
  }
  return numberFormatCache.get(key)!;
}

function getDateFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = \`\${locale}:\${JSON.stringify(options)}\`;
  if (!dateFormatCache.has(key)) {
    dateFormatCache.set(key, new Intl.DateTimeFormat(locale, options));
  }
  return dateFormatCache.get(key)!;
}

export type FormatterType = 
  | 'none' | 'uppercase' | 'lowercase' | 'capitalize' | 'titlecase'
  | 'currency_usd' | 'currency_eur' | 'currency_gbp' | 'currency_auto'
  | 'decimal_0' | 'decimal_1' | 'decimal_2' | 'percentage'
  | 'date_short' | 'date_long' | 'date_relative' | 'time_short' | 'datetime';

export function formatValue(value: any, formatter: FormatterType | string): string {
  if (value === null || value === undefined) return '';
  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  const strValue = String(value);
  const dateValue = new Date(value);
  const isValidDate = !isNaN(dateValue.getTime());
  const isValidNumber = !isNaN(numValue);

  switch (formatter) {
    case 'uppercase': return strValue.toUpperCase();
    case 'lowercase': return strValue.toLowerCase();
    case 'capitalize': return strValue.charAt(0).toUpperCase() + strValue.slice(1).toLowerCase();
    case 'titlecase': return strValue.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    case 'currency_usd': return getNumberFormatter('en-US', { style: 'currency', currency: 'USD' }).format(isValidNumber ? numValue : 0);
    case 'currency_eur': return getNumberFormatter('de-DE', { style: 'currency', currency: 'EUR' }).format(isValidNumber ? numValue : 0);
    case 'currency_gbp': return getNumberFormatter('en-GB', { style: 'currency', currency: 'GBP' }).format(isValidNumber ? numValue : 0);
    case 'currency_auto': return getNumberFormatter('en-US', { style: 'currency', currency: 'USD' }).format(isValidNumber ? numValue : 0);
    case 'decimal_0': return getNumberFormatter('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(isValidNumber ? numValue : 0);
    case 'decimal_1': return getNumberFormatter('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(isValidNumber ? numValue : 0);
    case 'decimal_2': return getNumberFormatter('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(isValidNumber ? numValue : 0);
    case 'percentage': return getNumberFormatter('en-US', { style: 'percent' }).format(isValidNumber ? numValue / 100 : 0);
    case 'date_short': return isValidDate ? getDateFormatter('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }).format(dateValue) : strValue;
    case 'date_long': return isValidDate ? getDateFormatter('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(dateValue) : strValue;
    case 'date_relative': {
      if (!isValidDate) return strValue;
      const now = new Date();
      const diffMs = now.getTime() - dateValue.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return \`\${diffDays} days ago\`;
      if (diffDays < 30) return \`\${Math.floor(diffDays / 7)} weeks ago\`;
      if (diffDays < 365) return \`\${Math.floor(diffDays / 30)} months ago\`;
      return \`\${Math.floor(diffDays / 365)} years ago\`;
    }
    case 'time_short': return isValidDate ? getDateFormatter('en-US', { hour: 'numeric', minute: '2-digit' }).format(dateValue) : strValue;
    case 'datetime': return isValidDate ? dateValue.toLocaleString('en-US') : strValue;
    default: return strValue;
  }
}

export function replaceBindings(input: string, data: Record<string, any>): string {
  if (!input || typeof input !== 'string' || !data) return input || '';
  return input.replace(/\\{\\{([^}|]+)(?:\\|([^}]+))?\\}\\}/g, (match, field, formatter) => {
    const fieldName = field.trim();
    let value = data[fieldName];
    if (value === undefined) {
      const lowerField = fieldName.toLowerCase();
      const matchedKey = Object.keys(data).find(k => k.toLowerCase() === lowerField);
      if (matchedKey) value = data[matchedKey];
    }
    if (value === undefined) return match;
    if (formatter) return formatValue(value, formatter.trim() as FormatterType);
    return String(value);
  });
}

export function hasBindings(input: string): boolean {
  return /\\{\\{[^}]+\\}\\}/.test(input);
}
`;
}

function generateDataServiceFile(): string {
  return `/**
 * Data Service - Handles all database API calls
 */

const DEFAULT_API_BASE_URL = 'https://appdmmjexevclmpyvtss.supabase.co/functions/v1/database-api';

export interface DataServiceConfig {
  apiBaseUrl?: string;
  apiKey?: string;
}

export interface FetchTableOptions {
  tableId: string;
  filters?: Array<{ field: string; operator: string; value: any }>;
  sorting?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  pagination?: { page: number; pageSize: number };
  select?: string[];
}

export interface FetchTableResult<T = Record<string, any>> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  schema?: { fields: Array<{ id: string; name: string; type: string }> };
}

function getConfig(): DataServiceConfig {
  const windowConfig = (window as any).__RANTIR_APP_CONFIG__;
  if (windowConfig) {
    return {
      apiBaseUrl: windowConfig.apiBaseUrl || DEFAULT_API_BASE_URL,
      apiKey: windowConfig.apiKey,
    };
  }
  return {
    apiBaseUrl: import.meta.env?.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
    apiKey: import.meta.env?.VITE_API_KEY || '',
  };
}

export async function fetchTableData<T = Record<string, any>>(
  options: FetchTableOptions,
  config?: DataServiceConfig
): Promise<FetchTableResult<T>> {
  const { apiBaseUrl, apiKey } = config || getConfig();
  if (!apiKey) throw new Error('API key is required. Set VITE_API_KEY in your environment.');

  const { tableId, filters, sorting, pagination, select } = options;
  const params = new URLSearchParams();
  if (pagination) {
    params.set('page', String(pagination.page));
    params.set('pageSize', String(pagination.pageSize));
  }
  if (select?.length) params.set('select', select.join(','));
  if (filters?.length) params.set('filters', JSON.stringify(filters));
  if (sorting?.length) params.set('sorting', JSON.stringify(sorting));

  const url = apiBaseUrl + '/tables/' + tableId + '/records?' + params.toString();
  const response = await fetch(url, {
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch: ' + response.status);
  }

  const result = await response.json();
  return {
    data: result.data || result.records || [],
    total: result.total || 0,
    page: result.page || pagination?.page || 1,
    pageSize: result.pageSize || pagination?.pageSize || 10,
    hasMore: result.hasMore ?? false,
    schema: result.schema,
  };
}

export async function fetchRecord<T = Record<string, any>>(
  tableId: string,
  recordId: string,
  config?: DataServiceConfig
): Promise<T | null> {
  const { apiBaseUrl, apiKey } = config || getConfig();
  if (!apiKey) throw new Error('API key is required.');
  const url = apiBaseUrl + '/tables/' + tableId + '/records/' + recordId;
  const response = await fetch(url, {
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch record: ' + response.status);
  }
  return response.json();
}

export const dataService = { fetchTableData, fetchRecord, getConfig };
export default dataService;
`;
}

function generateUseTableDataFile(): string {
  return `/**
 * useTableData Hook - React hook for fetching table data
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchTableData, FetchTableOptions, FetchTableResult, DataServiceConfig } from '../lib/dataService';
import { formatValue, replaceBindings, FormatterType } from '../lib/formatters';

export interface UseTableDataOptions {
  tableId: string;
  filters?: FetchTableOptions['filters'];
  sorting?: FetchTableOptions['sorting'];
  pagination?: { page: number; pageSize: number };
  select?: string[];
  enabled?: boolean;
  config?: DataServiceConfig;
}

export interface UseTableDataResult<T = Record<string, any>> {
  data: T[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  schema: FetchTableResult['schema'];
  refetch: () => Promise<void>;
  setPage: (page: number) => void;
  formatValue: typeof formatValue;
  replaceBindings: (input: string, record: Record<string, any>) => string;
}

export function useTableData<T = Record<string, any>>(options: UseTableDataOptions): UseTableDataResult<T> {
  const { tableId, filters, sorting, pagination: initialPagination, select, enabled = true, config } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPagination?.page || 1);
  const [pageSize] = useState(initialPagination?.pageSize || 10);
  const [hasMore, setHasMore] = useState(false);
  const [schema, setSchema] = useState<FetchTableResult['schema']>(undefined);

  const fetchData = useCallback(async () => {
    if (!enabled || !tableId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTableData<T>({ tableId, filters, sorting, pagination: { page, pageSize }, select }, config);
      setData(result.data);
      setTotal(result.total);
      setHasMore(result.hasMore);
      if (result.schema) setSchema(result.schema);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [tableId, filters, sorting, page, pageSize, select, enabled, config]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const helpers = useMemo(() => ({
    formatValue,
    replaceBindings: (input: string, record: Record<string, any>) => replaceBindings(input, record),
  }), []);

  return { data, loading, error, total, page, pageSize, hasMore, schema, refetch: fetchData, setPage, ...helpers };
}

export default useTableData;
`;
}
