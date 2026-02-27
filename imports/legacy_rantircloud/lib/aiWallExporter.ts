/**
 * AI Wall Exporter - Converts AI Wall component trees to HTML and React code for export.
 * 
 * Supports:
 * - HTML export (single file with embedded CSS)
 * - React export (component + CSS file)
 * - ZIP download for both formats (compatible with Builder Import)
 */

import JSZip from 'jszip';

// ============================================================
// Shared helpers
// ============================================================

const COMPONENT_ELEMENT_MAP: Record<string, string> = {
  'div': 'div', 'section': 'section', 'container': 'div', 'row': 'div',
  'column': 'div', 'grid': 'div', 'text': 'p', 'heading': 'h2',
  'button': 'button', 'icon': 'span', 'input': 'input', 'textarea': 'textarea',
  'select': 'select', 'image': 'img', 'card': 'div', 'list': 'ul',
  'link': 'a', 'nav-horizontal': 'nav', 'nav-vertical': 'nav', 'navigation': 'nav',
  'header': 'header', 'footer': 'footer', 'sidebar': 'aside', 'badge': 'span',
  'separator': 'hr', 'spacer': 'div', 'label': 'label', 'blockquote': 'blockquote',
  'code': 'code', 'codeblock': 'pre', 'divider': 'hr', 'video': 'video',
  'audio': 'audio', 'avatar': 'div', 'alert': 'div', 'progress': 'progress',
  'form': 'form', 'form-wrapper': 'form',
};

function getElementName(type: string, props: Record<string, any>): string {
  if (type === 'heading') {
    if (props.tag && /^h[1-6]$/.test(props.tag)) return props.tag;
    const level = props.level || props.headingLevel || 2;
    return `h${Math.min(Math.max(level, 1), 6)}`;
  }
  if (type === 'text') {
    if (props.tag && (props.tag === 'p' || /^h[1-6]$/.test(props.tag))) return props.tag;
    return 'p';
  }
  return COMPONENT_ELEMENT_MAP[type] || 'div';
}

function getContentText(type: string, props: Record<string, any>): string {
  if (props.content) return String(props.content);
  if (props.text) return String(props.text);
  if (props.label && ['button', 'label'].includes(type)) return String(props.label);
  return '';
}

function escapeHTML(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Escape a string for use inside a JSX attribute (double-quoted) */
function escapeJSXAttr(str: string): string {
  return String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Escape text content for safe JSX rendering */
function escapeJSXContent(str: string): string {
  // If the string contains characters that would break JSX, wrap in a JSX expression
  if (/[{}<>]/.test(str)) {
    return `{${JSON.stringify(str)}}`;
  }
  return str;
}

/** camelCase → kebab-case */
function toKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/** Numeric properties that need px suffix */
const NEEDS_PX = new Set([
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  'gap', 'borderRadius', 'borderWidth', 'fontSize', 'letterSpacing',
  'top', 'right', 'bottom', 'left', 'lineHeight',
]);

/** Skip internal/non-CSS properties (content, attributes, builder internals) */
const SKIP_PROPS = new Set([
  'content', 'text', 'label', 'src', 'href', 'alt', 'placeholder', 'name',
  'value', 'type', 'target', 'download', 'action', 'method', 'checked',
  'disabled', 'required', 'rows', 'options', 'items', 'iconName', 'icon',
  'level', 'headingLevel', 'tag', 'appliedClasses', 'activeClass', 'controls',
  'autoPlay', 'loop', 'databaseConnection', 'title', 'description',
  'id', 'className', 'formType', 'formAction', 'formMethod',
]);

/** Properties that are non-CSS (internal to the builder) and should be skipped */
const INTERNAL_STYLE_KEYS = new Set([
  'backgroundGradient', 'backgroundLayerOrder', 'boxShadows', 'filters',
  'transitions', 'transforms', '_dsTokenRefs', '_aiGenerated',
  '_propertySource', '__lockedProps', '__editedProps',
]);

/**
 * Convert a hex color + opacity to rgba string
 */
function hexToRgba(hex: string, opacity: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6 && clean.length !== 3) return hex;
  const full = clean.length === 3
    ? clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
    : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}

/**
 * Format a style value for CSS output, handling complex internal formats:
 * - { type: 'solid', value: '#fff', opacity: 95 } → rgba(...)
 * - { type: 'gradient', value: 'linear-gradient(...)' } → the gradient string
 * - { value: 10, unit: 'px' } → '10px'
 * - { tokenRef: '...', value: '#333' } → '#333'
 * - boxShadows array → CSS box-shadow string
 */
function formatCSSValue(key: string, value: any): string {
  if (value === null || value === undefined || value === '') return '';

  // Handle TokenColorValue: { tokenRef, value }
  if (typeof value === 'object' && value !== null && 'tokenRef' in value && 'value' in value) {
    return formatCSSValue(key, value.value);
  }

  // Handle ColorAdvancedPicker: { type: 'solid'|'gradient', value, opacity? }
  if (typeof value === 'object' && value !== null && 'type' in value && 'value' in value) {
    if (value.type === 'solid') {
      let hex = value.value;
      if (typeof hex === 'object' && hex !== null && 'tokenRef' in hex) hex = hex.value || '';
      hex = String(hex || '');
      const opacity = typeof value.opacity === 'number' ? value.opacity : 100;
      if (opacity < 100 && hex.startsWith('#')) return hexToRgba(hex, opacity);
      return hex;
    }
    if (value.type === 'gradient') {
      return String(value.value || '');
    }
  }

  // Handle dimension objects: { value, unit }
  if (typeof value === 'object' && value !== null && 'unit' in value && 'value' in value) {
    const dimValue = value.value;
    const dimUnit = value.unit;
    if (dimUnit === 'auto' || dimValue === 'auto' || dimValue === '' || dimValue == null) return '';
    if (typeof dimValue === 'string' && ['fit-content', 'min-content', 'max-content'].includes(dimValue)) return dimValue;
    return `${dimValue}${dimUnit || 'px'}`;
  }

  // Handle arrays (boxShadows, filters, etc.) – skip, handled separately
  if (Array.isArray(value)) return '';

  // Handle remaining plain objects – skip
  if (typeof value === 'object' && value !== null) return '';

  if (typeof value === 'number' && NEEDS_PX.has(key)) return `${value}px`;
  return String(value);
}

/**
 * Convert a boxShadows array to CSS box-shadow string
 */
function boxShadowsToCSS(shadows: any[]): string {
  if (!Array.isArray(shadows) || shadows.length === 0) return '';
  return shadows
    .filter((s: any) => s && s.enabled !== false)
    .map((s: any) => {
      const inset = s.inset ? 'inset ' : '';
      const x = s.offsetX ?? s.x ?? 0;
      const y = s.offsetY ?? s.y ?? 0;
      const blur = s.blur ?? s.blurRadius ?? 0;
      const spread = s.spread ?? s.spreadRadius ?? 0;
      const color = s.color || 'rgba(0,0,0,0.1)';
      return `${inset}${x}px ${y}px ${blur}px ${spread}px ${color}`;
    })
    .join(', ');
}

/**
 * Convert a filters array to CSS filter string
 */
function filtersToCSS(filters: any[]): string {
  if (!Array.isArray(filters) || filters.length === 0) return '';
  return filters
    .filter((f: any) => f && f.enabled !== false)
    .map((f: any) => {
      const type = f.type || f.filter || '';
      const val = f.value ?? f.amount ?? 0;
      const unit = f.unit || (type === 'hue-rotate' ? 'deg' : type === 'blur' ? 'px' : '%');
      return `${type}(${val}${unit})`;
    })
    .join(' ');
}

/**
 * Convert transforms object to CSS transform string
 */
function transformsToCSS(transforms: any): string {
  if (!transforms || typeof transforms !== 'object') return '';
  const parts: string[] = [];
  if (transforms.translateX || transforms.translateY) {
    parts.push(`translate(${transforms.translateX || 0}px, ${transforms.translateY || 0}px)`);
  }
  if (transforms.rotate) parts.push(`rotate(${transforms.rotate}deg)`);
  if (transforms.scaleX !== undefined || transforms.scaleY !== undefined) {
    parts.push(`scale(${transforms.scaleX ?? 1}, ${transforms.scaleY ?? 1})`);
  }
  if (transforms.skewX || transforms.skewY) {
    parts.push(`skew(${transforms.skewX || 0}deg, ${transforms.skewY || 0}deg)`);
  }
  return parts.join(' ');
}

function propsToInlineCSS(props: Record<string, any>): string {
  const declarations: string[] = [];

  for (const [key, val] of Object.entries(props)) {
    if (SKIP_PROPS.has(key) || INTERNAL_STYLE_KEYS.has(key) || val === undefined || val === null || val === '') continue;
    const formatted = formatCSSValue(key, val);
    if (formatted) declarations.push(`${toKebab(key)}: ${formatted}`);
  }

  // Handle complex effect arrays that were skipped above
  if (Array.isArray(props.boxShadows)) {
    const css = boxShadowsToCSS(props.boxShadows);
    if (css) declarations.push(`box-shadow: ${css}`);
  }
  if (Array.isArray(props.filters)) {
    const css = filtersToCSS(props.filters);
    if (css) declarations.push(`filter: ${css}`);
  }
  if (props.transforms && typeof props.transforms === 'object' && !Array.isArray(props.transforms)) {
    const css = transformsToCSS(props.transforms);
    if (css) declarations.push(`transform: ${css}`);
  }
  if (Array.isArray(props.transitions)) {
    const css = props.transitions
      .filter((t: any) => t && t.enabled !== false)
      .map((t: any) => `${t.property || 'all'} ${t.duration || '0.3s'} ${t.easing || 'ease'}`)
      .join(', ');
    if (css) declarations.push(`transition: ${css}`);
  }

  // Handle backgroundGradient → background-image
  if (props.backgroundGradient && typeof props.backgroundGradient === 'string') {
    declarations.push(`background-image: ${props.backgroundGradient}`);
  }

  return declarations.join('; ');
}

// ============================================================
// HTML Generation
// ============================================================

function componentToHTML(component: any, indent: number = 2): string {
  const pad = '  '.repeat(indent);
  const step = component.data || component;
  const type = step.type || 'div';
  const props = step.props || {};
  const children: any[] = step.children || [];
  const elementName = getElementName(type, props);
  const selfClosing = ['input', 'img', 'hr', 'br'].includes(elementName);

  // Build attributes
  const attrs: string[] = [];
  const inlineCSS = propsToInlineCSS(props);
  if (inlineCSS) attrs.push(`style="${escapeHTML(inlineCSS)}"`);

  // Semantic attributes
  if (type === 'image' && props.src) {
    attrs.push(`src="${escapeHTML(props.src)}"`);
    attrs.push(`alt="${escapeHTML(props.alt || '')}"`);
  }
  if (type === 'link' && props.href) {
    attrs.push(`href="${escapeHTML(props.href)}"`);
    if (props.target) attrs.push(`target="${escapeHTML(props.target)}"`);
  }
  if (['input', 'checkbox', 'radio'].includes(type)) {
    if (props.type) attrs.push(`type="${escapeHTML(props.type)}"`);
    if (props.placeholder) attrs.push(`placeholder="${escapeHTML(props.placeholder)}"`);
    if (props.name) attrs.push(`name="${escapeHTML(props.name)}"`);
  }
  if (type === 'textarea' && props.placeholder) {
    attrs.push(`placeholder="${escapeHTML(props.placeholder)}"`);
  }
  if (type === 'button' && props.disabled) attrs.push('disabled');
  if (['video', 'audio'].includes(type)) {
    if (props.src) attrs.push(`src="${escapeHTML(props.src)}"`);
    attrs.push('controls');
  }

  const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

  if (selfClosing) return `${pad}<${elementName}${attrStr} />`;

  const content = getContentText(type, props);
  const childHTML = children.map((c: any) => componentToHTML(c, indent + 1)).join('\n');

  if (children.length > 0) {
    const textBefore = content ? `\n${pad}  ${escapeHTML(content)}` : '';
    return `${pad}<${elementName}${attrStr}>${textBefore}\n${childHTML}\n${pad}</${elementName}>`;
  }

  if (content) return `${pad}<${elementName}${attrStr}>${escapeHTML(content)}</${elementName}>`;
  return `${pad}<${elementName}${attrStr}></${elementName}>`;
}

export function generateHTMLExport(components: any[], title: string = 'AI Wall Design'): string {
  const bodyContent = components.map(c => componentToHTML(c, 2)).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHTML(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

// ============================================================
// React Generation
// ============================================================

function componentToJSX(component: any, indent: number = 3): string {
  const pad = '  '.repeat(indent);
  const step = component.data || component;
  const type = step.type || 'div';
  const props = step.props || {};
  const children: any[] = step.children || [];
  const elementName = getElementName(type, props);
  const selfClosing = ['input', 'img', 'hr', 'br'].includes(elementName);

  // Build inline style object
  const styleEntries: string[] = [];
  for (const [key, val] of Object.entries(props)) {
    if (SKIP_PROPS.has(key) || INTERNAL_STYLE_KEYS.has(key) || val === undefined || val === null || val === '') continue;
    const formatted = formatCSSValue(key, val);
    if (!formatted) continue;
    // Keep camelCase for React inline styles
    const isNumber = !isNaN(Number(formatted)) && !NEEDS_PX.has(key);
    const escapedVal = formatted.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    styleEntries.push(isNumber ? `${key}: ${formatted}` : `${key}: '${escapedVal}'`);
  }

  // Handle complex effect arrays for React inline styles
  if (Array.isArray(props.boxShadows)) {
    const css = boxShadowsToCSS(props.boxShadows);
    if (css) styleEntries.push(`boxShadow: '${css}'`);
  }
  if (Array.isArray(props.filters)) {
    const css = filtersToCSS(props.filters);
    if (css) styleEntries.push(`filter: '${css}'`);
  }
  if (props.transforms && typeof props.transforms === 'object' && !Array.isArray(props.transforms)) {
    const css = transformsToCSS(props.transforms);
    if (css) styleEntries.push(`transform: '${css}'`);
  }
  if (Array.isArray(props.transitions)) {
    const css = props.transitions
      .filter((t: any) => t && t.enabled !== false)
      .map((t: any) => `${t.property || 'all'} ${t.duration || '0.3s'} ${t.easing || 'ease'}`)
      .join(', ');
    if (css) styleEntries.push(`transition: '${css}'`);
  }
  if (props.backgroundGradient && typeof props.backgroundGradient === 'string') {
    styleEntries.push(`backgroundImage: '${props.backgroundGradient}'`);
  }

  // Build attributes
  const attrs: string[] = [];
  if (styleEntries.length > 0) attrs.push(`style={{ ${styleEntries.join(', ')} }}`);

  if (type === 'image' && props.src) {
    attrs.push(`src="${escapeJSXAttr(props.src)}"`);
    attrs.push(`alt="${escapeJSXAttr(props.alt || '')}"`);
  }
  if (type === 'link' && props.href) {
    attrs.push(`href="${escapeJSXAttr(props.href)}"`);
    if (props.target) attrs.push(`target="${escapeJSXAttr(props.target)}"`);
  }
  if (['input', 'checkbox', 'radio'].includes(type)) {
    if (props.type) attrs.push(`type="${escapeJSXAttr(props.type)}"`);
    if (props.placeholder) attrs.push(`placeholder="${escapeJSXAttr(props.placeholder)}"`);
    if (props.name) attrs.push(`name="${escapeJSXAttr(props.name)}"`);
  }
  if (type === 'textarea' && props.placeholder) {
    attrs.push(`placeholder="${escapeJSXAttr(props.placeholder)}"`);
  }
  if (type === 'button' && props.disabled) attrs.push('disabled');
  if (['video', 'audio'].includes(type)) {
    if (props.src) attrs.push(`src="${props.src}"`);
    attrs.push('controls');
  }

  const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

  if (selfClosing) return `${pad}<${elementName}${attrStr} />`;

  const content = getContentText(type, props);
  const childJSX = children.map((c: any) => componentToJSX(c, indent + 1)).join('\n');

  // Escape content for JSX (curly braces, angle brackets, etc.)
  const safeContent = content ? escapeJSXContent(content) : '';

  if (children.length > 0) {
    const textBefore = safeContent ? `\n${pad}  ${safeContent}` : '';
    return `${pad}<${elementName}${attrStr}>${textBefore}\n${childJSX}\n${pad}</${elementName}>`;
  }

  if (safeContent) return `${pad}<${elementName}${attrStr}>${safeContent}</${elementName}>`;
  return `${pad}<${elementName}${attrStr} />`;
}

export function generateReactExport(components: any[], componentName: string = 'AIWallDesign'): string {
  const safeName = componentName.replace(/[^a-zA-Z0-9]/g, '');
  const jsxContent = components.map(c => componentToJSX(c)).join('\n');

  return `import React from 'react';

export function ${safeName}() {
  return (
    <div style={{ width: '100%', minHeight: '100vh' }}>
${jsxContent}
    </div>
  );
}

export default ${safeName};
`;
}

// ============================================================
// ZIP generation
// ============================================================

export async function generateHTMLZip(components: any[], name: string): Promise<Blob> {
  const zip = new JSZip();
  const html = generateHTMLExport(components, name);
  zip.file('index.html', html);
  return zip.generateAsync({ type: 'blob' });
}

export async function generateReactZip(components: any[], name: string): Promise<Blob> {
  const zip = new JSZip();
  const safeName = name.replace(/[^a-zA-Z0-9]/g, '') || 'AIWallDesign';
  const reactCode = generateReactExport(components, safeName);

  // Create a React-compatible zip structure
  const src = zip.folder('src')!;
  src.file(`${safeName}.tsx`, reactCode);
  src.file('index.tsx', `export { default } from './${safeName}';\n`);

  // Also include the raw HTML for reference
  const html = generateHTMLExport(components, name);
  zip.file('index.html', html);

  return zip.generateAsync({ type: 'blob' });
}

// ============================================================
// Download helper
// ============================================================

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  }
}
