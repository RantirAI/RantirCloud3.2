import { NodePlugin } from '@/types/node-plugin';

export const airtopNode: NodePlugin = {
  type: 'airtop',
  name: 'Airtop',
  description: 'Automate browser tasks using Airtop AI-powered browser automation',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/airtop.png',
  color: '#6B73FF',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Airtop API key',
      placeholder: 'at_xxxxxxxxxxxx',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Session', value: 'create_session', description: 'Create a new browser session' },
        { label: 'Navigate to URL', value: 'navigate', description: 'Navigate to a specific URL' },
        { label: 'Close Session', value: 'close_session', description: 'Close an existing browser session' },
        { label: 'Create New Browser Window', value: 'create_window', description: 'Create a new browser window' },
        { label: 'Take Screenshot', value: 'take_screenshot', description: 'Take a screenshot of the page' },
        { label: 'Page Query', value: 'page_query', description: 'Query elements on the page' },
        { label: 'Smart Scrape', value: 'smart_scrape', description: 'Intelligently scrape data from the page' },
        { label: 'Paginated Extraction', value: 'paginated_extraction', description: 'Extract data across multiple pages' },
        { label: 'Click', value: 'click', description: 'Click on an element' },
        { label: 'Type', value: 'type', description: 'Type text into an input field' },
        { label: 'Upload File to Sessions', value: 'upload_file', description: 'Upload a file to the session' },
        { label: 'Hover on an Element', value: 'hover', description: 'Hover over an element' },
        { label: 'Custom API Call', value: 'custom_api', description: 'Make a custom API call' },
      ],
      description: 'Choose the browser automation action',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    // Base Profile ID - optional for create_session action
    if (action === 'create_session') {
      dynamicInputs.push({
        name: 'profileName',
        label: 'Base Profile ID (optional)',
        type: 'text',
        required: false,
        description: 'UUID of an existing profile to use as base. Leave empty to create a fresh profile.',
        placeholder: 'e.g., 12345678-1234-5678-9abc-123456789012',
      });
    }

    // URL - required for navigate action
    if (action === 'navigate') {
      dynamicInputs.push({
        name: 'url',
        label: 'URL',
        type: 'text',
        required: true,
        description: 'The URL to navigate to',
        placeholder: 'https://example.com',
      });
    }

    // Session ID - required for all actions except create_session
    if (action && action !== 'create_session') {
      dynamicInputs.push({
        name: 'sessionId',
        label: 'Session ID',
        type: 'text',
        required: true,
        description: 'The browser session ID',
        placeholder: 'session_xxxxxxxxxxxx',
      });
    }

    // Window ID - required for most window interactions
    if (['click', 'type', 'hover', 'page_query', 'smart_scrape', 'paginated_extraction', 'take_screenshot'].includes(action)) {
      dynamicInputs.push({
        name: 'windowId',
        label: 'Window ID',
        type: 'text',
        required: true,
        description: 'The browser window ID for the selected session',
        placeholder: 'window_xxxxxxxxxxxx',
      });
    }

    // Selector - required for click, type, hover, page_query actions
    if (['click', 'type', 'hover', 'page_query'].includes(action)) {
      dynamicInputs.push({
        name: 'selector',
        label: 'CSS Selector',
        type: 'text',
        required: true,
        description: 'CSS selector for the target element',
        placeholder: '#submit-button, .form-input, [data-test="element"]',
      });
    }

    // Text - required for type action
    if (action === 'type') {
      dynamicInputs.push({
        name: 'text',
        label: 'Text to Type',
        type: 'text',
        required: true,
        description: 'The text to type into the element',
        placeholder: 'Hello, World!',
      });
    }

    // File upload - for upload_file action
    if (action === 'upload_file') {
      dynamicInputs.push({
        name: 'filePath',
        label: 'File Path',
        type: 'text',
        required: true,
        description: 'Path to the file to upload',
        placeholder: '/path/to/file.pdf',
      });
    }

    // Query parameters - for page_query action
    if (action === 'page_query') {
      dynamicInputs.push({
        name: 'query',
        label: 'Query',
        type: 'text',
        required: true,
        description: 'The query to execute on the page',
        placeholder: 'Find all buttons',
      });
    }

    // Scraping configuration - for smart_scrape action
    if (action === 'smart_scrape') {
      dynamicInputs.push({
        name: 'scrapeConfig',
        label: 'Scrape Configuration',
        type: 'code',
        language: 'json',
        required: true,
        description: 'JSON configuration for smart scraping',
        placeholder: '{\n  "target": "product data",\n  "fields": ["title", "price", "description"]\n}',
      });
    }

    // Pagination configuration - for paginated_extraction action
    if (action === 'paginated_extraction') {
      dynamicInputs.push({
        name: 'paginationConfig',
        label: 'Pagination Configuration',
        type: 'code',
        language: 'json',
        required: true,
        description: 'JSON configuration for pagination',
        placeholder: '{\n  "nextSelector": ".next-page",\n  "maxPages": 10\n}',
      });
    }

    // Custom API configuration - for custom_api action
    if (action === 'custom_api') {
      dynamicInputs.push({
        name: 'apiEndpoint',
        label: 'API Endpoint',
        type: 'text',
        required: true,
        description: 'The custom API endpoint to call',
        placeholder: '/api/custom-action',
      },
      {
        name: 'apiPayload',
        label: 'API Payload',
        type: 'code',
        language: 'json',
        required: false,
        description: 'JSON payload for the API call',
        placeholder: '{\n  "param1": "value1",\n  "param2": "value2"\n}',
      });
    }

    return dynamicInputs;
  },
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful',
    },
    {
      name: 'sessionId',
      type: 'string',
      description: 'Browser session ID (for create_session)',
    },
    {
      name: 'extractedData',
      type: 'object',
      description: 'Extracted data from the page (for extract action)',
    },
    {
      name: 'screenshotUrl',
      type: 'string',
      description: 'URL of the screenshot (for screenshot action)',
    },
    {
      name: 'data',
      type: 'object',
      description: 'Raw response data from Airtop',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs, context) {
    const { 
      action, apiKey, sessionId, url, selector, text, fields, profileName,
      query, scrapeConfig, paginationConfig, filePath, apiEndpoint, apiPayload, windowId
    } = inputs;

    if (!apiKey) {
      throw new Error('Airtop API key is required');
    }

    try {
      let parsedFields = null;
      if (fields) {
        try {
          parsedFields = JSON.parse(fields);
        } catch (e) {
          throw new Error('Fields must be valid JSON');
        }
      }

      const requestData = {
        action,
        apiKey,
        sessionId,
        url,
        selector,
        text,
        fields: parsedFields,
        profileName,
        query,
        scrapeConfig,
        paginationConfig,
        filePath,
        apiEndpoint,
        apiPayload,
        windowId,
      };

      // Get Supabase client for authentication
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required. Please sign in to use Airtop integration.');
      }

      const response = await fetch(`https://appdmmjexevclmpyvtss.supabase.co/functions/v1/airtop-proxy`, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(requestData),
    });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      return {
        success: true,
        sessionId: result.sessionId,
        extractedData: result.extractedData,
        screenshotUrl: result.screenshotUrl,
        data: result.data,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        sessionId: null,
        extractedData: null,
        screenshotUrl: null,
        data: null,
        error: error.message,
      };
    }
  },
};