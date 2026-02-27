import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Generate request ID for tracing
  const requestId = crypto.randomUUID();
  
  console.log(`[${requestId}] Function start - Method: ${req.method}, URL: ${req.url}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Parse request body with dedicated error handling
  let requestBody;
  try {
    requestBody = await req.json();
    console.log(`[${requestId}] Parsed request body successfully`);
  } catch (parseError) {
    console.error(`[${requestId}] Failed to parse request body:`, parseError);
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: 'Invalid JSON in request body',
        requestId,
        hint: 'Ensure the request body is valid JSON'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const { action, apiKey, ...params } = requestBody;
  
  console.log(`[${requestId}] Action: ${action}`);

  try {
    // Handle ping action for health checks
    if (action === 'ping') {
      console.log(`[${requestId}] Ping action - returning pong`);
      return new Response(
        JSON.stringify({ 
          ok: true, 
          pong: true, 
          timestamp: new Date().toISOString(),
          requestId 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle webhook action (no token needed)
    if (action === 'sendViaWebhook') {
      const { webhookUrl, text, username, icon_emoji, blocks } = params;
      
      if (!webhookUrl || typeof webhookUrl !== 'string') {
        throw new Error('webhookUrl is required for sendViaWebhook');
      }
      if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
        throw new Error('Invalid webhook URL. Must start with https://hooks.slack.com/');
      }
      
      const webhookBody: any = { text: text || '' };
      if (username) webhookBody.username = username;
      if (icon_emoji) webhookBody.icon_emoji = icon_emoji;
      if (blocks) {
        try {
          webhookBody.blocks = typeof blocks === 'string' ? JSON.parse(blocks) : blocks;
        } catch {
          throw new Error('Invalid blocks JSON');
        }
      }
      
      console.log(`[${requestId}] Sending via webhook`);
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookBody),
      });
      
      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        throw new Error(`Webhook failed (${webhookResponse.status}): ${errorText}`);
      }
      
      return new Response(
        JSON.stringify({ ok: true, requestId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle client-side only actions
    if (action === 'markdownToSlackFormat') {
      // Convert markdown to Slack mrkdwn format
      let text = params.text || '';
      // Bold: **text** or __text__ -> *text*
      text = text.replace(/\*\*(.+?)\*\*/g, '*$1*');
      text = text.replace(/__(.+?)__/g, '*$1*');
      // Italic: *text* or _text_ -> _text_ (already correct for single underscore)
      // Links: [text](url) -> <url|text>
      text = text.replace(/\[(.+?)\]\((.+?)\)/g, '<$2|$1>');
      // Code blocks: ```code``` -> ```code```
      // Inline code: `code` -> `code` (already correct)
      // Strikethrough: ~~text~~ -> ~text~
      text = text.replace(/~~(.+?)~~/g, '~$1~');
      
      return new Response(
        JSON.stringify({ ok: true, text, requestId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const SLACK_TOKEN = apiKey || Deno.env.get("SLACK_BOT_TOKEN");
    if (!SLACK_TOKEN) {
      throw new Error("Slack token not provided. Please provide a Slack Bot Token.");
    }

    let result;
    let apiEndpoint = '';
    let method = 'POST';
    let body: any = {};

    // Map actions to Slack API endpoints
    switch (action) {
      // === MESSAGE ACTIONS ===
      case 'slackSendMessage':
      case 'send_message':
        apiEndpoint = 'https://slack.com/api/chat.postMessage';
        body = { channel: params.channel, text: params.text };
        if (params.blocks) body.blocks = params.blocks;
        if (params.thread_ts) body.thread_ts = params.thread_ts;
        break;

      case 'slackSendDirectMessage':
        apiEndpoint = 'https://slack.com/api/chat.postMessage';
        body = { channel: params.channel, text: params.text };
        if (params.blocks) body.blocks = params.blocks;
        break;

      case 'updateMessage':
        apiEndpoint = 'https://slack.com/api/chat.update';
        body = { channel: params.channel, ts: params.timestamp, text: params.text };
        if (params.blocks) body.blocks = params.blocks;
        break;

      case 'getMessage':
        apiEndpoint = 'https://slack.com/api/conversations.history';
        method = 'GET';
        body = { 
          channel: params.channel, 
          latest: params.timestamp,
          limit: 1,
          inclusive: true
        };
        break;

      case 'addReactionToMessage':
        apiEndpoint = 'https://slack.com/api/reactions.add';
        body = { channel: params.channel, timestamp: params.timestamp, name: params.reaction };
        break;

      case 'searchMessages':
        apiEndpoint = 'https://slack.com/api/search.messages';
        method = 'GET';
        body = { query: params.query };
        if (params.count) body.count = params.count;
        if (params.sort) body.sort = params.sort;
        break;

      // === APPROVAL/ACTION MESSAGE ACTIONS ===
      case 'requestApprovalDirectMessage':
      case 'requestSendApprovalMessage':
        apiEndpoint = 'https://slack.com/api/chat.postMessage';
        body = {
          channel: params.channel,
          text: params.text || 'Approval Request',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: params.text || 'Please review and approve:'
              }
            },
            {
              type: 'actions',
              block_id: params.blockId || 'approval_actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: params.approveText || 'Approve' },
                  style: 'primary',
                  action_id: 'approve',
                  value: params.approveValue || 'approved'
                },
                {
                  type: 'button',
                  text: { type: 'plain_text', text: params.rejectText || 'Reject' },
                  style: 'danger',
                  action_id: 'reject',
                  value: params.rejectValue || 'rejected'
                }
              ]
            }
          ]
        };
        break;

      case 'requestActionDirectMessage':
      case 'requestActionMessage':
        apiEndpoint = 'https://slack.com/api/chat.postMessage';
        const actionButtons = (params.actions || []).map((action: any, index: number) => ({
          type: 'button',
          text: { type: 'plain_text', text: action.text || `Action ${index + 1}` },
          style: action.style || 'default',
          action_id: action.actionId || `action_${index}`,
          value: action.value || `value_${index}`
        }));
        body = {
          channel: params.channel,
          text: params.text || 'Action Required',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: params.text || 'Please select an action:'
              }
            },
            {
              type: 'actions',
              block_id: params.blockId || 'action_block',
              elements: actionButtons.length > 0 ? actionButtons : [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'Confirm' },
                  style: 'primary',
                  action_id: 'confirm',
                  value: 'confirmed'
                }
              ]
            }
          ]
        };
        break;

      // === CHANNEL ACTIONS ===
      case 'list_channels':
      case 'listChannels':
        apiEndpoint = 'https://slack.com/api/conversations.list';
        method = 'GET';
        body = {};
        if (params.types) body.types = params.types;
        if (params.limit) body.limit = params.limit;
        break;

      case 'createChannel':
        apiEndpoint = 'https://slack.com/api/conversations.create';
        body = { name: params.name, is_private: params.isPrivate || false };
        break;

      case 'getChannelHistory':
        apiEndpoint = 'https://slack.com/api/conversations.history';
        method = 'GET';
        body = { channel: params.channel, limit: params.limit || 100 };
        break;

      case 'retrieveThreadMessages':
        apiEndpoint = 'https://slack.com/api/conversations.replies';
        method = 'GET';
        body = { channel: params.channel, ts: params.threadTs };
        break;

      case 'setChannelTopic':
        apiEndpoint = 'https://slack.com/api/conversations.setTopic';
        body = { channel: params.channel, topic: params.topic };
        break;

      case 'inviteUserToChannel':
        apiEndpoint = 'https://slack.com/api/conversations.invite';
        body = { channel: params.channel, users: params.userId };
        break;

      // === USER ACTIONS ===
      case 'findUserByEmail':
        apiEndpoint = 'https://slack.com/api/users.lookupByEmail';
        method = 'GET';
        body = { email: params.email };
        break;

      case 'findUserById':
        apiEndpoint = 'https://slack.com/api/users.info';
        method = 'GET';
        body = { user: params.userId };
        break;

      case 'findUserByHandle':
        // First get all users, then filter by display_name or real_name
        apiEndpoint = 'https://slack.com/api/users.list';
        method = 'GET';
        body = {};
        // We'll filter the result after fetching
        break;

      case 'listUsers':
        apiEndpoint = 'https://slack.com/api/users.list';
        method = 'GET';
        body = {};
        if (params.limit) body.limit = params.limit;
        break;

      case 'setUserStatus':
        apiEndpoint = 'https://slack.com/api/users.profile.set';
        body = { 
          profile: {
            status_text: params.statusText,
            status_emoji: params.statusEmoji || ''
          }
        };
        break;

      case 'updateProfile':
        apiEndpoint = 'https://slack.com/api/users.profile.set';
        const profile: any = {};
        if (params.first_name) profile.first_name = params.first_name;
        if (params.last_name) profile.last_name = params.last_name;
        if (params.display_name) profile.display_name = params.display_name;
        if (params.title) profile.title = params.title;
        if (params.phone) profile.phone = params.phone;
        if (params.status_text) profile.status_text = params.status_text;
        if (params.status_emoji) profile.status_emoji = params.status_emoji;
        body = { profile };
        break;

      // === FILE ACTIONS ===
      case 'uploadFile': {
        // Two-step upload: files.getUploadURLExternal + files.completeUploadExternal
        // Step 1: Fetch the file content from the provided URL
        const fileUrl = params.fileUrl;
        if (!fileUrl) throw new Error('fileUrl is required for uploadFile');

        console.log(`[${requestId}] Fetching file from: ${fileUrl}`);
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch file from URL: ${fileResponse.status} ${fileResponse.statusText}`);
        }
        const fileContent = await fileResponse.arrayBuffer();
        const fileLength = fileContent.byteLength;
        const fileName = params.filename || fileUrl.split('/').pop() || 'upload';

        console.log(`[${requestId}] File fetched, size: ${fileLength} bytes`);

        // Step 2: Get upload URL from Slack
        const getUrlParams = new URLSearchParams({
          filename: fileName,
          length: String(fileLength),
        });
        const getUrlResponse = await fetch(`https://slack.com/api/files.getUploadURLExternal?${getUrlParams}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${SLACK_TOKEN}` },
        });
        const getUrlResult = await getUrlResponse.json();
        if (!getUrlResult.ok) {
          throw new Error(`files.getUploadURLExternal failed: ${getUrlResult.error}`);
        }

        const uploadUrl = getUrlResult.upload_url;
        const fileId = getUrlResult.file_id;
        console.log(`[${requestId}] Got upload URL, file_id: ${fileId}`);

        // Step 3: Upload file content to the presigned URL
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          body: fileContent,
        });
        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.text();
          throw new Error(`File upload to presigned URL failed: ${uploadResponse.status} ${uploadError}`);
        }
        // Consume response body
        await uploadResponse.text();

        console.log(`[${requestId}] File uploaded to presigned URL`);

        // Step 4: Complete the upload and optionally share to channel
        const completeBody: any = {
          files: [{ id: fileId, title: params.title || fileName }],
        };
        if (params.channel) {
          completeBody.channel_id = params.channel;
        }

        const completeResponse = await fetch('https://slack.com/api/files.completeUploadExternal', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SLACK_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(completeBody),
        });
        result = await completeResponse.json();
        if (!result.ok) {
          throw new Error(`files.completeUploadExternal failed: ${result.error}`);
        }

        console.log(`[${requestId}] Upload complete, file shared`);

        // Return early since we already have the result
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getFile':
        apiEndpoint = 'https://slack.com/api/files.info';
        method = 'GET';
        body = { file: params.fileId };
        break;

      case 'listFiles':
        apiEndpoint = 'https://slack.com/api/files.list';
        method = 'GET';
        body = {};
        if (params.channel) body.channel = params.channel;
        if (params.user) body.user = params.user;
        if (params.types) body.types = params.types;
        if (params.count) body.count = params.count;
        break;

      // === CUSTOM API CALL ===
      case 'createCustomApiCall':
        apiEndpoint = `https://slack.com/api${params.endpoint}`;
        method = params.method || 'POST';
        if (params.body) {
          try {
            body = JSON.parse(params.body);
          } catch {
            body = params.body;
          }
        }
        break;

      default:
        console.error(`[${requestId}] Unsupported action: ${action}`);
        return new Response(
          JSON.stringify({ 
            ok: false, 
            error: `Unsupported action: ${action}`,
            requestId,
            hint: 'Check the action name matches one of the supported Slack actions'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
    }

    // Make the API call
    const headers: any = {
      'Authorization': `Bearer ${SLACK_TOKEN}`,
      'Content-Type': 'application/json',
    };

    const fetchOptions: any = {
      method,
      headers,
    };

    if (method === 'POST') {
      fetchOptions.body = JSON.stringify(body);
    } else if (method === 'GET' && Object.keys(body).length > 0) {
      const queryString = new URLSearchParams(body).toString();
      apiEndpoint += `?${queryString}`;
    }

    console.log(`[${requestId}] Calling Slack API: ${apiEndpoint}`);
    const response = await fetch(apiEndpoint, fetchOptions);
    console.log(`[${requestId}] Slack API response status: ${response.status}`);

    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = 'Could not read error response';
      }
      console.error(`[${requestId}] Slack API error response:`, errorText);
      throw new Error(`Slack API returned ${response.status}: ${errorText}`);
    }

    // Parse Slack response with error handling
    try {
      result = await response.json();
      console.log(`[${requestId}] Slack API response OK:`, result.ok);
    } catch (jsonError) {
      const rawText = await response.text();
      console.error(`[${requestId}] Failed to parse Slack response as JSON:`, rawText);
      throw new Error(`Slack API returned non-JSON response: ${rawText.substring(0, 200)}`);
    }

    // Special handling for findUserByHandle - filter results
    if (action === 'findUserByHandle' && result.ok && result.members) {
      const handle = (params.handle || '').toLowerCase().replace('@', '');
      const foundUser = result.members.find((member: any) => 
        member.name?.toLowerCase() === handle ||
        member.profile?.display_name?.toLowerCase() === handle ||
        member.profile?.real_name?.toLowerCase() === handle
      );
      result = {
        ok: true,
        user: foundUser || null,
        found: !!foundUser
      };
    }
    
    if (!result.ok) {
      console.error(`[${requestId}] Slack API returned error:`, result.error);
      throw new Error(result.error || 'Slack API returned an error');
    }

    console.log(`[${requestId}] Returning success`);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${requestId}] Error in slack-action:`, error);
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: error.message,
        requestId,
        action,
        hint: 'Check Edge Function logs for detailed error information'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
