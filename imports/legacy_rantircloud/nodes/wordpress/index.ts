import { NodePlugin } from '@/types/node-plugin';
import { FileText } from 'lucide-react';

export const wordpressNode: NodePlugin = {
  type: 'wordpress',
  name: 'WordPress',
  description: 'Create, update, and manage WordPress posts and pages via REST API',
  category: 'action',
  icon: FileText,
  color: '#21759B',
  inputs: [
    {
      name: 'siteUrl',
      label: 'Site URL',
      type: 'text',
      required: true,
      description: 'Your WordPress site URL (e.g., https://example.com)'
    },
    {
      name: 'username',
      label: 'Username',
      type: 'text',
      required: true,
      description: 'WordPress username'
    },
    {
      name: 'password',
      label: 'Application Password',
      type: 'text',
      required: true,
      description: 'WordPress application password (not your login password)'
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Post', value: 'createWordPressPost' },
        { label: 'Create Page', value: 'createWordPressPage' },
        { label: 'Update Post', value: 'updateWordPressPost' },
        { label: 'Get Post(s)', value: 'getWordPressPost' },
        { label: 'Custom API Call', value: 'customApiCall' }
      ],
      description: 'Choose the WordPress operation to perform'
    }
  ],
  getDynamicInputs: (currentInputs) => {
    const dynamicInputs = [];
    const action = currentInputs.action;

    switch (action) {
      case 'createWordPressPost':
        dynamicInputs.push(
          { name: 'title', label: 'Title', type: 'text', required: true },
          { name: 'content', label: 'Content', type: 'textarea', required: true },
          { name: 'status', label: 'Status', type: 'select', options: [
            { label: 'Draft', value: 'draft' },
            { label: 'Publish', value: 'publish' },
            { label: 'Private', value: 'private' }
          ]},
          { name: 'excerpt', label: 'Excerpt', type: 'textarea' }
        );
        break;
      case 'createWordPressPage':
        dynamicInputs.push(
          { name: 'title', label: 'Title', type: 'text', required: true },
          { name: 'content', label: 'Content', type: 'textarea', required: true },
          { name: 'status', label: 'Status', type: 'select', options: [
            { label: 'Draft', value: 'draft' },
            { label: 'Publish', value: 'publish' },
            { label: 'Private', value: 'private' }
          ]}
        );
        break;
      case 'customApiCall':
        dynamicInputs.push(
          { name: 'method', label: 'HTTP Method', type: 'select', required: true, options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'DELETE', value: 'DELETE' }
          ]},
          { name: 'endpoint', label: 'Endpoint', type: 'text', required: true },
          { name: 'body', label: 'Request Body (JSON)', type: 'textarea' },
          { name: 'queryParams', label: 'Query Parameters (JSON)', type: 'textarea' }
        );
        break;
    }

    return dynamicInputs;
  },
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'The result of the WordPress operation'
    },
    {
      name: 'postId',
      type: 'string',
      description: 'ID of the created/updated post'
    },
    {
      name: 'postUrl',
      type: 'string',
      description: 'Public URL of the post/page'
    },
    {
      name: 'editUrl',
      type: 'string',
      description: 'Admin edit URL for the post/page'
    }
  ],
  async execute(inputs, context) {
    const { supabase } = await import('@/integrations/supabase/client');
    
    try {
      const { data, error } = await supabase.functions.invoke('wordpress-proxy', {
        body: inputs
      });

      if (error) {
        throw new Error(`WordPress proxy error: ${error.message}`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      throw new Error(`WordPress operation failed: ${error.message}`);
    }
  }
};