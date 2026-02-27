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
    const { apiKey, email, action, ...params } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'API key is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!email) {
      return new Response(JSON.stringify({ success: false, error: 'User email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://api.copper.com/developer_api/v1';
    let endpoint = '';
    let method = 'GET';
    let body: any = null;

    switch (action) {
      // Person actions
      case 'createPerson':
        endpoint = '/people';
        method = 'POST';
        body = {
          name: params.name,
          emails: params.personEmail ? [{ email: params.personEmail, category: 'work' }] : undefined,
          phone_numbers: params.phone ? [{ number: params.phone, category: 'work' }] : undefined,
          title: params.title || undefined,
          company_id: params.companyId ? parseInt(params.companyId) : undefined,
          details: params.details || undefined,
        };
        break;

      case 'updatePerson':
        endpoint = `/people/${params.personId}`;
        method = 'PUT';
        body = {};
        if (params.name) body.name = params.name;
        if (params.personEmail) body.emails = [{ email: params.personEmail, category: 'work' }];
        if (params.phone) body.phone_numbers = [{ number: params.phone, category: 'work' }];
        if (params.title) body.title = params.title;
        break;

      case 'searchForAPerson':
        endpoint = '/people/search';
        method = 'POST';
        body = {
          page_size: params.pageSize || 20,
        };
        if (params.name) body.name = params.name;
        if (params.personEmail) body.emails = [params.personEmail];
        if (params.phone) body.phone_numbers = [params.phone];
        break;

      // Lead actions
      case 'createLead':
        endpoint = '/leads';
        method = 'POST';
        body = {
          name: params.name,
          email: params.leadEmail ? { email: params.leadEmail, category: 'work' } : undefined,
          phone_numbers: params.phone ? [{ number: params.phone, category: 'work' }] : undefined,
          company_name: params.companyName || undefined,
          title: params.title || undefined,
          details: params.details || undefined,
          monetary_value: params.monetaryValue || undefined,
        };
        break;

      case 'updateLead':
        endpoint = `/leads/${params.leadId}`;
        method = 'PUT';
        body = {};
        if (params.name) body.name = params.name;
        if (params.leadEmail) body.email = { email: params.leadEmail, category: 'work' };
        if (params.status) body.status = params.status;
        break;

      case 'convertLead':
        endpoint = `/leads/${params.leadId}/convert`;
        method = 'POST';
        body = {
          details: {
            person: params.personDetails ? JSON.parse(params.personDetails) : undefined,
            company: params.companyDetails ? JSON.parse(params.companyDetails) : undefined,
            opportunity: params.opportunityDetails ? JSON.parse(params.opportunityDetails) : undefined,
          },
        };
        break;

      case 'searchForALead':
        endpoint = '/leads/search';
        method = 'POST';
        body = {
          page_size: params.pageSize || 20,
        };
        if (params.name) body.name = params.name;
        if (params.leadEmail) body.emails = [params.leadEmail];
        if (params.phone) body.phone_numbers = [params.phone];
        break;

      // Company actions
      case 'createCompany':
        endpoint = '/companies';
        method = 'POST';
        body = {
          name: params.name,
          website: params.website || undefined,
          phone_numbers: params.phone ? [{ number: params.phone, category: 'work' }] : undefined,
          address: params.address ? JSON.parse(params.address) : undefined,
          details: params.details || undefined,
        };
        break;

      case 'updateCompany':
        endpoint = `/companies/${params.companyId}`;
        method = 'PUT';
        body = {};
        if (params.name) body.name = params.name;
        if (params.website) body.website = params.website;
        if (params.phone) body.phone_numbers = [{ number: params.phone, category: 'work' }];
        break;

      case 'searchForACompany':
        endpoint = '/companies/search';
        method = 'POST';
        body = {
          page_size: params.pageSize || 20,
        };
        if (params.name) body.name = params.name;
        if (params.website) body.website = params.website;
        break;

      // Opportunity actions
      case 'createOpportunity':
        endpoint = '/opportunities';
        method = 'POST';
        body = {
          name: params.name,
          monetary_value: params.monetaryValue || undefined,
          pipeline_id: params.pipelineId ? parseInt(params.pipelineId) : undefined,
          pipeline_stage_id: params.stageId ? parseInt(params.stageId) : undefined,
          close_date: params.closeDate || undefined,
          primary_contact_id: params.primaryContactId ? parseInt(params.primaryContactId) : undefined,
          company_id: params.companyId ? parseInt(params.companyId) : undefined,
        };
        break;

      case 'updateOpportunity':
        endpoint = `/opportunities/${params.opportunityId}`;
        method = 'PUT';
        body = {};
        if (params.name) body.name = params.name;
        if (params.monetaryValue) body.monetary_value = params.monetaryValue;
        if (params.stageId) body.pipeline_stage_id = parseInt(params.stageId);
        if (params.status) body.status = params.status;
        break;

      case 'searchForAnOpportunity':
        endpoint = '/opportunities/search';
        method = 'POST';
        body = {
          page_size: params.pageSize || 20,
        };
        if (params.name) body.name = params.name;
        if (params.pipelineId) body.pipeline_ids = [parseInt(params.pipelineId)];
        if (params.status) body.status_ids = [params.status];
        break;

      // Project actions
      case 'createProject':
        endpoint = '/projects';
        method = 'POST';
        body = {
          name: params.name,
          status: params.status || 'Open',
          details: params.details || undefined,
        };
        break;

      case 'updateProject':
        endpoint = `/projects/${params.projectId}`;
        method = 'PUT';
        body = {};
        if (params.name) body.name = params.name;
        if (params.status) body.status = params.status;
        break;

      case 'searchForAProject':
        endpoint = '/projects/search';
        method = 'POST';
        body = {
          page_size: params.pageSize || 20,
        };
        if (params.name) body.name = params.name;
        if (params.status) body.statuses = [params.status];
        break;

      // Task actions
      case 'createTask':
        endpoint = '/tasks';
        method = 'POST';
        body = {
          name: params.name,
          due_date: params.dueDate || undefined,
          priority: params.priority || 'None',
          details: params.details || undefined,
        };
        if (params.relatedResourceType && params.relatedResourceId) {
          body.related_resource = {
            type: params.relatedResourceType,
            id: parseInt(params.relatedResourceId),
          };
        }
        break;

      // Activity actions
      case 'createActivity':
        endpoint = '/activities';
        method = 'POST';
        body = {
          type: { category: params.activityType },
          details: params.details,
          parent: {
            type: params.parentType,
            id: parseInt(params.parentId),
          },
        };
        break;

      case 'searchForAnActivity':
        endpoint = '/activities/search';
        method = 'POST';
        body = {
          page_size: params.pageSize || 20,
        };
        if (params.parentType && params.parentId) {
          body.parent = {
            type: params.parentType,
            id: parseInt(params.parentId),
          };
        }
        if (params.activityType) body.activity_types = [{ category: params.activityType }];
        break;

      // Custom API
      case 'createCustomApiCall':
        endpoint = params.endpoint || '/';
        method = params.method || 'GET';
        body = params.body ? JSON.parse(params.body) : null;
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Copper: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'X-PW-AccessToken': apiKey,
        'X-PW-Application': 'developer_api',
        'X-PW-UserEmail': email,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    
    const contentType = response.headers.get('content-type');
    const isJsonResponse = contentType && (contentType.includes('application/json') || contentType.includes('+json'));
    
    if (!isJsonResponse) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (!response.ok) {
          console.error('Copper API error:', data);
          return new Response(JSON.stringify({ success: false, error: data.message || data.error || 'API request failed', details: data }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ success: true, data, id: data.id?.toString() || null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch {
        console.error('Copper API - Non-JSON response:', text.substring(0, 500));
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'API returned non-JSON response',
          details: text.substring(0, 200)
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    const data = await response.json();

    if (!response.ok) {
      console.error('Copper API error:', data);
      return new Response(JSON.stringify({ success: false, error: data.message || data.error || 'API request failed', details: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract items for search results
    let items = null;
    if (Array.isArray(data)) {
      items = data;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data,
      id: data.id?.toString() || null,
      items,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Copper proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
