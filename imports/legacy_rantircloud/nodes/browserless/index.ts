import { NodePlugin } from '@/types/node-plugin';

export const browserlessNode: NodePlugin = {
  type: 'browserless',
  name: 'Browserless',
  description: 'Headless browser automation for screenshots, PDFs, and web scraping',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/browserless.png',
  color: '#6366F1',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Browserless API token',
      placeholder: 'your-api-token',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Capture Screenshot', value: 'captureScreenshot' },
        { label: 'Generate PDF', value: 'generatePdf' },
        { label: 'Scrape URL', value: 'scrapeUrl' },
        { label: 'Run BQL Query', value: 'runBqlQuery' },
        { label: 'Get Website Performance', value: 'getWebsitePerformance' },
      ],
      description: 'Select an action to perform',
      dependsOnApiKey: true,
    },
    {
      name: 'url',
      label: 'URL',
      type: 'text',
      required: true,
      description: 'Target URL',
      placeholder: 'https://example.com',
      dependsOnApiKey: true,
      showWhen: {
        field: 'action',
        values: ['captureScreenshot', 'generatePdf', 'scrapeUrl', 'getWebsitePerformance']
      }
    },
    {
      name: 'waitForSelector',
      label: 'Wait for Selector',
      type: 'text',
      required: false,
      description: 'CSS selector to wait for before action. Use broader selectors (like h1) for better reliability.',
      placeholder: 'h1',
      dependsOnApiKey: true,
      showWhen: {
        field: 'action',
        values: ['captureScreenshot', 'generatePdf', 'scrapeUrl']
      }
    },
    {
      name: 'waitTimeoutMs',
      label: 'Wait Timeout (ms)',
      type: 'number',
      required: false,
      default: 15000,
      description: 'Maximum time to wait for selector (milliseconds)',
      placeholder: '15000',
      showWhen: {
        field: 'action',
        values: ['captureScreenshot', 'generatePdf', 'scrapeUrl']
      }
    },
    {
      name: 'waitUntil',
      label: 'Wait Until',
      type: 'select',
      required: false,
      default: 'domcontentloaded',
      options: [
        { label: 'DOM Content Loaded', value: 'domcontentloaded' },
        { label: 'Network Idle', value: 'networkidle' },
      ],
      description: 'When to consider navigation complete',
      showWhen: {
        field: 'action',
        values: ['captureScreenshot', 'generatePdf', 'scrapeUrl']
      }
    },
    {
      name: 'bestAttempt',
      label: 'Best Attempt',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Return partial result if selector or timing fails',
      showWhen: {
        field: 'action',
        values: ['captureScreenshot', 'generatePdf', 'scrapeUrl']
      }
    },
    {
      name: 'viewport',
      label: 'Viewport',
      type: 'code',
      language: 'json',
      required: false,
      default: '{"width": 1920, "height": 1080}',
      placeholder: '{\n  "width": 1920,\n  "height": 1080\n}',
      description: 'Browser viewport dimensions',
      showWhen: {
        field: 'action',
        values: ['captureScreenshot', 'generatePdf']
      }
    },
    {
      name: 'selector',
      label: 'CSS Selector',
      type: 'text',
      required: true,
      description: 'CSS selector for elements to scrape',
      placeholder: 'h1',
      showWhen: {
        field: 'action',
        values: ['scrapeUrl']
      }
    },
    {
      name: 'bqlQuery',
      label: 'BQL Query',
      type: 'code',
      language: 'javascript',
      required: true,
      placeholder: 'export default async function query(page) {\n  return await page.evaluate(() => {\n    return document.title;\n  });\n}',
      description: 'Browserless Query Language (BQL) script',
      showWhen: {
        field: 'action',
        values: ['runBqlQuery']
      }
    },
  ],
  outputs: [
    {
      name: 'data',
      type: 'object',
      description: 'Result data (image URL, PDF URL, or scraped content)',
    },
    {
      name: 'contentType',
      type: 'string',
      description: 'Content type of result',
    }
  ],
  async execute(inputs, context) {
    const { apiKey, action, ...otherInputs } = inputs;
    
    if (!apiKey) {
      throw new Error('API key is required');
    }

    if (!action) {
      throw new Error('Action is required');
    }

    try {
      // Client-side validation to avoid proxy 400s
      const needsUrl = ['captureScreenshot', 'generatePdf', 'scrapeUrl', 'getWebsitePerformance'].includes(action);
      if (needsUrl && !otherInputs.url) {
        throw new Error('URL is required for the selected action');
      }
      if (action === 'scrapeUrl' && !otherInputs.selector) {
        throw new Error('CSS Selector is required for Scrape URL action');
      }
      if (action === 'runBqlQuery' && !otherInputs.bqlQuery) {
        throw new Error('BQL Query is required for Run BQL Query action');
      }

      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('browserless-proxy', {
        body: {
          apiKey,
          action,
          ...otherInputs
        }
      });

      if (error) {
        throw new Error(`Proxy error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error: any) {
      throw new Error(`Browserless execution failed: ${error.message}`);
    }
  }
};
