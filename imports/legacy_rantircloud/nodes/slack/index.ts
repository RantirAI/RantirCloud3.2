import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';

export const slackNode: NodePlugin = {
  type: 'slack',
  name: 'Slack',
  description: 'Send messages and interact with Slack',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/slack.png',
  color: '#4A154B',
  inputs: [
    {
      name: 'connectionMethod',
      label: 'Connection Method',
      type: 'select',
      required: true,
      options: [
        { label: 'API Token', value: 'token', description: 'Use Bot or User token for full Slack API access' },
        { label: 'Incoming Webhook', value: 'webhook', description: 'Simple webhook URL to post messages to a channel' },
      ],
      description: 'Choose how to connect to Slack',
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const { connectionMethod, tokenType, action } = currentInputs;
    const inputs: any[] = [];

    // === WEBHOOK MODE ===
    if (connectionMethod === 'webhook') {
      inputs.push(
        {
          name: 'webhookUrl',
          label: 'Webhook URL',
          type: 'text',
          required: true,
          isApiKey: true,
          placeholder: 'https://hooks.slack.com/services/T00/B00/xxx',
          description: 'Slack Incoming Webhook URL (from Slack App > Incoming Webhooks). Note: The destination channel is fixed by the webhook configuration in Slack and cannot be overridden. For dynamic channel selection, use the API Token connection method instead.',
        },
        {
          name: 'text',
          label: 'Message',
          type: 'textarea',
          required: true,
          placeholder: 'Hello from the flow!',
          description: 'The message to send',
        },
        {
          name: 'username',
          label: 'Bot Name (optional)',
          type: 'text',
          required: false,
          placeholder: 'Flow Bot',
          description: 'Override the default bot display name',
        },
        {
          name: 'iconEmoji',
          label: 'Bot Icon Emoji (optional)',
          type: 'text',
          required: false,
          placeholder: ':robot_face:',
          description: 'Override the bot icon with an emoji',
        },
        {
          name: 'blocks',
          label: 'Blocks (optional)',
          type: 'code',
          language: 'json',
          required: false,
          placeholder: '[ { "type": "section", "text": { "type": "mrkdwn", "text": "Hello" } } ]',
          description: 'Advanced: Slack Block Kit JSON for rich messages',
        }
      );
      return inputs;
    }

    // === TOKEN MODE (existing behavior) ===
    inputs.push({
      name: 'tokenType',
      label: 'Token Type',
      type: 'select',
      required: true,
      options: [
        { label: 'Bot Token (for most actions)', value: 'bot', description: 'Use xoxb- token for sending messages, reactions, etc.' },
        { label: 'User Token (for profile actions)', value: 'user', description: 'Use xoxp- token for updating profiles, setting status, etc.' },
      ],
      description: 'Select the type of Slack token you want to use',
    });

    // Add the token field based on tokenType
    if (tokenType === 'user') {
      inputs.push({
        name: 'apiKey',
        label: 'Slack User Token',
        type: 'text',
        required: true,
        isApiKey: true,
        placeholder: 'xoxp-your-slack-user-token',
        description: 'Your Slack User Token (starts with xoxp-) - Required for user profile actions',
      });
    } else if (tokenType === 'bot') {
      inputs.push({
        name: 'apiKey',
        label: 'Slack Bot Token',
        type: 'text',
        required: true,
        isApiKey: true,
        placeholder: 'xoxb-your-slack-bot-token',
        description: 'Your Slack Bot Token (starts with xoxb-)',
      });
    }

    // Then add the action field
    inputs.push({
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      default: 'slackSendMessage',
      options: [
        { label: '📨 Send Message', value: 'slackSendMessage', description: 'Send a message to a channel' },
        { label: '💬 Send Direct Message', value: 'slackSendDirectMessage', description: 'Send a DM to a user' },
        { label: '📋 List Channels', value: 'listChannels', description: 'Discover available channels and their IDs' },
        { label: 'Add Reaction to Message', value: 'addReactionToMessage' },
        { label: 'List Files', value: 'listFiles' },
        { label: 'Request Approval Direct Message', value: 'requestApprovalDirectMessage' },
        { label: 'Request Send Approval Message', value: 'requestSendApprovalMessage' },
        { label: 'Request Action Direct Message', value: 'requestActionDirectMessage' },
        { label: 'Request Action Message', value: 'requestActionMessage' },
        { label: 'Upload File', value: 'uploadFile' },
        { label: 'Get File', value: 'getFile' },
        { label: 'Search Messages', value: 'searchMessages' },
        { label: 'Find User by Email', value: 'findUserByEmail' },
        { label: 'Find User by Handle', value: 'findUserByHandle' },
        { label: 'Find User by ID', value: 'findUserById' },
        { label: 'List Users', value: 'listUsers' },
        { label: 'Update Message', value: 'updateMessage' },
        { label: 'Create Channel', value: 'createChannel' },
        { label: 'Update Profile', value: 'updateProfile' },
        { label: 'Get Channel History', value: 'getChannelHistory' },
        { label: 'Set User Status', value: 'setUserStatus' },
        { label: 'Markdown to Slack Format', value: 'markdownToSlackFormat' },
        { label: 'Retrieve Thread Messages', value: 'retrieveThreadMessages' },
        { label: 'Set Channel Topic', value: 'setChannelTopic' },
        { label: 'Get Message', value: 'getMessage' },
        { label: 'Invite User to Channel', value: 'inviteUserToChannel' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'Select the Slack action to perform',
    });

    if (action === 'slackSendMessage' || action === 'slackSendDirectMessage') {
      inputs.push(
        { name: 'channel', label: 'Channel', type: 'text', required: true, placeholder: '#general or C0123456789', description: 'Channel name (e.g. #general) or channel ID. Use "List Channels" action to discover available channels.' },
        { name: 'text', label: 'Message', type: 'textarea', required: true, placeholder: 'Your message' },
        { name: 'thread_ts', label: 'Reply in Thread (optional)', type: 'text', required: false, placeholder: '1234567890.123456', description: 'Message timestamp to reply in a thread. Leave empty to send as a new message.' },
        { name: 'blocks', label: 'Blocks JSON (optional)', type: 'code', language: 'json', required: false, placeholder: '[ { "type": "section", "text": { "type": "mrkdwn", "text": "Hello" } } ]', description: 'Slack Block Kit JSON for rich message formatting' }
      );
    } else if (action === 'listChannels') {
      inputs.push(
        { name: 'types', label: 'Channel Types', type: 'select', required: false, options: [
          { label: 'Public Channels', value: 'public_channel' },
          { label: 'Private Channels', value: 'private_channel' },
          { label: 'Multi-party IMs', value: 'mpim' },
          { label: 'Direct Messages', value: 'im' },
        ], description: 'Type of channels to list (defaults to public)' },
        { name: 'limit', label: 'Limit', type: 'number', required: false, placeholder: '100', description: 'Max number of channels to return' }
      );
    } else if (action === 'listFiles') {
      inputs.push(
        { name: 'channel', label: 'Channel (optional)', type: 'text', required: false, placeholder: 'C0123456789', description: 'Filter files by channel' },
        { name: 'userId', label: 'User ID (optional)', type: 'text', required: false, placeholder: 'U0123456789', description: 'Filter files by user' },
        { name: 'types', label: 'File Types (optional)', type: 'text', required: false, placeholder: 'images,pdfs', description: 'Comma-separated file types to filter' },
        { name: 'limit', label: 'Limit', type: 'number', required: false, placeholder: '100', description: 'Max number of files to return' }
      );
    } else if (action === 'addReactionToMessage') {
      inputs.push(
        { name: 'channel', label: 'Channel', type: 'text', required: true, placeholder: '#general' },
        { name: 'timestamp', label: 'Message Timestamp', type: 'text', required: true, placeholder: 'Message timestamp' },
        { name: 'reaction', label: 'Reaction', type: 'text', required: true, placeholder: 'thumbsup' }
      );
    } else if (action === 'uploadFile') {
      inputs.push(
        { name: 'channel', label: 'Channel', type: 'text', required: true, placeholder: '#general or C0123456789' },
        { name: 'fileUrl', label: 'File URL', type: 'text', required: true, placeholder: 'https://example.com/file.pdf' },
        { name: 'filename', label: 'Filename', type: 'text', required: true, placeholder: 'document.pdf' },
        { name: 'title', label: 'Title', type: 'text', required: false, placeholder: 'My Document', description: 'Display title for the uploaded file' }
      );
    } else if (action === 'searchMessages') {
      inputs.push(
        { name: 'query', label: 'Search Query', type: 'text', required: true, placeholder: 'Search term' }
      );
    } else if (action === 'findUserByEmail') {
      inputs.push(
        { name: 'email', label: 'Email', type: 'text', required: true, placeholder: 'user@example.com' }
      );
    } else if (action === 'findUserByHandle') {
      inputs.push(
        { name: 'handle', label: 'Username Handle', type: 'text', required: true, placeholder: '@username', description: 'Slack username handle (without @)' }
      );
    } else if (action === 'findUserById') {
      inputs.push(
        { name: 'userId', label: 'User ID', type: 'text', required: true, placeholder: 'U0123456789', description: 'Slack user ID' }
      );
    } else if (action === 'updateMessage') {
      inputs.push(
        { name: 'channel', label: 'Channel', type: 'text', required: true, placeholder: '#general' },
        { name: 'timestamp', label: 'Message Timestamp', type: 'text', required: true, placeholder: 'Message timestamp' },
        { name: 'text', label: 'New Message', type: 'textarea', required: true, placeholder: 'Updated message' }
      );
    } else if (action === 'createChannel') {
      inputs.push(
        { name: 'name', label: 'Channel Name', type: 'text', required: true, placeholder: 'new-channel' },
        { name: 'isPrivate', label: 'Private Channel', type: 'boolean', required: false }
      );
    } else if (action === 'getChannelHistory') {
      inputs.push(
        { name: 'channel', label: 'Channel', type: 'text', required: true, placeholder: '#general' },
        { name: 'limit', label: 'Limit', type: 'number', required: false, placeholder: '100' }
      );
    } else if (action === 'setUserStatus') {
      inputs.push(
        { name: 'statusText', label: 'Status Text', type: 'text', required: true, placeholder: 'In a meeting' },
        { name: 'statusEmoji', label: 'Status Emoji', type: 'text', required: false, placeholder: ':calendar:' }
      );
    } else if (action === 'retrieveThreadMessages') {
      inputs.push(
        { name: 'channel', label: 'Channel', type: 'text', required: true, placeholder: '#general' },
        { name: 'threadTs', label: 'Thread Timestamp', type: 'text', required: true, placeholder: 'Thread timestamp' }
      );
    } else if (action === 'setChannelTopic') {
      inputs.push(
        { name: 'channel', label: 'Channel', type: 'text', required: true, placeholder: '#general' },
        { name: 'topic', label: 'Topic', type: 'text', required: true, placeholder: 'New channel topic' }
      );
    } else if (action === 'inviteUserToChannel') {
      inputs.push(
        { name: 'channel', label: 'Channel', type: 'text', required: true, placeholder: '#general' },
        { name: 'userId', label: 'User ID', type: 'text', required: true, placeholder: 'User ID to invite' }
      );
    } else if (action === 'getFile') {
      inputs.push(
        { name: 'fileId', label: 'File ID', type: 'text', required: true, placeholder: 'F0123456789', description: 'The Slack file ID to retrieve' }
      );
    } else if (action === 'updateProfile') {
      inputs.push(
        { name: 'first_name', label: 'First Name', type: 'text', required: false, placeholder: 'John' },
        { name: 'last_name', label: 'Last Name', type: 'text', required: false, placeholder: 'Doe' },
        { name: 'display_name', label: 'Display Name', type: 'text', required: false, placeholder: 'johndoe' },
        { name: 'title', label: 'Title', type: 'text', required: false, placeholder: 'Software Engineer' },
        { name: 'phone', label: 'Phone', type: 'text', required: false, placeholder: '+1234567890' }
      );
    } else if (action === 'requestApprovalDirectMessage' || action === 'requestSendApprovalMessage' || action === 'requestActionDirectMessage' || action === 'requestActionMessage') {
      inputs.push(
        { name: 'channel', label: 'Channel', type: 'text', required: true, placeholder: '#general or user ID' },
        { name: 'text', label: 'Message', type: 'textarea', required: true, placeholder: 'Your message' }
      );
    } else if (action === 'getMessage') {
      inputs.push(
        { name: 'channel', label: 'Channel', type: 'text', required: true, placeholder: '#general' },
        { name: 'timestamp', label: 'Message Timestamp', type: 'text', required: true, placeholder: '1234567890.123456' }
      );
    } else if (action === 'markdownToSlackFormat') {
      inputs.push(
        { name: 'text', label: 'Markdown Text', type: 'textarea', required: true, placeholder: '**bold** _italic_ [link](url)' }
      );
    } else if (action === 'listUsers') {
      inputs.push(
        { name: 'limit', label: 'Limit', type: 'number', required: false, placeholder: '100', description: 'Max number of users to return' }
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'Endpoint', type: 'text', required: true, placeholder: '/api/chat.postMessage' },
        { name: 'method', label: 'Method', type: 'select', required: true, options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
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
      description: 'Response from Slack API',
    },
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful',
    },
  ],
  async execute(inputs, context) {
    const { action, apiKey, tokenType, connectionMethod, ...params } = inputs;
    
    // Helper function to resolve template variables
    const resolveTemplate = (value: any): any => {
      if (typeof value !== 'string') return value;
      
      // Match {{env.KEY}} pattern
      const envMatch = value.match(/^\{\{env\.([^}]+)\}\}$/);
      if (envMatch) {
        const envVars = JSON.parse(localStorage.getItem('flow-env-vars') || '{}');
        return envVars[envMatch[1]] || value;
      }
      
      // Match {{nodeId.output}} pattern
      const nodeMatch = value.match(/^\{\{([^.]+)\.([^}]+)\}\}$/);
      if (nodeMatch) {
        const nodeId = nodeMatch[1];
        const outputName = nodeMatch[2];
        return context.variables?.[`${nodeId}.${outputName}`] || value;
      }
      
      return value;
    };

    // === WEBHOOK MODE ===
    if (connectionMethod === 'webhook') {
      const resolvedWebhookUrl = resolveTemplate(params.webhookUrl);
      const resolvedText = resolveTemplate(params.text);
      const resolvedUsername = resolveTemplate(params.username);
      const resolvedIconEmoji = resolveTemplate(params.iconEmoji);
      const resolvedBlocks = resolveTemplate(params.blocks);

      if (!resolvedWebhookUrl) {
        return { result: { error: 'Webhook URL is required' }, success: false, error: 'Webhook URL is required' };
      }

      console.log(`[Slack Node] Executing webhook send`);

      try {
        const { data, error } = await supabase.functions.invoke('slack-action', {
          body: {
            action: 'sendViaWebhook',
            webhookUrl: resolvedWebhookUrl,
            text: resolvedText,
            username: resolvedUsername || undefined,
            icon_emoji: resolvedIconEmoji || undefined,
            blocks: resolvedBlocks || undefined,
          },
        });

        if (error) {
          const errorMessage = `Edge function error: ${error.message || JSON.stringify(error)}`;
          return { result: { error: errorMessage }, success: false, error: errorMessage };
        }

        if (data?.ok === false) {
          return { result: data, success: false, error: data.error || 'Webhook request failed' };
        }

        return { result: data || { ok: true }, success: true };
      } catch (error: any) {
        return { result: { error: error.message }, success: false, error: error.message };
      }
    }

    // === TOKEN MODE ===
    // Resolve all string parameters including the API key
    const resolvedApiKey = resolveTemplate(apiKey);
    const resolvedParams: Record<string, any> = {};
    for (const [key, value] of Object.entries(params)) {
      resolvedParams[key] = resolveTemplate(value);
    }
    
    // Actions that require user tokens (xoxp-) instead of bot tokens (xoxb-)
    const userTokenActions = ['setUserStatus', 'updateProfile'];
    
    // Validate that API key was resolved
    if (!resolvedApiKey) {
      return {
        result: { error: 'Slack token is required' },
        success: false,
        error: 'Slack token is required'
      };
    }
    
    // Check if the token is still a variable binding (unresolved)
    if (typeof resolvedApiKey === 'string' && resolvedApiKey.includes('{{')) {
      return {
        result: { error: 'Token variable could not be resolved' },
        success: false,
        error: `The token variable "${apiKey}" could not be resolved. Make sure the environment variable or node output exists.`
      };
    }
    
    // Validate token format and type
    const isUserToken = resolvedApiKey.startsWith('xoxp-');
    const isBotToken = resolvedApiKey.startsWith('xoxb-');
    
    if (!isUserToken && !isBotToken) {
      return {
        result: { error: 'Invalid Slack token format' },
        success: false,
        error: 'Invalid Slack token. Token must start with "xoxp-" (user) or "xoxb-" (bot).'
      };
    }
    
    // Enforce tokenType selection matches actual token
    if (tokenType === 'user' && !isUserToken) {
      return {
        result: { error: 'Token type mismatch' },
        success: false,
        error: 'You selected "User Token" but provided a Bot Token (xoxb-). Please use a User Token (xoxp-) or change the Token Type selection.'
      };
    }
    
    if (tokenType === 'bot' && !isBotToken) {
      return {
        result: { error: 'Token type mismatch' },
        success: false,
        error: 'You selected "Bot Token" but provided a User Token (xoxp-). Please use a Bot Token (xoxb-) or change the Token Type selection.'
      };
    }
    
    // Enforce user token for specific actions
    if (userTokenActions.includes(action) && !isUserToken) {
      return {
        result: { error: `The "${action}" action requires a user token (xoxp-)` },
        success: false,
        error: `This action requires a Slack User Token (starts with xoxp-), not a Bot Token. Please select "User Token" as Token Type and provide a valid user token.`
      };
    }
    
    console.log(`[Slack Node] Executing action: ${action}`);
    
    try {
      console.log(`[Slack Node] Invoking slack-action edge function with resolved parameters...`);
      const { data, error } = await supabase.functions.invoke('slack-action', {
        body: { action, apiKey: resolvedApiKey, ...resolvedParams },
      });

      if (error) {
        console.error(`[Slack Node] Edge function returned error:`, error);
        const errorMessage = `Edge function error: ${error.message || JSON.stringify(error)}`;
        return {
          result: { error: errorMessage },
          success: false,
          error: errorMessage,
          debugInfo: `Check Edge Function logs at https://supabase.com/dashboard/project/appdmmjexevclmpyvtss/functions/slack-action/logs`
        };
      }

      if (!data) {
        console.error(`[Slack Node] No data returned from slack-action`);
        const errorMessage = 'No response from slack-action edge function';
        return {
          result: { error: errorMessage },
          success: false,
          error: errorMessage,
          debugInfo: 'The function may have failed without returning data. Check Edge Function logs.'
        };
      }

      // Check if the Slack API returned an error
      if (data.ok === false) {
        const errorMessage = `Slack API error: ${data.error || 'Unknown error'}`;
        return {
          result: data,
          success: false,
          error: errorMessage
        };
      }

      console.log(`[Slack Node] Action completed successfully`);
      return {
        result: data,
        success: true,
      };
    } catch (error) {
      console.error(`[Slack Node] Error:`, error);
      const errorMessage = `Slack API error: ${error.message}`;
      return {
        result: { error: errorMessage },
        success: false,
        error: errorMessage
      };
    }
  },
};
