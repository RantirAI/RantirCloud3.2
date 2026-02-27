import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';

export const calComNode: NodePlugin = {
  type: 'cal-com',
  name: 'Cal.com',
  description: 'Triggers for Cal.com booking events',
  category: 'trigger',
  icon: 'https://cdn.activepieces.com/pieces/cal.com.png',
  color: '#292929',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Cal.com API key',
      isApiKey: true,
    },
    {
      name: 'trigger',
      label: 'Trigger',
      type: 'select',
      required: true,
      options: [
        { label: 'Booking Created', value: 'bookingCreated' },
        { label: 'Booking Cancelled', value: 'bookingCancelled' },
        { label: 'Booking Rescheduled', value: 'bookingRescheduled' },
      ],
      description: 'Cal.com event to trigger on',
    },
  ],
  outputs: [
    {
      name: 'booking',
      type: 'object',
      description: 'Cal.com booking data',
    },
  ],
};
