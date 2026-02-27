import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      action, 
      connectionString, 
      username, 
      password, 
      bucket,
      scope,
      collection,
      documentId,
      document,
      query,
      parameters
    } = body;

    console.log('Couchbase proxy called with action:', action);

    if (!connectionString || !username || !password) {
      throw new Error('Connection credentials are required');
    }

    if (!bucket) {
      throw new Error('Bucket name is required');
    }

    // Parse connection string to determine if it's Capella (cloud) or self-hosted
    // Capella format: couchbases://cb.{clusterId}.cloud.couchbase.com
    // Self-hosted format: couchbase://hostname or couchbases://hostname
    const capellaMatch = connectionString.match(/couchbases?:\/\/cb\.([a-zA-Z0-9]+)\.cloud\.couchbase\.com/);
    
    let baseUrl: string;
    let isCapella = false;
    
    if (capellaMatch) {
      // Couchbase Capella - use Data API v1
      // Cluster ID is captured directly from regex (e.g., "nylpwmmpln3gj9dd")
      const clusterId = capellaMatch[1];
      baseUrl = `https://${clusterId}.data.cloud.couchbase.com`;
      isCapella = true;
      console.log('Detected Capella cluster:', clusterId, '-> Base URL:', baseUrl);
    } else {
      // Self-hosted Couchbase - use REST API
      const selfHostedMatch = connectionString.match(/couchbases?:\/\/([^:\/]+)/);
      if (!selfHostedMatch) {
        throw new Error('Invalid connection string format. Expected: couchbases://hostname or couchbase://hostname');
      }
      const host = selfHostedMatch[1];
      baseUrl = `https://${host}:18091`;
      console.log('Detected self-hosted cluster:', host, '-> Base URL:', baseUrl);
    }
    
    const authHeader = 'Basic ' + btoa(`${username}:${password}`);
    const scopeName = scope || '_default';
    const collectionName = collection || '_default';

    let response;
    let responseData;

    switch (action) {
      case 'get': {
        if (!documentId) {
          throw new Error('Document ID is required');
        }
        
        let url: string;
        if (isCapella) {
          // Capella Data API v1
          url = `${baseUrl}/v1/buckets/${bucket}/scopes/${scopeName}/collections/${collectionName}/documents/${encodeURIComponent(documentId)}`;
        } else {
          // Self-hosted Key-Value API
          url = `${baseUrl}/pools/default/buckets/${bucket}/docs/${encodeURIComponent(documentId)}`;
        }
        
        console.log('Getting document from:', url);
        
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json',
          },
        });
        
        if (response.status === 404) {
          throw new Error(`Document not found: ${documentId}`);
        }
        
        responseData = await response.json();
        break;
      }

      case 'insert':
      case 'upsert': {
        if (!documentId) {
          throw new Error('Document ID is required');
        }
        if (!document) {
          throw new Error('Document content is required');
        }

        let docContent;
        try {
          docContent = typeof document === 'string' ? JSON.parse(document) : document;
        } catch (e) {
          throw new Error('Document must be valid JSON');
        }

        let url: string;
        let method: string;
        
        if (isCapella) {
          // Capella Data API v1
          // POST for insert, PUT for upsert
          url = `${baseUrl}/v1/buckets/${bucket}/scopes/${scopeName}/collections/${collectionName}/documents/${encodeURIComponent(documentId)}`;
          method = action === 'insert' ? 'POST' : 'PUT';
        } else {
          // Self-hosted - use same endpoint with POST/PUT
          url = `${baseUrl}/pools/default/buckets/${bucket}/docs/${encodeURIComponent(documentId)}`;
          method = action === 'insert' ? 'POST' : 'PUT';
        }
        
        console.log(`${action === 'insert' ? 'Inserting' : 'Upserting'} document:`, url);

        response = await fetch(url, {
          method,
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(docContent),
        });

        if (response.status === 201 || response.status === 200 || response.status === 204) {
          responseData = { success: true, documentId };
        } else {
          responseData = await response.json().catch(() => ({}));
        }
        break;
      }

      case 'remove': {
        if (!documentId) {
          throw new Error('Document ID is required');
        }

        let url: string;
        if (isCapella) {
          url = `${baseUrl}/v1/buckets/${bucket}/scopes/${scopeName}/collections/${collectionName}/documents/${encodeURIComponent(documentId)}`;
        } else {
          url = `${baseUrl}/pools/default/buckets/${bucket}/docs/${encodeURIComponent(documentId)}`;
        }
        
        console.log('Removing document:', url);

        response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Authorization': authHeader,
          },
        });

        responseData = { deleted: response.ok || response.status === 204 };
        break;
      }

      case 'query': {
        if (!query) {
          throw new Error('SQL++ query is required');
        }

        let queryUrl: string;
        if (isCapella) {
          // Capella uses /v1/scopes/{scope}/query
          queryUrl = `${baseUrl}/v1/scopes/${scopeName}/query`;
        } else {
          // Self-hosted uses /query/service
          queryUrl = `${baseUrl}/query/service`;
        }
        
        console.log('Executing SQL++ query at:', queryUrl);

        let queryParams = {};
        if (parameters) {
          try {
            queryParams = typeof parameters === 'string' ? JSON.parse(parameters) : parameters;
          } catch (e) {
            throw new Error('Query parameters must be valid JSON');
          }
        }

        response = await fetch(queryUrl, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            statement: query,
            ...queryParams,
          }),
        });

        responseData = await response.json();
        
        if (responseData.errors && responseData.errors.length > 0) {
          throw new Error(responseData.errors[0].msg || 'Query execution failed');
        }
        
        responseData = responseData.results || responseData;
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    if (!response.ok && action !== 'query' && response.status !== 204) {
      const errorText = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
      throw new Error(`Couchbase error [${response.status}]: ${errorText}`);
    }

    console.log('Couchbase operation successful');

    return new Response(JSON.stringify({
      success: true,
      data: responseData,
      cas: responseData?.cas,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Couchbase proxy error:', error.message);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
