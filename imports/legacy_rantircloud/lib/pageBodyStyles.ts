import type { CSSProperties } from 'react';
import type { StyleClass } from '@/types/classes';
import { STYLE_PROPERTIES } from '@/lib/styleResolver';

const DEFAULT_BODY_CLASS = 'body';

// --- Value helpers ----------------------------------------------------------

const isDeletedValue = (v: any): boolean =>
  typeof v === 'string' && v.trim().toLowerCase() === '__deleted__';

const isPlainObject = (v: any): v is Record<string, any> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

// React CSSProperties allows numbers (treated as px) or strings with explicit units.
// Our editor sometimes stores numeric strings like "8"; normalize those to "8px"
// for properties that require units.
const UNIT_STRING_KEYS = new Set<string>([
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'gap', 'rowGap', 'columnGap',
  'top', 'right', 'bottom', 'left',
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'borderRadius',
  'fontSize', 'letterSpacing',
]);

function toCSSValue(key: string, value: any): any {
  if (value === undefined || value === null) return undefined;

  // ColorAdvancedPicker values: { type: 'solid' | 'gradient', value: string, opacity?: number }
  if (isPlainObject(value) && 'type' in value && 'value' in value) {
    const v: any = value;
    if (v.type === 'solid') {
      const hex = String(v.value || '');
      const opacity = typeof v.opacity === 'number' ? v.opacity : 100;
      if (opacity >= 100) return hex;

      const clean = hex.replace('#', '');
      if (clean.length === 6) {
        const r = parseInt(clean.slice(0, 2), 16);
        const g = parseInt(clean.slice(2, 4), 16);
        const b = parseInt(clean.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
      }

      return hex;
    }

    // Gradient values should be handled by layered background computation.
    return undefined;
  }

  // Complex unit objects (e.g., { unit: 'px', value: '100' })
  if (isPlainObject(value) && 'unit' in value && 'value' in value) {
    const v: any = value;
    if (v.value === 'auto' || v.unit === 'auto') return 'auto';
    if (v.value === '' || v.value === null || v.value === undefined) return undefined;
    return `${v.value}${v.unit || 'px'}`;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return undefined;

    // Convert pure numeric strings to px for unit-based keys.
    if (UNIT_STRING_KEYS.has(key) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
      return `${trimmed}px`;
    }

    return value;
  }

  // Primitive numbers/booleans can pass through; numbers become px where applicable.
  return value;
}

// --- Layered background computation -----------------------------------------

const isValidBgLayer = (v: any): boolean => {
  if (!v) return false;
  if (isDeletedValue(v)) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (isPlainObject(v) && typeof v.value === 'string') {
    return v.value.trim().length > 0 && !isDeletedValue(v.value);
  }
  return false;
};

const getBgLayerValue = (v: any): string => {
  if (typeof v === 'string') return v;
  if (isPlainObject(v) && typeof v.value === 'string') return v.value;
  return '';
};

const getBgLayerOpacity = (v: any): number => {
  if (isPlainObject(v) && typeof (v as any).opacity === 'number') return (v as any).opacity;
  return 100;
};

const isValidFillColor = (v: any): boolean => {
  if (!v) return false;
  if (isDeletedValue(v)) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (isPlainObject(v) && (v as any).type === 'solid') {
    return typeof (v as any).value === 'string' && (v as any).value.trim().length > 0;
  }
  return false;
};

const getFillColorValue = (v: any): string | undefined => {
  if (!isValidFillColor(v)) return undefined;
  if (typeof v === 'string') return v;
  if (isPlainObject(v) && (v as any).type === 'solid') return String((v as any).value || '');
  return undefined;
};

const applyOpacityToGradient = (gradient: string, opacity: number): string => {
  if (opacity >= 100) return gradient;
  const alpha = opacity / 100;

  let result = gradient.replace(/#([0-9a-fA-F]{6})\b/g, (match) => {
    const hex = match.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  });

  result = result.replace(
    /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g,
    (_, r, g, b) => `rgba(${r}, ${g}, ${b}, ${alpha})`
  );

  result = result.replace(
    /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/g,
    (_, r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${parseFloat(a) * alpha})`
  );

  return result;
};

const colorToRgba = (color: string, opacity: number): string => {
  if (opacity >= 100) return color;
  const alpha = opacity / 100;

  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  if (color.startsWith('rgb(')) {
    const match = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (match) return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
  }

  if (color.startsWith('rgba(')) {
    const match = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
    if (match) return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${parseFloat(match[4]) * alpha})`;
  }

  if (color.startsWith('hsl(')) {
    return color.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
  }

  if (color.startsWith('hsla(')) {
    return color.replace(/,\s*([\d.]+)\s*\)$/, `, ${alpha})`);
  }

  return color;
};

function computeLayeredBackgroundStyles(raw: Record<string, any>): CSSProperties {
  const styles: CSSProperties = {};

  const bg = raw.background;
  const fill = raw.backgroundColor;

  const gradient =
    (raw as any).backgroundGradient ??
    (raw as any).background?.gradient ??
    (raw as any).background?.backgroundGradient;

  const image =
    (raw as any).backgroundImage ??
    (raw as any).background?.image ??
    (raw as any).background?.backgroundImage;

  const order: string[] = Array.isArray((raw as any).backgroundLayerOrder)
    ? (raw as any).backgroundLayerOrder
    : Array.isArray((raw as any).background?.layerOrder)
      ? (raw as any).background.layerOrder
      : Array.isArray((raw as any).background?.backgroundLayerOrder)
        ? (raw as any).background.backgroundLayerOrder
        : ['image', 'gradient', 'fill'];

  // Extract image-specific positioning from image object if available
  const imageObj = typeof image === 'object' ? image : {};
  const defaultBackgroundSize = (imageObj as any).size || (raw.backgroundSize as string | undefined) || 'cover';
  const defaultBackgroundPosition = ((imageObj as any).position || (raw.backgroundPosition as string | undefined) || 'center').replace('-', ' ');
  const defaultBackgroundRepeat = (imageObj as any).repeat || (raw.backgroundRepeat as string | undefined) || 'no-repeat';

  const hasImage = isValidBgLayer(image);
  const hasGradient = isValidBgLayer(gradient);

  // No layered backgrounds: allow simple background/backgroundColor.
  if (!hasImage && !hasGradient) {
    if (bg && !isDeletedValue(bg)) {
      styles.background = String(bg);
      return styles;
    }

    const fillColor = getFillColorValue(fill);
    if (fillColor && !isDeletedValue(fillColor)) {
      styles.backgroundColor = toCSSValue('backgroundColor', fill) ?? fillColor;
    }
    return styles;
  }

  const backgroundLayers: string[] = [];
  const backgroundSizes: string[] = [];
  const backgroundPositions: string[] = [];
  const backgroundRepeats: string[] = [];

  const wrapUrl = (v: string) => (v.trim().startsWith('url(') ? v : `url(${v})`);

  for (const layerType of order) {
    if (layerType === 'image' && isValidBgLayer(image)) {
      const imageUrl = getBgLayerValue(image);
      const imageOpacity = getBgLayerOpacity(image);
      
      // Get image-specific positioning
      const imgSize = (imageObj as any).size || defaultBackgroundSize;
      const imgPosition = ((imageObj as any).position || defaultBackgroundPosition).replace('-', ' ');
      const imgRepeat = (imageObj as any).repeat || defaultBackgroundRepeat;

      if (imageOpacity < 100) {
        const overlayColor = `rgba(255,255,255,${1 - imageOpacity / 100})`;
        backgroundLayers.push(`linear-gradient(${overlayColor}, ${overlayColor}), ${wrapUrl(imageUrl)}`);
        backgroundSizes.push(`cover, ${imgSize}`);
        backgroundPositions.push(`center, ${imgPosition}`);
        backgroundRepeats.push(`no-repeat, ${imgRepeat}`);
      } else {
        backgroundLayers.push(wrapUrl(imageUrl));
        backgroundSizes.push(imgSize);
        backgroundPositions.push(imgPosition);
        backgroundRepeats.push(imgRepeat);
      }
    }

    if (layerType === 'gradient' && isValidBgLayer(gradient)) {
      const gradientValue = getBgLayerValue(gradient);
      const gradientOpacity = getBgLayerOpacity(gradient);
      backgroundLayers.push(applyOpacityToGradient(gradientValue, gradientOpacity));
      backgroundSizes.push('cover');
      backgroundPositions.push('center');
      backgroundRepeats.push('no-repeat');
    }

    if (layerType === 'fill' && isValidFillColor(fill)) {
      const fillColor = getFillColorValue(fill);
      const fillOpacity = getBgLayerOpacity(fill);
      if (fillColor) {
        const transparentColor = colorToRgba(fillColor, fillOpacity);
        backgroundLayers.push(`linear-gradient(${transparentColor}, ${transparentColor})`);
        backgroundSizes.push('cover');
        backgroundPositions.push('center');
        backgroundRepeats.push('no-repeat');
      }
    }
  }

  if (backgroundLayers.length > 0) {
    styles.background = backgroundLayers.join(', ');
    styles.backgroundSize = backgroundSizes.join(', ');
    styles.backgroundPosition = backgroundPositions.join(', ');
    styles.backgroundRepeat = backgroundRepeats.join(', ');
  }

  return styles;
}

// --- Public API -------------------------------------------------------------

export function resolvePageBodyCSS(
  bodyProperties: Record<string, any> | undefined,
  classes: StyleClass[]
): CSSProperties {
  const rawBodyProps = bodyProperties || {};

  const appliedClasses: string[] = Array.isArray(rawBodyProps.appliedClasses) && rawBodyProps.appliedClasses.length > 0
    ? rawBodyProps.appliedClasses
    : [DEFAULT_BODY_CLASS];

  // Merge class styles in stack order.
  let merged: Record<string, any> = {};
  for (const className of appliedClasses) {
    const cls = classes.find(c => c.name === className);
    if (cls?.styles) {
      merged = { ...merged, ...cls.styles };
    }
  }

  // Local body props override class styles (we keep this behavior for backwards compatibility).
  const { appliedClasses: _ignored1, activeClass: _ignored2, ...localOverrides } = rawBodyProps;
  merged = { ...merged, ...localOverrides };

  const backgroundStyles = computeLayeredBackgroundStyles(merged);

  const css: CSSProperties = {
    boxSizing: 'border-box',
  };

  // Exclude non-CSS / handled-by-background keys.
  const skipKeys = new Set<string>([
    'background',
    'backgroundColor',
    'backgroundGradient',
    'backgroundImage',
    'backgroundLayerOrder',
  ]);

  for (const [key, value] of Object.entries(merged)) {
    if (!STYLE_PROPERTIES.has(key)) continue;
    if (skipKeys.has(key)) continue;
    if (isDeletedValue(value)) continue;

    const cssValue = toCSSValue(key, value);
    if (cssValue !== undefined) {
      (css as any)[key] = cssValue;
    }
  }

  return {
    ...css,
    ...backgroundStyles,
  };
}
