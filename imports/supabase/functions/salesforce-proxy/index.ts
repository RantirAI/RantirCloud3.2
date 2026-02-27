import { corsHeaders } from '../_shared/cors.ts';

interface SalesforceRequest {
  apiKey: string;
  action: string;
  soqlQuery?: string;
  objectType?: string;
  recordId?: string;
  recordData?: any;
  batchData?: any[];
  externalIdField?: string;
  apiMethod?: string;
  apiEndpoint?: string;
  apiBody?: any;
  fieldMapping?: any;
  baseUrl?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      apiKey,
      action,
      soqlQuery,
      objectType,
      recordId,
      recordData,
      batchData,
      externalIdField,
      apiMethod,
      apiEndpoint,
      apiBody,
      fieldMapping,
      baseUrl = 'https://your-instance.my.salesforce.com'
    }: SalesforceRequest = await req.json();

    if (!apiKey) {
      throw new Error('Salesforce API key is required');
    }

    console.log(`Salesforce Proxy: Processing action: ${action}`);

    // Helper function to apply field mapping
    const applyFieldMapping = (data: any, mapping?: any) => {
      if (!mapping || !data) return data;
      const mappedData: any = {};
      for (const [sourceField, targetField] of Object.entries(mapping)) {
        if (data[sourceField] !== undefined) {
          mappedData[targetField as string] = data[sourceField];
        }
      }
      return { ...data, ...mappedData };
    };

    let result;

    switch (action) {
      case 'run_query':
        result = await executeQuery(apiKey, baseUrl, soqlQuery!);
        break;

      case 'create_object':
        result = await createObject(apiKey, baseUrl, objectType!, recordData, fieldMapping);
        break;

      case 'update_object':
        result = await updateObject(apiKey, baseUrl, objectType!, recordId!, recordData, fieldMapping);
        break;

      case 'batch_upsert':
        result = await batchUpsert(apiKey, baseUrl, objectType!, batchData!, externalIdField, fieldMapping);
        break;

      case 'bulk_upsert':
        result = await bulkUpsert(apiKey, baseUrl, objectType!, batchData!, externalIdField, fieldMapping);
        break;

      case 'custom_api':
        result = await customApiCall(apiKey, baseUrl, apiMethod!, apiEndpoint!, apiBody);
        break;

      default:
        throw new Error(`Unsupported Salesforce action: ${action}`);
    }

    console.log(`Salesforce Proxy: Successfully processed ${action}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    // Helper functions
    async function executeQuery(apiKey: string, baseUrl: string, query: string) {
      const response = await fetch(`${baseUrl}/services/data/v58.0/query?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Query failed: ${error.message || response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
        records: data.records || [],
        totalSize: data.totalSize || 0,
        rawResponse: data
      };
    }

    async function createObject(apiKey: string, baseUrl: string, objectType: string, recordData: any, fieldMapping?: any) {
      if (!objectType || !recordData) {
        throw new Error('Object type and record data are required for create operation');
      }

      // Apply field mapping if provided
      const mappedData = applyFieldMapping(recordData, fieldMapping);

      const response = await fetch(`${baseUrl}/services/data/v58.0/sobjects/${objectType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mappedData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Create failed: ${error.message || response.statusText}`);
      }

      const data = await response.json();
      return {
        success: data.success,
        recordId: data.id,
        data,
        errors: data.errors || [],
        rawResponse: data
      };
    }

    async function updateObject(apiKey: string, baseUrl: string, objectType: string, recordId: string, recordData: any, fieldMapping?: any) {
      if (!objectType || !recordId || !recordData) {
        throw new Error('Object type, record ID, and record data are required for update operation');
      }

      // Apply field mapping if provided
      const mappedData = applyFieldMapping(recordData, fieldMapping);

      const response = await fetch(`${baseUrl}/services/data/v58.0/sobjects/${objectType}/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mappedData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Update failed: ${error.message || response.statusText}`);
      }

      return {
        success: true,
        recordId,
        data: { id: recordId },
        rawResponse: {}
      };
    }

    async function batchUpsert(apiKey: string, baseUrl: string, objectType: string, batchData: any[], externalIdField?: string, fieldMapping?: any) {
      if (!objectType || !batchData || !Array.isArray(batchData)) {
        throw new Error('Object type and batch data array are required for batch upsert');
      }

      // Apply field mapping to each record if provided
      const mappedData = batchData.map(record => applyFieldMapping(record, fieldMapping));

      const endpoint = externalIdField 
        ? `${baseUrl}/services/data/v58.0/sobjects/${objectType}/${externalIdField}`
        : `${baseUrl}/services/data/v58.0/sobjects/${objectType}`;

      const results = [];
      const errors = [];

      // Process records in batches of 200 (Salesforce limit)
      for (let i = 0; i < mappedData.length; i += 200) {
        const batch = mappedData.slice(i, i + 200);
        
        for (const record of batch) {
          try {
            const response = await fetch(endpoint, {
              method: externalIdField ? 'PATCH' : 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(record)
            });

            const result = await response.json();
            if (response.ok) {
              results.push(result);
            } else {
              errors.push(result);
            }
          } catch (error) {
            errors.push({ error: (error as Error).message, record });
          }
        }
      }

      return {
        success: errors.length === 0,
        data: results,
        totalSize: results.length,
        errors,
        rawResponse: { results, errors }
      };
    }

    async function bulkUpsert(apiKey: string, baseUrl: string, objectType: string, batchData: any[], externalIdField?: string, fieldMapping?: any) {
      if (!objectType || !batchData || !Array.isArray(batchData)) {
        throw new Error('Object type and batch data array are required for bulk upsert');
      }

      // Apply field mapping to each record if provided
      const mappedData = batchData.map(record => applyFieldMapping(record, fieldMapping));

      // Create bulk job
      const jobResponse = await fetch(`${baseUrl}/services/data/v58.0/jobs/ingest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          object: objectType,
          operation: externalIdField ? 'upsert' : 'insert',
          externalIdFieldName: externalIdField,
          contentType: 'JSON'
        })
      });

      if (!jobResponse.ok) {
        const error = await jobResponse.json();
        throw new Error(`Bulk job creation failed: ${error.message || jobResponse.statusText}`);
      }

      const jobData = await jobResponse.json();
      const jobId = jobData.id;

      // Upload data to job
      const uploadResponse = await fetch(`${baseUrl}/services/data/v58.0/jobs/ingest/${jobId}/batches`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mappedData)
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(`Bulk data upload failed: ${error.message || uploadResponse.statusText}`);
      }

      // Close job
      const closeResponse = await fetch(`${baseUrl}/services/data/v58.0/jobs/ingest/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ state: 'UploadComplete' })
      });

      if (!closeResponse.ok) {
        const error = await closeResponse.json();
        throw new Error(`Bulk job close failed: ${error.message || closeResponse.statusText}`);
      }

      const closeData = await closeResponse.json();

      return {
        success: true,
        data: closeData,
        totalSize: mappedData.length,
        jobId,
        rawResponse: closeData
      };
    }

    async function customApiCall(apiKey: string, baseUrl: string, method: string, endpoint: string, body?: any) {
      const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
      
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      };

      if (body && ['POST', 'PATCH', 'PUT'].includes(method)) {
        requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(url, requestOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Custom API call failed: ${data.message || response.statusText}`);
      }

      return {
        success: true,
        data,
        rawResponse: data
      };
    }

  } catch (error) {
    console.error('Salesforce Proxy Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});