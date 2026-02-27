import { NodePlugin } from '@/types/node-plugin';

export const cursorNode: NodePlugin = {
  type: 'cursor',
  name: 'Cursor',
  description: 'Interact with Cursor Cloud Agents API',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/cursor.png',
  color: '#000000',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Cursor API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Launch Agent', value: 'launchAgent', description: 'Start a new Cursor agent on a repository' },
        { label: 'Add Followup Instruction', value: 'addFollowupInstruction', description: 'Add a follow-up instruction to an existing agent' },
        { label: 'Find Agent Status', value: 'findAgentStatus', description: 'Get the status of an agent' },
        { label: 'Delete Agent', value: 'deleteAgent', description: 'Delete an agent' },
      ],
      description: 'Choose the Cursor operation',
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    if (action === 'launchAgent') {
      dynamicInputs.push(
        {
          name: 'repository',
          label: 'Repository',
          type: 'text',
          required: true,
          description: 'GitHub repository in owner/repo format',
          placeholder: 'owner/repository',
        },
        {
          name: 'ref',
          label: 'Branch/Ref (optional)',
          type: 'text',
          required: false,
          description: 'Git branch, tag, or commit SHA',
          placeholder: 'main',
        },
        {
          name: 'prompt',
          label: 'Prompt',
          type: 'textarea',
          required: true,
          description: 'The instruction for the agent',
          placeholder: 'Add a dark mode toggle to the settings page',
        }
      );
    }

    if (action === 'addFollowupInstruction') {
      dynamicInputs.push(
        {
          name: 'agentId',
          label: 'Agent ID',
          type: 'text',
          required: true,
          description: 'The ID of the agent',
          placeholder: 'agent_xxxxxxxx',
        },
        {
          name: 'instruction',
          label: 'Follow-up Instruction',
          type: 'textarea',
          required: true,
          description: 'Additional instruction for the agent',
          placeholder: 'Also update the documentation',
        }
      );
    }

    if (action === 'findAgentStatus') {
      dynamicInputs.push({
        name: 'agentId',
        label: 'Agent ID',
        type: 'text',
        required: true,
        description: 'The ID of the agent',
        placeholder: 'agent_xxxxxxxx',
      });
    }

    if (action === 'deleteAgent') {
      dynamicInputs.push({
        name: 'agentId',
        label: 'Agent ID',
        type: 'text',
        required: true,
        description: 'The ID of the agent to delete',
        placeholder: 'agent_xxxxxxxx',
      });
    }

    return dynamicInputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'agentId', type: 'string', description: 'Agent ID' },
    { name: 'status', type: 'string', description: 'Agent status' },
    { name: 'code', type: 'string', description: 'Generated code (if available)' },
    { name: 'data', type: 'object', description: 'Full response data' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        'https://appdmmjexevclmpyvtss.supabase.co/functions/v1/cursor-proxy',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(inputs),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        agentId: result.agentId,
        status: result.status,
        code: result.code,
        data: result.data,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        agentId: null,
        status: null,
        code: null,
        data: null,
        error: error.message,
      };
    }
  },
};
