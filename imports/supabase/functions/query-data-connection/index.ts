import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueryRequest {
  connectionId: string;
  tableName: string;
  select?: string;
  filters?: Record<string, any>;
  limit?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[QUERY-DATA-CONNECTION] Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
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
      console.error('[QUERY-DATA-CONNECTION] Auth error', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;

    const { connectionId, tableName, select = '*', filters = {}, limit = 100 }: QueryRequest = await req.json();

    console.log('Querying connection:', { connectionId, tableName, select, filters, limit, userId });

    // Verify connection belongs to user
    const { data: connection, error: connError } = await supabaseClient
      .from('data_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: 'Connection not found or unauthorized' }), {
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
      console.error('Table project not found:', tableError);
      return new Response(JSON.stringify({ error: 'Table not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract records from the table project
    let records = (tableProject.records || []) as any[];

    // Apply filters
    if (filters && Object.keys(filters).length > 0) {
      records = records.filter(record => {
        return Object.entries(filters).every(([key, value]) => {
          if (value === undefined || value === null) return true;
          return record[key] === value;
        });
      });
    }

    // Apply limit
    if (limit && limit > 0) {
      records = records.slice(0, limit);
    }

    const data = records;

    // Update connection status and last_synced_at
    await supabaseClient
      .from('data_connections')
      .update({
        status: 'connected',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    console.log('Query successful, rows returned:', data?.length || 0);

    return new Response(JSON.stringify({ data, rowCount: data?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in query-data-connection function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
