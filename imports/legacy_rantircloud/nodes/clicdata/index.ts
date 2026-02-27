import { NodePlugin } from '@/types/node-plugin';

export const clicdataNode: NodePlugin = {
  type: 'clicdata',
  name: 'ClicData',
  description: 'Business intelligence and data visualization platform',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/clicdata.png',
  color: '#00A3E0',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your ClicData API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'List Data Sets', value: 'listData' },
        { label: 'Get Data', value: 'getData' },
        { label: 'Insert Row', value: 'insertRow' },
        { label: 'Delete Rows', value: 'deleteData' },
        { label: 'Refresh Data Source', value: 'refreshTable' },
        { label: 'List Dashboards', value: 'listDashboards' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'The ClicData action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    // Actions that need a table ID
    if (['getData', 'insertRow', 'deleteData'].includes(action)) {
      inputs.push({
        name: 'tableId',
        label: 'Table ID',
        type: 'text' as const,
        required: true,
        placeholder: 'e.g., 12345',
        description: 'Enter your ClicData table/dataset ID',
      });
    }

    // Actions that need a data source ID (for refresh)
    if (action === 'refreshTable') {
      inputs.push(
        { name: 'dataSourceId', label: 'Data Source ID', type: 'text' as const, required: true, description: 'ID of the ClicData data source to refresh' },
        { name: 'waitForCompletion', label: 'Wait for Completion', type: 'boolean' as const, required: false, default: false, description: 'Wait for the refresh to complete before continuing' }
      );
    }

    // Additional inputs based on action
    if (action === 'getData') {
      inputs.push(
        { name: 'limit', label: 'Limit', type: 'number' as const, required: false, default: 100, description: 'Maximum number of rows to return' },
        { name: 'offset', label: 'Offset', type: 'number' as const, required: false, default: 0, description: 'Number of rows to skip' }
      );
    }

    if (action === 'insertRow') {
      inputs.push({
        name: 'rowData',
        label: 'Row Data (JSON)',
        type: 'code' as const,
        language: 'json' as const,
        required: true,
        description: 'Row data as JSON object. Example: {"Column1": "value1", "Column2": "value2"}',
      });
    }

    if (action === 'deleteData') {
      inputs.push({
        name: 'filter',
        label: 'Filter (JSON)',
        type: 'code' as const,
        language: 'json' as const,
        required: true,
        description: 'Filter criteria for rows to delete. Example: {"column": "value"}',
      });
    }

    if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'Endpoint', type: 'text' as const, required: true, placeholder: '/data/123', description: 'API endpoint path (e.g., /data/123)' },
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ], default: 'GET', description: 'HTTP method to use' },
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false, description: 'Request body as JSON (for POST/PUT)' }
      );
    }

    return inputs;
  },
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful',
    },
    {
      name: 'data',
      type: 'object',
      description: 'Response data from ClicData',
    },
    {
      name: 'dataSets',
      type: 'array',
      description: 'List of data sets (for listData action)',
    },
    {
      name: 'dashboards',
      type: 'array',
      description: 'List of dashboards (for listDashboards action)',
    },
    {
      name: 'rows',
      type: 'array',
      description: 'Data rows (for getData action)',
    },
    {
      name: 'rowId',
      type: 'string',
      description: 'ID of the inserted row (for insertRow action)',
    },
    {
      name: 'deletedCount',
      type: 'number',
      description: 'Number of rows deleted (for deleteData action)',
    },
    {
      name: 'refreshStatus',
      type: 'string',
      description: 'Status of the data source refresh (for refreshTable action)',
    },
    {
      name: 'count',
      type: 'number',
      description: 'Count of items returned',
    },
    {
      name: 'message',
      type: 'string',
      description: 'Human-readable result message',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('clicdata-proxy', {
      body: inputs,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
        data: null,
        dataSets: [],
        dashboards: [],
        rows: [],
        rowId: null,
        deletedCount: 0,
        refreshStatus: null,
        count: 0,
        message: error.message,
      };
    }

    return {
      success: data?.success || false,
      data: data?.data || {},
      dataSets: data?.dataSets || [],
      dashboards: data?.dashboards || [],
      rows: data?.rows || [],
      rowId: data?.rowId || null,
      deletedCount: data?.deletedCount || 0,
      refreshStatus: data?.refreshStatus || null,
      count: data?.count || data?.rowCount || 0,
      message: data?.message || 'Operation completed',
      error: data?.error || null,
    };
  },
};
