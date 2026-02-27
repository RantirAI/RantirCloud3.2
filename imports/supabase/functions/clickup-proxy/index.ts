import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Emoji character to ClickUp lowercase name mapping
const emojiToName: Record<string, string> = {
  '👍': 'thumbsup', '👎': 'thumbsdown', '❤️': 'heart', '❤': 'heart',
  '😀': 'grinning', '🎉': 'tada', '✅': 'white_check_mark',
  '🚀': 'rocket', '👀': 'eyes', '🔥': 'fire',
  '😂': 'joy', '⭐': 'star', '✨': 'sparkles',
  '💯': '100', '👏': 'clap', '🙏': 'pray',
};

function convertEmojiToName(reaction: string): string {
  if (!reaction) return reaction;
  const trimmed = reaction.trim();
  if (emojiToName[trimmed]) return emojiToName[trimmed];
  // If it's already ASCII (a-z, 0-9, _), pass through
  if (/^[a-z0-9_]+$/.test(trimmed)) return trimmed;
  // Unknown emoji - pass through as-is
  return trimmed;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, ...params } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'API token is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrlV2 = 'https://api.clickup.com/api/v2';
    const baseUrlV3 = 'https://api.clickup.com/api/v3';
    let baseUrl = baseUrlV2;
    let endpoint = '';
    let method = 'GET';
    let body: any = null;

    switch (action) {
      // === Task Actions (v2) ===
      case 'createTask':
        endpoint = `/list/${params.listId}/task`;
        method = 'POST';
        body = {
          name: params.name,
          description: params.description,
          status: params.status,
          priority: params.priority,
          due_date: params.dueDate,
          assignees: params.assignees ? params.assignees.split(',').map((a: string) => parseInt(a.trim())) : undefined,
          tags: params.tags ? params.tags.split(',').map((t: string) => t.trim()) : undefined,
        };
        break;

      case 'createTaskFromTemplate':
        endpoint = `/list/${params.listId}/taskTemplate/${params.templateId}`;
        method = 'POST';
        body = { name: params.name };
        break;

      case 'createFolderlessList':
        endpoint = `/space/${params.spaceId}/list`;
        method = 'POST';
        body = {
          name: params.name,
          content: params.content || undefined,
        };
        break;

      case 'createTaskComment':
        endpoint = `/task/${params.taskId}/comment`;
        method = 'POST';
        body = {
          comment_text: params.commentText,
          assignee: params.assignee ? parseInt(params.assignee) : undefined,
        };
        break;

      case 'createSubtask':
        endpoint = `/list/${params.listId || 'default'}/task`;
        method = 'POST';
        body = {
          name: params.name,
          description: params.description,
          parent: params.parentTaskId,
        };
        // Get parent task's list first
        if (params.parentTaskId) {
          const parentResponse = await fetch(`${baseUrlV2}/task/${params.parentTaskId}`, {
            headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
          });
          const parentData = await parentResponse.json();
          if (parentData.list?.id) {
            endpoint = `/list/${parentData.list.id}/task`;
          }
        }
        break;

      // === Chat Actions (v3) ===
      case 'createChannel':
        baseUrl = baseUrlV3;
        endpoint = `/workspaces/${params.workspaceId}/chat/channels`;
        method = 'POST';
        body = {
          name: params.name,
          description: params.description,
        };
        break;

      case 'createChannelInContainer': {
        baseUrl = baseUrlV3;
        endpoint = `/workspaces/${params.workspaceId}/chat/channels/location`;
        const locationBody: any = { name: params.name };
        if (params.containerType === 'space') locationBody.space_id = params.containerId;
        else if (params.containerType === 'folder') locationBody.folder_id = params.containerId;
        else if (params.containerType === 'list') locationBody.list_id = params.containerId;
        body = locationBody;
        method = 'POST';
        break;
      }

      case 'createMessage':
        baseUrl = baseUrlV3;
        endpoint = `/workspaces/${params.workspaceId}/chat/channels/${params.channelId}/messages`;
        method = 'POST';
        body = { content: params.content };
        break;

      case 'createMessageReaction':
        baseUrl = baseUrlV3;
        endpoint = `/workspaces/${params.workspaceId}/chat/messages/${params.messageId}/reactions`;
        method = 'POST';
        body = { reaction: convertEmojiToName(params.reaction) };
        break;

      case 'createMessageReply':
        baseUrl = baseUrlV3;
        endpoint = `/workspaces/${params.workspaceId}/chat/messages/${params.messageId}/replies`;
        method = 'POST';
        body = { content: params.content };
        break;

      case 'getChannel':
        baseUrl = baseUrlV3;
        endpoint = `/workspaces/${params.workspaceId}/chat/channels/${params.channelId}`;
        method = 'GET';
        break;

      case 'getChannels':
        baseUrl = baseUrlV3;
        endpoint = `/workspaces/${params.workspaceId}/chat/channels`;
        method = 'GET';
        break;

      case 'getChannelMessages': {
        baseUrl = baseUrlV3;
        const limit = params.limit || 50;
        endpoint = `/workspaces/${params.workspaceId}/chat/channels/${params.channelId}/messages?limit=${limit}`;
        method = 'GET';
        break;
      }

      case 'getMessageReactions':
        baseUrl = baseUrlV3;
        endpoint = `/workspaces/${params.workspaceId}/chat/messages/${params.messageId}/reactions`;
        method = 'GET';
        break;

      case 'getMessageReplies':
        baseUrl = baseUrlV3;
        endpoint = `/workspaces/${params.workspaceId}/chat/messages/${params.messageId}/replies`;
        method = 'GET';
        break;

      case 'updateMessage':
        baseUrl = baseUrlV3;
        endpoint = `/workspaces/${params.workspaceId}/chat/messages/${params.messageId}`;
        method = 'PUT';
        body = { content: params.content };
        break;

      case 'deleteMessage':
        baseUrl = baseUrlV3;
        endpoint = `/workspaces/${params.workspaceId}/chat/messages/${params.messageId}`;
        method = 'DELETE';
        break;

      case 'deleteMessageReaction':
        baseUrl = baseUrlV3;
        endpoint = `/workspaces/${params.workspaceId}/chat/messages/${params.messageId}/reactions`;
        method = 'DELETE';
        body = { reaction: convertEmojiToName(params.reaction) };
        break;

      // === Task GET Actions (v2) ===
      case 'getList':
        endpoint = `/list/${params.listId}`;
        method = 'GET';
        break;

      case 'getTask':
        endpoint = `/task/${params.taskId}`;
        method = 'GET';
        break;

      case 'getTaskByName': {
        endpoint = `/list/${params.listId}/task`;
        method = 'GET';
        break;
      }

      case 'getSpace':
        endpoint = `/space/${params.spaceId}`;
        method = 'GET';
        break;

      case 'getSpaces':
        endpoint = `/team/${params.workspaceId}/space`;
        method = 'GET';
        break;

      case 'getTaskComments':
        endpoint = `/task/${params.taskId}/comment`;
        method = 'GET';
        break;

      case 'filterWorkspaceTasks': {
        const queryParams = new URLSearchParams();
        if (params.spaceIds) queryParams.append('space_ids[]', params.spaceIds);
        if (params.listIds) queryParams.append('list_ids[]', params.listIds);
        if (params.statuses) params.statuses.split(',').forEach((s: string) => queryParams.append('statuses[]', s.trim()));
        const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
        endpoint = `/team/${params.workspaceId}/task${query}`;
        method = 'GET';
        break;
      }

      case 'filterWorkspaceTimeEntries': {
        const queryParams = new URLSearchParams();
        if (params.startDate) queryParams.append('start_date', params.startDate.toString());
        if (params.endDate) queryParams.append('end_date', params.endDate.toString());
        const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
        endpoint = `/team/${params.workspaceId}/time_entries${query}`;
        method = 'GET';
        break;
      }

      // === Task Update Actions (v2) ===
      case 'updateTask':
        endpoint = `/task/${params.taskId}`;
        method = 'PUT';
        body = {};
        if (params.name) body.name = params.name;
        if (params.description) body.description = params.description;
        if (params.status) body.status = params.status;
        if (params.priority) body.priority = params.priority;
        if (params.dueDate) body.due_date = params.dueDate;
        break;

      case 'deleteTask':
        endpoint = `/task/${params.taskId}`;
        method = 'DELETE';
        break;

      // === Custom Fields (v2) ===
      case 'getAccessibleCustomFields':
        endpoint = `/list/${params.listId}/field`;
        method = 'GET';
        break;

      case 'setCustomFieldValue':
        endpoint = `/task/${params.taskId}/field/${params.fieldId}`;
        method = 'POST';
        body = { value: params.value };
        break;

      case 'customApiCall':
        endpoint = params.endpoint;
        method = params.method || 'GET';
        body = params.body ? JSON.parse(params.body) : null;
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`ClickUp: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    
    // Safely parse response - ClickUp may return HTML on errors
    const responseText = await response.text();
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('ClickUp returned non-JSON response:', responseText.substring(0, 300));
      return new Response(JSON.stringify({ 
        success: false, 
        error: `ClickUp API returned non-JSON response (status ${response.status}). This usually indicates an invalid endpoint or authentication issue.`,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!response.ok) {
      console.error('ClickUp API error:', data);
      return new Response(JSON.stringify({ 
        success: false, 
        error: data.err || data.error || 'API request failed', 
        details: data 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Post-process for getTaskByName
    let resultData = data;
    if (action === 'getTaskByName' && params.taskName) {
      const tasks = data.tasks || [];
      resultData = { ...data, tasks: tasks.filter((t: any) => t.name.toLowerCase().includes(params.taskName.toLowerCase())) };
    }

    return new Response(JSON.stringify({ success: true, data: resultData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ClickUp proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
