import { supabase } from "@/integrations/supabase/client";

export interface AppVariable {
  id: string;
  app_project_id: string;
  user_id: string;
  name: string;
  description?: string;
  variable_type: 'static' | 'computed' | 'aggregation';
  data_source: any;
  query_config: any;
  computation_logic?: string;
  cache_duration: number;
  last_computed_at?: string;
  computed_value?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AggregationFunction {
  name: string;
  label: string;
  description: string;
  supportedTypes: string[];
}

export interface QueryFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'starts_with' | 'in' | 'between';
  value: any;
  secondValue?: any; // for between operator
}

export interface QueryConfig {
  table_name?: string;
  connection_id?: string;
  filters: QueryFilter[];
  aggregations: {
    field: string;
    function: string;
    alias?: string;
  }[];
  groupBy: string[];
  orderBy: {
    field: string;
    direction: 'asc' | 'desc';
  }[];
  limit?: number;
  dateRange?: {
    field: string;
    start: string;
    end: string;
  };
}

export class DataProcessingService {
  static aggregationFunctions: AggregationFunction[] = [
    { name: 'SUM', label: 'Sum', description: 'Calculate total', supportedTypes: ['number'] },
    { name: 'AVG', label: 'Average', description: 'Calculate average', supportedTypes: ['number'] },
    { name: 'COUNT', label: 'Count', description: 'Count records', supportedTypes: ['all'] },
    { name: 'MIN', label: 'Minimum', description: 'Find minimum value', supportedTypes: ['number', 'date'] },
    { name: 'MAX', label: 'Maximum', description: 'Find maximum value', supportedTypes: ['number', 'date'] },
    { name: 'COUNT_DISTINCT', label: 'Count Unique', description: 'Count unique values', supportedTypes: ['all'] },
  ];

  static async getAppVariables(appProjectId: string): Promise<AppVariable[]> {
    const { data, error } = await supabase
      .from('app_variables')
      .select('*')
      .eq('app_project_id', appProjectId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return (data || []) as AppVariable[];
  }

  static async createVariable(variable: Omit<AppVariable, 'id' | 'created_at' | 'updated_at'>): Promise<AppVariable> {
    const { data, error } = await supabase
      .from('app_variables')
      .insert(variable)
      .select()
      .single();

    if (error) throw error;
    return data as AppVariable;
  }

  static async updateVariable(id: string, updates: Partial<AppVariable>): Promise<AppVariable> {
    const { data, error } = await supabase
      .from('app_variables')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as AppVariable;
  }

  static async deleteVariable(id: string): Promise<void> {
    const { error } = await supabase
      .from('app_variables')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async executeQuery(queryConfig: QueryConfig): Promise<any> {
    // This would execute the actual database query
    // For now, return mock data based on aggregations
    const mockResult: any = {};
    
    // Generate mock results based on aggregations
    queryConfig.aggregations.forEach(agg => {
      const alias = agg.alias || `${agg.function.toLowerCase()}_${agg.field}`;
      
      switch (agg.function) {
        case 'COUNT':
          mockResult[alias] = Math.floor(Math.random() * 1000) + 1;
          break;
        case 'SUM':
          mockResult[alias] = Math.floor(Math.random() * 100000) + 1000;
          break;
        case 'AVG':
          mockResult[alias] = Math.floor(Math.random() * 1000) + 10;
          break;
        case 'MIN':
          mockResult[alias] = Math.floor(Math.random() * 100) + 1;
          break;
        case 'MAX':
          mockResult[alias] = Math.floor(Math.random() * 1000) + 100;
          break;
        case 'COUNT_DISTINCT':
          mockResult[alias] = Math.floor(Math.random() * 500) + 1;
          break;
        default:
          mockResult[alias] = Math.floor(Math.random() * 1000);
      }
    });

    // If no aggregations, return sample count
    if (queryConfig.aggregations.length === 0) {
      mockResult.count = Math.floor(Math.random() * 1000) + 1;
    }

    return mockResult;
  }

  static async computeVariable(variable: AppVariable): Promise<any> {
    const startTime = Date.now();
    
    try {
      let result;

      if (variable.variable_type === 'static') {
        result = variable.computed_value;
      } else if (variable.variable_type === 'computed') {
        result = await this.executeComputedLogic(variable);
      } else if (variable.variable_type === 'aggregation') {
        result = await this.executeAggregation(variable);
      }

      const computationTime = Date.now() - startTime;

      // Store computation result
      await supabase.from('variable_computations').insert({
        variable_id: variable.id,
        computation_time_ms: computationTime,
        result_value: result,
        status: 'success'
      });

      // Update the variable with the computed value
      await this.updateVariable(variable.id, {
        computed_value: result,
        last_computed_at: new Date().toISOString()
      });

      return result;
    } catch (error) {
      const computationTime = Date.now() - startTime;
      
      // Store error result
      await supabase.from('variable_computations').insert({
        variable_id: variable.id,
        computation_time_ms: computationTime,
        error_message: error.message,
        status: 'error'
      });

      throw error;
    }
  }

  private static async executeComputedLogic(variable: AppVariable): Promise<any> {
    if (!variable.computation_logic) {
      throw new Error('No computation logic defined');
    }

    try {
      // Create a safe execution environment
      const computeFunction = new Function('variables', `
        ${variable.computation_logic}
      `);

      // Get all available variables (could be expanded to include other variables)
      const availableVariables = {};
      
      const result = computeFunction(availableVariables);
      return result;
    } catch (error) {
      throw new Error(`Computation error: ${error.message}`);
    }
  }

  private static async executeAggregation(variable: AppVariable): Promise<any> {
    const queryConfig = variable.query_config as QueryConfig;
    
    if (!queryConfig || !queryConfig.table_name) {
      throw new Error('No query configuration defined for aggregation');
    }

    // Execute the database query
    return await this.executeQuery(queryConfig);
  }

  // Utility methods for data transformation
  static transformValue(value: any, transformation: string): any {
    switch (transformation) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      default:
        return value;
    }
  }

  static formatNumber(value: number, format: 'currency' | 'percentage' | 'decimal'): string {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(value);
      case 'percentage':
        return new Intl.NumberFormat('en-US', { 
          style: 'percent',
          minimumFractionDigits: 2 
        }).format(value / 100);
      case 'decimal':
        return new Intl.NumberFormat('en-US', { 
          minimumFractionDigits: 2 
        }).format(value);
      default:
        return String(value);
    }
  }
}