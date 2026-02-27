import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { 
  AppBuilderVariable, 
  VariableScope, 
  VariableDataType,
  DbAppVariable,
  DbPageVariable,
  getDefaultValueForType,
  parseVariableBinding
} from '@/types/variables';

interface VariableDefinition {
  id: string;
  name: string;
  dataType: VariableDataType;
  initialValue: any;
  description?: string;
  isComputed?: boolean;
  formula?: string;
  isQuery?: boolean;
  queryConfig?: any;
  preserveOnNavigation?: boolean;
  persistToStorage?: boolean;
  pageId?: string;
}

interface VariableState {
  // Definitions (from database)
  appVariableDefinitions: VariableDefinition[];
  pageVariableDefinitions: VariableDefinition[];
  
  // Runtime values (reactive)
  appVariables: Record<string, any>;
  pageVariables: Record<string, any>;
  componentVariables: Record<string, Record<string, any>>;
  
  // Loading state
  isLoading: boolean;
  currentProjectId: string | null;
  currentPageId: string | null;
  
  // Subscriptions for reactivity
  subscriptions: Map<string, Set<() => void>>;
  
  // Actions - Loading
  loadAppVariables: (projectId: string) => Promise<void>;
  loadPageVariables: (projectId: string, pageId: string) => Promise<void>;
  setCurrentPage: (pageId: string) => void;
  
  // Actions - CRUD
  createVariable: (variable: Omit<AppBuilderVariable, 'id' | 'createdAt' | 'updatedAt'>) => Promise<AppBuilderVariable>;
  updateVariableDefinition: (id: string, scope: VariableScope, updates: Partial<VariableDefinition>) => Promise<void>;
  deleteVariable: (id: string, scope: VariableScope) => Promise<void>;
  
  // Actions - Runtime Values
  setVariable: (scope: VariableScope, name: string, value: any, componentId?: string) => void;
  getVariable: (scope: VariableScope, name: string, componentId?: string) => any;
  incrementVariable: (scope: VariableScope, name: string, amount?: number) => void;
  decrementVariable: (scope: VariableScope, name: string, amount?: number) => void;
  toggleVariable: (scope: VariableScope, name: string) => void;
  appendToVariable: (scope: VariableScope, name: string, item: any) => void;
  removeFromVariable: (scope: VariableScope, name: string, index: number) => void;
  
  // Actions - Page Navigation
  resetPageVariables: () => void;
  
  // Actions - Subscriptions
  subscribe: (variableKey: string, callback: () => void) => () => void;
  notifySubscribers: (variableKey: string) => void;
  
  // Actions - Resolution
  resolveBinding: (binding: string, dataContext?: Record<string, any>) => any;
  resolveAllBindings: (obj: any, dataContext?: Record<string, any>) => any;
  
  // Actions - Utility
  getAvailableVariables: (scope?: VariableScope) => VariableDefinition[];
  clearAll: () => void;
}

export const useVariableStore = create<VariableState>()(
  subscribeWithSelector((set, get) => ({
    appVariableDefinitions: [],
    pageVariableDefinitions: [],
    appVariables: {},
    pageVariables: {},
    componentVariables: {},
    isLoading: false,
    currentProjectId: null,
    currentPageId: null,
    subscriptions: new Map(),
    
    loadAppVariables: async (projectId: string) => {
      set({ isLoading: true, currentProjectId: projectId });
      
      try {
        const { data, error } = await supabase
          .from('app_variables')
          .select('*')
          .eq('app_project_id', projectId)
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        
        const definitions: VariableDefinition[] = (data || []).map((v: DbAppVariable) => ({
          id: v.id,
          name: v.name,
          dataType: (v.data_type || 'string') as VariableDataType,
          initialValue: v.initial_value ?? v.computed_value ?? getDefaultValueForType((v.data_type || 'string') as VariableDataType),
          description: v.description || undefined,
          isComputed: v.variable_type === 'computed',
          formula: v.computation_logic || undefined,
          isQuery: v.variable_type === 'aggregation',
          queryConfig: v.query_config,
          preserveOnNavigation: v.preserve_on_navigation ?? true
        }));
        
        // Initialize runtime values from definitions
        const runtimeValues: Record<string, any> = {};
        definitions.forEach(def => {
          // Check localStorage for persisted values
          const storageKey = `app_var_${projectId}_${def.name}`;
          const persistedValue = localStorage.getItem(storageKey);
          if (persistedValue !== null) {
            try {
              runtimeValues[def.name] = JSON.parse(persistedValue);
            } catch {
              runtimeValues[def.name] = def.initialValue;
            }
          } else {
            runtimeValues[def.name] = def.initialValue;
          }
        });
        
        set({ 
          appVariableDefinitions: definitions,
          appVariables: runtimeValues,
          isLoading: false 
        });
      } catch (error) {
        console.error('Error loading app variables:', error);
        set({ isLoading: false });
      }
    },
    
    loadPageVariables: async (projectId: string, pageId: string) => {
      set({ currentPageId: pageId });
      
      try {
        const { data, error } = await supabase
          .from('page_variables')
          .select('*')
          .eq('app_project_id', projectId)
          .eq('page_id', pageId)
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        
        const definitions: VariableDefinition[] = (data || []).map((v: DbPageVariable) => ({
          id: v.id,
          name: v.name,
          dataType: v.data_type as VariableDataType,
          initialValue: v.initial_value ?? getDefaultValueForType(v.data_type as VariableDataType),
          description: v.description || undefined,
          persistToStorage: v.is_persisted,
          pageId: v.page_id
        }));
        
        // Initialize runtime values
        const runtimeValues: Record<string, any> = {};
        definitions.forEach(def => {
          if (def.persistToStorage) {
            const storageKey = `page_var_${projectId}_${pageId}_${def.name}`;
            const persistedValue = localStorage.getItem(storageKey);
            if (persistedValue !== null) {
              try {
                runtimeValues[def.name] = JSON.parse(persistedValue);
              } catch {
                runtimeValues[def.name] = def.initialValue;
              }
            } else {
              runtimeValues[def.name] = def.initialValue;
            }
          } else {
            runtimeValues[def.name] = def.initialValue;
          }
        });
        
        set({ 
          pageVariableDefinitions: definitions,
          pageVariables: runtimeValues
        });
      } catch (error) {
        console.error('Error loading page variables:', error);
      }
    },
    
    setCurrentPage: (pageId: string) => {
      const { currentProjectId, currentPageId } = get();
      if (pageId !== currentPageId && currentProjectId) {
        get().resetPageVariables();
        get().loadPageVariables(currentProjectId, pageId);
      }
    },
    
    createVariable: async (variable) => {
      const { currentProjectId } = get();
      if (!currentProjectId) throw new Error('No project loaded');
      
      if (variable.scope === 'page') {
        const insertData = {
          app_project_id: variable.appProjectId,
          page_id: variable.pageId,
          user_id: variable.userId,
          name: variable.name,
          data_type: variable.dataType,
          initial_value: variable.initialValue,
          description: variable.description,
          is_persisted: variable.persistToStorage ?? false
        } as any;
        
        const { data, error } = await supabase
          .from('page_variables')
          .insert(insertData)
          .select()
          .single();
        
        if (error) throw error;
        
        // Reload page variables
        if (variable.pageId) {
          await get().loadPageVariables(currentProjectId, variable.pageId);
        }
        
        return {
          ...variable,
          id: data.id,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        } as AppBuilderVariable;
      } else {
        const insertData = {
          app_project_id: variable.appProjectId,
          user_id: variable.userId,
          name: variable.name,
          variable_type: variable.isComputed ? 'computed' : (variable.isQuery ? 'aggregation' : 'static'),
          data_type: variable.dataType || 'string',
          initial_value: variable.initialValue ?? null,
          description: variable.description,
          preserve_on_navigation: variable.preserveOnNavigation ?? true,
          is_active: variable.isActive ?? true
        } as any;
        
        const { data, error } = await supabase
          .from('app_variables')
          .insert(insertData)
          .select()
          .single();
        
        if (error) throw error;
        
        // Reload app variables
        await get().loadAppVariables(currentProjectId);
        
        return {
          ...variable,
          id: data.id,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        } as AppBuilderVariable;
      }
    },
    
    updateVariableDefinition: async (id, scope, updates) => {
      const { currentProjectId, currentPageId } = get();
      if (!currentProjectId) return;
      
      if (scope === 'page') {
        const { error } = await supabase
          .from('page_variables')
          .update({
            name: updates.name,
            data_type: updates.dataType,
            initial_value: updates.initialValue,
            description: updates.description,
            is_persisted: updates.persistToStorage
          })
          .eq('id', id);
        
        if (error) throw error;
        
        if (currentPageId) {
          await get().loadPageVariables(currentProjectId, currentPageId);
        }
      } else {
        const { error } = await supabase
          .from('app_variables')
          .update({
            name: updates.name,
            data_type: updates.dataType,
            initial_value: updates.initialValue,
            computation_logic: updates.formula,
            query_config: updates.queryConfig,
            description: updates.description,
            preserve_on_navigation: updates.preserveOnNavigation
          })
          .eq('id', id);
        
        if (error) throw error;
        
        await get().loadAppVariables(currentProjectId);
      }
    },
    
    deleteVariable: async (id, scope) => {
      const { currentProjectId, currentPageId } = get();
      if (!currentProjectId) return;
      
      const table = scope === 'page' ? 'page_variables' : 'app_variables';
      const { error } = await supabase.from(table).delete().eq('id', id);
      
      if (error) throw error;
      
      if (scope === 'page' && currentPageId) {
        await get().loadPageVariables(currentProjectId, currentPageId);
      } else {
        await get().loadAppVariables(currentProjectId);
      }
    },
    
    setVariable: (scope, name, value, componentId) => {
      const { currentProjectId, currentPageId, appVariableDefinitions, pageVariableDefinitions } = get();
      
      if (scope === 'app') {
        const def = appVariableDefinitions.find(d => d.name === name);
        set(state => ({
          appVariables: { ...state.appVariables, [name]: value }
        }));
        
        // Persist if needed
        if (def?.preserveOnNavigation && currentProjectId) {
          localStorage.setItem(`app_var_${currentProjectId}_${name}`, JSON.stringify(value));
        }
        
        get().notifySubscribers(`app.${name}`);
      } else if (scope === 'page') {
        const def = pageVariableDefinitions.find(d => d.name === name);
        set(state => ({
          pageVariables: { ...state.pageVariables, [name]: value }
        }));
        
        // Persist if needed
        if (def?.persistToStorage && currentProjectId && currentPageId) {
          localStorage.setItem(`page_var_${currentProjectId}_${currentPageId}_${name}`, JSON.stringify(value));
        }
        
        get().notifySubscribers(`page.${name}`);
      } else if (scope === 'component' && componentId) {
        set(state => ({
          componentVariables: {
            ...state.componentVariables,
            [componentId]: {
              ...state.componentVariables[componentId],
              [name]: value
            }
          }
        }));
        
        get().notifySubscribers(`component.${componentId}.${name}`);
      }
    },
    
    getVariable: (scope, name, componentId) => {
      const { appVariables, pageVariables, componentVariables } = get();
      
      if (scope === 'app') {
        return appVariables[name];
      } else if (scope === 'page') {
        return pageVariables[name];
      } else if (scope === 'component' && componentId) {
        return componentVariables[componentId]?.[name];
      }
      
      return undefined;
    },
    
    incrementVariable: (scope, name, amount = 1) => {
      const current = get().getVariable(scope, name);
      if (typeof current === 'number') {
        get().setVariable(scope, name, current + amount);
      }
    },
    
    decrementVariable: (scope, name, amount = 1) => {
      const current = get().getVariable(scope, name);
      if (typeof current === 'number') {
        get().setVariable(scope, name, current - amount);
      }
    },
    
    toggleVariable: (scope, name) => {
      const current = get().getVariable(scope, name);
      if (typeof current === 'boolean') {
        get().setVariable(scope, name, !current);
      }
    },
    
    appendToVariable: (scope, name, item) => {
      const current = get().getVariable(scope, name);
      if (Array.isArray(current)) {
        get().setVariable(scope, name, [...current, item]);
      }
    },
    
    removeFromVariable: (scope, name, index) => {
      const current = get().getVariable(scope, name);
      if (Array.isArray(current)) {
        const newArray = [...current];
        newArray.splice(index, 1);
        get().setVariable(scope, name, newArray);
      }
    },
    
    resetPageVariables: () => {
      const { pageVariableDefinitions } = get();
      const runtimeValues: Record<string, any> = {};
      
      pageVariableDefinitions.forEach(def => {
        runtimeValues[def.name] = def.initialValue;
      });
      
      set({ pageVariables: runtimeValues, componentVariables: {} });
    },
    
    subscribe: (variableKey, callback) => {
      const { subscriptions } = get();
      
      if (!subscriptions.has(variableKey)) {
        subscriptions.set(variableKey, new Set());
      }
      
      subscriptions.get(variableKey)!.add(callback);
      
      // Return unsubscribe function
      return () => {
        subscriptions.get(variableKey)?.delete(callback);
      };
    },
    
    notifySubscribers: (variableKey) => {
      const { subscriptions } = get();
      subscriptions.get(variableKey)?.forEach(callback => callback());
    },
    
    resolveBinding: (binding, dataContext) => {
      const parsed = parseVariableBinding(binding);
      if (!parsed) return binding;
      
      const { appVariables, pageVariables, componentVariables } = get();
      let value: any;
      
      switch (parsed.scope) {
        case 'app':
          value = appVariables[parsed.name];
          break;
        case 'page':
          value = pageVariables[parsed.name];
          break;
        case 'component':
          // Component variables need special handling with component ID
          const [compId, varName] = parsed.name.split('.');
          value = componentVariables[compId]?.[varName];
          break;
        case 'data':
          value = dataContext?.[parsed.name];
          break;
        case 'env':
          const envVars = JSON.parse(localStorage.getItem('flow-env-vars') || '{}');
          value = envVars[parsed.name];
          break;
        case 'param':
          // Page parameters should be resolved from URL or context
          value = dataContext?.[`param_${parsed.name}`];
          break;
        case 'formula':
          // Execute formula (basic implementation)
          try {
            const formulaFunc = new Function(
              'app', 'page', 'data',
              `return ${parsed.name}`
            );
            value = formulaFunc(appVariables, pageVariables, dataContext || {});
          } catch (e) {
            console.error('Formula evaluation error:', e);
            value = undefined;
          }
          break;
        default:
          value = undefined;
      }
      
      // Apply formatter if present
      if (parsed.formatter && value !== undefined) {
        value = applyFormatter(value, parsed.formatter);
      }
      
      return value;
    },
    
    resolveAllBindings: (obj, dataContext) => {
      if (typeof obj === 'string') {
        // Check if it's a variable binding
        if (/^\{\{.+\}\}$/.test(obj)) {
          return get().resolveBinding(obj, dataContext);
        }
        // Handle interpolated strings like "Hello {{app.userName}}"
        return obj.replace(/\{\{([^}]+)\}\}/g, (match) => {
          const resolved = get().resolveBinding(match, dataContext);
          return resolved !== undefined ? String(resolved) : match;
        });
      }
      
      if (Array.isArray(obj)) {
        return obj.map(item => get().resolveAllBindings(item, dataContext));
      }
      
      if (obj && typeof obj === 'object') {
        const resolved: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
          resolved[key] = get().resolveAllBindings(value, dataContext);
        }
        return resolved;
      }
      
      return obj;
    },
    
    getAvailableVariables: (scope) => {
      const { appVariableDefinitions, pageVariableDefinitions } = get();
      
      if (scope === 'app') return appVariableDefinitions;
      if (scope === 'page') return pageVariableDefinitions;
      
      return [...appVariableDefinitions, ...pageVariableDefinitions];
    },
    
    clearAll: () => {
      set({
        appVariableDefinitions: [],
        pageVariableDefinitions: [],
        appVariables: {},
        pageVariables: {},
        componentVariables: {},
        currentProjectId: null,
        currentPageId: null,
        subscriptions: new Map()
      });
    }
  }))
);

// Utility function for formatting values
const applyFormatter = (value: any, formatter: string): string => {
  switch (formatter.toLowerCase()) {
    case 'uppercase':
      return String(value).toUpperCase();
    case 'lowercase':
      return String(value).toLowerCase();
    case 'capitalize':
      return String(value).charAt(0).toUpperCase() + String(value).slice(1);
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
    case 'percent':
      return new Intl.NumberFormat('en-US', { style: 'percent' }).format(Number(value) / 100);
    case 'date':
      return new Date(value).toLocaleDateString();
    case 'time':
      return new Date(value).toLocaleTimeString();
    case 'datetime':
      return new Date(value).toLocaleString();
    case 'json':
      return JSON.stringify(value, null, 2);
    default:
      return String(value);
  }
};

// Custom hook for subscribing to a specific variable
export const useVariable = (scope: VariableScope, name: string, componentId?: string) => {
  const store = useVariableStore();
  
  const value = store.getVariable(scope, name, componentId);
  const setValue = (newValue: any) => store.setVariable(scope, name, newValue, componentId);
  
  return { value, setValue };
};
