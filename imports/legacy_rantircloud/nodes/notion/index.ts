import { NodePlugin } from '@/types/node-plugin';

export const notionNode: NodePlugin = {
  type: 'notion',
  name: 'Notion',
  description: 'Create and manage Notion pages and databases',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/notion.png',
  color: '#000000',
  inputs: [
    {
      name: 'accessToken',
      label: 'Access Token',
      type: 'text',
      required: true,
      description: 'Notion integration access token',
      placeholder: 'secret_...',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Database Item', value: 'createDatabaseItem' },
        { label: 'Update Database Item', value: 'updateDatabaseItem' },
        { label: 'Find Database Item', value: 'findDatabaseItem' },
        { label: 'Create Page', value: 'createPage' },
        { label: 'Append to Page', value: 'appendToPage' },
        { label: 'Get Page or Block Children', value: 'getPageOrBlockChildren' },
        { label: 'Archive Database Item', value: 'archiveDatabaseItem' },
        { label: 'Restore Database Item', value: 'restoreDatabaseItem' },
        { label: 'Add Comment', value: 'addComment' },
        { label: 'Retrieve Database', value: 'retrieveDatabase' },
        { label: 'Get Page Comments', value: 'getPageComments' },
        { label: 'Find Page', value: 'findPage' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'Select the Notion action to perform',
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const { action } = currentInputs;
    const inputs: any[] = [];

    if (action === 'createDatabaseItem' || action === 'updateDatabaseItem') {
      inputs.push(
        { name: 'databaseId', label: 'Database ID', type: 'text', required: true, placeholder: 'Database ID' },
        { name: 'properties', label: 'Properties', type: 'textarea', required: true, placeholder: 'JSON properties' }
      );
      if (action === 'updateDatabaseItem') {
        inputs.push({ name: 'pageId', label: 'Page ID', type: 'text', required: true, placeholder: 'Page ID to update' });
      }
    } else if (action === 'findDatabaseItem') {
      inputs.push(
        { name: 'databaseId', label: 'Database ID', type: 'text', required: true, placeholder: 'Database ID' },
        { name: 'filter', label: 'Filter', type: 'textarea', required: false, placeholder: 'JSON filter' }
      );
    } else if (action === 'createPage') {
      inputs.push(
        { name: 'parentType', label: 'Parent Type', type: 'select', required: true, options: [
          { label: 'Database', value: 'database' },
          { label: 'Page', value: 'page' },
        ], description: 'Is the parent a database or a page?' },
        { name: 'parentId', label: 'Parent ID', type: 'text', required: true, placeholder: 'Parent page or database ID' },
        { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Page title' },
        { name: 'content', label: 'Content', type: 'textarea', required: false, placeholder: 'Page content' }
      );
    } else if (action === 'appendToPage') {
      inputs.push(
        { name: 'pageId', label: 'Page ID', type: 'text', required: true, placeholder: 'Page ID' },
        { name: 'content', label: 'Content', type: 'textarea', required: true, placeholder: 'Content to append' }
      );
    } else if (action === 'getPageOrBlockChildren') {
      inputs.push(
        { name: 'blockId', label: 'Block/Page ID', type: 'text', required: true, placeholder: 'Block or Page ID' }
      );
    } else if (action === 'archiveDatabaseItem' || action === 'restoreDatabaseItem') {
      inputs.push(
        { name: 'pageId', label: 'Page ID', type: 'text', required: true, placeholder: 'Database item page ID' }
      );
    } else if (action === 'addComment') {
      inputs.push(
        { name: 'pageId', label: 'Page ID', type: 'text', required: true, placeholder: 'Page ID' },
        { name: 'comment', label: 'Comment', type: 'textarea', required: true, placeholder: 'Your comment' }
      );
    } else if (action === 'retrieveDatabase') {
      inputs.push(
        { name: 'databaseId', label: 'Database ID', type: 'text', required: true, placeholder: 'Database ID' }
      );
    } else if (action === 'getPageComments' || action === 'findPage') {
      inputs.push(
        { name: 'pageId', label: 'Page ID', type: 'text', required: true, placeholder: 'Page ID' }
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'Endpoint', type: 'text', required: true, placeholder: '/v1/pages' },
        { name: 'method', label: 'Method', type: 'select', required: true, options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PATCH', value: 'PATCH' },
        ]},
        { name: 'body', label: 'Request Body', type: 'textarea', required: false, placeholder: 'JSON body' }
      );
    }

    return inputs;
  },
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'Response from Notion API',
    },
    {
      name: 'pageUrl',
      type: 'string',
      description: 'URL of the created/updated page',
    },
  ],
  async execute(inputs, context) {
    const { action, ...params } = inputs;
    
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://appdmmjexevclmpyvtss.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
      );

      const { data, error } = await supabase.functions.invoke('notion-action', {
        body: { action, ...params },
      });

      if (error) throw error;

      return {
        result: data,
        pageUrl: data?.url || '',
      };
    } catch (error) {
      throw new Error(`Notion API error: ${error.message}`);
    }
  },
};
