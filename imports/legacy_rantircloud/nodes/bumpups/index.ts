import { NodePlugin } from '@/types/node-plugin';

export const bumpupsNode: NodePlugin = {
  type: 'bumpups',
  name: 'BumpUps',
  description: 'AI-powered content creation and chat for creators',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/bumpups.png',
  color: '#FF4081',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'BumpUps API key',
      placeholder: 'your-api-key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Generate Creator Description', value: 'generateCreatorDescription' },
        { label: 'Generate Creator Hashtags', value: 'generateCreatorHashtags' },
        { label: 'Generate Creator Takeaways', value: 'generateCreatorTakeaways' },
        { label: 'Generate Creator Titles', value: 'generateCreatorTitles' },
        { label: 'Generate Timestamps', value: 'generateTimestamps' },
        { label: 'Send Chat', value: 'sendChat' },
        { label: 'Create Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'Action to perform',
      dependsOnApiKey: true,
    },
    {
      name: 'videoUrl',
      label: 'YouTube Video URL',
      type: 'text',
      required: false,
      description: 'YouTube video URL to extract content from',
      placeholder: 'https://www.youtube.com/watch?v=...',
      showWhen: {
        field: 'action',
        values: ['generateCreatorDescription', 'generateCreatorHashtags', 'generateCreatorTakeaways', 'generateCreatorTitles', 'generateTimestamps', 'sendChat']
      }
    },
    {
      name: 'message',
      label: 'Message',
      type: 'textarea',
      required: false,
      description: 'Message or query about the video (max 500 characters)',
      placeholder: 'What would you like to know about this video?',
      showWhen: {
        field: 'action',
        values: ['sendChat']
      }
    },
    {
      name: 'conversationId',
      label: 'Conversation ID',
      type: 'text',
      required: false,
      description: 'Conversation ID to continue a chat session',
      placeholder: 'conversation-id',
      showWhen: {
        field: 'action',
        values: ['sendChat']
      }
    },
    {
      name: 'numberOfItems',
      label: 'Number of Items',
      type: 'number',
      required: false,
      default: 5,
      description: 'Number of items to generate',
      placeholder: '5',
      showWhen: {
        field: 'action',
        values: ['generateCreatorHashtags', 'generateCreatorTitles', 'generateCreatorTakeaways']
      }
    },
    {
      name: 'method',
      label: 'HTTP Method',
      type: 'select',
      required: false,
      default: 'POST',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
      ],
      description: 'HTTP method for the API call',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
      }
    },
    {
      name: 'endpoint',
      label: 'API Endpoint',
      type: 'text',
      required: false,
      description: 'BumpUps API endpoint',
      placeholder: '/api/v1/generate',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
      }
    },
    {
      name: 'body',
      label: 'Request Body',
      type: 'code',
      language: 'json',
      required: false,
      placeholder: '{\n  "content": "Your content here"\n}',
      description: 'Request body for POST/PUT requests',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
      }
    },
  ],
  outputs: [
    {
      name: 'data',
      type: 'object',
      description: 'Operation result data',
    },
    {
      name: 'status',
      type: 'string',
      description: 'Operation status',
    },
    {
      name: 'success',
      type: 'boolean',
      description: 'Success indicator',
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
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('bumpups-proxy', {
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
      throw new Error(`BumpUps execution failed: ${error.message}`);
    }
  }
};
