import { corsHeaders } from "../_shared/cors.ts";

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const tokenRes = await fetch('https://api.helpscout.net/v2/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error('[HelpScout] OAuth token error:', tokenRes.status, errText);
    throw new Error(`Failed to obtain Help Scout access token (${tokenRes.status})`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, clientSecret, apiKey, action, ...params } = await req.json();

    // Support both new OAuth flow and legacy apiKey for backwards compat
    let accessToken: string;
    if (clientId && clientSecret) {
      accessToken = await getAccessToken(clientId, clientSecret);
    } else if (apiKey) {
      accessToken = apiKey;
    } else {
      throw new Error("Help Scout Client ID and Client Secret are required");
    }

    const baseUrl = 'https://api.helpscout.net';
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    let response: Response;

    console.log('[HelpScout] Action:', action);

    switch (action) {
      case 'createConversation': {
        response = await fetch(`${baseUrl}/v2/conversations`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            subject: params.subject,
            status: params.status || 'active',
            type: 'email',
            mailboxId: parseInt(params.mailboxId),
            customer: { email: params.customerEmail },
            threads: [{ type: 'customer', customer: { email: params.customerEmail }, text: params.text }],
          }),
        });
        break;
      }

      case 'sendReply': {
        if (!params.conversationId) throw new Error('Conversation ID is required');
        const replyBody: Record<string, any> = { text: params.text };
        if (params.customerId) replyBody.customer = { id: parseInt(params.customerId) };
        response = await fetch(`${baseUrl}/v2/conversations/${params.conversationId}/reply`, {
          method: 'POST',
          headers,
          body: JSON.stringify(replyBody),
        });
        break;
      }

      case 'addNote': {
        if (!params.conversationId) throw new Error('Conversation ID is required');
        response = await fetch(`${baseUrl}/v2/conversations/${params.conversationId}/notes`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ text: params.text }),
        });
        break;
      }

      case 'createCustomer': {
        response = await fetch(`${baseUrl}/v2/customers`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            firstName: params.firstName,
            lastName: params.lastName || '',
            emails: [{ type: 'work', value: params.email }],
          }),
        });
        break;
      }

      case 'updateCustomerProperties': {
        if (!params.customerId) throw new Error('Customer ID is required');
        const patches: Array<{op: string; path: string; value: any}> = [];
        if (params.firstName) patches.push({ op: 'replace', path: '/firstName', value: params.firstName });
        if (params.lastName) patches.push({ op: 'replace', path: '/lastName', value: params.lastName });
        if (params.phone) patches.push({ op: 'add', path: '/phones', value: [{ type: 'work', value: params.phone }] });
        if (params.company) patches.push({ op: 'replace', path: '/company', value: params.company });
        if (params.jobTitle) patches.push({ op: 'replace', path: '/jobTitle', value: params.jobTitle });

        response = await fetch(`${baseUrl}/v2/customers/${params.customerId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(patches),
        });
        break;
      }

      case 'findConversation': {
        if (params.conversationId) {
          response = await fetch(`${baseUrl}/v2/conversations/${params.conversationId}`, { headers });
        } else {
          const queryParams = new URLSearchParams();
          if (params.query) queryParams.set('query', `(subject:"${params.query}")`);
          if (params.mailboxId) queryParams.set('mailbox', params.mailboxId);
          if (params.status && params.status !== 'all') queryParams.set('status', params.status);
          const qs = queryParams.toString();
          response = await fetch(`${baseUrl}/v2/conversations${qs ? '?' + qs : ''}`, { headers });
        }
        break;
      }

      case 'findCustomer': {
        if (params.customerId) {
          response = await fetch(`${baseUrl}/v2/customers/${params.customerId}`, { headers });
        } else if (params.email) {
          response = await fetch(`${baseUrl}/v2/customers?query=(email:"${params.email}")`, { headers });
        } else {
          response = await fetch(`${baseUrl}/v2/customers`, { headers });
        }
        break;
      }

      case 'findUser': {
        if (params.userId) {
          response = await fetch(`${baseUrl}/v2/users/${params.userId}`, { headers });
        } else if (params.email) {
          response = await fetch(`${baseUrl}/v2/users?email=${encodeURIComponent(params.email)}`, { headers });
        } else {
          response = await fetch(`${baseUrl}/v2/users`, { headers });
        }
        break;
      }

      case 'createCustomApiCall': {
        const method = params.method || 'GET';
        const path = params.path;
        if (!path) throw new Error('API path is required');

        const fetchOptions: RequestInit = { method, headers };
        if (params.body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          fetchOptions.body = typeof params.body === 'string' ? params.body : JSON.stringify(params.body);
        }

        response = await fetch(`${baseUrl}${path}`, fetchOptions);
        break;
      }

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    if (!response!.ok) {
      const errorText = await response!.text();
      console.error('[HelpScout] API error:', response!.status, errorText);
      return new Response(JSON.stringify({ error: errorText, status: 'error', statusCode: response!.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = response!.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const result = await response!.json();
      return new Response(JSON.stringify({ ...result, status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ status: 'ok', message: 'Operation completed successfully', location: response!.headers.get('Location') }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[HelpScout] Proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
