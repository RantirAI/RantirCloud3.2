import { NodePlugin } from '@/types/node-plugin';

export const bubbleNode: NodePlugin = {
  type: 'bubble',
  name: 'Bubble',
  description: 'Connect to Bubble.io no-code platform via Data API',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/bubble.png',
  color: '#0D6EFD',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Token',
      type: 'text',
      required: true,
      description: 'Bubble Data API token',
      placeholder: 'your-api-token',
      isApiKey: true,
    },
    {
      name: 'appName',
      label: 'App Name',
      type: 'text',
      required: true,
      description: 'Your Bubble app name (from URL)',
      placeholder: 'myapp',
      dependsOnApiKey: true,
    },
    {
      name: 'dataType',
      label: 'Type Name',
      type: 'select',
      required: true,
      options: [
        { label: 'User', value: 'user' },
        { label: 'Product', value: 'product' },
        { label: 'Order', value: 'order' },
        { label: 'Task', value: 'task' },
        { label: 'Project', value: 'project' },
        { label: 'Customer', value: 'customer' },
        { label: 'Item', value: 'item' },
        { label: 'Post', value: 'post' },
        { label: 'Comment', value: 'comment' },
        { label: 'Category', value: 'category' },
      ],
      description: 'Bubble data type name (common examples provided)',
      dependsOnApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Thing', value: 'bubbleCreateThing' },
        { label: 'Delete Thing', value: 'bubbleDeleteThing' },
        { label: 'Update Thing', value: 'bubbleUpdateThing' },
        { label: 'Get Thing', value: 'bubbleGetThing' },
        { label: 'List Things', value: 'bubbleListThings' },
      ],
      description: 'API action',
      dependsOnApiKey: true,
    },
    {
      name: 'thingId',
      label: 'Thing ID',
      type: 'text',
      required: false,
      description: 'Unique identifier of the thing',
      placeholder: 'thing-id',
      showWhen: {
        field: 'action',
        values: ['bubbleGetThing', 'bubbleUpdateThing', 'bubbleDeleteThing']
      }
    },
    {
      name: 'data',
      label: 'Data',
      type: 'code',
      language: 'json',
      required: false,
      placeholder: '{\n  "name": "John Doe",\n  "email": "john@example.com"\n}',
      description: 'Data for create/update operations',
      showWhen: {
        field: 'action',
        values: ['bubbleCreateThing', 'bubbleUpdateThing']
      }
    },
    {
      name: 'constraintField',
      label: 'Field',
      type: 'text',
      required: false,
      placeholder: 'status',
      description: 'Field name to filter on',
      showWhen: {
        field: 'action',
        values: ['bubbleListThings']
      }
    },
    {
      name: 'constraintType',
      label: 'Constraint Type',
      type: 'select',
      required: false,
      options: [
        { label: 'Equals', value: 'equals' },
        { label: 'Not Equal', value: 'not_equal' },
        { label: 'Text Contains', value: 'text_contains' },
        { label: 'Not Text Contains', value: 'not_text_contains' },
        { label: 'Greater Than', value: 'greater_than' },
        { label: 'Less Than', value: 'less_than' },
        { label: 'In', value: 'in' },
        { label: 'Not In', value: 'not_in' },
        { label: 'Contains', value: 'contains' },
        { label: 'Not Contains', value: 'not_contains' },
        { label: 'Empty', value: 'empty' },
        { label: 'Not Empty', value: 'not_empty' },
      ],
      description: 'Type of constraint to apply',
      showWhen: {
        field: 'action',
        values: ['bubbleListThings']
      }
    },
    {
      name: 'constraintValue',
      label: 'Value',
      type: 'text',
      required: false,
      placeholder: 'active',
      description: 'Value to compare against',
      showWhen: {
        field: 'action',
        values: ['bubbleListThings']
      }
    },
    {
      name: 'startFrom',
      label: 'Start From',
      type: 'text',
      required: false,
      placeholder: '0',
      description: 'Starting index for results',
      showWhen: {
        field: 'action',
        values: ['bubbleListThings']
      }
    },
    {
      name: 'limit',
      label: 'Limit',
      type: 'number',
      required: false,
      default: 100,
      description: 'Maximum number of results to return',
      placeholder: '100',
      showWhen: {
        field: 'action',
        values: ['bubbleListThings']
      }
    },
  ],
  outputs: [
    {
      name: 'data',
      type: 'object',
      description: 'Response data from Bubble API',
    },
    {
      name: 'success',
      type: 'boolean',
      description: 'Operation success status',
    }
  ],
  async execute(inputs, context) {
    const { apiKey, appName, dataType, action, ...otherInputs } = inputs;
    
    if (!apiKey) {
      throw new Error('API key is required');
    }

    if (!appName) {
      throw new Error('App name is required');
    }

    if (!dataType) {
      throw new Error('Data type is required');
    }

    if (!action) {
      throw new Error('Action is required');
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('bubble-proxy', {
        body: {
          apiKey,
          appName,
          dataType,
          action,
          ...otherInputs
        }
      });

      if (error) {
        throw new Error(`Proxy error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error: any) {
      throw new Error(`Bubble execution failed: ${error.message}`);
    }
  }
};
