/**
 * Figma Paste Data Converter
 * Converts Figma clipboard data to Webtir AppComponents
 */

import { AppComponent, ComponentType, ComponentStyle } from '@/types/appBuilder';
import { StyleClass, PseudoState } from '@/types/classes';
import { FigmaData, FigmaNode } from '@/lib/clipboardParser';
import { v4 as uuid } from 'uuid';

export interface FigmaConversionResult {
  components: AppComponent[];
  styleClasses: StyleClass[];
  bodyStyles: Record<string, any>;
  assets: FigmaAsset[];
  warnings: string[];
}

export interface FigmaAsset {
  url?: string;
  type: 'image' | 'vector' | 'gradient';
  fill?: any;
  originalId?: string;
}

// Figma node type to Webtir component type mapping
const FIGMA_TYPE_MAP: Record<string, ComponentType> = {
  'FRAME': 'div',
  'GROUP': 'div',
  'COMPONENT': 'div',
  'COMPONENT_SET': 'div',
  'INSTANCE': 'div',
  'RECTANGLE': 'div',
  'ELLIPSE': 'div',
  'POLYGON': 'div',
  'STAR': 'div',
  'LINE': 'divider',
  'VECTOR': 'icon',
  'TEXT': 'text',
  'BOOLEAN_OPERATION': 'div',
  'SLICE': 'div',
  'SECTION': 'section',
};

/**
 * Convert Figma color to CSS
 */
function figmaColorToCSS(color: { r: number; g: number; b: number; a?: number }): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = color.a ?? 1;
  
  if (a === 1) {
    return `rgb(${r}, ${g}, ${b})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

/**
 * Convert Figma gradient to CSS
 */
function figmaGradientToCSS(gradient: any): string {
  if (!gradient.gradientStops || !gradient.gradientHandlePositions) {
    return '';
  }
  
  const stops = gradient.gradientStops.map((stop: any) => {
    const color = figmaColorToCSS(stop.color);
    const position = Math.round(stop.position * 100);
    return `${color} ${position}%`;
  }).join(', ');
  
  // Determine angle from handle positions
  const handles = gradient.gradientHandlePositions;
  if (handles.length >= 2) {
    const dx = handles[1].x - handles[0].x;
    const dy = handles[1].y - handles[0].y;
    const angle = Math.round(Math.atan2(dy, dx) * 180 / Math.PI + 90);
    return `linear-gradient(${angle}deg, ${stops})`;
  }
  
  return `linear-gradient(180deg, ${stops})`;
}

/**
 * Convert Figma fills to CSS background - Enhanced with gradient and image support
 */
function convertFills(fills: any[], assets: FigmaAsset[]): { 
  color?: string; 
  gradient?: string; 
  image?: string;
  size?: string;
  position?: string;
} {
  const result: { color?: string; gradient?: string; image?: string; size?: string; position?: string } = {};
  
  if (!fills || fills.length === 0) return result;
  
  // Collect all gradient layers for potential stacking
  const gradients: string[] = [];
  
  // Process fills (last visible fill wins for color)
  for (const fill of fills) {
    if (!fill.visible && fill.visible !== undefined) continue;
    
    switch (fill.type) {
      case 'SOLID':
        result.color = figmaColorToCSS(fill.color);
        break;
      case 'GRADIENT_LINEAR':
        gradients.push(figmaGradientToCSS(fill));
        assets.push({ type: 'gradient', fill });
        break;
      case 'GRADIENT_RADIAL':
        gradients.push(figmaRadialGradientToCSS(fill));
        assets.push({ type: 'gradient', fill });
        break;
      case 'GRADIENT_ANGULAR':
      case 'GRADIENT_DIAMOND':
        // Convert to linear as fallback
        gradients.push(figmaGradientToCSS(fill));
        assets.push({ type: 'gradient', fill });
        break;
      case 'IMAGE':
        if (fill.imageRef) {
          result.image = `figma://image/${fill.imageRef}`;
          assets.push({ type: 'image', originalId: fill.imageRef, url: result.image });
        }
        // Handle image scaling mode
        if (fill.scaleMode) {
          const scaleModeMap: Record<string, string> = {
            'FILL': 'cover',
            'FIT': 'contain',
            'CROP': 'cover',
            'TILE': 'auto'
          };
          result.size = scaleModeMap[fill.scaleMode] || 'cover';
          result.position = 'center';
        }
        break;
    }
  }
  
  // If we have gradients, combine them
  if (gradients.length > 0) {
    result.gradient = gradients.join(', ');
  }
  
  return result;
}

/**
 * Convert Figma radial gradient to CSS
 */
function figmaRadialGradientToCSS(gradient: any): string {
  if (!gradient.gradientStops) {
    return '';
  }
  
  const stops = gradient.gradientStops.map((stop: any) => {
    const color = figmaColorToCSS(stop.color);
    const position = Math.round(stop.position * 100);
    return `${color} ${position}%`;
  }).join(', ');
  
  return `radial-gradient(circle, ${stops})`;
}

/**
 * Convert Figma effects to CSS
 */
function convertEffects(effects: any[]): { shadow?: ComponentStyle['shadow'] } {
  const result: { shadow?: ComponentStyle['shadow'] } = {};
  
  if (!effects || effects.length === 0) return result;
  
  // Find first visible drop shadow
  const shadow = effects.find(e => e.type === 'DROP_SHADOW' && e.visible !== false);
  if (shadow) {
    result.shadow = {
      x: Math.round(shadow.offset?.x || 0),
      y: Math.round(shadow.offset?.y || 0),
      blur: Math.round(shadow.radius || 0),
      spread: Math.round(shadow.spread || 0),
      color: shadow.color ? figmaColorToCSS(shadow.color) : 'rgba(0,0,0,0.25)'
    };
  }
  
  return result;
}

/**
 * Convert Figma text style to Webtir typography
 */
function convertTextStyle(style: any): ComponentStyle['typography'] {
  if (!style) return undefined;
  
  const typography: ComponentStyle['typography'] = {};
  
  if (style.fontSize) {
    typography.fontSize = `${style.fontSize}px`;
  }
  if (style.fontWeight) {
    typography.fontWeight = String(style.fontWeight);
  }
  if (style.textAlignHorizontal) {
    const alignMap: Record<string, 'left' | 'center' | 'right' | 'justify'> = {
      'LEFT': 'left',
      'CENTER': 'center',
      'RIGHT': 'right',
      'JUSTIFIED': 'justify'
    };
    typography.textAlign = alignMap[style.textAlignHorizontal] || 'left';
  }
  if (style.lineHeightPx) {
    typography.lineHeight = `${style.lineHeightPx}px`;
  }
  
  return Object.keys(typography).length > 0 ? typography : undefined;
}

/**
 * Convert Figma auto-layout to Webtir layout - Enhanced with grid support
 */
function convertAutoLayout(node: FigmaNode): ComponentStyle['layout'] {
  const layout: ComponentStyle['layout'] = {} as any;
  const nodeAny = node as any;
  
  // Check for grid layout first
  if (nodeAny.layoutGrids && nodeAny.layoutGrids.length > 0) {
    layout.display = 'grid';
    
    const grid = nodeAny.layoutGrids[0];
    if (grid.pattern === 'COLUMNS') {
      layout.gridCols = grid.count || 1;
      if (grid.gutterSize) layout.gap = grid.gutterSize;
      (layout as any).gridTemplateColumns = `repeat(${grid.count || 1}, 1fr)`;
    } else if (grid.pattern === 'ROWS') {
      layout.gridRows = grid.count || 1;
      if (grid.gutterSize) layout.gap = grid.gutterSize;
      (layout as any).gridTemplateRows = `repeat(${grid.count || 1}, 1fr)`;
    }
  }
  // Flex layout (auto-layout)
  else if (nodeAny.layoutMode) {
    layout.display = 'flex';
    layout.flexDirection = nodeAny.layoutMode === 'VERTICAL' ? 'column' : 'row';
    
    // Flex wrap
    if (nodeAny.layoutWrap === 'WRAP') {
      (layout as any).flexWrap = 'wrap';
    }
    
    // Primary axis alignment
    if (nodeAny.primaryAxisAlignItems) {
      const alignMap: Record<string, 'start' | 'center' | 'end' | 'between'> = {
        'MIN': 'start',
        'CENTER': 'center',
        'MAX': 'end',
        'SPACE_BETWEEN': 'between'
      };
      layout.justifyContent = alignMap[nodeAny.primaryAxisAlignItems] || 'start';
    }
    
    // Counter axis alignment
    if (nodeAny.counterAxisAlignItems) {
      const alignMap: Record<string, 'start' | 'center' | 'end' | 'stretch'> = {
        'MIN': 'start',
        'CENTER': 'center',
        'MAX': 'end',
        'STRETCH': 'stretch'
      };
      layout.alignItems = alignMap[nodeAny.counterAxisAlignItems] || 'start';
    }
    
    // Gap
    if (nodeAny.itemSpacing) {
      layout.gap = nodeAny.itemSpacing;
    }
    
    // Different gaps for row/column
    if (nodeAny.counterAxisSpacing && nodeAny.counterAxisSpacing !== nodeAny.itemSpacing) {
      (layout as any).rowGap = nodeAny.counterAxisSpacing;
      (layout as any).columnGap = nodeAny.itemSpacing;
    }
  }
  
  // Layout sizing mode (for children)
  if (nodeAny.layoutSizingHorizontal === 'HUG') {
    (layout as any).widthMode = 'hug';
  } else if (nodeAny.layoutSizingHorizontal === 'FILL') {
    (layout as any).widthMode = 'fill';
  }
  
  if (nodeAny.layoutSizingVertical === 'HUG') {
    (layout as any).heightMode = 'hug';
  } else if (nodeAny.layoutSizingVertical === 'FILL') {
    (layout as any).heightMode = 'fill';
  }
  
  return Object.keys(layout).length > 0 ? layout : undefined;
}

/**
 * Convert Figma padding
 */
function convertPadding(node: FigmaNode): ComponentStyle['spacing'] {
  const nodeAny = node as any;
  const spacing: ComponentStyle['spacing'] = {};
  
  if (nodeAny.paddingTop || nodeAny.paddingRight || nodeAny.paddingBottom || nodeAny.paddingLeft) {
    spacing.padding = {
      top: nodeAny.paddingTop || 0,
      right: nodeAny.paddingRight || 0,
      bottom: nodeAny.paddingBottom || 0,
      left: nodeAny.paddingLeft || 0
    };
  }
  
  return Object.keys(spacing).length > 0 ? spacing : undefined;
}

/**
 * Generate semantic class name from Figma node
 */
function generateClassName(node: FigmaNode, index: number): string {
  if (node.name) {
    // Sanitize name
    return node.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 50) || `layer-${index + 1}`;
  }
  return `layer-${index + 1}`;
}

/**
 * Determine component type from Figma node - Enhanced with SVG/code detection
 */
function determineComponentType(node: FigmaNode): ComponentType {
  let type = FIGMA_TYPE_MAP[node.type] || 'div';
  const nodeAny = node as any;
  
  // Check for SVG / vector content - map to codeblock
  if (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION') {
    // Could be an icon or custom SVG
    type = 'codeblock';
  }
  
  // Check if it's exportable as SVG (complex vector graphics)
  if (nodeAny.exportSettings) {
    const svgExport = nodeAny.exportSettings.find((e: any) => e.format === 'SVG');
    if (svgExport) {
      type = 'codeblock';
    }
  }
  
  // Refine based on name patterns
  const nameLower = node.name?.toLowerCase() || '';
  
  if (node.type === 'TEXT') {
    // Check if it looks like a heading
    if (nameLower.includes('heading') || nameLower.includes('title') || nameLower.includes('h1') || nameLower.includes('h2')) {
      type = 'heading';
    }
  }
  
  if (node.type === 'FRAME' || node.type === 'COMPONENT') {
    if (nameLower.includes('button') || nameLower.includes('btn')) {
      type = 'button';
    } else if (nameLower.includes('card')) {
      type = 'card';
    } else if (nameLower.includes('header')) {
      type = 'header';
    } else if (nameLower.includes('footer')) {
      type = 'footer';
    } else if (nameLower.includes('nav')) {
      type = 'navigation';
    } else if (nameLower.includes('section')) {
      type = 'section';
    } else if (nameLower.includes('container')) {
      type = 'container';
    } else if (nameLower.includes('input') || nameLower.includes('field')) {
      type = 'input';
    } else if (nameLower.includes('image') || nameLower.includes('img')) {
      type = 'image';
    } else if (nameLower.includes('icon') || nameLower.includes('svg')) {
      type = 'icon';
    } else if (nameLower.includes('grid')) {
      type = 'grid';
    } else if (nameLower.includes('embed') || nameLower.includes('code')) {
      type = 'codeblock';
    }
  }
  
  // Check for grid layout in frame
  if ((node.type === 'FRAME' || node.type === 'COMPONENT') && nodeAny.layoutGrids?.length > 0) {
    type = 'grid';
  }
  
  return type;
}

/**
 * Convert a single Figma node to AppComponent
 */
function convertNode(
  node: FigmaNode,
  index: number,
  warnings: string[],
  assets: FigmaAsset[]
): AppComponent {
  const componentType = determineComponentType(node);
  const className = generateClassName(node, index);
  const componentId = uuid();
  
  // Build props
  const props: Record<string, any> = {};
  
  // Handle text content
  if (node.characters) {
    props.text = node.characters;
    props.content = node.characters;
  }
  
  // Handle heading level
  if (componentType === 'heading') {
    const nameLower = node.name?.toLowerCase() || '';
    if (nameLower.includes('h1')) props.level = 1;
    else if (nameLower.includes('h2')) props.level = 2;
    else if (nameLower.includes('h3')) props.level = 3;
    else if (nameLower.includes('h4')) props.level = 4;
    else if (nameLower.includes('h5')) props.level = 5;
    else if (nameLower.includes('h6')) props.level = 6;
    else props.level = 2;
  }
  
  // Build style
  const style: ComponentStyle = {};
  
  // Sizing from bounding box
  if (node.absoluteBoundingBox) {
    style.sizing = {
      width: `${Math.round(node.absoluteBoundingBox.width)}px`,
      height: `${Math.round(node.absoluteBoundingBox.height)}px`
    };
  }
  
  // Layout from auto-layout
  const layout = convertAutoLayout(node);
  if (layout) style.layout = layout;
  
  // Spacing from padding
  const spacing = convertPadding(node);
  if (spacing) style.spacing = spacing;
  
  // Background from fills
  if (node.fills) {
    const bg = convertFills(node.fills as any[], assets);
    if (bg.color || bg.gradient || bg.image) {
      style.background = bg;
    }
  }
  
  // Border from strokes
  if (node.strokes && (node.strokes as any[]).length > 0) {
    const stroke = (node.strokes as any[])[0];
    const nodeAny = node as any;
    style.border = {
      width: nodeAny.strokeWeight || 1,
      style: 'solid' as const,
      color: stroke.color ? figmaColorToCSS(stroke.color) : '#000000'
    };
    
    if (nodeAny.cornerRadius) {
      style.border.radius = nodeAny.cornerRadius;
    }
  }
  
  // Border radius without stroke
  const nodeAny = node as any;
  if (nodeAny.cornerRadius && !style.border) {
    style.border = { radius: nodeAny.cornerRadius };
  }
  
  // Effects (shadows, etc.)
  if (node.effects) {
    const effectStyles = convertEffects(node.effects as any[]);
    if (effectStyles.shadow) style.shadow = effectStyles.shadow;
  }
  
  // Typography from style
  if (node.style) {
    const typography = convertTextStyle(node.style);
    if (typography) style.typography = typography;
  }
  
  // Text color from fills (for text nodes)
  if (node.type === 'TEXT' && node.fills && (node.fills as any[]).length > 0) {
    const textFill = (node.fills as any[])[0];
    if (textFill.type === 'SOLID' && textFill.color) {
      if (!style.typography) style.typography = {};
      style.typography.color = figmaColorToCSS(textFill.color);
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
 * Create StyleClass entries from components
 */
function extractStyleClasses(components: AppComponent[]): StyleClass[] {
  const styleClasses: StyleClass[] = [];
  const processedNames = new Set<string>();
  
  const processComponent = (comp: AppComponent) => {
    if (comp.classNames && comp.classNames.length > 0) {
      const className = comp.classNames[0];
      if (!processedNames.has(className)) {
        processedNames.add(className);
        
        // Flatten the component style for the class
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
    
    // Process children
    comp.children?.forEach(processComponent);
  };
  
  components.forEach(processComponent);
  return styleClasses;
}

/**
 * Extract canvas/page-level styles from Figma data
 * Figma frames may have canvas-level background colors
 */
function extractFigmaBodyStyles(data: FigmaData): Record<string, any> {
  const bodyStyles: Record<string, any> = {};
  
  // Check for document-level or canvas-level styles
  const dataAny = data as any;
  if (dataAny.documentColorProfile) {
    // Could indicate design system colors, but not directly applicable
  }
  
  // Check the first FRAME node for page-level styling
  if (data.nodes && data.nodes.length > 0) {
    const rootNode = data.nodes[0];
    const nodeAny = rootNode as any;
    
    // If the root is a FRAME with fills, extract as potential body background
    if (rootNode.type === 'FRAME' && rootNode.fills) {
      const fills = rootNode.fills as any[];
      for (const fill of fills) {
        if (fill.type === 'SOLID' && fill.visible !== false) {
          bodyStyles.backgroundColor = figmaColorToCSS(fill.color);
          break;
        }
      }
    }
  }
  
  return bodyStyles;
}

/**
 * Main conversion function - converts Figma paste data to Webtir components
 */
export function convertFigmaToComponents(data: FigmaData): FigmaConversionResult {
  const warnings: string[] = [];
  const assets: FigmaAsset[] = [];
  
  if (!data?.nodes || data.nodes.length === 0) {
    return {
      components: [],
      styleClasses: [],
      bodyStyles: {},
      assets: [],
      warnings: ['Invalid Figma data: no nodes found']
    };
  }
  
  // Extract page-level styles
  const bodyStyles = extractFigmaBodyStyles(data);
  
  // Convert all root nodes
  const components = data.nodes.map((node, index) => 
    convertNode(node, index, warnings, assets)
  );
  
  // Extract style classes
  const styleClasses = extractStyleClasses(components);
  
  if (Object.keys(bodyStyles).length > 0) {
    warnings.push(`Extracted canvas styles: ${Object.keys(bodyStyles).join(', ')}`);
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
export function getFigmaConversionStats(result: FigmaConversionResult): {
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
