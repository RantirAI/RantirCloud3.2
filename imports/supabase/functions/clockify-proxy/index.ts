import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, ...params } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'API key is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://api.clockify.me/api/v1';
    let endpoint = '';
    let method = 'GET';
    let body: any = null;

    const headers = {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    };

    switch (action) {
      case 'createTask':
        endpoint = `/workspaces/${params.workspaceId}/projects/${params.projectId}/tasks`;
        method = 'POST';
        body = {
          name: params.name,
          assigneeIds: params.assigneeIds ? params.assigneeIds.split(',').map((id: string) => id.trim()) : undefined,
          estimate: params.estimate || undefined,
          billable: params.billable,
        };
        break;

      case 'createTimeEntry':
        endpoint = `/workspaces/${params.workspaceId}/time-entries`;
        method = 'POST';
        body = {
          start: params.start,
          end: params.end,
          description: params.description,
          projectId: params.projectId || undefined,
          taskId: params.taskId || undefined,
          tagIds: params.tagIds ? params.tagIds.split(',').map((t: string) => t.trim()) : undefined,
          billable: params.billable,
        };
        break;

      case 'startTimer':
        endpoint = `/workspaces/${params.workspaceId}/time-entries`;
        method = 'POST';
        body = {
          start: new Date().toISOString(),
          description: params.description,
          projectId: params.projectId || undefined,
          taskId: params.taskId || undefined,
          tagIds: params.tagIds ? params.tagIds.split(',').map((t: string) => t.trim()) : undefined,
          billable: params.billable,
        };
        break;

      case 'stopTimer': {
        // Clockify requires PATCH to the user's time-entries endpoint with end time
        // Auto-fetch userId if not provided
        let stopUserId = params.userId;
        if (!stopUserId) {
          console.log('Clockify: userId not provided, fetching current user...');
          const userResponse = await fetch(`${baseUrl}/user`, { headers });
          const userData = await userResponse.json();
          stopUserId = userData.id;
          console.log(`Clockify: Auto-fetched userId: ${stopUserId}`);
        }
        endpoint = `/workspaces/${params.workspaceId}/user/${stopUserId}/time-entries`;
        method = 'PATCH';
        body = { end: new Date().toISOString() };
        break;
      }

      case 'findTask': {
        endpoint = `/workspaces/${params.workspaceId}/projects/${params.projectId}/tasks`;
        method = 'GET';
        // Will filter by name in response if provided
        break;
      }

      case 'findTimeEntry': {
        // Auto-fetch userId if not provided
        let findUserId = params.userId;
        if (!findUserId) {
          console.log('Clockify: userId not provided, fetching current user...');
          const userResponse = await fetch(`${baseUrl}/user`, { headers });
          const userData = await userResponse.json();
          findUserId = userData.id;
          console.log(`Clockify: Auto-fetched userId: ${findUserId}`);
        }
        const queryParams = new URLSearchParams();
        if (params.start) queryParams.append('start', params.start);
        if (params.end) queryParams.append('end', params.end);
        if (params.project) queryParams.append('project', params.project);
        if (params.description) queryParams.append('description', params.description);
        if (params.pageSize) queryParams.append('page-size', params.pageSize.toString());
        const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
        endpoint = `/workspaces/${params.workspaceId}/user/${findUserId}/time-entries${query}`;
        method = 'GET';
        break;
      }

      case 'findRunningTimer': {
        // Auto-fetch userId if not provided
        let runningUserId = params.userId;
        if (!runningUserId) {
          console.log('Clockify: userId not provided, fetching current user...');
          const userResponse = await fetch(`${baseUrl}/user`, { headers });
          const userData = await userResponse.json();
          runningUserId = userData.id;
          console.log(`Clockify: Auto-fetched userId: ${runningUserId}`);
        }
        endpoint = `/workspaces/${params.workspaceId}/user/${runningUserId}/time-entries?in-progress=true`;
        method = 'GET';
        break;
      }

      case 'getUser':
        // Get current user info
        endpoint = `/user`;
        method = 'GET';
        break;

      case 'getWorkspaces':
        endpoint = `/workspaces`;
        method = 'GET';
        break;

      case 'getProjects':
        endpoint = `/workspaces/${params.workspaceId}/projects`;
        method = 'GET';
        break;

      case 'getTags':
        endpoint = `/workspaces/${params.workspaceId}/tags`;
        method = 'GET';
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

    console.log(`Clockify: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    
    // Handle empty responses (204 No Content)
    let data;
    const contentType = response.headers.get('content-type');
    if (response.status === 204 || !contentType?.includes('application/json')) {
      data = { success: true };
    } else {
      data = await response.json();
    }

    if (!response.ok) {
      console.error('Clockify API error:', data);
      return new Response(JSON.stringify({ 
        success: false, 
        error: data.message || 'API request failed', 
        details: data 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Post-process for findTask with name filter
    let resultData = data;
    if (action === 'findTask' && params.name) {
      const tasks = Array.isArray(data) ? data : [];
      resultData = tasks.filter((t: any) => t.name.toLowerCase().includes(params.name.toLowerCase()));
    }

    // For findRunningTimer, return the first (and only) entry if it exists
    if (action === 'findRunningTimer') {
      resultData = Array.isArray(data) && data.length > 0 ? data[0] : null;
    }

    return new Response(JSON.stringify({ success: true, data: resultData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Clockify proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
