/**
 * Convert a style value to a valid CSS value string
 * Handles nested objects like border, background, etc.
 */
export function serializeStyleValue(prop: string, value: any): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    const needsUnits = ['width', 'height', 'margin', 'padding', 'top', 'left', 'right', 'bottom', 
      'fontSize', 'lineHeight', 'borderRadius', 'gap', 'maxWidth', 'minWidth', 'maxHeight', 'minHeight'];
    if (needsUnits.some(p => prop.toLowerCase().includes(p.toLowerCase())) && value !== 0) {
      return `${value}px`;
    }
    return String(value);
  }

  if (Array.isArray(value)) {
    if (prop === 'boxShadow' || prop === 'boxShadows') {
      const enabled = value.filter((s: any) => s.enabled !== false);
      if (enabled.length === 0) return null;
      return enabled.map((s: any) => {
        const inset = s.type === 'inner' || s.type === 'inset' ? 'inset ' : '';
        return `${inset}${s.x || 0}px ${s.y || 0}px ${s.blur || 0}px ${s.spread || 0}px ${s.color || 'rgba(0,0,0,0.1)'}`;
      }).join(', ');
    }
    if (prop === 'filter' || prop === 'filters') {
      const enabled = value.filter((f: any) => f.enabled !== false);
      if (enabled.length === 0) return null;
      return enabled.map((f: any) => `${f.function || f.fn || 'blur'}(${f.value || 0}${f.unit || 'px'})`).join(' ');
    }
    if (prop === 'transition' || prop === 'transitions') {
      const enabled = value.filter((t: any) => t.enabled !== false);
      if (enabled.length === 0) return null;
      return enabled.map((t: any) => `${t.property || 'all'} ${t.duration || 200}ms ${t.easing || 'ease'} ${t.delay || 0}ms`).join(', ');
    }
    return null;
  }

  if (typeof value === 'object') {
    if ('top' in value && 'right' in value && 'bottom' in value && 'left' in value && !('width' in value) && !('style' in value)) {
      const unit = value.unit || 'px';
      const t = typeof value.top === 'number' ? value.top + unit : (value.top || '0');
      const r = typeof value.right === 'number' ? value.right + unit : (value.right || '0');
      const b = typeof value.bottom === 'number' ? value.bottom + unit : (value.bottom || '0');
      const l = typeof value.left === 'number' ? value.left + unit : (value.left || '0');
      return `${t} ${r} ${b} ${l}`;
    }

    if ((prop === 'transform' || prop === 'transforms') && ('translate' in value || 'scale' in value || 'rotate' in value || 'skew' in value)) {
      const parts: string[] = [];
      if (value.translate && value.translate.enabled !== false && (value.translate.x || value.translate.y || value.translate.z)) {
        const tu = value.translate.unit || 'px';
        parts.push(value.translate.z ? `translate3d(${value.translate.x||0}${tu},${value.translate.y||0}${tu},${value.translate.z||0}${tu})` : `translate(${value.translate.x||0}${tu},${value.translate.y||0}${tu})`);
      }
      if (value.scale && value.scale.enabled !== false && (value.scale.x !== 100 || value.scale.y !== 100)) {
        parts.push(`scale(${(value.scale.x||100)/100},${(value.scale.y||100)/100})`);
      }
      if (value.rotate && value.rotate.enabled !== false) {
        if (value.rotate.x) parts.push(`rotateX(${value.rotate.x}deg)`);
        if (value.rotate.y) parts.push(`rotateY(${value.rotate.y}deg)`);
        if (value.rotate.z) parts.push(`rotateZ(${value.rotate.z}deg)`);
      }
      if (value.skew && value.skew.enabled !== false && (value.skew.x || value.skew.y)) {
        parts.push(`skew(${value.skew.x||0}deg,${value.skew.y||0}deg)`);
      }
      return parts.length > 0 ? parts.join(' ') : null;
    }

    if ('x' in value && 'y' in value) {
      if (prop === 'translate') {
        const unit = value.unit || 'px';
        return `translate(${typeof value.x === 'number' ? value.x + unit : (value.x || '0')}, ${typeof value.y === 'number' ? value.y + unit : (value.y || '0')})`;
      }
      if (prop === 'scale') {
        return `scale(${typeof value.x === 'number' ? value.x / 100 : 1}, ${typeof value.y === 'number' ? value.y / 100 : 1})`;
      }
      if (prop === 'rotate') {
        return `rotate(${value.z || 0}deg)`;
      }
    }

    if (('width' in value || 'style' in value) && !('top' in value && 'right' in value && 'bottom' in value && 'left' in value)) {
      const width = value.width ? (typeof value.width === 'number' ? `${value.width}px` : value.width) : '1px';
      const style = value.style || 'solid';
      const color = value.color || 'currentColor';
      return `${width} ${style} ${color}`;
    }
    
    if ('type' in value) {
      if (value.type === 'solid') {
        if (value.value) {
          if (value.opacity !== undefined && value.opacity < 100) {
            const hex = value.value;
            if (hex.startsWith('#') && hex.length >= 7) {
              const r = parseInt(hex.slice(1, 3), 16);
              const g = parseInt(hex.slice(3, 5), 16);
              const b = parseInt(hex.slice(5, 7), 16);
              return `rgba(${r},${g},${b},${value.opacity / 100})`;
            }
          }
          return value.value;
        }
        if (value.color) return value.color;
      }
      if (value.type === 'gradient' && value.gradient) {
        const g = value.gradient;
        const angle = g.angle || 180;
        const stops = (g.stops || []).map((s: any) => `${s.color} ${s.position}%`).join(', ');
        return `linear-gradient(${angle}deg, ${stops})`;
      }
      if (value.type === 'image' && value.url) return `url(${value.url})`;
      if (value.value) return value.value;
    }

    if ('topLeft' in value || 'topRight' in value || 'bottomLeft' in value || 'bottomRight' in value) {
      const unit = value.unit || 'px';
      return `${typeof value.topLeft === 'number' ? value.topLeft + unit : (value.topLeft || '0')} ${typeof value.topRight === 'number' ? value.topRight + unit : (value.topRight || '0')} ${typeof value.bottomRight === 'number' ? value.bottomRight + unit : (value.bottomRight || '0')} ${typeof value.bottomLeft === 'number' ? value.bottomLeft + unit : (value.bottomLeft || '0')}`;
    }

    if ('value' in value && 'unit' in value) {
      return `${value.value}${value.unit}`;
    }

    if (value.stops && Array.isArray(value.stops)) {
      const angle = value.angle || value.direction || 180;
      const angleStr = typeof angle === 'number' ? `${angle}deg` : angle;
      const stops = value.stops.map((s: any) => `${s.color} ${s.position}%`).join(', ');
      return `linear-gradient(${angleStr}, ${stops})`;
    }
    
    const harmlessProps = ['enabled', 'linked'];
    const hasOnlyHarmless = Object.keys(value).every(k => harmlessProps.includes(k) || value[k] === 0 || value[k] === false);
    if (!hasOnlyHarmless) {
      console.warn(`Skipping unsupported object value for property ${prop}:`, JSON.stringify(value));
    }
    return null;
  }

  return String(value);
}

// Map plural canvas keys to their singular CSS property names
const PLURAL_TO_CSS: Record<string, string> = {
  boxShadows: 'box-shadow',
  filters: 'filter',
  transitions: 'transition',
  transforms: 'transform',
};

export function flattenStylesToRules(styles: Record<string, any>): string[] {
  const rules: string[] = [];
  for (const [prop, value] of Object.entries(styles)) {
    if (PLURAL_TO_CSS[prop]) {
      const cssValue = serializeStyleValue(prop, value);
      if (cssValue) {
        rules.push(`  ${PLURAL_TO_CSS[prop]}: ${cssValue};`);
      }
      continue;
    }

    if ((prop === 'padding' || prop === 'margin') && typeof value === 'object' && value !== null && 'top' in (value as any)) {
      const v = value as Record<string, any>;
      const unit = v.unit || 'px';
      if (v.top !== undefined && v.top !== 0) rules.push(`  ${prop}-top: ${v.top}${unit};`);
      if (v.right !== undefined && v.right !== 0) rules.push(`  ${prop}-right: ${v.right}${unit};`);
      if (v.bottom !== undefined && v.bottom !== 0) rules.push(`  ${prop}-bottom: ${v.bottom}${unit};`);
      if (v.left !== undefined && v.left !== 0) rules.push(`  ${prop}-left: ${v.left}${unit};`);
      continue;
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value) && !('width' in value && 'style' in value) && !('type' in value) && !('value' in value && 'unit' in value) && !('top' in value && 'right' in value && 'bottom' in value && 'left' in value) && !('topLeft' in value) && !('translate' in value || 'scale' in value || 'rotate' in value || 'skew' in value)) {
      for (const [nestedProp, nestedValue] of Object.entries(value as Record<string, any>)) {
        if (PLURAL_TO_CSS[nestedProp]) {
          const cssValue = serializeStyleValue(nestedProp, nestedValue);
          if (cssValue) {
            rules.push(`  ${PLURAL_TO_CSS[nestedProp]}: ${cssValue};`);
          }
          continue;
        }
        if ((nestedProp === 'padding' || nestedProp === 'margin') && typeof nestedValue === 'object' && nestedValue !== null && 'top' in nestedValue) {
          const nv = nestedValue as Record<string, any>;
          const unit = nv.unit || 'px';
          if (nv.top !== undefined && nv.top !== 0) rules.push(`  ${nestedProp}-top: ${nv.top}${unit};`);
          if (nv.right !== undefined && nv.right !== 0) rules.push(`  ${nestedProp}-right: ${nv.right}${unit};`);
          if (nv.bottom !== undefined && nv.bottom !== 0) rules.push(`  ${nestedProp}-bottom: ${nv.bottom}${unit};`);
          if (nv.left !== undefined && nv.left !== 0) rules.push(`  ${nestedProp}-left: ${nv.left}${unit};`);
          continue;
        }
        
        const cssValue = serializeStyleValue(nestedProp, nestedValue);
        if (cssValue) {
          const cssProperty = nestedProp.replace(/([A-Z])/g, '-$1').toLowerCase();
          rules.push(`  ${cssProperty}: ${cssValue};`);
        }
      }
    } else {
      const cssValue = serializeStyleValue(prop, value);
      if (cssValue) {
        const cssProperty = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        rules.push(`  ${cssProperty}: ${cssValue};`);
      }
    }
  }
  return rules;
}

export function generateCustomCSS(globalStyles: any, styleClasses: any): string {
  let css = '';
  
  if (styleClasses?.classes && Array.isArray(styleClasses.classes)) {
    for (const cls of styleClasses.classes) {
      if (cls.name && cls.styles) {
        const rules = flattenStylesToRules(cls.styles);
        if (rules.length > 0) {
          css += `.${cls.name} {\n${rules.join('\n')}\n}\n`;
        }
      }

      if (cls.name && cls.tabletStyles && typeof cls.tabletStyles === 'object' && Object.keys(cls.tabletStyles).length > 0) {
        const tabletRules = flattenStylesToRules(cls.tabletStyles);
        if (tabletRules.length > 0) {
          css += `@media (max-width: 991px) {\n  .${cls.name} {\n${tabletRules.join('\n')}\n  }\n}\n`;
        }
      }

      if (cls.name && cls.mobileStyles && typeof cls.mobileStyles === 'object' && Object.keys(cls.mobileStyles).length > 0) {
        const mobileRules = flattenStylesToRules(cls.mobileStyles);
        if (mobileRules.length > 0) {
          css += `@media (max-width: 767px) {\n  .${cls.name} {\n${mobileRules.join('\n')}\n  }\n}\n`;
        }
      }
    }
  }
  
  return css;
}
