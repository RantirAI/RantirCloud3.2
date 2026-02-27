import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';

export const bettermodeNode: NodePlugin = {
  type: 'bettermode',
  name: 'Bettermode',
  description: 'Interact with Bettermode community platform',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/bettermode.png',
  color: '#7C3AED',
  inputs: [
    {
      name: 'accessToken',
      label: 'Access Token',
      type: 'text',
      required: true,
      description: 'Your Bettermode app access token',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Discussion Post', value: 'createDiscussion' },
        { label: 'Create Question Post', value: 'createQuestion' },
        { label: 'Assign Badge to Member', value: 'assignBadge' },
        { label: 'Revoke Badge from Member', value: 'revokeBadge' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'Action to perform',
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const inputs: any[] = [];

    if (currentInputs.action === 'createDiscussion' || currentInputs.action === 'createQuestion') {
      inputs.push(
        {
          name: 'spaceId',
          label: 'Space ID',
          type: 'text',
          required: true,
          description: 'The ID of the space to create the post in',
        },
        {
          name: 'title',
          label: 'Title',
          type: 'text',
          required: true,
          description: 'Title of the post',
        },
        {
          name: 'content',
          label: 'Content',
          type: 'textarea',
          required: true,
          description: 'Post content',
        }
      );
    }

    if (currentInputs.action === 'assignBadge' || currentInputs.action === 'revokeBadge') {
      inputs.push(
        {
          name: 'memberId',
          label: 'Member ID',
          type: 'text',
          required: true,
          description: 'The ID of the member',
        },
        {
          name: 'badgeId',
          label: 'Badge ID',
          type: 'text',
          required: true,
          description: 'The ID of the badge',
        }
      );
    }

    if (currentInputs.action === 'createCustomApiCall') {
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
          description: 'HTTP method for the request',
        },
        {
          name: 'body',
          label: 'Request Body',
          type: 'code',
          language: 'json',
          description: 'Request body in JSON format (optional for GET)',
        }
      );
    }

    return inputs;
  },
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'API response data',
    },
  ],
  async execute(inputs) {
    const { data, error } = await supabase.functions.invoke('bettermode-action', {
      body: inputs,
    });

    if (error) throw error;
    return { result: data };
  },
};
