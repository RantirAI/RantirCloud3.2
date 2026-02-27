// Chart Query Executor
// Executes ChartQuery objects against data sources

import {
  ChartQuery,
  QueryResult,
  ChartField,
  FilterGroup,
  FilterCondition,
  AggregationConfig,
  GroupConfig,
  SortConfig,
} from '@/types/chartQuery';
import { databaseConnectionService } from '@/services/databaseConnectionService';
import { tableService } from '@/services/tableService';

// ============================================
// QUERY EXECUTOR
// ============================================

export class ChartQueryExecutor {
  private cache = new Map<string, { result: QueryResult; timestamp: number }>();
  
  async execute(query: ChartQuery): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      // Check cache
      const cacheKey = this.getCacheKey(query);
      const cached = this.cache.get(cacheKey);
      if (cached && query.cacheSeconds) {
        const cacheAge = (Date.now() - cached.timestamp) / 1000;
        if (cacheAge < query.cacheSeconds) {
          return { ...cached.result, fromCache: true };
        }
      }
      
      // Load raw data from source
      let data = await this.loadSourceData(query);
      
      // Apply filters
      if (query.where) {
        data = this.applyFilters(data, query.where);
      }
      
      // Apply grouping and aggregations
      if (query.groupBy && query.groupBy.length > 0) {
        data = this.applyGrouping(data, query.groupBy, query.aggregations || []);
      } else if (query.aggregations && query.aggregations.length > 0) {
        data = this.applyAggregationsWithoutGrouping(data, query.aggregations);
      }
      
      // Apply HAVING filter (on aggregated results)
      if (query.having) {
        data = this.applyFilters(data, query.having);
      }
      
      // Apply sorting
      if (query.orderBy && query.orderBy.length > 0) {
        data = this.applySorting(data, query.orderBy);
      }
      
      const totalCount = data.length;
      
      // Apply pagination
      if (query.offset) {
        data = data.slice(query.offset);
      }
      if (query.limit) {
        data = data.slice(0, query.limit);
      }
      
      const result: QueryResult = {
        data,
        fields: this.inferFields(data, query),
        totalCount,
        executionTime: Date.now() - startTime,
      };
      
      // Update cache
      if (query.cacheSeconds) {
        this.cache.set(cacheKey, { result, timestamp: Date.now() });
      }
      
      return result;
    } catch (error: any) {
      return {
        data: [],
        fields: [],
        totalCount: 0,
        executionTime: Date.now() - startTime,
        error: error.message || 'Query execution failed',
      };
    }
  }
  
  private getCacheKey(query: ChartQuery): string {
    return JSON.stringify({
      source: query.source,
      where: query.where,
      groupBy: query.groupBy,
      aggregations: query.aggregations,
      orderBy: query.orderBy,
      limit: query.limit,
      offset: query.offset,
    });
  }
  
  private async loadSourceData(query: ChartQuery): Promise<Record<string, any>[]> {
    const { source } = query;
    
    if (!source.tableProjectId && !source.tableName) {
      return [];
    }
    
    try {
      // Try to get data using the table service
      const tableId = source.tableProjectId || source.tableName;
      const tableProject = await tableService.getTableProject(tableId);
      
      if (tableProject && tableProject.records) {
        return Array.isArray(tableProject.records) ? tableProject.records : [];
      }
      
      // Fallback to database connection service
      const { data } = await databaseConnectionService.getConnectionData(
        source.databaseId || source.tableProjectId,
        source.tableName,
        { pagination: { page: 1, pageSize: 10000 } }
      );
      
      return data;
    } catch (error) {
      console.error('Error loading source data:', error);
      return [];
    }
  }
  
  private applyFilters(data: Record<string, any>[], filterGroup: FilterGroup): Record<string, any>[] {
    return data.filter(row => this.evaluateFilterGroup(row, filterGroup));
  }
  
  private evaluateFilterGroup(row: Record<string, any>, group: FilterGroup): boolean {
    const results = group.conditions.map(condition => {
      if ('logic' in condition) {
        return this.evaluateFilterGroup(row, condition as FilterGroup);
      }
      return this.evaluateCondition(row, condition as FilterCondition);
    });
    
    if (group.logic === 'and') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }
  
  private evaluateCondition(row: Record<string, any>, condition: FilterCondition): boolean {
    const value = row[condition.field];
    const compareValue = condition.value;
    
    switch (condition.operator) {
      case 'equals':
        return value === compareValue;
      case 'notEquals':
        return value !== compareValue;
      case 'greaterThan':
        return value > compareValue;
      case 'lessThan':
        return value < compareValue;
      case 'greaterThanOrEqual':
        return value >= compareValue;
      case 'lessThanOrEqual':
        return value <= compareValue;
      case 'contains':
        return String(value).toLowerCase().includes(String(compareValue).toLowerCase());
      case 'notContains':
        return !String(value).toLowerCase().includes(String(compareValue).toLowerCase());
      case 'startsWith':
        return String(value).toLowerCase().startsWith(String(compareValue).toLowerCase());
      case 'endsWith':
        return String(value).toLowerCase().endsWith(String(compareValue).toLowerCase());
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(value);
      case 'notIn':
        return Array.isArray(compareValue) && !compareValue.includes(value);
      case 'between':
        return value >= compareValue && value <= condition.valueEnd;
      case 'notBetween':
        return value < compareValue || value > condition.valueEnd;
      case 'isNull':
        return value === null || value === undefined;
      case 'isNotNull':
        return value !== null && value !== undefined;
      case 'isEmpty':
        return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
      case 'isNotEmpty':
        return value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0);
      default:
        return true;
    }
  }
  
  private applyGrouping(
    data: Record<string, any>[],
    groupBy: GroupConfig[],
    aggregations: AggregationConfig[]
  ): Record<string, any>[] {
    // Create groups
    const groups = new Map<string, Record<string, any>[]>();
    
    data.forEach(row => {
      const groupKey = groupBy.map(g => {
        let value = row[g.field];
        
        // Handle date grouping
        if (g.dateGrouping && value) {
          const date = new Date(value);
          switch (g.dateGrouping) {
            case 'year':
              value = date.getFullYear();
              break;
            case 'quarter':
              value = `Q${Math.ceil((date.getMonth() + 1) / 3)} ${date.getFullYear()}`;
              break;
            case 'month':
              value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              break;
            case 'week':
              const weekNum = this.getWeekNumber(date);
              value = `W${weekNum} ${date.getFullYear()}`;
              break;
            case 'day':
              value = date.toISOString().split('T')[0];
              break;
            case 'hour':
              value = `${date.toISOString().split('T')[0]} ${String(date.getHours()).padStart(2, '0')}:00`;
              break;
          }
        }
        
        return String(value);
      }).join('|||');
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(row);
    });
    
    // Apply aggregations to each group
    const result: Record<string, any>[] = [];
    
    groups.forEach((groupRows, groupKey) => {
      const groupKeyParts = groupKey.split('|||');
      const row: Record<string, any> = {};
      
      // Add group-by fields
      groupBy.forEach((g, index) => {
        row[g.field] = groupKeyParts[index];
      });
      
      // Apply aggregations
      aggregations.forEach(agg => {
        const values = groupRows.map(r => r[agg.field]).filter(v => v !== null && v !== undefined);
        row[agg.alias || agg.field] = this.aggregate(values, agg.operation);
      });
      
      result.push(row);
    });
    
    return result;
  }
  
  private applyAggregationsWithoutGrouping(
    data: Record<string, any>[],
    aggregations: AggregationConfig[]
  ): Record<string, any>[] {
    const row: Record<string, any> = {};
    
    aggregations.forEach(agg => {
      const values = data.map(r => r[agg.field]).filter(v => v !== null && v !== undefined);
      row[agg.alias || agg.field] = this.aggregate(values, agg.operation);
    });
    
    return [row];
  }
  
  private aggregate(values: any[], operation: string): any {
    if (values.length === 0) return null;
    
    const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
    
    switch (operation) {
      case 'sum':
        return numericValues.reduce((a, b) => a + b, 0);
      case 'avg':
        return numericValues.length > 0 
          ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length 
          : null;
      case 'count':
        return values.length;
      case 'min':
        return Math.min(...numericValues);
      case 'max':
        return Math.max(...numericValues);
      case 'median':
        if (numericValues.length === 0) return null;
        const sorted = [...numericValues].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0
          ? sorted[mid]
          : (sorted[mid - 1] + sorted[mid]) / 2;
      case 'distinct':
        return new Set(values).size;
      case 'first':
        return values[0];
      case 'last':
        return values[values.length - 1];
      default:
        return null;
    }
  }
  
  private applySorting(data: Record<string, any>[], sorts: SortConfig[]): Record<string, any>[] {
    return [...data].sort((a, b) => {
      for (const sort of sorts) {
        const aVal = a[sort.field];
        const bVal = b[sort.field];
        
        // Handle nulls
        if (aVal === null || aVal === undefined) {
          if (bVal === null || bVal === undefined) return 0;
          return sort.nullsFirst ? -1 : 1;
        }
        if (bVal === null || bVal === undefined) {
          return sort.nullsFirst ? 1 : -1;
        }
        
        // Compare values
        let comparison = 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else {
          comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        }
        
        if (comparison !== 0) {
          return sort.direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }
  
  private inferFields(data: Record<string, any>[], query: ChartQuery): ChartField[] {
    if (data.length === 0) {
      return query.select;
    }
    
    const firstRow = data[0];
    return Object.keys(firstRow).map(key => {
      const value = firstRow[key];
      let type: ChartField['type'] = 'string';
      
      if (typeof value === 'number') type = 'number';
      else if (typeof value === 'boolean') type = 'boolean';
      else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) type = 'date';
      else if (Array.isArray(value)) type = 'array';
      else if (typeof value === 'object') type = 'object';
      
      return {
        id: key,
        name: key,
        type,
      };
    });
  }
  
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
  
  clearCache(): void {
    this.cache.clear();
  }
}

export const chartQueryExecutor = new ChartQueryExecutor();

export async function executeChartQuery(query: ChartQuery): Promise<QueryResult> {
  return chartQueryExecutor.execute(query);
}
