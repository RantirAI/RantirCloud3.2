import { NodePlugin } from '@/types/node-plugin';

// Default Dappier model IDs per action
const MODEL_DEFAULTS: Record<string, { type: 'ai' | 'data'; modelId: string }> = {
  realTimeWebSearch: { type: 'ai', modelId: 'am_01j06ytn18ejftedz6dyhz2b15' },
  stockMarketDataSearch: { type: 'ai', modelId: 'am_01j749h8pbf7ns8r1bq9s2evrh' },
  sportsNewsSearch: { type: 'data', modelId: 'dm_01j0pb465keqmatq9k83dthx34' },
  lifestyleNewsSearch: { type: 'data', modelId: 'dm_01j0q82s4bfjmsqkhs3ywm3x6y' },
};

export const dappierNode: NodePlugin = {
  type: 'dappier',
  name: 'Dappier',
  description: 'Real-time AI-powered data recommendations, search, and predictions',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/dappier.png',
  color: '#4F46E5',
  inputs: [
    { name: 'apiKey', label: 'API Key', type: 'text', required: true, description: 'Your Dappier API key', isApiKey: true },
    {
      name: 'action', label: 'Action', type: 'select', required: true,
      options: [
        { label: 'Real-Time Web Search', value: 'realTimeWebSearch' },
        { label: 'Stock Market Data Search', value: 'stockMarketDataSearch' },
        { label: 'Sports News Search', value: 'sportsNewsSearch' },
        { label: 'Lifestyle News Search', value: 'lifestyleNewsSearch' },
      ],
    },
  ],
  getDynamicInputs(currentInputs) {
    const action = currentInputs?.action;
    const inputs: any[] = [];

    if (action === 'realTimeWebSearch') {
      inputs.push(
        { name: 'query', label: 'Search Query', type: 'textarea' as const, required: true },
        { name: 'numResults', label: 'Number of Results', type: 'number' as const, required: false, default: 5 },
      );
    }
    if (action === 'stockMarketDataSearch') {
      inputs.push(
        { name: 'query', label: 'Stock Query', type: 'textarea' as const, required: true, placeholder: 'e.g. AAPL stock price' },
      );
    }
    if (action === 'sportsNewsSearch') {
      inputs.push(
        { name: 'query', label: 'Sports Query', type: 'textarea' as const, required: true, placeholder: 'e.g. NBA scores today' },
      );
    }
    if (action === 'lifestyleNewsSearch') {
      inputs.push(
        { name: 'query', label: 'Lifestyle Query', type: 'textarea' as const, required: true, placeholder: 'e.g. latest fashion trends' },
      );
    }
    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data' },
    { name: 'error', type: 'string', description: 'Error message if failed' },
  ],
  async execute(inputs) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const action = inputs.action;
    const defaults = MODEL_DEFAULTS[action];

    // Inject the correct model ID based on action type
    const body = {
      ...inputs,
      ...(defaults?.type === 'ai' ? { aiModelId: defaults.modelId } : {}),
      ...(defaults?.type === 'data' ? { dataModelId: defaults.modelId } : {}),
    };

    const { data, error } = await supabase.functions.invoke('dappier-proxy', { body });
    if (error) throw new Error(error.message);
    return { success: data?.success ?? true, data: data?.data, error: data?.error };
  },
};
