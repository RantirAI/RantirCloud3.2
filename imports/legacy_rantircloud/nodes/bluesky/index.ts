import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';

export const blueskyNode: NodePlugin = {
  type: 'bluesky',
  name: 'Bluesky',
  description: 'Post and interact with Bluesky social network',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/bluesky.png',
  color: '#1185FE',
  inputs: [
    {
      name: 'identifier',
      label: 'Identifier',
      type: 'text',
      required: true,
      description: 'Your Bluesky handle or email',
      placeholder: 'username.bsky.social',
    },
    {
      name: 'password',
      label: 'App Password',
      type: 'text',
      required: true,
      description: 'Your Bluesky app password',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Post', value: 'createPost' },
        { label: 'Like Post', value: 'likePost' },
        { label: 'Repost Post', value: 'repostPost' },
        { label: 'Find Post', value: 'findPost' },
        { label: 'Find Thread', value: 'findThread' },
      ],
      description: 'Action to perform',
    },
    {
      name: 'text',
      label: 'Post Text',
      type: 'textarea',
      description: 'Content of the post',
      showWhen: {
        field: 'action',
        values: ['createPost']
      }
    },
    {
      name: 'postUri',
      label: 'Post URI',
      type: 'text',
      description: 'URI of the post',
      showWhen: {
        field: 'action',
        values: ['likePost', 'repostPost', 'findPost', 'findThread']
      }
    },
    {
      name: 'replyTo',
      label: 'Reply To',
      type: 'code',
      language: 'json',
      description: 'Reply reference object',
      showWhen: {
        field: 'action',
        values: ['createPost']
      }
    },
  ],
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'Bluesky API response',
    },
  ],
  async execute(inputs) {
    const { data, error } = await supabase.functions.invoke('bluesky-action', {
      body: inputs,
    });

    if (error) throw error;
    return { result: data };
  },
};
