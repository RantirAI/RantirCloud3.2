/**
 * Style-to-Tailwind Converter
 * Converts internal CSS style objects into Tailwind utility class strings
 */

// Tailwind spacing scale: maps px values to Tailwind tokens
const SPACING_SCALE: Record<number, string> = {
  0: '0', 1: 'px', 2: '0.5', 4: '1', 6: '1.5', 8: '2', 10: '2.5',
  12: '3', 14: '3.5', 16: '4', 20: '5', 24: '6', 28: '7', 32: '8',
  36: '9', 40: '10', 44: '11', 48: '12', 56: '14', 64: '16',
  72: '18', 80: '20', 96: '24', 112: '28', 128: '32', 144: '36',
  160: '40', 176: '44', 192: '48', 208: '52', 224: '56', 240: '60',
  256: '64', 288: '72', 320: '80', 384: '96',
};

// Font size scale
const FONT_SIZE_MAP: Record<number, string> = {
  12: 'text-xs', 14: 'text-sm', 16: 'text-base', 18: 'text-lg',
  20: 'text-xl', 24: 'text-2xl', 30: 'text-3xl', 36: 'text-4xl',
  48: 'text-5xl', 60: 'text-6xl', 72: 'text-7xl', 96: 'text-8xl',
  128: 'text-9xl',
};

// Font weight scale
const FONT_WEIGHT_MAP: Record<string, string> = {
  '100': 'font-thin', '200': 'font-extralight', '300': 'font-light',
  '400': 'font-normal', '500': 'font-medium', '600': 'font-semibold',
  '700': 'font-bold', '800': 'font-extrabold', '900': 'font-black',
  'normal': 'font-normal', 'bold': 'font-bold',
};

// Border radius scale
const RADIUS_MAP: Record<number, string> = {
  0: 'rounded-none', 2: 'rounded-sm', 4: 'rounded', 6: 'rounded-md',
  8: 'rounded-lg', 12: 'rounded-xl', 16: 'rounded-2xl', 24: 'rounded-3xl',
  9999: 'rounded-full',
};

// Tailwind color palette for nearest-match
const TAILWIND_COLORS: Record<string, string> = {
  '#000000': 'black', '#ffffff': 'white', '#f8fafc': 'slate-50',
  '#f1f5f9': 'slate-100', '#e2e8f0': 'slate-200', '#cbd5e1': 'slate-300',
  '#94a3b8': 'slate-400', '#64748b': 'slate-500', '#475569': 'slate-600',
  '#334155': 'slate-700', '#1e293b': 'slate-800', '#0f172a': 'slate-900',
  '#020617': 'slate-950',
  '#f9fafb': 'gray-50', '#f3f4f6': 'gray-100', '#e5e7eb': 'gray-200',
  '#d1d5db': 'gray-300', '#9ca3af': 'gray-400', '#6b7280': 'gray-500',
  '#4b5563': 'gray-600', '#374151': 'gray-700', '#1f2937': 'gray-800',
  '#111827': 'gray-900', '#030712': 'gray-950',
  '#fef2f2': 'red-50', '#fee2e2': 'red-100', '#fecaca': 'red-200',
  '#fca5a5': 'red-300', '#f87171': 'red-400', '#ef4444': 'red-500',
  '#dc2626': 'red-600', '#b91c1c': 'red-700', '#991b1b': 'red-800',
  '#ecfdf5': 'green-50', '#d1fae5': 'green-100', '#a7f3d0': 'green-200',
  '#6ee7b7': 'green-300', '#34d399': 'green-400', '#10b981': 'green-500',
  '#059669': 'green-600', '#047857': 'green-700', '#065f46': 'green-800',
  '#eff6ff': 'blue-50', '#dbeafe': 'blue-100', '#bfdbfe': 'blue-200',
  '#93c5fd': 'blue-300', '#60a5fa': 'blue-400', '#3b82f6': 'blue-500',
  '#2563eb': 'blue-600', '#1d4ed8': 'blue-700', '#1e40af': 'blue-800',
  '#fefce8': 'yellow-50', '#fef9c3': 'yellow-100', '#fde68a': 'yellow-200',
  '#fcd34d': 'yellow-300', '#fbbf24': 'yellow-400', '#f59e0b': 'yellow-500',
  '#d97706': 'yellow-600', '#b45309': 'yellow-700',
  '#fdf4ff': 'purple-50', '#fae8ff': 'purple-100', '#e9d5ff': 'purple-200',
  '#d8b4fe': 'purple-300', '#c084fc': 'purple-400', '#a855f7': 'purple-500',
  '#9333ea': 'purple-600', '#7e22ce': 'purple-700',
  '#fdf2f8': 'pink-50', '#fce7f3': 'pink-100', '#fbcfe8': 'pink-200',
  '#f9a8d4': 'pink-300', '#f472b6': 'pink-400', '#ec4899': 'pink-500',
  '#db2777': 'pink-600', '#be185d': 'pink-700',
  '#fff7ed': 'orange-50', '#ffedd5': 'orange-100', '#fed7aa': 'orange-200',
  '#fdba74': 'orange-300', '#fb923c': 'orange-400', '#f97316': 'orange-500',
  '#ea580c': 'orange-600', '#c2410c': 'orange-700',
  '#f0fdfa': 'teal-50', '#ccfbf1': 'teal-100', '#99f6e4': 'teal-200',
  '#5eead4': 'teal-300', '#2dd4bf': 'teal-400', '#14b8a6': 'teal-500',
  '#0d9488': 'teal-600', '#0f766e': 'teal-700',
  '#ecfeff': 'cyan-50', '#cffafe': 'cyan-100', '#a5f3fc': 'cyan-200',
  '#67e8f9': 'cyan-300', '#22d3ee': 'cyan-400', '#06b6d4': 'cyan-500',
  '#0891b2': 'cyan-600', '#0e7490': 'cyan-700',
  '#eef2ff': 'indigo-50', '#e0e7ff': 'indigo-100', '#c7d2fe': 'indigo-200',
  '#a5b4fc': 'indigo-300', '#818cf8': 'indigo-400', '#6366f1': 'indigo-500',
  '#4f46e5': 'indigo-600', '#4338ca': 'indigo-700',
};

/**
 * Parse a px value from various formats and return the numeric value
 */
function parsePxValue(value: any): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null) {
    if ('value' in value && 'unit' in value) {
      const num = parseFloat(value.value);
      return isNaN(num) ? null : num;
    }
    if ('value' in value) return parsePxValue(value.value);
  }
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Check if a value is a percentage or non-px unit
 */
function getValueWithUnit(value: any): string | null {
  if (typeof value === 'string') {
    if (value.endsWith('%') || value.endsWith('vh') || value.endsWith('vw') || value.endsWith('rem') || value.endsWith('em')) {
      return value;
    }
    if (value === 'auto' || value === 'fit-content' || value === 'max-content' || value === 'min-content') {
      return value;
    }
  }
  if (typeof value === 'object' && value !== null && 'value' in value && 'unit' in value) {
    if (value.unit === '%') return `${value.value}%`;
    if (value.unit === 'vh') return `${value.value}vh`;
    if (value.unit === 'vw') return `${value.value}vw`;
    if (value.unit === 'rem') return `${value.value}rem`;
    if (value.unit === 'em') return `${value.value}em`;
  }
  return null;
}

/**
 * Convert px value to Tailwind spacing token, or use arbitrary value
 */
export function pxToTailwindSpacing(px: number): string {
  if (SPACING_SCALE[px] !== undefined) return SPACING_SCALE[px];
  // Find closest
  const keys = Object.keys(SPACING_SCALE).map(Number).sort((a, b) => a - b);
  let closest = keys[0];
  for (const k of keys) {
    if (Math.abs(k - px) < Math.abs(closest - px)) closest = k;
  }
  // If close enough (within 2px), use nearest
  if (Math.abs(closest - px) <= 2) return SPACING_SCALE[closest];
  // Use arbitrary value
  return `[${px}px]`;
}

/**
 * Convert hex color to nearest Tailwind color name
 */
export function colorToTailwind(hex: string): string | null {
  if (!hex) return null;
  const normalized = hex.toLowerCase().trim();
  
  // Direct match
  if (TAILWIND_COLORS[normalized]) return TAILWIND_COLORS[normalized];
  
  // Check for transparent
  if (normalized === 'transparent') return 'transparent';
  
  // Parse hex to RGB for distance matching
  const hexToRgb = (h: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
  };

  const targetRgb = hexToRgb(normalized);
  if (!targetRgb) return null;

  let bestMatch = '';
  let bestDistance = Infinity;

  for (const [colorHex, colorName] of Object.entries(TAILWIND_COLORS)) {
    const rgb = hexToRgb(colorHex);
    if (!rgb) continue;
    const distance = Math.sqrt(
      Math.pow(targetRgb.r - rgb.r, 2) +
      Math.pow(targetRgb.g - rgb.g, 2) +
      Math.pow(targetRgb.b - rgb.b, 2)
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = colorName;
    }
  }

  // Only use nearest match if distance is close enough (< 30)
  if (bestDistance < 30) return bestMatch;
  
  // Use arbitrary hex value
  return null;
}

/**
 * Convert a single CSS property + value to a Tailwind class
 */
export function cssValueToTailwind(property: string, value: any): string | null {
  if (value === undefined || value === null || value === '') return null;

  const specialUnit = getValueWithUnit(value);
  const px = parsePxValue(value);

  switch (property) {
    // === DISPLAY ===
    case 'display':
      if (value === 'flex') return 'flex';
      if (value === 'grid') return 'grid';
      if (value === 'block') return 'block';
      if (value === 'inline') return 'inline';
      if (value === 'inline-flex') return 'inline-flex';
      if (value === 'inline-block') return 'inline-block';
      if (value === 'none') return 'hidden';
      return null;

    // === FLEX ===
    case 'flexDirection':
      if (value === 'column') return 'flex-col';
      if (value === 'row') return 'flex-row';
      if (value === 'column-reverse') return 'flex-col-reverse';
      if (value === 'row-reverse') return 'flex-row-reverse';
      return null;

    case 'flexWrap':
      if (value === 'wrap') return 'flex-wrap';
      if (value === 'nowrap') return 'flex-nowrap';
      if (value === 'wrap-reverse') return 'flex-wrap-reverse';
      return null;

    case 'justifyContent':
      const justifyMap: Record<string, string> = {
        'flex-start': 'justify-start', 'flex-end': 'justify-end',
        'center': 'justify-center', 'space-between': 'justify-between',
        'space-around': 'justify-around', 'space-evenly': 'justify-evenly',
        'start': 'justify-start', 'end': 'justify-end',
      };
      return justifyMap[value] || null;

    case 'alignItems':
      const alignMap: Record<string, string> = {
        'flex-start': 'items-start', 'flex-end': 'items-end',
        'center': 'items-center', 'baseline': 'items-baseline',
        'stretch': 'items-stretch', 'start': 'items-start', 'end': 'items-end',
      };
      return alignMap[value] || null;

    case 'alignSelf':
      const selfMap: Record<string, string> = {
        'auto': 'self-auto', 'flex-start': 'self-start', 'flex-end': 'self-end',
        'center': 'self-center', 'stretch': 'self-stretch', 'baseline': 'self-baseline',
      };
      return selfMap[value] || null;

    // === GAP ===
    case 'gap':
      if (px !== null) return `gap-${pxToTailwindSpacing(px)}`;
      return null;

    // === PADDING ===
    case 'padding':
      if (px !== null) return `p-${pxToTailwindSpacing(px)}`;
      return null;
    case 'paddingTop':
      if (px !== null) return `pt-${pxToTailwindSpacing(px)}`;
      return null;
    case 'paddingRight':
      if (px !== null) return `pr-${pxToTailwindSpacing(px)}`;
      return null;
    case 'paddingBottom':
      if (px !== null) return `pb-${pxToTailwindSpacing(px)}`;
      return null;
    case 'paddingLeft':
      if (px !== null) return `pl-${pxToTailwindSpacing(px)}`;
      return null;

    // === MARGIN ===
    case 'margin':
      if (value === 'auto' || value === '0 auto') return 'mx-auto';
      if (px !== null) return `m-${pxToTailwindSpacing(px)}`;
      return null;
    case 'marginTop':
      if (value === 'auto') return 'mt-auto';
      if (px !== null) return `mt-${pxToTailwindSpacing(px)}`;
      return null;
    case 'marginRight':
      if (value === 'auto') return 'mr-auto';
      if (px !== null) return `mr-${pxToTailwindSpacing(px)}`;
      return null;
    case 'marginBottom':
      if (value === 'auto') return 'mb-auto';
      if (px !== null) return `mb-${pxToTailwindSpacing(px)}`;
      return null;
    case 'marginLeft':
      if (value === 'auto') return 'ml-auto';
      if (px !== null) return `ml-${pxToTailwindSpacing(px)}`;
      return null;

    // === SIZING ===
    case 'width':
      if (value === 'auto') return 'w-auto';
      if (specialUnit === '100%') return 'w-full';
      if (specialUnit === '100vw') return 'w-screen';
      if (specialUnit === 'fit-content') return 'w-fit';
      if (specialUnit === 'max-content') return 'w-max';
      if (specialUnit === 'min-content') return 'w-min';
      if (specialUnit) return `w-[${specialUnit}]`;
      if (px !== null) return `w-${pxToTailwindSpacing(px)}`;
      return null;
    case 'height':
      if (value === 'auto') return 'h-auto';
      if (specialUnit === '100%') return 'h-full';
      if (specialUnit === '100vh') return 'h-screen';
      if (specialUnit === 'fit-content') return 'h-fit';
      if (specialUnit) return `h-[${specialUnit}]`;
      if (px !== null) return `h-${pxToTailwindSpacing(px)}`;
      return null;
    case 'minWidth':
      if (specialUnit === '100%') return 'min-w-full';
      if (value === '0') return 'min-w-0';
      if (px !== null) return `min-w-[${px}px]`;
      return null;
    case 'maxWidth':
      if (specialUnit === '100%') return 'max-w-full';
      if (value === 'none') return 'max-w-none';
      if (px !== null) {
        // Map to Tailwind max-w scale
        const maxWMap: Record<number, string> = {
          320: 'max-w-xs', 384: 'max-w-sm', 448: 'max-w-md',
          512: 'max-w-lg', 576: 'max-w-xl', 672: 'max-w-2xl',
          768: 'max-w-3xl', 896: 'max-w-4xl', 1024: 'max-w-5xl',
          1152: 'max-w-6xl', 1280: 'max-w-7xl',
        };
        if (maxWMap[px]) return maxWMap[px];
        return `max-w-[${px}px]`;
      }
      return null;
    case 'minHeight':
      if (specialUnit === '100vh') return 'min-h-screen';
      if (specialUnit === '100%') return 'min-h-full';
      if (px !== null) return `min-h-[${px}px]`;
      return null;
    case 'maxHeight':
      if (specialUnit === '100vh') return 'max-h-screen';
      if (specialUnit === '100%') return 'max-h-full';
      if (px !== null) return `max-h-[${px}px]`;
      return null;

    // === TYPOGRAPHY ===
    case 'fontSize':
      if (px !== null && FONT_SIZE_MAP[px]) return FONT_SIZE_MAP[px];
      if (px !== null) return `text-[${px}px]`;
      return null;
    case 'fontWeight':
      return FONT_WEIGHT_MAP[String(value)] || `font-[${value}]`;
    case 'lineHeight': {
      if (typeof value === 'number') {
        if (value <= 3) return `leading-${value === 1 ? 'none' : value === 1.25 ? 'tight' : value === 1.375 ? 'snug' : value === 1.5 ? 'normal' : value === 1.625 ? 'relaxed' : value === 2 ? 'loose' : `[${value}]`}`;
      }
      if (px !== null) return `leading-[${px}px]`;
      return null;
    }
    case 'letterSpacing': {
      const lsMap: Record<string, string> = {
        '-0.05em': 'tracking-tighter', '-0.025em': 'tracking-tight',
        '0': 'tracking-normal', '0em': 'tracking-normal',
        '0.025em': 'tracking-wide', '0.05em': 'tracking-wider',
        '0.1em': 'tracking-widest',
      };
      if (lsMap[String(value)]) return lsMap[String(value)];
      if (px !== null) return `tracking-[${px}px]`;
      return null;
    }
    case 'textAlign':
      return value === 'left' ? 'text-left' : value === 'center' ? 'text-center' : value === 'right' ? 'text-right' : value === 'justify' ? 'text-justify' : null;
    case 'textDecoration':
      if (value === 'underline') return 'underline';
      if (value === 'line-through') return 'line-through';
      if (value === 'none') return 'no-underline';
      return null;
    case 'textTransform':
      if (value === 'uppercase') return 'uppercase';
      if (value === 'lowercase') return 'lowercase';
      if (value === 'capitalize') return 'capitalize';
      if (value === 'none') return 'normal-case';
      return null;
    case 'fontFamily': {
      const familyMap: Record<string, string> = {
        'Inter': 'font-inter', 'Roboto': 'font-roboto', 'Poppins': 'font-poppins',
        'Montserrat': 'font-montserrat', 'Raleway': 'font-raleway',
        'Open Sans': 'font-open-sans', 'Lato': 'font-lato',
        'sans-serif': 'font-sans', 'serif': 'font-serif', 'monospace': 'font-mono',
      };
      const family = String(value).split(',')[0].trim().replace(/['"]/g, '');
      return familyMap[family] || `font-['${family.replace(/\s+/g, '_')}']`;
    }

    // === COLORS ===
    case 'color': {
      const textColor = colorToTailwind(String(value));
      if (textColor) return `text-${textColor}`;
      return `text-[${value}]`;
    }
    case 'textColor': {
      const tc = colorToTailwind(String(value));
      if (tc) return `text-${tc}`;
      return `text-[${value}]`;
    }
    case 'backgroundColor': {
      const bgColor = colorToTailwind(String(value));
      if (bgColor) return `bg-${bgColor}`;
      return `bg-[${value}]`;
    }

    // === BORDERS ===
    case 'borderRadius':
      if (px !== null) {
        if (px >= 9999) return 'rounded-full';
        const closest = Object.keys(RADIUS_MAP).map(Number).sort((a, b) => a - b)
          .find(k => Math.abs(k - px) <= 2);
        if (closest !== undefined) return RADIUS_MAP[closest];
        return `rounded-[${px}px]`;
      }
      return null;
    case 'borderWidth':
      if (px === 0) return 'border-0';
      if (px === 1) return 'border';
      if (px === 2) return 'border-2';
      if (px === 4) return 'border-4';
      if (px === 8) return 'border-8';
      if (px !== null) return `border-[${px}px]`;
      return null;
    case 'borderColor': {
      const bc = colorToTailwind(String(value));
      if (bc) return `border-${bc}`;
      return `border-[${value}]`;
    }
    case 'borderStyle':
      if (value === 'solid') return 'border-solid';
      if (value === 'dashed') return 'border-dashed';
      if (value === 'dotted') return 'border-dotted';
      if (value === 'none') return 'border-none';
      return null;

    // === EFFECTS ===
    case 'boxShadow':
      if (value === 'none') return 'shadow-none';
      // Try to map common shadow patterns
      if (String(value).includes('0 1px 2px')) return 'shadow-sm';
      if (String(value).includes('0 1px 3px')) return 'shadow';
      if (String(value).includes('0 4px 6px')) return 'shadow-md';
      if (String(value).includes('0 10px 15px')) return 'shadow-lg';
      if (String(value).includes('0 20px 25px')) return 'shadow-xl';
      if (String(value).includes('0 25px 50px')) return 'shadow-2xl';
      return `shadow-[${String(value).replace(/\s+/g, '_')}]`;
    case 'opacity':
      const opVal = typeof value === 'number' ? value : parseFloat(value);
      if (!isNaN(opVal)) {
        const percent = Math.round(opVal * 100);
        const opacityMap: Record<number, string> = {
          0: 'opacity-0', 5: 'opacity-5', 10: 'opacity-10', 15: 'opacity-15',
          20: 'opacity-20', 25: 'opacity-25', 30: 'opacity-30', 35: 'opacity-35',
          40: 'opacity-40', 45: 'opacity-45', 50: 'opacity-50', 55: 'opacity-55',
          60: 'opacity-60', 65: 'opacity-65', 70: 'opacity-70', 75: 'opacity-75',
          80: 'opacity-80', 85: 'opacity-85', 90: 'opacity-90', 95: 'opacity-95',
          100: 'opacity-100',
        };
        if (opacityMap[percent]) return opacityMap[percent];
        return `opacity-[${opVal}]`;
      }
      return null;

    // === OVERFLOW ===
    case 'overflow':
      return value === 'hidden' ? 'overflow-hidden' : value === 'auto' ? 'overflow-auto' : value === 'scroll' ? 'overflow-scroll' : value === 'visible' ? 'overflow-visible' : null;
    case 'overflowX':
      return value === 'hidden' ? 'overflow-x-hidden' : value === 'auto' ? 'overflow-x-auto' : value === 'scroll' ? 'overflow-x-scroll' : null;
    case 'overflowY':
      return value === 'hidden' ? 'overflow-y-hidden' : value === 'auto' ? 'overflow-y-auto' : value === 'scroll' ? 'overflow-y-scroll' : null;

    // === POSITION ===
    case 'position':
      return value === 'relative' ? 'relative' : value === 'absolute' ? 'absolute' : value === 'fixed' ? 'fixed' : value === 'sticky' ? 'sticky' : value === 'static' ? 'static' : null;
    case 'top':
      if (px === 0) return 'top-0';
      if (px !== null) return `top-[${px}px]`;
      if (specialUnit) return `top-[${specialUnit}]`;
      return null;
    case 'right':
      if (px === 0) return 'right-0';
      if (px !== null) return `right-[${px}px]`;
      return null;
    case 'bottom':
      if (px === 0) return 'bottom-0';
      if (px !== null) return `bottom-[${px}px]`;
      return null;
    case 'left':
      if (px === 0) return 'left-0';
      if (px !== null) return `left-[${px}px]`;
      return null;

    // === Z-INDEX ===
    case 'zIndex':
      const zMap: Record<number, string> = { 0: 'z-0', 10: 'z-10', 20: 'z-20', 30: 'z-30', 40: 'z-40', 50: 'z-50' };
      const zVal = typeof value === 'number' ? value : parseInt(value);
      if (zMap[zVal]) return zMap[zVal];
      return `z-[${zVal}]`;

    // === CURSOR ===
    case 'cursor':
      return `cursor-${value}`;

    // === GRID ===
    case 'gridTemplateColumns':
      return `grid-cols-[${String(value).replace(/\s+/g, '_')}]`;

    default:
      return null;
  }
}

/**
 * Flatten nested style structures into flat CSS properties
 */
function flattenStylesForTailwind(styles: Record<string, any>): Record<string, any> {
  const flattened: Record<string, any> = {};
  if (!styles) return flattened;

  Object.entries(styles).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (key === 'typography' && typeof value === 'object') {
      Object.assign(flattened, value);
    } else if (key === 'background' && typeof value === 'object') {
      if (value.color) flattened.backgroundColor = value.color;
      if (value.gradient) flattened.backgroundImage = value.gradient;
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
    } else if (key === 'position' && typeof value === 'object' && 'type' in value) {
      // Position object with type, top, left etc.
      flattened.position = value.type;
      if (value.top !== undefined) flattened.top = value.top;
      if (value.right !== undefined) flattened.right = value.right;
      if (value.bottom !== undefined) flattened.bottom = value.bottom;
      if (value.left !== undefined) flattened.left = value.left;
    } else {
      flattened[key] = value;
    }
  });

  return flattened;
}

/**
 * Convert a full style object into a Tailwind class string
 */
export function stylesToTailwindClasses(styles: Record<string, any>): string {
  if (!styles || Object.keys(styles).length === 0) return '';

  const flattened = flattenStylesForTailwind(styles);
  const classes: string[] = [];

  Object.entries(flattened).forEach(([prop, value]) => {
    const twClass = cssValueToTailwind(prop, value);
    if (twClass) classes.push(twClass);
  });

  return classes.join(' ');
}

/**
 * Convert responsive style overrides to Tailwind with prefixes
 */
export function responsiveStylesToTailwind(
  tabletStyles?: Record<string, any>,
  mobileStyles?: Record<string, any>
): string {
  const classes: string[] = [];

  if (tabletStyles && Object.keys(tabletStyles).length > 0) {
    const flattened = flattenStylesForTailwind(tabletStyles);
    Object.entries(flattened).forEach(([prop, value]) => {
      const twClass = cssValueToTailwind(prop, value);
      if (twClass) classes.push(`md:${twClass}`);
    });
  }

  if (mobileStyles && Object.keys(mobileStyles).length > 0) {
    const flattened = flattenStylesForTailwind(mobileStyles);
    Object.entries(flattened).forEach(([prop, value]) => {
      const twClass = cssValueToTailwind(prop, value);
      if (twClass) classes.push(`sm:${twClass}`);
    });
  }

  return classes.join(' ');
}
