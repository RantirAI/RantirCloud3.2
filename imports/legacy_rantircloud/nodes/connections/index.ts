import { NodePlugin } from '@/types/node-plugin';

export const connectionsNode: NodePlugin = {
  type: 'connections',
  name: 'Connections',
  description: 'Read data from your data connections',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/connections.png',
  color: '#10B981',
  inputs: [
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Read Connection', value: 'readConnection' },
      ],
      description: 'The connection action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'readConnection') {
      inputs.push(
        { name: 'connectionId', label: 'Connection ID', type: 'text' as const, required: true, description: 'The ID of the data connection to read from' },
        { name: 'tableName', label: 'Table Name', type: 'text' as const, required: false, description: 'Optional table name filter' },
        { name: 'select', label: 'Select Fields', type: 'text' as const, required: false, default: '*', description: 'Fields to select (e.g., "id, name, email" or "*" for all)' },
        { name: 'filters', label: 'Filters (JSON)', type: 'code' as const, language: 'json' as const, required: false, description: 'Filter conditions as JSON object' },
        { name: 'limit', label: 'Limit', type: 'number' as const, required: false, default: 100, description: 'Maximum number of records to return' }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'array', description: 'Array of records from the connection' },
    { name: 'rowCount', type: 'number', description: 'Number of rows returned' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { supabase } = await import('@/integrations/supabase/client');

    const { data, error } = await supabase.functions.invoke('connections-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
