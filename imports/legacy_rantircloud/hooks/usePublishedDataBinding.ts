import { useState, useEffect, useCallback } from 'react';

export interface PublishedDataBindingOptions {
  apiKey: string;
  apiBaseUrl: string;
  tableId: string;
  filters?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  sorting?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  pagination?: {
    page: number;
    pageSize: number;
  };
}

export interface PublishedDataBindingResult {
  data: any[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  refetch: () => void;
}

/**
 * Hook for fetching data in published apps using the secure Database API
 * Uses read-only API key for authentication (no Supabase auth required)
 */
export function usePublishedDataBinding(options: PublishedDataBindingOptions): PublishedDataBindingResult {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const { apiKey, apiBaseUrl, tableId, filters, sorting, pagination } = options;

  const fetchData = useCallback(async () => {
    if (!apiKey || !tableId) {
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      // Add filters
      if (filters && filters.length > 0) {
        filters.forEach(filter => {
          const operator = filter.operator === 'eq' ? '' : `[$${filter.operator}]`;
          params.append(`filter[${filter.field}]${operator}`, String(filter.value));
        });
      }

      // Add sorting
      if (sorting && sorting.length > 0) {
        params.append('sort', sorting[0].field);
        params.append('order', sorting[0].direction);
      }

      // Add pagination
      if (pagination) {
        params.append('limit', String(pagination.pageSize));
        params.append('offset', String((pagination.page - 1) * pagination.pageSize));
      }

      // Construct the API URL - fetch records from the table
      const url = `${apiBaseUrl}/tables/${tableId}/records?${params.toString()}`;

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
        setTotal(result.meta?.total || result.data?.length || 0);
        setHasMore(result.meta?.hasMore || false);
      } else {
        throw new Error(result.error?.message || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('Published app data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [apiKey, apiBaseUrl, tableId, JSON.stringify(filters), JSON.stringify(sorting), JSON.stringify(pagination)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    total,
    hasMore,
    refetch: fetchData,
  };
}

/**
 * Runtime configuration interface for published apps
 */
export interface PublishedAppRuntimeConfig {
  apiBaseUrl: string;
  apiKey: string;
  appId: string;
  dataConnections: Array<{
    tableId: string;
    tableName: string;
    databaseId: string;
  }>;
}

/**
 * Get the runtime configuration for a published app
 * This is injected into the HTML by the render-published-app edge function
 */
export function getPublishedAppConfig(): PublishedAppRuntimeConfig | null {
  if (typeof window === 'undefined') return null;
  
  const config = (window as any).__RANTIR_APP_CONFIG__;
  if (!config) return null;

  return {
    apiBaseUrl: config.apiBaseUrl || '',
    apiKey: config.apiKey || '',
    appId: config.appId || '',
    dataConnections: config.dataConnections || [],
  };
}

/**
 * Check if we're running in a published app context
 */
export function isPublishedAppContext(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).__RANTIR_APP_CONFIG__;
}
