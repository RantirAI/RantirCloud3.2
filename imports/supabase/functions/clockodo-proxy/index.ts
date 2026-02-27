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
    const { email, apiKey, action, ...params } = await req.json();

    if (!email || !apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'Email and API token are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://my.clockodo.com/api';
    const authHeader = 'Basic ' + btoa(`${email}:${apiKey}`);
    let endpoint = '';
    let method = 'GET';
    let body: any = null;

    switch (action) {
      // User actions
      case 'getUsers':
        endpoint = '/v2/users';
        method = 'GET';
        break;

      case 'getUser':
        endpoint = `/v2/users/${params.usersId}`;
        method = 'GET';
        break;

      case 'createUser':
        endpoint = '/v2/users';
        method = 'POST';
        body = {
          name: params.name,
          email: params.email,
          role: params.role || 'user',
          teams_id: params.teamsId ? parseInt(params.teamsId) : undefined,
        };
        break;

      case 'updateUser':
        endpoint = `/v2/users/${params.usersId}`;
        method = 'PUT';
        body = {};
        if (params.name) body.name = params.name;
        if (params.role) body.role = params.role;
        if (params.teamsId) body.teams_id = parseInt(params.teamsId);
        break;

      case 'deleteUser':
        endpoint = `/v2/users/${params.usersId}`;
        method = 'DELETE';
        break;

      // Entry actions
      case 'createEntry':
        endpoint = '/v2/entries';
        method = 'POST';
        body = {
          customers_id: parseInt(params.customersId),
          projects_id: params.projectsId ? parseInt(params.projectsId) : undefined,
          services_id: parseInt(params.servicesId),
          users_id: parseInt(params.usersId),
          time_since: params.timeSince,
          time_until: params.timeUntil,
          text: params.text,
          billable: params.billable !== false ? 1 : 0,
        };
        break;

      case 'getEntry':
        endpoint = `/v2/entries/${params.entriesId}`;
        method = 'GET';
        break;

      case 'updateEntry':
        endpoint = `/v2/entries/${params.entriesId}`;
        method = 'PUT';
        body = {};
        if (params.customersId) body.customers_id = parseInt(params.customersId);
        if (params.projectsId) body.projects_id = parseInt(params.projectsId);
        if (params.servicesId) body.services_id = parseInt(params.servicesId);
        if (params.timeSince) body.time_since = params.timeSince;
        if (params.timeUntil) body.time_until = params.timeUntil;
        if (params.text) body.text = params.text;
        if (params.billable !== undefined) body.billable = params.billable ? 1 : 0;
        break;

      case 'deleteEntry':
        endpoint = `/v2/entries/${params.entriesId}`;
        method = 'DELETE';
        break;

      case 'getEntries': {
        const queryParams = new URLSearchParams();
        queryParams.append('time_since', params.timeSince);
        queryParams.append('time_until', params.timeUntil);
        if (params.filterUsersId) queryParams.append('filter[users_id]', params.filterUsersId);
        if (params.filterProjectsId) queryParams.append('filter[projects_id]', params.filterProjectsId);
        if (params.filterCustomersId) queryParams.append('filter[customers_id]', params.filterCustomersId);
        endpoint = `/v2/entries?${queryParams.toString()}`;
        method = 'GET';
        break;
      }

      // Customer actions
      case 'getCustomers':
        endpoint = '/v2/customers';
        method = 'GET';
        break;

      case 'getCustomer':
        endpoint = `/v2/customers/${params.customersId}`;
        method = 'GET';
        break;

      case 'createCustomer':
        endpoint = '/v2/customers';
        method = 'POST';
        body = {
          name: params.name,
          number: params.number || undefined,
          active: params.active !== false,
          billable_default: params.billableDefault !== false,
        };
        break;

      case 'updateCustomer':
        endpoint = `/v2/customers/${params.customersId}`;
        method = 'PUT';
        body = {};
        if (params.name) body.name = params.name;
        if (params.number) body.number = params.number;
        if (params.active !== undefined) body.active = params.active;
        break;

      case 'deleteCustomer':
        endpoint = `/v2/customers/${params.customersId}`;
        method = 'DELETE';
        break;

      // Project actions
      case 'getProjects':
        endpoint = '/v2/projects';
        method = 'GET';
        break;

      case 'getProject':
        endpoint = `/v2/projects/${params.projectsId}`;
        method = 'GET';
        break;

      case 'createProject':
        endpoint = '/v2/projects';
        method = 'POST';
        body = {
          name: params.name,
          customers_id: parseInt(params.customersId),
          number: params.number || undefined,
          active: params.active !== false,
          billable_default: params.billableDefault !== false,
        };
        break;

      case 'updateProject':
        endpoint = `/v2/projects/${params.projectsId}`;
        method = 'PUT';
        body = {};
        if (params.name) body.name = params.name;
        if (params.customersId) body.customers_id = parseInt(params.customersId);
        if (params.number) body.number = params.number;
        if (params.active !== undefined) body.active = params.active;
        break;

      case 'deleteProject':
        endpoint = `/v2/projects/${params.projectsId}`;
        method = 'DELETE';
        break;

      // Service actions
      case 'getServices':
        endpoint = '/v2/services';
        method = 'GET';
        break;

      case 'getService':
        endpoint = `/v2/services/${params.servicesId}`;
        method = 'GET';
        break;

      case 'createService':
        endpoint = '/v2/services';
        method = 'POST';
        body = {
          name: params.name,
          number: params.number || undefined,
          active: params.active !== false,
        };
        break;

      case 'updateService':
        endpoint = `/v2/services/${params.servicesId}`;
        method = 'PUT';
        body = {};
        if (params.name) body.name = params.name;
        if (params.number) body.number = params.number;
        if (params.active !== undefined) body.active = params.active;
        break;

      case 'deleteService':
        endpoint = `/v2/services/${params.servicesId}`;
        method = 'DELETE';
        break;

      // Team actions
      case 'getTeams':
        endpoint = '/v2/teams';
        method = 'GET';
        break;

      case 'getTeam':
        endpoint = `/v2/teams/${params.teamsId}`;
        method = 'GET';
        break;

      // Absence actions
      case 'getAbsences': {
        const queryParams = new URLSearchParams();
        if (params.year) queryParams.append('year', params.year.toString());
        if (params.filterUsersId) queryParams.append('filter[users_id]', params.filterUsersId);
        const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
        endpoint = `/v2/absences${query}`;
        method = 'GET';
        break;
      }

      case 'getAbsence':
        endpoint = `/v2/absences/${params.absencesId}`;
        method = 'GET';
        break;

      case 'createAbsence':
        endpoint = '/v2/absences';
        method = 'POST';
        body = {
          users_id: parseInt(params.usersId),
          date_since: params.dateSince,
          date_until: params.dateUntil,
          type: params.type,
          note: params.note || undefined,
        };
        break;

      case 'updateAbsence':
        endpoint = `/v2/absences/${params.absencesId}`;
        method = 'PUT';
        body = {};
        if (params.dateSince) body.date_since = params.dateSince;
        if (params.dateUntil) body.date_until = params.dateUntil;
        if (params.type) body.type = params.type;
        if (params.note) body.note = params.note;
        break;

      case 'deleteAbsence':
        endpoint = `/v2/absences/${params.absencesId}`;
        method = 'DELETE';
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

    console.log(`Clockodo: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'X-Clockodo-External-Application': 'Rantir;integrations@rantir.com',
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      console.error('Clockodo API error:', data);
      return new Response(JSON.stringify({ 
        success: false, 
        error: data.error?.message || 'API request failed', 
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
    console.error('Clockodo proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
