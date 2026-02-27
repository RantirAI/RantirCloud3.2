import { NodePlugin } from '@/types/node-plugin';

export const helpscoutNode: NodePlugin = {
  type: 'helpscout',
  name: 'Help Scout',
  description: 'Customer support platform - manage conversations, customers, and mailboxes',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/help-scout.png',
  color: '#1292EE',
  inputs: [
    {
      name: 'clientId',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: 'e.g. abc123def456',
      isApiKey: true,
    },
    {
      name: 'clientSecret',
      label: 'Client Secret',
      type: 'text',
      required: true,
      placeholder: 'e.g. xyz789secret',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Conversation', value: 'createConversation', description: 'Create a new conversation' },
        { label: 'Send Reply', value: 'sendReply', description: 'Send a reply to a conversation' },
        { label: 'Add Note', value: 'addNote', description: 'Add a note to a conversation' },
        { label: 'Create Customer', value: 'createCustomer', description: 'Create a new customer' },
        { label: 'Update Customer Properties', value: 'updateCustomerProperties', description: 'Update properties of an existing customer' },
        { label: 'Find Conversation', value: 'findConversation', description: 'Find a conversation by ID or query' },
        { label: 'Find Customer', value: 'findCustomer', description: 'Find a customer by email or ID' },
        { label: 'Find User', value: 'findUser', description: 'Find a Help Scout user' },
        { label: 'Custom API Call', value: 'createCustomApiCall', description: 'Make a custom Help Scout API request' },
      ],
      description: 'Select the Help Scout action to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const { action } = currentInputs;
    const inputs: any[] = [];

    if (action === 'createConversation') {
      inputs.push(
        { name: 'mailboxId', label: 'Mailbox ID', type: 'text', required: true, placeholder: 'e.g. 12345' },
        { name: 'customerEmail', label: 'Customer Email', type: 'text', required: true, placeholder: 'customer@example.com' },
        { name: 'subject', label: 'Subject', type: 'text', required: true, placeholder: 'Support request' },
        { name: 'text', label: 'Message Body', type: 'textarea', required: true, placeholder: 'Hello, I need help with...' },
        { name: 'status', label: 'Status', type: 'select', required: false, default: 'active', options: [
          { label: 'Active', value: 'active' },
          { label: 'Pending', value: 'pending' },
          { label: 'Closed', value: 'closed' },
        ]},
      );
    } else if (action === 'sendReply') {
      inputs.push(
        { name: 'conversationId', label: 'Conversation ID', type: 'text', required: true, placeholder: '12345' },
        { name: 'customerId', label: 'Customer ID', type: 'text', required: true, placeholder: 'e.g. 12345' },
        { name: 'text', label: 'Reply Message', type: 'textarea', required: true, placeholder: 'Thank you for reaching out...' },
      );
    } else if (action === 'addNote') {
      inputs.push(
        { name: 'conversationId', label: 'Conversation ID', type: 'text', required: true, placeholder: '12345' },
        { name: 'text', label: 'Note', type: 'textarea', required: true, placeholder: 'Internal note...' },
      );
    } else if (action === 'createCustomer') {
      inputs.push(
        { name: 'firstName', label: 'First Name', type: 'text', required: true, placeholder: 'e.g. John' },
        { name: 'lastName', label: 'Last Name', type: 'text', required: false, placeholder: 'e.g. Doe' },
        { name: 'email', label: 'Email', type: 'text', required: true, placeholder: 'customer@example.com' },
      );
    } else if (action === 'updateCustomerProperties') {
      inputs.push(
        { name: 'customerId', label: 'Customer ID', type: 'text', required: true, placeholder: '12345' },
        { name: 'firstName', label: 'First Name', type: 'text', required: false, placeholder: 'e.g. John' },
        { name: 'lastName', label: 'Last Name', type: 'text', required: false, placeholder: 'e.g. Doe' },
        { name: 'phone', label: 'Phone', type: 'text', required: false, placeholder: 'e.g. +1234567890' },
        { name: 'company', label: 'Company', type: 'text', required: false, placeholder: 'e.g. Acme Inc' },
        { name: 'jobTitle', label: 'Job Title', type: 'text', required: false, placeholder: 'e.g. Manager' },
      );
    } else if (action === 'findConversation') {
      inputs.push(
        { name: 'conversationId', label: 'Conversation ID', type: 'text', required: false, placeholder: 'e.g. 12345' },
        { name: 'query', label: 'Search Query', type: 'text', required: false, placeholder: 'e.g. keyword' },
        { name: 'mailboxId', label: 'Mailbox ID (optional)', type: 'text', required: false, placeholder: 'e.g. 12345' },
        { name: 'status', label: 'Status Filter', type: 'select', required: false, options: [
          { label: 'All', value: 'all' },
          { label: 'Active', value: 'active' },
          { label: 'Pending', value: 'pending' },
          { label: 'Closed', value: 'closed' },
        ]},
      );
    } else if (action === 'findCustomer') {
      inputs.push(
        { name: 'customerId', label: 'Customer ID', type: 'text', required: false, placeholder: '12345' },
        { name: 'email', label: 'Email', type: 'text', required: false, placeholder: 'customer@example.com' },
      );
    } else if (action === 'findUser') {
      inputs.push(
        { name: 'userId', label: 'User ID', type: 'text', required: false, placeholder: '12345' },
        { name: 'email', label: 'Email', type: 'text', required: false, placeholder: 'user@example.com' },
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'method', label: 'HTTP Method', type: 'select', required: true, options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'PATCH', value: 'PATCH' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'path', label: 'API Path', type: 'text', required: true, placeholder: '/v2/conversations' },
        { name: 'body', label: 'Request Body (JSON)', type: 'textarea', required: false, placeholder: '{}' },
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'result', type: 'object', description: 'Response from Help Scout API' },
    { name: 'status', type: 'string', description: 'Operation status' },
  ],
  async execute(inputs, context) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://appdmmjexevclmpyvtss.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
      );

      const { data, error } = await supabase.functions.invoke('helpscout-proxy', {
        body: inputs,
      });

      if (error) throw error;

      return {
        result: data,
        status: data?.status || 'ok',
      };
    } catch (error: any) {
      throw new Error(`Help Scout API error: ${error.message}`);
    }
  },
};
