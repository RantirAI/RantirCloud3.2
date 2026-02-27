import { NodePlugin } from '@/types/node-plugin';

export const circleNode: NodePlugin = {
  type: 'circle',
  name: 'Circle',
  description: 'Community platform for creators and businesses',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/circle.png',
  color: '#6366F1',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Circle API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Post', value: 'createPost' },
        { label: 'Create Comment', value: 'createComment' },
        { label: 'Add Member to Space', value: 'addMemberToSpace' },
        { label: 'Find Member by Email', value: 'findMemberByEmail' },
        { label: 'Get Post Details', value: 'getPostDetails' },
        { label: 'Get Member Details', value: 'getMemberDetails' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'createPost') {
      inputs.push(
        { name: 'communityId', label: 'Community ID', type: 'text' as const, required: true },
        { name: 'spaceId', label: 'Space ID', type: 'text' as const, required: true },
        { name: 'name', label: 'Post Title', type: 'text' as const, required: true },
        { name: 'body', label: 'Post Body (HTML)', type: 'textarea' as const, required: true },
        { name: 'isDraft', label: 'Save as Draft', type: 'boolean' as const, required: false }
      );
    } else if (action === 'createComment') {
      inputs.push(
        { name: 'communityId', label: 'Community ID', type: 'text' as const, required: true },
        { name: 'postId', label: 'Post ID', type: 'text' as const, required: true },
        { name: 'body', label: 'Comment Body (HTML)', type: 'textarea' as const, required: true }
      );
    } else if (action === 'addMemberToSpace') {
      inputs.push(
        { name: 'communityId', label: 'Community ID', type: 'text' as const, required: true },
        { name: 'spaceId', label: 'Space ID', type: 'text' as const, required: true },
        { name: 'memberId', label: 'Member ID', type: 'text' as const, required: true }
      );
    } else if (action === 'findMemberByEmail') {
      inputs.push(
        { name: 'communityId', label: 'Community ID', type: 'text' as const, required: true },
        { name: 'email', label: 'Email', type: 'text' as const, required: true }
      );
    } else if (action === 'getPostDetails') {
      inputs.push(
        { name: 'communityId', label: 'Community ID', type: 'text' as const, required: true },
        { name: 'postId', label: 'Post ID', type: 'text' as const, required: true }
      );
    } else if (action === 'getMemberDetails') {
      inputs.push(
        { name: 'communityId', label: 'Community ID', type: 'text' as const, required: true },
        { name: 'memberId', label: 'Member ID', type: 'text' as const, required: true }
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true },
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

    const { data, error } = await supabase.functions.invoke('circle-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
