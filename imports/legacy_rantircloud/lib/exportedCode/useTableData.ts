/**
 * useTableData Hook - React hook for fetching table data
 * This file is included in exported code for data fetching in components
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchTableData, FetchTableOptions, FetchTableResult, DataServiceConfig } from './dataService';
import { formatValue, replaceBindings, FormatterType } from './formatters';

export interface UseTableDataOptions {
  tableId: string;
  filters?: FetchTableOptions['filters'];
  sorting?: FetchTableOptions['sorting'];
  pagination?: {
    page: number;
    pageSize: number;
  };
  select?: string[];
  enabled?: boolean;
  config?: DataServiceConfig;
}

export interface UseTableDataResult<T = Record<string, any>> {
  data: T[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  schema: FetchTableResult['schema'];
  refetch: () => Promise<void>;
  setPage: (page: number) => void;
  formatValue: typeof formatValue;
  replaceBindings: (input: string, record: Record<string, any>) => string;
}

/**
 * React hook for fetching and managing table data
 */
export function useTableData<T = Record<string, any>>(
  options: UseTableDataOptions
): UseTableDataResult<T> {
  const {
    tableId,
    filters,
    sorting,
    pagination: initialPagination,
    select,
    enabled = true,
    config,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPagination?.page || 1);
  const [pageSize] = useState(initialPagination?.pageSize || 10);
  const [hasMore, setHasMore] = useState(false);
  const [schema, setSchema] = useState<FetchTableResult['schema']>(undefined);

  const fetchData = useCallback(async () => {
    if (!enabled || !tableId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchTableData<T>(
        {
          tableId,
          filters,
          sorting,
          pagination: { page, pageSize },
          select,
        },
        config
      );

      setData(result.data);
      setTotal(result.total);
      setHasMore(result.hasMore);
      if (result.schema) {
        setSchema(result.schema);
      }
    } catch (err: any) {
      console.error('useTableData error:', err);
      setError(err.message || 'Failed to fetch data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [tableId, filters, sorting, page, pageSize, select, enabled, config]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Memoized helper functions
  const helpers = useMemo(() => ({
    formatValue,
    replaceBindings: (input: string, record: Record<string, any>) => replaceBindings(input, record),
  }), []);

  return {
    data,
    loading,
    error,
    total,
    page,
    pageSize,
    hasMore,
    schema,
    refetch: fetchData,
    setPage,
    ...helpers,
  };
}

/**
 * Hook for fetching a single record
 */
export function useRecord<T = Record<string, any>>(
  tableId: string,
  recordId: string | null,
  config?: DataServiceConfig
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecord = useCallback(async () => {
    if (!tableId || !recordId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { fetchRecord: fetchRecordApi } = await import('./dataService');
      const result = await fetchRecordApi<T>(tableId, recordId, config);
      setData(result);
    } catch (err: any) {
      console.error('useRecord error:', err);
      setError(err.message || 'Failed to fetch record');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tableId, recordId, config]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  return {
    data,
    loading,
    error,
    refetch: fetchRecord,
    formatValue,
    replaceBindings: (input: string) => data ? replaceBindings(input, data as any) : input,
  };
}

export default useTableData;
