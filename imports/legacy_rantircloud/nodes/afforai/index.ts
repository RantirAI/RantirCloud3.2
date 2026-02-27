import { NodePlugin } from '@/types/node-plugin';

// Helper function to resolve variables
const resolveVariable = (variableBinding: string): string => {
  if (typeof variableBinding !== 'string') {
    return variableBinding;
  }

  // Handle environment variables
  if (variableBinding.startsWith('env.')) {
    const envKey = variableBinding.replace('env.', '');
    const envVars = JSON.parse(localStorage.getItem('flow-env-vars') || '{}');
    return envVars[envKey] || '';
  }

  // Handle flow variables
  const flowId = window.location.pathname.split('/').pop();
  if (flowId) {
    const flowVariables = JSON.parse(localStorage.getItem(`flow-variables-${flowId}`) || '{}');
    return flowVariables[variableBinding] || variableBinding;
  }

  return variableBinding;
};

export const afforaiNode: NodePlugin = {
  type: 'afforai',
  name: 'Afforai',
  description: 'Connect to Afforai AI research assistant for document analysis, question answering, and knowledge extraction',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/afforai.png',
  color: '#8B5CF6',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Afforai API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Ask Chatbot', value: 'ask_chatbot', description: 'Ask a question to the Afforai chatbot' },
      ],
      description: 'Choose the Afforai action to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    switch (action) {
      case 'ask_chatbot':
        dynamicInputs.push(
          {
            name: 'question',
            label: 'Question',
            type: 'textarea',
            required: true,
            description: 'The question to ask the Afforai chatbot',
            placeholder: 'What are the main findings in this research paper?',
          },
          {
            name: 'chatbotId',
            label: 'Chatbot ID',
            type: 'text',
            required: false,
            description: 'ID of the specific chatbot to query (optional)',
          },
          {
            name: 'maxTokens',
            label: 'Max Tokens',
            type: 'number',
            required: false,
            description: 'Maximum number of tokens in response',
            default: 500,
          }
        );
        break;
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
      name: 'data',
      type: 'object',
      description: 'The response data from Afforai',
    },
    {
      name: 'answer',
      type: 'string',
      description: 'AI-generated answer (for ask_question action)',
    },
    {
      name: 'documents',
      type: 'array',
      description: 'List of documents (for list_documents action)',
    },
    {
      name: 'documentId',
      type: 'string',
      description: 'ID of uploaded document',
    },
    {
      name: 'chatSessionId',
      type: 'string',
      description: 'ID of created chat session',
    },
    {
      name: 'summary',
      type: 'string',
      description: 'Document summary (for summarize_document action)',
    },
    {
      name: 'keyPoints',
      type: 'array',
      description: 'Extracted key points (for extract_key_points action)',
    },
    {
      name: 'translatedText',
      type: 'string',
      description: 'Translated text (for translate_text action)',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs, context) {
    const { apiKey, action, ...actionInputs } = inputs;

    // Resolve variables
    const resolvedApiKey = resolveVariable(apiKey);
    const resolvedInputs = Object.fromEntries(
      Object.entries(actionInputs).map(([key, value]) => [
        key,
        typeof value === 'string' ? resolveVariable(value) : value
      ])
    );

    if (!resolvedApiKey) {
      throw new Error('Afforai API key is required');
    }

    try {
      const baseUrl = 'https://api.afforai.com/v1';
      let endpoint = '';
      let method = 'GET';
      let requestBody = null;

      switch (action) {
        case 'ask_chatbot':
          endpoint = '/chat/ask';
          method = 'POST';
          requestBody = {
            question: resolvedInputs.question,
            max_tokens: resolvedInputs.maxTokens || 500,
          };
          if (resolvedInputs.chatbotId) {
            requestBody.chatbot_id = resolvedInputs.chatbotId;
          }
          break;

        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      // Use Supabase proxy function for Afforai API calls
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('afforai-proxy', {
        body: {
          apiKey: resolvedApiKey,
          action,
          ...resolvedInputs
        }
      });

      if (error) {
        throw new Error(`Afforai proxy error: ${error.message}`);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        data: null,
        answer: null,
        documents: null,
        documentId: null,
        chatSessionId: null,
        summary: null,
        keyPoints: null,
        translatedText: null,
        error: error.message,
      };
    }
  },
};