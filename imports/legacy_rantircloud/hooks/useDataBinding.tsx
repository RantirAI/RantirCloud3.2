import { useState, useEffect, useCallback } from 'react';
import { tableService } from '@/services/tableService';
import { AppComponent } from '@/types/appBuilder';
import { supabase } from '@/integrations/supabase/client';
import { isPublishedAppContext, getPublishedAppConfig } from './usePublishedDataBinding';

export interface DataBindingResult {
  data: any[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface DataBindingOptions {
  /** Enable published mode - uses API key instead of Supabase auth */
  publishedMode?: boolean;
  /** API key for published mode */
  apiKey?: string;
  /** API base URL for published mode */
  apiBaseUrl?: string;
}

/**
 * Dual-mode data binding hook that works in both builder and published contexts
 * - Builder mode: Uses authenticated Supabase client
 * - Published mode: Uses read-only API key via database-api
 */
export function useDataBinding(
  component: AppComponent,
  options?: DataBindingOptions
): DataBindingResult {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dataSource = component.dataSource || component.props?.databaseConnection;

  // Determine if we should use published mode
  const isPublished = options?.publishedMode ?? isPublishedAppContext();
  const publishedConfig = isPublished ? getPublishedAppConfig() : null;
  const apiKey = options?.apiKey || publishedConfig?.apiKey;
  const apiBaseUrl = options?.apiBaseUrl || publishedConfig?.apiBaseUrl;

  const fetchData = useCallback(async () => {
    // Check for table project ID first, then fall back to table name lookup
    let tableProjectId = dataSource?.tableProjectId;
    
    // Handle different data source structures
    if (!tableProjectId) {
      const tableName = (dataSource as any)?.table?.tableName || 
                       (dataSource as any)?.tableName ||
                       (component.props as any)?.dataSource?.table?.tableName ||
                       (component.props as any)?.databaseConnection?.tableName;
      
      if (tableName && !isPublished) {
        try {
          const { data: user } = await supabase.auth.getUser();
          if (user?.user?.id) {
            const tables = await tableService.getUserTableProjects(user.user.id);
            const matchingTable = tables.find(t => t.name === tableName);
            if (matchingTable) {
              tableProjectId = matchingTable.id;
            }
          }
        } catch (err) {
          console.error('Failed to find table:', err);
        }
      }
    }
    
    if (!tableProjectId) {
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Published mode: Use database-api with API key
      if (isPublished && apiKey && apiBaseUrl) {
        const params = new URLSearchParams();
        
        // Add filters
        if (dataSource?.filters && Array.isArray(dataSource.filters)) {
          dataSource.filters.forEach((filter: any) => {
            const operator = filter.operator === 'eq' ? '' : `[$${filter.operator}]`;
            params.append(`filter[${filter.field}]${operator}`, String(filter.value));
          });
        }

        // Add sorting
        if (dataSource?.sorting && Array.isArray(dataSource.sorting) && dataSource.sorting.length > 0) {
          params.append('sort', dataSource.sorting[0].field);
          params.append('order', dataSource.sorting[0].direction);
        }

        // Add pagination
        if (dataSource?.pagination) {
          params.append('limit', String(dataSource.pagination.pageSize));
          params.append('offset', String((dataSource.pagination.page - 1) * dataSource.pagination.pageSize));
        }

        const url = `${apiBaseUrl}/tables/${tableProjectId}/records?${params.toString()}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          setData(result.data || []);
        } else {
          throw new Error(result.error?.message || 'Failed to fetch data');
        }
      } else {
        // Builder mode: Use Supabase client directly
        const tableProject = await tableService.getTableProject(tableProjectId);
        let records = tableProject.records || [];

        // Apply filters if any
        if (dataSource?.filters && Array.isArray(dataSource.filters) && dataSource.filters.length > 0) {
          records = records.filter(record => {
            return dataSource.filters!.every((filter: any) => {
              const value = record[filter.field];
              const filterValue = filter.value;

              switch (filter.operator) {
                case 'eq':
                  return value === filterValue;
                case 'ne':
                  return value !== filterValue;
                case 'gt':
                  return Number(value) > Number(filterValue);
                case 'lt':
                  return Number(value) < Number(filterValue);
                case 'contains':
                  return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
                case 'in':
                  return filterValue.split(',').map((v: string) => v.trim()).includes(String(value));
                default:
                  return true;
              }
            });
          });
        }

        // Apply sorting if any
        if (dataSource?.sorting && Array.isArray(dataSource.sorting) && dataSource.sorting.length > 0) {
          records = [...records].sort((a, b) => {
            for (const sort of dataSource.sorting!) {
              const aValue = a[sort.field];
              const bValue = b[sort.field];
              
              if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
              if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
            }
            return 0;
          });
        }

        // Apply pagination if configured
        if (dataSource?.pagination) {
          const { page, pageSize } = dataSource.pagination;
          const startIndex = (page - 1) * pageSize;
          const endIndex = startIndex + pageSize;
          records = records.slice(startIndex, endIndex);
        }

        setData(records);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [dataSource, isPublished, apiKey, apiBaseUrl]);

  useEffect(() => {
    if (dataSource) {
      fetchData();
    }
  }, [dataSource, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}