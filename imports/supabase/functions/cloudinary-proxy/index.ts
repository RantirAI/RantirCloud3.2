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
    const { cloudName, apiKey, apiSecret, action, ...params } = await req.json();

    if (!cloudName || !apiKey || !apiSecret) {
      return new Response(JSON.stringify({ success: false, error: 'Cloud name, API key, and API secret are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = `https://api.cloudinary.com/v1_1/${cloudName}`;
    const authHeader = 'Basic ' + btoa(`${apiKey}:${apiSecret}`);
    let endpoint = '';
    let method = 'POST';
    let body: any = null;
    let isDeleteWithBody = false;

    switch (action) {
      case 'uploadResource':
        // Upload API: POST /{resource_type}/upload
        const resourceType = params.resourceType || 'image';
        endpoint = `/${resourceType}/upload`;
        body = {
          file: params.file,
          folder: params.folder || '',
          public_id: params.publicId || undefined,
          upload_preset: params.uploadPreset || undefined,
          transformation: params.transformation || undefined,
        };
        break;

      case 'deleteResource':
        // Admin API: DELETE /resources/{resource_type}/upload with public_ids in body
        const deleteResourceType = params.resourceType || 'image';
        endpoint = `/resources/${deleteResourceType}/upload`;
        method = 'DELETE';
        isDeleteWithBody = true;
        body = {
          public_ids: Array.isArray(params.publicId) ? params.publicId : [params.publicId],
        };
        break;

      case 'createUsageReport':
        // Admin API: GET /usage
        endpoint = '/usage';
        method = 'GET';
        if (params.date) {
          endpoint += `?date=${params.date}`;
        }
        break;

      case 'findResourceByPublicId':
        // Admin API: GET /resources/{resource_type}/{type}/{public_id}
        const findResourceType = params.resourceType || 'image';
        const deliveryType = params.deliveryType || 'upload';
        endpoint = `/resources/${findResourceType}/${deliveryType}/${params.publicId}`;
        method = 'GET';
        break;

      case 'transformResource':
        // Generate transformation URL (no API call needed)
        const transformResourceType = params.resourceType || 'image';
        const transformUrl = `https://res.cloudinary.com/${cloudName}/${transformResourceType}/upload/${params.transformation}/${params.publicId}`;
        if (params.format) {
          const finalUrl = transformUrl + '.' + params.format;
          return new Response(JSON.stringify({
            success: true,
            transformedUrl: finalUrl,
            publicId: params.publicId,
            transformation: params.transformation,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({
          success: true,
          transformedUrl: transformUrl,
          publicId: params.publicId,
          transformation: params.transformation,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'listResources':
        // Admin API: GET /resources/{resource_type}
        endpoint = `/resources/${params.resourceType || 'image'}`;
        method = 'GET';
        const queryParams = new URLSearchParams();
        if (params.maxResults) queryParams.append('max_results', params.maxResults);
        if (params.nextCursor) queryParams.append('next_cursor', params.nextCursor);
        if (params.prefix) queryParams.append('prefix', params.prefix);
        const queryString = queryParams.toString();
        if (queryString) endpoint += `?${queryString}`;
        break;

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

    console.log(`Cloudinary: ${method} ${baseUrl}${endpoint}`);

    const headers: Record<string, string> = {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    // Include body for POST, PUT, PATCH, and DELETE with body (for deleteResource)
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH' || isDeleteWithBody)) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      console.error('Cloudinary API error:', data);
      return new Response(JSON.stringify({
        success: false,
        error: data.error?.message || data.message || 'API request failed',
        details: data,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'uploadResource') {
      return new Response(JSON.stringify({
        success: true,
        data,
        url: data.secure_url,
        publicId: data.public_id,
        format: data.format,
        width: data.width,
        height: data.height,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'createUsageReport') {
      return new Response(JSON.stringify({
        success: true,
        data,
        usage: {
          plan: data.plan,
          lastUpdated: data.last_updated,
          storage: data.storage,
          bandwidth: data.bandwidth,
          requests: data.requests,
          resources: data.resources,
          transformations: data.transformations,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'findResourceByPublicId') {
      return new Response(JSON.stringify({
        success: true,
        data,
        url: data.secure_url,
        publicId: data.public_id,
        format: data.format,
        width: data.width,
        height: data.height,
        resourceType: data.resource_type,
        createdAt: data.created_at,
        bytes: data.bytes,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'deleteResource') {
      return new Response(JSON.stringify({
        success: true,
        data,
        deleted: data.deleted || {},
        message: 'Resource(s) deleted successfully',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cloudinary proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
