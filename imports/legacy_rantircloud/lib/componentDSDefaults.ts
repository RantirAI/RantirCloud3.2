/**
 * Component Design System Defaults Registry
 * 
 * Maps component types to their default Design System token references.
 * When a component is dropped onto the canvas, these token refs are stored
 * on the component instance as `_dsTokenRefs`. The renderer resolves them
 * against active design tokens for live sync.
 * 
 * Token ref format: { [cssProperty]: tokenRefName }
 * The tokenRefName maps to a token in designTokenStore or designSystemStore.
 */

export interface DSTokenRef {
  /** The design token name (e.g., 'button-radius', 'font-heading') */
  tokenRef: string;
  /** Token category for lookup routing */
  category: 'color' | 'font' | 'border' | 'spacing' | 'shadow' | 'typography';
  /** Human-readable label for the inspector */
  label: string;
  /** Fallback value if the token is not found */
  fallback?: string;
}

export type ComponentDSDefaults = Record<string, DSTokenRef>;

/**
 * Registry of default Design System token references per component type.
 * Each key is a CSS property name, and the value describes which DS token controls it.
 */
export const COMPONENT_DS_DEFAULTS: Record<string, ComponentDSDefaults> = {
  // ─── BUTTON ───────────────────────────────────────────────
  button: {
    borderRadius: {
      tokenRef: 'button-radius',
      category: 'border',
      label: 'Button Radius',
      fallback: '0px',
    },
    fontFamily: {
      tokenRef: 'font-body',
      category: 'font',
      label: 'Body Font',
    },
    backgroundColor: {
      tokenRef: 'primary',
      category: 'color',
      label: 'Primary Color',
      fallback: 'hsl(221.2 83.2% 53.3%)',
    },
    color: {
      tokenRef: 'primary-foreground',
      category: 'color',
      label: 'Primary Foreground',
      fallback: 'hsl(210 40% 98%)',
    },
    paddingLeft: {
      tokenRef: 'button-padding-x',
      category: 'spacing',
      label: 'Button Horizontal Padding',
      fallback: '12px',
    },
    paddingRight: {
      tokenRef: 'button-padding-x',
      category: 'spacing',
      label: 'Button Horizontal Padding',
      fallback: '12px',
    },
  },

  // ─── INPUT ────────────────────────────────────────────────
  input: {
    borderRadius: {
      tokenRef: 'input-radius',
      category: 'border',
      label: 'Input Radius',
    },
    fontFamily: {
      tokenRef: 'font-body',
      category: 'font',
      label: 'Body Font',
    },
    borderColor: {
      tokenRef: 'border',
      category: 'color',
      label: 'Border Color',
    },
    backgroundColor: {
      tokenRef: 'background',
      category: 'color',
      label: 'Background',
    },
    height: {
      tokenRef: 'input-height',
      category: 'spacing',
      label: 'Input Height',
      fallback: '36px',
    },
    paddingLeft: {
      tokenRef: 'input-padding',
      category: 'spacing',
      label: 'Input Padding',
      fallback: '12px',
    },
    paddingRight: {
      tokenRef: 'input-padding',
      category: 'spacing',
      label: 'Input Padding',
      fallback: '12px',
    },
  },

  // ─── CARD ─────────────────────────────────────────────────
  card: {
    borderRadius: {
      tokenRef: 'card-radius',
      category: 'border',
      label: 'Card Radius',
    },
    boxShadow: {
      tokenRef: 'shadow-md',
      category: 'shadow',
      label: 'Medium Shadow',
    },
    backgroundColor: {
      tokenRef: 'surface',
      category: 'color',
      label: 'Surface Color',
    },
  },

  // Also apply to 'container' when used as a card-like element
  container: {
    borderRadius: {
      tokenRef: 'card-radius',
      category: 'border',
      label: 'Card Radius',
    },
  },

  // ─── HEADING (H1–H6) ─────────────────────────────────────
  heading: {
    fontFamily: {
      tokenRef: 'font-heading',
      category: 'font',
      label: 'Heading Font',
    },
    color: {
      tokenRef: 'foreground',
      category: 'color',
      label: 'Foreground',
    },
  },

  // ─── TEXT (Body) ──────────────────────────────────────────
  text: {
    fontFamily: {
      tokenRef: 'font-body',
      category: 'font',
      label: 'Body Font',
    },
    color: {
      tokenRef: 'foreground',
      category: 'color',
      label: 'Foreground',
    },
  },

  // ─── FORM WRAPPER ─────────────────────────────────────────
  'form-wrapper': {
    borderRadius: {
      tokenRef: 'card-radius',
      category: 'border',
      label: 'Card Radius',
    },
    backgroundColor: {
      tokenRef: 'surface',
      category: 'color',
      label: 'Surface Color',
    },
  },
};

/**
 * Get DS defaults for a given component type.
 * Returns undefined if the component type has no DS defaults.
 */
export function getDSDefaultsForType(componentType: string): ComponentDSDefaults | undefined {
  // Normalize type — h1-h6 map to heading
  const normalized = componentType.toLowerCase();
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(normalized)) {
    return COMPONENT_DS_DEFAULTS['heading'];
  }
  return COMPONENT_DS_DEFAULTS[normalized];
}

/**
 * Check if a component type has Design System defaults
 */
export function hasDSDefaults(componentType: string): boolean {
  return getDSDefaultsForType(componentType) !== undefined;
}

/**
 * Get the DS token ref for a specific property on a component type.
 * Returns undefined if no DS default exists for that property.
 */
export function getDSTokenRefForProperty(
  componentType: string,
  propertyName: string
): DSTokenRef | undefined {
  const defaults = getDSDefaultsForType(componentType);
  return defaults?.[propertyName];
}

/**
 * Generate the initial `_dsTokenRefs` object for a newly created component.
 * This is stored on `component.props._dsTokenRefs`.
 */
export function generateInitialDSTokenRefs(componentType: string): Record<string, string> | undefined {
  const defaults = getDSDefaultsForType(componentType);
  if (!defaults) return undefined;

  const refs: Record<string, string> = {};
  for (const [propName, tokenDef] of Object.entries(defaults)) {
    refs[propName] = tokenDef.tokenRef;
  }
  return refs;
}

/**
 * Check if a property on a component is still linked to Design System.
 * A property is linked if:
 * 1. The component has `_dsTokenRefs` with that property
 * 2. The property value hasn't been explicitly overridden (checked externally)
 */
export function isPropertyDSLinked(
  dsTokenRefs: Record<string, string> | undefined,
  propertyName: string
): boolean {
  return !!dsTokenRefs?.[propertyName];
}

/**
 * Detach a property from the Design System.
 * Returns a new `_dsTokenRefs` object with the property removed.
 */
export function detachPropertyFromDS(
  dsTokenRefs: Record<string, string>,
  propertyName: string
): Record<string, string> {
  const updated = { ...dsTokenRefs };
  delete updated[propertyName];
  return updated;
}

/**
 * Re-link a property to the Design System.
 * Returns a new `_dsTokenRefs` object with the property restored from defaults.
 */
export function relinkPropertyToDS(
  dsTokenRefs: Record<string, string>,
  componentType: string,
  propertyName: string
): Record<string, string> | null {
  const tokenRef = getDSTokenRefForProperty(componentType, propertyName);
  if (!tokenRef) return null;

  return {
    ...dsTokenRefs,
    [propertyName]: tokenRef.tokenRef,
  };
}

/**
 * Resolve a DS token ref to its actual CSS value.
 * Looks up the token in the activeTokens map, falling back to the registry's fallback.
 */
export function resolveDSTokenValue(
  tokenRefName: string,
  componentType: string,
  propertyName: string,
  activeTokens: Map<string, { value: string; cssVar?: string }>
): string | undefined {
  // Try resolving from active tokens
  const token = activeTokens.get(tokenRefName);
  if (token?.value) {
    // Font tokens need normalization
    if (tokenRefName === 'font-heading' || tokenRefName === 'font-body' || tokenRefName === 'font-mono') {
      const trimmed = String(token.value).trim();
      if (trimmed && !trimmed.includes(',')) {
        const fontName = trimmed.replace(/["']/g, '');
        const primary = fontName.includes(' ') ? `"${fontName}"` : fontName;
        const fallback = tokenRefName === 'font-mono'
          ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
          : 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        return `${primary}, ${fallback}`;
      }
      return trimmed;
    }
    
    // Spacing values may need px suffix
    if (['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'height', 'minHeight'].includes(propertyName)) {
      const val = token.value.trim();
      if (/^\d+$/.test(val)) return `${val}px`;
    }
    
    return token.value;
  }

  // Fall back to the registry's default
  const defaults = getDSDefaultsForType(componentType);
  return defaults?.[propertyName]?.fallback;
}

/**
 * Resolve all DS-linked properties for a component into a CSS styles object.
 * Only includes properties that are still linked (present in _dsTokenRefs)
 * and not explicitly overridden (the component prop is empty/undefined).
 */
export function resolveAllDSStyles(
  componentType: string,
  componentProps: Record<string, any>,
  activeTokens: Map<string, { value: string; cssVar?: string }>
): Record<string, string> {
  const dsTokenRefs = componentProps?._dsTokenRefs as Record<string, string> | undefined;
  if (!dsTokenRefs) return {};

  const resolvedStyles: Record<string, string> = {};

  for (const [propName, tokenRefName] of Object.entries(dsTokenRefs)) {
    // Skip if the component has an explicit override for this property
    const currentValue = componentProps?.[propName];
    const hasExplicitValue = currentValue !== undefined && currentValue !== null && currentValue !== '';
    
    // For borderRadius, check the object form too
    if (propName === 'borderRadius' && componentProps?.borderRadius) {
      const br = componentProps.borderRadius;
      const hasNonZeroRadius = (Number(br.topLeft) || 0) > 0 || (Number(br.topRight) || 0) > 0 ||
                                (Number(br.bottomLeft) || 0) > 0 || (Number(br.bottomRight) || 0) > 0;
      const isLocked = componentProps?.__lockedProps?.borderRadius === true;
      if (hasNonZeroRadius || isLocked) continue;
    }
    
    // Skip color/bg if explicitly set
    if (hasExplicitValue && propName !== 'borderRadius') continue;
    
    const resolved = resolveDSTokenValue(tokenRefName, componentType, propName, activeTokens);
    if (resolved) {
      resolvedStyles[propName] = resolved;
    }
  }

  return resolvedStyles;
}
