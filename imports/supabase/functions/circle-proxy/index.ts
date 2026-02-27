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

    const baseUrl = 'https://app.circle.so/api/v1';
    let endpoint = '';
    let method = 'GET';
    let body: any = null;

    switch (action) {
      case 'createPost':
        endpoint = `/posts?community_id=${params.communityId}`;
        method = 'POST';
        body = {
          space_id: params.spaceId,
          name: params.name,
          body: params.body,
          is_draft: params.isDraft || false,
        };
        break;

      case 'createComment':
        endpoint = `/posts/${params.postId}/comments?community_id=${params.communityId}`;
        method = 'POST';
        body = {
          body: params.body,
        };
        break;

      case 'addMemberToSpace':
        endpoint = `/spaces/${params.spaceId}/members?community_id=${params.communityId}`;
        method = 'POST';
        body = {
          community_member_id: params.memberId,
        };
        break;

      case 'findMemberByEmail':
        endpoint = `/community_members?community_id=${params.communityId}&email=${encodeURIComponent(params.email)}`;
        method = 'GET';
        break;

      case 'getPostDetails':
        endpoint = `/posts/${params.postId}?community_id=${params.communityId}`;
        method = 'GET';
        break;

      case 'getMemberDetails':
        endpoint = `/community_members/${params.memberId}?community_id=${params.communityId}`;
        method = 'GET';
        break;

      case 'createCustomApiCall':
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

    console.log(`Circle: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      console.error('Circle API error:', data);
      return new Response(JSON.stringify({ success: false, error: data.message || data.error || 'API request failed', details: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Circle proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
