import { NodePlugin } from '@/types/node-plugin';

export const clicksendNode: NodePlugin = {
  type: 'clicksend',
  name: 'ClickSend',
  description: 'SMS, email, and voice messaging platform',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/clicksend.png',
  color: '#00A8E8',
  inputs: [
    {
      name: 'username',
      label: 'Username',
      type: 'text',
      required: true,
      description: 'Your ClickSend username',
      isApiKey: true,
    },
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your ClickSend API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Send SMS', value: 'sendSms' },
        { label: 'Send MMS', value: 'sendMms' },
        { label: 'Create Contact', value: 'createContact' },
        { label: 'Update Contact', value: 'updateContact' },
        { label: 'Delete Contact', value: 'deleteContact' },
        { label: 'Create Contact List', value: 'createContactList' },
        { label: 'Find Contact by Email', value: 'findContactByEmail' },
        { label: 'Find Contact by Phone', value: 'findContactByPhone' },
        { label: 'Find Contact List', value: 'findContactList' },
        { label: 'Custom API Call', value: 'customApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'sendSms') {
      inputs.push(
        { name: 'to', label: 'To Phone Number', type: 'text' as const, required: true, description: 'Recipient phone number in E.164 format' },
        { name: 'body', label: 'Message', type: 'textarea' as const, required: true, description: 'SMS message content' },
        { name: 'from', label: 'From (Sender ID)', type: 'text' as const, required: false, description: 'Sender ID or phone number' },
        { name: 'schedule', label: 'Schedule (Unix Timestamp)', type: 'number' as const, required: false }
      );
    } else if (action === 'sendMms') {
      inputs.push(
        { name: 'to', label: 'To Phone Number', type: 'text' as const, required: true },
        { name: 'body', label: 'Message', type: 'textarea' as const, required: true },
        { name: 'mediaUrl', label: 'Media URL', type: 'text' as const, required: true, description: 'URL to the media file' },
        { name: 'subject', label: 'Subject', type: 'text' as const, required: false }
      );
    } else if (action === 'createContact') {
      inputs.push(
        { name: 'listId', label: 'List ID', type: 'text' as const, required: true, description: 'Contact list ID' },
        { name: 'phoneNumber', label: 'Phone Number', type: 'text' as const, required: true },
        { name: 'email', label: 'Email', type: 'text' as const, required: false },
        { name: 'firstName', label: 'First Name', type: 'text' as const, required: false },
        { name: 'lastName', label: 'Last Name', type: 'text' as const, required: false },
        { name: 'customFields', label: 'Custom Fields (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    } else if (action === 'updateContact') {
      inputs.push(
        { name: 'listId', label: 'List ID', type: 'text' as const, required: true },
        { name: 'contactId', label: 'Contact ID', type: 'text' as const, required: true },
        { name: 'phoneNumber', label: 'Phone Number', type: 'text' as const, required: false },
        { name: 'email', label: 'Email', type: 'text' as const, required: false },
        { name: 'firstName', label: 'First Name', type: 'text' as const, required: false },
        { name: 'lastName', label: 'Last Name', type: 'text' as const, required: false }
      );
    } else if (action === 'deleteContact') {
      inputs.push(
        { name: 'listId', label: 'List ID', type: 'text' as const, required: true },
        { name: 'contactId', label: 'Contact ID', type: 'text' as const, required: true }
      );
    } else if (action === 'createContactList') {
      inputs.push(
        { name: 'listName', label: 'List Name', type: 'text' as const, required: true }
      );
    } else if (action === 'findContactByEmail') {
      inputs.push(
        { name: 'listId', label: 'List ID', type: 'text' as const, required: true },
        { name: 'email', label: 'Email', type: 'text' as const, required: true }
      );
    } else if (action === 'findContactByPhone') {
      inputs.push(
        { name: 'listId', label: 'List ID', type: 'text' as const, required: true },
        { name: 'phoneNumber', label: 'Phone Number', type: 'text' as const, required: true }
      );
    } else if (action === 'findContactList') {
      inputs.push(
        { name: 'listName', label: 'List Name (search)', type: 'text' as const, required: false }
      );
    } else if (action === 'customApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true, description: 'Relative endpoint path (e.g., /sms/send)' },
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, default: 'GET', options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('clicksend-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
