import { NodePlugin } from '@/types/node-plugin';

export const googleCalendarNode: NodePlugin = {
  type: 'google-calendar',
  name: 'Google Calendar',
  description: 'Create and manage Google Calendar events',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/google-calendar.png',
  color: '#4285F4',
  inputs: [
    {
      name: 'accessToken',
      label: 'Google Calendar Access Token',
      type: 'text',
      required: true,
      description: 'Google Calendar API Access Token',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Event', value: 'create_event' },
        { label: 'List Events', value: 'list_events' },
        { label: 'Update Event', value: 'update_event' },
        { label: 'Delete Event', value: 'delete_event' },
      ],
      description: 'Select the Google Calendar action to perform',
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const { action } = currentInputs;
    const inputs: any[] = [];

    if (action === 'create_event' || action === 'update_event') {
      inputs.push(
        { name: 'summary', label: 'Event Title', type: 'text', required: true, placeholder: 'Meeting with team' },
        { name: 'startTime', label: 'Start Time', type: 'text', required: true, placeholder: '2024-01-01T10:00:00Z' },
        { name: 'endTime', label: 'End Time', type: 'text', required: true, placeholder: '2024-01-01T11:00:00Z' },
        { name: 'description', label: 'Description', type: 'textarea', required: false, placeholder: 'Event description' }
      );
      if (action === 'update_event') {
        inputs.push({ name: 'eventId', label: 'Event ID', type: 'text', required: true, placeholder: 'Event ID to update' });
      }
    } else if (action === 'delete_event') {
      inputs.push(
        { name: 'eventId', label: 'Event ID', type: 'text', required: true, placeholder: 'Event ID' }
      );
    } else if (action === 'list_events') {
      // Optional filters (currently not used by edge function but kept for future compatibility)
      inputs.push(
        { name: 'timeMin', label: 'Start Time', type: 'text', required: false, placeholder: '2024-01-01T00:00:00Z' },
        { name: 'timeMax', label: 'End Time', type: 'text', required: false, placeholder: '2024-12-31T23:59:59Z' },
        { name: 'maxResults', label: 'Max Results', type: 'number', required: false, placeholder: '10' }
      );
    }

    return inputs;
  },
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'Response from Google Calendar API',
    },
    {
      name: 'eventLink',
      type: 'string',
      description: 'Link to the calendar event',
    },
  ],
  async execute(inputs, context) {
    const { accessToken, action, ...params } = inputs;
    
    if (!accessToken) {
      throw new Error('Google Calendar Access Token is required');
    }
    if (!action) {
      throw new Error('Please select an action for Google Calendar');
    }
    
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://appdmmjexevclmpyvtss.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
      );

      const { data, error } = await supabase.functions.invoke('google-calendar-action', {
        body: { accessToken, action, ...params },
      });

      if (error) throw error;

      return {
        result: data,
        eventLink: data?.htmlLink || '',
      };
    } catch (error) {
      throw new Error(`Google Calendar API error: ${error.message}`);
    }
  },
};
