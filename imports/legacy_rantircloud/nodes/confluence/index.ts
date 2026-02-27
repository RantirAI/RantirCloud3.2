import { NodePlugin } from '@/types/node-plugin';

export const confluenceNode: NodePlugin = {
  type: 'confluence',
  name: 'Confluence',
  description: 'Atlassian Confluence - Get page content and create pages from templates',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/confluence.png',
  color: '#0052CC',
  inputs: [
    {
      name: 'baseUrl',
      label: 'Confluence URL',
      type: 'text',
      required: true,
      description: 'Your Confluence instance URL (e.g., https://yourcompany.atlassian.net)',
    },
    {
      name: 'email',
      label: 'Email',
      type: 'text',
      required: true,
      description: 'Your Atlassian account email',
    },
    {
      name: 'apiToken',
      label: 'API Token',
      type: 'text',
      required: true,
      description: 'Your Atlassian API token',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Get Page Content', value: 'getPageContent' },
        { label: 'Create Page from Template', value: 'createPageFromTemplate' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'getPageContent') {
      inputs.push(
        { name: 'pageId', label: 'Page ID', type: 'text' as const, required: true, description: 'The ID of the page to retrieve' },
        { name: 'expand', label: 'Expand Fields', type: 'text' as const, required: false, description: 'Fields to expand (e.g., body.storage,version)' }
      );
    } else if (action === 'createPageFromTemplate') {
      inputs.push(
        { name: 'spaceKey', label: 'Space Key', type: 'text' as const, required: true, description: 'The key of the space to create the page in' },
        { name: 'title', label: 'Page Title', type: 'text' as const, required: true, description: 'Title for the new page' },
        { name: 'templateId', label: 'Template ID', type: 'text' as const, required: false, description: 'ID of the template to use (optional)' },
        { name: 'content', label: 'Page Content (HTML/Storage)', type: 'textarea' as const, required: true, description: 'Page content in Confluence storage format' },
        { name: 'parentId', label: 'Parent Page ID', type: 'text' as const, required: false, description: 'Optional parent page for hierarchy' }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data from Confluence' },
    { name: 'page', type: 'object', description: 'Page details' },
    { name: 'content', type: 'string', description: 'Page content' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { supabase } = await import('@/integrations/supabase/client');

    const { data, error } = await supabase.functions.invoke('confluence-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
