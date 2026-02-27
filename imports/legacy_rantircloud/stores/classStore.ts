import { create } from 'zustand';
import { ClassStore, StyleClass, PseudoState, ComponentPropertySources } from '@/types/classes';
import { useAppBuilderStore } from './appBuilderStore';
import { useUserComponentStore } from './userComponentStore';
import { appBuilderService } from '@/services/appBuilderService';
import { toast } from '@/components/ui/sonner';
import { mergeClassProperties, removeClassProperties } from '@/lib/classPropertyMerger';
import { setIsApplyingClass, getEditorComponentId } from '@/lib/autoClassState';
import { getDefaultPropsForComponent } from '@/lib/componentPropertyConfig';
import { getIsAIBuilding } from '@/lib/aiBuildState';
import { 
  embeddedToStyleClass, 
  styleClassToEmbedded, 
  StyleClassesConfig,
  createDefaultStyleClassesConfig 
} from '@/types/styleClasses';

// Debounce timer for saving classes to project
let saveClassesTimer: NodeJS.Timeout | null = null;
const SAVE_DEBOUNCE_MS = 500;

/**
 * Sanitize class styles by removing properties that match common defaults
 * This cleans up classes that incorrectly saved default/unchanged values
 * IMPORTANT: Atomic object properties (border, borderRadius, spacingControl) 
 * must be preserved as complete objects, not sanitized recursively
 */
const sanitizeClassStyles = (styles: Record<string, any>): Record<string, any> => {
  const defaultValues: Record<string, any> = {
    // Common defaults that should NOT be saved to classes
    display: 'block',
    position: 'relative',
    opacity: 1,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    overflow: 'visible',
    overflowX: 'visible',
    overflowY: 'visible',
    cursor: 'auto',
    zIndex: 0,
  };
  
  // Sizing values that are effectively defaults and should be removed
  // These patterns match CSS browser defaults that shouldn't be explicitly set
  const sizingDefaultPatterns: Record<string, (val: any) => boolean> = {
    width: (val) => val === 'auto' || val === '' || (typeof val === 'object' && (val?.value === 'auto' || val?.unit === 'auto')),
    height: (val) => val === 'auto' || val === '' || (typeof val === 'object' && (val?.value === 'auto' || val?.unit === 'auto')),
    minWidth: (val) => val === '0' || val === '0px' || val === 0 || (typeof val === 'object' && (val?.value === '0' || val?.value === 0)),
    minHeight: (val) => val === '0' || val === '0px' || val === 0 || (typeof val === 'object' && (val?.value === '0' || val?.value === 0)),
    maxWidth: (val) => val === 'none' || val === 'auto' || val === '' || (typeof val === 'object' && (val?.value === 'none' || val?.unit === 'auto')),
    maxHeight: (val) => val === 'none' || val === 'auto' || val === '' || (typeof val === 'object' && (val?.value === 'none' || val?.unit === 'auto')),
  };
  
  // Atomic object properties - preserve as complete objects, don't sanitize recursively
  // CRITICAL: backgroundColor can be an object { type: 'solid', value, opacity }
  // CRITICAL: backgroundImage can be an object { value, opacity, size, position, repeat }
  // CRITICAL: Sizing properties can be objects { value: '100', unit: 'px' }
  const atomicObjectProperties = [
    'border', 'borderRadius', 'spacingControl', 
    'backgroundColor', 'backgroundGradient', 'backgroundImage', 'backgroundLayerOrder',
    // Sizing dimension objects must be preserved as-is
    'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight'
  ];
  
  const sanitizeRecursive = (obj: Record<string, any>, depth: number = 0): Record<string, any> => {
    const result: Record<string, any> = {};
    
    for (const key in obj) {
      const value = obj[key];
      
      // Skip if value matches a known default
      if (defaultValues[key] !== undefined && value === defaultValues[key]) {
        continue;
      }
      
      // Skip sizing values that match browser defaults
      if (sizingDefaultPatterns[key] && sizingDefaultPatterns[key](value)) {
        console.log('[ClassStore] Skipping default sizing value:', { key, value });
        continue;
      }
      
      // Skip empty values
      if (value === undefined || value === null || value === '') {
        continue;
      }
      
      // CRITICAL: Preserve atomic object properties as-is (don't recurse into them)
      // This ensures border, borderRadius, spacingControl, and sizing objects are saved complete
      if (depth === 0 && atomicObjectProperties.includes(key)) {
        if (value !== null && typeof value === 'object') {
          // For sizing properties with { value, unit }, check if it's a valid non-default value
          if ('value' in value && 'unit' in value) {
            // Skip if this is a default sizing value
            if (sizingDefaultPatterns[key] && sizingDefaultPatterns[key](value)) {
              console.log('[ClassStore] Skipping default sizing object:', { key, value });
              continue;
            }
          }
          result[key] = value; // Keep the complete object
        } else if (value !== undefined && value !== null && value !== '') {
          // Also preserve string values for sizing (e.g., '500px')
          result[key] = value;
        }
        continue;
      }
      
      // Recursively sanitize nested objects (but not atomic ones)
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        const sanitizedNested = sanitizeRecursive(value, depth + 1);
        if (Object.keys(sanitizedNested).length > 0) {
          result[key] = sanitizedNested;
        }
      } else {
        result[key] = value;
      }
    }
    
    return result;
  };
  
  return sanitizeRecursive(styles);
};

// Helper to save classes to project atomically
const saveClassesToProject = async (classes: StyleClass[], styleHashRegistry: Record<string, string> = {}) => {
  const { currentProject } = useAppBuilderStore.getState();
  if (!currentProject) return;

  const styleClassesConfig: StyleClassesConfig = {
    version: 1,
    classes: classes.map(styleClassToEmbedded),
    styleHashRegistry,
    namingConfig: currentProject.style_classes?.namingConfig || { counters: {} }
  };

  try {
    // Only update style_classes, don't overwrite the entire project
    // This prevents race conditions with component additions
    await appBuilderService.updateAppProject(currentProject.id, {
      style_classes: styleClassesConfig
    });
    
    // CRITICAL FIX: Use functional setState to avoid stale state race conditions
    // Previously we read freshProject and spread it, which could lose components
    // added by AI during the debounce period. Now we atomically update only style_classes.
    useAppBuilderStore.setState((state) => {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          style_classes: styleClassesConfig
        }
      };
    });
    
    console.log('[ClassStore] Saved classes to project:', classes.length);
  } catch (error) {
    console.error('[ClassStore] Failed to save classes:', error);
  }
};

// Debounced save
const debouncedSaveClasses = (classes: StyleClass[]) => {
  if (saveClassesTimer) {
    clearTimeout(saveClassesTimer);
  }
  saveClassesTimer = setTimeout(() => {
    saveClassesToProject(classes);
  }, SAVE_DEBOUNCE_MS);
};

/**
 * Recursively collect all property keys from a styles object (including nested paths)
 * Used to identify properties "owned" by secondary classes
 */
const collectAllPropertyKeys = (
  styles: Record<string, any>,
  prefix: string,
  keys: Set<string>
): void => {
  for (const key in styles) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = styles[key];
    
    // Add this key
    keys.add(fullKey);
    
    // Also add just the top-level key for simple filtering
    if (!prefix) {
      keys.add(key);
    }
    
    // Recurse into nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      collectAllPropertyKeys(value, fullKey, keys);
    }
  }
};

/**
 * Filter out properties from primary class that are defined in secondary classes
 * This prevents primary class updates from overwriting secondary class customizations
 */
const filterOutSecondaryProperties = (
  primaryStyles: Record<string, any>,
  secondaryKeys: Set<string>,
  prefix: string = ''
): Record<string, any> => {
  const result: Record<string, any> = {};
  
  for (const key in primaryStyles) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = primaryStyles[key];
    
    // Skip if this exact key OR its top-level parent is owned by secondary
    if (secondaryKeys.has(fullKey) || secondaryKeys.has(key)) {
      continue;
    }
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively filter nested objects
      const filtered = filterOutSecondaryProperties(value, secondaryKeys, fullKey);
      if (Object.keys(filtered).length > 0) {
        result[key] = filtered;
      }
    } else {
      result[key] = value;
    }
  }
  
  return result;
};

export const useClassStore = create<ClassStore>((set, get) => ({
  classes: [],
  selectedClass: null,
  selectedState: 'none' as PseudoState,
  isClassPanelOpen: false,
  editingClassName: null,

  loadClasses: async (appProjectId: string) => {
    try {
      // Load project to get embedded classes
      const project = await appBuilderService.getAppProject(appProjectId);
      
      if (!project) {
        console.warn('[ClassStore] Project not found:', appProjectId);
        set({ classes: [] });
        return;
      }

      const styleClassesConfig = project.style_classes || createDefaultStyleClassesConfig();
      const loadedClasses = styleClassesConfig.classes.map(embeddedToStyleClass);
      
      // CLEANUP: Remove duplicate classes with the same name
      const classMap = new Map<string, StyleClass>();
      
      loadedClasses.forEach(cls => {
        const existing = classMap.get(cls.name);
        if (existing) {
          // Keep the newer one
          if (new Date(cls.createdAt) > new Date(existing.createdAt)) {
            classMap.set(cls.name, cls);
            console.log('[ClassStore] Found duplicate class, keeping newer:', { 
              kept: cls.id, 
              deleted: existing.id, 
              name: cls.name 
            });
          }
        } else {
          classMap.set(cls.name, cls);
        }
      });
      
      const uniqueClasses = Array.from(classMap.values());
      
      // PHASE 4: Sanitize classes - remove properties that match defaults
      // This cleans up legacy classes that incorrectly saved default values
      const sanitizedClasses = uniqueClasses.map(cls => {
        const sanitizedStyles = sanitizeClassStyles(cls.styles);
        const stylesDiffer = JSON.stringify(sanitizedStyles) !== JSON.stringify(cls.styles);
        
        if (stylesDiffer) {
          console.log('[ClassStore] Sanitized class styles:', {
            className: cls.name,
            original: Object.keys(cls.styles),
            sanitized: Object.keys(sanitizedStyles)
          });
        }
        
        return {
          ...cls,
          styles: sanitizedStyles
        };
      });
      
      // If we removed duplicates or sanitized classes, save the cleaned data
      const needsSave = uniqueClasses.length !== loadedClasses.length ||
        sanitizedClasses.some((cls, i) => 
          JSON.stringify(cls.styles) !== JSON.stringify(uniqueClasses[i].styles)
        );
      
      if (needsSave) {
        console.log('[ClassStore] Cleaning up classes (duplicates or default values)');
        debouncedSaveClasses(sanitizedClasses);
      }
      
      set({ classes: sanitizedClasses });
      console.log('[ClassStore] Loaded classes from project:', sanitizedClasses.length);
      
      // AUTO-RECONCILE: Clean up orphaned classes on every project load
      // This removes classes that reference deleted components
      // GUARD: Skip reconciliation if AI is actively building to prevent deleting valid classes
      setTimeout(async () => {
        if (getIsAIBuilding()) {
          console.log('[ClassStore] Skipping auto-reconciliation - AI build in progress');
          return;
        }
        const reconcile = get().reconcileOrphanedClasses;
        if (reconcile) {
          console.log('[ClassStore] Running auto-reconciliation on project load...');
          await reconcile();
        }
      }, 500);
    } catch (error) {
      console.error('Failed to load classes:', error);
      toast.error('Failed to load classes');
    }
  },

  addClass: async (name: string, styles: Record<string, any>, isAutoClass = false) => {
    const { currentProject } = useAppBuilderStore.getState();
    if (!currentProject) {
      toast.error('No project selected');
      return;
    }

    // Sanitize class name to ensure valid CSS identifier
    // Replace spaces with dashes, remove invalid characters
    const sanitizeName = (n: string): string => {
      return n
        .trim()
        .replace(/\s+/g, '-')        // Replace spaces with dashes
        .replace(/[^a-zA-Z0-9_-]/g, '') // Remove invalid CSS chars
        .replace(/^[0-9]/, 'c$&');   // Prefix with 'c' if starts with number
    };

    const sanitizedBaseName = sanitizeName(name);

    // Check for duplicate names and find a unique name
    const { classes } = get();
    let uniqueName = sanitizedBaseName;
    let counter = 1;
    
    while (classes.find(cls => cls.name.toLowerCase() === uniqueName.toLowerCase())) {
      counter++;
      // For auto-classes like "container-1", extract base and increment
      const match = sanitizedBaseName.match(/^(.+?)-(\d+)$/);
      if (match) {
        const [, baseName, number] = match;
        uniqueName = `${baseName}-${parseInt(number) + counter - 1}`;
      } else {
        // Use dash instead of space for valid CSS class names
        uniqueName = `${sanitizedBaseName}-${counter}`;
      }
    }

    try {
      // Extract responsive overrides from styles (classSync puts them here)
      const { tabletStyles: incomingTablet, mobileStyles: incomingMobile, ...baseStyles } = styles;

      // Create class locally with generated ID
      const newClass: StyleClass = {
        id: `class-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: uniqueName,
        styles: baseStyles,
        tabletStyles: incomingTablet || {},
        mobileStyles: incomingMobile || {},
        stateStyles: {
          none: baseStyles,
          hover: {},
          pressed: {},
          focused: {},
          'focus-visible': {},
          'focus-within': {}
        },
        tabletStateStyles: {
          none: {},
          hover: {},
          pressed: {},
          focused: {},
          'focus-visible': {},
          'focus-within': {}
        },
        mobileStateStyles: {
          none: {},
          hover: {},
          pressed: {},
          focused: {},
          'focus-visible': {},
          'focus-within': {}
        },
        appliedTo: [],
        inheritsFrom: [],
        isAutoClass,
        dependentClasses: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedClasses = [...get().classes, newClass];
      set({ classes: updatedClasses });
      
      // Save to project atomically
      debouncedSaveClasses(updatedClasses);
      
      if (!isAutoClass) {
        toast.success('Class created successfully');
      }
      
      return newClass;
    } catch (error) {
      console.error('Failed to create class:', error);
      toast.error('Failed to create class');
    }
  },

  updateClass: async (id: string, updates: Partial<StyleClass>) => {
    const { classes } = get();
    const classToUpdate = classes.find(cls => cls.id === id);
    
    if (!classToUpdate) {
      toast.error('Class not found');
      return;
    }

    const oldClassName = classToUpdate.name;
    const newClassName = updates.name;
    
    console.log('[updateClass] Starting update:', { 
      classId: id, 
      oldName: oldClassName, 
      newName: newClassName,
      hasNameChange: !!newClassName && newClassName !== oldClassName,
      hasStyleUpdates: !!updates.styles
    });

    // Check for duplicate names (excluding current class)
    if (newClassName && newClassName !== oldClassName) {
      const existingClass = classes.find(cls => 
        cls.id !== id && cls.name.toLowerCase() === newClassName.toLowerCase()
      );
      if (existingClass) {
        toast.error(`Class "${newClassName}" already exists`);
        return;
      }
    }

    try {
      // Update class locally
      const updatedClass: StyleClass = {
        ...classToUpdate,
        ...updates,
        updatedAt: new Date()
      };

      const updatedClasses = get().classes.map(cls => 
        cls.id === id ? updatedClass : cls
      );
      
      set({ classes: updatedClasses });
      
      // Save to project atomically
      debouncedSaveClasses(updatedClasses);

      // CRITICAL FIX: If class name changed, update all component references
      if (newClassName && newClassName !== oldClassName) {
        console.log('[updateClass] Class renamed - updating component references:', {
          oldName: oldClassName,
          newName: newClassName,
          affectedComponents: classToUpdate.appliedTo
        });

        const { updateComponent, currentProject, currentPage } = useAppBuilderStore.getState();
        const pageData = currentProject?.pages.find(p => p.id === currentPage);
        
        if (pageData) {
          setIsApplyingClass(true);

          const findAndUpdateComponents = (components: any[]): void => {
            for (const comp of components) {
              const appliedClasses = comp.props?.appliedClasses || [];
              
              // Check if this component uses the renamed class
              if (appliedClasses.includes(oldClassName)) {
                console.log('[updateClass] Updating component class reference:', {
                  componentId: comp.id,
                  oldAppliedClasses: appliedClasses,
                  oldActiveClass: comp.props?.activeClass,
                  oldAutoClass: comp.props?._autoClass
                });

                // Update appliedClasses array - replace old name with new name
                const updatedAppliedClasses = appliedClasses.map((name: string) => 
                  name === oldClassName ? newClassName : name
                );

                // Update activeClass if it was the renamed class
                const updatedActiveClass = comp.props?.activeClass === oldClassName 
                  ? newClassName 
                  : comp.props?.activeClass;

                // Update _autoClass if it was the renamed class
                const updatedAutoClass = comp.props?._autoClass === oldClassName 
                  ? newClassName 
                  : comp.props?._autoClass;

                // Update property sources - update className in source metadata
                const updatedPropertySource = { ...(comp.props?._propertySource || {}) };
                Object.keys(updatedPropertySource).forEach(propKey => {
                  if (updatedPropertySource[propKey]?.className === oldClassName) {
                    updatedPropertySource[propKey] = {
                      ...updatedPropertySource[propKey],
                      className: newClassName
                    };
                  }
                });

                updateComponent(comp.id, {
                  props: {
                    ...comp.props,
                    appliedClasses: updatedAppliedClasses,
                    activeClass: updatedActiveClass,
                    _autoClass: updatedAutoClass,
                    _propertySource: updatedPropertySource
                  }
                });

                console.log('[updateClass] Component updated with new class name:', {
                  componentId: comp.id,
                  newAppliedClasses: updatedAppliedClasses,
                  newActiveClass: updatedActiveClass,
                  newAutoClass: updatedAutoClass
                });
              }
              
              if (comp.children) {
                findAndUpdateComponents(comp.children);
              }
            }
          };

          findAndUpdateComponents(pageData.components);
          
          setTimeout(() => {
            setIsApplyingClass(false);
          }, 0);
        }

        toast.success(`Class renamed from "${oldClassName}" to "${newClassName}"`);
      }

      // Update styles for all components that use this class
      const classesAfterUpdate = get().classes;
      const classData = classesAfterUpdate.find(cls => cls.id === id);
      if (classData && updates.styles) {
        const { updateComponent, currentProject, currentPage } = useAppBuilderStore.getState();
        const { isEditingMode, editingDefinition, updateEditingDefinition } = useUserComponentStore.getState();
        const pageData = currentProject?.pages.find(p => p.id === currentPage);
        
        // Set flag to indicate we're applying class changes
        setIsApplyingClass(true);
        
        if (pageData || (isEditingMode && editingDefinition)) {
          // CRITICAL: Use classData.styles (FULL updated class styles), NOT updates.styles (just the delta)
          // This ensures ALL class properties (including backgroundColor) are propagated
          const fullClassStyles = classData.styles;
          
          console.log('[updateClass] Propagating FULL class styles to all components:', {
            className: classData.name,
            classId: classData.id,
            fullClassStyleKeys: Object.keys(fullClassStyles),
            backgroundColor: fullClassStyles.backgroundColor
          });
          
          // Update components across the whole project (ALL pages) and the current editingDefinition.
          // IMPORTANT: We cannot rely on appBuilderStore.updateComponent for other pages because it only updates currentPage.
          const { setCurrentProject } = useAppBuilderStore.getState();

          const updateNodeWithClass = (node: any): any => {
            if (!node) return node;

            const appliedClassesRaw = node.props?.appliedClasses;
            const appliedClasses: string[] = Array.isArray(appliedClassesRaw) ? appliedClassesRaw : [];
            const autoClass = node.props?._autoClass;
            const usesThisClass = appliedClasses.includes(classData.name) || autoClass === classData.name;

            let nextNode = node;

            if (node.id && usesThisClass) {
              const prevSources = (node.props?._propertySource || {}) as Record<string, any>;
              const appliedClassesList: string[] = appliedClasses;
              const activeClassName = node.props?.activeClass || appliedClassesList[0];

              const existingLockedProps = node.props?.__lockedProps || {};
              const updatedLockedProps = { ...existingLockedProps };
              
              // Create a copy of node props that we'll use for merging
              // We need to remove unlocked style properties so class values take precedence
              const nodePropsForMerge = { ...node.props };

              const editorComponentId = getEditorComponentId();
              if (node.id !== editorComponentId) {
                // For non-editor components, clear both the lock AND the property value
                // so the class value takes precedence
                Object.keys(fullClassStyles || {}).forEach((key) => {
                  if (updatedLockedProps[key] !== undefined) {
                    delete updatedLockedProps[key];
                  }
                  // CRITICAL FIX: Also remove the property value from node props
                  // so class value is used instead of stale component value
                  if (!updatedLockedProps[key] && nodePropsForMerge[key] !== undefined) {
                    delete nodePropsForMerge[key];
                  }
                });
              }

              let finalMergedProps: Record<string, any>;
              let finalPropertySources: Record<string, any>;

              if (appliedClassesList.length > 1) {
                // MULTI-CLASS: Rebuild styles in correct order (same logic as before)
                // CRITICAL FIX: Only preserve non-style (content/behavior) properties
                // Style properties should come EXCLUSIVELY from classes
                const nonStyleKeySet = new Set([
                  'appliedClasses', 'activeClass', '_autoClass', '__lockedProps', '__editedProps',
                  '_propertySource', '_dataContext', '_parentConnection', 'componentName', 'hidden', 'locked',
                  'tag', 'content', 'text', 'children', 'id', 'name', 'dataSource', 'formConfig',
                  'onClick', 'href', 'target', 'src', 'alt', 'placeholder', 'label', 'title',
                  'description', 'icon', 'iconName', 'level', 'type', 'options', 'items', 'data',
                  'disabled', 'required', 'readonly', 'checked', 'selected', 'min', 'max', 'step',
                  'rows', 'cols', 'maxLength', 'autoFocus', 'pattern', 'accept', 'download', 'rel',
                  'actions', 'actionFlows', 'validation', 'errorMessage', 'successMessage'
                ]);
                
                const preservedProps: Record<string, any> = {};
                for (const key of Object.keys(node.props || {})) {
                  if (nonStyleKeySet.has(key) || key.startsWith('data-') || key.startsWith('aria-') || key.startsWith('_nav') || key.startsWith('_ds')) {
                    preservedProps[key] = node.props[key];
                  }
                }
                preservedProps.__lockedProps = updatedLockedProps;

                // Only preserve locked properties (user-edited) - use nodePropsForMerge for correct values
                if (updatedLockedProps && typeof updatedLockedProps === 'object') {
                  for (const lockedKey of Object.keys(updatedLockedProps)) {
                    if (updatedLockedProps[lockedKey] === true && nodePropsForMerge?.[lockedKey] !== undefined) {
                      preservedProps[lockedKey] = nodePropsForMerge[lockedKey];
                    }
                  }
                }

                finalMergedProps = { ...preservedProps };
                finalPropertySources = {};

                const primaryClassName = appliedClassesList[0];
                const primaryClass = classesAfterUpdate.find((c) => c.name === primaryClassName);

                const secondaryPropertyKeys = new Set<string>();
                for (const className of appliedClassesList) {
                  if (className === primaryClassName) continue;
                  const secondaryClass = classesAfterUpdate.find((c) => c.name === className);
                  if (secondaryClass?.styles) {
                    collectAllPropertyKeys(secondaryClass.styles, '', secondaryPropertyKeys);
                  }
                }

                if (primaryClass) {
                  const primaryStyles = primaryClass.styles || {};
                  const filteredPrimaryStyles = filterOutSecondaryProperties(primaryStyles, secondaryPropertyKeys);

                  const result = mergeClassProperties(
                    finalMergedProps,
                    filteredPrimaryStyles,
                    primaryClass.id,
                    primaryClass.name,
                    finalPropertySources,
                    true,
                    updatedLockedProps
                  );
                  finalMergedProps = result.mergedProps;
                  finalPropertySources = result.propertySources;
                }

                for (const className of appliedClassesList) {
                  if (className === primaryClassName) continue;
                  const secondaryClass = classesAfterUpdate.find((c) => c.name === className);
                  if (secondaryClass) {
                    const secondaryStyles = secondaryClass.styles || {};
                    const result = mergeClassProperties(
                      finalMergedProps,
                      secondaryStyles,
                      secondaryClass.id,
                      secondaryClass.name,
                      finalPropertySources,
                      true,
                      updatedLockedProps
                    );
                    finalMergedProps = result.mergedProps;
                    finalPropertySources = result.propertySources;
                  }
                }
              } else {
                // SINGLE CLASS - CRITICAL FIX: Only preserve non-style properties
                // Style properties should come EXCLUSIVELY from the class
                const nonStyleKeySet = new Set([
                  'appliedClasses', 'activeClass', '_autoClass', '__lockedProps', '__editedProps',
                  '_propertySource', '_dataContext', '_parentConnection', 'componentName', 'hidden', 'locked',
                  'tag', 'content', 'text', 'children', 'id', 'name', 'dataSource', 'formConfig',
                  'onClick', 'href', 'target', 'src', 'alt', 'placeholder', 'label', 'title',
                  'description', 'icon', 'iconName', 'level', 'type', 'options', 'items', 'data',
                  'disabled', 'required', 'readonly', 'checked', 'selected', 'min', 'max', 'step',
                  'rows', 'cols', 'maxLength', 'autoFocus', 'pattern', 'accept', 'download', 'rel',
                  'actions', 'actionFlows', 'validation', 'errorMessage', 'successMessage'
                ]);
                
                const cleanedNodeProps: Record<string, any> = {};
                for (const key of Object.keys(node.props || {})) {
                  if (nonStyleKeySet.has(key) || key.startsWith('data-') || key.startsWith('aria-') || key.startsWith('_nav') || key.startsWith('_ds')) {
                    cleanedNodeProps[key] = node.props[key];
                  }
                }
                cleanedNodeProps.__lockedProps = updatedLockedProps;
                
                // Also preserve locked (user-edited) style properties
                if (updatedLockedProps && typeof updatedLockedProps === 'object') {
                  for (const lockedKey of Object.keys(updatedLockedProps)) {
                    if (updatedLockedProps[lockedKey] === true && nodePropsForMerge?.[lockedKey] !== undefined) {
                      cleanedNodeProps[lockedKey] = nodePropsForMerge[lockedKey];
                    }
                  }
                }
                
                const result = mergeClassProperties(
                  cleanedNodeProps,
                  fullClassStyles,
                  classData.id,
                  classData.name,
                  prevSources,
                  true,
                  updatedLockedProps
                );
                finalMergedProps = result.mergedProps;
                finalPropertySources = result.propertySources;

                // Remove properties that were previously controlled by this class but are no longer in it
                const previouslyControlledKeys = Object.keys(prevSources).filter(
                  (k) => prevSources[k]?.classId === classData.id
                );
                const newKeys = new Set(Object.keys(fullClassStyles || {}));
                previouslyControlledKeys.forEach((k) => {
                  if (!newKeys.has(k)) {
                    delete (finalMergedProps as any)[k];
                    delete (finalPropertySources as any)[k];
                  }
                });
              }

              nextNode = {
                ...node,
                props: {
                  ...finalMergedProps,
                  _propertySource: finalPropertySources,
                  __lockedProps: updatedLockedProps,
                },
              };
            }

            if (nextNode.children) {
              return {
                ...nextNode,
                children: (nextNode.children || []).map((child: any) => updateNodeWithClass(child)),
              };
            }

            return nextNode;
          };

          // 1) Update ALL pages in the project
          if (currentProject?.pages?.length) {
            const updatedPages = currentProject.pages.map((page) => ({
              ...page,
              components: (page.components || []).map((c: any) => updateNodeWithClass(c)),
            }));

            // Update local project state (pages only) and persist pages only.
            // IMPORTANT: Do NOT PATCH the whole project here, or we can overwrite concurrent
            // style_classes updates coming from debouncedSaveClasses/saveClassesToProject.
            setCurrentProject({
              ...currentProject,
              pages: updatedPages,
            });

            // Persist pages only
            appBuilderService.updateAppProject(currentProject.id, { pages: updatedPages }).catch((error) => {
              console.error('Failed to save project after propagating class update:', error);
            });
          }

          // 2) Update editingDefinition if in component editing mode
          if (isEditingMode && editingDefinition) {
            const updatedDefinition = updateNodeWithClass(editingDefinition);
            updateEditingDefinition(updatedDefinition);
          }

          setTimeout(() => {
            setIsApplyingClass(false);
          }, 0);
        }
        
        if (!newClassName || newClassName === oldClassName) {
          toast.success('Class updated successfully');
        }
      }
    } catch (error) {
      console.error('Failed to update class:', error);
      toast.error('Failed to update class');
    }
  },

  deleteClass: async (id: string) => {
    const { classes } = get();
    const classToDelete = classes.find(cls => cls.id === id);
    
    if (!classToDelete) {
      toast.error('Class not found');
      return;
    }

    console.log('[deleteClass] Deleting class:', {
      classId: id,
      className: classToDelete.name,
      appliedTo: classToDelete.appliedTo
    });

    try {
      // CRITICAL FIX: Remove class from components ONLY by this specific class's ID and name
      // Do NOT affect other classes in the inheritance chain
      const { currentProject } = useAppBuilderStore.getState();
      
      // Remove this specific class from each component
      // removeClassFromComponent already handles removing only this class name from appliedClasses
      for (const componentId of classToDelete.appliedTo) {
        console.log('[deleteClass] Removing class from component:', {
          componentId,
          classId: id,
          className: classToDelete.name
        });
        await get().removeClassFromComponent(classToDelete.id, componentId);
      }

      // Delete from local state - remove from classes array
      const classesAfterDelete = get().classes.filter(cls => cls.id !== id);
      set({
        classes: classesAfterDelete,
        selectedClass: get().selectedClass === id ? null : get().selectedClass
      });
      
      // CRITICAL: Force immediate save (not debounced) to ensure deletion persists
      await saveClassesToProject(classesAfterDelete);
      
      console.log('[deleteClass] Class deleted successfully:', {
        deletedClass: classToDelete.name,
        remainingClasses: classesAfterDelete.map(c => c.name)
      });
      
      toast.success(`Class "${classToDelete.name}" deleted successfully`);
    } catch (error) {
      console.error('Failed to delete class:', error);
      toast.error('Failed to delete class');
    }
  },

  duplicateClass: (id: string, newName: string) => {
    const { classes } = get();
    const originalClass = classes.find(cls => cls.id === id);
    
    if (originalClass) {
      const duplicatedClass: StyleClass = {
        id: `class-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: newName,
        styles: { ...originalClass.styles },
        tabletStyles: originalClass.tabletStyles ? { ...originalClass.tabletStyles } : undefined,
        mobileStyles: originalClass.mobileStyles ? { ...originalClass.mobileStyles } : undefined,
        stateStyles: { ...originalClass.stateStyles },
        tabletStateStyles: originalClass.tabletStateStyles ? { ...originalClass.tabletStateStyles } : undefined,
        mobileStateStyles: originalClass.mobileStateStyles ? { ...originalClass.mobileStateStyles } : undefined,
        appliedTo: [],
        inheritsFrom: [...originalClass.inheritsFrom],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      set(state => ({
        classes: [...state.classes, duplicatedClass]
      }));
    }
  },

  applyClassToComponent: async (classId: string, componentId: string, lockedPropsOverride?: Record<string, any>) => {
    const { classes } = get();
    const styleClass = classes.find(cls => cls.id === classId);
    
    if (styleClass) {
      // DUPLICATE CHECK: Get component first to check existing classes
      const { updateComponent, currentProject, currentPage } = useAppBuilderStore.getState();
      const { isEditingMode, editingDefinition } = useUserComponentStore.getState();
      const pageData = currentProject?.pages.find(p => p.id === currentPage);

      const findInTree = (root: any): any => {
        if (!root) return null;
        if (root.id === componentId) return root;
        const children = Array.isArray(root.children) ? root.children : [];
        for (const child of children) {
          const found = findInTree(child);
          if (found) return found;
        }
        return null;
      };

      const findInList = (components: any[]): any => {
        for (const comp of components) {
          if (comp.id === componentId) return comp;
          if (comp.children) {
            const found = findInList(comp.children);
            if (found) return found;
          }
        }
        return null;
      };

      const currentComponent = isEditingMode && editingDefinition
        ? findInTree(editingDefinition)
        : (pageData ? findInList(pageData.components) : null);

      if (!currentComponent) {
        toast.error('Component not found');
        return;
      }

      // DEDUPE CHECK: Ensure class isn't already applied (by name OR id)
      const existingAppliedClasses = currentComponent.props?.appliedClasses || [];
      const existingClassIds = new Set(
        existingAppliedClasses.map((className: string) => {
          const cls = classes.find(c => c.name === className);
          return cls?.id;
        }).filter(Boolean)
      );
      
      if (existingAppliedClasses.includes(styleClass.name) || existingClassIds.has(styleClass.id)) {
        toast.error(`Class "${styleClass.name}" is already applied to this component`);
        return;
      }

      const newAppliedTo = styleClass.appliedTo.includes(componentId) 
        ? styleClass.appliedTo 
        : [...styleClass.appliedTo, componentId];

      try {
        // Update local state and save to project
        const classesWithUpdatedAppliedTo = get().classes.map(cls => 
          cls.id === classId 
            ? { ...cls, appliedTo: newAppliedTo, updatedAt: new Date() }
            : cls
        );
        set({ classes: classesWithUpdatedAppliedTo });
        debouncedSaveClasses(classesWithUpdatedAppliedTo);

      console.log('[ClassStore] Applying class', { 
        classId: styleClass.id, 
        className: styleClass.name, 
        componentId, 
        classStyles: styleClass.styles,
        classStyleKeys: Object.keys(styleClass.styles),
        currentProps: currentComponent.props 
      });
        
        // Get existing applied classes for deduplication check
        const existingAppliedClasses = currentComponent.props?.appliedClasses || [];
        
        console.log('[ClassStore] BEFORE applying class:', {
          componentId,
          existingAppliedClasses,
          existingAppliedClassesType: Array.isArray(existingAppliedClasses) ? 'array' : typeof existingAppliedClasses,
          existingAppliedClassesLength: existingAppliedClasses.length,
          classToApply: styleClass.name,
          hasDuplicatesInExisting: existingAppliedClasses.length !== new Set(existingAppliedClasses).size
        });
        
        // CRITICAL FIX: Sanitize appliedClasses - remove stale/non-existent classes
        const allClassNames = new Set(classes.map(c => c.name));
        const sanitizedAppliedClasses = existingAppliedClasses.filter((name: string) => 
          allClassNames.has(name)
        );
        
        // Remove duplicates
        const uniqueSanitizedClasses = Array.from(new Set(sanitizedAppliedClasses));
        
        console.log('[ClassStore] Sanitized appliedClasses:', {
          original: existingAppliedClasses,
          sanitized: uniqueSanitizedClasses,
          removed: existingAppliedClasses.filter((name: string) => !allClassNames.has(name))
        });
        
        // Determine if this class will be the primary/active class
        const existingActiveClass = currentComponent.props?.activeClass;
        const hasValidActiveClass = existingActiveClass && allClassNames.has(existingActiveClass);
        const willBePrimary = !hasValidActiveClass && uniqueSanitizedClasses.length === 0;
          
          console.log('[ClassStore] Class application context', {
            existingAppliedClasses,
            sanitizedAppliedClasses: uniqueSanitizedClasses,
            existingActiveClass,
            hasValidActiveClass,
            willBePrimary,
            classToApply: styleClass.name
          });
          
          // Track dependencies: if this is not the primary class, add it as a dependent of the primary
          if (!willBePrimary) {
            // The primary class is either explicitly set or the first one in sanitized appliedClasses
            const primaryClassName = hasValidActiveClass ? existingActiveClass : (uniqueSanitizedClasses.length > 0 ? uniqueSanitizedClasses[0] : null);
            if (primaryClassName && primaryClassName !== styleClass.name) {
              get().updateClassDependencies(primaryClassName, styleClass.name, 'add');
            }
          }
          
          // CRITICAL FIX: When adding SECONDARY class, preserve PRIMARY class styles
          // Don't rebuild from defaults - that loses the primary's styles like backgroundColor
          
          const { getDefaultPropsForComponent } = await import('@/lib/componentPropertyConfig');
          const componentDefaults = getDefaultPropsForComponent(currentComponent.type as any) || {};
          
          // Preserve ONLY non-style (content/behavior) properties from current component
          // Style properties should come EXCLUSIVELY from classes to avoid stale style leakage
          const nonStyleKeys = new Set([
            'tag', 'content', 'text', 'children', 'id', 'name', 'dataSource', 'formConfig',
            'onClick', 'href', 'target', 'src', 'alt', 'placeholder', 'label', 'title',
            'description', 'icon', 'iconName', 'level', 'type', 'options', 'items', 'data',
            'disabled', 'required', 'readonly', 'checked', 'selected', 'min', 'max', 'step',
            'rows', 'cols', 'maxLength', 'autoFocus', 'pattern', 'accept', 'download', 'rel',
            // Internal metadata
            'appliedClasses', 'activeClass', '_autoClass', '__lockedProps', '__editedProps',
            '_propertySource', '_dataContext', '_parentConnection', 'componentName', 'hidden', 'locked',
            // Actions
            'actions', 'actionFlows', 'validation', 'errorMessage', 'successMessage'
           ]);
          
          const nonStyleProps: Record<string, any> = {};
          for (const key of Object.keys(currentComponent.props || {})) {
            if (nonStyleKeys.has(key) || key.startsWith('data-') || key.startsWith('aria-') || key.startsWith('_nav') || key.startsWith('_ds')) {
              nonStyleProps[key] = currentComponent.props[key];
            }
          }
          
          // CRITICAL FIX: For secondary classes, do NOT carry over old style props
          // Start from defaults and let classes rebuild styles cleanly
          // This prevents stale style properties from "leaking" into child components
          const baseProps = { ...componentDefaults, ...nonStyleProps };
          
          // Get the complete class stack: sanitized existing + new class
          const completeClassStack = [...uniqueSanitizedClasses, styleClass.name];
          
          // Determine which class is primary
          // CRITICAL: Primary is ALWAYS the first class in the stack, NOT the activeClass
          // activeClass is for editing, primary is for style inheritance order
          const primaryClassName = willBePrimary ? styleClass.name : uniqueSanitizedClasses[0];
          
          console.log('[ClassStore] Rebuilding styles from scratch', {
            completeClassStack,
            primaryClassName,
            willBePrimary,
            nonStylePropsKeys: Object.keys(nonStyleProps)
          });
          
          // Rebuild styles by merging all classes in order
          let mergedProps = { ...baseProps };
          let propertySources: ComponentPropertySources = {};
          const lockedProps = currentComponent.props?.__lockedProps;
          
          // FIRST: Apply primary class as the BASE
          if (primaryClassName) {
            const primaryClassData = classes.find(c => c.name === primaryClassName);
            if (primaryClassData) {
              // CRITICAL FIX: Collect ALL property keys from ALL secondary classes FIRST
              // These properties are "owned" by secondary classes and should NOT be overwritten by primary
              const secondaryPropertyKeys = new Set<string>();
              for (const className of completeClassStack) {
                if (className === primaryClassName) continue;
                const secondaryClass = classes.find(c => c.name === className);
                if (secondaryClass?.styles) {
                  collectAllPropertyKeys(secondaryClass.styles, '', secondaryPropertyKeys);
                }
              }
              
              // Filter out properties that are defined in secondary classes
              const filteredPrimaryStyles = filterOutSecondaryProperties(primaryClassData.styles, secondaryPropertyKeys);
              
              const result = mergeClassProperties(
                mergedProps,
                filteredPrimaryStyles,
                primaryClassData.id,
                primaryClassData.name,
                propertySources,
                true, // Primary is the base
                lockedProps
              );
              
              mergedProps = result.mergedProps;
              propertySources = result.propertySources;
              
              console.log(`[ClassStore] Applied primary class as base: ${primaryClassName}`, { 
                addedStyles: Object.keys(primaryClassData.styles),
                filteredStyles: Object.keys(filteredPrimaryStyles),
                excludedKeys: Array.from(secondaryPropertyKeys)
              });
            }
          }
          
          // SECOND: Apply secondary classes as OVERRIDES (they layer on top of primary)
          for (const className of completeClassStack) {
            if (className === primaryClassName) continue; // Already applied primary
            
            const classData = classes.find(c => c.name === className);
            if (!classData) continue;
            
            console.log(`[ClassStore] Applying secondary class "${className}" as override:`, {
              storedStyles: classData.styles,
              styleKeys: Object.keys(classData.styles),
              isEmpty: Object.keys(classData.styles).length === 0
            });
            
            const result = mergeClassProperties(
              mergedProps,
              classData.styles,
              classData.id,
              classData.name,
              propertySources,
              true, // CRITICAL: Secondary classes CAN override primary
              lockedProps
            );
            
            mergedProps = result.mergedProps;
            propertySources = result.propertySources;
            
            console.log(`[ClassStore] After applying secondary "${className}":`, { 
              mergedPropsKeys: Object.keys(mergedProps),
              backgroundColor: mergedProps.backgroundColor
            });
          }

          console.log('[ClassStore] Merge result', { componentId, mergedProps, propertySources });

          // CRITICAL DEDUPE: Start from sanitized classes, not raw mergedProps
          // Build final class list from sanitized classes + new class
          const mergedAppliedClasses = Array.isArray(mergedProps.appliedClasses) 
            ? [...mergedProps.appliedClasses] 
            : [];
          
          console.log('[ClassStore] Merged props appliedClasses:', {
            mergedAppliedClasses,
            type: Array.isArray(mergedProps.appliedClasses) ? 'array' : typeof mergedProps.appliedClasses,
            hasDuplicates: mergedAppliedClasses.length !== new Set(mergedAppliedClasses).size
          });
          
          // Build from sanitized classes, then add new class (ensures no stale names)
          const uniqueClasses = Array.from(new Set([...uniqueSanitizedClasses, styleClass.name]));
          
          console.log('[ClassStore] Applied classes update', { 
            before: mergedAppliedClasses, 
            after: uniqueClasses,
            addingClass: styleClass.name,
            dedupedCount: mergedAppliedClasses.length + 1 - uniqueClasses.length,
            wasDuplicate: mergedAppliedClasses.includes(styleClass.name)
          });

          // CRITICAL: When adding a secondary class, set it as the ACTIVE class so edits go to it
          // This way, changes made after adding a secondary class update the secondary, not the primary
          // The primary class remains as the FIRST class in the stack, but is not being actively edited
          const activeClass = styleClass.name; // Always make the newly applied class the active one for editing

          console.log('[ClassStore] Final update payload:', {
            componentId,
            appliedClasses: uniqueClasses,
            activeClass,
            willBePrimary,
            mergedPropsKeys: Object.keys(mergedProps),
            mergedProps: mergedProps
          });

          setIsApplyingClass(true);
          
          updateComponent(componentId, {
            props: {
              ...mergedProps,
              appliedClasses: uniqueClasses,
              activeClass, // Explicitly set the active/primary class
              _propertySource: propertySources,
              // When lockedPropsOverride is provided (auto-class creation), use it directly
              // Otherwise reset so class properties show YELLOW (inherited), not BLUE
              __lockedProps: lockedPropsOverride !== undefined ? lockedPropsOverride : {}
            }
          });
          
          console.log('[ClassStore] updateComponent called with full payload:', {
            componentId,
            newAppliedClasses: uniqueClasses,
            newActiveClass: activeClass,
            allMergedPropKeys: Object.keys(mergedProps)
          });
          
          // Keep the guard active for the rest of the tick to avoid auto-class side effects
          setTimeout(() => {
            setIsApplyingClass(false);
          }, 0);

          toast.success(`Class "${styleClass.name}" applied`);
      } catch (error) {
        console.error('Failed to apply class to component:', error);
        toast.error('Failed to apply class');
      }
    }
  },

  removeClassFromComponent: async (classId: string, componentId: string) => {
    const { classes } = get();
    const styleClass = classes.find(cls => cls.id === classId);
    
    if (!styleClass) {
      console.warn('[removeClassFromComponent] Class not found:', classId);
      return;
    }

    console.log('[removeClassFromComponent] Starting removal:', {
      classId,
      className: styleClass.name,
      componentId,
      currentAppliedTo: styleClass.appliedTo
    });
    
    const newAppliedTo = styleClass.appliedTo.filter(id => id !== componentId);

    try {
      // Update local state and save to project
      const classesWithUpdatedRemoval = get().classes.map(cls => 
        cls.id === classId 
          ? { ...cls, appliedTo: newAppliedTo, updatedAt: new Date() }
          : cls
      );
      set({ classes: classesWithUpdatedRemoval });
      debouncedSaveClasses(classesWithUpdatedRemoval);

      // Smart remove: rebuild component props from defaults + remaining classes
      const { updateComponent, currentProject, currentPage } = useAppBuilderStore.getState();
      const { isEditingMode, editingDefinition } = useUserComponentStore.getState();
      const pageData = currentProject?.pages.find(p => p.id === currentPage);

      const findInTree = (root: any): any => {
        if (!root) return null;
        if (root.id === componentId) return root;
        const children = Array.isArray(root.children) ? root.children : [];
        for (const child of children) {
          const found = findInTree(child);
          if (found) return found;
        }
        return null;
      };

      const findInList = (components: any[]): any => {
        for (const comp of components) {
          if (comp.id === componentId) return comp;
          if (comp.children) {
            const found = findInList(comp.children);
            if (found) return found;
          }
        }
        return null;
      };

      const currentComponent = isEditingMode && editingDefinition
        ? findInTree(editingDefinition)
        : (pageData ? findInList(pageData.components) : null);
      
      if (currentComponent) {
        console.log('[removeClassFromComponent] Found component, removing class:', {
          componentId,
          removingClass: styleClass.name,
          currentAppliedClasses: currentComponent.props?.appliedClasses || [],
          currentActiveClass: currentComponent.props?.activeClass
        });
        
        // Remove dependency tracking from all classes
        const appliedClasses = currentComponent.props?.appliedClasses || [];
        appliedClasses.forEach((className: string) => {
          if (className !== styleClass.name) {
            get().updateClassDependencies(className, styleClass.name, 'remove');
          }
        });
        
        // CRITICAL: Remove ONLY this specific class name from appliedClasses
        // Do NOT remove any other classes in the hierarchy
        const dedupedAppliedClasses = Array.from(new Set(appliedClasses));
        const newAppliedClasses = dedupedAppliedClasses.filter(
          (className: string) => className !== styleClass.name
        );
        
        console.log('[removeClassFromComponent] Class removal computed:', {
          beforeRemoval: dedupedAppliedClasses,
          afterRemoval: newAppliedClasses,
          removedClass: styleClass.name,
          keptClasses: newAppliedClasses,
          numRemoved: dedupedAppliedClasses.length - newAppliedClasses.length
        });
        
        // Determine new active class
        let newActiveClass = currentComponent.props?.activeClass;
        if (newActiveClass === styleClass.name) {
          newActiveClass = newAppliedClasses.length > 0 ? newAppliedClasses[newAppliedClasses.length - 1] : null;
        }
        
        // Clear _autoClass if we're removing it or if no classes remain
        const shouldClearAutoClass = 
          currentComponent.props?._autoClass === styleClass.name || 
          newAppliedClasses.length === 0;
        
        // Set guard to prevent auto-class creation during removal
        setIsApplyingClass(true);
        
        // If there are no remaining classes, revert to CLEAN defaults
        if (newAppliedClasses.length === 0) {
          console.log('[removeClassFromComponent] No remaining classes, reverting to CLEAN defaults');
          
          // Get component defaults
          const defaults = getDefaultPropsForComponent(currentComponent.type);
          
          // CRITICAL FIX: When ALL classes are removed, element should be completely clean
          // Do NOT preserve locked properties - they were set during class editing
          // Start completely fresh with only defaults
          // Preserve non-style metadata (nav roles, DS token refs, etc.)
          const preservedMeta: Record<string, any> = {};
          for (const key of Object.keys(currentComponent.props || {})) {
            if (key.startsWith('_nav') || key.startsWith('_ds') || key.startsWith('data-') || key.startsWith('aria-')) {
              preservedMeta[key] = currentComponent.props[key];
            }
          }
          
          const cleanProps: Record<string, any> = {
            ...defaults,
            ...preservedMeta,
            appliedClasses: [],
            activeClass: null,
            _autoClass: null,
            _propertySource: {},
            __editedProps: {},
            __lockedProps: {} // CLEAR locked props - start completely fresh!
          };
          
          console.log('[removeClassFromComponent] Reverting to clean defaults:', {
            defaultKeys: Object.keys(defaults),
            backgroundColor: cleanProps.backgroundColor,
            spacingControl: cleanProps.spacingControl
          });
          
          updateComponent(componentId, {
            props: cleanProps
          });
        } else {
          // Rebuild props from remaining classes using SAME order as applyClassToComponent:
          // 1. Base defaults
          // 2. PRIMARY class FIRST as the base
          // 3. SECONDARY classes as overrides (can override primary)
          // This matches the application order for consistency
          console.log('[removeClassFromComponent] Rebuilding from remaining classes', { 
            newAppliedClasses, 
            newActiveClass,
            removedClass: styleClass.name
          });
          
          // CRITICAL: Get fresh classes from store to avoid stale data after set()
          const currentClasses = get().classes;
          
          const defaults = getDefaultPropsForComponent(currentComponent.type);
          // Preserve non-style metadata (nav roles, DS token refs, etc.) during rebuild
          const preservedMetaRebuild: Record<string, any> = {};
          for (const key of Object.keys(currentComponent.props || {})) {
            if (key.startsWith('_nav') || key.startsWith('_ds') || key.startsWith('data-') || key.startsWith('aria-')) {
              preservedMetaRebuild[key] = currentComponent.props[key];
            }
          }
          let rebuiltProps: Record<string, any> = { ...defaults, ...preservedMetaRebuild };
          let rebuiltPropertySources: ComponentPropertySources = {};
          
          // CRITICAL FIX: Do NOT use old lockedProps when rebuilding after secondary class removal
          // The locked props were set during secondary class editing and would block primary class styles
          // We want a clean rebuild from the remaining classes
          const cleanLockedProps = {};
          
          // FIRST: Apply primary class as the BASE (same order as applyClassToComponent)
          // CRITICAL FIX: Collect ALL property keys from ALL secondary classes FIRST
          const secondaryPropertyKeys = new Set<string>();
          newAppliedClasses.forEach((className: string) => {
            if (className === newActiveClass) return;
            const secondaryClass = currentClasses.find(c => c.name === className);
            if (secondaryClass?.styles) {
              collectAllPropertyKeys(secondaryClass.styles, '', secondaryPropertyKeys);
            }
          });
          
          if (newActiveClass) {
            const primaryClass = currentClasses.find(c => c.name === newActiveClass);
            console.log(`[removeClassFromComponent] Looking for primary class: ${newActiveClass}`, {
              availableClasses: currentClasses.map(c => ({ name: c.name, id: c.id, stylesKeys: Object.keys(c.styles) })),
              found: !!primaryClass,
              primaryStyles: primaryClass?.styles
            });
            
            if (primaryClass && Object.keys(primaryClass.styles).length > 0) {
              // Filter out properties that are defined in secondary classes
              const filteredPrimaryStyles = filterOutSecondaryProperties(primaryClass.styles, secondaryPropertyKeys);
              
              console.log(`[removeClassFromComponent] Applying primary class "${newActiveClass}" as BASE:`, {
                classStyles: JSON.stringify(primaryClass.styles, null, 2),
                filteredStyles: JSON.stringify(filteredPrimaryStyles, null, 2),
                excludedKeys: Array.from(secondaryPropertyKeys)
              });
              
              const { mergedProps, propertySources } = mergeClassProperties(
                rebuiltProps,
                filteredPrimaryStyles,
                primaryClass.id,
                primaryClass.name,
                rebuiltPropertySources,
                true, // Primary class is the base
                cleanLockedProps // Use clean locked props, not stale ones from secondary edits
              );
              rebuiltProps = mergedProps;
              rebuiltPropertySources = propertySources;
              
              console.log(`[removeClassFromComponent] After applying primary "${newActiveClass}":`, {
                mergedPropsKeys: Object.keys(rebuiltProps),
                backgroundColor: rebuiltProps.backgroundColor,
                spacingControl: rebuiltProps.spacingControl
              });
            } else if (primaryClass) {
              console.warn(`[removeClassFromComponent] Primary class "${newActiveClass}" has EMPTY styles - checking component for stored styles`);
              // If primary class has no styles, the component styles might have been stored elsewhere
              // Try to preserve any existing non-class styles from current component
            } else {
              console.warn(`[removeClassFromComponent] ❌ Primary class NOT FOUND: ${newActiveClass}`);
            }
          } else {
            console.warn(`[removeClassFromComponent] ⚠️ No newActiveClass set, no primary class to apply`);
          }
          
          // SECOND: Apply secondary classes as OVERRIDES (they layer on top of primary)
          newAppliedClasses.forEach((className: string) => {
            if (className === newActiveClass) return; // Already applied primary
            
            const remainingClass = currentClasses.find(c => c.name === className);
            if (remainingClass) {
              console.log(`[removeClassFromComponent] Applying secondary class "${className}" as override:`, {
                classStyles: remainingClass.styles
              });
              
              const { mergedProps, propertySources } = mergeClassProperties(
                rebuiltProps,
                remainingClass.styles,
                remainingClass.id,
                remainingClass.name,
                rebuiltPropertySources,
                true, // CRITICAL: Secondary classes CAN override primary (matches applyClassToComponent)
                cleanLockedProps // Use clean locked props for consistent rebuild
              );
              rebuiltProps = mergedProps;
              rebuiltPropertySources = propertySources;
              
              console.log(`[removeClassFromComponent] After applying secondary "${className}":`, {
                mergedPropsKeys: Object.keys(rebuiltProps)
              });
            } else {
              console.warn(`[removeClassFromComponent] Secondary class not found: ${className}`);
            }
          });
          
          // Preserve metadata - ensure new array references for React to detect changes
          rebuiltProps.appliedClasses = [...newAppliedClasses]; // Force new array reference
          rebuiltProps.activeClass = newActiveClass;
          
          // Only preserve _autoClass if it's still in the applied classes
          if (shouldClearAutoClass || !newAppliedClasses.includes(currentComponent.props?._autoClass || '')) {
            rebuiltProps._autoClass = null;
          } else {
            rebuiltProps._autoClass = currentComponent.props?._autoClass;
          }
          
          rebuiltProps._propertySource = { ...rebuiltPropertySources }; // Force new object reference
          
          // CRITICAL: Clear locked/edited props when rebuilding from classes
          // Otherwise old locked values from secondary class edits persist incorrectly
          rebuiltProps.__editedProps = {};
          rebuiltProps.__lockedProps = {};
          
          console.log('[removeClassFromComponent] Updated component with rebuilt props:', {
            componentId,
            appliedClasses: rebuiltProps.appliedClasses,
            activeClass: rebuiltProps.activeClass,
            keptClasses: newAppliedClasses
          });
          
          console.log('[removeClassFromComponent] FINAL rebuiltProps before updateComponent:', {
            componentId,
            appliedClasses: rebuiltProps.appliedClasses,
            activeClass: rebuiltProps.activeClass,
            spacingControl: rebuiltProps.spacingControl,
            typography: rebuiltProps.typography,
            backgroundColor: rebuiltProps.backgroundColor,
            propKeys: Object.keys(rebuiltProps)
          });
          
          updateComponent(componentId, {
            props: rebuiltProps
          });
        }
        
        // Clear guard after update
        setTimeout(() => {
          setIsApplyingClass(false);
        }, 0);

        console.log('[removeClassFromComponent] Class removal complete:', {
          removedClass: styleClass.name,
          remainingClasses: newAppliedClasses
        });
        
        toast.success(`Class "${styleClass.name}" removed`);
      }
    } catch (error) {
      console.error('Failed to remove class from component:', error);
      toast.error('Failed to remove class');
    }
  },

  selectClass: (classId: string | null) => {
    set({ selectedClass: classId });
  },

  setSelectedState: (state: PseudoState) => {
    set({ selectedState: state });
  },

  setClassPanelOpen: (open: boolean) => {
    set({ isClassPanelOpen: open });
  },

  setActiveClass: async (componentId: string, className: string) => {
    const { classes } = get();
    const targetClass = classes.find(cls => cls.name === className);
    
    if (!targetClass) {
      toast.error('Class not found');
      return;
    }

    const { updateComponent, currentProject, currentPage } = useAppBuilderStore.getState();
    const pageData = currentProject?.pages.find(p => p.id === currentPage);
    
    if (!pageData) return;
    
    const findComponent = (components: any[]): any => {
      for (const comp of components) {
        if (comp.id === componentId) return comp;
        if (comp.children) {
          const found = findComponent(comp.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    const component = findComponent(pageData.components);
    if (!component) {
      toast.error('Component not found');
      return;
    }

    // Check if class has dependents (would prevent editing)
    const hasDependencies = targetClass.dependentClasses && targetClass.dependentClasses.length > 0;
    
    if (hasDependencies) {
      const dependentCount = targetClass.dependentClasses!.length;
      toast.error(
        `Cannot modify .${className} - Class ${dependentCount} depends on it. Remove dependent classes first to edit.`,
        { duration: 4000 }
      );
      return;
    }

    // CRITICAL: Dedupe appliedClasses before setting active class
    const currentAppliedClasses = component.props?.appliedClasses || [];
    const dedupedAppliedClasses = Array.from(new Set(currentAppliedClasses));
    
    // Rebuild component styles with new primary class
    console.log('[ClassStore] Rebuilding styles with new primary class:', className);
    
    const defaults = getDefaultPropsForComponent(component.type);
    let rebuiltProps: Record<string, any> = { ...defaults };
    let rebuiltPropertySources: ComponentPropertySources = {};
    const lockedProps = component.props?.__lockedProps;
    
    // CRITICAL FIX: Apply PRIMARY class first (filtered), then SECONDARY classes
    // This matches applyClassToComponent and updateClass ordering
    
    // Collect ALL property keys from ALL secondary classes FIRST
    const secondaryPropertyKeys = new Set<string>();
    dedupedAppliedClasses.forEach((cls: string) => {
      if (cls === className) return; // Skip primary
      const classData = classes.find(c => c.name === cls);
      if (classData?.styles) {
        collectAllPropertyKeys(classData.styles, '', secondaryPropertyKeys);
      }
    });
    
    // First pass: Apply PRIMARY class as base (filtered to exclude secondary-owned props)
    const filteredPrimaryStyles = filterOutSecondaryProperties(targetClass.styles, secondaryPropertyKeys);
    
    const primaryResult = mergeClassProperties(
      rebuiltProps,
      filteredPrimaryStyles,
      targetClass.id,
      targetClass.name,
      rebuiltPropertySources,
      true, // Primary class
      lockedProps
    );
    rebuiltProps = primaryResult.mergedProps;
    rebuiltPropertySources = primaryResult.propertySources;
    
    console.log(`[ClassStore] Applied primary class: ${className}`, {
      originalKeys: Object.keys(targetClass.styles),
      filteredKeys: Object.keys(filteredPrimaryStyles),
      excludedKeys: Array.from(secondaryPropertyKeys)
    });
    
    // Second pass: Apply all secondary classes as overrides
    dedupedAppliedClasses.forEach((cls: string) => {
      if (cls === className) return; // Skip primary, already applied
      
      const classData = classes.find(c => c.name === cls);
      if (classData) {
        const { mergedProps, propertySources } = mergeClassProperties(
          rebuiltProps,
          classData.styles,
          classData.id,
          classData.name,
          rebuiltPropertySources,
          true, // Secondary CAN override
          lockedProps
        );
        rebuiltProps = mergedProps;
        rebuiltPropertySources = propertySources;
        
        console.log(`[ClassStore] Applied secondary class: ${cls}`);
      }
    });
    
    // Preserve metadata
    rebuiltProps.appliedClasses = dedupedAppliedClasses;
    rebuiltProps.activeClass = className;
    rebuiltProps._autoClass = component.props?._autoClass;
    rebuiltProps._propertySource = rebuiltPropertySources;
    rebuiltProps.__editedProps = component.props?.__editedProps || {};
    rebuiltProps.__lockedProps = lockedProps || {};
    
    // Update active class in component props
    // IMPORTANT: Only ONE class can be active/primary at a time
    updateComponent(componentId, {
      props: rebuiltProps
    });
    
    console.log('[ClassStore] Set active class:', { componentId, className });
    toast.success(`Class "${className}" is now active (primary)`);
  },

  updateClassState: async (id: string, state: PseudoState, styles: Record<string, any>) => {
    const { classes } = get();
    const classIndex = classes.findIndex(cls => cls.id === id);
    
    if (classIndex === -1) return;

    const updatedClass = {
      ...classes[classIndex],
      stateStyles: {
        ...classes[classIndex].stateStyles,
        [state]: styles
      },
      updatedAt: new Date()
    };

    const updatedClasses = [...classes];
    updatedClasses[classIndex] = updatedClass;

    set({ classes: updatedClasses });
    
    // Save state styles to project
    debouncedSaveClasses(updatedClasses);
  },

  /**
   * Update styles at a specific breakpoint (desktop, tablet, or mobile)
   * Desktop updates go to 'styles', tablet to 'tabletStyles', mobile to 'mobileStyles'
   */
  updateClassBreakpoint: async (
    id: string, 
    breakpoint: 'desktop' | 'tablet' | 'mobile', 
    styles: Record<string, any>
  ) => {
    const { classes } = get();
    const classIndex = classes.findIndex(cls => cls.id === id);
    
    if (classIndex === -1) {
      console.warn('[ClassStore] updateClassBreakpoint: Class not found:', id);
      return;
    }

    const currentClass = classes[classIndex];
    let updatedClass: StyleClass;

    // Merge helper: treat `undefined` as deletion (clears an override)
    const mergeWithDeletes = (base: Record<string, any> | undefined, updates: Record<string, any>) => {
      const next: Record<string, any> = { ...(base || {}) };
      for (const [key, value] of Object.entries(updates || {})) {
        if (value === undefined) {
          delete next[key];
        } else {
          next[key] = value;
        }
      }
      return next;
    };

    if (breakpoint === 'desktop') {
      // Desktop styles go to the base 'styles' property
      updatedClass = {
        ...currentClass,
        styles: mergeWithDeletes(currentClass.styles, styles),
        updatedAt: new Date()
      };
    } else if (breakpoint === 'tablet') {
      // Tablet overrides
      updatedClass = {
        ...currentClass,
        tabletStyles: mergeWithDeletes(currentClass.tabletStyles, styles),
        updatedAt: new Date()
      };
    } else {
      // Mobile overrides
      updatedClass = {
        ...currentClass,
        mobileStyles: mergeWithDeletes(currentClass.mobileStyles, styles),
        updatedAt: new Date()
      };
    }

    console.log('[ClassStore] updateClassBreakpoint:', {
      classId: id,
      className: currentClass.name,
      breakpoint,
      updatedStyles: styles
    });

    const updatedClasses = [...classes];
    updatedClasses[classIndex] = updatedClass;

    set({ classes: updatedClasses });
    debouncedSaveClasses(updatedClasses);
  },

  /**
   * Update state styles (hover, focus, etc.) at a specific breakpoint
   */
  updateClassBreakpointState: async (
    id: string,
    breakpoint: 'desktop' | 'tablet' | 'mobile',
    state: PseudoState,
    styles: Record<string, any>
  ) => {
    const { classes } = get();
    const classIndex = classes.findIndex(cls => cls.id === id);
    
    if (classIndex === -1) {
      console.warn('[ClassStore] updateClassBreakpointState: Class not found:', id);
      return;
    }

    const currentClass = classes[classIndex];
    let updatedClass: StyleClass;

    if (breakpoint === 'desktop') {
      // Desktop state styles
      updatedClass = {
        ...currentClass,
        stateStyles: {
          ...currentClass.stateStyles,
          [state]: { ...(currentClass.stateStyles?.[state] || {}), ...styles }
        },
        updatedAt: new Date()
      };
    } else if (breakpoint === 'tablet') {
      // Tablet state styles
      const tabletStateStyles = currentClass.tabletStateStyles || {
        none: {}, hover: {}, pressed: {}, focused: {}, 'focus-visible': {}, 'focus-within': {}
      };
      updatedClass = {
        ...currentClass,
        tabletStateStyles: {
          ...tabletStateStyles,
          [state]: { ...(tabletStateStyles[state] || {}), ...styles }
        },
        updatedAt: new Date()
      };
    } else {
      // Mobile state styles
      const mobileStateStyles = currentClass.mobileStateStyles || {
        none: {}, hover: {}, pressed: {}, focused: {}, 'focus-visible': {}, 'focus-within': {}
      };
      updatedClass = {
        ...currentClass,
        mobileStateStyles: {
          ...mobileStateStyles,
          [state]: { ...(mobileStateStyles[state] || {}), ...styles }
        },
        updatedAt: new Date()
      };
    }

    console.log('[ClassStore] updateClassBreakpointState:', {
      classId: id,
      className: currentClass.name,
      breakpoint,
      state,
      updatedStyles: styles
    });

    const updatedClasses = [...classes];
    updatedClasses[classIndex] = updatedClass;

    set({ classes: updatedClasses });
    debouncedSaveClasses(updatedClasses);
  },

  /**
   * Remove a specific property override from a breakpoint's styles.
   * The property then falls back to the parent breakpoint value.
   */
  removeClassBreakpointProperty: (
    classId: string,
    breakpoint: 'tablet' | 'mobile',
    propertyKey: string | string[]
  ) => {
    const { classes } = get();
    const classIndex = classes.findIndex(cls => cls.id === classId);
    if (classIndex === -1) return;

    const currentClass = classes[classIndex];
    const keys = Array.isArray(propertyKey) ? propertyKey : [propertyKey];
    
    const breakpointKey = breakpoint === 'tablet' ? 'tabletStyles' : 'mobileStyles';
    const currentStyles = { ...(currentClass[breakpointKey] || {}) };
    
    keys.forEach(key => {
      delete currentStyles[key];
    });

    console.log('[ClassStore] removeClassBreakpointProperty:', {
      classId,
      className: currentClass.name,
      breakpoint,
      removedKeys: keys,
      remainingKeys: Object.keys(currentStyles)
    });

    const updatedClass = {
      ...currentClass,
      [breakpointKey]: currentStyles,
      updatedAt: new Date()
    };

    const updatedClasses = [...classes];
    updatedClasses[classIndex] = updatedClass;
    set({ classes: updatedClasses });
    debouncedSaveClasses(updatedClasses);
  },

  createClassFromComponent: async (componentId: string, className: string) => {
    const { currentProject, currentPage } = useAppBuilderStore.getState();
    if (!currentProject || !currentPage) return;

    console.log('[ClassStore] createClassFromComponent called:', {
      componentId,
      className
    });

    const pageData = currentProject.pages.find(p => p.id === currentPage);
    if (!pageData) return;

    // Find component and extract its current styles
    const findComponent = (components: any[]): any => {
      for (const comp of components) {
        if (comp.id === componentId) return comp;
        if (comp.children) {
          const found = findComponent(comp.children);
          if (found) return found;
        }
      }
      return null;
    };

    const component = findComponent(pageData.components);
    if (!component) return;

    console.log('[ClassStore] Found component:', {
      componentId,
      currentAppliedClasses: component.props?.appliedClasses,
      currentAutoClass: component.props?._autoClass,
      currentActiveClass: component.props?.activeClass
    });

    // Check if this will be a secondary class (element already has classes)
    const existingAppliedClasses = component.props?.appliedClasses || [];
    const hasExistingClasses = existingAppliedClasses.length > 0;
    
    console.log('[ClassStore] Creating NEW class (not renaming):', {
      newClassName: className,
      existingClasses: existingAppliedClasses,
      willBeSecondary: hasExistingClasses
    });

    // CRITICAL FIX: For secondary classes, extract ONLY the DELTA from primary class context
    // This ensures secondary classes don't inherit values from primary classes
    const { extractEditedProperties, extractDeltaFromClassContext } = await import('@/lib/propertyDiffTracker');
    
    let stylesToUse: Record<string, any> = {};
    
    if (hasExistingClasses) {
      // SECONDARY CLASS: Extract only delta from existing class context
      // Combine all existing class styles to get the "context"
      const { classes } = get();
      let combinedClassStyles: Record<string, any> = {};
      
      // Deep merge helper for nested objects
      const deepMerge = (target: Record<string, any>, source: Record<string, any>): Record<string, any> => {
        const result = { ...target };
        for (const key in source) {
          const sourceValue = source[key];
          const targetValue = result[key];
          
          if (
            sourceValue !== null &&
            typeof sourceValue === 'object' &&
            !Array.isArray(sourceValue) &&
            targetValue !== null &&
            typeof targetValue === 'object' &&
            !Array.isArray(targetValue)
          ) {
            result[key] = deepMerge(targetValue, sourceValue);
          } else {
            result[key] = sourceValue;
          }
        }
        return result;
      };
      
      for (const existingClassName of existingAppliedClasses) {
        const existingClass = classes.find(c => c.name === existingClassName);
        if (existingClass?.styles) {
          // CRITICAL: Deep merge to properly handle nested objects like spacingControl
          combinedClassStyles = deepMerge(combinedClassStyles, existingClass.styles);
        }
      }
      
      console.log('[ClassStore] Creating SECONDARY class - extracting delta from context:', {
        existingClasses: existingAppliedClasses,
        combinedClassStyleKeys: Object.keys(combinedClassStyles)
      });
      
      // Extract ONLY properties that differ from the combined class context
      stylesToUse = extractDeltaFromClassContext(
        component.props || {},
        component.type,
        combinedClassStyles
      );
      
      console.log('[ClassStore] Secondary class delta styles:', {
        deltaKeys: Object.keys(stylesToUse),
        stylesToUse
      });
      
      // For secondary classes, allow creating even with empty delta
      // The user can then add unique styles to the secondary class
    } else {
      // PRIMARY CLASS: Extract all edited properties (compared to component defaults)
      stylesToUse = extractEditedProperties(
        component.props || {},
        component.type,
        component.props?.__editedProps
      );
      
      if (Object.keys(stylesToUse).length === 0) {
        toast.error('No edited styles to create a class from. Customize the component first.');
        return;
      }
    }
    
    console.log('[ClassStore] Creating class from component:', {
      hasExistingClasses,
      stylesToUseCount: Object.keys(stylesToUse).length,
      stylesToUse
    });

    // Check for existing class with same styles (dedupe via hash) - only if we have styles
    const { findExistingClassByStyles, registerStyleHash } = await import('@/lib/autoClassSystem');
    
    if (Object.keys(stylesToUse).length > 0) {
      const existingClass = findExistingClassByStyles(stylesToUse, get().classes);
      
      // Only reuse if the class is NOT already applied to this component
      if (existingClass && !existingAppliedClasses.includes(existingClass.name)) {
        console.log('[ClassStore] Reusing existing class:', existingClass.name);
        await get().applyClassToComponent(existingClass.id, componentId);
        return;
      } else if (existingClass) {
        console.log('[ClassStore] Found matching class but already applied, creating new class instead:', existingClass.name);
      }
    }

    // Create new class with styles (or empty for secondary with no delta)
    console.log('[ClassStore] Creating new class with name:', className);
    const newClass = await get().addClass(className, stylesToUse, false);
    
    console.log('[ClassStore] New class created:', {
      classId: newClass?.id,
      className: newClass?.name,
      styles: newClass?.styles,
      isSecondary: hasExistingClasses
    });
    
    // Register the style hash for future deduplication (only if we have styles)
    if (newClass) {
      if (Object.keys(stylesToUse).length > 0) {
        registerStyleHash(stylesToUse, newClass.name);
      }
      
      console.log('[ClassStore] About to apply class to component:', {
        classId: newClass.id,
        componentId
      });
      
      // Apply class to original component after state updates
      await get().applyClassToComponent(newClass.id, componentId);
    }
  },

  setEditingClassName: (className: string | null) => {
    set({ editingClassName: className });
  },

  updateClassDependencies: (primaryClassName: string, dependentClassName: string, action: 'add' | 'remove') => {
    const { classes } = get();
    const primaryClass = classes.find(cls => cls.name === primaryClassName);
    
    if (!primaryClass) return;

    const dependentClasses = primaryClass.dependentClasses || [];
    
    if (action === 'add') {
      if (!dependentClasses.includes(dependentClassName)) {
        const updatedDependencies = [...dependentClasses, dependentClassName];
        const isLocked = updatedDependencies.length > 0;
        
        set(state => ({
          classes: state.classes.map(cls =>
            cls.id === primaryClass.id
              ? { ...cls, dependentClasses: updatedDependencies, isLocked }
              : cls
          )
        }));
      }
    } else if (action === 'remove') {
      const updatedDependencies = dependentClasses.filter(name => name !== dependentClassName);
      const isLocked = updatedDependencies.length > 0;
      
      set(state => ({
        classes: state.classes.map(cls =>
          cls.id === primaryClass.id
            ? { ...cls, dependentClasses: updatedDependencies, isLocked }
            : cls
        )
      }));
    }
  },

  cleanupDeletedComponentReferences: async (componentId: string) => {
    const { classes, deleteClass } = get();
    const { currentProject } = useAppBuilderStore.getState();
    
    if (!currentProject) return;

    // Find all classes that reference this component
    const classesToUpdate = classes.filter(cls => cls.appliedTo.includes(componentId));
    
    console.log(`[ClassStore] Cleaning up ${classesToUpdate.length} class references for deleted component ${componentId}`);
    
    // Update or delete each class
    for (const styleClass of classesToUpdate) {
      const updatedAppliedTo = styleClass.appliedTo.filter(id => id !== componentId);
      
      try {
        // Delete ALL classes (including auto-classes) when no components use them
        // Auto-class reuse is handled at creation time, not by keeping orphans
        if (updatedAppliedTo.length === 0) {
          await deleteClass(styleClass.id);
          console.log(`[ClassStore] Deleted orphaned class ${styleClass.name} (no components remaining)`);
        } else {
          // Update local state and save to project
          const classesAfterCleanup = get().classes.map(cls =>
            cls.id === styleClass.id
              ? { ...cls, appliedTo: updatedAppliedTo, updatedAt: new Date() }
              : cls
          );
          set({ classes: classesAfterCleanup });
          debouncedSaveClasses(classesAfterCleanup);
          
          console.log(`[ClassStore] Updated class ${styleClass.name} appliedTo count: ${updatedAppliedTo.length}`);
        }
      } catch (error) {
        console.error(`Failed to cleanup class ${styleClass.name} for deleted component:`, error);
      }
    }
  },

  // Cleanup duplicate classes on a component
  cleanupDuplicateClasses: (componentId: string) => {
    const { currentProject, currentPage, updateComponent } = useAppBuilderStore.getState();
    const pageData = currentProject?.pages.find(p => p.id === currentPage);
    
    const findComponent = (components: any[]): any => {
      for (const comp of components) {
        if (comp.id === componentId) return comp;
        if (comp.children) {
          const found = findComponent(comp.children);
          if (found) return found;
        }
      }
      return null;
    };

    const component = pageData ? findComponent(pageData.components) : null;
    
    if (component && component.props?.appliedClasses) {
      const appliedClasses = component.props.appliedClasses;
      const uniqueClasses = Array.from(new Set(appliedClasses));
      
      if (uniqueClasses.length !== appliedClasses.length) {
        console.log('[ClassStore] Cleaning up duplicate classes', { 
          before: appliedClasses, 
          after: uniqueClasses,
          componentId,
          removedCount: appliedClasses.length - uniqueClasses.length
        });
        
        updateComponent(componentId, {
          props: {
            ...component.props,
            appliedClasses: uniqueClasses
          }
        });
      }
    }
  },

  /**
   * Reconcile all class appliedTo arrays to remove references to non-existent components
   * This ensures stale class references don't cause style conflicts during AI rebuilds
   */
  reconcileOrphanedClasses: async () => {
    // GUARD: Skip reconciliation if AI is actively building components
    // This prevents deleting classes for components that are being added but not yet committed
    if (getIsAIBuilding()) {
      console.log('[ClassStore] Skipping reconciliation - AI build in progress');
      return;
    }
    
    const { classes, deleteClass } = get();
    const { currentProject } = useAppBuilderStore.getState();
    
    if (!currentProject) return;

    // Collect all valid component IDs across all pages
    const validComponentIds = new Set<string>();
    
    const collectComponentIds = (components: any[]) => {
      for (const comp of components) {
        if (comp?.id) validComponentIds.add(comp.id);
        if (comp?.children) collectComponentIds(comp.children);
      }
    };
    
    for (const page of currentProject.pages) {
      if (page.components) {
        collectComponentIds(page.components);
      }
    }
    
    console.log(`[ClassStore] Reconciling orphaned classes - found ${validComponentIds.size} valid component IDs`);
    
    let classesUpdated = false;
    const classesToDelete: string[] = [];
    
    // Check each class and clean up invalid appliedTo references
    const reconciledClasses = classes.map(cls => {
      const validAppliedTo = cls.appliedTo.filter(id => validComponentIds.has(id));
      
      if (validAppliedTo.length !== cls.appliedTo.length) {
        console.log(`[ClassStore] Class ${cls.name} had ${cls.appliedTo.length - validAppliedTo.length} stale references`);
        classesUpdated = true;
        
        // Mark for deletion if no valid references remain
        if (validAppliedTo.length === 0) {
          classesToDelete.push(cls.id);
        }
        
        return { ...cls, appliedTo: validAppliedTo, updatedAt: new Date() };
      }
      return cls;
    });
    
    // Delete orphaned classes
    for (const classId of classesToDelete) {
      await deleteClass(classId);
      console.log(`[ClassStore] Deleted orphaned class: ${classId}`);
    }
    
    // Update remaining classes if any were modified
    if (classesUpdated) {
      const remainingClasses = reconciledClasses.filter(cls => !classesToDelete.includes(cls.id));
      set({ classes: remainingClasses });
      debouncedSaveClasses(remainingClasses);
      console.log(`[ClassStore] Reconciliation complete - ${classesToDelete.length} classes deleted`);
    }
  }
}));