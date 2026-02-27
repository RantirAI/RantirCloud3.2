import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';

export const beamerNode: NodePlugin = {
  type: 'beamer',
  name: 'Beamer',
  description: 'Manage product updates and changelogs',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/beamer.png',
  color: '#8B5CF6',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Beamer API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Beamer Post', value: 'createBeamerPost' },
        { label: 'Create New Feature Request', value: 'createNewFeatureRequest' },
        { label: 'Create Comment', value: 'createComment' },
        { label: 'Create Vote', value: 'createVote' },
        { label: 'Create Custom API Call', value: 'createCustomApiCall' },
      ],
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const inputs = [];
    
    if (currentInputs.action === 'createBeamerPost') {
      inputs.push(
        {
          name: 'userEmail',
          label: 'User Email',
          type: 'text',
          required: true,
          description: 'Email of the user creating the post',
        },
        {
          name: 'title',
          label: 'Title',
          type: 'text',
          required: true,
          description: 'Post title',
        },
        {
          name: 'content',
          label: 'Content',
          type: 'textarea',
          required: true,
          description: 'Post content (HTML supported)',
        },
        {
          name: 'language',
          label: 'Language',
          type: 'select',
          required: false,
          default: 'EN',
          options: [
            { label: 'English', value: 'EN' },
            { label: 'Spanish', value: 'ES' },
            { label: 'French', value: 'FR' },
            { label: 'German', value: 'DE' },
            { label: 'Italian', value: 'IT' },
          ],
          description: 'Post language',
        },
        {
          name: 'category',
          label: 'Category',
          type: 'select',
          required: false,
          options: [
            { label: 'New', value: 'New' },
            { label: 'Fix', value: 'Fix' },
            { label: 'Coming Soon', value: 'Coming Soon' },
            { label: 'Announcement', value: 'Announcement' },
            { label: 'Improvement', value: 'Improvement' },
          ],
          description: 'Post category',
        }
      );
    } else if (currentInputs.action === 'createNewFeatureRequest') {
      inputs.push(
        {
          name: 'title',
          label: 'Title',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          required: true,
        }
      );
    } else if (currentInputs.action === 'createComment') {
      inputs.push(
        {
          name: 'postId',
          label: 'Post ID',
          type: 'text',
          required: true,
        },
        {
          name: 'comment',
          label: 'Comment',
          type: 'textarea',
          required: true,
        }
      );
    } else if (currentInputs.action === 'createVote') {
      inputs.push(
        {
          name: 'requestId',
          label: 'Request ID',
          type: 'text',
          required: true,
        },
        {
          name: 'userId',
          label: 'User ID',
          type: 'text',
          required: true,
        }
      );
    } else if (currentInputs.action === 'createCustomApiCall') {
      inputs.push(
        {
          name: 'endpoint',
          label: 'Endpoint',
          type: 'text',
          required: true,
          description: 'API endpoint path',
        },
        {
          name: 'method',
          label: 'HTTP Method',
          type: 'select',
          required: true,
          options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'DELETE', value: 'DELETE' },
          ],
        },
        {
          name: 'body',
          label: 'Request Body',
          type: 'code',
          language: 'json',
          required: false,
          description: 'JSON request body',
        }
      );
    }
    
    return inputs;
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
      description: 'Response data from Beamer',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs) {
    const { data, error } = await supabase.functions.invoke('beamer-action', {
      body: inputs,
    });

    if (error) {
      const errorMessage = error.message || JSON.stringify(error);
      throw new Error(`Beamer action failed: ${errorMessage}`);
    }
    
    return data;
  },
};
