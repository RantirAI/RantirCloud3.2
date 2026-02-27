import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';

export const bikaNode: NodePlugin = {
  type: 'bika',
  name: 'Bika.ai',
  description: 'Manage Bika.ai database records and workflows',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/bika.png',
  color: '#F59E0B',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Bika API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Record', value: 'createRecord' },
        { label: 'Find Records', value: 'findRecords' },
        { label: 'Find Record', value: 'findRecord' },
        { label: 'Update Record', value: 'updateRecord' },
        { label: 'Delete Record', value: 'deleteRecord' },
        { label: 'Create Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'Action to perform',
    },
    {
      name: 'tableId',
      label: 'Table ID',
      type: 'text',
      description: 'ID of the table',
      showWhen: {
        field: 'action',
        values: ['createRecord', 'findRecords', 'findRecord', 'updateRecord', 'deleteRecord']
      }
    },
    {
      name: 'recordId',
      label: 'Record ID',
      type: 'text',
      description: 'ID of the record',
      showWhen: {
        field: 'action',
        values: ['findRecord', 'updateRecord', 'deleteRecord']
      }
    },
    {
      name: 'recordData',
      label: 'Record Data',
      type: 'code',
      language: 'json',
      description: 'Data for the record',
      showWhen: {
        field: 'action',
        values: ['createRecord', 'updateRecord']
      }
    },
    {
      name: 'filter',
      label: 'Filter',
      type: 'code',
      language: 'json',
      description: 'Filter criteria for finding records',
      showWhen: {
        field: 'action',
        values: ['findRecords']
      }
    },
    {
      name: 'endpoint',
      label: 'API Endpoint',
      type: 'text',
      description: 'Custom API endpoint',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
      }
    },
    {
      name: 'method',
      label: 'HTTP Method',
      type: 'select',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
      ],
      description: 'HTTP method',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
      }
    },
    {
      name: 'customData',
      label: 'Request Data',
      type: 'code',
      language: 'json',
      description: 'Data to send with the request',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
      }
    },
  ],
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'Workflow execution result',
    },
  ],
  async execute(inputs) {
    const { data, error } = await supabase.functions.invoke('bika-action', {
      body: inputs,
    });

    if (error) throw error;
    return { result: data };
  },
};
