import { NodePlugin } from '@/types/node-plugin';

export const datafuelNode: NodePlugin = {
  type: 'datafuel',
  name: 'DataFuel',
  description: 'Crawl and scrape websites with AI-powered data from DataFuel',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/datafuel.png',
  color: '#FF6B2B',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      placeholder: 'Enter your DataFuel API key',
      description: 'Your DataFuel API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Crawl Website', value: 'crawlWebsite', description: 'Crawl a website and extract structured data' },
        { label: 'Scrape Website', value: 'scrapeWebsite', description: 'Scrape a specific webpage for content' },
        { label: 'Get Scrape', value: 'getScrape', description: 'Retrieve a previously initiated scrape result' },
        { label: 'Create Custom API Call', value: 'createCustomApiCall', description: 'Make a custom DataFuel API request' },
      ],
      description: 'Select the DataFuel action to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const { action } = currentInputs;
    const inputs: any[] = [];

    if (action === 'crawlWebsite') {
      inputs.push(
        { name: 'url', label: 'Website URL', type: 'text', required: true, placeholder: 'https://example.com', description: 'The URL of the website to crawl' },
        { name: 'maxPages', label: 'Max Pages', type: 'number', required: false, default: 10, description: 'Maximum number of pages to crawl' },
        { name: 'depth', label: 'Crawl Depth', type: 'number', required: false, default: 2, description: 'Maximum depth of links to follow' },
      );
    } else if (action === 'scrapeWebsite') {
      inputs.push(
        { name: 'url', label: 'Page URL', type: 'text', required: true, placeholder: 'https://example.com/page', description: 'The URL of the page to scrape' },
        { name: 'selector', label: 'CSS Selector', type: 'text', required: false, placeholder: 'div.content', description: 'Optional CSS selector to target specific content' },
        { name: 'format', label: 'Output Format', type: 'select', required: false, default: 'text', options: [
          { label: 'Text', value: 'text' },
          { label: 'HTML', value: 'html' },
          { label: 'Markdown', value: 'markdown' },
        ]},
      );
    } else if (action === 'getScrape') {
      inputs.push(
        { name: 'scrapeId', label: 'Scrape ID', type: 'text', required: true, placeholder: 'scrape_abc123', description: 'The ID of a previously initiated scrape' },
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'method', label: 'HTTP Method', type: 'select', required: true, options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'path', label: 'API Path', type: 'text', required: true, placeholder: '/v1/scrape' },
        { name: 'body', label: 'Request Body (JSON)', type: 'textarea', required: false, placeholder: '{}' },
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'result', type: 'object', description: 'Response from DataFuel API' },
    { name: 'status', type: 'string', description: 'Operation status' },
  ],
  async execute(inputs, context) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://appdmmjexevclmpyvtss.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
      );

      const { data, error } = await supabase.functions.invoke('datafuel-proxy', {
        body: inputs,
      });

      if (error) throw error;

      return {
        result: data,
        status: data?.status || 'ok',
      };
    } catch (error) {
      throw new Error(`DataFuel API error: ${error.message}`);
    }
  },
};
