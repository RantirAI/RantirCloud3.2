import { corsHeaders } from '../_shared/cors.ts';

const ASANA_API_BASE = 'https://app.asana.com/api/1.0';

interface AsanaRequest {
  accessToken: string;
  action: string;
  inputs?: Record<string, any>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessToken, action, inputs = {} }: AsanaRequest = await req.json();

    if (!accessToken) {
      throw new Error('Asana access token is required');
    }

    console.log(`Asana Proxy: Processing action: ${action}`);

    let url = '';
    let method = 'GET';
    let body = null;

    switch (action) {
      case 'create_task':
        url = `${ASANA_API_BASE}/tasks`;
        method = 'POST';
        const taskData = {
          name: inputs.name,
          projects: [inputs.project],
          ...(inputs.notes && { notes: inputs.notes }),
          ...(inputs.assignee && { assignee: inputs.assignee }),
          ...(inputs.due_on && { due_on: inputs.due_on }),
          ...(inputs.completed !== undefined && { completed: inputs.completed }),
          ...(inputs.tags && { tags: inputs.tags.split(',').map((t: string) => t.trim()) })
        };
        body = JSON.stringify({ data: taskData });
        break;

      case 'get_task':
        url = `${ASANA_API_BASE}/tasks/${inputs.task_gid}`;
        break;

      case 'update_task':
        url = `${ASANA_API_BASE}/tasks/${inputs.task_gid}`;
        method = 'PUT';
        const updateData = { ...inputs };
        delete updateData.task_gid;
        body = JSON.stringify({ data: updateData });
        break;

      case 'delete_task':
        url = `${ASANA_API_BASE}/tasks/${inputs.task_gid}`;
        method = 'DELETE';
        break;

      case 'create_project':
        url = `${ASANA_API_BASE}/projects`;
        method = 'POST';
        const projectData = {
          name: inputs.name,
          team: inputs.team,
          ...(inputs.notes && { notes: inputs.notes }),
          ...(inputs.public !== undefined && { public: inputs.public }),
          ...(inputs.color && { color: inputs.color })
        };
        body = JSON.stringify({ data: projectData });
        break;

      case 'get_project':
        url = `${ASANA_API_BASE}/projects/${inputs.project_gid}`;
        break;

      case 'get_project_tasks':
        url = `${ASANA_API_BASE}/projects/${inputs.project_gid}/tasks`;
        if (inputs.completed_since) {
          url += `?completed_since=${inputs.completed_since}`;
        }
        break;

      case 'get_workspaces':
        url = `${ASANA_API_BASE}/workspaces`;
        break;

      case 'get_workspace_projects':
        url = `${ASANA_API_BASE}/projects?workspace=${inputs.workspace_gid}`;
        break;

      case 'get_teams':
        url = `${ASANA_API_BASE}/teams?organization=${inputs.workspace_gid}`;
        break;

      case 'get_users':
        url = `${ASANA_API_BASE}/users?workspace=${inputs.workspace_gid}`;
        break;

      case 'create_subtask':
        url = `${ASANA_API_BASE}/tasks/${inputs.parent_task_gid}/subtasks`;
        method = 'POST';
        const subtaskData = {
          name: inputs.name,
          ...(inputs.notes && { notes: inputs.notes }),
          ...(inputs.assignee && { assignee: inputs.assignee }),
          ...(inputs.due_on && { due_on: inputs.due_on })
        };
        body = JSON.stringify({ data: subtaskData });
        break;

      case 'add_task_comment':
        url = `${ASANA_API_BASE}/attachments`;
        method = 'POST';
        const commentData = {
          parent: inputs.task_gid,
          text: inputs.text
        };
        body = JSON.stringify({ data: commentData });
        break;

      case 'custom_api_call':
        const endpoint = inputs.endpoint.startsWith('/') ? inputs.endpoint : `/${inputs.endpoint}`;
        url = `${ASANA_API_BASE}${endpoint}`;
        method = inputs.method || 'GET';
        
        // Add query parameters if provided
        if (inputs.params) {
          try {
            const params = typeof inputs.params === 'string' ? JSON.parse(inputs.params) : inputs.params;
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
              searchParams.append(key, value as string);
            });
            url += `?${searchParams.toString()}`;
          } catch (error) {
            throw new Error('Invalid JSON in query parameters');
          }
        }
        
        // Add request body for POST/PUT requests
        if (inputs.body && ['POST', 'PUT'].includes(method)) {
          try {
            const bodyData = typeof inputs.body === 'string' ? JSON.parse(inputs.body) : inputs.body;
            body = JSON.stringify({ data: bodyData });
          } catch (error) {
            throw new Error('Invalid JSON in request body');
          }
        }
        break;

      default:
        throw new Error(`Unsupported Asana action: ${action}`);
    }

    console.log(`Asana Proxy: Making ${method} request to ${url}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Asana API Error:`, error);
      throw new Error(`Asana API error: ${response.status} ${error}`);
    }

    const responseData = await response.json();

    console.log(`Asana Proxy: Successfully processed ${action}`);

    return new Response(JSON.stringify({
      success: true,
      data: responseData.data,
      gid: responseData.data?.gid,
      error: null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Asana Proxy Error:', error);
    return new Response(JSON.stringify({
      success: false,
      data: null,
      gid: null,
      error: (error as Error).message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});