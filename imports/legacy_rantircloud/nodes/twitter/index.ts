import { NodePlugin } from '@/types/node-plugin';

export const twitterNode: NodePlugin = {
  type: 'twitter',
  name: 'Twitter (X)',
  description: 'Post tweets and interact with Twitter API',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/twitter.png',
  color: '#1DA1F2',
  inputs: [
    {
      name: 'consumerKey',
      label: 'Consumer Key (API Key)',
      type: 'text',
      required: true,
      description: 'Twitter API Consumer Key',
    },
    {
      name: 'consumerSecret',
      label: 'Consumer Secret (API Secret)',
      type: 'text',
      required: true,
      description: 'Twitter API Consumer Secret',
    },
    {
      name: 'accessToken',
      label: 'Access Token',
      type: 'text',
      required: true,
      description: 'Twitter Access Token',
    },
    {
      name: 'accessTokenSecret',
      label: 'Access Token Secret',
      type: 'text',
      required: true,
      description: 'Twitter Access Token Secret',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Tweet', value: 'createTweet' },
        { label: 'Create Reply', value: 'createReply' },
      ],
      description: 'Select the Twitter action to perform',
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const { action } = currentInputs;
    const inputs: any[] = [];

    if (action === 'createTweet') {
      inputs.push(
        { name: 'text', label: 'Tweet Text', type: 'textarea', required: true, placeholder: 'What\'s happening? (max 280 characters)' }
      );
    } else if (action === 'createReply') {
      inputs.push(
        { name: 'tweetId', label: 'Tweet ID', type: 'text', required: true, placeholder: 'ID of tweet to reply to' },
        { name: 'text', label: 'Reply Text', type: 'textarea', required: true, placeholder: 'Your reply (max 280 characters)' }
      );
    }

    return inputs;
  },
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'Response from Twitter API',
    },
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful',
    },
  ],
  async execute(inputs, context) {
    const { consumerKey, consumerSecret, accessToken, accessTokenSecret, action, ...params } = inputs;
    
    if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
      throw new Error('Twitter API credentials are required');
    }
    
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://appdmmjexevclmpyvtss.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
      );

      const { data, error } = await supabase.functions.invoke('twitter-action', {
        body: { 
          consumerKey,
          consumerSecret,
          accessToken,
          accessTokenSecret,
          action, 
          ...params 
        },
      });

      if (error) throw error;

      return {
        result: data,
        success: true,
      };
    } catch (error) {
      throw new Error(`Twitter API error: ${error.message}`);
    }
  },
};
