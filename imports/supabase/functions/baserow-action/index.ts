import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, baseUrl = 'https://api.baserow.io', action, tableId, rowData, rowId, endpoint, method, body } = await req.json();
    
    if (!apiKey) {
      throw new Error('API key is required');
    }

    const headers = {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let result;

    if (action === 'listRows') {
      if (!tableId) throw new Error('Table ID is required');
      
      const response = await fetch(`${baseUrl}/api/database/rows/table/${tableId}/`, {
        headers,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Baserow API error: ${response.status} - ${errorData}`);
      }

      result = await response.json();
    } else if (action === 'createRow') {
      if (!tableId) throw new Error('Table ID is required');
      if (!rowData) throw new Error('Row data is required');

      const parsedRowData = typeof rowData === 'string' ? JSON.parse(rowData) : rowData;

      const response = await fetch(`${baseUrl}/api/database/rows/table/${tableId}/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(parsedRowData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Baserow API error: ${response.status} - ${errorData}`);
      }

      result = await response.json();
    } else if (action === 'getRow') {
      if (!tableId) throw new Error('Table ID is required');
      if (!rowId) throw new Error('Row ID is required');

      const response = await fetch(`${baseUrl}/api/database/rows/table/${tableId}/${rowId}/`, {
        headers,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Baserow API error: ${response.status} - ${errorData}`);
      }

      result = await response.json();
    } else if (action === 'updateRow') {
      if (!tableId) throw new Error('Table ID is required');
      if (!rowData || !rowId) throw new Error('Row data and row ID are required');

      const parsedRowData = typeof rowData === 'string' ? JSON.parse(rowData) : rowData;

      const response = await fetch(`${baseUrl}/api/database/rows/table/${tableId}/${rowId}/`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(parsedRowData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Baserow API error: ${response.status} - ${errorData}`);
      }

      result = await response.json();
    } else if (action === 'deleteRow') {
      if (!tableId) throw new Error('Table ID is required');
      if (!rowId) throw new Error('Row ID is required');

      const response = await fetch(`${baseUrl}/api/database/rows/table/${tableId}/${rowId}/`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Baserow API error: ${response.status} - ${errorData}`);
      }

      result = { deleted: true, rowId };
    } else if (action === 'createCustomApiCall') {
      if (!endpoint) throw new Error('Endpoint is required');
      if (!method) throw new Error('HTTP method is required');

      const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
      const requestOptions: RequestInit = {
        method: method.toUpperCase(),
        headers,
      };

      if (body && !['GET', 'HEAD'].includes(method.toUpperCase())) {
        const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
        requestOptions.body = JSON.stringify(parsedBody);
      }

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Baserow API error: ${response.status} - ${errorData}`);
      }

      result = await response.json();
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({
      success: true,
      data: result,
      error: null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Baserow error:', error);
    return new Response(JSON.stringify({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
