import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';

export const campaignMonitorNode: NodePlugin = {
  type: 'campaign-monitor',
  name: 'Campaign Monitor',
  description: 'Email marketing and campaign management',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/campaign-monitor.png',
  color: '#F37021',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Campaign Monitor API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Add Subscriber to List', value: 'addSubscriberToList' },
        { label: 'Update Subscriber Details', value: 'updateSubscriberDetails' },
        { label: 'Unsubscribe Subscriber', value: 'unsubscribeSubscriber' },
        { label: 'Find Subscriber', value: 'findSubscriber' },
      ],
      description: 'Action to perform',
    },
    {
      name: 'listId',
      label: 'List ID',
      type: 'text',
      required: false,
      description: 'Mailing list ID',
      showWhen: { field: 'action', values: ['addSubscriberToList', 'updateSubscriberDetails', 'unsubscribeSubscriber', 'findSubscriber'] },
    },
    {
      name: 'email',
      label: 'Email',
      type: 'text',
      required: false,
      description: 'Subscriber email address',
      showWhen: { field: 'action', values: ['addSubscriberToList', 'updateSubscriberDetails', 'unsubscribeSubscriber', 'findSubscriber'] },
    },
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: false,
      description: 'Subscriber name',
      showWhen: { field: 'action', values: ['addSubscriberToList', 'updateSubscriberDetails'] },
    },
    {
      name: 'customFields',
      label: 'Custom Fields',
      type: 'code',
      language: 'json',
      required: false,
      description: 'Custom fields (JSON format)',
      placeholder: '{\n  "field1": "value1"\n}',
      showWhen: { field: 'action', values: ['addSubscriberToList', 'updateSubscriberDetails'] },
    },
  ],
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'Campaign Monitor API response',
    },
  ],
  async execute(inputs) {
    const { data, error } = await supabase.functions.invoke('campaign-monitor-action', {
      body: inputs,
    });

    if (error) throw error;
    return { result: data };
  },
};
