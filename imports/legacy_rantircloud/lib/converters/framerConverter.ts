/**
 * Framer Paste Data Converter
 * Converts Framer clipboard data to Webtir AppComponents
 */

import { AppComponent, ComponentType, ComponentStyle } from '@/types/appBuilder';
import { StyleClass, PseudoState } from '@/types/classes';
import { FramerData, FramerNode } from '@/lib/clipboardParser';
import { v4 as uuid } from 'uuid';

export interface FramerConversionResult {
  components: AppComponent[];
  styleClasses: StyleClass[];
  bodyStyles: Record<string, any>;
  assets: FramerAsset[];
  warnings: string[];
}

export interface FramerAsset {
  url?: string;
  type: 'image' | 'video' | 'lottie';
  originalId?: string;
}

// Framer component type mapping
const FRAMER_TYPE_MAP: Record<string, ComponentType> = {
  'Frame': 'div',
  'Stack': 'div',
  'Text': 'text',
  'RichText': 'text',
  'Image': 'image',
  'Video': 'video',
  'Link': 'link',
  'Button': 'button',
  'Input': 'input',
  'Scroll': 'scroll-area',
  'Page': 'container',
  'ComponentContainer': 'div',
  'SVG': 'icon',
  'Lottie': 'div',
  'CodeComponent': 'codeblock',
  'Navigation': 'navigation',
  'AnimatedNumber': 'text',
};

/**
 * Convert Framer style object to Webtir ComponentStyle - Enhanced with grid
 */
function convertFramerStyle(style: Record<string, any> | undefined): ComponentStyle {
  if (!style) return {};
  
  const result: ComponentStyle = {};
  
  // Layout properties - Enhanced flex & grid
  if (style.display || style.flexDirection || style.justifyContent || 
      style.alignItems || style.gap || style.gridTemplateColumns || style.gridTemplateRows ||
      style.flexWrap || style.alignContent) {
    result.layout = {} as any;
    
    if (style.display) {
      result.layout.display = style.display === 'grid' ? 'grid' : 
        style.display === 'flex' || style.display === 'inline-flex' ? 'flex' : 
        style.display === 'inline-grid' ? 'grid' : 'block';
    }
    
    if (style.flexDirection) {
      result.layout.flexDirection = style.flexDirection === 'column' || 
        style.flexDirection === 'column-reverse' ? 'column' : 'row';
    }
    
    if (style.flexWrap) {
      (result.layout as any).flexWrap = style.flexWrap;
    }
    
    if (style.justifyContent) {
      const justifyMap: Record<string, 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'> = {
        'flex-start': 'start',
        'flex-end': 'end',
        'center': 'center',
        'space-between': 'between',
        'space-around': 'around',
        'space-evenly': 'evenly'
      };
      result.layout.justifyContent = justifyMap[style.justifyContent] || 'start';
    }
    
    if (style.alignItems) {
      const alignMap: Record<string, 'start' | 'center' | 'end' | 'stretch'> = {
        'flex-start': 'start',
        'flex-end': 'end',
        'center': 'center',
        'stretch': 'stretch'
      };
      result.layout.alignItems = alignMap[style.alignItems] || 'start';
    }
    
    if (style.alignContent) {
      (result.layout as any).alignContent = style.alignContent;
    }
    
    if (style.gap) {
      result.layout.gap = typeof style.gap === 'number' ? style.gap : parseInt(style.gap) || 0;
    }
    
    if (style.rowGap) {
      (result.layout as any).rowGap = typeof style.rowGap === 'number' ? style.rowGap : parseInt(style.rowGap) || 0;
    }
    
    if (style.columnGap) {
      (result.layout as any).columnGap = typeof style.columnGap === 'number' ? style.columnGap : parseInt(style.columnGap) || 0;
    }
    
    // Grid properties
    if (style.gridTemplateColumns) {
      (result.layout as any).gridTemplateColumns = style.gridTemplateColumns;
      const cols = String(style.gridTemplateColumns).split(' ').filter((s: string) => s.trim()).length;
      result.layout.gridCols = cols;
    }
    
    if (style.gridTemplateRows) {
      (result.layout as any).gridTemplateRows = style.gridTemplateRows;
      const rows = String(style.gridTemplateRows).split(' ').filter((s: string) => s.trim()).length;
      result.layout.gridRows = rows;
    }
    
    if (style.gridAutoFlow) (result.layout as any).gridAutoFlow = style.gridAutoFlow;
    if (style.gridAutoColumns) (result.layout as any).gridAutoColumns = style.gridAutoColumns;
    if (style.gridAutoRows) (result.layout as any).gridAutoRows = style.gridAutoRows;
    if (style.gridArea) (result.layout as any).gridArea = style.gridArea;
    if (style.gridColumn) (result.layout as any).gridColumn = style.gridColumn;
    if (style.gridRow) (result.layout as any).gridRow = style.gridRow;
  }
  
  // Flex child properties
  if (style.flexGrow !== undefined || style.flexShrink !== undefined || 
      style.flexBasis !== undefined || style.alignSelf || style.order !== undefined) {
    if (!result.layout) result.layout = {} as any;
    if (style.flexGrow !== undefined) (result.layout as any).flexGrow = style.flexGrow;
    if (style.flexShrink !== undefined) (result.layout as any).flexShrink = style.flexShrink;
    if (style.flexBasis !== undefined) (result.layout as any).flexBasis = style.flexBasis;
    if (style.alignSelf) (result.layout as any).alignSelf = style.alignSelf;
    if (style.order !== undefined) (result.layout as any).order = style.order;
  }
  
  // Sizing properties
  if (style.width || style.height || style.maxWidth || style.maxHeight ||
      style.minWidth || style.minHeight) {
    result.sizing = {};
    if (style.width) result.sizing.width = formatSize(style.width);
    if (style.height) result.sizing.height = formatSize(style.height);
    if (style.maxWidth) result.sizing.maxWidth = formatSize(style.maxWidth);
    if (style.maxHeight) result.sizing.maxHeight = formatSize(style.maxHeight);
    if (style.minWidth) result.sizing.minWidth = formatSize(style.minWidth);
    if (style.minHeight) result.sizing.minHeight = formatSize(style.minHeight);
  }
  
  // Spacing properties
  if (style.padding || style.paddingTop || style.paddingRight || 
      style.paddingBottom || style.paddingLeft || style.margin ||
      style.marginTop || style.marginRight || style.marginBottom || style.marginLeft) {
    result.spacing = {};
    
    if (style.padding) {
      result.spacing.padding = parseSpacing(style.padding);
    } else if (style.paddingTop || style.paddingRight || style.paddingBottom || style.paddingLeft) {
      result.spacing.padding = {
        top: parseSpacing(style.paddingTop),
        right: parseSpacing(style.paddingRight),
        bottom: parseSpacing(style.paddingBottom),
        left: parseSpacing(style.paddingLeft)
      };
    }
    
    if (style.margin) {
      result.spacing.margin = parseSpacing(style.margin);
    } else if (style.marginTop || style.marginRight || style.marginBottom || style.marginLeft) {
      result.spacing.margin = {
        top: parseSpacing(style.marginTop),
        right: parseSpacing(style.marginRight),
        bottom: parseSpacing(style.marginBottom),
        left: parseSpacing(style.marginLeft)
      };
    }
  }
  
  // Typography properties
  if (style.fontSize || style.fontWeight || style.fontFamily ||
      style.textAlign || style.color || style.lineHeight) {
    result.typography = {};
    if (style.fontSize) result.typography.fontSize = String(formatSize(style.fontSize));
    if (style.fontWeight) result.typography.fontWeight = String(style.fontWeight);
    if (style.textAlign) result.typography.textAlign = style.textAlign;
    if (style.color) result.typography.color = style.color;
    if (style.lineHeight) result.typography.lineHeight = String(formatSize(style.lineHeight));
  }
  
  // Background properties - Enhanced with gradient and image support
  if (style.backgroundColor || style.background || style.backgroundImage ||
      style.backgroundGradient || style.backgroundSize || style.backgroundPosition) {
    result.background = {};
    
    // Solid color
    if (style.backgroundColor) result.background.color = style.backgroundColor;
    
    // Background shorthand (may contain gradient or image)
    if (style.background) {
      const bgValue = String(style.background);
      if (bgValue.includes('gradient') || bgValue.includes('linear-') || bgValue.includes('radial-')) {
        result.background.gradient = bgValue;
      } else if (bgValue.includes('url(')) {
        result.background.image = extractUrlFromCSS(bgValue);
      } else if (bgValue !== 'none' && bgValue !== 'transparent') {
        result.background.color = bgValue;
      }
    }
    
    // Explicit gradient
    if (style.backgroundGradient) {
      result.background.gradient = style.backgroundGradient;
    }
    
    // Background image
    if (style.backgroundImage) {
      const imgValue = String(style.backgroundImage);
      if (imgValue.includes('gradient') || imgValue.includes('linear-') || imgValue.includes('radial-')) {
        result.background.gradient = imgValue;
      } else if (imgValue.includes('url(')) {
        result.background.image = extractUrlFromCSS(imgValue);
      } else if (imgValue !== 'none') {
        result.background.image = imgValue;
      }
    }
    
    // Background sizing
    if (style.backgroundSize) result.background.size = style.backgroundSize;
    if (style.backgroundPosition) result.background.position = style.backgroundPosition;
    if (style.backgroundRepeat) result.background.repeat = style.backgroundRepeat;
  }
  
  // Border properties
  if (style.borderWidth || style.borderStyle || style.borderColor || 
      style.borderRadius || style.border) {
    result.border = {};
    if (style.borderWidth) result.border.width = parseSpacing(style.borderWidth);
    if (style.borderStyle) result.border.style = style.borderStyle;
    if (style.borderColor) result.border.color = style.borderColor;
    if (style.borderRadius) result.border.radius = parseSpacing(style.borderRadius);
    
    // Parse shorthand border
    if (style.border && typeof style.border === 'string') {
      const parts = style.border.split(' ');
      if (parts.length >= 3) {
        result.border.width = parseInt(parts[0]) || 1;
        result.border.style = parts[1] as any;
        result.border.color = parts.slice(2).join(' ');
      }
    }
  }
  
  // Shadow properties
  if (style.boxShadow) {
    result.shadow = parseBoxShadow(style.boxShadow);
  }
  
  return result;
}

/**
 * Format size value
 */
function formatSize(value: any): string | number {
  if (typeof value === 'number') return `${value}px`;
  if (typeof value === 'string') return value;
  return 'auto';
}

/**
 * Parse spacing value
 */
function parseSpacing(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  return parseInt(String(value)) || 0;
}

/**
 * Parse box shadow string
 */
function parseBoxShadow(shadow: string): ComponentStyle['shadow'] {
  const match = shadow.match(/(-?\d+)px\s+(-?\d+)px\s+(-?\d+)px(?:\s+(-?\d+)px)?\s+(.*)/);
  if (match) {
    return {
      x: parseInt(match[1]) || 0,
      y: parseInt(match[2]) || 0,
      blur: parseInt(match[3]) || 0,
      spread: match[4] ? parseInt(match[4]) : 0,
      color: match[5] || 'rgba(0,0,0,0.1)'
    };
  }
  return { blur: 4, spread: 0, color: 'rgba(0,0,0,0.1)', x: 0, y: 2 };
}

/**
 * Generate semantic class name from Framer node
 */
function generateClassName(node: FramerNode, index: number): string {
  if (node.name) {
    return node.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 50) || `frame-${index + 1}`;
  }
  return `frame-${index + 1}`;
}

/**
 * Extract URL from CSS url() function
 */
function extractUrlFromCSS(value: string): string {
  const match = value.match(/url\(['"]?([^'"]+)['"]?\)/);
  return match ? match[1] : value;
}

/**
 * Determine component type from Framer node - Enhanced with SVG/code detection
 */
function determineComponentType(node: FramerNode): ComponentType {
  const nodeAny = node as any;
  
  // Check componentType first
  if (node.componentType && FRAMER_TYPE_MAP[node.componentType]) {
    // Special handling for code components and SVGs
    if (node.componentType === 'CodeComponent' || node.componentType === 'SVG') {
      return 'codeblock';
    }
    return FRAMER_TYPE_MAP[node.componentType];
  }
  
  // Check for SVG or code content
  if (nodeAny.svg || nodeAny.code || nodeAny.html) {
    return 'codeblock';
  }
  
  // Infer from name
  const nameLower = node.name?.toLowerCase() || '';
  
  if (nameLower.includes('button') || nameLower.includes('btn')) {
    return 'button';
  } else if (nameLower.includes('heading') || nameLower.includes('title') || nameLower.match(/^h[1-6]/)) {
    return 'heading';
  } else if (nameLower.includes('text') || nameLower.includes('paragraph')) {
    return 'text';
  } else if (nameLower.includes('image') || nameLower.includes('img')) {
    return 'image';
  } else if (nameLower.includes('card')) {
    return 'card';
  } else if (nameLower.includes('header')) {
    return 'header';
  } else if (nameLower.includes('footer')) {
    return 'footer';
  } else if (nameLower.includes('nav')) {
    return 'navigation';
  } else if (nameLower.includes('section')) {
    return 'section';
  } else if (nameLower.includes('container')) {
    return 'container';
  } else if (nameLower.includes('input') || nameLower.includes('field')) {
    return 'input';
  } else if (nameLower.includes('link')) {
    return 'link';
  } else if (nameLower.includes('grid')) {
    return 'grid';
  } else if (nameLower.includes('svg') || nameLower.includes('icon')) {
    return 'icon';
  } else if (nameLower.includes('embed') || nameLower.includes('code')) {
    return 'codeblock';
  }
  
  // Check for Stack layout
  if (node.props?.direction) {
    return 'div'; // Stack component with flex
  }
  
  // Check for grid layout in props
  if (nodeAny.props?.columns || nodeAny.props?.rows || 
      nodeAny.style?.gridTemplateColumns || nodeAny.style?.gridTemplateRows) {
    return 'grid';
  }
  
  return 'div';
}

/**
 * Convert a single Framer node to AppComponent
 */
function convertNode(
  node: FramerNode,
  index: number,
  warnings: string[],
  assets: FramerAsset[]
): AppComponent {
  const componentType = determineComponentType(node);
  const className = generateClassName(node, index);
  const componentId = uuid();
  
  // Build props
  const props: Record<string, any> = {};
  
  // Handle text content
  if (node.props?.text) {
    props.text = node.props.text;
    props.content = node.props.text;
  }
  
  // Handle heading level
  if (componentType === 'heading') {
    const nameLower = node.name?.toLowerCase() || '';
    const levelMatch = nameLower.match(/h(\d)/);
    props.level = levelMatch ? parseInt(levelMatch[1]) : 2;
  }
  
  // Handle image
  if (node.props?.src || node.props?.image) {
    props.src = node.props.src || node.props.image;
    props.alt = node.props.alt || '';
    if (props.src) {
      assets.push({ url: props.src, type: 'image' });
    }
  }
  
  // Handle link
  if (node.props?.link || node.props?.href) {
    props.href = node.props.link || node.props.href || '#';
    props.target = node.props.openInNewTab ? '_blank' : '_self';
  }
  
  // Copy other props
  const propsToSkip = ['style', 'children', 'text', 'src', 'image', 'link', 'href', 'alt'];
  if (node.props) {
    Object.entries(node.props).forEach(([key, value]) => {
      if (!propsToSkip.includes(key) && value !== undefined) {
        props[key] = value;
      }
    });
  }
  
  // Convert style
  let style = convertFramerStyle(node.style);
  
  // Also check props for style-like properties
  if (node.props) {
    const propsStyle = convertFramerStyle(node.props as any);
    style = { ...style, ...propsStyle };
  }
  
  // Handle Stack direction
  if (node.props?.direction) {
    if (!style.layout) style.layout = {};
    style.layout.display = 'flex';
    style.layout.flexDirection = node.props.direction === 'vertical' ? 'column' : 'row';
    
    if (node.props.gap) {
      style.layout.gap = typeof node.props.gap === 'number' ? node.props.gap : parseInt(node.props.gap) || 0;
    }
    
    if (node.props.alignment) {
      const alignMap: Record<string, 'start' | 'center' | 'end' | 'stretch'> = {
        'start': 'start',
        'center': 'center',
        'end': 'end',
        'stretch': 'stretch'
      };
      style.layout.alignItems = alignMap[node.props.alignment] || 'start';
    }
    
    if (node.props.distribution) {
      const distMap: Record<string, 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'> = {
        'start': 'start',
        'center': 'center',
        'end': 'end',
        'space-between': 'between',
        'space-around': 'around',
        'space-evenly': 'evenly'
      };
      style.layout.justifyContent = distMap[node.props.distribution] || 'start';
    }
  }
  
  // Convert children
  const children: AppComponent[] = [];
  if (node.children && node.children.length > 0) {
    node.children.forEach((child, childIndex) => {
      children.push(convertNode(child, childIndex, warnings, assets));
    });
  }
  
  return {
    id: componentId,
    type: componentType,
    props,
    style,
    classNames: [className],
    children: children.length > 0 ? children : undefined
  };
}

/**
 * Extract StyleClass entries from components
 */
function extractStyleClasses(components: AppComponent[]): StyleClass[] {
  const styleClasses: StyleClass[] = [];
  const processedNames = new Set<string>();
  
  const processComponent = (comp: AppComponent) => {
    if (comp.classNames && comp.classNames.length > 0) {
      const className = comp.classNames[0];
      if (!processedNames.has(className)) {
        processedNames.add(className);
        
        // Flatten style for class
        const flatStyles: Record<string, any> = {};
        
        if (comp.style?.layout) Object.assign(flatStyles, comp.style.layout);
        if (comp.style?.sizing) Object.assign(flatStyles, comp.style.sizing);
        if (comp.style?.typography) Object.assign(flatStyles, comp.style.typography);
        if (comp.style?.background) Object.assign(flatStyles, comp.style.background);
        if (comp.style?.border) Object.assign(flatStyles, comp.style.border);
        if (comp.style?.shadow) Object.assign(flatStyles, comp.style.shadow);
        
        if (comp.style?.spacing?.padding) {
          if (typeof comp.style.spacing.padding === 'object') {
            flatStyles.paddingTop = comp.style.spacing.padding.top;
            flatStyles.paddingRight = comp.style.spacing.padding.right;
            flatStyles.paddingBottom = comp.style.spacing.padding.bottom;
            flatStyles.paddingLeft = comp.style.spacing.padding.left;
          } else {
            flatStyles.padding = comp.style.spacing.padding;
          }
        }
        
        styleClasses.push({
          id: uuid(),
          name: className,
          styles: flatStyles,
          stateStyles: {
            'none': {},
            'hover': {},
            'pressed': {},
            'focused': {},
            'focus-visible': {},
            'focus-within': {}
          },
          appliedTo: [comp.id],
          inheritsFrom: [],
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    comp.children?.forEach(processComponent);
  };
  
  components.forEach(processComponent);
  return styleClasses;
}

/**
 * Extract page-level styles from Framer data
 * Framer pages may have background and other page-level properties
 */
function extractFramerBodyStyles(data: FramerData): Record<string, any> {
  const bodyStyles: Record<string, any> = {};
  
  // Check for page-level properties
  const dataAny = data as any;
  if (dataAny.backgroundColor) {
    bodyStyles.backgroundColor = dataAny.backgroundColor;
  }
  if (dataAny.color) {
    bodyStyles.color = dataAny.color;
  }
  
  // Check the root node for page-like styling
  if (data.nodes && data.nodes.length > 0) {
    const rootNode = data.nodes[0];
    if (rootNode.style) {
      if (rootNode.style.backgroundColor) {
        bodyStyles.backgroundColor = rootNode.style.backgroundColor;
      }
      if (rootNode.style.color) {
        bodyStyles.color = rootNode.style.color;
      }
    }
  }
  
  return bodyStyles;
}

/**
 * Main conversion function - converts Framer paste data to Webtir components
 */
export function convertFramerToComponents(data: FramerData): FramerConversionResult {
  const warnings: string[] = [];
  const assets: FramerAsset[] = [];
  
  if (!data?.nodes || data.nodes.length === 0) {
    return {
      components: [],
      styleClasses: [],
      bodyStyles: {},
      assets: [],
      warnings: ['Invalid Framer data: no nodes found']
    };
  }
  
  // Extract page-level styles
  const bodyStyles = extractFramerBodyStyles(data);
  
  // Convert all root nodes
  const components = data.nodes.map((node, index) => 
    convertNode(node, index, warnings, assets)
  );
  
  // Extract style classes
  const styleClasses = extractStyleClasses(components);
  
  if (Object.keys(bodyStyles).length > 0) {
    warnings.push(`Extracted page styles: ${Object.keys(bodyStyles).join(', ')}`);
  }
  
  return {
    components,
    styleClasses,
    bodyStyles,
    assets,
    warnings
  };
}

/**
 * Get conversion statistics
 */
export function getFramerConversionStats(result: FramerConversionResult): {
  totalComponents: number;
  totalStyles: number;
  totalAssets: number;
  warningCount: number;
} {
  const countComponents = (comps: AppComponent[]): number => {
    return comps.reduce((acc, c) => {
      return acc + 1 + (c.children ? countComponents(c.children) : 0);
    }, 0);
  };
  
  return {
    totalComponents: countComponents(result.components),
    totalStyles: result.styleClasses.length,
    totalAssets: result.assets.length,
    warningCount: result.warnings.length
  };
}
