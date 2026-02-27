import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';

export const binanceNode: NodePlugin = {
  type: 'binance',
  name: 'Binance',
  description: 'Access Binance cryptocurrency exchange data',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/binance.png',
  color: '#F0B90B',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: false,
      description: 'Your Binance API key (optional for public endpoints)',
      isApiKey: true,
    },
    {
      name: 'apiSecret',
      label: 'API Secret',
      type: 'text',
      required: false,
      description: 'Your Binance API secret (optional for public endpoints)',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Fetch Crypto Pair Price', value: 'fetchCryptoPairPrice' },
      ],
      description: 'Action to perform',
    },
    {
      name: 'symbol',
      label: 'Trading Symbol',
      type: 'text',
      required: true,
      description: 'Trading pair (e.g., BTCUSDT)',
      placeholder: 'BTCUSDT',
    },
  ],
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'Binance API response',
    },
  ],
  async execute(inputs) {
    const { data, error } = await supabase.functions.invoke('binance-action', {
      body: inputs,
    });

    if (error) throw error;
    return { result: data };
  },
};
