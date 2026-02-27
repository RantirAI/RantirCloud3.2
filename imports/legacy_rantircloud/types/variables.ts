// WeWeb-style Variable System Types

export type VariableScope = 'app' | 'page' | 'component';
export type VariableDataType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date';
export type VariableSourceType = 'static' | 'computed' | 'query';

export interface AppBuilderVariable {
  id: string;
  scope: VariableScope;
  name: string;
  dataType: VariableDataType;
  initialValue: any;
  currentValue?: any;
  description?: string;
  
  // For computed variables
  isComputed?: boolean;
  formula?: string;
  dependencies?: string[];
  
  // For query variables
  isQuery?: boolean;
  queryConfig?: VariableQueryConfig;
  
  // Settings
  preserveOnNavigation?: boolean;
  persistToStorage?: boolean;
  
  // Metadata
  appProjectId: string;
  pageId?: string; // Only for page-scoped variables
  userId: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VariableQueryConfig {
  tableProjectId?: string;
  tableName?: string;
  filters?: VariableQueryFilter[];
  aggregation?: {
    function: 'count' | 'sum' | 'avg' | 'min' | 'max';
    field?: string;
  };
  limit?: number;
}

export interface VariableQueryFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'in';
  value: any;
}

export interface VariableBinding {
  scope: VariableScope | 'data' | 'formula' | 'env' | 'param';
  name: string;
  formatter?: string;
  fullBinding: string;
}

export interface VariableAction {
  type: 'setVariable';
  config: SetVariableConfig;
}

export interface SetVariableConfig {
  scope: VariableScope;
  variableName: string;
  value: any;
  operation?: 'set' | 'increment' | 'decrement' | 'toggle' | 'append' | 'remove';
}

// Database models matching Supabase schema
export interface DbAppVariable {
  id: string;
  app_project_id: string;
  user_id: string;
  name: string;
  variable_type: string;
  data_type: VariableDataType;
  scope: 'app' | 'global';
  initial_value: any;
  computed_value: any;
  computation_logic: string | null;
  query_config: any;
  data_source: any;
  description: string | null;
  preserve_on_navigation: boolean;
  cache_duration: number | null;
  last_computed_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbPageVariable {
  id: string;
  app_project_id: string;
  page_id: string;
  user_id: string;
  name: string;
  data_type: VariableDataType;
  initial_value: any;
  description: string | null;
  is_persisted: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Utility functions for variable binding syntax
export const parseVariableBinding = (binding: string): VariableBinding | null => {
  if (!binding || typeof binding !== 'string') return null;
  
  const match = binding.match(/^\{\{(.+)\}\}$/);
  if (!match) return null;
  
  const inner = match[1].trim();
  
  // Handle formatter syntax: {{scope.name|formatter}}
  const [pathPart, formatter] = inner.split('|').map(s => s.trim());
  
  // Check for formula
  if (pathPart.startsWith('formula:')) {
    return {
      scope: 'formula',
      name: pathPart.substring(8).trim(),
      formatter,
      fullBinding: binding
    };
  }
  
  // Check for env variables
  if (pathPart.startsWith('env.')) {
    return {
      scope: 'env',
      name: pathPart.substring(4),
      formatter,
      fullBinding: binding
    };
  }
  
  // Check for page parameters
  if (pathPart.startsWith('param.')) {
    return {
      scope: 'param',
      name: pathPart.substring(6),
      formatter,
      fullBinding: binding
    };
  }
  
  // Check for scoped variables: app.varName, page.varName, component.varName
  const scopeMatch = pathPart.match(/^(app|page|component|data)\.(.+)$/);
  if (scopeMatch) {
    return {
      scope: scopeMatch[1] as VariableScope | 'data',
      name: scopeMatch[2],
      formatter,
      fullBinding: binding
    };
  }
  
  // Legacy format: just variable name (treat as data context)
  return {
    scope: 'data',
    name: pathPart,
    formatter,
    fullBinding: binding
  };
};

export const createVariableBinding = (scope: VariableScope | 'data' | 'env' | 'param', name: string, formatter?: string): string => {
  let binding = '';
  
  if (scope === 'env') {
    binding = `env.${name}`;
  } else if (scope === 'param') {
    binding = `param.${name}`;
  } else if (scope === 'data') {
    binding = name;
  } else {
    binding = `${scope}.${name}`;
  }
  
  if (formatter) {
    binding += `|${formatter}`;
  }
  
  return `{{${binding}}}`;
};

export const isVariableBinding = (value: any): boolean => {
  return typeof value === 'string' && /^\{\{.+\}\}$/.test(value);
};

// Get default value for a data type
export const getDefaultValueForType = (dataType: VariableDataType): any => {
  switch (dataType) {
    case 'string': return '';
    case 'number': return 0;
    case 'boolean': return false;
    case 'object': return {};
    case 'array': return [];
    case 'date': return new Date().toISOString();
    default: return null;
  }
};
