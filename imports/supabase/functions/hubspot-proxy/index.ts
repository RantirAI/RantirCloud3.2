import { corsHeaders } from '../_shared/cors.ts';

const HUBSPOT_API_BASE = 'https://api.hubapi.com';

interface HubSpotRequest {
  accessToken: string;
  action: string;
  endpoint?: string;
  method?: string;
  body?: any;
  queryParams?: any;
  inputs?: Record<string, any>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessToken, action, endpoint, method = 'GET', body, queryParams, inputs }: HubSpotRequest = await req.json();

    if (!accessToken) {
      throw new Error('HubSpot access token is required');
    }

    console.log(`HubSpot Proxy: Processing action: ${action}`);

    let url = '';
    let requestMethod = method;
    let requestBody = null;

    // Build request based on action
    switch (action) {
      case 'verify_connection':
        url = `${HUBSPOT_API_BASE}/account-info/v3/details`;
        break;
      case 'create_contact':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts`;
        requestMethod = 'POST';
        requestBody = JSON.stringify({
          properties: {
            email: inputs?.email,
            firstname: inputs?.firstname,
            lastname: inputs?.lastname,
            phone: inputs?.phone,
            company: inputs?.company,
            website: inputs?.website,
            jobtitle: inputs?.jobtitle
          }
        });
        break;

      case 'update_contact':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${inputs?.contact_id}`;
        requestMethod = 'PATCH';
        requestBody = JSON.stringify({
          properties: {
            email: inputs?.email,
            firstname: inputs?.firstname,
            lastname: inputs?.lastname,
            phone: inputs?.phone,
            company: inputs?.company,
            website: inputs?.website,
            jobtitle: inputs?.jobtitle
          }
        });
        break;

      case 'get_contact':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${inputs?.contact_id}`;
        break;

      case 'find_contact':
        if (inputs?.email) {
          url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${inputs.email}?idProperty=email`;
        } else if (inputs?.search_query) {
          url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`;
          requestMethod = 'POST';
          requestBody = JSON.stringify({
            query: inputs.search_query,
            limit: 10
          });
        }
        break;

      case 'create_company':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/companies`;
        requestMethod = 'POST';
        requestBody = JSON.stringify({
          properties: {
            name: inputs?.name,
            domain: inputs?.domain,
            industry: inputs?.industry,
            phone: inputs?.phone,
            city: inputs?.city,
            state: inputs?.state,
            country: inputs?.country
          }
        });
        break;

      case 'update_company':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/companies/${inputs?.company_id}`;
        requestMethod = 'PATCH';
        requestBody = JSON.stringify({
          properties: {
            name: inputs?.name,
            domain: inputs?.domain,
            industry: inputs?.industry,
            phone: inputs?.phone,
            city: inputs?.city,
            state: inputs?.state,
            country: inputs?.country
          }
        });
        break;

      case 'get_company':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/companies/${inputs?.company_id}`;
        break;

      case 'find_company':
        if (inputs?.domain) {
          url = `${HUBSPOT_API_BASE}/crm/v3/objects/companies/${inputs.domain}?idProperty=domain`;
        } else if (inputs?.search_query) {
          url = `${HUBSPOT_API_BASE}/crm/v3/objects/companies/search`;
          requestMethod = 'POST';
          requestBody = JSON.stringify({
            query: inputs.search_query,
            limit: 10
          });
        }
        break;

      case 'create_deal':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/deals`;
        requestMethod = 'POST';
        requestBody = JSON.stringify({
          properties: {
            dealname: inputs?.dealname,
            amount: inputs?.amount,
            dealstage: inputs?.dealstage,
            pipeline: inputs?.pipeline,
            closedate: inputs?.closedate,
            dealtype: inputs?.dealtype
          }
        });
        break;

      case 'update_deal':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/deals/${inputs?.deal_id}`;
        requestMethod = 'PATCH';
        requestBody = JSON.stringify({
          properties: {
            dealname: inputs?.dealname,
            amount: inputs?.amount,
            dealstage: inputs?.dealstage,
            pipeline: inputs?.pipeline,
            closedate: inputs?.closedate,
            dealtype: inputs?.dealtype
          }
        });
        break;

      case 'get_deal':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/deals/${inputs?.deal_id}`;
        break;

      case 'find_deal':
        if (inputs?.dealname) {
          url = `${HUBSPOT_API_BASE}/crm/v3/objects/deals/search`;
          requestMethod = 'POST';
          requestBody = JSON.stringify({
            filterGroups: [{
              filters: [{
                propertyName: 'dealname',
                operator: 'CONTAINS_TOKEN',
                value: inputs.dealname
              }]
            }],
            limit: 10
          });
        } else if (inputs?.search_query) {
          url = `${HUBSPOT_API_BASE}/crm/v3/objects/deals/search`;
          requestMethod = 'POST';
          requestBody = JSON.stringify({
            query: inputs.search_query,
            limit: 10
          });
        }
        break;

      case 'create_ticket':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/tickets`;
        requestMethod = 'POST';
        requestBody = JSON.stringify({
          properties: {
            subject: inputs?.subject,
            content: inputs?.content,
            hs_pipeline_stage: inputs?.hs_pipeline_stage,
            hs_ticket_priority: inputs?.hs_ticket_priority,
            source_type: inputs?.source_type
          }
        });
        break;

      case 'update_ticket':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/tickets/${inputs?.ticket_id}`;
        requestMethod = 'PATCH';
        requestBody = JSON.stringify({
          properties: {
            subject: inputs?.subject,
            content: inputs?.content,
            hs_pipeline_stage: inputs?.hs_pipeline_stage,
            hs_ticket_priority: inputs?.hs_ticket_priority,
            source_type: inputs?.source_type
          }
        });
        break;

      case 'get_ticket':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/tickets/${inputs?.ticket_id}`;
        break;

      case 'find_ticket':
        if (inputs?.subject) {
          url = `${HUBSPOT_API_BASE}/crm/v3/objects/tickets/search`;
          requestMethod = 'POST';
          requestBody = JSON.stringify({
            filterGroups: [{
              filters: [{
                propertyName: 'subject',
                operator: 'CONTAINS_TOKEN',
                value: inputs.subject
              }]
            }],
            limit: 10
          });
        } else if (inputs?.search_query) {
          url = `${HUBSPOT_API_BASE}/crm/v3/objects/tickets/search`;
          requestMethod = 'POST';
          requestBody = JSON.stringify({
            query: inputs.search_query,
            limit: 10
          });
        }
        break;

      // Contact extras
      // v3 Lists API (v1 sunsets April 30 2026 — using v3 now)
      case 'add_contact_to_list':
        url = `${HUBSPOT_API_BASE}/crm/v3/lists/${inputs?.list_id}/memberships/add`;
        requestMethod = 'PUT';
        requestBody = JSON.stringify({ recordIdsToAdd: [inputs?.contact_vid] });
        break;

      case 'remove_contact_from_list':
        url = `${HUBSPOT_API_BASE}/crm/v3/lists/${inputs?.list_id}/memberships/remove`;
        requestMethod = 'PUT';
        requestBody = JSON.stringify({ recordIdsToRemove: [inputs?.contact_vid] });
        break;

      case 'add_contact_to_workflow':
        // Legacy v2 enrollment endpoint — still active
        url = `${HUBSPOT_API_BASE}/automation/v2/workflows/${inputs?.workflow_id}/enrollments/contacts/${inputs?.email}`;
        requestMethod = 'POST';
        requestBody = JSON.stringify({});
        break;

      // Communication Preferences v4 (replaces deprecated email/public/v1/subscriptions)
      case 'remove_email_subscription':
        url = `${HUBSPOT_API_BASE}/communication-preferences/v4/statuses/${encodeURIComponent(inputs?.email)}`;
        requestMethod = 'POST';
        requestBody = JSON.stringify({ statusState: 'UNSUBSCRIBED' });
        break;

      // Product Operations
      case 'create_product':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/products`;
        requestMethod = 'POST';
        requestBody = JSON.stringify({
          properties: {
            name: inputs?.name,
            price: inputs?.price,
            description: inputs?.description,
            hs_sku: inputs?.hs_sku
          }
        });
        break;

      case 'update_product':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/products/${inputs?.product_id}`;
        requestMethod = 'PATCH';
        requestBody = JSON.stringify({
          properties: {
            name: inputs?.name,
            price: inputs?.price,
            description: inputs?.description,
            hs_sku: inputs?.hs_sku
          }
        });
        break;

      case 'get_product':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/products/${inputs?.product_id}`;
        break;

      case 'find_product':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/products/search`;
        requestMethod = 'POST';
        requestBody = JSON.stringify({
          query: inputs?.name || inputs?.search_query,
          limit: 10
        });
        break;

      // Line Item Operations
      case 'create_line_item':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/line_items`;
        requestMethod = 'POST';
        requestBody = JSON.stringify({
          properties: {
            name: inputs?.name,
            quantity: inputs?.quantity,
            price: inputs?.price,
            hs_product_id: inputs?.hs_product_id
          }
        });
        break;

      case 'update_line_item':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/line_items/${inputs?.line_item_id}`;
        requestMethod = 'PATCH';
        requestBody = JSON.stringify({
          properties: {
            name: inputs?.name,
            quantity: inputs?.quantity,
            price: inputs?.price,
            hs_product_id: inputs?.hs_product_id
          }
        });
        break;

      case 'get_line_item':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/line_items/${inputs?.line_item_id}`;
        break;

      case 'find_line_item':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/line_items/search`;
        requestMethod = 'POST';
        requestBody = JSON.stringify({
          query: inputs?.name || inputs?.search_query,
          limit: 10
        });
        break;

      // Custom Object Operations
      case 'create_custom_object':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/${inputs?.object_type}`;
        requestMethod = 'POST';
        requestBody = JSON.stringify({
          properties: typeof inputs?.properties === 'string'
            ? JSON.parse(inputs.properties)
            : (inputs?.properties || {})
        });
        break;

      case 'update_custom_object':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/${inputs?.object_type}/${inputs?.object_id}`;
        requestMethod = 'PATCH';
        requestBody = JSON.stringify({
          properties: typeof inputs?.properties === 'string'
            ? JSON.parse(inputs.properties)
            : (inputs?.properties || {})
        });
        break;

      case 'get_custom_object':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/${inputs?.object_type}/${inputs?.object_id}`;
        break;

      case 'find_custom_object':
        url = `${HUBSPOT_API_BASE}/crm/v3/objects/${inputs?.object_type}/search`;
        requestMethod = 'POST';
        requestBody = JSON.stringify({
          query: inputs?.search_query,
          limit: 10
        });
        break;

      // Content (CMS Hub) Operations
      case 'create_page':
        url = `${HUBSPOT_API_BASE}/cms/v3/pages/site-pages`;
        requestMethod = 'POST';
        requestBody = JSON.stringify({
          name: inputs?.name,
          slug: inputs?.slug,
          templatePath: inputs?.template_path
        });
        break;

      case 'get_page':
        url = `${HUBSPOT_API_BASE}/cms/v3/pages/site-pages/${inputs?.page_id}`;
        break;

      case 'delete_page':
        url = `${HUBSPOT_API_BASE}/cms/v3/pages/site-pages/${inputs?.page_id}`;
        requestMethod = 'DELETE';
        break;

      case 'create_blog_post':
        url = `${HUBSPOT_API_BASE}/cms/v3/blogs/posts`;
        requestMethod = 'POST';
        requestBody = JSON.stringify({
          name: inputs?.name,
          contentGroupId: inputs?.content_group_id,
          postBody: inputs?.post_body
        });
        break;

      // Association Operations (v4 API)
      // create_associations uses /default/ path per v4 docs
      case 'create_associations':
        url = `${HUBSPOT_API_BASE}/crm/v4/objects/${inputs?.from_object_type}/${inputs?.from_object_id}/associations/default/${inputs?.to_object_type}/${inputs?.to_object_id}`;
        requestMethod = 'PUT';
        requestBody = null; // default association requires no body
        break;

      case 'remove_associations':
        // DELETE does not use /default/ path
        url = `${HUBSPOT_API_BASE}/crm/v4/objects/${inputs?.from_object_type}/${inputs?.from_object_id}/associations/${inputs?.to_object_type}/${inputs?.to_object_id}`;
        requestMethod = 'DELETE';
        break;

      case 'find_associations':
        url = `${HUBSPOT_API_BASE}/crm/v4/objects/${inputs?.from_object_type}/${inputs?.from_object_id}/associations/${inputs?.to_object_type}`;
        break;

      // File Upload
      case 'upload_file': {
        // Fetch the file from the provided URL and re-post to HubSpot Files API
        const fileResponse = await fetch(inputs?.file_url);
        if (!fileResponse.ok) throw new Error(`Failed to fetch file from URL: ${inputs?.file_url}`);
        const fileBlob = await fileResponse.blob();
        const fileName = inputs?.file_name || inputs?.file_url?.split('/').pop() || 'upload';
        const formData = new FormData();
        formData.append('file', fileBlob, fileName);
        formData.append('options', JSON.stringify({
          access: 'PUBLIC_INDEXABLE',
          overwrite: false
        }));
        if (inputs?.folder_path) {
          formData.append('folderPath', inputs.folder_path);
        }
        const fileUploadResponse = await fetch(`${HUBSPOT_API_BASE}/files/v3/files`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` },
          body: formData
        });
        const fileData = await fileUploadResponse.json();
        if (!fileUploadResponse.ok) throw new Error(fileData.message || 'File upload failed');
        return new Response(JSON.stringify({
          success: true,
          data: fileData,
          id: fileData.id,
          raw_response: fileData,
          error_category: null,
          correlation_id: null
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Pipeline / Owner Operations
      case 'get_owner':
        url = `${HUBSPOT_API_BASE}/crm/v3/owners/${inputs?.owner_id}`;
        break;

      case 'get_pipeline_stage':
        url = `${HUBSPOT_API_BASE}/crm/v3/pipelines/${inputs?.object_type}/${inputs?.pipeline_id}/stages/${inputs?.stage_id}`;
        break;

      case 'custom_api_call':
        url = `${HUBSPOT_API_BASE}${inputs?.endpoint}`;
        requestMethod = inputs?.method || 'GET';
        if (inputs?.request_body) {
          requestBody = JSON.stringify(inputs.request_body);
        }
        if (inputs?.query_params) {
          const params = new URLSearchParams(inputs.query_params);
          url += `?${params.toString()}`;
        }
        break;

      default:
        throw new Error(`Unsupported HubSpot action: ${action}`);
    }

    console.log(`HubSpot Proxy: Making ${requestMethod} request to ${url}`);

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(url, {
      method: requestMethod,
      headers,
      body: requestBody
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`HubSpot API Error:`, responseData);
      
      // Enhanced error handling with HubSpot-specific details
      const errorMessage = responseData.message || 'HubSpot API request failed';
      const errorCategory = responseData.category || 'UNKNOWN_ERROR';
      const correlationId = responseData.correlationId || 'N/A';
      
      // Log detailed error for debugging
      console.error(`HubSpot Error Details:`, {
        message: errorMessage,
        category: errorCategory,
        correlationId,
        status: response.status,
        action
      });
      
      throw new Error(`${errorMessage} (Category: ${errorCategory}, Correlation ID: ${correlationId})`);
    }

    console.log(`HubSpot Proxy: Successfully processed ${action}`);

    return new Response(JSON.stringify({
      success: true,
      data: responseData,
      id: responseData.id,
      raw_response: responseData,
      error_category: null,
      correlation_id: null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('HubSpot Proxy Error:', error);
    
    // Extract HubSpot error details from error message if available
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    let errorCategory = 'UNKNOWN_ERROR';
    let correlationId = 'N/A';
    
    // Parse structured error details if present
    const categoryMatch = errorMessage.match(/Category: ([^,)]+)/);
    const correlationMatch = errorMessage.match(/Correlation ID: ([^)]+)/);
    
    if (categoryMatch) errorCategory = categoryMatch[1];
    if (correlationMatch) correlationId = correlationMatch[1];
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      error_category: errorCategory,
      correlation_id: correlationId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});