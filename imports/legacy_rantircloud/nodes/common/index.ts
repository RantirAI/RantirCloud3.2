import { NodePlugin } from '@/types/node-plugin';

export const commonNode: NodePlugin = {
  type: 'common',
  name: 'Common',
  description: 'Common utility actions for data transformation, delays, and logic operations',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/common.png',
  color: '#6366F1',
  inputs: [
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Delay', value: 'delay' },
        { label: 'HTTP Request', value: 'httpRequest' },
        { label: 'Transform Data', value: 'transformData' },
        { label: 'Filter Data', value: 'filterData' },
        { label: 'Merge Data', value: 'mergeData' },
        { label: 'Split Text', value: 'splitText' },
        { label: 'Join Text', value: 'joinText' },
        { label: 'Generate Random', value: 'generateRandom' },
        { label: 'Date/Time Format', value: 'dateTimeFormat' },
      ],
      description: 'The utility action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'delay') {
      inputs.push(
        { name: 'seconds', label: 'Delay (seconds)', type: 'number' as const, required: true, default: 1, description: 'Number of seconds to wait' }
      );
    } else if (action === 'httpRequest') {
      inputs.push(
        { name: 'url', label: 'URL', type: 'text' as const, required: true },
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, default: 'GET', options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'PATCH', value: 'PATCH' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'headers', label: 'Headers (JSON)', type: 'code' as const, language: 'json' as const, required: false },
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    } else if (action === 'transformData') {
      inputs.push(
        { name: 'inputData', label: 'Input Data (JSON)', type: 'code' as const, language: 'json' as const, required: true },
        { name: 'transformCode', label: 'Transform Expression', type: 'code' as const, language: 'javascript' as const, required: true, description: 'JavaScript expression. Use "data" variable.' }
      );
    } else if (action === 'filterData') {
      inputs.push(
        { name: 'inputArray', label: 'Input Array (JSON)', type: 'code' as const, language: 'json' as const, required: true },
        { name: 'filterCondition', label: 'Filter Condition', type: 'code' as const, language: 'javascript' as const, required: true, description: 'JavaScript condition. Use "item" variable.' }
      );
    } else if (action === 'mergeData') {
      inputs.push(
        { name: 'object1', label: 'First Object (JSON)', type: 'code' as const, language: 'json' as const, required: true },
        { name: 'object2', label: 'Second Object (JSON)', type: 'code' as const, language: 'json' as const, required: true },
        { name: 'mergeStrategy', label: 'Merge Strategy', type: 'select' as const, required: true, default: 'shallow', options: [
          { label: 'Shallow Merge', value: 'shallow' },
          { label: 'Deep Merge', value: 'deep' },
        ]}
      );
    } else if (action === 'splitText') {
      inputs.push(
        { name: 'text', label: 'Text', type: 'textarea' as const, required: true },
        { name: 'delimiter', label: 'Delimiter', type: 'text' as const, required: true, default: ',' }
      );
    } else if (action === 'joinText') {
      inputs.push(
        { name: 'array', label: 'Array (JSON)', type: 'code' as const, language: 'json' as const, required: true },
        { name: 'separator', label: 'Separator', type: 'text' as const, required: true, default: ', ' }
      );
    } else if (action === 'generateRandom') {
      inputs.push(
        { name: 'type', label: 'Type', type: 'select' as const, required: true, options: [
          { label: 'UUID', value: 'uuid' },
          { label: 'Number', value: 'number' },
          { label: 'String', value: 'string' },
        ]},
        { name: 'min', label: 'Min (for number)', type: 'number' as const, required: false, default: 0 },
        { name: 'max', label: 'Max (for number)', type: 'number' as const, required: false, default: 100 },
        { name: 'length', label: 'Length (for string)', type: 'number' as const, required: false, default: 16 }
      );
    } else if (action === 'dateTimeFormat') {
      inputs.push(
        { name: 'dateInput', label: 'Date Input', type: 'text' as const, required: false, description: 'Leave empty for current date/time' },
        { name: 'inputFormat', label: 'Input Format', type: 'text' as const, required: false, description: 'e.g., YYYY-MM-DD' },
        { name: 'outputFormat', label: 'Output Format', type: 'text' as const, required: true, default: 'YYYY-MM-DD HH:mm:ss' },
        { name: 'timezone', label: 'Timezone', type: 'text' as const, required: false, default: 'UTC' }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'result', type: 'object', description: 'The result of the operation' },
    { name: 'data', type: 'object', description: 'Transformed/processed data' },
    { name: 'array', type: 'array', description: 'Result array (for split, filter operations)' },
    { name: 'text', type: 'string', description: 'Result text (for join operation)' },
    { name: 'value', type: 'string', description: 'Generated value (for random operation)' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { supabase } = await import('@/integrations/supabase/client');

    const { data, error } = await supabase.functions.invoke('common-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
