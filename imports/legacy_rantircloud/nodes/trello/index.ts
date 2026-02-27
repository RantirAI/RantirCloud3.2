import { NodePlugin } from '@/types/node-plugin';

export const trelloNode: NodePlugin = {
  type: 'trello',
  name: 'Trello',
  description: 'Visual project management with boards, lists, and cards',
  category: 'action',
  icon: 'https://cdn.prod.website-files.com/67e18b84fa43974c4775c6ac/67f05d538343231033ba3d5c_677c7ec4d440c52193fa9e65_672ef88a34ee692170baf15c_3599d3.svg',
  color: '#0079BF',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Your Trello API key'
    },
    {
      name: 'token',
      label: 'Token',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Your Trello token'
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Get Card', value: 'get_card' },
        { label: 'Create Card', value: 'create_card' },
        { label: 'Update Card', value: 'update_card' },
        { label: 'Delete Card', value: 'delete_card' },
        { label: 'Get Board', value: 'get_board' },
        { label: 'Create Board', value: 'create_board' },
        { label: 'Get Lists', value: 'get_lists' },
        { label: 'Create List', value: 'create_list' },
        { label: 'Add Comment', value: 'add_comment' },
        { label: 'Get Members', value: 'get_members' },
        { label: 'Custom API Call', value: 'custom_api' }
      ],
      description: 'Select the Trello action to perform'
    }
  ],
  getDynamicInputs: (currentInputs) => {
    const action = currentInputs?.action;
    if (!action) return [];

    const dynamicInputs = [];

    switch (action) {
      case 'create_card':
        dynamicInputs.push(
          { name: 'board_id', label: 'Board ID', type: 'text', required: true, description: 'The ID of the Trello board' },
          { name: 'list_id', label: 'List ID', type: 'text', required: true, description: 'The ID of the Trello list' },
          { name: 'name', label: 'Card Name', type: 'text', required: true },
          { name: 'desc', label: 'Description', type: 'textarea' },
          { name: 'pos', label: 'Position', type: 'text', description: 'Position in the list (top, bottom, or number)' },
          { name: 'due', label: 'Due Date', type: 'text', description: 'Due date (ISO 8601)' },
          { name: 'members', label: 'Member IDs (comma separated)', type: 'text' },
          { name: 'labels', label: 'Label IDs (comma separated)', type: 'text' }
        );
        break;

      case 'get_card':
        dynamicInputs.push(
          { name: 'card_id', label: 'Card ID', type: 'text', required: true }
        );
        break;

      case 'update_card':
        dynamicInputs.push(
          { name: 'card_id', label: 'Card ID', type: 'text', required: true },
          { name: 'name', label: 'Card Name', type: 'text' },
          { name: 'desc', label: 'Description', type: 'textarea' },
          { name: 'pos', label: 'Position', type: 'text' },
          { name: 'due', label: 'Due Date', type: 'text' },
          { name: 'closed', label: 'Archived', type: 'boolean' }
        );
        break;

      case 'delete_card':
        dynamicInputs.push(
          { name: 'card_id', label: 'Card ID', type: 'text', required: true }
        );
        break;

      case 'create_board':
        dynamicInputs.push(
          { name: 'name', label: 'Board Name', type: 'text', required: true },
          { name: 'desc', label: 'Description', type: 'textarea' },
          { name: 'defaultLists', label: 'Create Default Lists', type: 'boolean', default: true },
          { name: 'prefs_permissionLevel', label: 'Permission Level', type: 'select', options: [
            { label: 'Private', value: 'private' },
            { label: 'Team', value: 'org' },
            { label: 'Public', value: 'public' }
          ]}
        );
        break;

      case 'get_board':
        dynamicInputs.push(
          { name: 'board_id', label: 'Board ID', type: 'text', required: true }
        );
        break;

      case 'get_lists':
        dynamicInputs.push(
          { name: 'board_id', label: 'Board ID', type: 'text', required: true }
        );
        break;

      case 'create_list':
        dynamicInputs.push(
          { name: 'board_id', label: 'Board ID', type: 'text', required: true },
          { name: 'name', label: 'List Name', type: 'text', required: true },
          { name: 'pos', label: 'Position', type: 'text', description: 'Position (top, bottom, or number)' }
        );
        break;

      case 'add_comment':
        dynamicInputs.push(
          { name: 'card_id', label: 'Card ID', type: 'text', required: true },
          { name: 'text', label: 'Comment Text', type: 'textarea', required: true }
        );
        break;

      case 'get_members':
        dynamicInputs.push(
          { name: 'board_id', label: 'Board ID', type: 'text', required: true }
        );
        break;

      case 'custom_api':
        dynamicInputs.push(
          { name: 'endpoint', label: 'API Endpoint', type: 'text', required: true, placeholder: '/boards/BOARD_ID' },
          { name: 'method', label: 'HTTP Method', type: 'select', required: true, options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'DELETE', value: 'DELETE' }
          ]},
          { name: 'params', label: 'Query Parameters (JSON)', type: 'code', language: 'json' },
          { name: 'body', label: 'Request Body (JSON)', type: 'code', language: 'json' }
        );
        break;
    }

    return dynamicInputs;
  },
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful'
    },
    {
      name: 'data',
      type: 'object',
      description: 'The response data from Trello'
    },
    {
      name: 'id',
      type: 'string',
      description: 'The ID of the created/updated item'
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if the operation failed'
    }
  ],
  execute: async (inputs, context) => {
    const { apiKey, token, action, ...actionInputs } = inputs;

    if (!apiKey || !token) {
      throw new Error('API Key and Token are required');
    }

    try {
      // Use Supabase proxy function for Trello API calls
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('trello-proxy', {
        body: {
          apiKey,
          token,
          action,
          inputs: actionInputs
        }
      });

      if (error) {
        throw new Error(`Trello proxy error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Trello operation failed: ${error.message}`);
    }
  }
};