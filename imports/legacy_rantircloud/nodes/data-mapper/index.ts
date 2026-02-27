import { NodePlugin } from '@/types/node-plugin';

export const dataMapperNode: NodePlugin = {
  type: 'data-mapper',
  name: 'Data Mapper',
  description: 'Server-side data transformation, field mapping, grouping, and sorting',
  category: 'transformer',
  icon: 'https://cdn.activepieces.com/pieces/new-core/data-mapper.svg',
  color: '#8B5CF6',
  inputs: [
    {
      name: 'action', label: 'Action', type: 'select', required: true,
      options: [
        { label: 'Advanced Mapping', value: 'advancedMapping' },
      ],
    },
    { name: 'inputData', label: 'Input Data (JSON)', type: 'code', language: 'json', required: true, description: 'The data to transform' },
  ],
  getDynamicInputs(currentInputs) {
    const action = currentInputs?.action;
    const inputs: any[] = [];

    if (action === 'advancedMapping') {
      inputs.push(
      { name: 'mappingRules', label: 'Mapping Rules (JSON)', type: 'code' as const, language: 'json' as const, required: true, placeholder: '{"source_field": "target_field"}', description: 'Field mapping: {"oldName":"newName"} or [{targetField, sourceField, type}]. Supports direct, concat, calculate_age, date_format types.' },
        { name: 'transformCode', label: 'Custom Transform Code (optional)', type: 'code' as const, language: 'javascript' as const, required: false, description: 'JS expression for advanced transforms. Use `data` variable.', placeholder: 'data.map(item => ({...item, full_name: item.first + " " + item.last}))' },
        { name: 'flattenDepth', label: 'Flatten Depth', type: 'number' as const, required: false, description: 'How deep to flatten nested structures (optional)' },
        { name: 'groupByKey', label: 'Group By Key', type: 'text' as const, required: false, description: 'Dot notation supported (e.g. user.role)' },
        { name: 'sortByKey', label: 'Sort By Key', type: 'text' as const, required: false },
        { name: 'sortDirection', label: 'Sort Direction', type: 'select' as const, required: false, default: 'asc', options: [{ label: 'Ascending', value: 'asc' }, { label: 'Descending', value: 'desc' }] },
      );
    }
    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Transformed data' },
    { name: 'error', type: 'string', description: 'Error message if failed' },
  ],
  async execute(inputs) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );
    const { data, error } = await supabase.functions.invoke('data-mapper-proxy', { body: inputs });
    if (error) throw new Error(error.message);
    return { success: data?.success ?? true, data: data?.data, error: data?.error };
  },
};
