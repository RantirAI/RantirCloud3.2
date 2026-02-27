/**
 * Hook to compute inherited styles from parent components
 * Used by StylesTab to show yellow (inherited) and blue (override) indicators
 */

import { useMemo } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useClassStore } from '@/stores/classStore';
import { 
  extractInheritableStyles, 
  mergeInheritedStyles,
  InheritedStylesResult 
} from '@/lib/parentStyleInheritance';
import { AppComponent } from '@/types/appBuilder';

/**
 * Recursively find a component and its parent chain by ID
 */
function findComponentWithParents(
  components: AppComponent[],
  targetId: string,
  parentChain: AppComponent[] = []
): { component: AppComponent | null; parents: AppComponent[] } {
  for (const comp of components) {
    if (comp.id === targetId) {
      return { component: comp, parents: parentChain };
    }
    if (comp.children && comp.children.length > 0) {
      const result = findComponentWithParents(comp.children, targetId, [...parentChain, comp]);
      if (result.component) {
        return result;
      }
    }
  }
  return { component: null, parents: [] };
}

/**
 * Components that can propagate typography/color inheritance to children
 */
const INHERITABLE_CONTAINER_TYPES = new Set([
  'section',
  'div',
  'container',
  'column',
  'grid',
  'card',
  'flex',
  'box',
  'link-block',
  'page-body', // Virtual - handled separately
]);

/**
 * Hook to compute parent inherited styles for a component
 * Returns the same structure as the ComponentRenderer passes: _inheritedStyles and _inheritedStyleSources
 */
export function useParentInheritedStyles(componentId: string | null) {
  const { currentProject, currentPage } = useAppBuilderStore();
  const { classes } = useClassStore();

  return useMemo(() => {
    const empty: InheritedStylesResult = { styles: {}, sources: {} };
    
    if (!componentId || !currentProject || !currentPage) {
      return empty;
    }

    const pageData = currentProject.pages.find(p => p.id === currentPage);
    if (!pageData) {
      return empty;
    }

    // Find the component and its parent chain
    const { component, parents } = findComponentWithParents(pageData.components || [], componentId);
    if (!component) {
      return empty;
    }

    // Start with Page Body settings as the root of inheritance
    let inheritedResult: InheritedStylesResult = { styles: {}, sources: {} };
    
    // Extract from Page Body (pageData.settings.styles or bodyClassSelector)
    const pageBodySettings = (pageData as any).settings || {};
    const pageBodyClasses: string[] = pageBodySettings.appliedClasses || [];
    
    // Extract inheritable styles from page body
    const pageBodyInheritable = extractInheritableStyles(
      pageBodySettings,
      pageBodyClasses,
      classes,
      'page-body'
    );
    
    inheritedResult = mergeInheritedStyles(
      inheritedResult.styles,
      inheritedResult.sources,
      pageBodyInheritable.styles,
      pageBodyInheritable.sources
    );

    // Walk through parent chain (from root to immediate parent)
    for (const parent of parents) {
      // Only propagate from container-type components
      if (!INHERITABLE_CONTAINER_TYPES.has(parent.type)) {
        continue;
      }

      const parentProps = parent.props || {};
      const parentClasses: string[] = Array.isArray(parentProps.appliedClasses) 
        ? parentProps.appliedClasses 
        : [];

      // Extract this parent's inheritable styles from RAW props (not merged defaults)
      const parentInheritable = extractInheritableStyles(
        parentProps,
        parentClasses,
        classes,
        parent.id
      );

      // Merge: parent's own styles override grandparent inherited styles
      inheritedResult = mergeInheritedStyles(
        inheritedResult.styles,
        inheritedResult.sources,
        parentInheritable.styles,
        parentInheritable.sources
      );
    }

    return inheritedResult;
  }, [componentId, currentProject, currentPage, classes]);
}
