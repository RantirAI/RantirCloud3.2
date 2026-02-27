import { corsHeaders } from '../_shared/cors.ts';

// Cursor Cloud Agents API
const CURSOR_API_BASE = 'https://api.cursor.com/v0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      action,
      apiKey,
      prompt,
      repository,
      ref,
      agentId,
      instruction
    } = body;

    console.log('Cursor proxy called with action:', action);

    if (!apiKey) {
      throw new Error('API key is required');
    }

    // Cursor uses Basic Auth with API key (key:)
    const authHeader = 'Basic ' + btoa(`${apiKey}:`);
    
    const headers = {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    };

    let result: Record<string, any> = {
      success: true,
      error: null,
    };

    switch (action) {
      case 'launchAgent': {
        if (!prompt) {
          throw new Error('Initial prompt is required');
        }
        if (!repository) {
          throw new Error('Repository is required (e.g., owner/repo)');
        }

        console.log('Launching Cursor agent for repository:', repository);

        const requestBody: Record<string, any> = {
          prompt: {
            text: prompt,
          },
          source: {
            repository: repository,
          },
        };

        if (ref) {
          requestBody.source.ref = ref;
        }

        const response = await fetch(`${CURSOR_API_BASE}/agents`, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Cursor API error [${response.status}]: ${errorText}`);
        }

        const data = await response.json();

        result = {
          success: true,
          agentId: data.id || data.agentId,
          status: data.status || 'launched',
          code: null,
          data: data,
          error: null,
        };
        break;
      }

      case 'addFollowupInstruction': {
        if (!agentId) {
          throw new Error('Agent ID is required');
        }
        if (!instruction) {
          throw new Error('Instruction is required');
        }

        console.log('Adding follow-up to agent:', agentId);

        const response = await fetch(`${CURSOR_API_BASE}/agents/${agentId}/followup`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            prompt: {
              text: instruction,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Cursor API error [${response.status}]: ${errorText}`);
        }

        const data = await response.json();

        result = {
          success: true,
          agentId,
          status: data.status || 'updated',
          code: data.code || null,
          data: data,
          error: null,
        };
        break;
      }

      case 'findAgentStatus': {
        if (!agentId) {
          throw new Error('Agent ID is required');
        }

        console.log('Finding agent status:', agentId);

        const response = await fetch(`${CURSOR_API_BASE}/agents/${agentId}`, {
          method: 'GET',
          headers,
        });

        if (response.status === 404) {
          result = {
            success: true,
            agentId,
            status: 'not_found',
            code: null,
            data: null,
            error: null,
          };
        } else if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Cursor API error [${response.status}]: ${errorText}`);
        } else {
          const data = await response.json();
          result = {
            success: true,
            agentId,
            status: data.status,
            code: data.code || null,
            data: data,
            error: null,
          };
        }
        break;
      }

      case 'deleteAgent': {
        if (!agentId) {
          throw new Error('Agent ID is required');
        }

        console.log('Deleting agent:', agentId);

        const response = await fetch(`${CURSOR_API_BASE}/agents/${agentId}`, {
          method: 'DELETE',
          headers,
        });

        if (response.status === 404) {
          result = {
            success: true,
            agentId,
            status: 'not_found',
            code: null,
            data: { deleted: false },
            error: null,
          };
        } else if (!response.ok && response.status !== 204) {
          const errorText = await response.text();
          throw new Error(`Cursor API error [${response.status}]: ${errorText}`);
        } else {
          result = {
            success: true,
            agentId,
            status: 'deleted',
            code: null,
            data: { deleted: true },
            error: null,
          };
        }
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('Cursor operation successful');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Cursor proxy error:', error.message);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
