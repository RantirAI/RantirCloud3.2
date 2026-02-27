import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';

export const baserowNode: NodePlugin = {
  type: 'baserow',
  name: 'Baserow',
  description: 'Manage data in Baserow databases',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/baserow.png',
  color: '#0057FF',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Token',
      type: 'text',
      required: true,
      description: 'Baserow API token',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Row', value: 'createRow' },
        { label: 'Delete Row', value: 'deleteRow' },
        { label: 'Get Row', value: 'getRow' },
        { label: 'List Rows', value: 'listRows' },
        { label: 'Update Row', value: 'updateRow' },
        { label: 'Create Custom API Call', value: 'createCustomApiCall' },
      ],
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const inputs = [];
    
    if (currentInputs.action !== 'createCustomApiCall') {
      inputs.push({
        name: 'tableId',
        label: 'Table ID',
        type: 'text',
        required: true,
        description: 'The ID of the Baserow table',
      });
    }
    
    if (currentInputs.action === 'createRow' || currentInputs.action === 'updateRow') {
      inputs.push({
        name: 'rowData',
        label: 'Row Data',
        type: 'code',
        language: 'json',
        required: true,
        description: 'JSON object with row field values',
      });
    }
    
    if (currentInputs.action === 'updateRow' || currentInputs.action === 'deleteRow' || currentInputs.action === 'getRow') {
      inputs.push({
        name: 'rowId',
        label: 'Row ID',
        type: 'text',
        required: true,
        description: 'The ID of the row',
      });
    }
    
    if (currentInputs.action === 'createCustomApiCall') {
      inputs.push(
        {
          name: 'endpoint',
          label: 'Endpoint',
          type: 'text',
          required: true,
          description: 'API endpoint path',
        },
        {
          name: 'method',
          label: 'HTTP Method',
          type: 'select',
          required: true,
          options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'DELETE', value: 'DELETE' },
          ],
        },
        {
          name: 'body',
          label: 'Request Body',
          type: 'code',
          language: 'json',
          required: false,
          description: 'JSON request body',
        }
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
      description: 'Response data from Baserow',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs) {
    const { data, error } = await supabase.functions.invoke('baserow-action', {
      body: inputs,
    });

    if (error) throw error;
    return data;
  },
};
