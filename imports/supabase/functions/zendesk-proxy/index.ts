import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { getErrorMessage } from '../_shared/errors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subdomain, email, apiToken, action, inputs } = await req.json();

    console.log(`[Zendesk Proxy] Action: ${action}, Subdomain: ${subdomain}`);

    if (!subdomain || !email || !apiToken) {
      throw new Error('Subdomain, email, and API token are required');
    }

    let url: string;
    let method = 'GET';
    let body: any = null;

    // Build the API URL and method based on action
    switch (action) {
      case 'createTicket':
        url = `https://${subdomain}.zendesk.com/api/v2/tickets.json`;
        method = 'POST';
        body = {
          ticket: {
            subject: inputs.subject,
            comment: { body: inputs.description },
            priority: inputs.priority || 'normal',
            type: inputs.type || 'task',
            status: inputs.status || 'new',
            ...(inputs.assigneeId && { assignee_id: parseInt(inputs.assigneeId) }),
            ...(inputs.requesterId && { requester_id: parseInt(inputs.requesterId) }),
            ...(inputs.organizationId && { organization_id: parseInt(inputs.organizationId) }),
            ...(inputs.tags && { tags: inputs.tags.split(',').map((tag: string) => tag.trim()) }),
            ...(inputs.customFields && { custom_fields: JSON.parse(inputs.customFields) })
          }
        };
        break;

      case 'updateTicket':
        url = `https://${subdomain}.zendesk.com/api/v2/tickets/${inputs.ticketId}.json`;
        method = 'PUT';
        body = {
          ticket: {
            ...(inputs.subject && { subject: inputs.subject }),
            ...(inputs.priority && { priority: inputs.priority }),
            ...(inputs.type && { type: inputs.type }),
            ...(inputs.status && { status: inputs.status }),
            ...(inputs.assigneeId && { assignee_id: parseInt(inputs.assigneeId) }),
            ...(inputs.tags && { tags: inputs.tags.split(',').map((tag: string) => tag.trim()) }),
            ...(inputs.customFields && { custom_fields: JSON.parse(inputs.customFields) })
          }
        };
        break;

      case 'addComment':
        url = `https://${subdomain}.zendesk.com/api/v2/tickets/${inputs.ticketId}.json`;
        method = 'PUT';
        body = {
          ticket: {
            comment: {
              body: inputs.comment,
              public: inputs.isPublic !== false
            }
          }
        };
        break;

      case 'addTags':
        url = `https://${subdomain}.zendesk.com/api/v2/tickets/${inputs.ticketId}/tags.json`;
        method = 'PUT';
        body = {
          tags: inputs.tags.split(',').map((tag: string) => tag.trim())
        };
        break;

      case 'getTicket':
        url = `https://${subdomain}.zendesk.com/api/v2/tickets/${inputs.ticketId}.json`;
        break;

      case 'searchTickets':
        const searchQuery = encodeURIComponent(inputs.query);
        url = `https://${subdomain}.zendesk.com/api/v2/search.json?query=${searchQuery}`;
        break;

      case 'createUser':
        url = `https://${subdomain}.zendesk.com/api/v2/users.json`;
        method = 'POST';
        body = {
          user: {
            name: inputs.name,
            email: inputs.userEmail,
            ...(inputs.role && { role: inputs.role }),
            ...(inputs.phone && { phone: inputs.phone }),
            ...(inputs.organizationId && { organization_id: parseInt(inputs.organizationId) })
          }
        };
        break;

      case 'updateUser':
        url = `https://${subdomain}.zendesk.com/api/v2/users/${inputs.userId}.json`;
        method = 'PUT';
        body = {
          user: {
            ...(inputs.name && { name: inputs.name }),
            ...(inputs.userEmail && { email: inputs.userEmail }),
            ...(inputs.role && { role: inputs.role }),
            ...(inputs.phone && { phone: inputs.phone }),
            ...(inputs.organizationId && { organization_id: parseInt(inputs.organizationId) })
          }
        };
        break;

      case 'createOrganization':
        url = `https://${subdomain}.zendesk.com/api/v2/organizations.json`;
        method = 'POST';
        body = {
          organization: {
            name: inputs.organizationName || inputs.name,
            ...(inputs.notes && { notes: inputs.notes }),
            ...(inputs.details && { details: inputs.details })
          }
        };
        break;

      case 'updateOrganization':
        url = `https://${subdomain}.zendesk.com/api/v2/organizations/${inputs.organizationId}.json`;
        method = 'PUT';
        body = {
          organization: {
            ...(inputs.name && { name: inputs.name }),
            ...(inputs.notes && { notes: inputs.notes })
          }
        };
        break;

      case 'deleteUser':
        url = `https://${subdomain}.zendesk.com/api/v2/users/${inputs.userId}.json`;
        method = 'DELETE';
        break;

      case 'findOrganization':
        const orgName = encodeURIComponent(inputs.organizationName);
        url = `https://${subdomain}.zendesk.com/api/v2/organizations/search.json?name=${orgName}`;
        break;

      case 'findUser':
        const userEmail = encodeURIComponent(inputs.searchEmail);
        url = `https://${subdomain}.zendesk.com/api/v2/users/search.json?query=email:${userEmail}`;
        break;

      case 'customApiCall':
        // Strip /api/v2/ prefix if present to avoid duplication
        let endpoint = inputs.endpoint.trim();
        endpoint = endpoint.replace(/^\/+api\/v2\/+/, '').replace(/^\/+/, '');
        url = `https://${subdomain}.zendesk.com/api/v2/${endpoint}`;
        method = inputs.method;
        if (inputs.body && ['POST', 'PUT', 'PATCH'].includes(method)) {
          try {
            body = JSON.parse(inputs.body);
          } catch (parseError) {
            throw new Error(`Invalid JSON in request body: ${parseError.message}`);
          }
        }
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const credentials = btoa(`${email}/token:${apiToken}`);
    const headers: Record<string, string> = {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Lovable Flow Builder'
    };

    const response = await fetch(url, {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Zendesk Proxy] API Error ${response.status}: ${errorText}`);
      
      // Provide helpful error messages
      if (response.status === 401) {
        throw new Error('Authentication failed. Please verify your Admin Email and API Token are correct, and that API access is enabled in Zendesk Admin > Channels > API.');
      }
      
      if (response.status === 404) {
        throw new Error(`Resource not found. Please check the IDs or endpoint: ${url}`);
      }
      
      throw new Error(`Zendesk API error (${response.status}): ${errorText || response.statusText}`);
    }

    const result = await response.json();

    return new Response(JSON.stringify({
      result,
      ...(result.ticket && {
        ticketId: result.ticket.id,
        ticketUrl: result.ticket.url
      })
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in zendesk-proxy function:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});