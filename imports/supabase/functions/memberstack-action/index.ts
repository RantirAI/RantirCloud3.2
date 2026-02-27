import { corsHeaders } from "../_shared/cors.ts";

const MEMBERSTACK_API_BASE = "https://admin.memberstack.com";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { secretKey, action, memberId, email, password, metadata } = await req.json();

    if (!secretKey) {
      throw new Error('Secret key is required');
    }

    console.log(`[Memberstack] Action: ${action}`);

    let url = MEMBERSTACK_API_BASE;
    let method = 'GET';
    let body: any = null;

    switch (action) {
      case 'get_member':
        if (!memberId) throw new Error('Member ID is required');
        url = `${MEMBERSTACK_API_BASE}/members/${memberId}`;
        break;

      case 'list_members':
        url = `${MEMBERSTACK_API_BASE}/members`;
        break;

      case 'create_member':
        if (!email || !password) throw new Error('Email and password are required');
        url = `${MEMBERSTACK_API_BASE}/members`;
        method = 'POST';
        body = {
          email,
          password,
          customFields: metadata ? JSON.parse(metadata) : {}
        };
        break;

      case 'update_member':
        if (!memberId) throw new Error('Member ID is required');
        url = `${MEMBERSTACK_API_BASE}/members/${memberId}`;
        method = 'PATCH';
        body = {
          ...(email && { email }),
          ...(metadata && { customFields: JSON.parse(metadata) })
        };
        break;

      case 'delete_member':
        if (!memberId) throw new Error('Member ID is required');
        url = `${MEMBERSTACK_API_BASE}/members/${memberId}`;
        method = 'DELETE';
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`[Memberstack] Request: ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers: {
        'x-api-key': secretKey,
        'Content-Type': 'application/json',
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[Memberstack] Error:', responseData);
      throw new Error(responseData.message || 'Memberstack API request failed');
    }

    console.log('[Memberstack] Success');

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[Memberstack] Error:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
