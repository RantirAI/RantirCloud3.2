import { supabase } from '@/integrations/supabase/client';
import { 
  UserComponent, 
  UserComponentsData, 
  ComponentProp,
  ComponentVariant,
  ComponentSlot,
  ComponentState,
  ComponentClassReference,
  ResponsiveOverride,
  UserComponentInstance,
  ComponentStateType,
  parseUserComponentsData,
  cloneComponentWithNewIds,
  resolveComponentInstance,
  createDefaultSlot,
  createDefaultVariant
} from '@/types/userComponent';
import { AppComponent } from '@/types/appBuilder';
import { useClassStore } from '@/stores/classStore';

/**
 * Service for managing user-created reusable components
 * Components are stored as JSONB in app_projects.user_components column
 */
export const userComponentService = {
  /**
   * Get all user components for a project
   */
  async getProjectComponents(projectId: string): Promise<UserComponentsData> {
    const { data, error } = await supabase
      .from('app_projects')
      .select('user_components')
      .eq('id', projectId)
      .single();
    
    if (error) {
      console.error('[UserComponentService] Error fetching components:', error);
      throw error;
    }
    
    return parseUserComponentsData(data?.user_components);
  },

  /**
   * Save all user components for a project
   */
  async saveProjectComponents(projectId: string, data: UserComponentsData): Promise<void> {
    const { error } = await supabase
      .from('app_projects')
      .update({ 
        user_components: data as any,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);
    
    if (error) {
      console.error('[UserComponentService] Error saving components:', error);
      throw error;
    }
  },

  /**
   * Create a new user component from an existing canvas element
   */
  async createComponent(
    projectId: string,
    name: string,
    definition: AppComponent,
    props: ComponentProp[] = [],
    options?: {
      description?: string;
      category?: string;
      thumbnail?: string;
      variants?: ComponentVariant[];
      slots?: ComponentSlot[];
      states?: ComponentState[];
      tags?: string[];
    }
  ): Promise<UserComponent> {
    const current = await this.getProjectComponents(projectId);
    
    // Extract class references from definition
    const inheritedClasses = this.extractClassReferences(definition);
    
    // Create new component
    const newComponent: UserComponent = {
      id: crypto.randomUUID(),
      name,
      description: options?.description,
      category: options?.category || 'Uncategorized',
      tags: options?.tags || [],
      definition: cloneComponentWithNewIds(definition),
      props,
      variants: options?.variants || [],
      slots: options?.slots || [],
      states: options?.states || this.createDefaultStates(),
      inheritedClasses,
      responsiveOverrides: [],
      events: [],
      version: 1,
      thumbnail: options?.thumbnail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    current.components.push(newComponent);
    
    if (options?.category && !current.categories.includes(options.category)) {
      current.categories.push(options.category);
    }
    
    await this.saveProjectComponents(projectId, current);
    
    return newComponent;
  },

  /**
   * Update an existing user component
   */
  async updateComponent(
    projectId: string,
    componentId: string,
    updates: Partial<Omit<UserComponent, 'id' | 'createdAt'>>
  ): Promise<UserComponent | null> {
    const current = await this.getProjectComponents(projectId);
    
    const index = current.components.findIndex(c => c.id === componentId);
    if (index === -1) {
      console.warn('[UserComponentService] Component not found:', componentId);
      return null;
    }
    
    // If definition is being updated, re-extract class references
    if (updates.definition) {
      updates.inheritedClasses = this.extractClassReferences(updates.definition);
    }
    
    // Increment version on update
    const currentVersion = current.components[index].version || 1;
    
    current.components[index] = {
      ...current.components[index],
      ...updates,
      version: currentVersion + 1,
      updatedAt: new Date().toISOString()
    };
    
    if (updates.category && !current.categories.includes(updates.category)) {
      current.categories.push(updates.category);
    }
    
    await this.saveProjectComponents(projectId, current);
    
    return current.components[index];
  },

  /**
   * Delete a user component
   */
  async deleteComponent(projectId: string, componentId: string): Promise<boolean> {
    const current = await this.getProjectComponents(projectId);
    
    const index = current.components.findIndex(c => c.id === componentId);
    if (index === -1) {
      return false;
    }
    
    current.components.splice(index, 1);
    
    const usedCategories = new Set(current.components.map(c => c.category).filter(Boolean));
    current.categories = current.categories.filter(cat => usedCategories.has(cat));
    
    await this.saveProjectComponents(projectId, current);
    
    return true;
  },

  /**
   * Get a single component by ID
   */
  async getComponent(projectId: string, componentId: string): Promise<UserComponent | null> {
    const current = await this.getProjectComponents(projectId);
    return current.components.find(c => c.id === componentId) || null;
  },

  /**
   * Instantiate a user component for placement on canvas
   */
  async instantiateComponent(
    projectId: string,
    componentId: string,
    propOverrides?: Record<string, any>,
    options?: {
      activeVariant?: string;
      slots?: Record<string, AppComponent[]>;
    }
  ): Promise<AppComponent | null> {
    const component = await this.getComponent(projectId, componentId);
    if (!component) {
      return null;
    }
    
    // Create instance config
    const instance: UserComponentInstance = {
      userComponentId: componentId,
      propValues: propOverrides || {},
      activeVariant: options?.activeVariant || component.defaultVariant,
      slots: options?.slots,
      classInheritance: this.createDefaultClassInheritance(component)
    };
    
    // Resolve the component with all overrides
    const resolvedDefinition = resolveComponentInstance(component, instance);
    
    return {
      ...resolvedDefinition,
      id: crypto.randomUUID(),
      userComponentRef: {
        userComponentId: componentId,
        propValues: instance.propValues,
        activeVariant: instance.activeVariant,
        classInheritance: instance.classInheritance
      }
    } as AppComponent;
  },

  /**
   * Create default class inheritance mode for all classes in component
   */
  createDefaultClassInheritance(component: UserComponent): Record<string, 'shared' | 'detached' | 'override'> {
    const inheritance: Record<string, 'shared' | 'detached' | 'override'> = {};
    
    for (const classRef of component.inheritedClasses || []) {
      inheritance[classRef.className] = classRef.mode;
    }
    
    return inheritance;
  },

  /**
   * Extract all class references from a component definition
   */
  extractClassReferences(definition: AppComponent): ComponentClassReference[] {
    const classes: ComponentClassReference[] = [];
    const seen = new Set<string>();
    
    const extractFromNode = (node: AppComponent) => {
      const appliedClasses = node.props?.appliedClasses || [];
      for (const className of appliedClasses) {
        if (typeof className === 'string' && !seen.has(className)) {
          seen.add(className);
          classes.push({
            className,
            mode: 'shared'  // Default to shared - updates to class affect all instances
          });
        }
      }
      
      if (node.children) {
        for (const child of node.children) {
          extractFromNode(child);
        }
      }
    };
    
    extractFromNode(definition);
    return classes;
  },

  /**
   * Create default component states
   */
  createDefaultStates(): ComponentState[] {
    return [
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
  },

  /**
   * Update class inheritance mode for an instance
   */
  async updateInstanceClassMode(
    projectId: string,
    instanceId: string,
    className: string,
    mode: 'shared' | 'detached' | 'override',
    localOverrides?: Record<string, any>
  ): Promise<void> {
    // This would update the instance's class inheritance settings
    // The actual implementation depends on how instances are stored
    console.log('[UserComponentService] Updating class mode:', {
      instanceId,
      className,
      mode,
      localOverrides
    });
  },

  /**
   * Propagate class updates to all instances using shared mode
   */
  propagateClassUpdate(
    component: UserComponent,
    className: string,
    newStyles: Record<string, any>
  ): UserComponent {
    // Find all nodes using this class and update if mode is 'shared'
    const classRef = component.inheritedClasses?.find(c => c.className === className);
    
    if (!classRef || classRef.mode !== 'shared') {
      return component;
    }
    
    // The actual style application happens at render time
    // through the class resolution system
    return {
      ...component,
      updatedAt: new Date().toISOString()
    };
  },

  /**
   * Add a variant to a component
   */
  async addVariant(
    projectId: string,
    componentId: string,
    variant: ComponentVariant
  ): Promise<UserComponent | null> {
    const component = await this.getComponent(projectId, componentId);
    if (!component) return null;
    
    const variants = [...(component.variants || []), variant];
    
    return this.updateComponent(projectId, componentId, { variants });
  },

  /**
   * Add a slot to a component
   */
  async addSlot(
    projectId: string,
    componentId: string,
    slot: ComponentSlot
  ): Promise<UserComponent | null> {
    const component = await this.getComponent(projectId, componentId);
    if (!component) return null;
    
    const slots = [...(component.slots || []), slot];
    
    return this.updateComponent(projectId, componentId, { slots });
  },

  /**
   * Update a state's style modifiers
   */
  async updateState(
    projectId: string,
    componentId: string,
    stateType: ComponentStateType,
    updates: Partial<ComponentState>
  ): Promise<UserComponent | null> {
    const component = await this.getComponent(projectId, componentId);
    if (!component) return null;
    
    const states = (component.states || []).map(state =>
      state.type === stateType ? { ...state, ...updates } : state
    );
    
    return this.updateComponent(projectId, componentId, { states });
  },

  /**
   * Resolve component props with bindings
   */
  resolveComponentProps(
    definition: AppComponent,
    props: ComponentProp[],
    propValues: Record<string, any>
  ): AppComponent {
    const resolved = JSON.parse(JSON.stringify(definition)) as AppComponent;
    
    for (const prop of props) {
      const value = propValues[prop.name] ?? prop.defaultValue;
      if (value === undefined) continue;
      
      for (const binding of prop.bindings) {
        this.applyBindingToComponent(resolved, binding.componentId, binding.property, value);
      }
    }
    
    return resolved;
  },

  /**
   * Apply a single binding value to a component in the tree
   */
  applyBindingToComponent(
    root: AppComponent,
    targetId: string,
    property: string,
    value: any
  ): void {
    const findAndApply = (component: AppComponent): boolean => {
      if (component.id === targetId) {
        if (property.includes('.')) {
          const parts = property.split('.');
          let obj: any = component;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!obj[parts[i]]) obj[parts[i]] = {};
            obj = obj[parts[i]];
          }
          obj[parts[parts.length - 1]] = value;
        } else if (property.startsWith('props.')) {
          const propName = property.substring(6);
          if (!component.props) component.props = {};
          component.props[propName] = value;
        } else {
          (component as any)[property] = value;
        }
        return true;
      }
      
      if (component.children) {
        for (const child of component.children) {
          if (findAndApply(child)) return true;
        }
      }
      
      return false;
    };
    
    findAndApply(root);
  },

  /**
   * Add a new category
   */
  async addCategory(projectId: string, category: string): Promise<void> {
    const current = await this.getProjectComponents(projectId);
    
    if (!current.categories.includes(category)) {
      current.categories.push(category);
      await this.saveProjectComponents(projectId, current);
    }
  },

  /**
   * Rename a category
   */
  async renameCategory(projectId: string, oldName: string, newName: string): Promise<void> {
    const current = await this.getProjectComponents(projectId);
    
    const index = current.categories.indexOf(oldName);
    if (index !== -1) {
      current.categories[index] = newName;
    }
    
    for (const component of current.components) {
      if (component.category === oldName) {
        component.category = newName;
      }
    }
    
    await this.saveProjectComponents(projectId, current);
  },

  /**
   * Delete a category (moves components to 'Uncategorized')
   */
  async deleteCategory(projectId: string, category: string): Promise<void> {
    const current = await this.getProjectComponents(projectId);
    
    current.categories = current.categories.filter(c => c !== category);
    
    for (const component of current.components) {
      if (component.category === category) {
        component.category = 'Uncategorized';
      }
    }
    
    await this.saveProjectComponents(projectId, current);
  },

  /**
   * Duplicate a component
   */
  async duplicateComponent(
    projectId: string,
    componentId: string,
    newName?: string
  ): Promise<UserComponent | null> {
    const component = await this.getComponent(projectId, componentId);
    if (!component) return null;
    
    return this.createComponent(
      projectId,
      newName || `${component.name} (Copy)`,
      component.definition,
      component.props,
      {
        description: component.description,
        category: component.category,
        thumbnail: component.thumbnail,
        variants: component.variants,
        slots: component.slots,
        states: component.states,
        tags: component.tags
      }
    );
  },

  /**
   * Search components by name, description, or tags
   */
  async searchComponents(
    projectId: string,
    query: string
  ): Promise<UserComponent[]> {
    const current = await this.getProjectComponents(projectId);
    const lowerQuery = query.toLowerCase();
    
    return current.components.filter(component => {
      const nameMatch = component.name.toLowerCase().includes(lowerQuery);
      const descMatch = component.description?.toLowerCase().includes(lowerQuery);
      const tagMatch = component.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
      const categoryMatch = component.category?.toLowerCase().includes(lowerQuery);
      
      return nameMatch || descMatch || tagMatch || categoryMatch;
    });
  }
};
