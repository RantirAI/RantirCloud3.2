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
    const { apiKey, workspaceSubdomain, workspaceId, action, ...params } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'Access token is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!workspaceSubdomain) {
      return new Response(JSON.stringify({ success: false, error: 'Workspace subdomain is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!workspaceId) {
      return new Response(JSON.stringify({ success: false, error: 'Workspace ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = `https://${workspaceSubdomain}.myclickfunnels.com/api/v2`;
    let endpoint = '';
    let method = 'GET';
    let body: any = null;

    switch (action) {
      case 'createOpportunity':
        endpoint = `/workspaces/${workspaceId}/opportunities`;
        method = 'POST';
        body = {
          opportunity: {
            contact_id: params.contactId,
            pipeline_id: params.pipelineId,
            stage_id: params.stageId,
            name: params.name,
            value: params.value,
          },
        };
        break;

      case 'applyTagToContact':
        endpoint = `/contacts/${params.contactId}/applied_tags`;
        method = 'POST';
        body = {
          applied_tag: {
            tag_id: params.tagId,
          },
        };
        break;

      case 'removeTagFromContact':
        endpoint = `/contacts/${params.contactId}/applied_tags/${params.appliedTagId}`;
        method = 'DELETE';
        break;

      case 'enrollContactIntoCourse':
        endpoint = `/workspaces/${workspaceId}/courses/${params.courseId}/enrollments`;
        method = 'POST';
        body = {
          enrollment: {
            contact_id: params.contactId,
          },
        };
        break;

      case 'updateOrCreateContact': {
        // First try to find the contact by email
        const searchEndpoint = `/workspaces/${workspaceId}/contacts?filter[email]=${encodeURIComponent(params.email)}`;
        const searchResponse = await fetch(`${baseUrl}${searchEndpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });
        const searchData = await searchResponse.json();
        
        const contactData: any = {
          email_address: params.email,
        };
        if (params.firstName) contactData.first_name = params.firstName;
        if (params.lastName) contactData.last_name = params.lastName;
        if (params.phone) contactData.phone_number = params.phone;
        if (params.tags) contactData.tags = params.tags.split(',').map((t: string) => t.trim());

        if (searchData.data && searchData.data.length > 0) {
          // Update existing contact
          const contactId = searchData.data[0].id;
          endpoint = `/contacts/${contactId}`;
          method = 'PUT';
          body = { contact: contactData };
        } else {
          // Create new contact
          endpoint = `/workspaces/${workspaceId}/contacts`;
          method = 'POST';
          body = { contact: contactData };
        }
        break;
      }

      case 'searchContacts': {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.append('per_page', params.limit.toString());
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.email) queryParams.append('filter[email]', params.email);
        if (params.firstName) queryParams.append('filter[first_name]', params.firstName);
        if (params.lastName) queryParams.append('filter[last_name]', params.lastName);
        endpoint = `/workspaces/${workspaceId}/contacts?${queryParams.toString()}`;
        method = 'GET';
        break;
      }

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

    console.log(`ClickFunnels: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      console.error('ClickFunnels API error:', data);
      return new Response(JSON.stringify({ 
        success: false, 
        error: data.message || data.error || 'API request failed', 
        details: data 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ClickFunnels proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
