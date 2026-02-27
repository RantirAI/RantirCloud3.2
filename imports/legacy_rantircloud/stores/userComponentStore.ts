import { create } from 'zustand';
import { 
  UserComponent, 
  UserComponentsData, 
  ComponentProp, 
  ComponentVariant,
  ComponentSlot,
  ComponentState,
  ComponentStateType,
  ComponentClassReference,
  createDefaultUserComponentsData,
  createDefaultProp,
  createDefaultVariant,
  createDefaultSlot
} from '@/types/userComponent';
import { userComponentService } from '@/services/userComponentService';
import { AppComponent } from '@/types/appBuilder';

interface EditingMetadata {
  name: string;
  description: string;
  category: string;
  tags: string[];
}

interface UserComponentState {
  // Data
  components: UserComponent[];
  categories: string[];
  isLoading: boolean;
  error: string | null;
  
  // UI state
  selectedComponentId: string | null;
  isLibraryOpen: boolean;
  isSaveDialogOpen: boolean;
  isCreateDialogOpen: boolean;
  editingComponent: UserComponent | null;
  componentToSave: AppComponent | null;
  
  // Component Editing Mode state
  isEditingMode: boolean;
  editingComponentId: string | null;
  editingDefinition: AppComponent | null;
  editingProps: ComponentProp[];
  editingVariants: ComponentVariant[];
  editingSlots: ComponentSlot[];
  editingStates: ComponentState[];
  editingClassRefs: ComponentClassReference[];
  editingMetadata: EditingMetadata;
  returnToPageId: string | null;
  
  // Active state preview (for state-based styling preview)
  previewState: ComponentStateType;
  previewVariant: string | null;
  
  // Actions
  loadComponents: (projectId: string) => Promise<void>;
  createComponent: (
    projectId: string,
    name: string,
    definition: AppComponent,
    props?: ComponentProp[],
    options?: { 
      description?: string; 
      category?: string; 
      thumbnail?: string;
      variants?: ComponentVariant[];
      slots?: ComponentSlot[];
      states?: ComponentState[];
      tags?: string[];
    }
  ) => Promise<UserComponent | null>;
  updateComponent: (
    projectId: string,
    componentId: string,
    updates: Partial<Omit<UserComponent, 'id' | 'createdAt'>>
  ) => Promise<void>;
  deleteComponent: (projectId: string, componentId: string) => Promise<void>;
  duplicateComponent: (projectId: string, componentId: string) => Promise<UserComponent | null>;
  
  // UI actions
  selectComponent: (componentId: string | null) => void;
  setLibraryOpen: (open: boolean) => void;
  openSaveDialog: (component: AppComponent) => void;
  openCreateDialog: () => void;
  openEditDialog: (component: UserComponent) => void;
  closeCreateDialog: () => void;
  closeSaveDialog: () => void;
  
  // Component Editing Mode actions
  enterEditingMode: (component?: UserComponent, returnPageId?: string | null) => void;
  exitEditingMode: (save?: boolean, projectId?: string) => Promise<void>;
  updateEditingDefinition: (definition: AppComponent) => void;
  
  // Props management
  updateEditingProps: (props: ComponentProp[]) => void;
  addEditingProp: (type?: ComponentProp['type']) => void;
  updateEditingProp: (propId: string, updates: Partial<ComponentProp>) => void;
  removeEditingProp: (propId: string) => void;
  addPropBinding: (propId: string, componentId: string, property: string) => void;
  removePropBinding: (propId: string, componentId: string, property: string) => void;
  
  // Variants management
  addEditingVariant: (name?: string) => void;
  updateEditingVariant: (variantId: string, updates: Partial<ComponentVariant>) => void;
  removeEditingVariant: (variantId: string) => void;
  setDefaultVariant: (variantId: string) => void;
  
  // Slots management
  addEditingSlot: (name?: string) => void;
  updateEditingSlot: (slotId: string, updates: Partial<ComponentSlot>) => void;
  removeEditingSlot: (slotId: string) => void;
  
  // States management
  updateEditingState: (stateType: ComponentStateType, updates: Partial<ComponentState>) => void;
  
  // Class inheritance management
  updateClassInheritance: (className: string, mode: 'shared' | 'detached' | 'override') => void;
  
  // Preview controls
  setPreviewState: (state: ComponentStateType) => void;
  setPreviewVariant: (variantId: string | null) => void;
  
  // Metadata management
  updateEditingMetadata: (metadata: Partial<EditingMetadata>) => void;
  
  // Category actions
  addCategory: (projectId: string, category: string) => Promise<void>;
  renameCategory: (projectId: string, oldName: string, newName: string) => Promise<void>;
  deleteCategory: (projectId: string, category: string) => Promise<void>;
  
  // Search
  searchComponents: (projectId: string, query: string) => Promise<UserComponent[]>;
}

const defaultEditingMetadata: EditingMetadata = {
  name: 'New Component',
  description: '',
  category: 'Uncategorized',
  tags: []
};

const createDefaultContainer = (): AppComponent => ({
  id: crypto.randomUUID(),
  type: 'container',
  props: {
    display: 'flex',
    flexDirection: 'column',
    gap: { value: 16, unit: 'px' },
    spacingControl: {
      margin: { top: 0, right: 0, bottom: 0, left: 0, unit: 'px', mode: 'individual' },
      padding: { top: 16, right: 16, bottom: 16, left: 16, unit: 'px', mode: 'individual' }
    }
  },
  style: {},
  children: []
});

const createDefaultStates = (): ComponentState[] => [
  {
    id: crypto.randomUUID(),
    type: 'hover',
    styleModifiers: {},
    transition: { duration: 200, easing: 'ease-out', properties: ['all'] }
  },
  {
    id: crypto.randomUUID(),
    type: 'active',
    styleModifiers: {},
    transition: { duration: 100, easing: 'ease-out', properties: ['all'] }
  },
  {
    id: crypto.randomUUID(),
    type: 'focus',
    styleModifiers: {},
    transition: { duration: 150, easing: 'ease-in-out', properties: ['all'] }
  },
  {
    id: crypto.randomUUID(),
    type: 'disabled',
    styleModifiers: { opacity: 0.5 },
    classModifiers: { add: ['pointer-events-none', 'cursor-not-allowed'] }
  },
  {
    id: crypto.randomUUID(),
    type: 'loading',
    styleModifiers: {},
    classModifiers: { add: ['animate-pulse'] }
  }
];

export const useUserComponentStore = create<UserComponentState>((set, get) => ({
  // Initial state
  components: [],
  categories: [],
  isLoading: false,
  error: null,
  selectedComponentId: null,
  isLibraryOpen: false,
  isSaveDialogOpen: false,
  componentToSave: null,
  isCreateDialogOpen: false,
  editingComponent: null,
  
  // Component Editing Mode initial state
  isEditingMode: false,
  editingComponentId: null,
  editingDefinition: null,
  editingProps: [],
  editingVariants: [],
  editingSlots: [],
  editingStates: [],
  editingClassRefs: [],
  editingMetadata: { ...defaultEditingMetadata },
  returnToPageId: null,
  
  // Preview state
  previewState: 'default',
  previewVariant: null,

  loadComponents: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await userComponentService.getProjectComponents(projectId);
      set({ 
        components: data.components, 
        categories: data.categories,
        isLoading: false 
      });
    } catch (error) {
      console.error('[UserComponentStore] Failed to load components:', error);
      set({ error: 'Failed to load components', isLoading: false });
    }
  },

  createComponent: async (projectId, name, definition, props = [], options) => {
    set({ isLoading: true, error: null });
    try {
      const newComponent = await userComponentService.createComponent(
        projectId, name, definition, props, options
      );
      
      set(state => ({
        components: [...state.components, newComponent],
        categories: options?.category && !state.categories.includes(options.category)
          ? [...state.categories, options.category]
          : state.categories,
        isLoading: false,
        isSaveDialogOpen: false,
        componentToSave: null
      }));
      
      return newComponent;
    } catch (error) {
      console.error('[UserComponentStore] Failed to create component:', error);
      set({ error: 'Failed to create component', isLoading: false });
      return null;
    }
  },

  updateComponent: async (projectId, componentId, updates) => {
    set({ isLoading: true, error: null });
    try {
      await userComponentService.updateComponent(projectId, componentId, updates);
      
      set(state => ({
        components: state.components.map(c => 
          c.id === componentId 
            ? { ...c, ...updates, updatedAt: new Date().toISOString() } 
            : c
        ),
        isLoading: false
      }));
    } catch (error) {
      console.error('[UserComponentStore] Failed to update component:', error);
      set({ error: 'Failed to update component', isLoading: false });
    }
  },

  deleteComponent: async (projectId, componentId) => {
    set({ isLoading: true, error: null });
    try {
      await userComponentService.deleteComponent(projectId, componentId);
      
      set(state => {
        const newComponents = state.components.filter(c => c.id !== componentId);
        const usedCategories = new Set(newComponents.map(c => c.category).filter(Boolean));
        return {
          components: newComponents,
          categories: state.categories.filter(cat => usedCategories.has(cat)),
          selectedComponentId: state.selectedComponentId === componentId ? null : state.selectedComponentId,
          isLoading: false
        };
      });
    } catch (error) {
      console.error('[UserComponentStore] Failed to delete component:', error);
      set({ error: 'Failed to delete component', isLoading: false });
    }
  },

  duplicateComponent: async (projectId, componentId) => {
    set({ isLoading: true, error: null });
    try {
      const newComponent = await userComponentService.duplicateComponent(projectId, componentId);
      if (newComponent) {
        set(state => ({
          components: [...state.components, newComponent],
          isLoading: false
        }));
      }
      return newComponent;
    } catch (error) {
      console.error('[UserComponentStore] Failed to duplicate component:', error);
      set({ error: 'Failed to duplicate component', isLoading: false });
      return null;
    }
  },

  selectComponent: (componentId) => {
    set({ selectedComponentId: componentId });
  },

  setLibraryOpen: (open) => {
    set({ isLibraryOpen: open });
  },

  openSaveDialog: (component) => {
    set({ isSaveDialogOpen: true, componentToSave: component });
  },

  closeSaveDialog: () => {
    set({ isSaveDialogOpen: false, componentToSave: null });
  },

  openCreateDialog: () => {
    set({ isCreateDialogOpen: true, editingComponent: null });
  },

  openEditDialog: (component) => {
    set({ isCreateDialogOpen: true, editingComponent: component });
  },

  closeCreateDialog: () => {
    set({ isCreateDialogOpen: false, editingComponent: null });
  },

  // Component Editing Mode actions
  enterEditingMode: (component, returnPageId) => {
    if (component) {
      // Edit existing component
      set({
        isEditingMode: true,
        editingComponentId: component.id,
        editingDefinition: JSON.parse(JSON.stringify(component.definition)),
        editingProps: JSON.parse(JSON.stringify(component.props || [])),
        editingVariants: JSON.parse(JSON.stringify(component.variants || [])),
        editingSlots: JSON.parse(JSON.stringify(component.slots || [])),
        editingStates: JSON.parse(JSON.stringify(component.states || createDefaultStates())),
        editingClassRefs: JSON.parse(JSON.stringify(component.inheritedClasses || [])),
        editingMetadata: {
          name: component.name,
          description: component.description || '',
          category: component.category || 'Uncategorized',
          tags: component.tags || []
        },
        returnToPageId: returnPageId || null,
        previewState: 'default',
        previewVariant: component.defaultVariant || null
      });
    } else {
      // Create new component
      set({
        isEditingMode: true,
        editingComponentId: null,
        editingDefinition: createDefaultContainer(),
        editingProps: [],
        editingVariants: [],
        editingSlots: [],
        editingStates: createDefaultStates(),
        editingClassRefs: [],
        editingMetadata: { ...defaultEditingMetadata },
        returnToPageId: returnPageId || null,
        previewState: 'default',
        previewVariant: null
      });
    }
  },

  exitEditingMode: async (save = false, projectId) => {
    const state = get();
    
    if (save && projectId && state.editingDefinition) {
      try {
        const componentData = {
          name: state.editingMetadata.name,
          description: state.editingMetadata.description,
          category: state.editingMetadata.category,
          tags: state.editingMetadata.tags,
          definition: state.editingDefinition,
          props: state.editingProps,
          variants: state.editingVariants,
          slots: state.editingSlots,
          states: state.editingStates,
          inheritedClasses: state.editingClassRefs,
          defaultVariant: state.previewVariant || undefined
        };

        if (state.editingComponentId) {
          await state.updateComponent(projectId, state.editingComponentId, componentData);
        } else {
          await state.createComponent(
            projectId,
            state.editingMetadata.name,
            state.editingDefinition,
            state.editingProps,
            {
              description: state.editingMetadata.description,
              category: state.editingMetadata.category,
              tags: state.editingMetadata.tags,
              variants: state.editingVariants,
              slots: state.editingSlots,
              states: state.editingStates
            }
          );
        }
      } catch (error) {
        console.error('[UserComponentStore] Failed to save component:', error);
      }
    }
    
    set({
      isEditingMode: false,
      editingComponentId: null,
      editingDefinition: null,
      editingProps: [],
      editingVariants: [],
      editingSlots: [],
      editingStates: [],
      editingClassRefs: [],
      editingMetadata: { ...defaultEditingMetadata },
      returnToPageId: null,
      previewState: 'default',
      previewVariant: null
    });
  },

  updateEditingDefinition: (definition) => {
    // Also extract class references when definition updates
    const classRefs = userComponentService.extractClassReferences(definition);
    set({ 
      editingDefinition: definition,
      editingClassRefs: classRefs
    });
  },

  // Props management
  updateEditingProps: (props) => {
    set({ editingProps: props });
  },

  addEditingProp: (type = 'string') => {
    set(state => ({
      editingProps: [
        ...state.editingProps,
        createDefaultProp(`prop${state.editingProps.length + 1}`, type)
      ]
    }));
  },

  updateEditingProp: (propId, updates) => {
    set(state => ({
      editingProps: state.editingProps.map(prop =>
        prop.id === propId ? { ...prop, ...updates } : prop
      )
    }));
  },

  removeEditingProp: (propId) => {
    set(state => ({
      editingProps: state.editingProps.filter(prop => prop.id !== propId)
    }));
  },

  addPropBinding: (propId, componentId, property) => {
    set(state => ({
      editingProps: state.editingProps.map(prop => {
        if (prop.id !== propId) return prop;
        
        // Check if binding already exists
        const exists = prop.bindings.some(
          b => b.componentId === componentId && b.property === property
        );
        if (exists) return prop;
        
        return {
          ...prop,
          bindings: [...prop.bindings, { componentId, property }]
        };
      })
    }));
  },

  removePropBinding: (propId, componentId, property) => {
    set(state => ({
      editingProps: state.editingProps.map(prop => {
        if (prop.id !== propId) return prop;
        return {
          ...prop,
          bindings: prop.bindings.filter(
            b => !(b.componentId === componentId && b.property === property)
          )
        };
      })
    }));
  },

  // Variants management
  addEditingVariant: (name) => {
    set(state => ({
      editingVariants: [
        ...state.editingVariants,
        createDefaultVariant(name || `variant${state.editingVariants.length + 1}`)
      ]
    }));
  },

  updateEditingVariant: (variantId, updates) => {
    set(state => ({
      editingVariants: state.editingVariants.map(v =>
        v.id === variantId ? { ...v, ...updates } : v
      )
    }));
  },

  removeEditingVariant: (variantId) => {
    set(state => ({
      editingVariants: state.editingVariants.filter(v => v.id !== variantId),
      previewVariant: state.previewVariant === variantId ? null : state.previewVariant
    }));
  },

  setDefaultVariant: (variantId) => {
    set(state => ({
      editingVariants: state.editingVariants.map(v => ({
        ...v,
        isDefault: v.id === variantId
      })),
      previewVariant: variantId
    }));
  },

  // Slots management
  addEditingSlot: (name) => {
    set(state => ({
      editingSlots: [
        ...state.editingSlots,
        createDefaultSlot(name || `slot${state.editingSlots.length + 1}`)
      ]
    }));
  },

  updateEditingSlot: (slotId, updates) => {
    set(state => ({
      editingSlots: state.editingSlots.map(s =>
        s.id === slotId ? { ...s, ...updates } : s
      )
    }));
  },

  removeEditingSlot: (slotId) => {
    set(state => ({
      editingSlots: state.editingSlots.filter(s => s.id !== slotId)
    }));
  },

  // States management
  updateEditingState: (stateType, updates) => {
    set(state => ({
      editingStates: state.editingStates.map(s =>
        s.type === stateType ? { ...s, ...updates } : s
      )
    }));
  },

  // Class inheritance management
  updateClassInheritance: (className, mode) => {
    set(state => ({
      editingClassRefs: state.editingClassRefs.map(ref =>
        ref.className === className ? { ...ref, mode } : ref
      )
    }));
  },

  // Preview controls
  setPreviewState: (previewState) => {
    set({ previewState });
  },

  setPreviewVariant: (previewVariant) => {
    set({ previewVariant });
  },

  // Metadata management
  updateEditingMetadata: (metadata) => {
    set(state => ({
      editingMetadata: { ...state.editingMetadata, ...metadata }
    }));
  },

  // Category actions
  addCategory: async (projectId, category) => {
    try {
      await userComponentService.addCategory(projectId, category);
      set(state => ({
        categories: state.categories.includes(category) 
          ? state.categories 
          : [...state.categories, category]
      }));
    } catch (error) {
      console.error('[UserComponentStore] Failed to add category:', error);
    }
  },

  renameCategory: async (projectId, oldName, newName) => {
    try {
      await userComponentService.renameCategory(projectId, oldName, newName);
      set(state => ({
        categories: state.categories.map(c => c === oldName ? newName : c),
        components: state.components.map(comp => 
          comp.category === oldName ? { ...comp, category: newName } : comp
        )
      }));
    } catch (error) {
      console.error('[UserComponentStore] Failed to rename category:', error);
    }
  },

  deleteCategory: async (projectId, category) => {
    try {
      await userComponentService.deleteCategory(projectId, category);
      set(state => ({
        categories: state.categories.filter(c => c !== category),
        components: state.components.map(comp => 
          comp.category === category ? { ...comp, category: 'Uncategorized' } : comp
        )
      }));
    } catch (error) {
      console.error('[UserComponentStore] Failed to delete category:', error);
    }
  },

  // Search
  searchComponents: async (projectId, query) => {
    try {
      return await userComponentService.searchComponents(projectId, query);
    } catch (error) {
      console.error('[UserComponentStore] Failed to search components:', error);
      return [];
    }
  }
}));
