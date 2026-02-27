import { NodePlugin } from '@/types/node-plugin';

export const crispNode: NodePlugin = {
  type: 'crisp',
  name: 'Crisp',
  description: 'Customer messaging platform for support and engagement',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/crisp.png',
  color: '#5E3FDE',
  inputs: [
    {
      name: 'apiId',
      label: 'API Identifier',
      type: 'text',
      required: true,
      description: 'Your Crisp API identifier',
      isApiKey: true,
    },
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Crisp API secret key',
      isApiKey: true,
    },
    {
      name: 'websiteId',
      label: 'Website ID',
      type: 'text',
      required: true,
      description: 'Your Crisp website/workspace ID',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Add Note to Conversation', value: 'addNoteToConversation', description: 'Add a private note to a conversation' },
        { label: 'Create Conversation', value: 'createConversation', description: 'Start a new conversation' },
        { label: 'Create or Update Contact', value: 'createOrUpdateContact', description: 'Create a new contact or update an existing one' },
        { label: 'Update Conversation State', value: 'updateConversationState', description: 'Change conversation state (resolved, pending, etc.)' },
        { label: 'Find Conversation', value: 'findConversation', description: 'Search for a conversation' },
        { label: 'Find User Profile', value: 'findUserProfile', description: 'Find a user profile by email or ID' },
        { label: 'Custom API Call', value: 'createCustomApiCall', description: 'Make a custom API call to Crisp' },
      ],
      description: 'Choose the Crisp operation',
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    if (action === 'addNoteToConversation') {
      dynamicInputs.push(
        {
          name: 'sessionId',
          label: 'Session ID',
          type: 'text',
          required: true,
          description: 'Conversation session ID',
          placeholder: 'session_xxxxxxxx',
        },
        {
          name: 'noteContent',
          label: 'Note Content',
          type: 'textarea',
          required: true,
          description: 'The private note content',
          placeholder: 'Internal note about this conversation...',
        }
      );
    }

    if (action === 'createConversation') {
      dynamicInputs.push(
        {
          name: 'email',
          label: 'Email',
          type: 'text',
          required: false,
          description: 'Contact email address',
          placeholder: 'customer@example.com',
        },
        {
          name: 'nickname',
          label: 'Nickname',
          type: 'text',
          required: false,
          description: 'Contact display name',
          placeholder: 'John Doe',
        }
      );
    }

    if (action === 'createOrUpdateContact') {
      dynamicInputs.push(
        {
          name: 'email',
          label: 'Email',
          type: 'text',
          required: true,
          description: 'Contact email address (used to find or create)',
          placeholder: 'customer@example.com',
        },
        {
          name: 'nickname',
          label: 'Nickname',
          type: 'text',
          required: false,
          description: 'Contact display name',
          placeholder: 'John Doe',
        },
        {
          name: 'contactData',
          label: 'Additional Data (JSON)',
          type: 'code',
          language: 'json',
          required: false,
          description: 'Additional contact data as JSON',
          placeholder: '{\n  "phone": "+1234567890",\n  "company": "Acme Inc"\n}',
        }
      );
    }

    if (action === 'updateConversationState') {
      dynamicInputs.push(
        {
          name: 'sessionId',
          label: 'Session ID',
          type: 'text',
          required: true,
          description: 'Conversation session ID',
          placeholder: 'session_xxxxxxxx',
        },
        {
          name: 'state',
          label: 'State',
          type: 'select',
          required: true,
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Resolved', value: 'resolved' },
            { label: 'Unresolved', value: 'unresolved' },
          ],
          description: 'New conversation state',
        }
      );
    }

    if (action === 'findConversation') {
      dynamicInputs.push(
        {
          name: 'searchQuery',
          label: 'Search Query',
          type: 'text',
          required: false,
          description: 'Search term for conversations',
          placeholder: 'customer@example.com',
        },
        {
          name: 'sessionId',
          label: 'Session ID',
          type: 'text',
          required: false,
          description: 'Specific session ID to find',
          placeholder: 'session_xxxxxxxx',
        }
      );
    }

    if (action === 'findUserProfile') {
      dynamicInputs.push(
        {
          name: 'email',
          label: 'Email',
          type: 'text',
          required: false,
          description: 'User email to search for',
          placeholder: 'customer@example.com',
        },
        {
          name: 'peopleId',
          label: 'People ID',
          type: 'text',
          required: false,
          description: 'User/People ID to look up',
        }
      );
    }

    if (action === 'createCustomApiCall') {
      dynamicInputs.push(
        {
          name: 'method',
          label: 'HTTP Method',
          type: 'select',
          required: true,
          default: 'GET',
          options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'PATCH', value: 'PATCH' },
            { label: 'DELETE', value: 'DELETE' },
          ],
          description: 'HTTP method for the API call',
        },
        {
          name: 'endpoint',
          label: 'Endpoint',
          type: 'text',
          required: true,
          description: 'API endpoint path (e.g., /website/{websiteId}/conversations)',
          placeholder: '/website/{websiteId}/conversations',
        },
        {
          name: 'requestBody',
          label: 'Request Body (JSON)',
          type: 'code',
          language: 'json',
          required: false,
          description: 'Request body for POST/PUT/PATCH requests',
          placeholder: '{\n  "key": "value"\n}',
        }
      );
    }

    return dynamicInputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'sessionId', type: 'string', description: 'Conversation session ID' },
    { name: 'data', type: 'object', description: 'Response data from Crisp' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        'https://appdmmjexevclmpyvtss.supabase.co/functions/v1/crisp-proxy',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(inputs),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        sessionId: result.sessionId,
        data: result.data,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        sessionId: null,
        data: null,
        error: error.message,
      };
    }
  },
};
