import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;
    const { action, connectionId, tableName, select = '*', filters = {}, limit = 100 } = await req.json();

    if (action !== 'readConnection') {
      return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!connectionId) {
      return new Response(JSON.stringify({ success: false, error: 'Connection ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify connection belongs to user
    const { data: connection, error: connError } = await supabaseClient
      .from('data_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ success: false, error: 'Connection not found or unauthorized' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the table project that contains the data
    const { data: tableProject, error: tableError } = await supabaseClient
      .from('table_projects')
      .select('records, schema')
      .eq('id', connection.table_project_id)
      .eq('user_id', userId)
      .single();

    if (tableError || !tableProject) {
      return new Response(JSON.stringify({ success: false, error: 'Table not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract records from the table project
    let records = (tableProject.records || []) as any[];

    // Apply filters
    if (filters && Object.keys(filters).length > 0) {
      const parsedFilters = typeof filters === 'string' ? JSON.parse(filters) : filters;
      records = records.filter(record => {
        return Object.entries(parsedFilters).every(([key, value]) => {
          if (value === undefined || value === null) return true;
          return record[key] === value;
        });
      });
    }

    // Apply limit
    const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    if (parsedLimit && parsedLimit > 0) {
      records = records.slice(0, parsedLimit);
    }

    // Update connection status and last_synced_at
    await supabaseClient
      .from('data_connections')
      .update({
        status: 'connected',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    return new Response(JSON.stringify({ 
      success: true, 
      data: records, 
      rowCount: records.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Connections proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
