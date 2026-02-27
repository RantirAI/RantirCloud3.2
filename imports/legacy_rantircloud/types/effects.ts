// Box Shadow types
export interface BoxShadowItem {
  id: string;
  enabled: boolean;
  type: 'outer' | 'inner'; // inset toggle
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string; // with opacity support (rgba/hsla)
}

// Filter types
export type FilterFunction = 
  | 'blur' 
  | 'brightness' 
  | 'contrast' 
  | 'drop-shadow' 
  | 'grayscale' 
  | 'hue-rotate' 
  | 'invert' 
  | 'opacity' 
  | 'saturate' 
  | 'sepia';

export interface FilterItem {
  id: string;
  enabled: boolean;
  function: FilterFunction;
  value: number;
  unit: 'px' | '%' | 'deg'; // adapts per function
}

// Transition types
export type EasingFunction = 
  | 'ease' 
  | 'linear' 
  | 'ease-in' 
  | 'ease-out' 
  | 'ease-in-out' 
  | string; // for cubic-bezier

export interface TransitionItem {
  id: string;
  enabled: boolean;
  property: string; // 'all', 'opacity', 'transform', etc.
  duration: number; // ms
  delay: number; // ms
  easing: EasingFunction;
}

// Transform types (grouped)
export interface TransformAxis {
  x: number;
  y: number;
  z?: number;
  linked: boolean;
  enabled?: boolean;
}

export interface TransformValues {
  translate: TransformAxis & { unit: 'px' | '%' };
  scale: TransformAxis;
  rotate: TransformAxis;
  skew: Omit<TransformAxis, 'z'>;
}

// Default values
export const defaultTransformValues: TransformValues = {
  translate: { x: 0, y: 0, z: 0, linked: false, unit: 'px' },
  scale: { x: 100, y: 100, z: 100, linked: true },
  rotate: { x: 0, y: 0, z: 0, linked: false },
  skew: { x: 0, y: 0, linked: false }
};

export const defaultBoxShadow: BoxShadowItem = {
  id: '',
  enabled: true,
  type: 'outer',
  x: 0,
  y: 4,
  blur: 6,
  spread: 0,
  color: 'rgba(0,0,0,0.1)'
};

export const defaultFilter: FilterItem = {
  id: '',
  enabled: true,
  function: 'blur',
  value: 0,
  unit: 'px'
};

export const defaultTransition: TransitionItem = {
  id: '',
  enabled: true,
  property: 'all',
  duration: 200,
  delay: 0,
  easing: 'ease'
};

export const defaultTransforms: TransformValues = {
  translate: { x: 0, y: 0, z: 0, linked: false, unit: 'px', enabled: true },
  scale: { x: 100, y: 100, z: 100, linked: true, enabled: true },
  rotate: { x: 0, y: 0, z: 0, linked: false, enabled: true },
  skew: { x: 0, y: 0, linked: false, enabled: true }
};

// Helper to get filter unit based on function
export const getFilterUnit = (fn: FilterFunction): 'px' | '%' | 'deg' => {
  switch (fn) {
    case 'blur':
      return 'px';
    case 'hue-rotate':
      return 'deg';
    default:
      return '%';
  }
};

// Helper to get filter default value based on function
export const getFilterDefaultValue = (fn: FilterFunction): number => {
  switch (fn) {
    case 'blur':
      return 0;
    case 'brightness':
    case 'contrast':
    case 'saturate':
    case 'opacity':
      return 100;
    case 'grayscale':
    case 'sepia':
    case 'invert':
      return 0;
    case 'hue-rotate':
      return 0;
    default:
      return 0;
  }
};

// CSS generation helpers
export const generateBoxShadowCSS = (shadows: BoxShadowItem[]): string => {
  const enabledShadows = shadows.filter(s => s.enabled);
  if (enabledShadows.length === 0) return 'none';
  
  return enabledShadows
    .map(s => `${s.type === 'inner' ? 'inset ' : ''}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`)
    .join(', ');
};

export const generateFilterCSS = (filters: FilterItem[]): string => {
  const enabledFilters = filters.filter(f => f.enabled);
  if (enabledFilters.length === 0) return 'none';
  
  return enabledFilters
    .map(f => `${f.function}(${f.value}${f.unit})`)
    .join(' ');
};

export const generateTransitionCSS = (transitions: TransitionItem[]): string => {
  const enabledTransitions = transitions.filter(t => t.enabled);
  if (enabledTransitions.length === 0) return 'none';
  
  return enabledTransitions
    .map(t => `${t.property} ${t.duration}ms ${t.easing} ${t.delay}ms`)
    .join(', ');
};

export const generateTransformCSS = (transforms: TransformValues): string => {
  const parts: string[] = [];
  
  const { translate, scale, rotate, skew } = transforms;
  
  // Translate (only if enabled)
  if (translate.enabled !== false && (translate.x !== 0 || translate.y !== 0 || (translate.z && translate.z !== 0))) {
    if (translate.z && translate.z !== 0) {
      parts.push(`translate3d(${translate.x}${translate.unit}, ${translate.y}${translate.unit}, ${translate.z}${translate.unit})`);
    } else {
      parts.push(`translate(${translate.x}${translate.unit}, ${translate.y}${translate.unit})`);
    }
  }
  
  // Scale (stored as percentage, output as decimal) - only if enabled
  if (scale.enabled !== false && (scale.x !== 100 || scale.y !== 100 || (scale.z && scale.z !== 100))) {
    if (scale.z && scale.z !== 100) {
      parts.push(`scale3d(${scale.x / 100}, ${scale.y / 100}, ${scale.z / 100})`);
    } else {
      parts.push(`scale(${scale.x / 100}, ${scale.y / 100})`);
    }
  }
  
  // Rotate - only if enabled
  if (rotate.enabled !== false && (rotate.x !== 0 || rotate.y !== 0 || (rotate.z && rotate.z !== 0))) {
    if (rotate.x !== 0) parts.push(`rotateX(${rotate.x}deg)`);
    if (rotate.y !== 0) parts.push(`rotateY(${rotate.y}deg)`);
    if (rotate.z && rotate.z !== 0) parts.push(`rotateZ(${rotate.z}deg)`);
  }
  
  // Skew - only if enabled
  if (skew.enabled !== false && (skew.x !== 0 || skew.y !== 0)) {
    parts.push(`skew(${skew.x}deg, ${skew.y}deg)`);
  }
  
  return parts.length > 0 ? parts.join(' ') : 'none';
};
