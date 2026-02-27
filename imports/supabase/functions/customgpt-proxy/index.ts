import { corsHeaders } from '../_shared/cors.ts';

// CustomGPT API
const CUSTOMGPT_API_BASE = 'https://app.customgpt.ai/api/v1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      action,
      apiKey,
      projectId,
      projectName,
      sitemap,
      conversationId,
      message,
      prompt,
      sourceId,
      sourceUrl,
      fileName,
      fileContent,
      // Additional fields for new actions
      agentName,
      agentDescription,
      settings,
    } = body;

    console.log('CustomGPT proxy called with action:', action);

    if (!apiKey) throw new Error('API key is required');

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    let result: Record<string, any> = { success: true, error: null };

    // Helper for standard API call
    const apiCall = async (url: string, method: string, payload?: any) => {
      const opts: RequestInit = { method, headers };
      if (payload && ['POST', 'PUT', 'PATCH'].includes(method)) {
        opts.body = JSON.stringify(payload);
      }
      const response = await fetch(url, opts);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`CustomGPT API error [${response.status}]: ${errorText}`);
      }
      if (response.status === 204) return { success: true };
      return await response.json();
    };

    switch (action) {
      // Alias: frontend 'createAgent' -> POST /projects
      case 'createAgent':
      case 'createProject': {
        const name = agentName || projectName;
        if (!name) throw new Error('Agent/Project name is required');

        console.log('Creating CustomGPT project:', name);
        const payload: Record<string, any> = { project_name: name };
        if (sitemap) payload.sitemap_path = sitemap;
        if (agentDescription) payload.description = agentDescription;

        result.data = await apiCall(`${CUSTOMGPT_API_BASE}/projects`, 'POST', payload);
        break;
      }

      // Alias: frontend 'deleteAgent' -> DELETE /projects/{id}
      case 'deleteAgent':
      case 'deleteProject': {
        if (!projectId) throw new Error('Project ID is required');

        console.log('Deleting project:', projectId);
        result.data = await apiCall(`${CUSTOMGPT_API_BASE}/projects/${projectId}`, 'DELETE');
        result.data = { deleted: true, projectId };
        break;
      }

      // Frontend 'updateAgent' -> PUT /projects/{id}
      case 'updateAgent': {
        if (!projectId) throw new Error('Project ID is required');

        console.log('Updating agent:', projectId);
        const payload: Record<string, any> = {};
        if (agentName || projectName) payload.project_name = agentName || projectName;
        if (agentDescription) payload.description = agentDescription;

        result.data = await apiCall(`${CUSTOMGPT_API_BASE}/projects/${projectId}`, 'PUT', payload);
        break;
      }

      // Frontend 'updateSettings' -> PUT /projects/{id}/settings
      case 'updateSettings': {
        if (!projectId) throw new Error('Project ID is required');
        if (!settings) throw new Error('Settings object is required');

        console.log('Updating settings for project:', projectId);
        const settingsPayload = typeof settings === 'string' ? JSON.parse(settings) : settings;

        result.data = await apiCall(`${CUSTOMGPT_API_BASE}/projects/${projectId}/settings`, 'PUT', settingsPayload);
        break;
      }

      // Frontend 'createConversation' -> POST /projects/{id}/conversations
      case 'createConversation': {
        if (!projectId) throw new Error('Project ID is required');

        console.log('Creating conversation for project:', projectId);
        const payload: Record<string, any> = {};
        if (message || prompt) payload.prompt = message || prompt;

        result.data = await apiCall(`${CUSTOMGPT_API_BASE}/projects/${projectId}/conversations`, 'POST', payload);
        break;
      }

      // Frontend 'findConversation' -> GET /projects/{id}/conversations/{sessionId}
      case 'findConversation': {
        if (!projectId) throw new Error('Project ID is required');
        if (!conversationId) throw new Error('Conversation ID is required');

        console.log('Finding conversation:', conversationId);
        result.data = await apiCall(`${CUSTOMGPT_API_BASE}/projects/${projectId}/conversations/${conversationId}`, 'GET');
        break;
      }

      // Frontend 'exportConversation' -> GET /projects/{id}/conversations/{sessionId}/messages
      case 'exportConversation': {
        if (!projectId) throw new Error('Project ID is required');
        if (!conversationId) throw new Error('Conversation ID is required');

        console.log('Exporting conversation:', conversationId);
        result.data = await apiCall(`${CUSTOMGPT_API_BASE}/projects/${projectId}/conversations/${conversationId}/messages`, 'GET');
        break;
      }

      case 'sendMessage': {
        if (!projectId) throw new Error('Project ID is required');
        if (!message) throw new Error('Message is required');

        console.log('Sending message to project:', projectId);
        const payload: Record<string, any> = { prompt: message };
        if (conversationId) {
          result.data = await apiCall(`${CUSTOMGPT_API_BASE}/projects/${projectId}/conversations/${conversationId}/messages`, 'POST', payload);
        } else {
          // Create new conversation with initial message
          result.data = await apiCall(`${CUSTOMGPT_API_BASE}/projects/${projectId}/conversations`, 'POST', payload);
        }
        break;
      }

      case 'listProjects': {
        console.log('Listing CustomGPT projects');
        result.data = await apiCall(`${CUSTOMGPT_API_BASE}/projects`, 'GET');
        break;
      }

      case 'getProject': {
        if (!projectId) throw new Error('Project ID is required');
        console.log('Getting project:', projectId);
        result.data = await apiCall(`${CUSTOMGPT_API_BASE}/projects/${projectId}`, 'GET');
        break;
      }

      case 'listConversations': {
        if (!projectId) throw new Error('Project ID is required');
        console.log('Listing conversations for project:', projectId);
        result.data = await apiCall(`${CUSTOMGPT_API_BASE}/projects/${projectId}/conversations`, 'GET');
        break;
      }

      case 'listSources': {
        if (!projectId) throw new Error('Project ID is required');
        console.log('Listing sources for project:', projectId);
        result.data = await apiCall(`${CUSTOMGPT_API_BASE}/projects/${projectId}/sources`, 'GET');
        break;
      }

      case 'addSource': {
        if (!projectId) throw new Error('Project ID is required');
        if (!sourceUrl) throw new Error('Source URL is required');

        console.log('Adding source to project:', projectId);
        result.data = await apiCall(`${CUSTOMGPT_API_BASE}/projects/${projectId}/sources`, 'POST', { url: sourceUrl });
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('CustomGPT operation successful');
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('CustomGPT proxy error:', error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
