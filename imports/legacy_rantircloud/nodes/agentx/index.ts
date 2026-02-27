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

export const agentxNode: NodePlugin = {
  type: 'agentx',
  name: 'AgentX',
  description: 'Advanced AI agent with extended capabilities for complex task execution',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/agentx.png',
  color: '#6366F1',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your AgentX API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Search Agents', value: 'search_agents', description: 'Search for available agents' },
        { label: 'Create Conversation With Single Agent', value: 'create_conversation', description: 'Start a new conversation with an agent' },
        { label: 'Send Message to Existing Conversation', value: 'send_message', description: 'Send a message to an ongoing conversation' },
        { label: 'Find Message', value: 'find_message', description: 'Find a specific message' },
        { label: 'Find Conversation', value: 'find_conversation', description: 'Find a specific conversation' }
      ],
      description: 'Select the AgentX action to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    switch (action) {
      case 'search_agents':
        dynamicInputs.push(
          {
            name: 'query',
            label: 'Search Query',
            type: 'text',
            required: false,
            description: 'Search query to find specific agents',
            placeholder: 'customer service, sales, analytics',
          },
          {
            name: 'category',
            label: 'Category',
            type: 'text',
            required: false,
            description: 'Filter agents by category',
          },
          {
            name: 'limit',
            label: 'Limit',
            type: 'number',
            required: false,
            description: 'Maximum number of agents to return',
            default: 10,
          }
        );
        break;

      case 'create_conversation':
        dynamicInputs.push(
          {
            name: 'agentId',
            label: 'Agent ID',
            type: 'text',
            required: true,
            description: 'ID of the agent to start conversation with',
          },
          {
            name: 'initialMessage',
            label: 'Initial Message',
            type: 'textarea',
            required: true,
            description: 'The first message to send to the agent',
            placeholder: 'Hello, I need help with...',
          },
          {
            name: 'context',
            label: 'Context',
            type: 'code',
            language: 'json',
            required: false,
            description: 'Additional context for the conversation',
          }
        );
        break;

      case 'send_message':
        dynamicInputs.push(
          {
            name: 'conversationId',
            label: 'Conversation ID',
            type: 'text',
            required: true,
            description: 'ID of the existing conversation',
          },
          {
            name: 'message',
            label: 'Message',
            type: 'textarea',
            required: true,
            description: 'Message to send to the agent',
            placeholder: 'Can you help me with...',
          },
          {
            name: 'attachments',
            label: 'Attachments',
            type: 'code',
            language: 'json',
            required: false,
            description: 'Any file attachments or additional data',
          }
        );
        break;

      case 'find_message':
        dynamicInputs.push(
          {
            name: 'conversationId',
            label: 'Conversation ID',
            type: 'text',
            required: false,
            description: 'ID of the conversation to search within',
          },
          {
            name: 'messageId',
            label: 'Message ID',
            type: 'text',
            required: false,
            description: 'Specific message ID to find',
          },
          {
            name: 'searchQuery',
            label: 'Search Query',
            type: 'text',
            required: false,
            description: 'Text to search for in messages',
          },
          {
            name: 'fromDate',
            label: 'From Date',
            type: 'text',
            required: false,
            description: 'Start date for message search (YYYY-MM-DD)',
            placeholder: '2024-01-01',
          }
        );
        break;

      case 'find_conversation':
        dynamicInputs.push(
          {
            name: 'conversationId',
            label: 'Conversation ID',
            type: 'text',
            required: false,
            description: 'Specific conversation ID to find',
          },
          {
            name: 'agentId',
            label: 'Agent ID',
            type: 'text',
            required: false,
            description: 'Find conversations with specific agent',
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            required: false,
            options: [
              { label: 'Active', value: 'active' },
              { label: 'Completed', value: 'completed' },
              { label: 'Pending', value: 'pending' },
              { label: 'Archived', value: 'archived' },
            ],
            description: 'Filter by conversation status',
          },
          {
            name: 'limit',
            label: 'Limit',
            type: 'number',
            required: false,
            description: 'Maximum number of conversations to return',
            default: 20,
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
      description: 'The response data from AgentX',
    },
    {
      name: 'agents',
      type: 'array',
      description: 'List of agents (for search_agents action)',
    },
    {
      name: 'conversationId',
      type: 'string',
      description: 'ID of the conversation',
    },
    {
      name: 'messageId',
      type: 'string',
      description: 'ID of the message',
    },
    {
      name: 'response',
      type: 'string',
      description: 'Agent response message',
    },
    {
      name: 'messages',
      type: 'array',
      description: 'List of messages (for find_message action)',
    },
    {
      name: 'conversations',
      type: 'array',
      description: 'List of conversations (for find_conversation action)',
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
      throw new Error('AgentX API key is required');
    }

    try {
      const baseUrl = 'https://api.agentx.com/v1';
      let endpoint = '';
      let method = 'GET';
      let requestBody = null;

      switch (action) {
        case 'search_agents':
          endpoint = '/agents/search';
          const searchParams = new URLSearchParams();
          if (resolvedInputs.query) searchParams.append('query', resolvedInputs.query);
          if (resolvedInputs.category) searchParams.append('category', resolvedInputs.category);
          if (resolvedInputs.limit) searchParams.append('limit', resolvedInputs.limit.toString());
          if (searchParams.toString()) endpoint += `?${searchParams.toString()}`;
          break;

        case 'create_conversation':
          endpoint = '/conversations';
          method = 'POST';
          requestBody = {
            agent_id: resolvedInputs.agentId,
            initial_message: resolvedInputs.initialMessage,
          };
          if (resolvedInputs.context) {
            try {
              requestBody.context = JSON.parse(resolvedInputs.context);
            } catch (e) {
              throw new Error('Invalid JSON in context field');
            }
          }
          break;

        case 'send_message':
          endpoint = `/conversations/${resolvedInputs.conversationId}/messages`;
          method = 'POST';
          requestBody = {
            message: resolvedInputs.message,
          };
          if (resolvedInputs.attachments) {
            try {
              requestBody.attachments = JSON.parse(resolvedInputs.attachments);
            } catch (e) {
              throw new Error('Invalid JSON in attachments field');
            }
          }
          break;

        case 'find_message':
          endpoint = '/messages/search';
          const messageParams = new URLSearchParams();
          if (resolvedInputs.conversationId) messageParams.append('conversation_id', resolvedInputs.conversationId);
          if (resolvedInputs.messageId) messageParams.append('message_id', resolvedInputs.messageId);
          if (resolvedInputs.searchQuery) messageParams.append('query', resolvedInputs.searchQuery);
          if (resolvedInputs.fromDate) messageParams.append('from_date', resolvedInputs.fromDate);
          if (messageParams.toString()) endpoint += `?${messageParams.toString()}`;
          break;

        case 'find_conversation':
          endpoint = '/conversations/search';
          const convParams = new URLSearchParams();
          if (resolvedInputs.conversationId) convParams.append('conversation_id', resolvedInputs.conversationId);
          if (resolvedInputs.agentId) convParams.append('agent_id', resolvedInputs.agentId);
          if (resolvedInputs.status) convParams.append('status', resolvedInputs.status);
          if (resolvedInputs.limit) convParams.append('limit', resolvedInputs.limit.toString());
          if (convParams.toString()) endpoint += `?${convParams.toString()}`;
          break;

        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      // Use Supabase proxy function for AgentX API calls
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('agentx-proxy', {
        body: {
          apiKey: resolvedApiKey,
          action,
          ...resolvedInputs
        }
      });

      if (error) {
        throw new Error(`AgentX proxy error: ${error.message}`);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        data: null,
        agents: null,
        conversationId: null,
        messageId: null,
        response: null,
        messages: null,
        conversations: null,
        error: error.message,
      };
    }
  }
};