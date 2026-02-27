import { corsHeaders } from '../_shared/cors.ts';

const TRELLO_API_BASE = 'https://api.trello.com/1';

interface TrelloRequest {
  apiKey: string;
  token: string;
  action: string;
  inputs?: Record<string, any>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, token, action, inputs = {} }: TrelloRequest = await req.json();

    if (!apiKey || !token) {
      throw new Error('Trello API Key and Token are required');
    }

    console.log(`Trello Proxy: Processing action: ${action}`);

    const auth = `key=${apiKey}&token=${token}`;
    let url = '';
    let method = 'GET';
    let body = null;

    switch (action) {
      case 'create_card':
        url = `${TRELLO_API_BASE}/cards?${auth}`;
        method = 'POST';
        const cardParams = new URLSearchParams({
          name: inputs.name,
          idList: inputs.list_id,
          ...(inputs.desc && { desc: inputs.desc }),
          ...(inputs.pos && { pos: inputs.pos }),
          ...(inputs.due && { due: inputs.due }),
          ...(inputs.members && { idMembers: inputs.members }),
          ...(inputs.labels && { idLabels: inputs.labels })
        });
        body = cardParams.toString();
        break;

      case 'get_card':
        url = `${TRELLO_API_BASE}/cards/${inputs.card_id}?${auth}`;
        break;

      case 'create_board':
        url = `${TRELLO_API_BASE}/boards?${auth}`;
        method = 'POST';
        const boardParams = new URLSearchParams({
          name: inputs.name,
          ...(inputs.desc && { desc: inputs.desc }),
          ...(inputs.defaultLists !== undefined && { defaultLists: inputs.defaultLists.toString() }),
          ...(inputs.prefs_permissionLevel && { prefs_permissionLevel: inputs.prefs_permissionLevel })
        });
        body = boardParams.toString();
        break;

      case 'get_board':
        url = `${TRELLO_API_BASE}/boards/${inputs.board_id}?${auth}`;
        break;

      case 'get_lists':
        url = `${TRELLO_API_BASE}/boards/${inputs.board_id}/lists?${auth}`;
        break;

      case 'create_list':
        url = `${TRELLO_API_BASE}/lists?${auth}`;
        method = 'POST';
        const listParams = new URLSearchParams({
          name: inputs.name,
          idBoard: inputs.board_id,
          ...(inputs.pos && { pos: inputs.pos })
        });
        body = listParams.toString();
        break;

      case 'update_card':
        url = `${TRELLO_API_BASE}/cards/${inputs.card_id}?${auth}`;
        method = 'PUT';
        const updateParams = new URLSearchParams();
        Object.entries(inputs).forEach(([key, value]) => {
          if (key !== 'card_id' && value !== undefined) {
            updateParams.append(key, value as string);
          }
        });
        body = updateParams.toString();
        break;

      case 'delete_card':
        url = `${TRELLO_API_BASE}/cards/${inputs.card_id}?${auth}`;
        method = 'DELETE';
        break;

      case 'add_comment':
        url = `${TRELLO_API_BASE}/cards/${inputs.card_id}/actions/comments?${auth}`;
        method = 'POST';
        const commentParams = new URLSearchParams({
          text: inputs.text
        });
        body = commentParams.toString();
        break;

      case 'get_members':
        url = `${TRELLO_API_BASE}/boards/${inputs.board_id}/members?${auth}`;
        break;

      case 'custom_api':
        const endpoint = inputs.endpoint.startsWith('/') ? inputs.endpoint : `/${inputs.endpoint}`;
        url = `${TRELLO_API_BASE}${endpoint}?${auth}`;
        method = inputs.method || 'GET';
        
        if (inputs.params) {
          const params = typeof inputs.params === 'string' ? JSON.parse(inputs.params) : inputs.params;
          const urlParams = new URLSearchParams(url.split('?')[1] || '');
          Object.entries(params).forEach(([key, value]) => {
            urlParams.append(key, value as string);
          });
          url = `${url.split('?')[0]}?${urlParams.toString()}`;
        }
        
        if (inputs.body && ['POST', 'PUT'].includes(method)) {
          const bodyData = typeof inputs.body === 'string' ? JSON.parse(inputs.body) : inputs.body;
          const bodyParams = new URLSearchParams();
          Object.entries(bodyData).forEach(([key, value]) => {
            bodyParams.append(key, value as string);
          });
          body = bodyParams.toString();
        }
        break;

      default:
        throw new Error(`Unsupported Trello action: ${action}`);
    }

    console.log(`Trello Proxy: Making ${method} request to ${url}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Trello API Error:`, error);
      throw new Error(`Trello API error: ${response.status} ${error}`);
    }

    const data = await response.json();

    console.log(`Trello Proxy: Successfully processed ${action}`);

    return new Response(JSON.stringify({
      success: true,
      data,
      id: data.id,
      error: null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Trello Proxy Error:', error);
    return new Response(JSON.stringify({
      success: false,
      data: null,
      id: null,
      error: (error as Error).message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});