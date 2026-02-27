/**
 * HTML Document Converter
 * Converts HTML files with embedded CSS to Webtir AppComponents
 */

import { AppComponent, ComponentType, ComponentStyle } from '@/types/appBuilder';
import { StyleClass } from '@/types/classes';
import { v4 as uuid } from 'uuid';
import { INHERITABLE_CSS_PROPERTIES } from '@/lib/parentStyleInheritance';

export interface HTMLConversionResult {
  components: AppComponent[];
  styleClasses: StyleClass[];
  cssVariables: Record<string, string>;
  bodyStyles: Record<string, any>;
  assets: HTMLAsset[];
  warnings: string[];
}

export interface HTMLAsset {
  url: string;
  alt?: string;
  type: 'image' | 'video' | 'file';
}

/**
 * Container types that should propagate inheritable styles to children
 */
const CONTAINER_TYPES = new Set(['div', 'section', 'container', 'header', 'footer', 'main', 'article', 'aside', 'nav']);

// HTML tag to Webtir component type mapping
const HTML_TAG_MAP: Record<string, ComponentType> = {
  'section': 'section',
  'div': 'div',
  'header': 'section', // header maps to section (header is not a Rantir component type)
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
  'audio': 'audio',
  'form': 'form',
  'input': 'input',
  'textarea': 'textarea',
  'select': 'select',
  'label': 'label',
  'ul': 'list',
  'ol': 'list',
  'li': 'div',
  'blockquote': 'blockquote',
  'hr': 'divider',
  'figure': 'div',
  'figcaption': 'text',
  'code': 'code',
  'pre': 'codeblock',
  'table': 'table',
  'iframe': 'code',
};

// Tags to skip/ignore
const SKIP_TAGS = new Set(['script', 'style', 'meta', 'link', 'title', 'head', 'html', 'noscript', 'template']);

/**
 * Tag-based and descendant CSS styles extracted from the document
 */
export interface CSSTagStyles {
  tagStyles: Map<string, Record<string, any>>;        // e.g. 'h1' -> { fontSize: '32px', ... }
  descendantStyles: Map<string, Record<string, any>>; // e.g. '.hero h1' -> { marginBottom: '32px', ... }
}

/**
 * Parse CSS text and extract class rules with FLAT style properties
 * 
 * IMPORTANT: This produces FLAT style objects (e.g., { fontSize: "16px", display: "flex" })
 * which are stored directly in class.styles. The class store and CSS generator
 * both support flat properties at the root level of styles.
 */
export function parseCSSToClasses(cssText: string): { classes: StyleClass[]; variables: Record<string, string>; tagStyles: CSSTagStyles } {
  const classes: StyleClass[] = [];
  const variables: Record<string, string> = {};
  const hoverStyles: Map<string, Record<string, any>> = new Map();
  const tagStyles: Map<string, Record<string, any>> = new Map();
  const descendantStyles: Map<string, Record<string, any>> = new Map();
  
  if (!cssText) return { classes, variables, tagStyles: { tagStyles, descendantStyles } };
  
  // Extract CSS variables from :root
  const rootMatch = cssText.match(/:root\s*\{([^}]+)\}/gi);
  if (rootMatch) {
    rootMatch.forEach(block => {
      const varsContent = block.match(/\{([^}]+)\}/)?.[1] || '';
      const varMatches = varsContent.matchAll(/--([^:]+):\s*([^;]+);?/g);
      for (const m of varMatches) {
        variables[`--${m[1].trim()}`] = m[2].trim();
      }
    });
  }

  // Remove @keyframes, @media, and :root blocks to avoid false matches
  const cleanedCSS = cssText
    .replace(/@keyframes\s+[^{]+\{[^}]*(?:\{[^}]*\}[^}]*)*\}/g, '')
    .replace(/@media\s*\([^)]*\)\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}/g, '')
    .replace(/:root\s*\{[^}]+\}/g, '')
    .replace(/\*\s*\{[^}]+\}/g, '');
  
  // Known HTML tags that can appear as selectors
  const HTML_TAGS = new Set(['h1','h2','h3','h4','h5','h6','p','span','a','div','section','header','footer','nav','main','article','aside','blockquote','ul','ol','li','img','button','input','textarea','select','label','form','table','strong','em','code','pre','hr','figure','figcaption']);
  
  // Parse ALL rules: class selectors, tag selectors, grouped selectors, descendant selectors
  // Match patterns like: selector { declarations }
  const ruleRegex = /([^{}@]+)\{([^}]+)\}/g;
  
  for (const match of cleanedCSS.matchAll(ruleRegex)) {
    const selectorGroup = match[1].trim();
    const declarations = match[2];
    
    // Skip pseudo-elements, attribute selectors, etc. that we can't handle
    if (selectorGroup.includes('::') || selectorGroup.includes('[')) continue;
    
    // Handle grouped selectors (e.g. "h1, h2, h3")
    const selectors = selectorGroup.split(',').map(s => s.trim()).filter(Boolean);
    
    for (const selector of selectors) {
      // Skip body selector (handled separately)
      if (selector === 'body') continue;
      
      // Detect pseudo-class (:hover, :focus, :active)
      const pseudoMatch = selector.match(/^(.+?):(hover|focus|active)$/);
      const baseSelector = pseudoMatch ? pseudoMatch[1].trim() : selector;
      const pseudoClass = pseudoMatch ? pseudoMatch[2] : null;
      
      // Determine selector type
      const parts = baseSelector.split(/\s+/).filter(Boolean);
      const isClassSelector = parts.length === 1 && parts[0].startsWith('.');
      const isTagSelector = parts.length === 1 && HTML_TAGS.has(parts[0]);
      const isDescendantSelector = parts.length >= 2;
      
      const flatStyles = parseDeclarationsToFlat(declarations, variables);
      
      if (isClassSelector) {
        const className = parts[0].slice(1); // Remove leading dot
        
        if (pseudoClass === 'hover') {
          const existing = hoverStyles.get(className) || {};
          hoverStyles.set(className, { ...existing, ...flatStyles });
        } else if (!pseudoClass) {
          const existingIndex = classes.findIndex(c => c.name === className);
          if (existingIndex >= 0) {
            classes[existingIndex].styles = { ...classes[existingIndex].styles, ...flatStyles };
          } else {
            classes.push({
              id: `html-import-${className}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: className,
              styles: flatStyles,
              stateStyles: { none: {}, hover: {}, pressed: {}, focused: {}, 'focus-visible': {}, 'focus-within': {} },
              appliedTo: [],
              inheritsFrom: [],
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }
      } else if (isTagSelector) {
        // Tag selector: h1, p, span, etc.
        const tag = parts[0];
        const existing = tagStyles.get(tag) || {};
        tagStyles.set(tag, { ...existing, ...flatStyles });
      } else if (isDescendantSelector) {
        // Descendant selector: .hero h1, .letter-content p, .philosophy blockquote
        const key = baseSelector;
        const existing = descendantStyles.get(key) || {};
        descendantStyles.set(key, { ...existing, ...flatStyles });
        
        if (pseudoClass === 'hover') {
          const hoverKey = `${key}:hover`;
          const existingHover = descendantStyles.get(hoverKey) || {};
          descendantStyles.set(hoverKey, { ...existingHover, ...flatStyles });
        }
      }
    }
  }
  
  // Merge hover styles into stateStyles
  for (const [className, hoverProps] of hoverStyles) {
    const classEntry = classes.find(c => c.name === className);
    if (classEntry) {
      classEntry.stateStyles.hover = { ...classEntry.stateStyles.hover, ...hoverProps };
    }
  }
  
  return { classes, variables, tagStyles: { tagStyles, descendantStyles } };
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
 * Parse CSS declarations into FLAT key-value pairs with CSS variable resolution
 * IMPORTANT: Filters out CSS default sizing values to keep classes clean
 */
function parseDeclarationsToFlat(declarations: string, cssVariables: Record<string, string> = {}): Record<string, any> {
  const styles: Record<string, any> = {};
  
  declarations.split(';').forEach(decl => {
    const trimmed = decl.trim();
    if (!trimmed) return;
    
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) return;
    
    const property = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();
    
    if (!property || !value) return;
    
    // Resolve CSS variables to actual values when possible
    value = resolveCSSVariables(value, cssVariables);
    
    // Convert CSS property to camelCase
    const jsProperty = property.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const parsedValue = parseCSSValue(value);
    
    // Skip sizing values that are CSS defaults - don't import these
    if (isSizingDefault(jsProperty, parsedValue)) {
      return;
    }
    
    // Handle shorthand properties
    if (jsProperty === 'margin' || jsProperty === 'padding') {
      expandSpacingShorthand(jsProperty, parsedValue, styles);
    } else if (jsProperty === 'border') {
      expandBorderShorthand(parsedValue, styles);
    } else if (jsProperty === 'borderRadius') {
      styles.borderRadius = parsedValue;
    } else if (jsProperty === 'background') {
      expandBackgroundShorthand(parsedValue, styles);
    } else {
      // All other properties including:
      // display, flexDirection, alignItems, justifyContent, gap, flexWrap, flex,
      // backgroundImage, backgroundSize, backgroundPosition, backgroundRepeat,
      // boxShadow, borderWidth, borderStyle, borderColor, borderTop/Right/Bottom/Left,
      // opacity, overflow, position, top, right, bottom, left, zIndex,
      // textAlign, textDecoration, textTransform, letterSpacing, lineHeight,
      // transition, transform, cursor, listStyle, etc.
      styles[jsProperty] = parsedValue;
    }
  });
  
  return styles;
}

/**
 * Resolve CSS variables like var(--color-orange) to actual values
 */
function resolveCSSVariables(value: string, cssVariables: Record<string, string>): string {
  return value.replace(/var\((--[^,)]+)(?:,\s*([^)]+))?\)/g, (_, varName, fallback) => {
    return cssVariables[varName] || fallback?.trim() || value;
  });
}

/**
 * Expand margin/padding shorthand into individual properties
 */
function expandSpacingShorthand(property: string, value: any, styles: Record<string, any>) {
  if (typeof value === 'string' && value.includes(' ')) {
    const parts = value.split(/\s+/).map(p => p.trim()).filter(Boolean);
    const prefix = property === 'margin' ? 'margin' : 'padding';
    
    if (parts.length === 1) {
      styles[`${prefix}Top`] = parts[0];
      styles[`${prefix}Right`] = parts[0];
      styles[`${prefix}Bottom`] = parts[0];
      styles[`${prefix}Left`] = parts[0];
    } else if (parts.length === 2) {
      styles[`${prefix}Top`] = parts[0];
      styles[`${prefix}Bottom`] = parts[0];
      styles[`${prefix}Right`] = parts[1];
      styles[`${prefix}Left`] = parts[1];
    } else if (parts.length === 3) {
      styles[`${prefix}Top`] = parts[0];
      styles[`${prefix}Right`] = parts[1];
      styles[`${prefix}Left`] = parts[1];
      styles[`${prefix}Bottom`] = parts[2];
    } else if (parts.length === 4) {
      styles[`${prefix}Top`] = parts[0];
      styles[`${prefix}Right`] = parts[1];
      styles[`${prefix}Bottom`] = parts[2];
      styles[`${prefix}Left`] = parts[3];
    }
  } else {
    // Single value or number - apply to the property directly
    styles[property] = value;
  }
}

/**
 * Expand border shorthand (e.g., "1px solid #333")
 */
function expandBorderShorthand(value: any, styles: Record<string, any>) {
  if (typeof value !== 'string') {
    styles.border = value;
    return;
  }
  
  const parts = value.split(/\s+/);
  if (parts.length >= 1) {
    const widthMatch = parts[0].match(/^(\d+)(px|em|rem)?$/);
    if (widthMatch) {
      styles.borderWidth = parts[0];
    }
  }
  if (parts.length >= 2) {
    const styleVal = parts[1];
    if (['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'none'].includes(styleVal)) {
      styles.borderStyle = styleVal;
    }
  }
  if (parts.length >= 3) {
    styles.borderColor = parts.slice(2).join(' ');
  }
}

/**
 * Expand background shorthand
 */
function expandBackgroundShorthand(value: any, styles: Record<string, any>) {
  if (typeof value !== 'string') {
    styles.background = value;
    return;
  }
  
  // Check for gradient
  if (value.includes('gradient') || value.includes('linear-') || value.includes('radial-')) {
    styles.backgroundImage = value;
    return;
  }
  
  // Check for url()
  if (value.includes('url(')) {
    styles.backgroundImage = value;
    return;
  }
  
  // Assume it's a color
  styles.backgroundColor = value;
}

/**
 * Parse CSS value
 */
function parseCSSValue(value: string): any {
  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  
  // Keep CSS variables as-is (already resolved above when possible)
  if (value.startsWith('var(')) {
    return value;
  }
  
  // Keep gradients as-is
  if (value.includes('gradient') || value.includes('url(')) {
    return value;
  }
  
  // Try to parse as number with unit
  const numMatch = value.match(/^(-?\d+(?:\.\d+)?)(px|em|rem|%|vh|vw|vmin|vmax|ch|ex|s|ms)?$/);
  if (numMatch) {
    const num = parseFloat(numMatch[1]);
    const unit = numMatch[2] || '';
    return unit ? `${num}${unit}` : num;
  }
  
  return value;
}

// NOTE: The old convertToComponentStyle, extractUrlFromCSS, parseSpacingValue, parseBoxShadow 
// functions are removed. We now use FLAT styles directly (e.g., { display: 'flex', gap: '24px' })
// which matches the class store's expected format.

/**
 * Extract inheritable properties (typography, color) from a styles object
 */
function extractInheritableProps(styles: Record<string, any>): Record<string, any> {
  const inheritable: Record<string, any> = {};
  for (const [key, value] of Object.entries(styles)) {
    if (INHERITABLE_CSS_PROPERTIES.has(key) && value !== undefined && value !== null && value !== '') {
      inheritable[key] = value;
    }
  }
  return inheritable;
}

/**
 * Get the CSS classes of an element's parent chain for descendant selector matching
 */
function getParentClasses(element: Element): string[] {
  const classes: string[] = [];
  let parent = element.parentElement;
  while (parent) {
    const cls = parent.getAttribute('class');
    if (cls) {
      classes.push(...cls.split(/\s+/).filter(Boolean));
    }
    parent = parent.parentElement;
  }
  return classes;
}

/**
 * Match descendant selectors against a given element's context
 * Returns merged styles from all matching descendant selectors
 */
function matchDescendantStyles(
  element: Element,
  tagName: string,
  cssTagStyles: CSSTagStyles
): Record<string, any> {
  const matched: Record<string, any> = {};
  const parentClasses = getParentClasses(element);
  
  for (const [selector, styles] of cssTagStyles.descendantStyles) {
    // Skip hover variants
    if (selector.includes(':hover')) continue;
    
    const parts = selector.split(/\s+/).filter(Boolean);
    if (parts.length < 2) continue;
    
    const targetPart = parts[parts.length - 1];
    const ancestorParts = parts.slice(0, -1);
    
    // Check if target matches current element
    const targetTag = targetPart.startsWith('.') ? null : targetPart;
    const targetClass = targetPart.startsWith('.') ? targetPart.slice(1) : null;
    
    const elementClasses = (element.getAttribute('class') || '').split(/\s+/).filter(Boolean);
    
    const targetMatches = (targetTag && targetTag === tagName) || 
                          (targetClass && elementClasses.includes(targetClass));
    
    if (!targetMatches) continue;
    
    // Check if all ancestor parts match some parent
    const ancestorsMatch = ancestorParts.every(part => {
      if (part.startsWith('.')) {
        return parentClasses.includes(part.slice(1));
      }
      // Tag-based ancestor check
      let parent = element.parentElement;
      while (parent) {
        if (parent.tagName.toLowerCase() === part) return true;
        parent = parent.parentElement;
      }
      return false;
    });
    
    if (ancestorsMatch) {
      Object.assign(matched, styles);
    }
  }
  
  return matched;
}

/**
 * Convert HTML element to AppComponent
 * @param element The HTML element to convert
 * @param warnings Array to collect conversion warnings
 * @param assets Array to collect discovered assets
 * @param autoClasses Map to collect auto-generated classes for containers with inheritable styles
 * @param cssTagStyles Tag-based and descendant CSS styles to apply
 */
function convertElementToComponent(
  element: Element, 
  warnings: string[], 
  assets: HTMLAsset[],
  autoClasses: Map<string, Record<string, any>> = new Map(),
  cssTagStyles?: CSSTagStyles
): AppComponent | null {
  const tagName = element.tagName.toLowerCase();
  
  if (SKIP_TAGS.has(tagName)) return null;
  
  const componentType = HTML_TAG_MAP[tagName] || 'div';
  
  const component: AppComponent = {
    id: uuid(),
    type: componentType,
    props: {},
    style: {},
    classNames: [],
    children: []
  };
  
  // Preserve vid attribute as component vid prop (component ID in Data & Settings)
  // vid is NOT a style class — it's an element identifier
  const vidAttr = element.getAttribute('vid');
  if (vidAttr) {
    component.props.vid = vidAttr;
  }
  
  // Extract class names (these are the REAL style class names like "logo-strip", "hero", etc.)
  const classAttr = element.getAttribute('class');
  if (classAttr) {
    component.classNames = classAttr.split(/\s+/).filter(c => c.trim());
  }
  
  // Apply tag-based styles (e.g. h1 { fontSize: 32px })
  if (cssTagStyles?.tagStyles) {
    const tagStyleProps = cssTagStyles.tagStyles.get(tagName);
    if (tagStyleProps) {
      Object.assign(component.props, tagStyleProps);
    }
  }
  
  // Apply descendant-based styles (e.g. .hero h1 { marginBottom: 32px })
  if (cssTagStyles) {
    const descendantProps = matchDescendantStyles(element, tagName, cssTagStyles);
    if (Object.keys(descendantProps).length > 0) {
      Object.assign(component.props, descendantProps);
    }
  }
  
  // Extract inline styles as FLAT properties (these override tag/descendant styles)
  const styleAttr = element.getAttribute('style');
  let inlineStyles: Record<string, any> = {};
  if (styleAttr) {
    inlineStyles = parseDeclarationsToFlat(styleAttr);
    // Merge inline styles directly into props so they're applied to the component
    Object.assign(component.props, inlineStyles);
  }
  
  // For container types, if they have inheritable typography styles, 
  // create an auto-class so these styles can cascade to children
  const isContainer = CONTAINER_TYPES.has(tagName);
  if (isContainer) {
    const inheritableFromInline = extractInheritableProps(inlineStyles);
    if (Object.keys(inheritableFromInline).length > 0) {
      // Generate a semantic class name using the element's CSS class if available, otherwise tag name
      const baseName = (component.classNames && component.classNames.length > 0)
        ? component.classNames[0]
        : tagName;
      const autoClassName = `${baseName}-typography`;
      autoClasses.set(autoClassName, inheritableFromInline);
      
      // Add the auto-class to the component
      component.classNames = [...(component.classNames || []), autoClassName];
      component.props.appliedClasses = component.classNames;
    }
  }
  
  // Handle specific element types
  switch (tagName) {
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
      component.props.level = parseInt(tagName[1]);
      component.props.content = getTextContent(element);
      break;
      
    case 'p': case 'span':
      component.props.content = getTextContent(element);
      break;
      
    case 'a':
      component.props.href = element.getAttribute('href') || '#';
      component.props.target = element.getAttribute('target') || '_self';
      component.props.content = getTextContent(element);
      break;
      
    case 'img':
      const src = element.getAttribute('src');
      if (src) {
        component.props.src = src;
        assets.push({ url: src, alt: element.getAttribute('alt') || '', type: 'image' });
      }
      component.props.alt = element.getAttribute('alt') || '';
      break;
      
    case 'button':
      component.props.content = getTextContent(element);
      component.props.variant = 'default';
      break;
      
    case 'input':
      component.props.type = element.getAttribute('type') || 'text';
      component.props.placeholder = element.getAttribute('placeholder') || '';
      component.props.name = element.getAttribute('name') || '';
      break;
      
    case 'textarea':
      component.props.placeholder = element.getAttribute('placeholder') || '';
      component.props.name = element.getAttribute('name') || '';
      break;
      
    case 'video':
      const videoSrc = element.getAttribute('src') || element.querySelector('source')?.getAttribute('src');
      if (videoSrc) {
        component.props.src = videoSrc;
        assets.push({ url: videoSrc, type: 'video' });
      }
      component.props.controls = element.hasAttribute('controls');
      component.props.autoPlay = element.hasAttribute('autoplay');
      break;
      
    case 'iframe':
      component.props.content = element.outerHTML;
      component.props.language = 'html';
      break;
      
    case 'pre': case 'code':
      component.props.content = element.textContent || '';
      component.props.language = 'plaintext';
      break;
  }
  
  // Process children - pass autoClasses map to collect container typography classes
  const childElements = Array.from(element.children);
  for (const child of childElements) {
    const childComponent = convertElementToComponent(child as Element, warnings, assets, autoClasses, cssTagStyles);
    if (childComponent) {
      component.children!.push(childComponent);
    }
  }
  
  // If element has direct text content (not in child elements) and no content prop
  if (!component.props.content && component.children!.length === 0) {
    const textContent = getDirectTextContent(element);
    if (textContent) {
      if (componentType === 'div' || componentType === 'section' || componentType === 'container') {
        // Add as text child
        component.children!.push({
          id: uuid(),
          type: 'text',
          props: { content: textContent },
          style: {},
          classNames: []
        });
      } else {
        component.props.content = textContent;
      }
    }
  }
  
  // Clean up empty children array
  if (component.children && component.children.length === 0) {
    delete component.children;
  }
  
  return component;
}

/**
 * Get text content from element (recursive)
 */
function getTextContent(element: Element): string {
  return element.textContent?.trim() || '';
}

/**
 * Get direct text content (not from child elements)
 */
function getDirectTextContent(element: Element): string {
  let text = '';
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || '';
    }
  }
  return text.trim();
}

/**
 * Extract body styles from CSS text
 * Parses `body { ... }` rules and returns flat style properties
 */
function extractBodyStyles(cssText: string, cssVariables: Record<string, string>): Record<string, any> {
  if (!cssText) return {};
  
  // Match body { ... } rule (case insensitive)
  const bodyMatch = cssText.match(/body\s*\{([^}]+)\}/i);
  if (!bodyMatch) return {};
  
  // Parse the body declarations into flat styles
  return parseDeclarationsToFlat(bodyMatch[1], cssVariables);
}

/**
 * Main HTML converter function
 */
export function convertHTMLToComponents(html: string): HTMLConversionResult {
  const warnings: string[] = [];
  const assets: HTMLAsset[] = [];
  
  // Create a DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Check for parsing errors
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    warnings.push('HTML parsing had errors: ' + parserError.textContent?.slice(0, 100));
  }
  
  // Extract CSS from style tags
  let allCSS = '';
  const styleTags = doc.querySelectorAll('style');
  styleTags.forEach(tag => {
    allCSS += tag.textContent + '\n';
  });
  
  // Parse CSS classes and variables
  const { classes: styleClasses, variables: cssVariables, tagStyles: cssTagStyles } = parseCSSToClasses(allCSS);
  
  // Extract body styles from CSS
  const bodyStyles = extractBodyStyles(allCSS, cssVariables);
  
  // Find the body or main content
  const body = doc.body;
  if (!body) {
    warnings.push('No body element found in HTML');
    return { components: [], styleClasses, cssVariables, bodyStyles: {}, assets, warnings };
  }
  
  // Map to collect auto-generated classes for containers with inheritable typography styles
  const autoClasses = new Map<string, Record<string, any>>();
  
  // Convert body children to components
  const components: AppComponent[] = [];
  const bodyChildren = Array.from(body.children);
  
  for (const child of bodyChildren) {
    const component = convertElementToComponent(child as Element, warnings, assets, autoClasses, cssTagStyles);
    if (component) {
      components.push(component);
    }
  }
  
  // Create StyleClasses from auto-generated typography classes
  const autoStyleClasses: StyleClass[] = [];
  for (const [className, styles] of autoClasses) {
    autoStyleClasses.push({
      id: `auto-typography-${className}-${Date.now()}`,
      name: className,
      styles: styles,
      stateStyles: { none: {}, hover: {}, pressed: {}, focused: {}, 'focus-visible': {}, 'focus-within': {} },
      appliedTo: [],
      inheritsFrom: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  // Merge all style classes
  const allStyleClasses = [...styleClasses, ...autoStyleClasses];
  
  // Add info about conversion
  if (allStyleClasses.length > 0) {
    warnings.push(`Extracted ${styleClasses.length} CSS classes`);
    if (autoStyleClasses.length > 0) {
      warnings.push(`Generated ${autoStyleClasses.length} auto-typography classes for containers`);
    }
  }
  if (Object.keys(cssVariables).length > 0) {
    warnings.push(`Found ${Object.keys(cssVariables).length} CSS variables`);
  }
  if (Object.keys(bodyStyles).length > 0) {
    warnings.push(`Extracted body styles: ${Object.keys(bodyStyles).join(', ')}`);
  }
  if (cssTagStyles.tagStyles.size > 0) {
    warnings.push(`Applied ${cssTagStyles.tagStyles.size} tag-based style rules (${Array.from(cssTagStyles.tagStyles.keys()).join(', ')})`);
  }
  if (cssTagStyles.descendantStyles.size > 0) {
    warnings.push(`Applied ${cssTagStyles.descendantStyles.size} descendant style rules`);
  }
  
  return {
    components,
    styleClasses: allStyleClasses,
    cssVariables,
    bodyStyles,
    assets,
    warnings
  };
}

/**
 * Get conversion stats
 */
export function getHTMLConversionStats(result: HTMLConversionResult): {
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
    warningCount: result.warnings.filter(w => !w.startsWith('Extracted') && !w.startsWith('Found')).length
  };
}
