import { NodePlugin } from '@/types/node-plugin';

export const csvNode: NodePlugin = {
  type: 'csv',
  name: 'CSV',
  description: 'Convert between CSV and JSON formats',
  category: 'transformer',
  icon: 'https://cdn.activepieces.com/pieces/new-core/csv.svg',
  color: '#4CAF50',
  inputs: [
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'CSV to JSON', value: 'csvToJson', description: 'Convert CSV text to JSON array' },
        { label: 'JSON to CSV', value: 'jsonToCsv', description: 'Convert JSON array to CSV' },
      ],
      description: 'Choose the CSV operation',
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    if (action === 'csvToJson') {
      dynamicInputs.push(
        {
          name: 'csvData',
          label: 'CSV Data',
          type: 'code',
          language: 'plaintext',
          required: true,
          description: 'CSV text to parse',
          placeholder: 'name,email,age\nJohn,john@example.com,30\nJane,jane@example.com,25',
        },
        {
          name: 'delimiter',
          label: 'Delimiter',
          type: 'select',
          required: true,
          default: ',',
          options: [
            { label: 'Comma (,)', value: ',' },
            { label: 'Semicolon (;)', value: ';' },
            { label: 'Tab (\\t)', value: '\t' },
            { label: 'Pipe (|)', value: '|' },
          ],
          description: 'Column delimiter',
        },
        {
          name: 'hasHeader',
          label: 'Has Header Row',
          type: 'checkbox',
          required: false,
          default: true,
          description: 'First row contains column names',
        },
        {
          name: 'skipEmptyLines',
          label: 'Skip Empty Lines',
          type: 'checkbox',
          required: false,
          default: true,
          description: 'Ignore empty lines in the CSV',
        }
      );
    }

    if (action === 'jsonToCsv') {
      dynamicInputs.push(
        {
          name: 'jsonData',
          label: 'JSON Data',
          type: 'code',
          language: 'json',
          required: true,
          description: 'JSON array to convert to CSV',
          placeholder: '[\n  {"name": "John", "email": "john@example.com"},\n  {"name": "Jane", "email": "jane@example.com"}\n]',
        },
        {
          name: 'delimiter',
          label: 'Delimiter',
          type: 'select',
          required: true,
          default: ',',
          options: [
            { label: 'Comma (,)', value: ',' },
            { label: 'Semicolon (;)', value: ';' },
            { label: 'Tab (\\t)', value: '\t' },
            { label: 'Pipe (|)', value: '|' },
          ],
          description: 'Column delimiter',
        },
        {
          name: 'includeHeader',
          label: 'Include Header Row',
          type: 'checkbox',
          required: false,
          default: true,
          description: 'Add column names as first row',
        },
        {
          name: 'columns',
          label: 'Columns (optional)',
          type: 'text',
          required: false,
          description: 'Comma-separated list of columns to include (all if empty)',
          placeholder: 'name,email',
        }
      );
    }

    return dynamicInputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'array', description: 'Resulting JSON array (for csvToJson)' },
    { name: 'csv', type: 'string', description: 'Generated CSV string (for jsonToCsv)' },
    { name: 'rowCount', type: 'number', description: 'Number of rows' },
    { name: 'columnCount', type: 'number', description: 'Number of columns' },
    { name: 'columns', type: 'array', description: 'List of column names' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        'https://appdmmjexevclmpyvtss.supabase.co/functions/v1/csv-proxy',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(inputs),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: result.data,
        csv: result.csv,
        rowCount: result.rowCount,
        columnCount: result.columnCount,
        columns: result.columns,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        csv: null,
        rowCount: null,
        columnCount: null,
        columns: null,
        error: error.message,
      };
    }
  },
};
