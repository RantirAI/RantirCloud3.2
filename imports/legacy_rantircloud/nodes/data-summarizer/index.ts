import { NodePlugin } from '@/types/node-plugin';
import { BarChart3 } from 'lucide-react';

export const dataSummarizerNode: NodePlugin = {
  type: 'data-summarizer',
  name: 'Data Summarizer',
  description: 'Calculate averages, sums, unique counts, and min/max from datasets',
  category: 'transformer',
  icon: BarChart3,
  color: '#6366F1',
  inputs: [
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Calculate Average', value: 'calculateAverage', description: 'Compute the average of a numeric field' },
        { label: 'Calculate Sum', value: 'calculateSum', description: 'Compute the sum of a numeric field' },
        { label: 'Count Uniques', value: 'countUniques', description: 'Count unique values in a field' },
        { label: 'Get Min/Max', value: 'getMinMax', description: 'Get minimum and maximum values of a field' },
      ],
      description: 'Select the summarization action',
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const { action } = currentInputs;
    const inputs: any[] = [
      { name: 'data', label: 'Input Data (JSON)', type: 'textarea', required: true, placeholder: '[{"name": "Alice", "score": 90}, ...]' },
    ];

    if (action === 'calculateAverage' || action === 'calculateSum' || action === 'getMinMax') {
      inputs.push(
        { name: 'numericField', label: 'Numeric Field', type: 'text', required: true, placeholder: 'e.g., score' }
      );
    } else if (action === 'countUniques') {
      inputs.push(
        { name: 'countField', label: 'Field to Count', type: 'text', required: true, placeholder: 'e.g., status' }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'summary', type: 'object', description: 'Summary result object' },
    { name: 'text', type: 'string', description: 'Human-readable summary text' },
    { name: 'recordCount', type: 'number', description: 'Total records processed' },
  ],
  async execute(inputs, context) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://appdmmjexevclmpyvtss.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
      );

      const { data, error } = await supabase.functions.invoke('data-summarizer-proxy', {
        body: inputs,
      });

      if (error) throw error;

      return {
        summary: data?.summary || data,
        text: data?.text || '',
        recordCount: data?.recordCount || 0,
      };
    } catch (error) {
      throw new Error(`Data Summarizer error: ${error.message}`);
    }
  },
};
