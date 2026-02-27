import { NodePlugin } from '@/types/node-plugin';

export const datadogNode: NodePlugin = {
  type: 'datadog',
  name: 'Datadog',
  description: 'Send logs and make custom API calls to Datadog',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/datadog.png',
  color: '#632CA6',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      placeholder: 'Enter your Datadog API key',
      description: 'Your Datadog API key',
      isApiKey: true,
    },
    {
      name: 'site',
      label: 'Datadog Site',
      type: 'select',
      required: true,
      default: 'datadoghq.com',
      options: [
        { label: 'US1 (datadoghq.com)', value: 'datadoghq.com' },
        { label: 'US3 (us3.datadoghq.com)', value: 'us3.datadoghq.com' },
        { label: 'US5 (us5.datadoghq.com)', value: 'us5.datadoghq.com' },
        { label: 'EU (datadoghq.eu)', value: 'datadoghq.eu' },
        { label: 'AP1 (ap1.datadoghq.com)', value: 'ap1.datadoghq.com' },
      ],
      description: 'Your Datadog site region',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Send Multiple Logs', value: 'sendMultipleLogs', description: 'Send multiple log entries at once' },
        { label: 'Send One Log', value: 'sendOneLog', description: 'Send a single log entry' },
        { label: 'Create Custom API Call', value: 'createCustomApiCall', description: 'Make a custom Datadog API request' },
      ],
      description: 'Select the Datadog action to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const { action } = currentInputs;
    const inputs: any[] = [];

    if (action === 'sendOneLog') {
      inputs.push(
        { name: 'logMessage', label: 'Log Message', type: 'textarea', required: true, placeholder: 'Application started successfully' },
        { name: 'logLevel', label: 'Level', type: 'select', required: true, options: [
          { label: 'Debug', value: 'debug' },
          { label: 'Info', value: 'info' },
          { label: 'Warning', value: 'warn' },
          { label: 'Error', value: 'error' },
        ]},
        { name: 'service', label: 'Service Name', type: 'text', required: false, placeholder: 'my-api' },
        { name: 'tags', label: 'Tags (comma-separated)', type: 'text', required: false, placeholder: 'env:prod,service:api' },
      );
    } else if (action === 'sendMultipleLogs') {
      inputs.push(
        { name: 'logs', label: 'Logs (JSON Array)', type: 'textarea', required: true, placeholder: '[{"message": "Log 1", "level": "info"}, {"message": "Log 2", "level": "error"}]' },
        { name: 'service', label: 'Default Service Name', type: 'text', required: false, placeholder: 'my-api' },
        { name: 'tags', label: 'Default Tags (comma-separated)', type: 'text', required: false, placeholder: 'env:prod' },
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'method', label: 'HTTP Method', type: 'select', required: true, options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'path', label: 'API Path', type: 'text', required: true, placeholder: '/api/v1/events' },
        { name: 'body', label: 'Request Body (JSON)', type: 'textarea', required: false, placeholder: '{"title": "My Event"}' },
        { name: 'appKey', label: 'Application Key (if needed)', type: 'text', required: false, placeholder: 'Required for read endpoints', isApiKey: true },
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'result', type: 'object', description: 'Response from Datadog API' },
    { name: 'status', type: 'string', description: 'Operation status' },
  ],
  async execute(inputs, context) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://appdmmjexevclmpyvtss.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
      );

      const { data, error } = await supabase.functions.invoke('datadog-proxy', {
        body: inputs,
      });

      if (error) throw error;

      return {
        result: data,
        status: data?.status || 'ok',
      };
    } catch (error) {
      throw new Error(`Datadog API error: ${error.message}`);
    }
  },
};
