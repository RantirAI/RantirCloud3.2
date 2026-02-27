/**
 * Data Service - Handles all database API calls
 * This file is included in exported code to fetch data from the API
 */

// Configuration - these can be overridden via environment variables
const DEFAULT_API_BASE_URL = 'https://appdmmjexevclmpyvtss.supabase.co/functions/v1/database-api';

export interface DataServiceConfig {
  apiBaseUrl?: string;
  apiKey?: string;
}

export interface FetchTableOptions {
  tableId: string;
  filters?: Array<{
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in';
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
  select?: string[];
}

export interface FetchTableResult<T = Record<string, any>> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  schema?: {
    fields: Array<{
      id: string;
      name: string;
      type: string;
    }>;
  };
}

/**
 * Get configuration from environment or window config
 */
function getConfig(): DataServiceConfig {
  // Check for runtime config (injected by published app renderer)
  const windowConfig = (window as any).__RANTIR_APP_CONFIG__;
  if (windowConfig) {
    return {
      apiBaseUrl: windowConfig.apiBaseUrl || DEFAULT_API_BASE_URL,
      apiKey: windowConfig.apiKey,
    };
  }

  // Check for Vite environment variables
  const envApiBaseUrl = import.meta.env?.VITE_API_BASE_URL;
  const envApiKey = import.meta.env?.VITE_API_KEY;

  return {
    apiBaseUrl: envApiBaseUrl || DEFAULT_API_BASE_URL,
    apiKey: envApiKey || '',
  };
}

/**
 * Fetch table data from the Database API
 */
export async function fetchTableData<T = Record<string, any>>(
  options: FetchTableOptions,
  config?: DataServiceConfig
): Promise<FetchTableResult<T>> {
  const { apiBaseUrl, apiKey } = config || getConfig();

  if (!apiKey) {
    throw new Error('API key is required. Set VITE_API_KEY in your environment.');
  }

  const { tableId, filters, sorting, pagination, select } = options;

  // Build query parameters
  const params = new URLSearchParams();
  
  if (pagination) {
    params.set('page', String(pagination.page));
    params.set('pageSize', String(pagination.pageSize));
  }
  
  if (select && select.length > 0) {
    params.set('select', select.join(','));
  }
  
  if (filters && filters.length > 0) {
    params.set('filters', JSON.stringify(filters));
  }
  
  if (sorting && sorting.length > 0) {
    params.set('sorting', JSON.stringify(sorting));
  }

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
    throw new Error(errorData.message || `Failed to fetch data: ${response.status}`);
  }

  const result = await response.json();

  return {
    data: result.data || result.records || [],
    total: result.total || result.data?.length || 0,
    page: result.page || pagination?.page || 1,
    pageSize: result.pageSize || pagination?.pageSize || 10,
    hasMore: result.hasMore ?? (result.data?.length === pagination?.pageSize),
    schema: result.schema,
  };
}

/**
 * Fetch a single record by ID
 */
export async function fetchRecord<T = Record<string, any>>(
  tableId: string,
  recordId: string,
  config?: DataServiceConfig
): Promise<T | null> {
  const { apiBaseUrl, apiKey } = config || getConfig();

  if (!apiKey) {
    throw new Error('API key is required. Set VITE_API_KEY in your environment.');
  }

  const url = `${apiBaseUrl}/tables/${tableId}/records/${recordId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch record: ${response.status}`);
  }

  return response.json();
}

/**
 * Create a new record
 */
export async function createRecord<T = Record<string, any>>(
  tableId: string,
  data: Partial<T>,
  config?: DataServiceConfig
): Promise<T> {
  const { apiBaseUrl, apiKey } = config || getConfig();

  if (!apiKey) {
    throw new Error('API key is required. Set VITE_API_KEY in your environment.');
  }

  const url = `${apiBaseUrl}/tables/${tableId}/records`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to create record: ${response.status}`);
  }

  return response.json();
}

/**
 * Update an existing record
 */
export async function updateRecord<T = Record<string, any>>(
  tableId: string,
  recordId: string,
  data: Partial<T>,
  config?: DataServiceConfig
): Promise<T> {
  const { apiBaseUrl, apiKey } = config || getConfig();

  if (!apiKey) {
    throw new Error('API key is required. Set VITE_API_KEY in your environment.');
  }

  const url = `${apiBaseUrl}/tables/${tableId}/records/${recordId}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to update record: ${response.status}`);
  }

  return response.json();
}

/**
 * Delete a record
 */
export async function deleteRecord(
  tableId: string,
  recordId: string,
  config?: DataServiceConfig
): Promise<void> {
  const { apiBaseUrl, apiKey } = config || getConfig();

  if (!apiKey) {
    throw new Error('API key is required. Set VITE_API_KEY in your environment.');
  }

  const url = `${apiBaseUrl}/tables/${tableId}/records/${recordId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to delete record: ${response.status}`);
  }
}

// Export a singleton instance for convenience
export const dataService = {
  fetchTableData,
  fetchRecord,
  createRecord,
  updateRecord,
  deleteRecord,
  getConfig,
};

export default dataService;
