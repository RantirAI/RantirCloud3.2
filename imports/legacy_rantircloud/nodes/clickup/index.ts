import { NodePlugin } from '@/types/node-plugin';

export const clickupNode: NodePlugin = {
  type: 'clickup',
  name: 'ClickUp',
  description: 'Project management and productivity platform',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/clickup.png',
  color: '#7B68EE',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Token',
      type: 'text',
      required: true,
      description: 'Your ClickUp API token',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Task', value: 'createTask' },
        { label: 'Create Task from Template', value: 'createTaskFromTemplate' },
        { label: 'Create Folderless List', value: 'createFolderlessList' },
        { label: 'Create Task Comment', value: 'createTaskComment' },
        { label: 'Create Subtask', value: 'createSubtask' },
        { label: 'Create Channel', value: 'createChannel' },
        { label: 'Create Channel in Space/Folder/List', value: 'createChannelInContainer' },
        { label: 'Create Message', value: 'createMessage' },
        { label: 'Create Message Reaction', value: 'createMessageReaction' },
        { label: 'Create Message Reply', value: 'createMessageReply' },
        { label: 'Get List', value: 'getList' },
        { label: 'Get Task', value: 'getTask' },
        { label: 'Get Task by Name', value: 'getTaskByName' },
        { label: 'Get Space', value: 'getSpace' },
        { label: 'Get Spaces', value: 'getSpaces' },
        { label: 'Get Task Comments', value: 'getTaskComments' },
        { label: 'Get Channel', value: 'getChannel' },
        { label: 'Get Channels', value: 'getChannels' },
        { label: 'Get Channel Messages', value: 'getChannelMessages' },
        { label: 'Get Message Reactions', value: 'getMessageReactions' },
        { label: 'Get Message Replies', value: 'getMessageReplies' },
        { label: 'Filter Workspace Tasks', value: 'filterWorkspaceTasks' },
        { label: 'Filter Workspace Time Entries', value: 'filterWorkspaceTimeEntries' },
        { label: 'Update Task', value: 'updateTask' },
        { label: 'Update Message', value: 'updateMessage' },
        { label: 'Delete Message', value: 'deleteMessage' },
        { label: 'Delete Message Reaction', value: 'deleteMessageReaction' },
        { label: 'Delete Task', value: 'deleteTask' },
        { label: 'Get Accessible Custom Fields', value: 'getAccessibleCustomFields' },
        { label: 'Set Custom Field Value', value: 'setCustomFieldValue' },
        { label: 'Custom API Call', value: 'customApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'createTask') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true, description: 'Found in ClickUp URL: app.clickup.com/{workspaceId}/...', placeholder: 'e.g. 1234567' },
        { name: 'spaceId', label: 'Space ID', type: 'text' as const, required: false, description: 'Optional. The Space this list belongs to', placeholder: 'e.g. 90120187' },
        { name: 'listId', label: 'List ID', type: 'text' as const, required: true, description: 'The List to create the task in', placeholder: 'e.g. 901200532' },
        { name: 'name', label: 'Task Name', type: 'text' as const, required: true, placeholder: 'e.g. Design homepage mockup' },
        { name: 'description', label: 'Description', type: 'textarea' as const, required: false, placeholder: 'Task details...' },
        { name: 'assignees', label: 'Assignee IDs', type: 'text' as const, required: false, description: 'Comma-separated user IDs', placeholder: 'e.g. 183,455' },
        { name: 'tags', label: 'Tags', type: 'text' as const, required: false, description: 'Comma-separated tag names', placeholder: 'e.g. urgent,frontend' },
        { name: 'status', label: 'Status', type: 'text' as const, required: false, description: 'Must match an existing status in the list', placeholder: 'e.g. open, in progress' },
        { name: 'priority', label: 'Priority', type: 'number' as const, required: false, description: '1 = Urgent, 2 = High, 3 = Normal, 4 = Low', placeholder: 'e.g. 3' }
      );
    } else if (action === 'createTaskFromTemplate') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true, description: 'Found in ClickUp URL: app.clickup.com/{workspaceId}/...', placeholder: 'e.g. 1234567' },
        { name: 'spaceId', label: 'Space ID', type: 'text' as const, required: false, description: 'Optional. The Space this list belongs to', placeholder: 'e.g. 90120187' },
        { name: 'listId', label: 'List ID', type: 'text' as const, required: true, description: 'The List to create the task in', placeholder: 'e.g. 901200532' },
        { name: 'templateId', label: 'Template ID', type: 'text' as const, required: true, description: 'The task template ID to use', placeholder: 'e.g. 9hz0_123' },
        { name: 'name', label: 'Task Name', type: 'text' as const, required: true, placeholder: 'e.g. Sprint planning' }
      );
    } else if (action === 'createFolderlessList') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true, description: 'Found in ClickUp URL: app.clickup.com/{workspaceId}/...', placeholder: 'e.g. 1234567' },
        { name: 'spaceId', label: 'Space ID', type: 'text' as const, required: true, description: 'The Space to create the list in', placeholder: 'e.g. 90120187' },
        { name: 'name', label: 'List Name', type: 'text' as const, required: true, placeholder: 'e.g. Q3 Tasks' },
        { name: 'content', label: 'Description', type: 'textarea' as const, required: false, placeholder: 'List description...' }
      );
    } else if (action === 'createTaskComment') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true, description: 'Found in ClickUp URL: app.clickup.com/{workspaceId}/...', placeholder: 'e.g. 1234567' },
        { name: 'taskId', label: 'Task ID', type: 'text' as const, required: true, description: 'The task to comment on', placeholder: 'e.g. abc123' },
        { name: 'commentText', label: 'Comment Text', type: 'textarea' as const, required: true, placeholder: 'Your comment...' }
      );
    } else if (action === 'createSubtask') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true, description: 'Found in ClickUp URL: app.clickup.com/{workspaceId}/...', placeholder: 'e.g. 1234567' },
        { name: 'parentTaskId', label: 'Parent Task ID', type: 'text' as const, required: true, description: 'The parent task ID', placeholder: 'e.g. abc123' },
        { name: 'name', label: 'Subtask Name', type: 'text' as const, required: true, placeholder: 'e.g. Review PR' },
        { name: 'description', label: 'Description', type: 'textarea' as const, required: false, placeholder: 'Subtask details...' }
      );
    } else if (action === 'createChannel') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true, description: 'Found in ClickUp URL: app.clickup.com/{workspaceId}/...', placeholder: 'e.g. 1234567' },
        { name: 'name', label: 'Channel Name', type: 'text' as const, required: true, placeholder: 'e.g. #design-review' },
        { name: 'description', label: 'Description', type: 'textarea' as const, required: false, placeholder: 'Channel description...' }
      );
    } else if (action === 'createChannelInContainer') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true, description: 'Found in ClickUp URL: app.clickup.com/{workspaceId}/...', placeholder: 'e.g. 1234567' },
        { name: 'containerType', label: 'Container Type', type: 'select' as const, required: true, description: 'Where to create the channel', options: [
          { label: 'Space', value: 'space' },
          { label: 'Folder', value: 'folder' },
          { label: 'List', value: 'list' },
        ]},
        { name: 'containerId', label: 'Container ID', type: 'text' as const, required: true, description: 'The ID of the selected space, folder, or list', placeholder: 'e.g. 90120187' },
        { name: 'name', label: 'Channel Name', type: 'text' as const, required: true, placeholder: 'e.g. #design-review' }
      );
    } else if (action === 'createMessage') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true, description: 'Found in ClickUp URL: app.clickup.com/{workspaceId}/...', placeholder: 'e.g. 1234567' },
        { name: 'channelId', label: 'Channel ID', type: 'text' as const, required: true, description: 'The chat channel ID', placeholder: 'e.g. 012abc' },
        { name: 'content', label: 'Message Content', type: 'textarea' as const, required: true, placeholder: 'Message text...' }
      );
    } else if (action === 'createMessageReaction') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true, description: 'Found in ClickUp URL: app.clickup.com/{workspaceId}/...', placeholder: 'e.g. 1234567' },
        { name: 'messageId', label: 'Message ID', type: 'text' as const, required: true, description: 'The message ID to react to', placeholder: 'e.g. msg_abc123' },
        { name: 'reaction', label: 'Reaction', type: 'text' as const, required: true, description: 'Lowercase emoji name as used by ClickUp (not the emoji character)', placeholder: 'e.g. thumbsup, heart, white_check_mark' }
      );
    } else if (action === 'createMessageReply') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true, description: 'Found in ClickUp URL: app.clickup.com/{workspaceId}/...', placeholder: 'e.g. 1234567' },
        { name: 'messageId', label: 'Message ID', type: 'text' as const, required: true, description: 'The message ID to reply to', placeholder: 'e.g. msg_abc123' },
        { name: 'content', label: 'Reply Content', type: 'textarea' as const, required: true, placeholder: 'Message text...' }
      );
    } else if (action === 'getList') {
      inputs.push(
        { name: 'listId', label: 'List ID', type: 'text' as const, required: true, description: 'The List ID to retrieve', placeholder: 'e.g. 901200532' }
      );
    } else if (action === 'getTask' || action === 'deleteTask') {
      inputs.push(
        { name: 'taskId', label: 'Task ID', type: 'text' as const, required: true, description: 'The task ID', placeholder: 'e.g. abc123' }
      );
    } else if (action === 'getTaskByName') {
      inputs.push(
        { name: 'listId', label: 'List ID', type: 'text' as const, required: true, description: 'The List to search in', placeholder: 'e.g. 901200532' },
        { name: 'taskName', label: 'Task Name', type: 'text' as const, required: true, description: 'Exact task name to find', placeholder: 'e.g. Design homepage mockup' }
      );
    } else if (action === 'getSpace') {
      inputs.push(
        { name: 'spaceId', label: 'Space ID', type: 'text' as const, required: true, description: 'The Space ID to retrieve', placeholder: 'e.g. 90120187' }
      );
    } else if (action === 'getSpaces') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true, description: 'Found in ClickUp URL: app.clickup.com/{workspaceId}/...', placeholder: 'e.g. 1234567' }
      );
    } else if (action === 'getTaskComments') {
      inputs.push(
        { name: 'taskId', label: 'Task ID', type: 'text' as const, required: true, description: 'The task to get comments for', placeholder: 'e.g. abc123' }
      );
    } else if (action === 'getChannel') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true, description: 'Found in ClickUp URL: app.clickup.com/{workspaceId}/...', placeholder: 'e.g. 1234567' },
        { name: 'channelId', label: 'Channel ID', type: 'text' as const, required: true, description: 'The chat channel ID', placeholder: 'e.g. 012abc' }
      );
    } else if (action === 'getChannels') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true, description: 'Found in ClickUp URL: app.clickup.com/{workspaceId}/...', placeholder: 'e.g. 1234567' }
      );
    } else if (action === 'getChannelMessages') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true, description: 'Found in ClickUp URL: app.clickup.com/{workspaceId}/...', placeholder: 'e.g. 1234567' },
        { name: 'channelId', label: 'Channel ID', type: 'text' as const, required: true, description: 'The chat channel ID', placeholder: 'e.g. 012abc' },
        { name: 'limit', label: 'Limit', type: 'number' as const, required: false, default: 50, description: 'Max messages to return', placeholder: 'e.g. 50' }
      );
    } else if (action === 'getMessageReactions' || action === 'getMessageReplies') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true, description: 'Found in ClickUp URL: app.clickup.com/{workspaceId}/...', placeholder: 'e.g. 1234567' },
        { name: 'messageId', label: 'Message ID', type: 'text' as const, required: true, description: 'The message ID', placeholder: 'e.g. msg_abc123' }
      );
    } else if (action === 'filterWorkspaceTasks') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true, description: 'Found in ClickUp URL: app.clickup.com/{workspaceId}/...', placeholder: 'e.g. 1234567' },
        { name: 'spaceIds', label: 'Space IDs', type: 'text' as const, required: false, description: 'Comma-separated Space IDs to filter by', placeholder: 'e.g. 90120187,90120188' },
        { name: 'listIds', label: 'List IDs', type: 'text' as const, required: false, description: 'Comma-separated List IDs to filter by', placeholder: 'e.g. 901200532,901200533' },
        { name: 'statuses', label: 'Statuses', type: 'text' as const, required: false, description: 'Comma-separated statuses to filter by', placeholder: 'e.g. open,in progress' }
      );
    } else if (action === 'filterWorkspaceTimeEntries') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true, description: 'Found in ClickUp URL: app.clickup.com/{workspaceId}/...', placeholder: 'e.g. 1234567' }
      );
    } else if (action === 'updateTask') {
      inputs.push(
        { name: 'taskId', label: 'Task ID', type: 'text' as const, required: true, description: 'The task to update', placeholder: 'e.g. abc123' },
        { name: 'name', label: 'Task Name', type: 'text' as const, required: false, placeholder: 'e.g. Design homepage mockup' },
        { name: 'description', label: 'Description', type: 'textarea' as const, required: false, placeholder: 'Task details...' },
        { name: 'status', label: 'Status', type: 'text' as const, required: false, description: 'Must match an existing status in the list', placeholder: 'e.g. open, in progress' },
        { name: 'priority', label: 'Priority', type: 'number' as const, required: false, description: '1 = Urgent, 2 = High, 3 = Normal, 4 = Low', placeholder: 'e.g. 3' }
      );
    } else if (action === 'updateMessage') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true, description: 'Found in ClickUp URL: app.clickup.com/{workspaceId}/...', placeholder: 'e.g. 1234567' },
        { name: 'messageId', label: 'Message ID', type: 'text' as const, required: true, description: 'The message ID to update', placeholder: 'e.g. msg_abc123' },
        { name: 'content', label: 'New Content', type: 'textarea' as const, required: true, placeholder: 'Updated message text...' }
      );
    } else if (action === 'deleteMessage') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true, description: 'Found in ClickUp URL: app.clickup.com/{workspaceId}/...', placeholder: 'e.g. 1234567' },
        { name: 'messageId', label: 'Message ID', type: 'text' as const, required: true, description: 'The message ID to delete', placeholder: 'e.g. msg_abc123' }
      );
    } else if (action === 'deleteMessageReaction') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true, description: 'Found in ClickUp URL: app.clickup.com/{workspaceId}/...', placeholder: 'e.g. 1234567' },
        { name: 'messageId', label: 'Message ID', type: 'text' as const, required: true, description: 'The message ID', placeholder: 'e.g. msg_abc123' },
        { name: 'reaction', label: 'Reaction', type: 'text' as const, required: true, description: 'Lowercase emoji name as used by ClickUp (not the emoji character)', placeholder: 'e.g. thumbsup, heart, white_check_mark' }
      );
    } else if (action === 'getAccessibleCustomFields') {
      inputs.push(
        { name: 'listId', label: 'List ID', type: 'text' as const, required: true, description: 'The List to get custom fields for', placeholder: 'e.g. 901200532' }
      );
    } else if (action === 'setCustomFieldValue') {
      inputs.push(
        { name: 'taskId', label: 'Task ID', type: 'text' as const, required: true, description: 'The task to set the field on', placeholder: 'e.g. abc123' },
        { name: 'fieldId', label: 'Custom Field ID', type: 'text' as const, required: true, description: 'The custom field UUID', placeholder: 'e.g. 0a52c486-...' },
        { name: 'value', label: 'Value', type: 'text' as const, required: true, description: 'The value to set', placeholder: 'e.g. Done' }
      );
    } else if (action === 'customApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true, description: 'Relative endpoint path (e.g., /task/task_id)', placeholder: 'e.g. /team/123/task' },
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, default: 'GET', options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false, placeholder: '{ "key": "value" }' }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('clickup-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
