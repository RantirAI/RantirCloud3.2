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
      return new Response(JSON.stringify({ success: false, error: 'API key is required. Generate one at https://coda.io/account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://coda.io/apis/v1';
    let endpoint = '';
    let method = 'GET';
    let body: any = null;

    switch (action) {
      case 'listDocs':
        endpoint = '/docs';
        if (params.query || params.isOwner) {
          const queryParams = new URLSearchParams();
          if (params.query) queryParams.append('query', params.query);
          if (params.isOwner === 'true') queryParams.append('isOwner', 'true');
          endpoint += `?${queryParams.toString()}`;
        }
        break;

      case 'getDoc':
        if (!params.docId) {
          return new Response(JSON.stringify({ success: false, error: 'Doc ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        endpoint = `/docs/${params.docId}`;
        break;

      case 'createDoc':
        endpoint = '/docs';
        method = 'POST';
        body = {
          title: params.title,
          sourceDoc: params.sourceDoc || undefined,
          folderId: params.folderId || undefined,
        };
        break;

      case 'listTables':
        endpoint = `/docs/${params.docId}/tables`;
        break;

      case 'getTable':
        endpoint = `/docs/${params.docId}/tables/${params.tableId}`;
        break;

      case 'listRows':
        endpoint = `/docs/${params.docId}/tables/${params.tableId}/rows`;
        if (params.query) {
          endpoint += `?query=${encodeURIComponent(params.query)}`;
        }
        break;

      case 'createRow':
        endpoint = `/docs/${params.docId}/tables/${params.tableId}/rows`;
        method = 'POST';
        const cells = typeof params.cells === 'string' ? JSON.parse(params.cells) : params.cells;
        body = {
          rows: [{ cells }],
        };
        break;

      case 'updateRow':
        endpoint = `/docs/${params.docId}/tables/${params.tableId}/rows/${params.rowId}`;
        method = 'PUT';
        const updateCells = typeof params.cells === 'string' ? JSON.parse(params.cells) : params.cells;
        body = {
          row: {
            cells: updateCells,
          },
        };
        break;

      case 'upsertRow':
        endpoint = `/docs/${params.docId}/tables/${params.tableId}/rows`;
        method = 'POST';
        const upsertCells = typeof params.cells === 'string' ? JSON.parse(params.cells) : params.cells;
        const keyColumns = typeof params.keyColumns === 'string' ? JSON.parse(params.keyColumns) : params.keyColumns;
        body = {
          rows: [{ cells: upsertCells }],
          keyColumns: keyColumns,
        };
        break;

      case 'findRow':
        endpoint = `/docs/${params.docId}/tables/${params.tableId}/rows`;
        if (params.query) {
          endpoint += `?query=${encodeURIComponent(params.query)}`;
        }
        break;

      case 'getRow':
        endpoint = `/docs/${params.docId}/tables/${params.tableId}/rows/${params.rowId}`;
        break;

      case 'deleteRow':
        endpoint = `/docs/${params.docId}/tables/${params.tableId}/rows/${params.rowId}`;
        method = 'DELETE';
        break;

      case 'listColumns':
        endpoint = `/docs/${params.docId}/tables/${params.tableId}/columns`;
        break;

      case 'listFormulas':
        endpoint = `/docs/${params.docId}/formulas`;
        break;

      case 'getFormula':
        endpoint = `/docs/${params.docId}/formulas/${params.formulaId}`;
        break;

      case 'listControls':
        endpoint = `/docs/${params.docId}/controls`;
        break;

      case 'createCustomApiCall':
        endpoint = params.endpoint;
        method = params.method || 'GET';
        body = params.body ? (typeof params.body === 'string' ? JSON.parse(params.body) : params.body) : null;
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Coda: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET' && method !== 'DELETE') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    
    // Handle DELETE which may not return JSON
    if (method === 'DELETE' && response.status === 202) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Row deletion queued for processing',
        rowId: params.rowId,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();

    if (!response.ok) {
      console.error('Coda API error:', data);
      
      let errorMessage = data.message || data.error || 'API request failed';
      
      // Add helpful context for common errors
      if (response.status === 404) {
        if (errorMessage.toLowerCase().includes('doc') && errorMessage.toLowerCase().includes('not exist')) {
          errorMessage += '. Tips: 1) Use "List Docs" action to find available docs, 2) Check that your API token has access to this doc, 3) Verify the Doc ID from your Coda URL (coda.io/d/Doc-Name_<docId>)';
        } else if (errorMessage.toLowerCase().includes('table')) {
          errorMessage += '. Use "List Tables" action to find available tables in this doc.';
        } else if (errorMessage.toLowerCase().includes('row')) {
          errorMessage += '. Use "List Rows" or "Find Row" action to find available rows.';
        } else if (errorMessage.toLowerCase().includes('column')) {
          errorMessage += '. Use "List Columns" action to find available columns in this table.';
        }
      } else if (response.status === 401) {
        errorMessage += '. Your API token may be invalid or expired. Generate a new token at https://coda.io/account';
      } else if (response.status === 403) {
        errorMessage += '. Your API token does not have access to this resource. Check the doc sharing settings or generate a new token with proper permissions.';
      } else if (response.status === 429) {
        errorMessage += '. Rate limit exceeded. Please wait a moment and try again.';
      }
      
      return new Response(JSON.stringify({
        success: false,
        error: errorMessage,
        details: data,
        statusCode: response.status,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle specific action responses
    if (action === 'listDocs') {
      return new Response(JSON.stringify({
        success: true,
        data,
        docs: data.items || [],
        count: data.items?.length || 0,
        message: `Found ${data.items?.length || 0} doc(s)`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'getDoc') {
      return new Response(JSON.stringify({
        success: true,
        data,
        doc: data,
        docId: data.id,
        docName: data.name,
        message: `Retrieved doc: ${data.name}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'createDoc') {
      return new Response(JSON.stringify({
        success: true,
        data,
        doc: data,
        docId: data.id,
        docName: data.name,
        message: `Created doc: ${data.name}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'listTables') {
      return new Response(JSON.stringify({
        success: true,
        data,
        tables: data.items || [],
        count: data.items?.length || 0,
        message: `Found ${data.items?.length || 0} table(s)`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'listRows' || action === 'findRow') {
      return new Response(JSON.stringify({
        success: true,
        data,
        rows: data.items || [],
        count: data.items?.length || 0,
        message: `Found ${data.items?.length || 0} row(s)`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'listColumns') {
      return new Response(JSON.stringify({
        success: true,
        data,
        columns: data.items || [],
        count: data.items?.length || 0,
        message: `Found ${data.items?.length || 0} column(s)`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'createRow' || action === 'upsertRow') {
      return new Response(JSON.stringify({
        success: true,
        data,
        rowsInserted: data.addedRowCount || 0,
        rowId: data.addedRowIds?.[0] || null,
        message: `Successfully inserted ${data.addedRowCount || 0} row(s)`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'getRow') {
      return new Response(JSON.stringify({
        success: true,
        data,
        row: data,
        rowId: data.id,
        message: `Retrieved row: ${data.id}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'updateRow') {
      return new Response(JSON.stringify({
        success: true,
        data,
        rowId: params.rowId,
        message: 'Row updated successfully',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'deleteRow') {
      return new Response(JSON.stringify({
        success: true,
        data,
        rowId: params.rowId,
        message: 'Row deletion queued for processing',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'getTable') {
      return new Response(JSON.stringify({
        success: true,
        data,
        table: data,
        tableId: data.id,
        tableName: data.name,
        message: `Retrieved table: ${data.name}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Coda proxy error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      hint: 'Check that your inputs are valid JSON where required',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
