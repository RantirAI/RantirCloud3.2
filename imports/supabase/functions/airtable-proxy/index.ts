import { corsHeaders } from '../_shared/cors.ts';

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

interface AirtableRequest {
  action: string;
  apiKey: string;
  baseId?: string;
  tableId?: string;
  recordId?: string;
  fields?: Record<string, any>;
  filterByFormula?: string;
  sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  maxRecords?: number;
  offset?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: AirtableRequest = await req.json();
    const { action, apiKey, baseId, tableId, recordId, fields, filterByFormula, sort, maxRecords, offset } = requestData;

    console.log(`Airtable ${action} request:`, { baseId, tableId, recordId });

    // Validate API key
    if (!apiKey) {
      throw new Error('API key is required');
    }

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let url = '';
    let method = 'GET';
    let body: any = null;

    switch (action) {
      case 'list_bases':
        url = `${AIRTABLE_API_BASE}/meta/bases`;
        break;

      case 'list_tables':
        if (!baseId) throw new Error('Base ID is required');
        url = `${AIRTABLE_API_BASE}/meta/bases/${baseId}/tables`;
        break;

      case 'list_records':
        if (!baseId || !tableId) throw new Error('Base ID and Table ID are required');
        url = `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableId)}`;
        
        // Add query parameters
        const params = new URLSearchParams();
        if (filterByFormula) params.append('filterByFormula', filterByFormula);
        if (maxRecords) params.append('maxRecords', maxRecords.toString());
        if (offset) params.append('offset', offset);
        if (sort && sort.length > 0) {
          sort.forEach((sortItem, index) => {
            params.append(`sort[${index}][field]`, sortItem.field);
            params.append(`sort[${index}][direction]`, sortItem.direction);
          });
        }
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
        break;

      case 'get_record':
        if (!baseId || !tableId || !recordId) throw new Error('Base ID, Table ID, and Record ID are required');
        url = `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableId)}/${recordId}`;
        break;

      case 'create_record':
        if (!baseId || !tableId || !fields) throw new Error('Base ID, Table ID, and fields are required');
        url = `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableId)}`;
        method = 'POST';
        body = {
          fields: fields,
        };
        break;

      case 'update_record':
        if (!baseId || !tableId || !recordId || !fields) throw new Error('Base ID, Table ID, Record ID, and fields are required');
        url = `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableId)}/${recordId}`;
        method = 'PATCH';
        body = {
          fields: fields,
        };
        break;

      case 'delete_record':
        if (!baseId || !tableId || !recordId) throw new Error('Base ID, Table ID, and Record ID are required');
        url = `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableId)}/${recordId}`;
        method = 'DELETE';
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Making ${method} request to:`, url);

    // Make the request to Airtable
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Airtable API error:', responseData);
      throw new Error(responseData.error?.message || `Airtable API error: ${response.status}`);
    }

    console.log(`${action} completed successfully`);

    // Format response based on action
    let result: any = {
      data: responseData,
    };

    switch (action) {
      case 'list_bases':
        result.bases = responseData.bases;
        break;
      case 'list_tables':
        result.tables = responseData.tables;
        break;
      case 'list_records':
        result.records = responseData.records;
        result.offset = responseData.offset;
        break;
      case 'get_record':
      case 'create_record':
      case 'update_record':
        result.record = responseData;
        break;
      case 'delete_record':
        result.deleted = true;
        result.id = responseData.id;
        break;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Airtable proxy error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});