/**
 * Webflow XscpData Converter
 * Converts Webflow clipboard data to Webtir AppComponents
 */

import { AppComponent, ComponentType, ComponentStyle } from '@/types/appBuilder';
import { StyleClass, PseudoState } from '@/types/classes';
import { WebflowData, WebflowNode, WebflowStyle } from '@/lib/clipboardParser';
import { v4 as uuid } from 'uuid';

export interface WebflowConversionResult {
  components: AppComponent[];
  styleClasses: StyleClass[];
  bodyStyles: Record<string, any>;
  assets: WebflowAsset[];
  warnings: string[];
}

export interface WebflowAsset {
  url: string;
  alt?: string;
  type: 'image' | 'video' | 'file';
  originalId?: string;
}

// Webflow node type to Webtir component type mapping
const WEBFLOW_TYPE_MAP: Record<string, ComponentType> = {
  'Block': 'div',
  'V Flex': 'div',
  'H Flex': 'div',
  'Heading': 'heading',
  'Paragraph': 'text',
  'TextBlock': 'text',
  'RichText': 'text',
  'Image': 'image',
  'Link': 'link',
  'LinkBlock': 'link',
  'FormWrapper': 'form',
  'FormForm': 'form',
  'FormButton': 'button',
  'FormTextInput': 'input',
  'FormTextarea': 'textarea',
  'FormCheckboxWrapper': 'checkbox',
  'FormRadioWrapper': 'radio',
  'FormSelect': 'select',
  'Section': 'section',
  'Container': 'container',
  'Row': 'row',
  'Column': 'column',
  'Navbar': 'navigation',
  'NavbarContainer': 'container',
  'NavbarBrand': 'link',
  'NavbarMenu': 'nav-horizontal',
  'NavbarLink': 'link',
  'NavbarButton': 'button',
  'Icon': 'icon',
  'Video': 'video',
  'BackgroundVideoWrapper': 'video',
  'HtmlEmbed': 'codeblock',
  'Grid': 'grid',
  'Tabs': 'tabs',
  'TabMenu': 'div',
  'TabLink': 'tab-trigger',
  'TabPane': 'tab-content',
  'TabsContent': 'div',
  'Slider': 'carousel',
  'SliderMask': 'div',
  'Slide': 'carousel-slide',
  'SliderNav': 'div',
  'SliderArrow': 'button',
  'Dropdown': 'dropdown-menu',
  'DropdownToggle': 'button',
  'DropdownList': 'div',
  'DropdownLink': 'link',
  'LightboxWrapper': 'div',
  'Lightbox': 'modal',
  'Figure': 'div',
  'Figcaption': 'text',
  'Blockquote': 'blockquote',
  'List': 'list',
  'ListItem': 'div',
  'Strong': 'text',
  'Emphasis': 'text',
  'Span': 'text',
  'LineBreak': 'spacer',
  'HorizontalRule': 'divider',
  'Button': 'button',
  'DivBlock': 'div',
};

// Tag-based refinement for Block types
const TAG_TO_TYPE: Record<string, ComponentType> = {
  'section': 'section',
  'header': 'header',
  'footer': 'footer',
  'nav': 'navigation',
  'aside': 'sidebar',
  'main': 'container',
  'article': 'container',
  'div': 'div',
  'span': 'text',
  'p': 'text',
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
  'ul': 'list',
  'ol': 'list',
  'li': 'div',
  'blockquote': 'blockquote',
  'hr': 'divider',
  'figure': 'div',
  'figcaption': 'text',
  'label': 'label',
};

/**
 * Parse Webflow's styleLess CSS-like string into style object
 */
export function parseStyleLess(styleLess: string): Record<string, any> {
  if (!styleLess || typeof styleLess !== 'string') {
    return {};
  }

  const styles: Record<string, any> = {};
  
  // Split by semicolon and process each declaration
  styleLess.split(';').forEach(decl => {
    const trimmed = decl.trim();
    if (!trimmed) return;
    
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) return;
    
    const property = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();
    
    if (!property || !value) return;
    
    // Convert CSS property to camelCase
    const jsProperty = property.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    
    // Parse value (handle units, colors, etc.)
    styles[jsProperty] = parseCSSValue(value);
  });
  
  return styles;
}

/**
 * Parse CSS value and handle units
 */
function parseCSSValue(value: string): any {
  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  
  // Handle CSS variables
  if (value.startsWith('var(')) {
    return value;
  }
  
  // Try to parse as number with unit
  const numMatch = value.match(/^(-?\d+(?:\.\d+)?)(px|em|rem|%|vh|vw|vmin|vmax|ch|ex)?$/);
  if (numMatch) {
    const num = parseFloat(numMatch[1]);
    const unit = numMatch[2] || '';
    return unit ? `${num}${unit}` : num;
  }
  
  return value;
}

/**
 * Check if a sizing value is a CSS default that should not be saved
 */
function isSizingDefault(key: string, value: any): boolean {
  const normalizedValue = normalizeUnit(value);
  const sizingDefaults: Record<string, (val: any) => boolean> = {
    width: (val) => val === 'auto' || val === '' || val === '100%',
    height: (val) => val === 'auto' || val === '',
    minWidth: (val) => val === '0' || val === '0px' || val === 0,
    minHeight: (val) => val === '0' || val === '0px' || val === 0 || val === '100px',
    maxWidth: (val) => val === 'none' || val === 'auto' || val === '' || val === '1100px',
    maxHeight: (val) => val === 'none' || val === 'auto' || val === '',
  };
  
  return sizingDefaults[key] ? sizingDefaults[key](normalizedValue) : false;
}

/**
 * Convert Webflow styles to FLAT style object for classStore
 * IMPORTANT: Returns flat camelCase properties (e.g., { display: 'flex', gap: '24px' })
 * IMPORTANT: Filters out CSS default sizing values to keep classes clean
 */
function convertToFlatStyles(flatStyles: Record<string, any>): Record<string, any> {
  const styles: Record<string, any> = {};
  
  // Layout properties - copy directly as flat properties
  if (flatStyles.display) styles.display = flatStyles.display;
  if (flatStyles.flexDirection) styles.flexDirection = flatStyles.flexDirection;
  if (flatStyles.flexWrap) styles.flexWrap = flatStyles.flexWrap;
  if (flatStyles.justifyContent) styles.justifyContent = flatStyles.justifyContent;
  if (flatStyles.alignItems) styles.alignItems = flatStyles.alignItems;
  if (flatStyles.alignContent) styles.alignContent = flatStyles.alignContent;
  if (flatStyles.gap) styles.gap = normalizeUnit(flatStyles.gap);
  if (flatStyles.rowGap) styles.rowGap = normalizeUnit(flatStyles.rowGap);
  if (flatStyles.columnGap) styles.columnGap = normalizeUnit(flatStyles.columnGap);
  
  // Grid properties
  if (flatStyles.gridTemplateColumns) styles.gridTemplateColumns = flatStyles.gridTemplateColumns;
  if (flatStyles.gridTemplateRows) styles.gridTemplateRows = flatStyles.gridTemplateRows;
  if (flatStyles.gridAutoFlow) styles.gridAutoFlow = flatStyles.gridAutoFlow;
  if (flatStyles.gridAutoColumns) styles.gridAutoColumns = flatStyles.gridAutoColumns;
  if (flatStyles.gridAutoRows) styles.gridAutoRows = flatStyles.gridAutoRows;
  if (flatStyles.gridArea) styles.gridArea = flatStyles.gridArea;
  if (flatStyles.gridColumn) styles.gridColumn = flatStyles.gridColumn;
  if (flatStyles.gridRow) styles.gridRow = flatStyles.gridRow;
  if (flatStyles.gridColumnStart) styles.gridColumnStart = flatStyles.gridColumnStart;
  if (flatStyles.gridColumnEnd) styles.gridColumnEnd = flatStyles.gridColumnEnd;
  if (flatStyles.gridRowStart) styles.gridRowStart = flatStyles.gridRowStart;
  if (flatStyles.gridRowEnd) styles.gridRowEnd = flatStyles.gridRowEnd;
  
  // Flex child properties
  if (flatStyles.flexGrow !== undefined) styles.flexGrow = flatStyles.flexGrow;
  if (flatStyles.flexShrink !== undefined) styles.flexShrink = flatStyles.flexShrink;
  if (flatStyles.flexBasis !== undefined) styles.flexBasis = flatStyles.flexBasis;
  if (flatStyles.alignSelf) styles.alignSelf = flatStyles.alignSelf;
  if (flatStyles.order !== undefined) styles.order = flatStyles.order;
  
  // Position properties
  if (flatStyles.position) styles.position = flatStyles.position;
  if (flatStyles.top !== undefined) styles.top = normalizeUnit(flatStyles.top);
  if (flatStyles.right !== undefined) styles.right = normalizeUnit(flatStyles.right);
  if (flatStyles.bottom !== undefined) styles.bottom = normalizeUnit(flatStyles.bottom);
  if (flatStyles.left !== undefined) styles.left = normalizeUnit(flatStyles.left);
  if (flatStyles.zIndex !== undefined) styles.zIndex = flatStyles.zIndex;
  
  // Sizing properties - FILTER OUT DEFAULTS
  if (flatStyles.width && !isSizingDefault('width', flatStyles.width)) {
    styles.width = normalizeUnit(flatStyles.width);
  }
  if (flatStyles.height && !isSizingDefault('height', flatStyles.height)) {
    styles.height = normalizeUnit(flatStyles.height);
  }
  if (flatStyles.minWidth && !isSizingDefault('minWidth', flatStyles.minWidth)) {
    styles.minWidth = normalizeUnit(flatStyles.minWidth);
  }
  if (flatStyles.minHeight && !isSizingDefault('minHeight', flatStyles.minHeight)) {
    styles.minHeight = normalizeUnit(flatStyles.minHeight);
  }
  if (flatStyles.maxWidth && !isSizingDefault('maxWidth', flatStyles.maxWidth)) {
    styles.maxWidth = normalizeUnit(flatStyles.maxWidth);
  }
  if (flatStyles.maxHeight && !isSizingDefault('maxHeight', flatStyles.maxHeight)) {
    styles.maxHeight = normalizeUnit(flatStyles.maxHeight);
  }
  if (flatStyles.aspectRatio) styles.aspectRatio = flatStyles.aspectRatio;
  
  // Spacing properties - expand shorthand
  if (flatStyles.padding !== undefined) {
    expandSpacing('padding', flatStyles.padding, styles);
  } else {
    if (flatStyles.paddingTop !== undefined) styles.paddingTop = normalizeUnit(flatStyles.paddingTop);
    if (flatStyles.paddingRight !== undefined) styles.paddingRight = normalizeUnit(flatStyles.paddingRight);
    if (flatStyles.paddingBottom !== undefined) styles.paddingBottom = normalizeUnit(flatStyles.paddingBottom);
    if (flatStyles.paddingLeft !== undefined) styles.paddingLeft = normalizeUnit(flatStyles.paddingLeft);
  }
  
  if (flatStyles.margin !== undefined) {
    expandSpacing('margin', flatStyles.margin, styles);
  } else {
    if (flatStyles.marginTop !== undefined) styles.marginTop = normalizeUnit(flatStyles.marginTop);
    if (flatStyles.marginRight !== undefined) styles.marginRight = normalizeUnit(flatStyles.marginRight);
    if (flatStyles.marginBottom !== undefined) styles.marginBottom = normalizeUnit(flatStyles.marginBottom);
    if (flatStyles.marginLeft !== undefined) styles.marginLeft = normalizeUnit(flatStyles.marginLeft);
  }
  
  // Typography properties
  if (flatStyles.fontSize) styles.fontSize = normalizeUnit(flatStyles.fontSize);
  if (flatStyles.fontWeight) styles.fontWeight = String(flatStyles.fontWeight);
  if (flatStyles.fontFamily) styles.fontFamily = flatStyles.fontFamily;
  if (flatStyles.textAlign) styles.textAlign = flatStyles.textAlign;
  if (flatStyles.color) styles.color = flatStyles.color;
  if (flatStyles.lineHeight) styles.lineHeight = String(flatStyles.lineHeight);
  if (flatStyles.letterSpacing) styles.letterSpacing = normalizeUnit(flatStyles.letterSpacing);
  if (flatStyles.textTransform) styles.textTransform = flatStyles.textTransform;
  if (flatStyles.textDecoration) styles.textDecoration = flatStyles.textDecoration;
  if (flatStyles.whiteSpace) styles.whiteSpace = flatStyles.whiteSpace;
  if (flatStyles.wordBreak) styles.wordBreak = flatStyles.wordBreak;
  if (flatStyles.textOverflow) styles.textOverflow = flatStyles.textOverflow;
  
  // Background properties
  if (flatStyles.backgroundColor) styles.backgroundColor = flatStyles.backgroundColor;
  if (flatStyles.background) {
    const bgValue = String(flatStyles.background);
    if (bgValue.includes('gradient') || bgValue.includes('linear-') || bgValue.includes('radial-')) {
      styles.backgroundImage = bgValue;
    } else if (bgValue.includes('url(')) {
      styles.backgroundImage = bgValue;
    } else if (bgValue !== 'none') {
      styles.backgroundColor = bgValue;
    }
  }
  if (flatStyles.backgroundImage) {
    const imgValue = String(flatStyles.backgroundImage);
    if (imgValue !== 'none') {
      styles.backgroundImage = imgValue;
    }
  }
  if (flatStyles.backgroundSize) styles.backgroundSize = flatStyles.backgroundSize;
  if (flatStyles.backgroundPosition) styles.backgroundPosition = flatStyles.backgroundPosition;
  if (flatStyles.backgroundRepeat) styles.backgroundRepeat = flatStyles.backgroundRepeat;
  if (flatStyles.backgroundAttachment) styles.backgroundAttachment = flatStyles.backgroundAttachment;
  if (flatStyles.backgroundClip) styles.backgroundClip = flatStyles.backgroundClip;
  
  // Border properties
  if (flatStyles.border && typeof flatStyles.border === 'string') {
    const parts = flatStyles.border.split(' ');
    if (parts.length >= 3) {
      styles.borderWidth = parts[0];
      styles.borderStyle = parts[1];
      styles.borderColor = parts.slice(2).join(' ');
    }
  } else {
    if (flatStyles.borderWidth) styles.borderWidth = normalizeUnit(flatStyles.borderWidth);
    if (flatStyles.borderStyle) styles.borderStyle = flatStyles.borderStyle;
    if (flatStyles.borderColor) styles.borderColor = flatStyles.borderColor;
  }
  if (flatStyles.borderRadius) styles.borderRadius = normalizeUnit(flatStyles.borderRadius);
  if (flatStyles.borderTopLeftRadius) styles.borderTopLeftRadius = normalizeUnit(flatStyles.borderTopLeftRadius);
  if (flatStyles.borderTopRightRadius) styles.borderTopRightRadius = normalizeUnit(flatStyles.borderTopRightRadius);
  if (flatStyles.borderBottomLeftRadius) styles.borderBottomLeftRadius = normalizeUnit(flatStyles.borderBottomLeftRadius);
  if (flatStyles.borderBottomRightRadius) styles.borderBottomRightRadius = normalizeUnit(flatStyles.borderBottomRightRadius);
  
  // Box shadow - keep as-is
  if (flatStyles.boxShadow) styles.boxShadow = flatStyles.boxShadow;
  
  // Overflow properties
  if (flatStyles.overflow) styles.overflow = flatStyles.overflow;
  if (flatStyles.overflowX) styles.overflowX = flatStyles.overflowX;
  if (flatStyles.overflowY) styles.overflowY = flatStyles.overflowY;
  
  // Opacity and visibility
  if (flatStyles.opacity !== undefined) styles.opacity = flatStyles.opacity;
  if (flatStyles.visibility) styles.visibility = flatStyles.visibility;
  
  // Transform properties
  if (flatStyles.transform) styles.transform = flatStyles.transform;
  if (flatStyles.transformOrigin) styles.transformOrigin = flatStyles.transformOrigin;
  
  // Transition properties
  if (flatStyles.transition) styles.transition = flatStyles.transition;
  
  // Cursor
  if (flatStyles.cursor) styles.cursor = flatStyles.cursor;
  
  // Object fit (for images)
  if (flatStyles.objectFit) styles.objectFit = flatStyles.objectFit;
  if (flatStyles.objectPosition) styles.objectPosition = flatStyles.objectPosition;
  
  return styles;
}

/**
 * Normalize unit values - ensure numbers have px suffix for dimensional properties
 */
function normalizeUnit(value: any): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'number') return `${value}px`;
  return String(value);
}

/**
 * Expand spacing shorthand (margin/padding) to individual properties
 */
function expandSpacing(prefix: string, value: any, styles: Record<string, any>) {
  const normalized = normalizeUnit(value);
  if (typeof value === 'string' && value.includes(' ')) {
    const parts = value.split(/\s+/).map(p => p.trim()).filter(Boolean);
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
    } else if (parts.length >= 4) {
      styles[`${prefix}Top`] = parts[0];
      styles[`${prefix}Right`] = parts[1];
      styles[`${prefix}Bottom`] = parts[2];
      styles[`${prefix}Left`] = parts[3];
    }
  } else {
    styles[`${prefix}Top`] = normalized;
    styles[`${prefix}Right`] = normalized;
    styles[`${prefix}Bottom`] = normalized;
    styles[`${prefix}Left`] = normalized;
  }
}

/**
 * Parse spacing value (px, rem, etc.) to number
 */
function parseSpacingValue(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const num = parseInt(String(value));
  return isNaN(num) ? 0 : num;
}

/**
 * Parse box-shadow CSS value
 */
function parseBoxShadow(shadow: string): ComponentStyle['shadow'] {
  // Basic parsing - handles simple shadows like "0px 4px 6px rgba(0,0,0,0.1)"
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
 * Generate a semantic class name from Webflow data
 */
function generateClassName(node: WebflowNode, styles: WebflowStyle[], index: number, usedNames: Set<string>): string {
  // Use Webflow class name if available
  if (node.classes && node.classes.length > 0) {
    const styleId = node.classes[0];
    const style = styles.find(s => s._id === styleId);
    if (style?.name) {
      // Sanitize class name
      let baseName = style.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (!usedNames.has(baseName)) {
        usedNames.add(baseName);
        return baseName;
      }
      // Add suffix if name already used
      let suffix = 2;
      while (usedNames.has(`${baseName}-${suffix}`)) {
        suffix++;
      }
      const finalName = `${baseName}-${suffix}`;
      usedNames.add(finalName);
      return finalName;
    }
  }
  
  // Generate based on type with unique suffix
  const type = WEBFLOW_TYPE_MAP[node.type] || 'div';
  let baseName = `${type}-${index + 1}`;
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName;
  }
  let suffix = 2;
  while (usedNames.has(`${baseName}-${suffix}`)) {
    suffix++;
  }
  const finalName = `${baseName}-${suffix}`;
  usedNames.add(finalName);
  return finalName;
}

/**
 * Extract text content from Webflow node
 */
function extractTextContent(node: WebflowNode, nodeMap: Map<string, WebflowNode>): string | undefined {
  // Check v field (Webflow's direct text)
  if (node.v && typeof node.v === 'string') {
    return node.v;
  }
  
  // Check data.text when it's a string
  if (node.data?.text && typeof node.data.text === 'string') {
    return node.data.text;
  }
  
  // Check data.xValue (rich text content)
  if (node.data?.xValue && typeof node.data.xValue === 'string') {
    return node.data.xValue;
  }
  
  // Check for text in data.content
  if (node.data?.content && typeof node.data.content === 'string') {
    return node.data.content;
  }
  
  // Check for placeholder/label
  if (node.data?.placeholder && typeof node.data.placeholder === 'string') {
    return node.data.placeholder;
  }
  
  // For text nodes, check if children are text nodes and concatenate
  if (node.children && node.children.length > 0) {
    const textParts: string[] = [];
    for (const childId of node.children) {
      const childNode = nodeMap.get(childId);
      if (childNode) {
        // Check if child is a pure text node
        if (childNode.type === 'LineBreak') {
          textParts.push('\n');
        } else if (childNode.v) {
          textParts.push(childNode.v);
        } else if (childNode.text === true && childNode.v) {
          textParts.push(childNode.v);
        }
      }
    }
    if (textParts.length > 0) {
      return textParts.join('');
    }
  }
  
  return undefined;
}

/**
 * Convert a single Webflow node to AppComponent
 */
function convertNode(
  node: WebflowNode,
  styles: WebflowStyle[],
  nodeMap: Map<string, WebflowNode>,
  index: number,
  warnings: string[],
  assets: WebflowAsset[],
  usedNames: Set<string>,
  generatedStyles: Map<string, Record<string, any>>
): AppComponent {
  // Determine component type
  let componentType: ComponentType = WEBFLOW_TYPE_MAP[node.type] || 'div';
  
  // Refine by tag if present
  if (node.tag && TAG_TO_TYPE[node.tag]) {
    componentType = TAG_TO_TYPE[node.tag];
  }
  
  // Check data.tag as well
  if (node.data?.tag && TAG_TO_TYPE[node.data.tag]) {
    componentType = TAG_TO_TYPE[node.data.tag];
  }
  
  // Handle SVG nodes - convert to codeblock
  if (node.type === 'HtmlEmbed' || node.type === 'Embed' || node.type === 'CodeBlock') {
    componentType = 'codeblock';
  }
  
  // Check if it's an SVG element
  if (node.data?.embed || node.data?.html || node.data?.code) {
    const embedContent = node.data.embed || node.data.html || node.data.code;
    if (typeof embedContent === 'string' && (embedContent.includes('<svg') || embedContent.includes('<?xml'))) {
      componentType = 'codeblock';
    }
  }
  
  const className = generateClassName(node, styles, index, usedNames);
  const componentId = uuid();
  
  // Build props
  const props: Record<string, any> = {};
  
  // Handle text content - use enhanced extraction
  const textContent = extractTextContent(node, nodeMap);
  if (textContent) {
    props.text = textContent;
    props.content = textContent;
  }
  
  // Handle heading level
  if (componentType === 'heading') {
    const tag = node.tag || node.data?.tag || 'h2';
    const levelMatch = tag.match(/h(\d)/);
    props.level = levelMatch ? parseInt(levelMatch[1]) : 2;
  }
  
  // Handle image
  if (node.data?.img) {
    const imgData = node.data.img as Record<string, any>;
    if (typeof imgData === 'object' && (imgData.url || imgData.src)) {
      props.src = imgData.url || imgData.src || '';
      props.alt = imgData.alt || '';
      if (props.src) {
        assets.push({
          url: props.src,
          alt: imgData.alt,
          type: 'image',
          originalId: imgData.id
        });
      }
    }
  }
  
  // Handle background image in data
  if (node.data?.bgImage || node.data?.backgroundImage) {
    const bgImg = node.data.bgImage || node.data.backgroundImage;
    if (typeof bgImg === 'object' && bgImg.url) {
      props.backgroundImage = bgImg.url;
      assets.push({
        url: bgImg.url,
        alt: '',
        type: 'image',
        originalId: bgImg.id
      });
    } else if (typeof bgImg === 'string') {
      props.backgroundImage = bgImg;
      if (bgImg.startsWith('http')) {
        assets.push({ url: bgImg, type: 'image' });
      }
    }
  }
  
  // Handle HTML embed / custom code
  if (node.data?.embed || node.data?.html || node.data?.code) {
    const embedContent = node.data.embed || node.data.html || node.data.code;
    props.code = embedContent;
    props.content = embedContent;
    props.language = 'html';
    
    // Check if it's an SVG
    if (typeof embedContent === 'string' && embedContent.includes('<svg')) {
      props.language = 'svg';
    }
  }
  
  // Handle link
  if (node.data?.link) {
    props.href = node.data.link.url || '#';
    props.target = node.data.link.mode === 'external' ? '_blank' : '_self';
  }
  
  // Handle attributes
  if (node.data?.attr) {
    Object.entries(node.data.attr).forEach(([key, value]) => {
      props[key] = value;
    });
  }
  
  // Build styles from Webflow classes
  let flatStyles: Record<string, any> = {};
  
  if (node.classes && node.classes.length > 0) {
    for (const classId of node.classes) {
      const webflowStyle = styles.find(s => s._id === classId);
      if (webflowStyle?.styleLess) {
        const parsed = parseStyleLess(webflowStyle.styleLess);
        flatStyles = { ...flatStyles, ...parsed };
      }
    }
  }
  
  // Also check inline styles in data.style
  if (node.data?.style) {
    flatStyles = { ...flatStyles, ...node.data.style };
  }
  
  // Check for CSS string in data.css
  if (node.data?.css) {
    const cssStyles = parseStyleLess(node.data.css);
    flatStyles = { ...flatStyles, ...cssStyles };
  }
  
  // Convert flat styles to FLAT format for classStore
  const componentStyle = convertToFlatStyles(flatStyles);
  
  // If there's a background image in props, add to style
  if (props.backgroundImage && !componentStyle.backgroundImage) {
    componentStyle.backgroundImage = `url(${props.backgroundImage})`;
  }
  
  // Build children
  const children: AppComponent[] = [];
  if (node.children && node.children.length > 0) {
    node.children.forEach((childId, childIndex) => {
      const childNode = nodeMap.get(childId);
      if (childNode) {
        // Skip pure text children that we've already extracted content from
        if (childNode.text === true || (childNode.type === 'LineBreak')) {
          return;
        }
        const childComponent = convertNode(childNode, styles, nodeMap, childIndex, warnings, assets, usedNames, generatedStyles);
        children.push(childComponent);
      } else {
        warnings.push(`Child node not found: ${childId}`);
      }
    });
  }
  
  // Store the generated style for this class name
  generatedStyles.set(className, componentStyle);
  
  return {
    id: componentId,
    type: componentType,
    props,
    style: componentStyle,
    classNames: [className],
    children: children.length > 0 ? children : undefined
  };
}

/**
 * Convert Webflow styles to StyleClass array
 * Creates classes for all components, using Webflow styles where available
 * and generated styles for components without Webflow class definitions
 */
function convertStyles(
  webflowStyles: WebflowStyle[],
  components: AppComponent[],
  generatedStyles: Map<string, Record<string, any>>
): StyleClass[] {
  const styleClasses: StyleClass[] = [];
  const processedNames = new Set<string>();
  
  // Collect all class names and their component styles from components
  const collectClassInfo = (comp: AppComponent): Array<{ name: string; style: ComponentStyle }> => {
    const infos: Array<{ name: string; style: ComponentStyle }> = [];
    if (comp.classNames && comp.classNames.length > 0) {
      const name = comp.classNames[0];
      infos.push({ name, style: comp.style || {} });
    }
    const childInfos = comp.children?.flatMap(c => collectClassInfo(c)) || [];
    return [...infos, ...childInfos];
  };
  
  const allClassInfos = components.flatMap(c => collectClassInfo(c));
  const classInfoMap = new Map<string, ComponentStyle>();
  for (const info of allClassInfos) {
    if (!classInfoMap.has(info.name)) {
      classInfoMap.set(info.name, info.style);
    }
  }
  
  // Build a map of Webflow style names for lookup
  const webflowStyleMap = new Map<string, WebflowStyle>();
  for (const wfStyle of webflowStyles) {
    const name = wfStyle.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (name) {
      webflowStyleMap.set(name, wfStyle);
    }
  }
  
  // Create a StyleClass for every class name used by components
  for (const [className, componentStyle] of classInfoMap) {
    if (processedNames.has(className)) continue;
    processedNames.add(className);
    
    // Default state styles
    const stateStyles: Record<PseudoState, Record<string, any>> = {
      'none': {},
      'hover': {},
      'pressed': {},
      'focused': {},
      'focus-visible': {},
      'focus-within': {}
    };
    
    // Check if there's a matching Webflow style
    const webflowStyle = webflowStyleMap.get(className);
    
    // Get styles - generated styles are already flat
    let styles: Record<string, any> = {};
    
    // Start with the generated component style (already flat)
    const genStyle = generatedStyles.get(className);
    if (genStyle) {
      // genStyle is already flat from convertToFlatStyles, use directly
      styles = { ...genStyle };
    }
    
    // If there's a Webflow style, parse and merge state variants
    if (webflowStyle) {
      if (webflowStyle.variants) {
        if (webflowStyle.variants['hover']) {
          stateStyles['hover'] = parseStyleLess(webflowStyle.variants['hover'].styleLess || '');
        }
        if (webflowStyle.variants['focus']) {
          stateStyles['focused'] = parseStyleLess(webflowStyle.variants['focus'].styleLess || '');
        }
        if (webflowStyle.variants['active']) {
          stateStyles['pressed'] = parseStyleLess(webflowStyle.variants['active'].styleLess || '');
        }
      }
    }
    
    styleClasses.push({
      id: uuid(),
      name: className,
      styles,
      stateStyles,
      appliedTo: [],
      inheritsFrom: webflowStyle?.children || [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  return styleClasses;
}

/**
 * Flatten ComponentStyle to a flat style object for classStore
 */
function flattenComponentStyle(style: ComponentStyle): Record<string, any> {
  const flat: Record<string, any> = {};
  
  if (style.layout) {
    Object.entries(style.layout).forEach(([key, value]) => {
      flat[key] = value;
    });
  }
  
  if (style.spacing) {
    if (style.spacing.padding !== undefined) {
      if (typeof style.spacing.padding === 'object') {
        flat.paddingTop = style.spacing.padding.top;
        flat.paddingRight = style.spacing.padding.right;
        flat.paddingBottom = style.spacing.padding.bottom;
        flat.paddingLeft = style.spacing.padding.left;
      } else {
        flat.padding = style.spacing.padding;
      }
    }
    if (style.spacing.margin !== undefined) {
      if (typeof style.spacing.margin === 'object') {
        flat.marginTop = style.spacing.margin.top;
        flat.marginRight = style.spacing.margin.right;
        flat.marginBottom = style.spacing.margin.bottom;
        flat.marginLeft = style.spacing.margin.left;
      } else {
        flat.margin = style.spacing.margin;
      }
    }
  }
  
  if (style.sizing) {
    Object.entries(style.sizing).forEach(([key, value]) => {
      flat[key] = value;
    });
  }
  
  if (style.typography) {
    Object.entries(style.typography).forEach(([key, value]) => {
      flat[key] = value;
    });
  }
  
  if (style.background) {
    if (style.background.color) flat.backgroundColor = style.background.color;
    if (style.background.image) flat.backgroundImage = style.background.image;
    if (style.background.gradient) flat.backgroundImage = style.background.gradient;
    if (style.background.size) flat.backgroundSize = style.background.size;
    if (style.background.position) flat.backgroundPosition = style.background.position;
    if (style.background.repeat) flat.backgroundRepeat = style.background.repeat;
  }
  
  if (style.border) {
    if (style.border.width !== undefined) flat.borderWidth = style.border.width;
    if (style.border.style) flat.borderStyle = style.border.style;
    if (style.border.color) flat.borderColor = style.border.color;
    if (style.border.radius !== undefined) flat.borderRadius = style.border.radius;
  }
  
  if (style.shadow) {
    const s = style.shadow;
    flat.boxShadow = `${s.x || 0}px ${s.y || 0}px ${s.blur || 0}px ${s.spread || 0}px ${s.color || 'rgba(0,0,0,0.1)'}`;
  }
  
  if ((style as any).position) {
    const pos = (style as any).position;
    if (pos.type) flat.position = pos.type;
    if (pos.top !== undefined) flat.top = pos.top;
    if (pos.right !== undefined) flat.right = pos.right;
    if (pos.bottom !== undefined) flat.bottom = pos.bottom;
    if (pos.left !== undefined) flat.left = pos.left;
    if (pos.zIndex !== undefined) flat.zIndex = pos.zIndex;
  }
  
  if ((style as any).overflow) {
    const ov = (style as any).overflow;
    if (ov.x) flat.overflowX = ov.x;
    if (ov.y) flat.overflowY = ov.y;
  }
  
  if ((style as any).opacity !== undefined) {
    flat.opacity = (style as any).opacity;
  }
  
  return flat;
}

/**
 * Extract body-level styles from Webflow data
 * Webflow may include page-level styling in the payload
 */
function extractWebflowBodyStyles(data: WebflowData): Record<string, any> {
  const bodyStyles: Record<string, any> = {};
  
  // Check for page settings or body styles in the payload
  const payload = data?.payload as any;
  if (payload?.pageSettings?.backgroundColor) {
    bodyStyles.backgroundColor = payload.pageSettings.backgroundColor;
  }
  if (payload?.pageSettings?.color) {
    bodyStyles.color = payload.pageSettings.color;
  }
  
  // Check styles array for a "Body" or "body" class
  const styles = payload?.styles || [];
  for (const style of styles) {
    const styleName = style.name?.toLowerCase();
    if (styleName === 'body' || styleName === 'all' || style.selector === 'body') {
      if (style.styleLess) {
        const parsedStyles = parseStyleLess(style.styleLess);
        Object.assign(bodyStyles, parsedStyles);
      }
    }
  }
  
  return bodyStyles;
}

/**
 * Main conversion function - converts Webflow XscpData to Webtir components
 */
export function convertWebflowToComponents(data: WebflowData): WebflowConversionResult {
  const warnings: string[] = [];
  const assets: WebflowAsset[] = [];
  
  if (!data?.payload?.nodes) {
    return {
      components: [],
      styleClasses: [],
      bodyStyles: {},
      assets: [],
      warnings: ['Invalid Webflow data: missing nodes']
    };
  }
  
  const { nodes, styles = [] } = data.payload;
  
  // Extract body-level styles
  const bodyStyles = extractWebflowBodyStyles(data);
  
  // Build node map for quick lookup
  const nodeMap = new Map<string, WebflowNode>();
  for (const node of nodes) {
    nodeMap.set(node._id, node);
  }
  
  // Find root nodes (nodes that aren't children of other nodes)
  const childIds = new Set<string>();
  for (const node of nodes) {
    if (node.children) {
      node.children.forEach(id => childIds.add(id));
    }
  }
  
  const rootNodes = nodes.filter(node => !childIds.has(node._id));
  
  // Track used class names to ensure uniqueness
  const usedNames = new Set<string>();
  // Track generated styles for each class name (flat style objects)
  const generatedStyles = new Map<string, Record<string, any>>();
  
  // Convert root nodes
  const components: AppComponent[] = rootNodes.map((node, index) => 
    convertNode(node, styles, nodeMap, index, warnings, assets, usedNames, generatedStyles)
  );
  
  // Convert styles - combine Webflow styles with generated component styles
  const styleClasses = convertStyles(styles, components, generatedStyles);
  
  if (Object.keys(bodyStyles).length > 0) {
    warnings.push(`Extracted body styles: ${Object.keys(bodyStyles).join(', ')}`);
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
export function getWebflowConversionStats(result: WebflowConversionResult): {
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
