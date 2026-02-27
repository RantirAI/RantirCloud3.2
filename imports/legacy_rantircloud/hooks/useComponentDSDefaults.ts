/**
 * useComponentDSDefaults Hook
 * 
 * Resolves Design System token references on a component instance,
 * providing live-synced values and detach/relink operations.
 */

import { useMemo, useCallback } from 'react';
import { useDesignTokenStore } from '@/stores/designTokenStore';
import { useDesignSystemStore } from '@/stores/designSystemStore';
import { 
  getDSDefaultsForType,
  getDSTokenRefForProperty,
  isPropertyDSLinked,
  detachPropertyFromDS,
  relinkPropertyToDS,
  DSTokenRef,
} from '@/lib/componentDSDefaults';

export interface ResolvedDSProperty {
  /** The CSS property name */
  propertyName: string;
  /** Whether this property is currently linked to DS */
  isLinked: boolean;
  /** The token reference name */
  tokenRef: string;
  /** The resolved value from the active design tokens */
  resolvedValue: string | undefined;
  /** Human-readable label */
  label: string;
  /** Token category */
  category: string;
}

/**
 * Hook to get all resolved DS defaults for a component
 */
export function useComponentDSDefaults(
  componentType: string | undefined,
  dsTokenRefs: Record<string, string> | undefined
) {
  const activeTokens = useDesignTokenStore(state => state.activeTokens);
  const dsConfig = useDesignSystemStore(state => state.config);

  const resolvedDefaults = useMemo(() => {
    if (!componentType) return new Map<string, ResolvedDSProperty>();

    const defaults = getDSDefaultsForType(componentType);
    if (!defaults) return new Map<string, ResolvedDSProperty>();

    const result = new Map<string, ResolvedDSProperty>();

    for (const [propName, tokenDef] of Object.entries(defaults)) {
      const isLinked = isPropertyDSLinked(dsTokenRefs, propName);
      const tokenRefName = dsTokenRefs?.[propName] || tokenDef.tokenRef;

      // Resolve the value from active tokens
      let resolvedValue: string | undefined;

      // First try designTokenStore (colors, fonts, borders)
      const token = activeTokens.get(tokenRefName);
      if (token) {
        resolvedValue = token.value;
      }

      // If not found in token store, try designSystemStore for border radius, shadows, spacing
      if (!resolvedValue && dsConfig) {
        // Border radius tokens
        if (tokenDef.category === 'border') {
          const radiusToken = dsConfig.borderRadius?.scale?.find(
            t => t.name === tokenRefName || t.cssVar === `--${tokenRefName}`
          );
          if (radiusToken) {
            resolvedValue = radiusToken.value;
          }
        }
        // Shadow tokens
        if (tokenDef.category === 'shadow') {
          const shadowToken = dsConfig.shadows?.scale?.find(
            t => t.name === tokenRefName || t.cssVar === `--${tokenRefName}`
          );
          if (shadowToken) {
            resolvedValue = shadowToken.value;
          }
        }
        // Spacing tokens
        if (tokenDef.category === 'spacing') {
          const spacingToken = dsConfig.spacing?.scale?.find(
            t => t.name === tokenRefName || t.cssVar === `--${tokenRefName}`
          );
          if (spacingToken) {
            resolvedValue = spacingToken.value;
          }
        }
      }

      result.set(propName, {
        propertyName: propName,
        isLinked,
        tokenRef: tokenRefName,
        resolvedValue,
        label: tokenDef.label,
        category: tokenDef.category,
      });
    }

    return result;
  }, [componentType, dsTokenRefs, activeTokens, dsConfig]);

  return resolvedDefaults;
}

/**
 * Hook to check if a single property is DS-linked and get its resolved value
 */
export function useDSPropertyStatus(
  componentType: string | undefined,
  propertyName: string,
  dsTokenRefs: Record<string, string> | undefined
): {
  isLinked: boolean;
  tokenRef: string | undefined;
  resolvedValue: string | undefined;
  label: string | undefined;
} {
  const activeTokens = useDesignTokenStore(state => state.activeTokens);
  const dsConfig = useDesignSystemStore(state => state.config);

  return useMemo(() => {
    if (!componentType) {
      return { isLinked: false, tokenRef: undefined, resolvedValue: undefined, label: undefined };
    }

    const isLinked = isPropertyDSLinked(dsTokenRefs, propertyName);
    if (!isLinked) {
      return { isLinked: false, tokenRef: undefined, resolvedValue: undefined, label: undefined };
    }

    const tokenRefName = dsTokenRefs?.[propertyName];
    if (!tokenRefName) {
      return { isLinked: false, tokenRef: undefined, resolvedValue: undefined, label: undefined };
    }

    const tokenDef = getDSTokenRefForProperty(componentType, propertyName);
    let resolvedValue: string | undefined;

    // Resolve from token store
    const token = activeTokens.get(tokenRefName);
    if (token) {
      resolvedValue = token.value;
    }

    // Try DS store for radius/shadow/spacing
    if (!resolvedValue && dsConfig && tokenDef) {
      if (tokenDef.category === 'border') {
        const t = dsConfig.borderRadius?.scale?.find(s => s.name === tokenRefName);
        if (t) resolvedValue = t.value;
      }
      if (tokenDef.category === 'shadow') {
        const t = dsConfig.shadows?.scale?.find(s => s.name === tokenRefName);
        if (t) resolvedValue = t.value;
      }
      if (tokenDef.category === 'spacing') {
        const t = dsConfig.spacing?.scale?.find(s => s.name === tokenRefName);
        if (t) resolvedValue = t.value;
      }
    }

    return {
      isLinked,
      tokenRef: tokenRefName,
      resolvedValue,
      label: tokenDef?.label,
    };
  }, [componentType, propertyName, dsTokenRefs, activeTokens, dsConfig]);
}

/**
 * Hook providing detach/relink actions for DS properties
 */
export function useDSPropertyActions(
  componentId: string | undefined,
  componentType: string | undefined,
  dsTokenRefs: Record<string, string> | undefined,
  onUpdateDSRefs: (refs: Record<string, string>) => void
) {
  const detach = useCallback((propertyName: string) => {
    if (!dsTokenRefs) return;
    const updated = detachPropertyFromDS(dsTokenRefs, propertyName);
    onUpdateDSRefs(updated);
  }, [dsTokenRefs, onUpdateDSRefs]);

  const relink = useCallback((propertyName: string) => {
    if (!componentType) return;
    const updated = relinkPropertyToDS(
      dsTokenRefs || {},
      componentType,
      propertyName
    );
    if (updated) {
      onUpdateDSRefs(updated);
    }
  }, [componentType, dsTokenRefs, onUpdateDSRefs]);

  const isLinked = useCallback((propertyName: string) => {
    return isPropertyDSLinked(dsTokenRefs, propertyName);
  }, [dsTokenRefs]);

  const canRelink = useCallback((propertyName: string) => {
    if (!componentType) return false;
    return !!getDSTokenRefForProperty(componentType, propertyName);
  }, [componentType]);

  return { detach, relink, isLinked, canRelink };
}
