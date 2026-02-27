import { NodePlugin } from '@/types/node-plugin';

export const codaNode: NodePlugin = {
  type: 'coda',
  name: 'Coda',
  description: 'All-in-one document and spreadsheet platform',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/coda.png',
  color: '#F46A54',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Token',
      type: 'text',
      required: true,
      description: 'Your Coda API token. Generate at https://coda.io/account',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'List Docs', value: 'listDocs' },
        { label: 'Get Doc', value: 'getDoc' },
        { label: 'Create Doc', value: 'createDoc' },
        { label: 'Create Row', value: 'createRow' },
        { label: 'Update Row', value: 'updateRow' },
        { label: 'Upsert Row', value: 'upsertRow' },
        { label: 'Find Row', value: 'findRow' },
        { label: 'Get Row', value: 'getRow' },
        { label: 'Delete Row', value: 'deleteRow' },
        { label: 'List Rows', value: 'listRows' },
        { label: 'List Tables', value: 'listTables' },
        { label: 'Get Table', value: 'getTable' },
        { label: 'List Columns', value: 'listColumns' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    // Helper for docId input with improved description
    const docIdInput = { 
      name: 'docId', 
      label: 'Doc ID', 
      type: 'text' as const, 
      required: true, 
      placeholder: 'dXsJ-iwnlhF',
      description: 'Doc ID from your Coda URL: coda.io/d/Doc-Name_<docId>. Use "List Docs" action to find available docs.' 
    };

    // Helper for tableId input with improved description
    const tableIdInput = { 
      name: 'tableId', 
      label: 'Table ID', 
      type: 'text' as const, 
      required: true, 
      placeholder: 'grid-abc123',
      description: 'Table ID. Use "List Tables" action to find available tables in your doc.' 
    };

    // Helper for cells input with improved description
    const cellsInput = { 
      name: 'cells', 
      label: 'Cells (JSON)', 
      type: 'code' as const, 
      language: 'json' as const, 
      required: true, 
      placeholder: '[{"column": "Name", "value": "John"}, {"column": "Age", "value": 30}]',
      description: 'Array of cell objects. Each must have "column" (column ID or name) and "value". Example: [{"column": "Status", "value": "Active"}]' 
    };

    if (action === 'listDocs') {
      inputs.push(
        { name: 'query', label: 'Search Query', type: 'text' as const, required: false, description: 'Optional: filter docs by name' },
        { name: 'isOwner', label: 'Only My Docs', type: 'select' as const, required: false, default: 'all', options: [
          { label: 'All Docs', value: 'all' },
          { label: 'Only docs I own', value: 'true' },
        ], description: 'Filter to only show docs you own' }
      );
    } else if (action === 'getDoc') {
      inputs.push(docIdInput);
    } else if (action === 'createDoc') {
      inputs.push(
        { name: 'title', label: 'Doc Title', type: 'text' as const, required: true, description: 'Title for the new doc' },
        { name: 'sourceDoc', label: 'Source Doc ID', type: 'text' as const, required: false, description: 'Optional: Doc ID to copy from' },
        { name: 'folderId', label: 'Folder ID', type: 'text' as const, required: false, description: 'Optional: Folder to create doc in' }
      );
    } else if (action === 'createRow') {
      inputs.push(docIdInput, tableIdInput, cellsInput);
    } else if (action === 'updateRow') {
      inputs.push(
        docIdInput,
        tableIdInput,
        { name: 'rowId', label: 'Row ID', type: 'text' as const, required: true, placeholder: 'i-abc123', description: 'ID of the row to update. Use "List Rows" or "Find Row" to get row IDs.' },
        cellsInput
      );
    } else if (action === 'upsertRow') {
      inputs.push(
        docIdInput,
        tableIdInput,
        { name: 'keyColumns', label: 'Key Columns (JSON)', type: 'code' as const, language: 'json' as const, required: true, placeholder: '["Name", "Email"]', description: 'Array of column IDs/names to match existing rows. Example: ["Email"]' },
        cellsInput
      );
    } else if (action === 'findRow') {
      inputs.push(
        docIdInput,
        tableIdInput,
        { name: 'query', label: 'Query', type: 'text' as const, required: true, placeholder: 'Status:"Active"', description: 'Filter query. Format: columnName:"value". Example: Email:"john@example.com"' }
      );
    } else if (action === 'getRow') {
      inputs.push(
        docIdInput,
        tableIdInput,
        { name: 'rowId', label: 'Row ID', type: 'text' as const, required: true, placeholder: 'i-abc123', description: 'ID of the row to get' }
      );
    } else if (action === 'deleteRow') {
      inputs.push(
        docIdInput,
        tableIdInput,
        { name: 'rowId', label: 'Row ID', type: 'text' as const, required: true, placeholder: 'i-abc123', description: 'ID of the row to delete' }
      );
    } else if (action === 'listRows') {
      inputs.push(
        docIdInput,
        tableIdInput,
        { name: 'query', label: 'Query (Optional)', type: 'text' as const, required: false, placeholder: 'Status:"Active"', description: 'Optional filter query. Format: columnName:"value"' }
      );
    } else if (action === 'listTables') {
      inputs.push(docIdInput);
    } else if (action === 'getTable') {
      inputs.push(docIdInput, tableIdInput);
    } else if (action === 'listColumns') {
      inputs.push(docIdInput, tableIdInput);
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true, placeholder: '/docs/{docId}/tables', description: 'API endpoint path (without base URL)' },
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, default: 'GET', options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false, description: 'Request body for POST/PUT requests' }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data' },
    { name: 'docs', type: 'array', description: 'List of docs' },
    { name: 'doc', type: 'object', description: 'Doc information' },
    { name: 'row', type: 'object', description: 'Row data' },
    { name: 'rows', type: 'array', description: 'List of rows' },
    { name: 'tables', type: 'array', description: 'List of tables' },
    { name: 'table', type: 'object', description: 'Table information' },
    { name: 'columns', type: 'array', description: 'List of columns' },
    { name: 'rowId', type: 'string', description: 'ID of the created/updated row' },
    { name: 'message', type: 'string', description: 'Human-readable result message' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('coda-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
